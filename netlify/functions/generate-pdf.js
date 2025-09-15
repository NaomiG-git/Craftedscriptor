// /netlify/functions/generate-pdf.js

const puppeteer = require('puppeteer');
const querystring = require('querystring'); // Node.js module to parse form data

exports.handler = async function (event, context) {
  let browser;
  try {
    // When a form is submitted, the data is in the body as a query string
    const parsedBody = querystring.parse(event.body);
    const htmlContent = parsedBody.htmlContent;

    if (!htmlContent) {
      throw new Error("No HTML content received.");
    }

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
      },
      body: pdfBuffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('PDF Generation Error:', error);
    // Return an HTML error page instead of JSON
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'text/html',
      },
      body: `<html><body><h1>Error</h1><p>Failed to generate PDF: ${error.message}</p></body></html>`,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};



