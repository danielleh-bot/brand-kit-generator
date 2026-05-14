/* ============================================================
   BRAND KIT WIZARD — UI logic
   Vanilla JS, no framework. Drives a 5-step flow against the
   Express backend, persists progress to localStorage, and
   animates each step's transitions and loaders.
   ============================================================ */

(function () {
  'use strict';

  // -------- DOM helpers ----------------------------------------------------

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const app = $('.app');

  const STORAGE_KEY = 'brand-kit-wizard:v1';

  // -------- State ----------------------------------------------------------

  let state = loadState() || {
    step: 1,
    slug: null,
    brandKit: null,
    links: null,
    publisherUrl: null,
    articleUrl: null,
    exportFormat: 'json',
    css: null, // brand-kit.css text, fetched lazily
  };

  function saveState() {
    try {
      // Don't persist the full CSS blob — it's regenerable from /output/<slug>/brand-kit.css
      const { css, ...rest } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
    } catch {
      // localStorage may be unavailable in private mode; non-fatal
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function clearState() {
    state = {
      step: 1, slug: null, brandKit: null, links: null,
      publisherUrl: null, articleUrl: null, exportFormat: 'json', css: null,
    };
    saveState();
  }

  // -------- Step navigation ------------------------------------------------

  function goToStep(n) {
    state.step = n;
    saveState();
    app.dataset.step = String(n);
    updateStepper(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateStepper(n) {
    $$('.stepper li').forEach((li) => {
      const s = Number(li.dataset.step);
      li.classList.toggle('is-active', s === n);
      li.classList.toggle('is-done', s < n);
    });
  }

  // -------- Toast / feedback ----------------------------------------------

  let toastTimer = null;
  function toast(message, opts = {}) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.toggle('is-error', !!opts.error);
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, opts.duration || 2600);
  }

  // -------- Recents --------------------------------------------------------

  async function loadRecents() {
    try {
      const res = await fetch('/api/publishers');
      if (!res.ok) return;
      const data = await res.json();
      renderRecents(data.publishers || []);
    } catch { /* offline / server down — skip */ }
  }

  function renderRecents(list) {
    const card = $('#recents-card');
    const ul = $('#recents-list');
    if (!list.length) { card.hidden = true; return; }
    card.hidden = false;
    ul.innerHTML = '';
    for (const pub of list.slice(0, 12)) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.innerHTML =
        `<span class="name">${escapeHtml(pub.name)}</span>` +
        `<span class="slug">${escapeHtml(pub.slug)}</span>`;
      btn.addEventListener('click', () => restoreFromSlug(pub.slug));
      li.appendChild(btn);
      ul.appendChild(li);
    }
  }

  async function restoreFromSlug(slug) {
    try {
      const res = await fetch(`/api/brand-kit/${encodeURIComponent(slug)}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      state.slug = data.slug;
      state.brandKit = data.brandKit;
      state.links = data.links;
      saveState();
      renderBrandKit();
      goToStep(2);
      toast(`Loaded ${data.brandKit?.brand?.name || data.slug}`);
    } catch (e) {
      toast('Could not load that brand kit', { error: true });
    }
  }

  // -------- Step 1: crawl --------------------------------------------------

  let activeStream = null;

  function renderStageList(container, stages) {
    container.innerHTML = '';
    for (const s of stages) {
      const li = document.createElement('li');
      li.dataset.id = s.id;
      li.innerHTML = `<span class="stage-icon"></span><span>${escapeHtml(s.label)}</span>`;
      container.appendChild(li);
    }
  }

  function setStageStatus(container, id, status) {
    const li = container.querySelector(`li[data-id="${id}"]`);
    if (!li) return;
    li.classList.toggle('is-active', status === 'active');
    li.classList.toggle('is-done',   status === 'done');
  }

  function logLine(container, message, opts = {}) {
    const div = document.createElement('div');
    div.className = 'log-line' + (opts.error ? ' error' : '');
    div.textContent = message;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function streamFromUrl(streamUrl, { stagesEl, logEl, titleEl, onDone, onError }) {
    if (activeStream) { activeStream.close(); activeStream = null; }
    stagesEl.innerHTML = '';
    logEl.innerHTML = '';

    const es = new EventSource(streamUrl);
    activeStream = es;

    es.addEventListener('stages', (ev) => {
      const data = JSON.parse(ev.data);
      renderStageList(stagesEl, data.stages);
    });
    es.addEventListener('stage', (ev) => {
      const { id, status } = JSON.parse(ev.data);
      setStageStatus(stagesEl, id, status);
    });
    es.addEventListener('log', (ev) => {
      const { message } = JSON.parse(ev.data);
      logLine(logEl, message);
    });
    es.addEventListener('done', (ev) => {
      const data = JSON.parse(ev.data);
      if (titleEl) titleEl.textContent = 'Done.';
      es.close();
      activeStream = null;
      onDone && onDone(data);
    });
    es.addEventListener('error', (ev) => {
      let msg = 'Connection lost';
      try {
        const data = JSON.parse(ev.data);
        msg = data.message || msg;
      } catch {}
      logLine(logEl, `Error: ${msg}`, { error: true });
      es.close();
      activeStream = null;
      onError && onError(msg);
    });
  }

  // Auto-advance timer from a previous completed crawl. Cleared whenever we
  // start a fresh crawl so a stale 2.2s timer can't yank the user to step 2
  // mid-second-crawl.
  let autoAdvanceTimer = null;

  function onCrawlSubmit(e) {
    e.preventDefault();
    const url = $('#crawl-url').value.trim();
    if (!url) return;
    const articleUrl = $('#article-url').value.trim() || null;
    state.publisherUrl = url;
    state.articleUrl = articleUrl;
    saveState();

    const card = $('#crawl-progress');
    card.hidden = false;
    // Hide the completed banner from any previous run.
    $('#crawl-complete').hidden = true;
    card.classList.remove('is-complete');
    if (autoAdvanceTimer) { clearTimeout(autoAdvanceTimer); autoAdvanceTimer = null; }

    $('#progress-title').textContent = articleUrl
      ? `Crawling ${shorten(url)} + ${shorten(articleUrl)}`
      : `Crawling ${shorten(url)}`;

    // Auto-scroll so the user immediately sees the progress checklist
    // instead of staring at the now-stale form above the fold.
    requestAnimationFrame(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }));

    let qs = `url=${encodeURIComponent(url)}`;
    if (articleUrl) qs += `&articleUrl=${encodeURIComponent(articleUrl)}`;
    streamFromUrl(`/api/crawl?${qs}`, {
      stagesEl: $('#crawl-stages'),
      logEl: $('#crawl-log'),
      titleEl: $('#progress-title'),
      onDone: (data) => {
        state.slug = data.slug;
        state.brandKit = data.brandKit;
        state.links = data.links;
        state.css = null;
        saveState();
        renderBrandKit();
        markCrawlComplete();
      },
      onError: (msg) => {
        toast(msg, { error: true, duration: 5000 });
      },
    });
  }

  // After all stages succeed, swap the spinner for a "done" banner with an
  // explicit Continue button. The banner has to be honest about how much
  // got captured — promising "Brand kit ready" when extraction grabbed
  // 20% of the tokens makes the banner feel dishonest at step 2.
  function markCrawlComplete() {
    const card = $('#crawl-progress');

    // Force-tick any stages that were still mid-animation. SSE delivers
    // the final `stage render done` and `done` events on the same paint
    // frame, so without this nudge the banner can appear *before* the
    // last checkmark visibly settles — which is what made the user say
    // "the complete bar shows before the crawl finishes".
    const stagesEl = $('#crawl-stages');
    if (stagesEl) {
      stagesEl.querySelectorAll('li').forEach((li) => {
        li.classList.remove('is-active');
        li.classList.add('is-done');
      });
    }

    // 600ms hold so the last checkmark animation completes and the user
    // sees the checklist actually finish before the banner pops in.
    setTimeout(() => completeBanner(card), 600);
  }

  function completeBanner(card) {
    card.classList.add('is-complete');

    const q = state.brandKit?.metadata?.extraction_quality;
    const ratio = q?.extraction_ratio || 0;
    const low = ratio > 0 && ratio < 0.5;
    const pct = q?.total_tokens ? Math.round(ratio * 100) : null;

    $('#progress-title').textContent = low ? 'Crawl finished — quality is low' : 'Crawl complete';

    const banner = $('#crawl-complete');
    banner.classList.toggle('is-low-quality', low);
    const h3 = banner.querySelector('h3');
    const p = banner.querySelector('p');
    const btn = banner.querySelector('.primary');

    if (low) {
      h3.textContent = 'Brand kit captured · low quality';
      p.textContent = `Only ${pct ?? '?'}% of design tokens came from the page. The site may block headless Chrome, render content client-side, or use a non-standard structure. Continue or re-crawl?`;
      btn.textContent = 'Continue anyway →';
    } else {
      h3.textContent = 'Brand kit ready';
      p.textContent = pct != null
        ? `${pct}% of design tokens captured live from the page. Continue to preview.`
        : "We've pulled the design tokens. Continue to see them.";
      btn.textContent = 'Continue →';
    }
    banner.hidden = false;

    // Low-quality crawls don't auto-advance — give the user a chance to
    // re-crawl with a better URL before committing to a thin brand kit.
    if (low) return;

    autoAdvanceTimer = setTimeout(() => { autoAdvanceTimer = null; goToStep(2); }, 2200);
    btn.addEventListener('click', () => {
      if (autoAdvanceTimer) { clearTimeout(autoAdvanceTimer); autoAdvanceTimer = null; }
    }, { once: true });
  }

  // -------- Step 2: brand kit preview -------------------------------------

  function renderBrandKit() {
    const bk = state.brandKit;
    if (!bk) return;

    $('#bk-title').textContent = `${bk.brand?.name || 'Publisher'} — brand kit`;
    $('#bk-subtitle').textContent = bk.brand?.website || '';

    renderSwatches(bk);
    renderTypography(bk);
    renderLogo(bk);
    renderQuality(bk);
  }

  function renderSwatches(bk) {
    const container = $('#bk-swatches');
    container.innerHTML = '';
    const palette = collectPalette(bk);
    $('#bk-colors-count').textContent = `${palette.length} colour${palette.length === 1 ? '' : 's'}`;

    for (const entry of palette) {
      const div = document.createElement('div');
      div.className = 'swatch';
      div.title = 'Click to copy';
      div.innerHTML =
        `<div class="chip" style="background:${entry.hex}"></div>` +
        `<div class="meta">` +
          `<span class="role">${escapeHtml(entry.role)}</span>` +
          `<span class="hex">${escapeHtml(entry.hex)}</span>` +
        `</div>`;
      div.addEventListener('click', () => {
        navigator.clipboard?.writeText(entry.hex).then(() => toast(`Copied ${entry.hex}`));
      });
      container.appendChild(div);
    }
  }

  function collectPalette(bk) {
    const out = [];
    const push = (role, c) => { if (c?.hex) out.push({ role, hex: c.hex.toUpperCase() }); };
    push('Primary',   bk.colors?.primary);
    push('Secondary', bk.colors?.secondary);
    push('Headline',  bk.colors?.text?.primary);
    push('Body',      bk.colors?.text?.secondary);
    push('Muted',     bk.colors?.text?.tertiary);
    push('Background', bk.colors?.backgrounds?.base);
    push('Section',   bk.colors?.backgrounds?.section);
    push('Dark',      bk.colors?.backgrounds?.dark);
    push('Warning',   bk.colors?.accents?.warning_yellow);
    push('Negative',  bk.colors?.accents?.negative_red);
    push('Positive',  bk.colors?.accents?.positive_green);
    push('Info',      bk.colors?.accents?.info_blue);
    // Dedupe by hex
    const seen = new Set();
    return out.filter((e) => {
      if (seen.has(e.hex)) return false;
      seen.add(e.hex); return true;
    });
  }

  function renderTypography(bk) {
    const root = $('#bk-typography');
    root.innerHTML = '';
    const primary = bk.fonts?.primary;
    const secondary = bk.fonts?.secondary;

    if (primary) {
      const div = document.createElement('div');
      div.className = 'specimen primary';
      const stack = buildFontStack(primary);
      ensureGoogleFont(primary.family);
      div.innerHTML =
        `<div class="label">Headline — ${escapeHtml(primary.family)}</div>` +
        `<div class="sample" style="font-family:${stack}; font-weight:${primary.weights?.bold || 700}">` +
          `The quick brown fox jumps over the lazy dog</div>`;
      root.appendChild(div);

      const body = document.createElement('div');
      body.className = 'specimen body';
      body.innerHTML =
        `<div class="label">Body — ${escapeHtml(primary.family)}</div>` +
        `<div class="sample" style="font-family:${stack}; font-weight:${primary.weights?.regular || 400}">` +
          `In the same family as the headline, set at body weight. This is what an article paragraph would look like, ` +
          `with comfortable line height and reading-friendly tracking.</div>`;
      root.appendChild(body);
    }

    if (secondary && secondary.family !== primary?.family) {
      const div = document.createElement('div');
      div.className = 'specimen secondary';
      const stack = buildFontStack(secondary, true);
      ensureGoogleFont(secondary.family);
      div.innerHTML =
        `<div class="label">Secondary — ${escapeHtml(secondary.family)}</div>` +
        `<div class="sample" style="font-family:${stack}; font-style:${secondary.style || 'italic'}">` +
          `Used for editorial styling, opinion, pull quotes.</div>`;
      root.appendChild(div);
    }
  }

  function buildFontStack(font, serifFallback = false) {
    const parts = [`'${font.family.replace(/'/g, "\\'")}'`];
    if (Array.isArray(font.fallbacks)) parts.push(...font.fallbacks);
    parts.push(serifFallback ? 'serif' : 'sans-serif');
    return parts.join(', ');
  }

  const loadedFonts = new Set();
  function ensureGoogleFont(family) {
    if (!family || loadedFonts.has(family)) return;
    const generic = ['Arial','Helvetica','sans-serif','serif','monospace','system-ui','Times New Roman','Georgia','Verdana','Tahoma','Trebuchet MS'];
    if (generic.includes(family)) { loadedFonts.add(family); return; }
    const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@400;600;700&display=swap`;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
    loadedFonts.add(family);
  }

  function renderLogo(bk) {
    const root = $('#bk-logo');
    root.innerHTML = '';
    const logo = bk.logos?.primary;
    if (logo?.type === 'image' && logo.url) {
      const img = document.createElement('img');
      img.src = logo.url;
      img.alt = logo.alt || bk.brand?.name || 'Logo';
      root.appendChild(img);
    } else if (logo?.type === 'svg' && logo.svg) {
      root.innerHTML = logo.svg;
    } else if (logo?.text || bk.brand?.name) {
      const div = document.createElement('div');
      div.className = 'logo-text';
      div.textContent = logo?.text || bk.brand?.name;
      root.appendChild(div);
    } else {
      root.innerHTML = '<div class="logo-text" style="opacity:.4">No logo detected</div>';
    }

    const meta = $('#bk-brand-meta');
    meta.innerHTML = '';
    const pairs = [
      ['Name', bk.brand?.name],
      ['Website', bk.brand?.website],
      ['Language', bk.brand?.language],
    ].filter(([, v]) => v);
    for (const [k, v] of pairs) {
      meta.insertAdjacentHTML('beforeend', `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`);
    }
  }

  function renderQuality(bk) {
    const q = bk.metadata?.extraction_quality;
    const fill = $('#bk-quality-fill');
    const pct = $('#bk-quality-pct');
    const note = $('#bk-quality-note');
    if (!q || !q.total_tokens) {
      fill.style.width = '0%';
      pct.textContent = '—';
      note.textContent = 'No extraction quality metadata available.';
      return;
    }
    const ratio = q.extraction_ratio || 0;
    const percent = Math.round(ratio * 100);
    // Animate from 0 → percent on each render
    fill.style.width = '0%';
    requestAnimationFrame(() => { fill.style.width = `${percent}%`; });
    pct.textContent = `${percent}%`;
    note.textContent =
      ratio >= 0.8 ? `Strong extraction — ${q.extracted_token_count}/${q.total_tokens} tokens pulled live from the page.`
      : ratio >= 0.5 ? `Decent extraction — ${q.extracted_token_count}/${q.total_tokens} tokens captured. Some fallbacks used.`
      : `Weak extraction — only ${q.extracted_token_count}/${q.total_tokens} tokens captured. The site may block headless crawlers or render content client-side.`;
  }

  // -------- Step 3: export ------------------------------------------------

  async function showExport(format) {
    state.exportFormat = format;
    saveState();
    $$('.toggle-option').forEach((b) =>
      b.classList.toggle('active', b.dataset.format === format),
    );
    $$('.toggle-option').forEach((b) =>
      b.setAttribute('aria-selected', b.dataset.format === format ? 'true' : 'false'),
    );

    if (format === 'json') {
      $('#export-blurb').textContent =
        'Structured design tokens. Use this when you want to build tooling on top.';
      $('#download-label').textContent = 'Download brand-kit.json';
      renderJson($('#export-code'), state.brandKit);
    } else {
      $('#export-blurb').textContent =
        'Drop-in CSS — :root custom properties + utility classes. Self-contained.';
      $('#download-label').textContent = 'Download brand-kit.css';
      const css = await fetchCss();
      renderCss($('#export-code'), css);
    }
  }

  async function fetchCss() {
    if (state.css) return state.css;
    if (!state.links?.brandKitCss) return '/* brand-kit.css not available yet */';
    const res = await fetch(state.links.brandKitCss);
    state.css = await res.text();
    return state.css;
  }

  function renderJson(target, value) {
    const text = JSON.stringify(value, null, 2);
    target.innerHTML = highlightJson(text);
  }
  function renderCss(target, text) {
    target.innerHTML = highlightCss(text);
  }

  function highlightJson(text) {
    // Conservative regex highlighter — keys, strings, numbers, booleans
    return escapeHtml(text)
      .replace(/&quot;([^&]+?)&quot;\s*:/g, '<span class="tk-key">&quot;$1&quot;</span>:')
      .replace(/:\s*&quot;([^&]*?)&quot;/g, ': <span class="tk-string">&quot;$1&quot;</span>')
      .replace(/:\s*(-?\d+\.?\d*)/g, ': <span class="tk-number">$1</span>')
      .replace(/:\s*(true|false|null)/g, ': <span class="tk-val">$1</span>');
  }
  function highlightCss(text) {
    let html = escapeHtml(text);
    html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="tk-comment">$1</span>');
    html = html.replace(/(--[a-z0-9-]+)/gi, '<span class="tk-prop">$1</span>');
    html = html.replace(/(:)\s*([^;{}\n<]+?)(?=;|<)/g, (_, p, v) => `${p} <span class="tk-val">${v.trim()}</span>`);
    html = html.replace(/^([.#][a-z0-9_:\-, .]+)\s*\{/gim, '<span class="tk-selector">$1</span> {');
    return html;
  }

  // Force a real "Save As" via a synthetic anchor with `download`. Plain
  // `window.location.href = url` would just open the JSON/CSS inline in the
  // browser since the server serves them as `application/json` / `text/css`,
  // never triggering a download.
  function downloadFile(url, filename) {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function downloadCurrent() {
    const slug = state.slug || 'brand-kit';
    if (state.exportFormat === 'json') {
      downloadFile(state.links?.brandKitJson, `${slug}-brand-kit.json`);
    } else {
      downloadFile(state.links?.brandKitCss, `${slug}-brand-kit.css`);
    }
  }

  function copyCurrent() {
    const code = $('#export-code').textContent || '';
    navigator.clipboard?.writeText(code).then(() => toast('Copied to clipboard'));
  }

  // -------- Step 4: preview -----------------------------------------------

  function renderPreview() {
    if (!state.links?.prototype) {
      toast('No prototype yet — crawl a publisher first', { error: true });
      return;
    }
    // HEAD-probe so a stale link from a wiped output dir surfaces as a
    // toast instead of a blank iframe.
    fetch(state.links.prototype, { method: 'HEAD' })
      .then((r) => {
        if (!r.ok) throw new Error('missing');
        const url = `${state.links.prototype}?t=${Date.now()}`;
        $('#prototype-frame').src = url;
        $('#frame-url').textContent = state.links.prototype;
      })
      .catch(() => {
        toast('Prototype file is gone — re-crawl the publisher', { error: true });
        clearLinks();
        goToStep(1);
      });
  }

  function openReportModal() {
    if (!state.links?.report) {
      toast('No report yet — crawl a publisher first', { error: true });
      return;
    }
    // HEAD-probe the report file so we don't open a blank modal pointing
    // at a 404. `/output/<slug>/analysis-report.html` can disappear if the
    // user wiped the output dir between sessions while localStorage still
    // remembered the slug.
    fetch(state.links.report, { method: 'HEAD' })
      .then((r) => {
        if (!r.ok) throw new Error('missing');
        $('#report-frame').src = `${state.links.report}?t=${Date.now()}`;
        $('#report-modal').hidden = false;
      })
      .catch(() => {
        toast('Report file is gone — re-crawl the publisher', { error: true });
        clearLinks();
      });
  }
  function closeReportModal() {
    $('#report-modal').hidden = true;
    // about:blank clears the iframe so the next open doesn't briefly
    // show the previous report through the modal animation.
    $('#report-frame').src = 'about:blank';
  }

  function clearLinks() {
    state.slug = null;
    state.brandKit = null;
    state.links = null;
    state.css = null;
    saveState();
  }

  // -------- Utilities -----------------------------------------------------

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function shorten(url) {
    try {
      const u = new URL(url);
      return u.hostname + (u.pathname && u.pathname !== '/' ? u.pathname.slice(0, 24) : '');
    } catch { return url; }
  }

  // -------- Wiring --------------------------------------------------------

  $('#crawl-form').addEventListener('submit', onCrawlSubmit);

  // Optional article URL field is collapsed by default; clicking the link
  // reveals it. Keep it inline rather than in its own step now.
  $('#article-toggle-btn').addEventListener('click', () => {
    const field = $('#article-field');
    const open = field.hidden;
    field.hidden = !open;
    $('#article-toggle .article-toggle-icon').textContent = open ? '−' : '+';
    if (open) {
      // Slight delay so the field is rendered before focus.
      setTimeout(() => $('#article-url').focus(), 80);
    }
  });

  $$('.toggle-option').forEach((b) =>
    b.addEventListener('click', () => showExport(b.dataset.format)),
  );

  $('#download-btn').addEventListener('click', downloadCurrent);
  $('#copy-btn').addEventListener('click', copyCurrent);

  $('#reset-btn').addEventListener('click', () => {
    if (!confirm('Start over? Your generated artifacts stay in ./output/ but the wizard goes back to step 1.')) return;
    clearState();
    location.reload();
  });

  $('#report-close').addEventListener('click', closeReportModal);
  $('#report-modal').addEventListener('click', (e) => {
    if (e.target.id === 'report-modal') closeReportModal();
  });
  $('#report-open').addEventListener('click', () => {
    if (state.links?.report) window.open(state.links.report, '_blank', 'noopener');
  });
  $('#report-download').addEventListener('click', () => {
    downloadFile(state.links?.report, `${state.slug || 'brand-kit'}-analysis-report.html`);
  });
  // Escape closes whichever modal is open. Keyboards are faster than mice
  // and reviewers will reach for it before clicking the X.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#report-modal').hidden) closeReportModal();
  });

  // Step-action data-attribute dispatch — keeps HTML declarative.
  document.body.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    switch (action) {
      case 'go-brand':        goToStep(2); break;
      case 'go-export':       goToStep(3); showExport(state.exportFormat); break;
      case 'go-preview':      goToStep(4); renderPreview(); break;
      case 'back-to-brand':   goToStep(2); break;
      case 'back-to-export':  goToStep(3); break;
      case 'view-report':     openReportModal(); break;
      case 'open-prototype':
        if (state.links?.prototype) window.open(state.links.prototype, '_blank', 'noopener');
        break;
      case 'download-prototype':
        downloadFile(state.links?.prototype, `${state.slug || 'brand-kit'}-prototype.html`);
        break;
      case 'restart':
        clearState();
        location.reload();
        break;
    }
  });

  // -------- Bootstrap -----------------------------------------------------

  function bootstrap() {
    updateStepper(state.step || 1);
    app.dataset.step = String(state.step || 1);

    // If we have a stored slug, fetch the latest brand kit so the UI doesn't
    // depend on whatever was cached in localStorage at last load. If the
    // slug no longer exists on disk (output dir wiped between sessions),
    // throw away the stale links and reset to step 1 so the user isn't
    // left on a phantom Preview step pointing at 404s.
    if (state.slug) {
      fetch(`/api/brand-kit/${encodeURIComponent(state.slug)}`)
        .then((r) => {
          if (r.status === 404) return { _missing: true };
          return r.ok ? r.json() : null;
        })
        .then((data) => {
          if (data && data._missing) {
            clearLinks();
            goToStep(1);
            return;
          }
          if (data?.brandKit) {
            state.brandKit = data.brandKit;
            state.links = data.links;
            saveState();
            renderBrandKit();
            if (state.step === 3) showExport(state.exportFormat);
            if (state.step === 4) renderPreview();
            // Migrate legacy 5-step state to the 4-step flow.
            if (state.step === 5) { state.step = 4; saveState(); goToStep(4); renderPreview(); }
          }
        })
        .catch(() => {});
    }

    loadRecents();

    if (state.publisherUrl) $('#crawl-url').value = state.publisherUrl;
    if (state.articleUrl)   $('#article-url').value = state.articleUrl;
  }

  bootstrap();
})();
