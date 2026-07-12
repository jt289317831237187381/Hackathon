import productCatalog from './productCatalog.json';

const categoryOptions = [
  { id: 'audio', label: 'Audio', glyph: '◉' },
  { id: 'electronics', label: 'Electronics', glyph: '⌁' },
  { id: 'kitchen', label: 'Kitchen', glyph: '◒' },
  { id: 'home', label: 'Home', glyph: '⌂' },
  { id: 'computing', label: 'Computing', glyph: '⌨' },
  { id: 'outdoors', label: 'Outdoors', glyph: '△' },
  { id: 'tools', label: 'Tools', glyph: '◇' },
  { id: 'appliances', label: 'Appliances', glyph: '◎' },
];

const catalogCategoryIds = new Set(productCatalog.map((record) => record.categoryId));
export const categories = [
  { id: 'all', label: 'Everything', glyph: '✦' },
  ...categoryOptions.filter((category) => catalogCategoryIds.has(category.id)),
];

const visualDefaults = {
  audio: { palette: 'clay', glyph: '🎧' },
  electronics: { palette: 'rose', glyph: '⌁' },
  kitchen: { palette: 'cream', glyph: '◒' },
  home: { palette: 'sage', glyph: '⌂' },
  computing: { palette: 'steel', glyph: '⌨' },
  outdoors: { palette: 'moss', glyph: '△' },
  tools: { palette: 'blue', glyph: '◇' },
  appliances: { palette: 'amber', glyph: '◎' },
};

// Product identity, price, specifications and warranty come from the canonical,
// source-backed catalogue. Community fields intentionally start empty. Synthetic
// fixtures below never contribute to these values.
export const products = productCatalog.map((record, index) => {
  const visual = visualDefaults[record.categoryId] || visualDefaults.home;
  return {
    id: record.id,
    name: record.name,
    brand: record.brand,
    model: record.model,
    category: record.categoryId,
    categoryLabel: record.categoryLabel,
    price: record.currentPrice ?? null,
    currency: record.currency || 'AUD',
    priceNote: record.priceNote,
    rating: null,
    reviewCount: 0,
    owners: 0,
    longTermOwners: 0,
    buyAgain: null,
    lifespanMonths: record.expectedLifespanMonths ?? null,
    lifespanSource: record.lifespanSource,
    repairability: record.repairabilityRating ?? null,
    repairSupport: record.repairSupport,
    releaseDate: record.releaseDate,
    releaseYear: record.releaseYear,
    validation: record.validationStatus || 'Official specs checked',
    trendingRank: record.catalogOrder || index + 1,
    savedCount: 0,
    palette: record.palette || visual.palette,
    glyph: record.glyph || visual.glyph,
    summary: record.summary,
    discussion: record.discussion,
    distribution: [0, 0, 0, 0, 0],
    officialUrl: record.officialUrl,
    imageUrl: record.imageUrl,
    imageSourceUrl: record.imageSourceUrl || record.officialUrl,
    imageAlt: record.imageAlt || `${record.name} official product image`,
    specSourceUrl: record.specSourceUrl,
    warrantySourceUrl: record.warrantySourceUrl,
    specsCheckedAt: record.specsCheckedAt,
    specs: record.specs || [],
    warranty: record.warranty,
    reviewTopics: record.reviewTopics || {},
    officialSpecs: true,
    isRealProduct: true,
    productProvenance: 'official_manufacturer_website',
  };
});

const syntheticScenarios = [
  {
    rating: 5,
    relationship: 'Currently own it',
    ownershipMonths: 18,
    title: 'Demo: the core strengths fit this use case',
    text: ({ strength }) => `Synthetic scenario: ${strength} suited this reviewer’s priorities, so the product felt well matched to regular use. This is generated interface copy, not customer testimony.`,
    pros: ({ strength }) => [strength, 'Clear official specifications'],
    cons: ({ tradeoff }) => [tradeoff],
    wouldBuyAgain: true,
  },
  {
    rating: 4,
    relationship: 'Used regularly through work',
    ownershipMonths: 30,
    title: 'Demo: support would matter over time',
    text: ({ maintenance }) => `Synthetic scenario: repeated use made ${maintenance} an important part of the value assessment. No real durability outcome is being claimed.`,
    pros: ({ maintenance }) => [maintenance],
    cons: ({ tradeoff }) => [tradeoff],
    wouldBuyAgain: true,
  },
  {
    rating: 3,
    relationship: 'Previously owned it',
    ownershipMonths: 24,
    title: 'Demo: capable, with a meaningful trade-off',
    text: ({ strength, tradeoff }) => `Synthetic scenario: ${strength} worked for the intended task, while ${tradeoff} made the overall value feel more balanced than exceptional.`,
    pros: ({ strength }) => [strength],
    cons: ({ tradeoff }) => [tradeoff],
    wouldBuyAgain: false,
  },
  {
    rating: 2,
    relationship: 'Briefly tested it',
    ownershipMonths: 1,
    title: 'Demo: not the right fit for this person',
    text: ({ tradeoff }) => `Synthetic scenario: ${tradeoff} outweighed the benefits during a brief trial. This low rating represents product fit, not a verified fault or failure.`,
    pros: ({ strength }) => [strength],
    cons: ({ tradeoff }) => [tradeoff, 'Too little use to judge longevity'],
    wouldBuyAgain: false,
  },
  {
    rating: 1,
    relationship: 'Do not own it',
    ownershipMonths: 0,
    title: 'Demo: buying it would duplicate what already works',
    text: ({ upgrade }) => `Synthetic scenario: ${upgrade} already covered the same need, making a new purchase hard to justify. The rating reflects purchase suitability, not product quality.`,
    pros: ({ strength }) => [strength],
    cons: ({ upgrade }) => [`Would duplicate ${upgrade}`],
    wouldBuyAgain: false,
  },
  {
    rating: 5,
    relationship: 'Briefly tested it',
    ownershipMonths: 2,
    title: 'Demo: useful without needing to own one',
    text: ({ strength, upgrade }) => `Synthetic scenario: ${strength} was useful for a short project, but borrowing avoided replacing or duplicating ${upgrade}.`,
    pros: ({ strength }) => [strength, 'Borrowing met a temporary need'],
    cons: () => ['Short use cannot establish service life'],
    wouldBuyAgain: false,
  },
  {
    rating: 4,
    relationship: 'Currently own it',
    ownershipMonths: 48,
    title: 'Demo: maintenance is part of ownership',
    text: ({ maintenance, tradeoff }) => `Synthetic long-term scenario: ${maintenance} would be central to keeping the product useful, while ${tradeoff} would remain worth considering. This is not an actual owner report.`,
    pros: ({ maintenance }) => [maintenance, 'Maintenance path is documented'],
    cons: ({ tradeoff }) => [tradeoff],
    wouldBuyAgain: true,
  },
  {
    rating: 3,
    relationship: 'Do not own it',
    ownershipMonths: 0,
    title: 'Demo: more evidence is needed',
    text: ({ strength, tradeoff }) => `Synthetic comparison scenario: ${strength} looked promising, but ${tradeoff} and the absence of authenticated long-term evidence prevented a stronger conclusion.`,
    pros: ({ strength }) => [strength],
    cons: ({ tradeoff }) => [tradeoff, 'No community lifespan evidence yet'],
    wouldBuyAgain: false,
  },
];

function plausibleOwnershipMonths(product, requestedMonths) {
  if (!requestedMonths) return 0;
  const release = product.releaseDate
    ? new Date(`${product.releaseDate}T00:00:00Z`)
    : product.releaseYear
      ? new Date(Date.UTC(product.releaseYear, 0, 1))
      : null;
  if (!release || Number.isNaN(release.getTime())) return requestedMonths;
  const checkedAt = new Date(Date.UTC(2026, 6, 12));
  const elapsedMonths = Math.max(0, (checkedAt.getUTCFullYear() - release.getUTCFullYear()) * 12 + checkedAt.getUTCMonth() - release.getUTCMonth());
  return Math.min(requestedMonths, elapsedMonths);
}

export const reviewsByProduct = Object.fromEntries(products.map((product, productIndex) => {
  const topics = {
    strength: product.reviewTopics.strength || product.specs[0]?.[1] || 'the stated core specification',
    tradeoff: product.reviewTopics.tradeoff || 'the price and practical fit',
    maintenance: product.reviewTopics.maintenance || product.repairSupport || 'the official support route',
    upgrade: product.reviewTopics.upgrade || 'an existing product serving the same purpose',
  };
  const reviews = syntheticScenarios.map((scenario, reviewIndex) => ({
    id: `${product.id}-synthetic-review-${reviewIndex + 1}`,
    productId: product.id,
    userId: `synthetic-demo-${productIndex + 1}-${reviewIndex + 1}`,
    user: `Synthetic reviewer ${reviewIndex + 1}`,
    initials: `S${reviewIndex + 1}`,
    relationship: scenario.relationship,
    ownershipMonths: plausibleOwnershipMonths(product, scenario.ownershipMonths),
    rating: scenario.rating,
    title: scenario.title,
    text: scenario.text(topics),
    pros: scenario.pros(topics),
    cons: scenario.cons(topics),
    wouldBuyAgain: scenario.wouldBuyAgain,
    helpful: 0,
    comments: 0,
    date: new Date(Date.UTC(2026, 5, 28 - reviewIndex - (productIndex % 3))).toISOString(),
    demo: true,
    isSynthetic: true,
    provenance: 'synthetic_demo',
    commercialRelationship: false,
    receivedDiscount: false,
  }));
  return [product.id, reviews];
}));

// No fictional ownership is preloaded. Signed-in users can add private records.
export const demoOwnedItems = [];

export const currentUser = {
  id: 'local-demo-user',
  displayName: 'Maya Chen',
  username: 'maya',
  email: 'demo@worthit.local',
  initials: 'MC',
  role: 'member',
  phoneVerified: true,
  bio: 'Trying to buy fewer things, and keep the good ones working.',
  memberSince: 'May 2026',
};

export const demoCredentials = {
  identifier: 'maya',
  alternateIdentifier: 'demo@worthit.local',
  password: 'worthit123',
};

export const trendingDiscussions = products.slice(0, 3).map((product) => ({
  productId: product.id,
  title: product.discussion,
  replies: 0,
  tag: 'Synthetic prompt',
  isSynthetic: true,
}));

export const communityStats = [
  { value: '0', label: 'authenticated product reviews' },
  { value: '0', label: 'long-term owner notes' },
  { value: '15', label: 'officially sourced products' },
];

export const formatPrice = (product) => {
  if (product.price === null || product.price === undefined || product.price === '') return 'Not listed';
  const price = Number(product.price);
  if (!Number.isFinite(price)) return 'Not listed';
  const showCents = !Number.isInteger(price);
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: product.currency || 'AUD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(price);
};
