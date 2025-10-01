// scripts/pdf-api-smoke.js
// Quick sanity check for the PDF export endpoint. Posts minimal HTML and prints the presigned URL.
// Usage: node scripts/pdf-api-smoke.js

const fs = require('fs');

(async () => {
  const endpoints = JSON.parse(fs.readFileSync(require('path').join(__dirname, '..', 'export-endpoints.json'), 'utf8'));
  const url = endpoints.PDF_URL;
  if (!url) {
    console.error('PDF_URL not found in export-endpoints.json');
    process.exit(1);
  }

  const payload = {
    html: '<!doctype html><html><head><meta charset="utf-8"><title>Smoke</title></head><body><h1>PDF Smoke Test ✅</h1><p>Hello from Crafted Scriptor.</p></body></html>',
    filenameHint: 'smoke-test'
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${txt}`);
    }
    if (!contentType.includes('application/json')) {
      console.error('Unexpected content-type:', contentType);
    }
    const data = await res.json();
    if (!data || !data.url) {
      console.error('Response missing url:', data);
      process.exit(1);
    }
    console.log('PDF presigned URL:', data.url);
    console.log('Open that URL in a browser to confirm the download.');
  } catch (err) {
    console.error('PDF smoke test failed:', err);
    process.exit(1);
  }
})();
