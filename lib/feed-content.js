// ============================================================
//  FEED CONTENT GENERATOR
//  Produces realistic sponsored + native card data for prototypes
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

const THUMBNAIL_PLACEHOLDERS = [
  'https://picsum.photos/seed/sp1/400/300',
  'https://picsum.photos/seed/sp2/400/300',
  'https://picsum.photos/seed/sp3/400/300',
  'https://picsum.photos/seed/sp4/400/300',
  'https://picsum.photos/seed/sp5/400/300',
  'https://picsum.photos/seed/sp6/400/300',
  'https://picsum.photos/seed/sp7/400/300',
  'https://picsum.photos/seed/sp8/400/300',
  'https://picsum.photos/seed/sp9/400/300',
  'https://picsum.photos/seed/sp10/400/300',
  'https://picsum.photos/seed/sp11/400/300',
  'https://picsum.photos/seed/sp12/400/300',
  'https://picsum.photos/seed/sp13/400/300',
  'https://picsum.photos/seed/sp14/400/300',
  'https://picsum.photos/seed/sp15/400/300',
  'https://picsum.photos/seed/sp16/400/300',
];

/**
 * Pick N random items from an array without repeats
 */
function pickRandom(arr, n) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

/**
 * Generate native cards. Strongly prefers real, extracted articles from the page
 * (the article we crawled + any related/recommended articles we found). Falls
 * back to synthetic template headlines only when the page didn't expose enough
 * sibling content; synthetic cards are tagged so the analysis report can flag
 * how much of the feed is real vs. placeholder.
 *
 * @param {object} brandKit
 * @param {object} navigation
 * @param {{ content?: object, relatedArticles?: Array<object> }} [extras]
 */
function generateNativeCards(brandKit, navigation, extras = {}) {
  const publisherName = (brandKit.brand && brandKit.brand.name) || 'Publisher';
  const navLinks = (navigation && navigation.navLinks) || [];
  const categories = navLinks.slice(0, 8).map(l => l.text || l.label).filter(Boolean);
  const content = extras.content || {};
  const related = Array.isArray(extras.relatedArticles) ? extras.relatedArticles : [];

  const real = [];

  // 1. The article we actually crawled becomes the first native card.
  if (content && content.headline) {
    real.push({
      headline: content.headline,
      category: (content.categories && content.categories[0]) || categories[0] || 'Featured',
      source: publisherName,
      thumbnail: content.heroImage || null,
      href: content.url || null,
      isNative: true,
      contentSource: 'extracted',
    });
  }

  // 2. Related/recommended articles harvested from the page.
  for (const r of related) {
    if (real.length >= 12) break;
    real.push({
      headline: r.headline,
      category: r.category || categories[real.length % Math.max(1, categories.length)] || 'News',
      source: publisherName,
      thumbnail: r.thumbnail || null,
      href: r.href || null,
      isNative: true,
      contentSource: 'extracted',
    });
  }

  // 3. If we still need more cards (typical when crawling a single article
  // page that doesn't surface a related list), top up with synthetic
  // placeholders — clearly tagged so the report can warn.
  const syntheticHeadlines = [
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
  for (let i = 0; real.length < 10 && i < syntheticHeadlines.length; i++) {
    real.push({
      ...syntheticHeadlines[i],
      source: publisherName,
      thumbnail: `https://picsum.photos/seed/nat${i + 1}/400/300`,
      isNative: true,
      contentSource: 'synthetic',
    });
  }

  return real;
}

/**
 * Generate all feed content sections.
 *
 * @param {object} brandKit
 * @param {object} navigation
 * @param {{ content?: object, relatedArticles?: Array<object> }} [extras]
 *        Real article data extracted by the crawler. When provided, native
 *        feed cards are populated from it instead of from a hardcoded pool.
 * @returns {object} Feed content sections
 */
function generateFeedContent(brandKit, navigation, extras = {}) {
  const sponsored = pickRandom(SPONSORED_POOL, 12).map((card, i) => ({
    ...card,
    thumbnail: THUMBNAIL_PLACEHOLDERS[i % THUMBNAIL_PLACEHOLDERS.length],
    contentSource: 'synthetic', // sponsored content is intentionally generic — we don't fabricate paid placements
  }));

  const native = generateNativeCards(brandKit, navigation, extras);

  const realNativeCount = native.filter(n => n.contentSource === 'extracted').length;

  return {
    sponsoredLarge: sponsored.slice(0, 2),
    sponsoredDense: sponsored.slice(2, 5),
    nativeSection: native.slice(0, 3),
    sponsoredMixed: sponsored.slice(5, 7),
    trendingNative: native.slice(3, 7),
    sponsoredFinal: sponsored.slice(7, 9),
    _meta: {
      native_extracted_count: realNativeCount,
      native_synthetic_count: native.length - realNativeCount,
      native_total: native.length,
    },
  };
}

module.exports = { generateFeedContent, SPONSORED_POOL };
