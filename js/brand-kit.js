// ============================================================
//  STEP 2: BRAND KIT VIEWER
// ============================================================
function renderBrandKit() {
    // Formatted JSON display
    const display = document.getElementById('jsonDisplay');
    display.innerHTML = syntaxHighlightJson(JSON.stringify(brandKit, null, 2));

    // Editor
    document.getElementById('jsonEditArea').value = JSON.stringify(brandKit, null, 2);

    // Visual preview
    renderVisualPreview();
}

function syntaxHighlightJson(json) {
    return json
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
        .replace(/: "([^"]+)"/g, ': <span class="json-string">"$1"</span>')
        .replace(/: (\d+(?:\.\d+)?)/g, ': <span class="json-number">$1</span>');
}

function renderVisualPreview() {
    const container = document.getElementById('visualPreview');
    if (!brandKit) return;

    const primary = brandKit["colors.primary.hex"] || '#6C5CE7';
    const textPrimary = brandKit["colors.text.primary.hex"] || '#1A1A2E';
    const textSecondary = brandKit["colors.text.secondary.hex"] || '#4A4A5A';
    const bgSection = brandKit["colors.backgrounds.section.hex"] || '#F7F9FC';
    const fontPrimary = brandKit["fonts.primary.family"] || 'sans-serif';
    const borderRadius = brandKit["layout.card.border_radius"] || '0px';
    const pubName = brandKit["meta.publisher"] || 'Publisher';

    container.innerHTML = `
        <h3 style="font-size:14px;color:var(--text-muted);margin-bottom:16px;">Token Preview — How these tokens look applied to a feed card</h3>
        <div style="background:white;border-radius:12px;padding:32px;border:1px solid var(--border);">
            <div style="font-family:'${fontPrimary}',sans-serif;color:${textPrimary};">
                <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:20px;">
                    <span style="font-size:28px;font-weight:700;">Recommended for you</span>
                    <span style="color:${primary};font-size:28px;font-weight:700;">.</span>
                </div>
                <div style="font-size:11px;color:${textSecondary};margin-bottom:16px;">Content by <span style="color:#3174E0;font-weight:700;">Taboola</span></div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;">
                    ${[1,2,3].map(i => `
                        <div style="border-radius:${borderRadius};overflow:hidden;">
                            <div style="background:${bgSection};aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;border-radius:${borderRadius};margin-bottom:10px;">
                                <svg width="48" height="48" fill="none" stroke="${textSecondary}" stroke-width="1.5" opacity="0.3"><rect x="8" y="8" width="32" height="32" rx="4"/><circle cx="18" cy="18" r="4"/><path d="M8 32l10-10 6 6 8-8 8 8"/></svg>
                            </div>
                            <div style="font-size:14px;font-weight:700;line-height:1.3;color:${textPrimary};margin-bottom:6px;">Sample headline for ${pubName} article #${i}</div>
                            <div style="font-size:12px;color:${textSecondary};">${pubName}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function switchTab(tabEl, contentId) {
    tabEl.parentElement.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tabEl.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(contentId).classList.remove('hidden');
}

function copyJson() {
    navigator.clipboard.writeText(JSON.stringify(brandKit, null, 2));
    alert('JSON copied to clipboard!');
}

function downloadJson() {
    const name = (brandKit["meta.publisher"] || 'publisher').toLowerCase().replace(/\s+/g, '-');
    downloadFile(`${name}-brand-kit.json`, JSON.stringify(brandKit, null, 2), 'application/json');
}

function applyJsonEdits() {
    try {
        brandKit = JSON.parse(document.getElementById('jsonEditArea').value);
        renderBrandKit();
        alert('Changes applied!');
    } catch(e) {
        alert('Invalid JSON: ' + e.message);
    }
}

function formatJsonEditor() {
    try {
        const obj = JSON.parse(document.getElementById('jsonEditArea').value);
        document.getElementById('jsonEditArea').value = JSON.stringify(obj, null, 2);
    } catch(e) {
        alert('Invalid JSON: ' + e.message);
    }
}
