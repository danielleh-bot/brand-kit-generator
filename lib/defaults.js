// ============================================================
//  TABOOLA DEFAULTS BASELINE
//  Represents the generic Taboola feed configuration (the "before" state)
//  Used by the analysis engine to compute diffs against crawler-extracted values
// ============================================================

module.exports = {
  fonts: {
    headline: {
      family: 'Arial, Helvetica, sans-serif',
      weight: 700,
      transform: 'none',
      size: '14px',
      lineHeight: '1.3'
    },
    eyebrow: {
      family: 'Arial, Helvetica, sans-serif',
      size: '12px',
      weight: 400,
      transform: 'none',
      letterSpacing: '0'
    },
    body: {
      family: 'Arial, Helvetica, sans-serif',
      size: '14px',
      weight: 400,
      lineHeight: '1.5'
    }
  },
  colors: {
    headline: '#333333',
    body: '#666666',
    background: '#FFFFFF',
    cta: '#1a73e8',
    sourceLabel: '#888888',
    separator: '#f3f4f6',
    badgeBg: '#f3f4f6',
    badgeText: '#666666',
    hoverHighlight: null
  },
  spacing: {
    borderRadius: '6px',
    letterSpacing: '0',
    cardGap: '16px',
    accentRule: null
  },
  textStyles: {
    headlineWeight: 700,
    headlineTransform: 'none',
    hoverDecoration: 'none'
  },
  badges: {
    label: 'Sponsored',
    bg: '#f3f4f6',
    text: '#666666'
  },
  categoryLabel: null,
  watermark: null,
  thumbnailAspectRatio: '4:3'
};
