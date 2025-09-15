import endpoints from "./export-endpoints.json" assert { type: "json" };

function getEditorHTML() {
  const editor = document.getElementById('editor') || document.querySelector('[data-editor], .editor, #content');
  const inner = editor ? editor.innerHTML : document.body.innerHTML;
  return `<!doctype html><html><head><meta charset="utf-8"></head><body>${inner}</body></html>`;
}

async function callExport(url, filenameHint) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html: getEditorHTML(), filenameHint }),
  });

  const text = await res.text();
  let urlOut = "";
  try {
    const j = JSON.parse(text);
    urlOut = j.url || j.Location || j.location || j.file || "";
    if (!urlOut && j.key) {
      urlOut = `https://crafted-scriptor-exports.s3.ca-central-1.amazonaws.com/${j.key}`;
    }
  } catch {}

  if (!urlOut && /^https?:\/\//.test(text.trim())) urlOut = text.trim();

  if (!urlOut) throw new Error(`Export succeeded but no URL found:\n${text}`);

  window.open(urlOut, "_blank");
  return urlOut;
}

export async function exportDOCX() {
  if (!endpoints?.DOCX_URL) throw new Error("DOCX_URL missing in export-endpoints.json");
  return callExport(endpoints.DOCX_URL, "project.docx");
}
