const DEMO_DATA_NOTICE =
  'Development demonstration data only. These products, reviews, people and activity are fictional and must not be presented as production community content.';

const categories = Object.freeze([
  { id: 'audio', name: 'Audio' },
  { id: 'electronics', name: 'Electronics' },
  { id: 'kitchen', name: 'Kitchen' },
  { id: 'home', name: 'Home' },
  { id: 'computing', name: 'Computing' },
  { id: 'outdoors', name: 'Outdoors' },
  { id: 'tools', name: 'Tools' },
  { id: 'appliances', name: 'Appliances' },
]);

const productSeeds = [
  {
    id: 'auraflow-nc1',
    name: 'AuraFlow NC1',
    brand: 'AuraFlow',
    model: 'NC1',
    categoryId: 'audio',
    categoryLabel: 'Over-ear headphones',
    currentPrice: 329,
    currency: 'AUD',
    expectedLifespanMonths: 48,
    releaseDate: '2023-03-10',
    repairabilityRating: 3.8,
    ratingHint: 4.3,
    validationStatus: 'Community validated',
    trendingRank: 1,
    demoSavedCount: 22,
    demoOwnerCount: 16,
    summary:
      'Noise-cancelling headphones with replaceable cushions and a wired listening mode.',
    discussion: 'Are the new ones meaningfully better than a two-year-old pair?',
    specs: { battery: 'Up to 38 hours', weight: '254 g', warranty: '24 months' },
  },
  {
    id: 'morrow-k2',
    name: 'Morrow K2 Kettle',
    brand: 'Morrow',
    model: 'K2',
    categoryId: 'kitchen',
    categoryLabel: 'Electric kettle',
    currentPrice: 119,
    currency: 'AUD',
    expectedLifespanMonths: 84,
    releaseDate: '2021-08-16',
    repairabilityRating: 4.5,
    ratingHint: 4.7,
    validationStatus: 'Moderator reviewed',
    trendingRank: 4,
    demoSavedCount: 15,
    demoOwnerCount: 11,
    summary:
      'A stainless kettle with a replaceable lid seal, switch and base connector.',
    discussion: 'Can a low-cost replacement switch keep it useful for another decade?',
    specs: { capacity: '1.5 L', body: 'Stainless steel', warranty: '36 months' },
  },
  {
    id: 'fold-one',
    name: 'Fold One',
    brand: 'Common Circuit',
    model: 'F1',
    categoryId: 'electronics',
    categoryLabel: 'Folding phone',
    currentPrice: 1299,
    currency: 'AUD',
    expectedLifespanMonths: 60,
    releaseDate: '2024-02-02',
    repairabilityRating: 2.4,
    ratingHint: 3.8,
    validationStatus: 'Community submitted',
    trendingRank: 2,
    demoSavedCount: 27,
    demoOwnerCount: 9,
    summary:
      'A folding phone whose battery and charging port can be replaced by authorised repairers.',
    discussion: 'Does the folding screen justify replacing a phone that still works?',
    specs: { storage: '256 GB', warranty: '24 months', charging: 'USB-C' },
  },
  {
    id: 'presswell-brewer',
    name: 'Presswell Brewer',
    brand: 'Presswell',
    model: 'Classic',
    categoryId: 'kitchen',
    categoryLabel: 'Manual coffee brewer',
    currentPrice: 58,
    currency: 'AUD',
    expectedLifespanMonths: 120,
    releaseDate: '2019-05-14',
    repairabilityRating: 4.9,
    ratingHint: 4.6,
    validationStatus: 'Moderator reviewed',
    trendingRank: 6,
    demoSavedCount: 18,
    demoOwnerCount: 19,
    summary: 'A manual brewer with a replaceable mesh, seal and handle.',
    discussion: 'Owners compare the cost of a new brewer with replacing a worn mesh.',
    specs: { capacity: '800 mL', material: 'Glass and steel', warranty: '5 years' },
  },
  {
    id: 'tern-pack-24',
    name: 'Tern Everyday Pack 24',
    brand: 'Tern',
    model: '24L',
    categoryId: 'outdoors',
    categoryLabel: 'Everyday backpack',
    currentPrice: 189,
    currency: 'AUD',
    expectedLifespanMonths: 96,
    releaseDate: '2020-09-01',
    repairabilityRating: 4.2,
    ratingHint: 4.4,
    validationStatus: 'Community validated',
    trendingRank: 7,
    demoSavedCount: 13,
    demoOwnerCount: 12,
    summary: 'A waxed-canvas day pack with replaceable buckles and a repair programme.',
    discussion: 'Four years of commuting: which wear points appear first?',
    specs: { volume: '24 L', material: 'Waxed canvas', warranty: '5 years' },
  },
  {
    id: 'quietkey-84',
    name: 'QuietKey 84',
    brand: 'QuietKey',
    model: '84',
    categoryId: 'computing',
    categoryLabel: 'Mechanical keyboard',
    currentPrice: 179,
    currency: 'AUD',
    expectedLifespanMonths: 84,
    releaseDate: '2022-04-22',
    repairabilityRating: 4.6,
    ratingHint: 4.1,
    validationStatus: 'Community validated',
    trendingRank: 9,
    demoSavedCount: 10,
    demoOwnerCount: 8,
    summary: 'A compact hot-swappable keyboard with replaceable switches and battery.',
    discussion: 'Good hardware, but is wireless wake-up reliable enough?',
    specs: { layout: '84 key', connection: 'USB-C and Bluetooth', warranty: '24 months' },
  },
  {
    id: 'glowline-lamp',
    name: 'Glowline Desk Lamp',
    brand: 'Glowline',
    model: 'D3',
    categoryId: 'home',
    categoryLabel: 'Task lighting',
    currentPrice: 145,
    currency: 'AUD',
    expectedLifespanMonths: 120,
    releaseDate: '2020-01-18',
    repairabilityRating: 4.1,
    ratingHint: 4.8,
    validationStatus: 'Community validated',
    trendingRank: 8,
    demoSavedCount: 8,
    demoOwnerCount: 7,
    summary: 'A task light using a standard replaceable LED module and weighted base.',
    discussion: 'Could one replaceable light module outlast several sealed lamps?',
    specs: { output: '650 lm', temperature: '2700–5000 K', warranty: '5 years' },
  },
  {
    id: 'mend-v4',
    name: 'Mend V4',
    brand: 'Mend',
    model: 'V4',
    categoryId: 'appliances',
    categoryLabel: 'Cordless vacuum',
    currentPrice: 449,
    currency: 'AUD',
    expectedLifespanMonths: 60,
    releaseDate: '2022-07-11',
    repairabilityRating: 4.4,
    ratingHint: 3.2,
    validationStatus: 'Needs correction',
    trendingRank: 3,
    demoSavedCount: 20,
    demoOwnerCount: 14,
    summary: 'A cordless vacuum with a user-swappable battery, filter and roller head.',
    discussion: 'Easy to repair, frustrating to use: long-term owners are split.',
    specs: { runtime: 'Up to 52 minutes', weight: '2.7 kg', warranty: '24 months' },
  },
  {
    id: 'loopstick-s2',
    name: 'LoopStick S2',
    brand: 'Loop',
    model: 'S2',
    categoryId: 'kitchen',
    categoryLabel: 'Stick blender',
    currentPrice: 79,
    currency: 'AUD',
    expectedLifespanMonths: 48,
    releaseDate: '2025-01-30',
    repairabilityRating: 2.9,
    ratingHint: 3.6,
    validationStatus: 'Community submitted',
    trendingRank: 10,
    demoSavedCount: 6,
    demoOwnerCount: 4,
    summary: 'A compact variable-speed blender with a detachable steel shaft.',
    discussion: 'Early reports are positive, but longer ownership evidence is missing.',
    specs: { power: '700 W', speeds: 'Variable', warranty: '24 months' },
  },
  {
    id: 'cloudrest-8',
    name: 'CloudRest 8',
    brand: 'CloudRest',
    model: '8',
    categoryId: 'home',
    categoryLabel: 'Foam mattress',
    currentPrice: 899,
    currency: 'AUD',
    expectedLifespanMonths: 96,
    releaseDate: '2021-10-04',
    repairabilityRating: 1.3,
    ratingHint: 2.9,
    validationStatus: 'Community validated',
    trendingRank: 12,
    demoSavedCount: 7,
    demoOwnerCount: 10,
    summary: 'A layered foam mattress with a removable washable cover.',
    discussion: 'Some long-term owners report softening well before the warranty ends.',
    specs: { depth: '28 cm', firmness: 'Medium-firm', warranty: '10 years' },
  },
  {
    id: 'trailshell-r2',
    name: 'TrailShell R2',
    brand: 'Northbound',
    model: 'R2',
    categoryId: 'outdoors',
    categoryLabel: 'Rain jacket',
    currentPrice: 259,
    currency: 'AUD',
    expectedLifespanMonths: 72,
    releaseDate: '2020-06-08',
    repairabilityRating: 3.9,
    ratingHint: 4.5,
    validationStatus: 'Community validated',
    trendingRank: 11,
    demoSavedCount: 12,
    demoOwnerCount: 9,
    summary: 'A three-layer shell backed by a patch-and-zip repair service.',
    discussion: 'How much maintenance does it take to remain waterproof for five winters?',
    specs: { waterproofing: '20,000 mm', weight: '410 g', warranty: '5 years' },
  },
  {
    id: 'pebble-reader',
    name: 'Pebble Reader Mini',
    brand: 'Pebble',
    model: 'Mini 2',
    categoryId: 'electronics',
    categoryLabel: 'E-reader',
    currentPrice: 229,
    currency: 'AUD',
    expectedLifespanMonths: 72,
    releaseDate: '2022-11-17',
    repairabilityRating: 2.6,
    ratingHint: 4.2,
    validationStatus: 'Moderator reviewed',
    trendingRank: 5,
    demoSavedCount: 24,
    demoOwnerCount: 15,
    summary: 'A compact waterproof e-reader with warm light and physical page buttons.',
    discussion: 'The previous model may already do everything most readers need.',
    specs: { display: '6 inch e-ink', storage: '32 GB', warranty: '24 months' },
  },
  {
    id: 'dawn-clock',
    name: 'Dawn Clock',
    brand: 'Dawn',
    model: 'C2',
    categoryId: 'home',
    categoryLabel: 'Alarm clock',
    currentPrice: 89,
    currency: 'AUD',
    expectedLifespanMonths: 96,
    releaseDate: '2023-09-12',
    repairabilityRating: 3.2,
    ratingHint: 3.9,
    validationStatus: 'Community validated',
    trendingRank: 13,
    demoSavedCount: 5,
    demoOwnerCount: 5,
    summary: 'A screen-free sunrise alarm with tactile controls and a replaceable cable.',
    discussion: 'A useful routine tool, or another object for the bedside table?',
    specs: { light: 'Warm sunrise simulation', controls: 'Physical dial', warranty: '24 months' },
  },
  {
    id: 'rivet-d12',
    name: 'Rivet D12',
    brand: 'Rivet',
    model: 'D12',
    categoryId: 'tools',
    categoryLabel: 'Cordless drill',
    currentPrice: 199,
    currency: 'AUD',
    expectedLifespanMonths: 120,
    releaseDate: '2018-03-26',
    repairabilityRating: 4.3,
    ratingHint: 4.6,
    validationStatus: 'Moderator reviewed',
    trendingRank: 14,
    demoSavedCount: 9,
    demoOwnerCount: 18,
    summary: 'A compact drill using an established interchangeable 18V battery platform.',
    discussion: 'Several owners are still using the original motor after six years.',
    specs: { voltage: '18 V', chuck: '13 mm', warranty: '5 years' },
  },
  {
    id: 'everpan-28',
    name: 'EverPan 28',
    brand: 'EverPan',
    model: '28',
    categoryId: 'kitchen',
    categoryLabel: 'Stainless frypan',
    currentPrice: 139,
    currency: 'AUD',
    expectedLifespanMonths: 180,
    releaseDate: '2017-02-20',
    repairabilityRating: 4.9,
    ratingHint: 4.7,
    validationStatus: 'Moderator reviewed',
    trendingRank: 15,
    demoSavedCount: 19,
    demoOwnerCount: 23,
    summary: 'A tri-ply stainless frypan with a bolted handle and no disposable coating.',
    discussion: 'Owners discuss the learning curve and why the pan can last for a decade.',
    specs: { diameter: '28 cm', material: 'Tri-ply stainless steel', warranty: 'Lifetime limited' },
  },
];

const reviewBodies = [
  {
    title: 'Still useful after daily use',
    text: 'I have used this most weekdays for just over two years. A wear part needed attention, but the main function remains dependable and I have not felt a need to replace it.',
    pros: ['Dependable core function', 'Wear is easy to identify'],
    cons: ['Cosmetic marks appeared early'],
  },
  {
    title: 'Good, but not a reason to upgrade',
    text: 'The product does its job well. After comparing it with the previous version, the difference was too small to justify replacing something that still worked.',
    pros: ['Straightforward to use', 'Consistent performance'],
    cons: ['Small improvement over the older model'],
  },
  {
    title: 'A repair kept it going',
    text: 'A small part failed outside warranty. Standard fasteners and a clear guide let me replace the part instead of the entire product.',
    pros: ['Clear repair guide', 'Standard fasteners'],
    cons: ['The spare part took a week to arrive'],
  },
  {
    title: 'Solid function, some wear',
    text: 'The main function has stayed reliable, although the finish looks older than I expected. I would keep using it rather than replace it for cosmetic reasons.',
    pros: ['Reliable in regular use'],
    cons: ['Finish aged quickly'],
  },
  {
    title: 'Parts availability mattered',
    text: 'I chose this because common wear parts were listed separately. Two years later those parts were still available, which made the higher initial price easier to accept.',
    pros: ['Replacement parts remain available', 'Maintenance is documented'],
    cons: ['Parts shipping is expensive'],
  },
  {
    title: 'Simple maintenance',
    text: 'The areas that collect dirt are accessible without a special tool. Routine cleaning has been enough to keep performance steady.',
    pros: ['Easy to clean', 'No specialist tool required'],
    cons: ['The manual is brief'],
  },
  {
    title: 'Strong first year, long term unknown',
    text: 'The core job is done well and the controls make sense. I have owned it for eleven months, so I cannot yet speak confidently about its full expected lifespan.',
    pros: ['Thoughtful controls', 'Solid everyday use'],
    cons: ['Too early to judge longevity'],
  },
  {
    title: 'The old model remains enough',
    text: 'I tried this beside the older version and could not find a meaningful difference in daily use. Keeping the item I already owned was the easy decision.',
    pros: ['Familiar and capable'],
    cons: ['Upgrade value is unclear'],
  },
  {
    title: 'Designed for maintenance',
    text: 'The common wear points can be reached and the construction is understandable. It feels more likely to last than the sealed product it replaced.',
    pros: ['Accessible wear parts', 'Understandable construction'],
    cons: ['A little heavier than alternatives'],
  },
  {
    title: 'Mixed feelings after three years',
    text: 'The main body still works, but a soft surface and one control have aged poorly. Functionally it is usable; cosmetically it deteriorated sooner than expected.',
    pros: ['Core function still works'],
    cons: ['Surface and control wear'],
  },
  {
    title: 'Value depends on regular use',
    text: 'It makes sense for my weekly routine, but occasional users could probably borrow one or keep a simpler product they already have.',
    pros: ['Useful for frequent use'],
    cons: ['Hard to justify for occasional use'],
  },
  {
    title: 'Longevity is the best feature',
    text: 'There are newer alternatives with extra features, yet this one keeps doing the same job without trouble. Durability has mattered more than novelty.',
    pros: ['Durable', 'No pressure to upgrade'],
    cons: ['Few modern extras'],
  },
];

const demoReviewers = [
  ['Demo member 01', 'Currently own it', 26],
  ['Demo member 02', 'Previously owned it', 38],
  ['Demo member 03', 'Currently own it', 18],
  ['Demo member 04', 'Briefly tested it', 1],
  ['Demo member 05', 'Used it regularly through work, school or another setting', 32],
  ['Demo member 06', 'Currently own it', 64],
  ['Demo member 07', 'Currently own it', 11],
  ['Demo member 08', 'Previously owned it', 29],
];

const demoProducts = Object.freeze(
  productSeeds.map(({ ratingHint, ...product }, index) => ({
    ...product,
    officialUrl: `https://example.com/worthit-demo/${product.id}`,
    imageUrl: null,
    lifespanSource: 'WorthIt? development fixture; not externally verified.',
    submittedBy: `demo-submitter-${(index % 4) + 1}`,
    createdAt: new Date(Date.UTC(2026, 0, index + 2)).toISOString(),
    updatedAt: new Date(Date.UTC(2026, 5, 20 - (index % 8))).toISOString(),
    isDemoData: true,
  }))
);

const demoReviews = Object.freeze(
  productSeeds.flatMap((product, productIndex) => {
    const visibleCount = productIndex === 0 ? 4 : 2;

    return Array.from({ length: visibleCount }, (_, reviewIndex) => {
      const body = reviewBodies[(productIndex * 2 + reviewIndex) % reviewBodies.length];
      const reviewer = demoReviewers[(productIndex + reviewIndex) % demoReviewers.length];
      const rawRating = Math.round(product.ratingHint + (reviewIndex % 2 === 0 ? 0.45 : -0.65));

      return {
        id: `${product.id}-review-${reviewIndex + 1}`,
        productId: product.id,
        userId: `demo-user-${productIndex + 1}-${reviewIndex + 1}`,
        displayName: reviewer[0],
        starRating: Math.max(1, Math.min(5, rawRating)),
        relationshipToProduct: reviewer[1],
        ownershipLengthMonths: reviewer[2],
        title: body.title,
        reviewText: body.text,
        pros: [...body.pros],
        cons: [...body.cons],
        wouldBuyAgain: reviewIndex % 3 !== 1,
        receivedFreeOrDiscounted: false,
        commercialRelationship: false,
        helpfulCount: 4 + ((productIndex * 5 + reviewIndex * 3) % 19),
        commentCount: reviewIndex === 0 ? 1 + (productIndex % 3) : reviewIndex % 2,
        moderationStatus: 'visible',
        createdAt: new Date(Date.UTC(2026, 5 - (productIndex % 5), 18 - reviewIndex * 3)).toISOString(),
        updatedAt: null,
        isDemoData: true,
      };
    });
  })
);

function getCommunityConfidenceLabel(reviewCount) {
  if (reviewCount < 3) return 'Insufficient community data';
  if (reviewCount < 10) return 'Early community rating';
  if (reviewCount < 50) return 'Developing community rating';
  return 'Established community rating';
}

function getReviewsForProduct(productId) {
  return demoReviews.filter(
    (review) => review.productId === productId && review.moderationStatus === 'visible'
  );
}

function getCommunitySummary(productId) {
  const reviews = getReviewsForProduct(productId);
  const reviewCount = reviews.length;
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const review of reviews) distribution[review.starRating] += 1;

  const averageRating = reviewCount
    ? Math.round(
        (reviews.reduce((total, review) => total + review.starRating, 0) / reviewCount) * 10
      ) / 10
    : null;
  const currentOwnerCount = reviews.filter(
    (review) => review.relationshipToProduct === 'Currently own it'
  ).length;
  const longTermOwnerCount = reviews.filter(
    (review) => review.ownershipLengthMonths >= 24
  ).length;
  const buyAgainAnswers = reviews.filter((review) => typeof review.wouldBuyAgain === 'boolean');
  const wouldBuyAgainPercentage = buyAgainAnswers.length
    ? Math.round(
        (buyAgainAnswers.filter((review) => review.wouldBuyAgain).length /
          buyAgainAnswers.length) *
          100
      )
    : null;

  return {
    averageRating,
    reviewCount,
    distribution,
    currentOwnerCount,
    longTermOwnerCount,
    wouldBuyAgainPercentage,
    confidenceLabel: getCommunityConfidenceLabel(reviewCount),
    isDemoData: true,
  };
}

function getProductById(productId) {
  return demoProducts.find((product) => product.id === productId) || null;
}

function getProductWithCommunity(product) {
  const community = getCommunitySummary(product.id);

  return {
    ...product,
    community,
    communityRating: community.averageRating,
    reviewCount: community.reviewCount,
    confidenceLabel: community.confidenceLabel,
  };
}

module.exports = {
  DEMO_DATA_NOTICE,
  categories,
  demoProducts,
  demoReviews,
  getCommunityConfidenceLabel,
  getCommunitySummary,
  getProductById,
  getProductWithCommunity,
  getReviewsForProduct,
};
