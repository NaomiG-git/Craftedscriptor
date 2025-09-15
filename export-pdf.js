import endpoints from "./export-endpoints.json" assert { type: "json" };

function pageBreakCSS() {
  return `
  <style>
    @page { size: A4; margin: 20mm; }
    .section { page-break-before: always; break-before: page; }
    h1,h2,h3,h4,h5,h6 { break-inside: avoid; }
    table, tr, td, th { break-inside: avoid; }
    .no-break { break-inside: avoid; }
  </style>`;
}

function getEditorHTML() {
  const editor = document.getElementById('editor') || document.querySelector('[data-editor], .editor, #content');
  const inner = editor ? editor.innerHTML : document.body.innerHTML;
  return `<!doctype html><html><head><meta charset="utf-8">${pageBreakCSS()}</head><body>${inner}</body></html>`;
}

async function callExport(url, filenameHint) {
  const body = { html: getEditorHTML(), filenameHint };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();

  // Response can be JSON ({url, Location, key}) or bare URL; handle both.
  let urlOut = "";
  try {
    const j = JSON.parse(text);
    urlOut = j.url || j.Location || j.location || j.file || "";
    if (!urlOut && j.key) {
      // if only S3 key is returned, build a bucket URL if your API didn’t return a presigned one
      // Adjust bucket if ever needed:
      urlOut = `https://crafted-scriptor-exports.s3.ca-central-1.amazonaws.com/${j.key}`;
    }
  } catch { /* not JSON */ }

  if (!urlOut && /^https?:\/\//.test(text.trim())) urlOut = text.trim();

  if (!urlOut) throw new Error(`Export succeeded but no URL found:\n${text}`);

  window.open(urlOut, "_blank");
  return urlOut;
}

export async function exportPDF() {
  if (!endpoints?.PDF_URL) throw new Error("PDF_URL missing in export-endpoints.json");
  return callExport(endpoints.PDF_URL, "project.pdf");
}
