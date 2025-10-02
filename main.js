// main.js – stable build with Delete/Rename Section
document.addEventListener('DOMContentLoaded', () => {
  // --- Client-side export libs (provided by script tags) ---
  const TurndownService = window.TurndownService;
  const htmlToDocx = window.htmlToDocx; // from html-to-docx.umd.js
  // ⬇️ API endpoints
  // Keep PDF using API_BASE if configured later. For DOCX we use the full URL explicitly as requested.
  const API_BASE = 'https://8fcufgvt4m.execute-api.ca-central-1.amazonaws.com';
  // Derive DOCX endpoint from the single source of truth to avoid hostname drift/typos
  const DOCX_EXPORT_URL = `${API_BASE}/export/docx`;


  // --- Elements ---
  const saveButton = document.getElementById('save-button');
  const saveStatus = document.getElementById('save-status');
  const subscribeModal = document.getElementById('subscribe-modal');
  const structureList = document.getElementById('book-structure-list');
  const addSectionButton = document.getElementById('add-section-button');

  // Background controls removed from UI
  const setBackgroundButton = null;
  const clearBackgroundButton = null;
  const backgroundFileInput = null;

  const uploadManuscriptButton = document.getElementById('upload-manuscript-button');
  const manuscriptFileInput = document.getElementById('manuscript-file-input');

  const writingCanvasPlaceholder = document.getElementById('writing-canvas-placeholder');
  const writingCanvas = document.getElementById('writing-canvas');
  const editorToolbar = document.querySelector('.editor-toolbar');

  const promptButton = document.getElementById('prompt-button');
  const nicheSelector = document.getElementById('niche-selector');
  const promptDisplay = document.getElementById('prompt-display');


  const editor = document.getElementById('editor');
  const goalInput = document.getElementById('goal-input');
  const wordCountDisplay = document.getElementById('word-count-display');
  const bookTitleInput = document.getElementById('book-title-input');
  const bookSubtitleInput = document.getElementById('book-subtitle-input');

  const deleteProjectButton = document.getElementById('delete-project-button');

  // --- Toasts ---
  function showToast(message, type = 'info', title = '') {
    const container = document.getElementById('toast-container');
    if (!container) { alert(message); return; }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info';
    toast.innerHTML = `
      <div class="icon"><i class="fa-solid ${icon}"></i></div>
      <div class="content">
        ${title ? `<div class="title">${title}</div>` : ''}
        <div class="message">${message}</div>
      </div>
      <button class="close" aria-label="Close">&times;</button>
    `;
    const close = () => {
      toast.style.animation = 'toast-out 200ms ease forwards';
      setTimeout(() => container.removeChild(toast), 180);
    };
    toast.querySelector('.close').addEventListener('click', close);
    container.appendChild(toast);
    setTimeout(close, 4000);
  }

  // --- Theme toggle (optional) ---
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      localStorage.setItem('craftedTheme',
        document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    });
    if (localStorage.getItem('craftedTheme') === 'dark') {
      document.body.classList.add('dark-mode');
    }
  }

  // --- Download Dropdown ---
  const downloadDropdownButton = document.getElementById('download-dropdown-button');
  const downloadOptionsMenu = document.getElementById('download-options-menu');
  const downloadPdfButton = document.getElementById('download-pdf');
  const downloadDocxButton = document.getElementById('download-docx');
  
  const downloadHtmlButton = document.getElementById('download-html');
  const downloadMdButton = document.getElementById('download-md');
  const downloadTxtButton = document.getElementById('download-txt');

  // --- State ---
  const userStatus = 'subscribed';
  let activeSection = null;
  const sectionContents = {};
  let documentStructure = [
    "Title Page", "Copyright", "Dedication", "Table of Contents",
    "Foreword", "Introduction", "Chapter 1"
  ];

  // Prompts: prefer window.PROMPTS; fallback keeps app safe
  const FALLBACK_PROMPTS = {
    "lead-magnet": ["Give 5 quick wins your audience can achieve this week."],
    "self-help": ["Describe a tiny habit that creates outsized change."]
  };
  const PROMPTS = window.PROMPTS || FALLBACK_PROMPTS;

  // --- Save / Load ---
  function saveProject() {
    if (activeSection) sectionContents[activeSection] = editor.innerHTML;
    const projectData = {
      title: bookTitleInput.value,
      subtitle: bookSubtitleInput.value,
      structure: documentStructure,
      contents: sectionContents
    };
    localStorage.setItem('craftedScriptorProject', JSON.stringify(projectData));
    saveStatus.classList.remove('hidden');
    saveStatus.textContent = 'Saved!';
    setTimeout(() => saveStatus.classList.add('hidden'), 1200);
  }

  function loadProject() {
    const saved = localStorage.getItem('craftedScriptorProject');
    if (saved) {
      const p = JSON.parse(saved);
      bookTitleInput.value = p.title || '';
      bookSubtitleInput.value = p.subtitle || '';
      documentStructure = Array.isArray(p.structure) && p.structure.length ? p.structure : documentStructure;
      Object.assign(sectionContents, p.contents || {});
    }
    renderStructure();
  }

  // --- Outline render (with delete button and right-click rename) ---
  function renderStructure() {
    structureList.innerHTML = '';
    documentStructure.forEach(name => {
      if (!(name in sectionContents)) sectionContents[name] = '';

      const li = document.createElement('li');
      li.dataset.section = name;

      const titleSpan = document.createElement('span');
      titleSpan.className = 'section-title';
      titleSpan.textContent = name;

      const delBtn = document.createElement('span');
      delBtn.className = 'delete-section';
      delBtn.title = 'Delete section';
      delBtn.textContent = '×';

      li.appendChild(titleSpan);
      li.appendChild(delBtn);
      structureList.appendChild(li);
    });
  }


  // --- Add / Delete / Rename sections ---
  function addNewSection() {
    const n = prompt("Enter the name for the new section:",
      `Chapter ${documentStructure.filter(s => s.startsWith('Chapter')).length + 1}`);
    if (n && n.trim()) {
      const name = n.trim();
      documentStructure.push(name);
      sectionContents[name] = sectionContents[name] || '';
      renderStructure();
      // Auto-open the new section
      openSection(name);
    }
  }

  function deleteSection(name) {
    if (!name) return;
    if (!documentStructure.includes(name)) return;

    const confirmed = confirm(`Delete "${name}"? This removes its content from this project.`);
    if (!confirmed) return;

    // Remove from structure
    documentStructure = documentStructure.filter(s => s !== name);
    // Remove its content
    delete sectionContents[name];

    // If deleting the active one, clear editor and show placeholder
    if (activeSection === name) {
      activeSection = null;
      editor.innerHTML = '';
      writingCanvas.classList.add('hidden');
      writingCanvasPlaceholder.classList.remove('hidden');
    }

    renderStructure();
    saveProject();
  }

  function renameSection(oldName) {
    if (!oldName) return;
    const idx = documentStructure.indexOf(oldName);
    if (idx === -1) return;

    const newName = prompt('Rename section to:', oldName);
    if (!newName || !newName.trim()) return;
    const trimmed = newName.trim();

    // If name unchanged, do nothing
    if (trimmed === oldName) return;

    // If new name already exists, warn and stop
    if (documentStructure.includes(trimmed)) {
  showToast('A section with that name already exists.', 'info', 'Duplicate Name');
      return;
    }

    // Move content
    sectionContents[trimmed] = sectionContents[oldName] || '';
    delete sectionContents[oldName];

    // Update structure
    documentStructure[idx] = trimmed;

    // Update activeSection if needed
    if (activeSection === oldName) activeSection = trimmed;

    renderStructure();
    saveProject();
  }

  function openSection(name) {
    if (!name) return;
    if (activeSection) sectionContents[activeSection] = editor.innerHTML;

    activeSection = name;

    structureList.querySelectorAll('li').forEach(x => x.classList.remove('active'));
    const li = [...structureList.querySelectorAll('li')].find(li => li.dataset.section === name);
    if (li) li.classList.add('active');

    editor.innerHTML = sectionContents[activeSection] || '';
    writingCanvasPlaceholder.classList.add('hidden');
    writingCanvas.classList.remove('hidden');
    updateWordCount();
    editor.focus();
  }

  // Clicks in outline: open section or delete
  function handleOutlineClick(e) {
    const del = e.target.closest('.delete-section');
    if (del) {
      const li = del.closest('li');
      if (!li) return;
      deleteSection(li.dataset.section);
      return;
    }
    const li = e.target.closest('li');
    if (!li) return;
    openSection(li.dataset.section);
  }

  // Right-click rename
  function handleOutlineContextMenu(e) {
    const titleEl = e.target.closest('.section-title');
    if (!titleEl) return;
    e.preventDefault();
    const li = titleEl.closest('li');
    if (!li) return;
    renameSection(li.dataset.section);
  }

  // --- Background image ---
  function handleSetBackgroundClick() { /* removed */ }
  function handleFileSelect(e) { /* removed */ }
  function handleClearBackgroundClick() { /* removed */ }

  // --- Inspiration Station ---
  function getInspiration() {
    const niche = nicheSelector.value;
    if (!niche || niche === 'default') {
      promptDisplay.textContent = "Please select a niche first!";
      return;
    }
    const list = PROMPTS[niche] || [];
    if (!list.length) {
      promptDisplay.textContent = "No prompts for this niche yet. Try another!";
      return;
    }
    const pick = list[Math.floor(Math.random() * list.length)];
    promptDisplay.textContent = pick;
  }

  // --- Exports (each section starts on a new page) ---
function cleanTextForExport(html) {
  // Replace non-breaking spaces with regular spaces
  let cleaned = (html || '').replace(/&nbsp;/g, ' ');

  // If content contains apparent Markdown (e.g., lines starting with * , -, #), attempt to convert to HTML
  // Only apply when we detect lack of HTML block tags but presence of markdown markers.
  const looksLikeMarkdown = /(^|\n)\s*([*\-+]\s+|#{1,6}\s+|>\s+|\d+\.\s+)/.test(cleaned) && !/<\w+[^>]*>/.test(cleaned);
  try {
    if (looksLikeMarkdown && window.marked) {
      cleaned = window.marked.parse(cleaned);
    }
  } catch (e) { /* fallback to raw */ }

  // Convert inline markdown markers within existing HTML (e.g., **bold**, *italic*, `code`)
  try {
    const skipTags = new Set(['CODE','PRE','A','SCRIPT','STYLE']);
    const container = document.createElement('div');
    container.innerHTML = cleaned;

    function transformTextNode(node) {
      const text = node.nodeValue;
      if (!text || !/[`*]/.test(text)) return; // quick exit
      const frag = document.createDocumentFragment();
      let i = 0;

      const patterns = [
        { re: /`([^`]+?)`/, wrap: (t)=>{ const c=document.createElement('code'); c.textContent=t; return c; } },
        { re: /\*\*([^*]+?)\*\*/, wrap: (t)=>{ const b=document.createElement('strong'); b.textContent=t; return b; } },
        { re: /(?<!\*)\*([^*]+?)\*(?!\*)/, wrap: (t)=>{ const em=document.createElement('em'); em.textContent=t; return em; } }
      ];

      let remaining = text;
      while (remaining.length) {
        let earliest = null;
        let pat = null;
        for (const p of patterns) {
          const m = remaining.match(p.re);
          if (m) {
            const idx = m.index;
            if (earliest === null || idx < earliest) { earliest = idx; pat = { m, p }; }
          }
        }
        if (earliest === null) {
          frag.appendChild(document.createTextNode(remaining));
          break;
        }
        if (earliest > 0) frag.appendChild(document.createTextNode(remaining.slice(0, earliest)));
        const content = pat.m[1];
        frag.appendChild(pat.p.wrap(content));
        remaining = remaining.slice(earliest + pat.m[0].length);
      }
      node.parentNode.replaceChild(frag, node);
    }

    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        // only transform if parent chain does not include skip tags
        let cur = node.parentNode;
        while (cur) { if (skipTags.has(cur.nodeName)) return; cur = cur.parentNode; }
        transformTextNode(node);
        return;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        // process children snapshot to avoid live list issues
        const children = Array.from(node.childNodes);
        for (const child of children) walk(child);
      }
    }
    walk(container);
    cleaned = container.innerHTML;
  } catch (e) { /* non-fatal */ }

  // Normalize multiple spaces
  cleaned = cleaned.replace(/ +/g, ' ');
  // Remove spaces before punctuation
  cleaned = cleaned.replace(/\s+([,.!?;:])/g, '$1');
  return cleaned;
}

function getFullDocumentHtml(forDocx = false) {
  if (activeSection) sectionContents[activeSection] = editor.innerHTML;
  const title = bookTitleInput.value || "Untitled Document";
  const subtitle = bookSubtitleInput.value;
  let body = `<h1>${title}</h1>`;
  if (subtitle) body += `<h2>${subtitle}</h2>`;
  documentStructure.forEach((name, idx) => {
    let html = sectionContents[name] || '<p></p>';
    html = cleanTextForExport(html);
    const firstClass = idx === 0 ? " first" : "";
    body += `<section class="chapter${firstClass}"><h1 class="chapter-title">${name}</h1>${html}</section>`;
  });
  const styles = `<style>
    body{font-family:'Merriweather',serif;font-size:12pt;line-height:1.5;}
    h1,h2,h3{font-family:'Lato',sans-serif;}
    img{max-width:100%;height:auto;}
    p{margin:0 0 12pt;}
    ul,ol{margin:0 0 12pt 24pt;}
    li{margin:4pt 0;}
    blockquote{margin:12pt 24pt;border-left:3px solid #ccc;padding-left:12pt;color:#555;}
    pre,code{font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;}
    pre{background:#f6f8fa;border:1px solid #e1e4e8;border-radius:4px;padding:8pt;overflow:auto;margin:0 0 12pt;}
    table{border-collapse:collapse;margin:0 0 12pt;width:100%;}
    th,td{border:1px solid #ddd;padding:6pt;}
    @media print{
      h1{break-before:page;page-break-before:always;margin-top:0;padding-top:0;}
      body{font-size:12pt;line-height:1.5;word-spacing:normal;letter-spacing:normal;white-space:normal;}
      p{margin:0 0 12pt;}
      #editor,body{padding:0!important;min-height:0!important;}
      @page{margin:1in;}
    }
  </style>`;
  return `<!doctype html><html><head><title>${title}</title>${styles}</head><body>${body}</body></html>`;
}

// --- PDF Export (server-side via AWS API) ---
async function downloadAsPdf() {
  try {
    const html = getFullDocumentHtml(true);
    const filenameHint = (bookTitleInput.value || 'document').trim() || 'document';
    const { widthTwips, heightTwips, marginTwips } = getPageSizeAndMargins();
    const res = await fetch(`${API_BASE}/export/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html,
        filenameHint,
        pageSize: { width: widthTwips, height: heightTwips },
        margins: { top: marginTwips, right: marginTwips, bottom: marginTwips, left: marginTwips }
      })
    });
    if (!res.ok) throw new Error(`PDF export failed: ${await res.text()}`);
    const data = await res.json();
    window.open(data.url, '_blank');
  } catch (err) {
  showToast('PDF export failed. Please try again.', 'error', 'Export Error');
    console.error(err);
  }
}

// --- DOCX Export (server-side via AWS API) ---
function mmToInches(mm) { return mm / 25.4; }
function inToTwips(inches) { return Math.round(inches * 1440); }
function getPageSizeAndMargins() {
  let size = globalCanvasSize || { width: 8.5, height: 11, unit: 'in' };
  let widthIn = size.width;
  let heightIn = size.height;
  let marginIn = 1;
  if (size.unit === 'mm') {
    widthIn = mmToInches(size.width);
    heightIn = mmToInches(size.height);
  }
  // Standard margins by size
  if (canvasSizeSelect.value === 'A5') marginIn = 0.75;
  if (canvasSizeSelect.value === 'Custom' && customUnitSelect.value === 'mm') marginIn = 0.75;
  if (canvasSizeSelect.value === 'Custom' && customUnitSelect.value === 'in') marginIn = 1;
  return {
    widthTwips: inToTwips(widthIn),
    heightTwips: inToTwips(heightIn),
    marginTwips: inToTwips(marginIn)
  };
}

async function downloadAsDocx() {
  try {
  const html = getFullDocumentHtml(true);
    // Inject page-breaks for DOCX only: make each chapter H1 start on a new page, except the first
    function addDocxPageBreaks(htmlStr){
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlStr, 'text/html');
        const chapters = Array.from(doc.querySelectorAll('section.chapter'));
        chapters.forEach((sec, idx) => {
          if (idx === 0) return; // keep first chapter on same page
          // Insert an explicit page-break block BEFORE the section (top-level block is more reliable)
          const pb = doc.createElement('div');
          pb.setAttribute('style', 'page-break-before: always; break-before: page;');
          if (sec.parentNode) {
            sec.parentNode.insertBefore(pb, sec);
          } else {
            // Fallback: if no parent, keep as first child
            sec.insertBefore(pb, sec.firstChild);
          }
          // Also reinforce on the chapter heading itself
          const h = sec.querySelector('h1.chapter-title');
          if (h) {
            const existing = h.getAttribute('style') || '';
            h.setAttribute('style', (existing + ';page-break-before: always; break-before: page;').replace(/^;+/,'').trim());
          }
        });
        // Also add page-break-after to each section except the last, to further enforce separation
        chapters.forEach((sec, idx) => {
          if (idx === chapters.length - 1) return; // skip last
          const tail = doc.createElement('div');
          tail.setAttribute('style', 'page-break-after: always; break-after: page;');
          sec.appendChild(tail);
        });
        return '<!doctype html>' + doc.documentElement.outerHTML;
      } catch { return htmlStr; }
    }
    const htmlForDocx = addDocxPageBreaks(html);
    const filenameHint = (bookTitleInput.value || 'document').trim() || 'document';
    const { widthTwips, heightTwips, marginTwips } = getPageSizeAndMargins();

    // Use server (returns a presigned URL)
    const res = await fetch(DOCX_EXPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: htmlForDocx,
        filenameHint,
        pageSize: { width: widthTwips, height: heightTwips },
        margins: { top: marginTwips, right: marginTwips, bottom: marginTwips, left: marginTwips }
      })
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`DOCX export failed (${res.status}): ${txt || 'Unknown error'}`);
    }

    // Handle either JSON response with { url } or direct blob (defensive)
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (data && data.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('Unexpected response: missing download URL');
      }
    } else {
      const blob = await res.blob();
      triggerDownload(blob, `${filenameHint || 'document'}.docx`);
    }
  } catch (err) {
  showToast('DOCX export failed. Please check your internet connection or try again in a moment.', 'error', 'Export Error');
    console.error(err);
  }
}

  function downloadAsHtml() {
    const blob = new Blob([getFullDocumentHtml()], { type: 'text/html' });
    triggerDownload(blob, 'document.html');
  }

  function downloadAsMarkdown() {
    const td = new TurndownService();
    const md = td.turndown(getFullDocumentHtml());
    triggerDownload(new Blob([md], { type: 'text/markdown' }), 'document.md');
  }

  function downloadAsTxt() {
    const tmp = document.createElement('div');
    tmp.innerHTML = getFullDocumentHtml();
    triggerDownload(new Blob([tmp.innerText], { type: 'text/plain' }), 'document.txt');
  }

  // --- Toolbar ---
  let savedCursor = null;
  function saveCursorPosition() {
    const sel = window.getSelection();
    if (sel.rangeCount) savedCursor = sel.getRangeAt(0);
  }
  function insertImageAtCursor(src) {
    if (savedCursor) {
      const sel = window.getSelection();
      sel.removeAllRanges(); sel.addRange(savedCursor);
    } else {
      editor.focus();
    }
    document.execCommand('insertImage', false, src);
  }

  function handleToolbarClick(e) {
    const el = e.target.closest('[data-command]');
    if (!el) return;
    const cmd = el.dataset.command;
    let val = el.value || null;

    if (cmd === 'createLink') {
      val = prompt('Enter URL:');
      if (!val) return;
      document.execCommand(cmd, false, val);
    } else if (cmd === 'insertImage') {
      saveCursorPosition();
      document.getElementById('image-insert-modal').classList.remove('hidden');
    } else {
      document.execCommand(cmd, false, val);
    }
  }

  // --- Download dropdown / modal basics ---
  function handleDownloadClick() {
    if (userStatus !== 'subscribed') {
      subscribeModal.classList.remove('hidden');
      return;
    }
    downloadOptionsMenu.classList.toggle('hidden');
    downloadDropdownButton.parentElement.classList.toggle('open');
  }
  function closeModal(modal) { if (modal) modal.classList.add('hidden'); }

  // --- Delete Project (clear everything) ---
  function deleteProject() {
    const ok = confirm('Delete this entire project? This cannot be undone.');
    if (!ok) return;

    localStorage.removeItem('craftedScriptorProject');
    // Reset state
    for (const k in sectionContents) delete sectionContents[k];
    documentStructure = [
      "Title Page","Copyright","Dedication","Table of Contents",
      "Foreword","Introduction","Chapter 1"
    ];
    activeSection = null;
    editor.innerHTML = '';
    writingCanvas.classList.add('hidden');
    writingCanvasPlaceholder.classList.remove('hidden');
    bookTitleInput.value = '';
    bookSubtitleInput.value = '';
    renderStructure();
  }

  // --- DOCX Upload into selected section ---
  function handleManuscriptClick() {
    if (!activeSection) {
  showToast('Select a section in the outline first, then upload.', 'info');
      return;
    }
    manuscriptFileInput.click();
  }
  function handleManuscriptFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!/\.docx$/i.test(file.name)) {
  showToast('Please choose a .docx file.', 'info');
      return;
    }
    mammoth.convertToHtml({ arrayBuffer: file.arrayBuffer() })
      .then(result => {
        // Insert the converted HTML into the active section only
        const html = result.value || '';
        const existing = sectionContents[activeSection] || '';
        sectionContents[activeSection] = existing + html;
        editor.innerHTML = sectionContents[activeSection];
        editor.focus();
        updateWordCount();
        saveProject();
        manuscriptFileInput.value = ''; // reset
      })
      .catch(err => {
        console.error(err);
  showToast('Upload failed. (Mammoth conversion error)', 'error', 'Upload Error');
      });
  }

  // --- Canvas Size Controls ---
  const canvasSizeSelect = document.getElementById('canvas-size-select');
  const customSizeFields = document.getElementById('custom-size-fields');
  const customWidthInput = document.getElementById('custom-width');
  const customHeightInput = document.getElementById('custom-height');
  const customUnitSelect = document.getElementById('custom-unit');

  // Standard sizes in inches
  const canvasSizes = {
    A4: { width: 8.27, height: 11.69, unit: 'in' },
    A5: { width: 5.83, height: 8.27, unit: 'in' },
    Letter: { width: 8.5, height: 11, unit: 'in' },
    Workbook: { width: 8.5, height: 11, unit: 'in' }
  };

  // Convert to pixels
  function toPixels(value, unit) {
    if (unit === 'in') return value * 96;
    if (unit === 'mm') return value * 96 / 25.4;
    return value; // px
  }

  let globalCanvasSize = { ...canvasSizes['Letter'] };

  function updateCanvasSize() {
    let size;
    if (canvasSizeSelect.value === 'Custom') {
      const width = parseFloat(customWidthInput.value) || 8.5;
      const height = parseFloat(customHeightInput.value) || 11;
      const unit = customUnitSelect.value;
      size = { width, height, unit };
    } else {
      size = canvasSizes[canvasSizeSelect.value] || canvasSizes['Letter'];
    }
    globalCanvasSize = size;
    applyCanvasSize();
  }

  function applyCanvasSize() {
    const pxWidth = toPixels(globalCanvasSize.width, globalCanvasSize.unit);
    const pxHeight = toPixels(globalCanvasSize.height, globalCanvasSize.unit);
    const canvasArea = document.getElementById('canvas-area');
    if (canvasArea) {
      canvasArea.style.width = pxWidth + 'px';
      canvasArea.style.height = pxHeight + 'px';
    }
    // Optionally, update placeholder for consistency
    writingCanvasPlaceholder.style.width = pxWidth + 'px';
    writingCanvasPlaceholder.style.height = pxHeight + 'px';
  }

  // Show/hide custom fields
  canvasSizeSelect.addEventListener('change', () => {
    if (canvasSizeSelect.value === 'Custom') {
      customSizeFields.classList.remove('hidden');
    } else {
      customSizeFields.classList.add('hidden');
    }
    updateCanvasSize();
  });
  [customWidthInput, customHeightInput, customUnitSelect].forEach(input => {
    input.addEventListener('input', updateCanvasSize);
    input.addEventListener('change', updateCanvasSize);
  });

  // Initial size
  updateCanvasSize();

  // --- Events ---
  saveButton.addEventListener('click', saveProject);

  structureList.addEventListener('click', handleOutlineClick);
  structureList.addEventListener('contextmenu', handleOutlineContextMenu);
  addSectionButton.addEventListener('click', addNewSection);

  // Background buttons removed; no wiring needed

  uploadManuscriptButton.addEventListener('click', handleManuscriptClick);
  manuscriptFileInput.addEventListener('change', handleManuscriptFile);

  editorToolbar.addEventListener('click', handleToolbarClick);
  editorToolbar.addEventListener('change', handleToolbarClick);

  promptButton.addEventListener('click', getInspiration);

  // download menu
  downloadDropdownButton.addEventListener('click', handleDownloadClick);
  downloadPdfButton.addEventListener('click', e => { e.preventDefault(); downloadAsPdf(); });
  downloadDocxButton.addEventListener('click', e => { e.preventDefault(); downloadAsDocx(); });
  
  if (downloadHtmlButton) downloadHtmlButton.addEventListener('click', e => { e.preventDefault(); downloadAsHtml(); });
  if (downloadMdButton) downloadMdButton.addEventListener('click', e => { e.preventDefault(); downloadAsMarkdown(); });
  if (downloadTxtButton) downloadTxtButton.addEventListener('click', e => { e.preventDefault(); downloadAsTxt(); });

  // modals
  document.querySelectorAll('.modal-close-button').forEach(btn =>
    btn.addEventListener('click', ev => closeModal(ev.target.closest('.modal-overlay')))
  );
  document.querySelectorAll('.modal-overlay').forEach(overlay =>
    overlay.addEventListener('click', ev => { if (ev.target === overlay) closeModal(overlay); })
  );

  // image modal internals
  const imageInsertModal = document.getElementById('image-insert-modal');
  const dropZone = document.getElementById('drop-zone');
  const imageFileInput = document.getElementById('image-file-input');
  const imageSizeSelect = document.getElementById('image-size');
  const imageAlignSelect = document.getElementById('image-align');

  document.getElementById('browse-file-button')
    .addEventListener('click', () => imageFileInput.click());

  function insertStyledImage(src) {
    const size = imageSizeSelect ? imageSizeSelect.value : '100';
    const align = imageAlignSelect ? imageAlignSelect.value : 'center';
    let style = `width:${size}%;max-width:100%;height:auto;`;
    let divStyle = '';
    if (align === 'left') divStyle = 'text-align:left;';
    else if (align === 'center') divStyle = 'text-align:center;';
    else if (align === 'right') divStyle = 'text-align:right;';
    const html = `<div style="${divStyle}"><img src="${src}" style="${style}" /></div>`;
    if (savedCursor) {
      const sel = window.getSelection();
      sel.removeAllRanges(); sel.addRange(savedCursor);
    } else {
      editor.focus();
    }
    document.execCommand('insertHTML', false, html);
  }

  imageFileInput.addEventListener('change', e => {
    if (e.target.files.length) {
      const file = e.target.files[0];
      const r = new FileReader();
      r.onload = ev => { insertStyledImage(ev.target.result); closeModal(imageInsertModal); };
      r.readAsDataURL(file);
    }
  });

  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      const file = e.dataTransfer.files[0];
      const r = new FileReader();
      r.onload = ev => { insertImageAtCursor(ev.target.result); closeModal(imageInsertModal); };
      r.readAsDataURL(file);
    }
  });

  // editor word count
  // Confetti spray when goal reached
  let confettiFiredForGoal = false;
  function fireConfetti() {
    try {
      if (window.confetti) {
        const end = Date.now() + 600; // ~0.6s burst
        const colors = ['#a1866f', '#8f7762', '#bfa98a', '#8c6f5a', '#c7b9a4'];
        (function frame() {
          window.confetti({
            particleCount: 80,
            spread: 70,
            startVelocity: 45,
            ticks: 200,
            gravity: 0.9,
            colors
          });
          if (Date.now() < end) requestAnimationFrame(frame);
        })();
      }
    } catch {}
  }
  function updateWordCount() {
    const text = editor.innerText || '';
    const words = text.trim().length ? text.trim().split(/\s+/).length : 0;
    const goal = parseInt(goalInput.value || '0', 10) || 0;
    wordCountDisplay.textContent = `${words} / ${goal}`;
    if (goal > 0) {
      if (!confettiFiredForGoal && words >= goal) {
        confettiFiredForGoal = true;
        fireConfetti();
        showToast('Goal reached — amazing work!', 'success', 'Milestone');
      } else if (confettiFiredForGoal && words < goal) {
        confettiFiredForGoal = false;
      }
    } else {
      confettiFiredForGoal = false;
    }
  }
  editor.addEventListener('input', updateWordCount);
  goalInput.addEventListener('change', () => { confettiFiredForGoal = false; updateWordCount(); });

  // Delete project
  if (deleteProjectButton) deleteProjectButton.addEventListener('click', deleteProject);

  // init
  loadProject();
  updateWordCount();

  // Focus editor so paste works immediately
  editor.setAttribute('contenteditable', 'true');

  // --- Search and Replace (global) ---
  function escapeRegex(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function handleSearchReplace() {
    const searchInput = document.getElementById('search-word');
    const replaceInput = document.getElementById('replace-word');
    const searchWord = (searchInput?.value ?? '').trim();
    const replaceWord = replaceInput?.value ?? '';
    if (!searchWord) return;

    // Sync current editor content back to the model before replacing across sections
    if (activeSection) {
      sectionContents[activeSection] = editor.innerHTML;
    }

    // Simple global, case-insensitive replace operating on TEXT NODES (DOM-aware)
    const pattern = escapeRegex(searchWord);
    let re;
    try { re = new RegExp(pattern, 'gi'); } catch (e) { console.error('Invalid search pattern', e); return; }

    function replaceInDomText(rootEl, regex, replacement) {
      let count = 0;
      const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const p = node.parentNode;
          if (!p) return NodeFilter.FILTER_REJECT;
          const tag = p.nodeName;
          if (tag === 'SCRIPT' || tag === 'STYLE') return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      let cur;
      while ((cur = walker.nextNode())) {
        const text = cur.nodeValue || '';
        if (!text) continue;
        const reForCount = new RegExp(regex.source, regex.flags);
        const matches = text.match(reForCount);
        if (matches && matches.length) {
          count += matches.length;
          const reForReplace = new RegExp(regex.source, regex.flags);
          cur.nodeValue = text.replace(reForReplace, () => replacement);
        }
      }
      return count;
    }

    function replaceInHtmlString(htmlStr, regex, replacement) {
      const tmp = document.createElement('div');
      tmp.innerHTML = htmlStr || '';
      const count = replaceInDomText(tmp, regex, replacement);
      return { html: tmp.innerHTML, count };
    }

    let total = 0;
    if (activeSection) {
      total += replaceInDomText(editor, re, replaceWord);
      sectionContents[activeSection] = editor.innerHTML;
    } else {
      Object.keys(sectionContents).forEach(section => {
        const htmlStr = typeof sectionContents[section] === 'string' ? sectionContents[section] : '';
        const { html, count } = replaceInHtmlString(htmlStr, re, replaceWord);
        sectionContents[section] = html;
        total += count;
      });
    }

    saveProject();
    updateWordCount();
    if (total > 0) {
      showToast(`Replaced ${total} occurrence${total === 1 ? '' : 's'} of "${searchWord}".`, 'success', 'Find & Replace');
    } else {
      showToast('No matches found.', 'info', 'Find & Replace');
    }
  }

  function initSearchReplaceBar() {
    const bar = document.getElementById('search-replace-bar');
    if (!bar || bar.dataset.initialized === 'true') return;
    bar.dataset.initialized = 'true';
    const searchReplaceDiv = document.createElement('div');
    searchReplaceDiv.style.display = 'inline-block';
    searchReplaceDiv.innerHTML = `
      <label>Search & Replace:&nbsp;
        <input type="text" id="search-word" placeholder="Find..." style="width:130px;">
        <input type="text" id="replace-word" placeholder="Replace with..." style="width:150px;">
        <button id="search-replace-btn" class="header-button" style="margin-left:8px;">Replace All</button>
      </label>
    `;
    bar.appendChild(searchReplaceDiv);
    const btn = document.getElementById('search-replace-btn');
    if (btn) btn.addEventListener('click', handleSearchReplace);
    const sEl = document.getElementById('search-word');
    const rEl = document.getElementById('replace-word');
    [sEl, rEl].forEach(el => el && el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); handleSearchReplace(); }
    }));
  }

  // Initialize the search bar now that DOM and editor are ready
  initSearchReplaceBar();
});

// Remove window.htmlDocx and wireDeleteProject references
document.addEventListener('DOMContentLoaded', () => {
  try {  } catch (e) { console.error('Delete wiring failed:', e); }
});

(function wireExportsOnce(){
  if (window._wiredExports) return;
  window._wiredExports = true;
  // Remove legacy exportPDF and exportDOCX references (intentionally left blank)
})();


