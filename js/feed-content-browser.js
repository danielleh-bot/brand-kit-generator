// ============================================================
//  FEED CONTENT GENERATOR (Browser-compatible)
//  Uses real extracted cards + images when available
// ============================================================

const SPONSORED_POOL = [
  { source: 'SmartAsset', headline: 'Top Financial Advisors Near You — See the List', cta: 'Learn More', category: 'Finance' },
  { source: 'NerdWallet', headline: 'Best High-Yield Savings Accounts of 2025', cta: 'Compare Now', category: 'Finance' },
  { source: 'Booking.com', headline: 'Deals You Won\'t Find Anywhere Else', cta: 'Book Now', category: 'Travel' },
  { source: 'Samsung', headline: 'The New Galaxy S25 Ultra — Pre-Order Today', cta: 'Shop Now', category: 'Technology' },
  { source: 'Volvo', headline: 'The All-Electric EX90: Scandinavian Design Meets Innovation', cta: 'Explore', category: 'Automotive' },
  { source: 'Allstate', headline: 'Bundle Home & Auto for Maximum Savings', cta: 'Get a Quote', category: 'Insurance' },
  { source: 'MasterClass', headline: 'Learn from the Best — New Classes Available', cta: 'Start Now', category: 'Education' },
  { source: 'Peloton', headline: 'Your Best Workout Starts Here — 30 Day Free Trial', cta: 'Try Free', category: 'Fitness' },
  { source: 'HelloFresh', headline: 'Farm-Fresh Meals Delivered to Your Door Weekly', cta: 'Get Started', category: 'Food' },
  { source: 'Dyson', headline: 'Engineered for Performance — New V15 Detect', cta: 'Shop Now', category: 'Home' },
  { source: 'T-Mobile', headline: 'Switch and Save with Our Best Unlimited Plan', cta: 'See Plans', category: 'Telecom' },
  { source: 'Lexus', headline: 'Experience Amazing — The All-New RX 500h', cta: 'Build Yours', category: 'Automotive' },
  { source: 'Fidelity', headline: 'Start Investing with as Little as $1', cta: 'Open Account', category: 'Finance' },
  { source: 'Norton', headline: 'Protect Your Devices — Award-Winning Security', cta: 'Download', category: 'Technology' },
  { source: 'Airbnb', headline: 'Unique Stays Around the World — Book Now', cta: 'Explore', category: 'Travel' },
  { source: 'Casper', headline: 'The Award-Winning Mattress — Try 100 Nights Risk-Free', cta: 'Shop Now', category: 'Home' },
  { source: 'Calm', headline: 'Sleep Better Tonight with Guided Meditations', cta: 'Try Free', category: 'Wellness' },
  { source: 'Adobe', headline: 'Create Anything You Imagine with Creative Cloud', cta: 'Start Free Trial', category: 'Software' },
  { source: 'Zillow', headline: 'Find Your Dream Home — Search Listings Now', cta: 'Search', category: 'Real Estate' },
  { source: 'DoorDash', headline: 'Your Favorite Restaurants, Delivered', cta: 'Order Now', category: 'Food' },
];

// Localized sponsored labels per language
const SPONSORED_LABELS = {
  en: 'Sponsored',
  he: 'ממומן',
  ar: 'إعلان ممول',
  de: 'Gesponsert',
  fr: 'Sponsorisé',
  es: 'Patrocinado',
  it: 'Sponsorizzato',
  pt: 'Patrocinado',
  ru: 'Реклама',
  ja: 'スポンサー',
  ko: '스폰서',
  zh: '赞助',
  nl: 'Gesponsord',
  tr: 'Sponsorlu',
  pl: 'Sponsorowane',
};

// Localized "More From" labels
const MORE_FROM_LABELS = {
  en: 'More From',
  he: 'עוד מ',
  ar: 'المزيد من',
  de: 'Mehr von',
  fr: 'Plus de',
  es: 'Más de',
  it: 'Altro da',
  pt: 'Mais de',
  ru: 'Ещё от',
  ja: 'もっと見る',
  ko: '더 보기',
  zh: '更多来自',
  nl: 'Meer van',
  tr: 'Daha fazla',
  pl: 'Więcej z',
};

// Localized "Trending on" labels
const TRENDING_LABELS = {
  en: 'Trending on',
  he: 'פופולרי ב',
  ar: 'الرائج على',
  de: 'Beliebt auf',
  fr: 'Tendances sur',
  es: 'Tendencia en',
  it: 'Di tendenza su',
  pt: 'Em alta no',
  ru: 'Популярное на',
  ja: 'トレンド',
  ko: '인기',
  zh: '热门',
  nl: 'Trending op',
  tr: 'Trend olan',
  pl: 'Popularne na',
};

function _pickRandom(arr, n) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

function _getLocalizedLabel(labelMap, lang) {
  if (!lang) return labelMap.en;
  const base = lang.toLowerCase().split('-')[0];
  return labelMap[base] || labelMap.en;
}

/**
 * Build native cards from real extracted homepage cards.
 * Falls back to generic headlines if no real cards available.
 */
function _generateNativeCards(brandKit, navigation, extractedCards, extractedImages) {
  const publisherName = (brandKit.brand && brandKit.brand.name) || 'Publisher';
  const navLinks = (navigation && navigation.navLinks) || [];
  const categories = navLinks.slice(0, 8).map(l => l.text || l.label).filter(Boolean);

  // If we have real extracted cards, use them
  if (extractedCards && extractedCards.length >= 3) {
    return extractedCards.slice(0, 12).map((card, i) => ({
      headline: card.headline,
      source: publisherName,
      thumbnail: card.image || (extractedImages && extractedImages[i]) || '',
      category: card.category || categories[i % categories.length] || '',
      link: card.link || '#',
      isNative: true,
    }));
  }

  // Fallback: generic headlines with publisher nav categories
  const nativeHeadlines = [
    { headline: 'Breaking: Major Policy Shift Expected This Week', category: categories[0] || 'News' },
    { headline: 'Markets Rally as Earnings Season Exceeds Expectations', category: categories[1] || 'Business' },
    { headline: 'New Study Reveals Surprising Health Benefits of Coffee', category: categories[2] || 'Health' },
    { headline: 'Tech Giants Announce Joint AI Safety Initiative', category: categories[3] || 'Technology' },
    { headline: 'Weekend Travel Guide: Hidden Gems Within Driving Distance', category: categories[4] || 'Travel' },
    { headline: 'Championship Finals: What to Watch For Tonight', category: categories[5] || 'Sports' },
    { headline: 'Climate Report: Record Temperatures Recorded Globally', category: categories[0] || 'Science' },
    { headline: 'Opinion: Why This Election Matters More Than You Think', category: categories[1] || 'Opinion' },
    { headline: 'Review: The Year\'s Most Anticipated Film Delivers', category: categories[2] || 'Entertainment' },
    { headline: 'Local Business Boom: Small Shops See Record Growth', category: categories[3] || 'Business' },
  ];

  // Use real images from page if available
  return nativeHeadlines.map((item, i) => ({
    ...item,
    source: publisherName,
    thumbnail: (extractedImages && extractedImages[i]) || '',
    isNative: true,
  }));
}

function generateFeedContent(brandKit, navigation, extractedCards, extractedImages) {
  // Use real page images for sponsored card thumbnails too
  const availableImages = (extractedImages && extractedImages.length > 0) ? extractedImages : [];

  const sponsored = _pickRandom(SPONSORED_POOL, 12).map((card, i) => ({
    ...card,
    thumbnail: availableImages[i % Math.max(availableImages.length, 1)] || '',
  }));

  const native = _generateNativeCards(brandKit, navigation, extractedCards, extractedImages);

  // Get localized labels
  const lang = brandKit.brand_voice?.language || brandKit.brand?.language || 'en';

  return {
    sponsoredLarge: sponsored.slice(0, 2),
    sponsoredDense: sponsored.slice(2, 5),
    nativeSection: native.slice(0, 3),
    sponsoredMixed: sponsored.slice(5, 7),
    trendingNative: native.slice(3, 7),
    sponsoredFinal: sponsored.slice(7, 9),
    // Localized labels
    sponsoredLabel: _getLocalizedLabel(SPONSORED_LABELS, lang),
    moreFromLabel: _getLocalizedLabel(MORE_FROM_LABELS, lang),
    trendingLabel: _getLocalizedLabel(TRENDING_LABELS, lang),
  };
}
