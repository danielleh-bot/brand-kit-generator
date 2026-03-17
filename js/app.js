// ============================================================
//  STATE
// ============================================================
let currentStep = 1;
let brandKit = null;
let articleData = null;
let navigationData = null;
let prototypeHtml = '';
let analysisHtml = '';

// ============================================================
//  STEPPER NAVIGATION
// ============================================================
function goToStep(n) {
    if (n < 1 || n > 4) return;
    currentStep = n;
    document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
    document.getElementById('step' + n).classList.add('active');
    document.querySelectorAll('.step').forEach(el => {
        const s = parseInt(el.dataset.step);
        el.classList.remove('active');
        if (s === n) el.classList.add('active');
        if (s < n) el.classList.add('completed');
    });
    if (n === 2 && brandKit) renderBrandKit();
    if (n === 3 && brandKit) generatePrototype();
    if (n === 4 && brandKit) generateAnalysis();
}

function resetTool() {
    if (!confirm('Reset all data and start over?')) return;
    brandKit = null;
    articleData = null;
    navigationData = null;
    prototypeHtml = '';
    analysisHtml = '';
    document.getElementById('publisherUrl').value = '';
    document.getElementById('articleUrl').value = '';
    document.getElementById('publisherName').value = '';
    document.getElementById('crawlStatus').classList.add('hidden');
    document.getElementById('crawlResults').classList.add('hidden');
    document.querySelectorAll('.step').forEach(el => el.classList.remove('completed'));
    goToStep(1);
}
