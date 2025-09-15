// scripts/pdf-smoke.js
const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath();

  const browser = await puppeteer.launch({
    executablePath,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.setContent('<h1>PDF Smoke Test ✅</h1><p>Hello from Crafted Scriptor.</p>', { waitUntil: 'domcontentloaded' });
  const pdf = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();
  fs.writeFileSync('smoke.pdf', pdf);
  console.log('Wrote smoke.pdf');
})();
