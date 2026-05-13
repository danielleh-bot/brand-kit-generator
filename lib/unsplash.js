// ============================================================
//  UNSPLASH CURATED PHOTO BANK
//  Hand-picked photo IDs grouped by topic, with a topic detector
//  that maps an article headline + category to the best bucket.
//  No API key required — we use Unsplash's stable `source` URL
//  format, which is rate-limit-tolerant and CDN-backed.
//
//  If you later want sharper relevance, swap pickPhoto() to call
//  the Unsplash Search API with an access key.
// ============================================================

// Photo IDs are real, public Unsplash photos chosen for their editorial
// quality and topic clarity. They render reliably at any size via:
//   https://images.unsplash.com/photo-<id>?w=<w>&h=<h>&fit=crop&auto=format
const CURATED = {
  news: [
    'photo-1495020689067-958852a7765e', // newspaper
    'photo-1504711434969-e33886168f5c', // press conference
    'photo-1586339949216-35c2747cc36d', // city skyline
    'photo-1495020689067-958852a7765e',
  ],
  politics: [
    'photo-1529107386315-e1a2ed48a620', // capitol
    'photo-1575320181282-9afab399332c', // voting
    'photo-1574087334419-3c9a39f8de37', // government building
  ],
  business: [
    'photo-1542744173-8e7e53415bb0', // office
    'photo-1556761175-5973dc0f32e7', // meeting
    'photo-1450101499163-c8848c66ca85', // skyline business
  ],
  finance: [
    'photo-1611974789855-9c2a0a7236a3', // charts
    'photo-1559526324-4b87b5e36e44', // money
    'photo-1554224155-6726b3ff858f', // graph
  ],
  technology: [
    'photo-1518770660439-4636190af475', // circuit
    'photo-1488590528505-98d2b5aba04b', // laptop
    'photo-1518709268805-4e9042af2176', // code
  ],
  ai: [
    'photo-1677442136019-21780ecad995', // ai abstract
    'photo-1620712943543-bcc4688e7485', // robot
    'photo-1535378620166-273708d44e4c', // network
  ],
  sports: [
    'photo-1517649763962-0c623066013b', // stadium
    'photo-1431324155629-1a6deb1dec8d', // soccer
    'photo-1546519638-68e109498ffc', // basketball
  ],
  health: [
    'photo-1505751172876-fa1923c5c528', // medicine
    'photo-1506744038136-46273834b3fb', // wellness
    'photo-1532938911079-1b06ac7ceec7', // stethoscope
  ],
  science: [
    'photo-1532187863486-abf9dbad1b69', // lab
    'photo-1576086213369-97a306d36557', // microscope
    'photo-1518152006812-edab29b069ac', // space
  ],
  travel: [
    'photo-1488646953014-85cb44e25828', // suitcase
    'photo-1469854523086-cc02fe5d8800', // mountains
    'photo-1507525428034-b723cf961d3e', // beach
  ],
  food: [
    'photo-1546069901-ba9599a7e63c', // plate
    'photo-1504674900247-0877df9cc836', // breakfast
    'photo-1565299624946-b28f40a0ae38', // pizza
  ],
  lifestyle: [
    'photo-1490481651871-ab68de25d43d', // home
    'photo-1483985988355-763728e1935b', // shopping
    'photo-1469474968028-56623f02e42e', // landscape
  ],
  entertainment: [
    'photo-1489599849927-2ee91cede3ba', // cinema
    'photo-1493225457124-a3eb161ffa5f', // concert
    'photo-1493676304819-0d7a8d026dcf', // music
  ],
  automotive: [
    'photo-1492144534655-ae79c964c9d7', // car
    'photo-1503376780353-7e6692767b70', // sports car
    'photo-1494976388531-d1058494cdd8', // road
  ],
  realestate: [
    'photo-1564013799919-ab600027ffc6', // house
    'photo-1512917774080-9991f1c4c750', // home interior
    'photo-1568605114967-8130f3a36994', // apartment
  ],
  fashion: [
    'photo-1483985988355-763728e1935b', // shopping
    'photo-1509631179647-0177331693ae', // boutique
    'photo-1539109136881-3be0616acf4b', // accessories
  ],
  weather: [
    'photo-1500740516770-92bd004b996e', // storm
    'photo-1429552077091-836152271555', // sunset
    'photo-1543968996-ee822b8176ba', // clouds
  ],
  generic: [
    'photo-1518770660439-4636190af475',
    'photo-1499951360447-b19be8fe80f5',
    'photo-1469474968028-56623f02e42e',
    'photo-1490481651871-ab68de25d43d',
  ],
};

const KEYWORDS = [
  { topic: 'ai',            terms: ['ai', 'artificial intelligence', 'chatgpt', 'gpt', 'llm', 'machine learning'] },
  { topic: 'technology',    terms: ['tech', 'software', 'app', 'startup', 'silicon', 'apple', 'google', 'microsoft', 'meta', 'iphone', 'android', 'creative cloud', 'cloud', 'adobe'] },
  { topic: 'finance',       terms: ['stock', 'market', 'wall street', 'invest', 'bank', 'savings', 'mortgage', 'interest rate', 'crypto', 'bitcoin', 'account', 'fund', 'fidelity'] },
  { topic: 'business',      terms: ['business', 'ceo', 'company', 'revenue', 'earnings', 'merger', 'acquisition', 'ipo', 'office'] },
  { topic: 'politics',      terms: ['election', 'president', 'congress', 'senate', 'minister', 'parliament', 'policy', 'vote', 'campaign', 'government'] },
  { topic: 'sports',        terms: ['sport', 'football', 'soccer', 'basketball', 'baseball', 'nfl', 'nba', 'fifa', 'olympic', 'championship', 'match', 'game', 'workout', 'peloton', 'fitness', 'gym'] },
  { topic: 'health',        terms: ['health', 'medical', 'doctor', 'hospital', 'covid', 'vaccine', 'cancer', 'diabetes', 'wellness', 'nutrition', 'meditation', 'calm', 'sleep', 'mind'] },
  { topic: 'science',       terms: ['science', 'researcher', 'study', 'nasa', 'space', 'climate', 'biology', 'physics'] },
  { topic: 'travel',        terms: ['travel', 'flight', 'airport', 'hotel', 'vacation', 'tourism', 'destination', 'beach', 'mountain', 'booking', 'airbnb', 'getaway', 'stay'] },
  { topic: 'food',          terms: ['food', 'recipe', 'restaurant', 'chef', 'cooking', 'meal', 'dinner', 'meal kit', 'hellofresh', 'doordash', 'order'] },
  { topic: 'entertainment', terms: ['movie', 'film', 'tv', 'streaming', 'netflix', 'music', 'album', 'concert', 'oscar', 'grammy', 'celebrity', 'masterclass', 'class'] },
  { topic: 'automotive',    terms: ['car', 'vehicle', 'tesla', 'ev', 'electric', 'driving', 'ford', 'toyota', 'volvo', 'lexus', 'mercedes', 'bmw', 'rx', 'sedan', 'suv'] },
  { topic: 'realestate',    terms: ['home', 'house', 'real estate', 'property', 'apartment', 'rent', 'mortgage', 'zillow', 'listing'] },
  { topic: 'fashion',       terms: ['fashion', 'style', 'designer', 'runway', 'collection', 'apparel', 'wear'] },
  { topic: 'weather',       terms: ['weather', 'storm', 'hurricane', 'snow', 'forecast'] },
  { topic: 'lifestyle',     terms: ['lifestyle', 'family', 'parent', 'tip', 'guide', 'mattress', 'bed', 'furniture', 'sleep', 'casper', 'dyson', 'vacuum', 'home goods', 'decor'] },
  { topic: 'news',          terms: ['news', 'report', 'breaking', 'update'] },
];

const CATEGORY_TO_TOPIC = {
  business: 'business', biz: 'business',
  tech: 'technology', technology: 'technology', science: 'science', software: 'technology',
  ai: 'ai',
  sport: 'sports', sports: 'sports', fitness: 'sports',
  politics: 'politics', world: 'news', nation: 'news', us: 'news',
  health: 'health', wellness: 'health', medical: 'health',
  travel: 'travel', food: 'food', cooking: 'food',
  lifestyle: 'lifestyle', home: 'lifestyle', household: 'lifestyle',
  entertainment: 'entertainment', arts: 'entertainment', movies: 'entertainment',
  tv: 'entertainment', music: 'entertainment', education: 'entertainment',
  finance: 'finance', money: 'finance', markets: 'finance', insurance: 'finance',
  banking: 'finance', investing: 'finance',
  auto: 'automotive', autos: 'automotive', cars: 'automotive', automotive: 'automotive',
  realestate: 'realestate', 'real-estate': 'realestate', homes: 'realestate',
  property: 'realestate',
  fashion: 'fashion', style: 'fashion', beauty: 'fashion',
  weather: 'weather', opinion: 'news',
  telecom: 'technology', telecommunications: 'technology', mobile: 'technology',
  shopping: 'lifestyle', retail: 'lifestyle',
};

/**
 * Identify the best topic bucket for an article based on its category and
 * headline. Falls back to "news" / "generic" when nothing matches.
 *
 * @param {{ category?: string, headline?: string }} input
 * @returns {string} topic key in CURATED
 */
function detectTopic({ category, headline } = {}) {
  if (category) {
    const slug = String(category).toLowerCase().replace(/[^a-z]+/g, '');
    if (CATEGORY_TO_TOPIC[slug]) return CATEGORY_TO_TOPIC[slug];
  }
  const text = String(headline || '').toLowerCase();
  if (text) {
    for (const { topic, terms } of KEYWORDS) {
      if (terms.some((t) => text.includes(t))) return topic;
    }
  }
  return 'news';
}

/**
 * Pick a deterministic photo URL for the given topic + seed. Same seed +
 * topic always returns the same photo, so card thumbnails stay stable
 * across prototype renders.
 *
 * @param {object} opts
 * @param {string} [opts.category]
 * @param {string} [opts.headline]
 * @param {string|number} [opts.seed]    Stable seed (e.g. card index)
 * @param {number}        [opts.width]   px
 * @param {number}        [opts.height]  px
 * @returns {string} fully-qualified Unsplash image URL
 */
function pickPhoto({ category, headline, seed = 0, width = 400, height = 300 } = {}) {
  const topic = detectTopic({ category, headline });
  const pool = CURATED[topic] || CURATED.generic;
  const hash = String(seed)
    .split('')
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  const photo = pool[hash % pool.length];
  return `https://images.unsplash.com/${photo}?w=${width}&h=${height}&fit=crop&auto=format&q=75`;
}

module.exports = { pickPhoto, detectTopic, CURATED };
