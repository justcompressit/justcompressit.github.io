/* Shared helpers for all JustCompressIt tools */
window.CK = (() => {
  const $ = id => document.getElementById(id);
  const fmt = b => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(2) + ' MB';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const baseName = n => n.replace(/\.[^.]+$/, '');
  const tick = () => new Promise(r => setTimeout(r, 0));
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function setupDrop(dropId, inputId, accept, onFiles) {
    const drop = $(dropId), input = $(inputId);
    drop.addEventListener('click', () => input.click());
    drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    input.addEventListener('change', () => { const f = [...input.files].filter(accept); input.value = ''; if (f.length) onFiles(f); });
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => { const f = [...e.dataTransfer.files].filter(accept); if (f.length) onFiles(f); });
  }

  async function decodeImage(file) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch {
      return await new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res(im); im.onerror = () => rej(new Error('Unsupported image'));
        im.src = URL.createObjectURL(file);
      });
    }
  }

  const isImage = f => /^image\//.test(f.type);
  const isPdf = f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);

  /* A reorderable file list: items = [{file, ...}], render(item) returns inner html for middle column */
  function fileList(listEl, items, opts = {}) {
    function render() {
      listEl.innerHTML = '';
      items.forEach((it, i) => {
        const el = document.createElement('div');
        el.className = 'item';
        el.innerHTML = `<div class="thumb" ${it.thumb ? `style="background-image:url('${it.thumb}')"` : ''}>${it.thumb ? '' : (opts.label || '')}</div>
          <div style="min-width:0"><div class="name">${esc(it.file.name)}</div><div class="meta">${it.meta || fmt(it.file.size)}</div></div>
          <div class="act ord">
            <button class="iconbtn" title="Move up" ${i === 0 ? 'disabled' : ''} data-a="up">↑</button>
            <button class="iconbtn" title="Move down" ${i === items.length - 1 ? 'disabled' : ''} data-a="down">↓</button>
            <button class="iconbtn" title="Remove" data-a="rm">✕</button>
          </div>`;
        el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
          const a = b.dataset.a;
          if (a === 'up' && i > 0) [items[i - 1], items[i]] = [items[i], items[i - 1]];
          if (a === 'down' && i < items.length - 1) [items[i + 1], items[i]] = [items[i], items[i + 1]];
          if (a === 'rm') items.splice(i, 1);
          render(); opts.onChange && opts.onChange();
        });
        listEl.appendChild(el);
      });
      opts.onChange && opts.onChange();
    }
    return { render };
  }

  /* Parse "1-3, 5, 8-" into a sorted unique list of page numbers (1-based) */
  function parseRanges(str, max) {
    const out = new Set();
    for (const part of str.split(',').map(s => s.trim()).filter(Boolean)) {
      const m = part.match(/^(\d*)\s*-\s*(\d*)$/);
      if (m) {
        let a = m[1] ? +m[1] : 1, b = m[2] ? +m[2] : max;
        if (a > b) [a, b] = [b, a];
        for (let i = Math.max(1, a); i <= Math.min(max, b); i++) out.add(i);
      } else if (/^\d+$/.test(part)) {
        const n = +part; if (n >= 1 && n <= max) out.add(n);
      } else return null;
    }
    return [...out].sort((a, b) => a - b);
  }

  function initPdfJs() {
    if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
  }

  return { $, fmt, esc, baseName, tick, sleep, download, setupDrop, decodeImage, isImage, isPdf, fileList, parseRanges, initPdfJs };
})();
document.addEventListener('DOMContentLoaded', () => {
  const y = document.getElementById('yr'); if (y) y.textContent = new Date().getFullYear();
  const on = document.querySelector('.nav nav a.on'), nav = on && on.parentElement;
  if (on && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = on.offsetLeft - (nav.clientWidth - on.offsetWidth) / 2;
});
