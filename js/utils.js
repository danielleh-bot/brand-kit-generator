// ============================================================
//  COLOR UTILITY FUNCTIONS
// ============================================================
function normalizeHex(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    if (hex.length === 8) hex = hex.substring(0,6); // strip alpha
    if (hex.length !== 6) return null;
    return '#' + hex.toUpperCase();
}

function rgbToHex(r, g, b) {
    return '#' + [r,g,b].map(c => Math.max(0,Math.min(255,c)).toString(16).padStart(2,'0')).join('').toUpperCase();
}

function isGrayscale(hex) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return Math.abs(r-g) < 15 && Math.abs(g-b) < 15 && Math.abs(r-b) < 15;
}

function isTextGray(hex) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    const diff = Math.abs(r-g) + Math.abs(g-b) + Math.abs(r-b);
    return diff < 50 && r < 200;
}

function isNearBlackOrWhite(hex) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    const lum = (r + g + b) / 3;
    return lum < 30 || lum > 235;
}

function isLightColor(hex) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return (r + g + b) / 3 > 200;
}

function luminance(hex) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return 0.299*r + 0.587*g + 0.114*b;
}

function mode(arr) {
    const counts = {};
    arr.forEach(v => counts[v] = (counts[v]||0)+1);
    return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
}

// ============================================================
//  DOWNLOAD UTILITIES
// ============================================================
function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

async function downloadAll() {
    // Simple sequential download of all three files
    if (brandKit) downloadJson();
    await new Promise(r => setTimeout(r, 500));
    if (prototypeHtml) downloadPrototype();
    await new Promise(r => setTimeout(r, 500));
    if (analysisHtml) downloadAnalysis();
}
