import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";

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
  const title = "Your Document Title"; // Replace with your title logic
  const subtitle = "Your Document Subtitle"; // Replace with your subtitle logic
  const documentStructure = ["Section 1", "Section 2"]; // Replace with your sections logic
  const sectionContents = {
    "Section 1": "<p>Content for section 1.</p>",
    "Section 2": "<p>Content for section 2.</p>",
  }; // Replace with your content logic

  // Build DOCX content
  const children = [];
  if (title) {
    children.push(new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 240 }
    }));
  }
  if (subtitle) {
    children.push(new Paragraph({
      text: subtitle,
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 160 }
    }));
  }
  documentStructure.forEach((section) => {
    children.push(new Paragraph({
      text: section,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 120 }
    }));
    // Convert HTML to plain text paragraphs
    const html = sectionContents[section] || "";
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    tmp.innerText.split(/\n+/).forEach(p => {
      if (p.trim()) {
        children.push(new Paragraph({
          children: [new TextRun(p.trim())],
          spacing: { after: 80 }
        }));
      }
    });
  });
  const doc = new Document({
    sections: [{ properties: {}, children }]
  });
  const blob = await Packer.toBlob(doc);
  return blob;
}
