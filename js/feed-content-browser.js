// ============================================================
//  FEED CONTENT GENERATOR (Browser-compatible)
//  Uses real extracted cards + images when available
//  Supports localized sponsored content per language/region
// ============================================================

const SPONSORED_POOL_EN = [
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

const SPONSORED_POOL_HE = [
  { source: 'Wix', headline: 'בנו אתר מקצועי תוך דקות — בלי קוד', cta: 'התחילו בחינם', category: 'טכנולוגיה' },
  { source: 'אל על', headline: 'טיסות לאירופה במחירים מיוחדים — הזמינו עכשיו', cta: 'להזמנה', category: 'תיירות' },
  { source: 'סופר-פארם', headline: 'מבצעי הקיץ הגדולים — הנחות עד 50%', cta: 'לפרטים', category: 'קניות' },
  { source: 'בנק לאומי', headline: 'חשבון חיסכון בריבית מועדפת — פתחו היום', cta: 'למידע נוסף', category: 'פיננסים' },
  { source: 'פלאפון', headline: 'חבילת הגלישה הכי משתלמת בישראל', cta: 'לפרטים', category: 'תקשורת' },
  { source: 'יד2', headline: 'מצאו את הרכב המושלם — חיפוש חכם', cta: 'חפשו עכשיו', category: 'רכב' },
  { source: 'Booking.com', headline: 'מלונות בתל אביב — מחירים בלעדיים', cta: 'הזמינו', category: 'תיירות' },
  { source: 'Samsung', headline: 'Galaxy S25 Ultra — הזמנה מוקדמת עם מתנה', cta: 'לרכישה', category: 'טכנולוגיה' },
  { source: 'שופרסל', headline: 'משלוחי סופר עד הבית — ההזמנה הראשונה בחינם', cta: 'להזמנה', category: 'קניות' },
  { source: 'מכבי שירותי בריאות', headline: 'בדיקת בריאות שנתית — הרשמו עכשיו', cta: 'למידע נוסף', category: 'בריאות' },
  { source: 'HOT', headline: 'חבילת טלוויזיה ואינטרנט במחיר מיוחד', cta: 'לפרטים', category: 'תקשורת' },
  { source: 'Mobileye', headline: 'הטכנולוגיה שמצילה חיים על הכביש', cta: 'גלו עוד', category: 'טכנולוגיה' },
  { source: 'הפניקס', headline: 'ביטוח רכב במחיר מפתיע — קבלו הצעה', cta: 'להצעת מחיר', category: 'ביטוח' },
  { source: 'IKEA', headline: 'עיצוב הבית שלכם — קולקציה חדשה', cta: 'לצפייה', category: 'בית' },
  { source: 'אמזון', headline: 'מבצעים יומיים — משלוח חינם לישראל', cta: 'קנו עכשיו', category: 'קניות' },
  { source: 'עזריאלי', headline: 'דירות חדשות במיקומים מבוקשים', cta: 'לפרטים', category: 'נדל"ן' },
  { source: 'Fiverr', headline: 'מצאו פרילנסרים מקצועיים לכל פרויקט', cta: 'התחילו', category: 'עסקים' },
  { source: 'כללית', headline: 'רפואה דיגיטלית — ייעוץ רופא מהבית', cta: 'למידע נוסף', category: 'בריאות' },
  { source: 'סלקום', headline: 'תוכנית סלולר עם גלישה ללא הגבלה', cta: 'הצטרפו', category: 'תקשורת' },
  { source: 'NEXT', headline: 'אופנה חדשה לעונה — קולקציית 2025', cta: 'לצפייה', category: 'אופנה' },
];

const SPONSORED_POOL_DE = [
  { source: 'Deutsche Telekom', headline: 'MagentaEINS — Alles aus einer Hand', cta: 'Jetzt entdecken', category: 'Telekommunikation' },
  { source: 'Siemens', headline: 'Smarte Haushaltsgeräte für Ihr Zuhause', cta: 'Mehr erfahren', category: 'Technologie' },
  { source: 'Booking.com', headline: 'Traumurlaub zu Top-Preisen — Jetzt buchen', cta: 'Buchen', category: 'Reisen' },
  { source: 'Samsung', headline: 'Das neue Galaxy S25 Ultra — Jetzt vorbestellen', cta: 'Jetzt kaufen', category: 'Technologie' },
  { source: 'BMW', headline: 'Die neue 5er Reihe — Freude am Fahren', cta: 'Konfigurieren', category: 'Auto' },
  { source: 'CHECK24', headline: 'Versicherungen vergleichen und sparen', cta: 'Vergleichen', category: 'Finanzen' },
  { source: 'OTTO', headline: 'Mode & Lifestyle — Neue Kollektion entdecken', cta: 'Shoppen', category: 'Shopping' },
  { source: 'Allianz', headline: 'Rundum-Schutz für Ihre Familie', cta: 'Angebot sichern', category: 'Versicherung' },
  { source: 'Lidl', headline: 'Frische Angebote der Woche — Jetzt sparen', cta: 'Zu den Angeboten', category: 'Einkaufen' },
  { source: 'HelloFresh', headline: 'Frische Rezepte direkt an Ihre Haustür', cta: 'Jetzt starten', category: 'Essen' },
  { source: 'Lufthansa', headline: 'Flüge ab 49€ — Frühbucher-Rabatte sichern', cta: 'Buchen', category: 'Reisen' },
  { source: 'About You', headline: 'Mode, die zu Ihnen passt — Jetzt entdecken', cta: 'Shoppen', category: 'Mode' },
];

const SPONSORED_POOL_AR = [
  { source: 'Booking.com', headline: 'أفضل العروض الفندقية — احجز الآن', cta: 'احجز', category: 'سفر' },
  { source: 'Samsung', headline: 'Galaxy S25 Ultra الجديد — اطلبه الآن', cta: 'تسوق', category: 'تقنية' },
  { source: 'أمازون', headline: 'عروض يومية — شحن مجاني', cta: 'تسوق الآن', category: 'تسوق' },
  { source: 'Noon', headline: 'تخفيضات حصرية — وفر حتى ٥٠٪', cta: 'تسوق', category: 'تسوق' },
  { source: 'Emirates', headline: 'رحلات بأسعار مميزة — احجز مقعدك', cta: 'احجز', category: 'سفر' },
  { source: 'STC', headline: 'باقات إنترنت غير محدودة', cta: 'اشترك', category: 'اتصالات' },
  { source: 'Careem', headline: 'رحلات يومية بأسعار تنافسية', cta: 'حمّل التطبيق', category: 'نقل' },
  { source: 'IKEA', headline: 'أثاث عصري لمنزلك — تشكيلة جديدة', cta: 'تصفح', category: 'منزل' },
  { source: 'Jarir', headline: 'أحدث الأجهزة الإلكترونية بأفضل الأسعار', cta: 'تسوق', category: 'تقنية' },
  { source: 'Talabat', headline: 'مطاعمك المفضلة توصلك — اطلب الآن', cta: 'اطلب', category: 'طعام' },
];

// Map of language code to sponsored pool
const SPONSORED_POOLS = {
  en: SPONSORED_POOL_EN,
  he: SPONSORED_POOL_HE,
  de: SPONSORED_POOL_DE,
  ar: SPONSORED_POOL_AR,
};

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

// Localized "More For You" labels
const MORE_FROM_LABELS = {
  en: 'More For You',
  he: 'עוד בשבילך',
  ar: 'المزيد لك',
  de: 'Mehr für Sie',
  fr: 'Plus pour vous',
  es: 'Más para ti',
  it: 'Altro per te',
  pt: 'Mais para você',
  ru: 'Ещё для вас',
  ja: 'おすすめ',
  ko: '추천',
  zh: '为你推荐',
  nl: 'Meer voor jou',
  tr: 'Senin için daha fazla',
  pl: 'Więcej dla Ciebie',
};

// Localized "Trending Now" labels
const TRENDING_LABELS = {
  en: 'Trending Now',
  he: 'פופולרי עכשיו',
  ar: 'الرائج الآن',
  de: 'Beliebt jetzt',
  fr: 'Tendances',
  es: 'Tendencia ahora',
  it: 'Di tendenza ora',
  pt: 'Em alta agora',
  ru: 'Популярное сейчас',
  ja: 'トレンド',
  ko: '인기',
  zh: '热门',
  nl: 'Trending nu',
  tr: 'Trend olan',
  pl: 'Popularne teraz',
};

// Localized "Content by" labels
const CONTENT_BY_LABELS = {
  en: 'Content by',
  he: 'תוכן מאת',
  ar: 'محتوى بواسطة',
  de: 'Inhalt von',
  fr: 'Contenu par',
  es: 'Contenido por',
  it: 'Contenuto di',
  pt: 'Conteúdo por',
  ru: 'Контент от',
  ja: 'コンテンツ提供:',
  ko: '콘텐츠 제공:',
  zh: '内容来自',
  nl: 'Inhoud door',
  tr: 'İçerik sağlayıcı:',
  pl: 'Treść dostarczana przez',
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
  const lang = brandKit.brand_voice?.language || brandKit.brand?.language || 'en';
  const baseLang = lang.toLowerCase().split('-')[0];

  // If we have real extracted cards, use them
  if (extractedCards && extractedCards.length >= 3) {
    return extractedCards.slice(0, 12).map((card, i) => ({
      headline: card.headline,
      source: publisherName,
      thumbnail: card.image || (extractedImages && extractedImages[i]) || '',
      category: card.category || categories[i % Math.max(categories.length, 1)] || '',
      link: card.link || '#',
      isNative: true,
    }));
  }

  // Localized fallback headlines
  const nativeHeadlinesMap = {
    he: [
      { headline: 'מבזק: שינוי מדיניות משמעותי צפוי השבוע', category: categories[0] || 'חדשות' },
      { headline: 'השווקים עולים: עונת הדוחות עוברת את הציפיות', category: categories[1] || 'כלכלה' },
      { headline: 'מחקר חדש חושף יתרונות בריאותיים מפתיעים של קפה', category: categories[2] || 'בריאות' },
      { headline: 'ענקיות הטכנולוגיה מכריזות על יוזמה משותפת לבטיחות AI', category: categories[3] || 'טכנולוגיה' },
      { headline: 'מדריך טיולים לסוף השבוע: פנינים חבויות במרחק נסיעה', category: categories[4] || 'תיירות' },
      { headline: 'גמר האליפות: מה צריך לדעת לפני המשחק הערב', category: categories[5] || 'ספורט' },
      { headline: 'דו"ח אקלים: טמפרטורות שיא נרשמו ברחבי העולם', category: categories[0] || 'מדע' },
      { headline: 'דעה: למה הבחירות הקרובות חשובות יותר משאתם חושבים', category: categories[1] || 'דעות' },
      { headline: 'ביקורת: הסרט הנחשק ביותר של השנה לא מאכזב', category: categories[2] || 'תרבות' },
      { headline: 'עסקים קטנים בפריחה: גידול שיא ברחבי הארץ', category: categories[3] || 'כלכלה' },
    ],
    de: [
      { headline: 'Eilmeldung: Wichtige politische Veränderungen diese Woche erwartet', category: categories[0] || 'Politik' },
      { headline: 'Märkte steigen: Berichtssaison übertrifft Erwartungen', category: categories[1] || 'Wirtschaft' },
      { headline: 'Neue Studie enthüllt überraschende Gesundheitsvorteile von Kaffee', category: categories[2] || 'Gesundheit' },
      { headline: 'Tech-Giganten kündigen gemeinsame KI-Sicherheitsinitiative an', category: categories[3] || 'Digital' },
      { headline: 'Wochenend-Reiseführer: Versteckte Juwelen in der Nähe', category: categories[4] || 'Reise' },
      { headline: 'Meisterschaftsfinale: Was Sie heute Abend wissen müssen', category: categories[5] || 'Sport' },
    ],
    ar: [
      { headline: 'عاجل: تحولات سياسية كبرى متوقعة هذا الأسبوع', category: categories[0] || 'أخبار' },
      { headline: 'الأسواق ترتفع: موسم الأرباح يتجاوز التوقعات', category: categories[1] || 'اقتصاد' },
      { headline: 'دراسة جديدة تكشف فوائد صحية مفاجئة للقهوة', category: categories[2] || 'صحة' },
      { headline: 'عمالقة التكنولوجيا يعلنون عن مبادرة مشتركة لسلامة الذكاء الاصطناعي', category: categories[3] || 'تقنية' },
      { headline: 'دليل السفر لعطلة نهاية الأسبوع: جواهر مخفية بالقرب منك', category: categories[4] || 'سفر' },
      { headline: 'نهائي البطولة: ما تحتاج معرفته قبل المباراة الليلة', category: categories[5] || 'رياضة' },
    ],
  };

  const nativeHeadlines = nativeHeadlinesMap[baseLang] || [
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
  const lang = brandKit.brand_voice?.language || brandKit.brand?.language || 'en';
  const baseLang = lang.toLowerCase().split('-')[0];

  // Select language-appropriate sponsored pool
  const pool = SPONSORED_POOLS[baseLang] || SPONSORED_POOL_EN;

  // Use real page images for sponsored card thumbnails too
  const availableImages = (extractedImages && extractedImages.length > 0) ? extractedImages : [];

  const sponsored = _pickRandom(pool, 12).map((card, i) => ({
    ...card,
    // Use real image if available; prototype.js handles gradient fallback for missing images
    thumbnail: availableImages.length > 0 ? availableImages[i % availableImages.length] : '',
  }));

  const native = _generateNativeCards(brandKit, navigation, extractedCards, extractedImages);

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
    contentByLabel: _getLocalizedLabel(CONTENT_BY_LABELS, lang),
  };
}
