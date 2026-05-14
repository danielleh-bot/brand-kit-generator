// ============================================================
//  FEED CONTENT GENERATOR
//  Produces realistic sponsored + native card data for prototypes
// ============================================================

const { pickPhoto } = require('./unsplash');
const { t } = require('./i18n');

// Sponsored card pool. CTA and category are stored as i18n keys (e.g.
// `learnMore`, `finance`) and resolved at render time against the publisher's
// detected language. Headlines stay English since auto-translating ad copy
// reads worse than English-with-context for most non-English locales — and
// real campaigns ship language-of-creative independently of the publisher's
// UI chrome anyway.
const SPONSORED_POOL = [
  { source: 'SmartAsset', headline: 'Top Financial Advisors Near You — See the List',           cta: 'learnMore',  category: 'finance' },
  { source: 'NerdWallet', headline: 'Best High-Yield Savings Accounts of 2025',                   cta: 'compareNow', category: 'finance' },
  { source: 'Booking.com',headline: "Deals You Won't Find Anywhere Else",                         cta: 'bookNow',    category: 'travel' },
  { source: 'Samsung',    headline: 'The New Galaxy S25 Ultra — Pre-Order Today',                 cta: 'shopNow',    category: 'technology' },
  { source: 'Volvo',      headline: 'The All-Electric EX90: Scandinavian Design Meets Innovation', cta: 'explore',    category: 'automotive' },
  { source: 'Allstate',   headline: 'Bundle Home & Auto for Maximum Savings',                     cta: 'getQuote',   category: 'insurance' },
  { source: 'MasterClass',headline: 'Learn from the Best — New Classes Available',                cta: 'startNow',   category: 'education' },
  { source: 'Peloton',    headline: 'Your Best Workout Starts Here — 30 Day Free Trial',          cta: 'tryFree',    category: 'fitness' },
  { source: 'HelloFresh', headline: 'Farm-Fresh Meals Delivered to Your Door Weekly',             cta: 'getStarted', category: 'food' },
  { source: 'Dyson',      headline: 'Engineered for Performance — New V15 Detect',                cta: 'shopNow',    category: 'home' },
  { source: 'T-Mobile',   headline: 'Switch and Save with Our Best Unlimited Plan',               cta: 'seePlans',   category: 'telecom' },
  { source: 'Lexus',      headline: 'Experience Amazing — The All-New RX 500h',                   cta: 'buildYours', category: 'automotive' },
  { source: 'Fidelity',   headline: 'Start Investing with as Little as $1',                       cta: 'openAccount',category: 'finance' },
  { source: 'Norton',     headline: 'Protect Your Devices — Award-Winning Security',              cta: 'download',   category: 'technology' },
  { source: 'Airbnb',     headline: 'Unique Stays Around the World — Book Now',                   cta: 'explore',    category: 'travel' },
  { source: 'Casper',     headline: 'The Award-Winning Mattress — Try 100 Nights Risk-Free',      cta: 'shopNow',    category: 'home' },
  { source: 'Calm',       headline: 'Sleep Better Tonight with Guided Meditations',               cta: 'tryFree',    category: 'wellness' },
  { source: 'Adobe',      headline: 'Create Anything You Imagine with Creative Cloud',            cta: 'startTrial', category: 'software' },
  { source: 'Zillow',     headline: 'Find Your Dream Home — Search Listings Now',                 cta: 'search',     category: 'realEstate' },
  { source: 'DoorDash',   headline: 'Your Favorite Restaurants, Delivered',                       cta: 'orderNow',   category: 'food' },
];

function sponsoredThumbnail(card, i) {
  return pickPhoto({
    category: card.category,
    headline: card.headline,
    seed: `sp-${i}-${card.source}`,
  });
}

// Build an Unsplash backup URL for a card. Used as the fallback when an
// extracted publisher CDN image fails (referrer-locked, geo-blocked, etc.)
// so cards land on a relevant stock photo instead of the gradient
// placeholder.
function unsplashFallback({ category, headline, seed }) {
  return pickPhoto({ category, headline, seed });
}

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
    const cat = (content.categories && content.categories[0]) || categories[0] || 'Featured';
    real.push({
      headline: content.headline,
      category: cat,
      source: publisherName,
      thumbnail: content.heroImage || unsplashFallback({ category: cat, headline: content.headline, seed: `nat-0-${publisherName}` }),
      thumbnailFallback: unsplashFallback({ category: cat, headline: content.headline, seed: `nat-0-${publisherName}` }),
      href: content.url || null,
      isNative: true,
      contentSource: 'extracted',
    });
  }

  // 2. Related/recommended articles harvested from the page. Publisher CDNs
  // (e.g. images.wcdn.co.il for walla) frequently 404 from outside the site
  // due to referrer locks, so each card carries a topic-relevant Unsplash
  // backup that the template falls back to on image error.
  for (const r of related) {
    if (real.length >= 12) break;
    const cat = r.category || categories[real.length % Math.max(1, categories.length)] || 'News';
    const fallback = unsplashFallback({
      category: cat,
      headline: r.headline,
      seed: `nat-${real.length}-${publisherName}`,
    });
    real.push({
      headline: r.headline,
      category: cat,
      source: publisherName,
      thumbnail: r.thumbnail || fallback,
      thumbnailFallback: fallback,
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
    const card = syntheticHeadlines[i];
    const primary = pickPhoto({
      category: card.category,
      headline: card.headline,
      seed: `nat-${i}-${publisherName}`,
    });
    // Second seed → different photo from the same topic bucket, so a
    // Unsplash CDN hiccup doesn't leave the card with no image.
    const fallback = pickPhoto({
      category: card.category,
      headline: card.headline,
      seed: `nat-fb-${i}-${publisherName}`,
    });
    real.push({
      ...card,
      source: publisherName,
      thumbnail: primary,
      thumbnailFallback: fallback,
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
  // Resolve sponsored-card CTA + category strings into the publisher's
  // language. Prefer the page's actual sponsored badge (e.g. "Anzeige")
  // over the i18n table when the crawler extracted one.
  const lang = brandKit?.brand?.language || brandKit?.brand_voice?.language || 'en';
  const sponsoredLabel = brandKit?.brand_voice?.sponsored_label || t('sponsored', lang);

  const sponsored = pickRandom(SPONSORED_POOL, 12).map((card, i) => ({
    ...card,
    cta: t(card.cta, lang),
    category: t(card.category, lang),
    sponsoredLabel,
    thumbnail: sponsoredThumbnail(card, i),
    thumbnailFallback: pickPhoto({
      category: card.category,
      headline: card.headline,
      seed: `sp-fb-${i}-${card.source}`,
    }),
    contentSource: 'synthetic', // sponsored content is intentionally generic — we don't fabricate paid placements
  }));

  const native = generateNativeCards(brandKit, navigation, extras);

  const realNativeCount = native.filter(n => n.contentSource === 'extracted').length;

  return {
    sponsoredLabel,
    labels: {
      sponsoredStories: t('sponsoredStories', lang),
      moreFrom:         t('moreFrom', lang),
      trendingOn:       t('trendingOn', lang),
      sponsoredLinks:   t('sponsoredLinks', lang),
    },
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
