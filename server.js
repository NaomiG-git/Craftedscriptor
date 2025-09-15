// server.js — FINAL CORRECTED VERSION

// --- Environment cleanup: make sure Puppeteer uses its own Chromium ---
delete process.env.PUPPETEER_EXECUTABLE_PATH;
delete process.env.PUPPETEER_SKIP_DOWNLOAD;
delete process.env.PUPPETEER_CHROMIUM_REVISION;
delete process.env.PUPPETEER_PRODUCT;
delete process.env.CHROME_PATH;

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const puppeteer = require('puppeteer'); // will use bundled Chromium
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const app = express();
const port = process.env.PORT || 8888;

// --- AWS S3 Configuration ---
const s3Client = new S3Client({});
const BUCKET_NAME = process.env.S3_BUCKET;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// --- Middleware ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname), {
  etag: false,
  lastModified: false,
  cacheControl: true,
  maxAge: 0
}));


// --- Helper to escape HTML in error pages ---
function escapeHtml(s) {
  s = String(s || '');
  return s.replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
}

// --- Health check endpoint ---
app.get('/health', async (req, res) => {
  try {
    const chromiumPath = puppeteer.executablePath();
    res.json({ ok: true, chromiumPath });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// --- API: S3 presigned PUT for uploads ---
app.post('/api/uploads/sign', async (req, res) => {
  try {
    if (!BUCKET_NAME) throw new Error('S3_BUCKET environment variable is not set.');
    const fileType = req.body && req.body.fileType;
    if (!fileType) return res.status(400).json({ error: 'fileType is required.' });

    const randomFileName = crypto.randomBytes(16).toString('hex');
    const ext = (fileType.split('/')[1] || 'jpg').toLowerCase();
    const key = `uploads/${randomFileName}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: fileType
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 60 });
    const publicUrl = `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;

    res.json({ url, publicUrl });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).json({ error: 'Failed to generate signed URL.', details: error.message });
  }
});

// --- PDF Generation Endpoint ---
app.post('/generate-pdf', async (req, res) => {
  let browser;
  try {
    const { htmlContent } = req.body;
    if (!htmlContent) throw new Error("No HTML content received.");

    const executablePath = puppeteer.executablePath();
    browser = await puppeteer.launch({
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: ['domcontentloaded', 'networkidle0'] });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF Generation Error:', error);
    const msg = escapeHtml(error.message);
    res.status(500).set('Content-Type','text/html').send(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>PDF Error</title></head>
       <body style="font-family: system-ui, sans-serif; padding:24px;">
       <h1>Error</h1><p>Failed to generate PDF: ${msg}</p></body></html>`
    );
  } finally {
    if (browser) { try { await browser.close(); } catch (e) {} }
  }
});

// --- Start the server ---
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running! Listening on port ${port}`);
});


