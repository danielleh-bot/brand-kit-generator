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
//  EXTENDED UTILITY FUNCTIONS
// ============================================================
function hexToRgbString(hex) {
    if (!hex || hex.length < 7) return null;
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return `rgb(${r}, ${g}, ${b})`;
}

function isDarkColor(hex) {
    if (!hex) return false;
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return (r + g + b) / 3 < 80;
}

function colorName(hex) {
    if (!hex) return 'Unknown';
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    const lum = (r + g + b) / 3;
    const isGray = Math.abs(r-g) < 20 && Math.abs(g-b) < 20;

    if (isGray) {
        if (lum < 30) return 'Near Black';
        if (lum < 80) return 'Dark Gray';
        if (lum < 140) return 'Medium Gray';
        if (lum < 200) return 'Light Gray';
        if (lum < 245) return 'Off-White';
        return 'White';
    }
    // Determine dominant hue
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0;
    if (max !== min) {
        const d = max - min;
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        else if (max === g) h = ((b - r) / d + 2) * 60;
        else h = ((r - g) / d + 4) * 60;
    }
    const saturation = max === 0 ? 0 : (max - min) / max;
    if (saturation < 0.15) {
        if (lum < 80) return 'Dark Gray';
        if (lum < 180) return 'Medium Gray';
        return 'Light Gray';
    }
    const lightPrefix = lum > 180 ? 'Light ' : lum < 80 ? 'Dark ' : '';
    if (h < 15 || h >= 345) return lightPrefix + 'Red';
    if (h < 45) return lightPrefix + 'Orange';
    if (h < 70) return lightPrefix + 'Yellow';
    if (h < 160) return lightPrefix + 'Green';
    if (h < 200) return lightPrefix + 'Cyan';
    if (h < 260) return lightPrefix + 'Blue';
    if (h < 290) return lightPrefix + 'Purple';
    if (h < 345) return lightPrefix + 'Magenta';
    return lightPrefix + 'Red';
}

function getNestedValue(obj, path) {
    return path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : null, obj);
}

function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
            current[keys[i]] = {};
        }
        current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
}

function buildColorEntry(hex, usageHint) {
    if (!hex) return null;
    return {
        name: colorName(hex),
        hex: hex,
        rgb: hexToRgbString(hex),
        usage: usageHint || ''
    };
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
