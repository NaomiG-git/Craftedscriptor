const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');


const crypto = require("node:crypto");

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.BUCKET;

function jsonResp(code, body) {
  return {
    statusCode: code,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "OPTIONS,POST",
    },
    body: JSON.stringify(body),
  };
}

function safe(name) {
  return String(name || "document").replace(/[^a-z0-9._-]+/gi, "-").slice(0, 120);
}

exports.handler = async (event) => {
  let parsed;
  try {
    parsed = event?.body ? JSON.parse(event.body) : event;
  } catch {
    return jsonResp(400, { error: "Invalid JSON input" });
  }

  const { html, filenameHint } = parsed || {};
  if (!html) return jsonResp(400, { error: "Missing html" });

  let browser;
  try {
    const executablePath = await chromium.executablePath();

const browser = await puppeteer.launch({
  args: chromium.args,
  defaultViewport: chromium.defaultViewport,
  executablePath,
  headless: chromium.headless,
  ignoreHTTPSErrors: true,
});


    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    const key = `pdf/${Date.now()}-${crypto.randomUUID()}-${safe(filenameHint)}.pdf`;

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: pdfBuffer,
      ContentType: "application/pdf",
    }));

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
      { expiresIn: 300 }
    );

    return jsonResp(200, { key, url });
  } catch (err) {
    console.error(err);
    return jsonResp(500, { error: "PDF generation failed" });
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
};



// redeploy-bump Mon Sep 15 03:02:46 UTC 2025
