// scripts/health.js
const { execSync } = require('child_process');
const puppeteer = require('puppeteer');

try {
  const path = process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath();
  console.log('Using browser:', path);
  const out = execSync(`ldd "${path}"`, { stdio: 'pipe' }).toString();
  const missing = out.split('\n').filter(l => l.includes('not found'));
  if (missing.length) {
    console.log('Missing libs:\n' + missing.join('\n'));
  } else {
    console.log('All deps present ✅');
  }
} catch (e) {
  console.error('Health check failed:', e.message);
}
