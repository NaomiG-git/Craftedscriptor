const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const htmlToDocx = require('html-to-docx');
const crypto = require('node:crypto');

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.BUCKET;

function jsonResp(code, body) {
  return {
    statusCode: code,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'OPTIONS,POST',
    },
    body: JSON.stringify(body),
  };
}

function safe(name) {
  return String(name || 'document').replace(/[^a-z0-9._-]+/gi, '-').slice(0, 120);
}

exports.handler = async (event) => {
  let parsed;
  try {
    parsed = event?.body ? JSON.parse(event.body) : event;
  } catch {
    return jsonResp(400, { error: 'Invalid JSON input' });
  }

  const { html, filenameHint } = parsed || {};
  if (!html) return jsonResp(400, { error: 'Missing html' });

  const buffer = await htmlToDocx(html, null, {
    table: { row: { cantSplit: true } },
    footer: true,
    pageNumber: true,
  });

  const key = `docx/${Date.now()}-${crypto.randomUUID()}-${safe(filenameHint)}.docx`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }));

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: 300 }
  );

  return jsonResp(200, { key, url });
};
