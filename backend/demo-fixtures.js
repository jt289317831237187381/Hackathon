const productCatalog = require('../frontend/src/data/productCatalog.json');

const DEMO_DATA_NOTICE =
  'Product names and specifications are real records sourced from official manufacturer websites. Review scenarios are clearly labelled synthetic demonstration data, are not customer testimony, and are excluded from all community metrics.';

const CATEGORY_NAMES = Object.freeze({
  appliances: 'Appliances',
  audio: 'Audio',
  computing: 'Computing',
  electronics: 'Electronics',
  home: 'Home',
  kitchen: 'Kitchen',
  outdoors: 'Outdoors',
  tools: 'Tools',
});

if (!Array.isArray(productCatalog) || productCatalog.length !== 15) {
  throw new TypeError(
    'frontend/src/data/productCatalog.json must contain exactly 15 products.'
  );
}

function finiteNumberOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

const demoProducts = Object.freeze(
  productCatalog.map((source, index) => {
    const categoryId = source.categoryId || source.category;
    const officialUrl = source.officialUrl || source.specSourceUrl;

    if (
      typeof source.id !== 'string' ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(source.id)
    ) {
      throw new TypeError(`Catalog product at index ${index} needs a slug id.`);
    }
    if (typeof categoryId !== 'string' || !categoryId.trim()) {
      throw new TypeError(`Catalog product ${source.id} needs a category.`);
    }
    if (typeof officialUrl !== 'string' || !officialUrl.startsWith('https://')) {
      throw new TypeError(
        `Catalog product ${source.id} needs an official HTTPS URL.`
      );
    }

    return Object.freeze({
      ...source,
      categoryId: categoryId.trim().toLowerCase(),
      categoryLabel:
        source.categoryLabel || CATEGORY_NAMES[categoryId] || categoryId,
      currentPrice: finiteNumberOrNull(source.currentPrice ?? source.price),
      expectedLifespanMonths: finiteNumberOrNull(
        source.expectedLifespanMonths ?? source.lifespanMonths
      ),
      releaseDate: source.releaseDate || null,
      repairabilityRating: finiteNumberOrNull(
        source.repairabilityRating ?? source.repairability
      ),
      validationStatus:
        source.validationStatus || 'Specifications checked against official source',
      trendingRank: Number.isInteger(source.trendingRank)
        ? source.trendingRank
        : source.catalogOrder ?? index + 1,
      demoSavedCount: 0,
      demoOwnerCount: 0,
      officialUrl,
      specSourceUrl: source.specSourceUrl || officialUrl,
      imageUrl: source.imageUrl || null,
      lifespanSource:
        source.lifespanSource || 'No manufacturer-backed lifespan established.',
      submittedBy: null,
      createdAt: source.createdAt || null,
      updatedAt: source.updatedAt || null,
      provenance: source.provenance || 'official_manufacturer_website',
      isRealProduct: true,
      isDemoData: false,
    });
  })
);

const categories = Object.freeze(
  [...new Set(demoProducts.map((product) => product.categoryId))].map(
    (categoryId) =>
      Object.freeze({
        id: categoryId,
        name: CATEGORY_NAMES[categoryId] || categoryId,
      })
  )
);

const syntheticReviewScenarios = Object.freeze([
  Object.freeze({
    topicKey: 'strength',
    title: 'Synthetic review: enthusiastic everyday use',
    text: 'Synthetic review scenario — not customer testimony. Hypothetically, frequent use is consistent and the core function feels worth the purchase.',
    starRating: 5,
    relationshipToProduct: 'Currently own it',
    ownershipLengthMonths: 18,
    pros: [
      'Synthetic positive: dependable core function',
      'Synthetic positive: easy routine use',
    ],
    cons: ['Synthetic caution: premium purchase price'],
    wouldBuyAgain: true,
  }),
  Object.freeze({
    topicKey: 'tradeoff',
    title: 'Synthetic review: capable but poor value for light use',
    text: 'Synthetic review scenario — not customer testimony. Hypothetically, the core function works well, but a simpler or borrowed option would suit occasional use.',
    starRating: 3,
    relationshipToProduct: 'Currently own it',
    ownershipLengthMonths: 7,
    pros: ['Synthetic positive: capable performance'],
    cons: ['Synthetic caution: difficult to justify for occasional use'],
    wouldBuyAgain: false,
  }),
  Object.freeze({
    topicKey: 'maintenance',
    title: 'Synthetic review: frustrating early reliability problem',
    text: 'Synthetic review scenario — not customer testimony. In this deliberately negative hypothetical, an early fault interrupts normal use and raises reliability concerns.',
    starRating: 2,
    relationshipToProduct: 'Previously owned it',
    ownershipLengthMonths: 10,
    pros: ['Synthetic positive: useful while operating normally'],
    cons: [
      'Synthetic negative: hypothetical early fault',
      'Synthetic negative: disrupted use',
    ],
    wouldBuyAgain: false,
  }),
  Object.freeze({
    topicKey: 'maintenance',
    title: 'Synthetic review: maintenance extends useful life',
    text: 'Synthetic review scenario — not customer testimony. Hypothetically, routine cleaning and attention to a wear item keep the whole product in service.',
    starRating: 4,
    relationshipToProduct: 'Currently own it',
    ownershipLengthMonths: 38,
    pros: [
      'Synthetic positive: maintainable wear areas',
      'Synthetic positive: continued useful service',
    ],
    cons: ['Synthetic caution: maintenance takes time'],
    wouldBuyAgain: true,
  }),
  Object.freeze({
    topicKey: 'tradeoff',
    title: 'Synthetic review: good specifications but unsuitable fit',
    text: 'Synthetic review scenario — not customer testimony. In this hypothetical short trial, the official specifications look suitable but the handling or workflow does not fit the tester.',
    starRating: 3,
    relationshipToProduct: 'Briefly tested it',
    ownershipLengthMonths: 1,
    pros: ['Synthetic positive: specifications suit the advertised use'],
    cons: ['Synthetic caution: ergonomics or workflow may not suit everyone'],
    wouldBuyAgain: false,
    receivedFreeOrDiscounted: true,
  }),
  Object.freeze({
    topicKey: 'strength',
    title: 'Synthetic review: strong long-term durability',
    text: 'Synthetic review scenario — not customer testimony. This optimistic hypothetical describes years of regular use, cosmetic wear, and a core function that continues to work.',
    starRating: 5,
    relationshipToProduct: 'Currently own it',
    ownershipLengthMonths: 62,
    pros: [
      'Synthetic positive: hypothetical long service',
      'Synthetic positive: function outlasts cosmetic wear',
    ],
    cons: ['Synthetic caution: finish shows age'],
    wouldBuyAgain: true,
  }),
  Object.freeze({
    topicKey: 'maintenance',
    title: 'Synthetic review: disappointing support experience',
    text: 'Synthetic review scenario — not customer testimony. In this deliberately critical hypothetical, a fault and slow support make the ownership experience worse.',
    starRating: 1,
    relationshipToProduct: 'Previously owned it',
    ownershipLengthMonths: 15,
    pros: ['Synthetic positive: initially met the basic need'],
    cons: [
      'Synthetic negative: hypothetical support delay',
      'Synthetic negative: unresolved fault',
    ],
    wouldBuyAgain: false,
  }),
  Object.freeze({
    topicKey: 'upgrade',
    title: 'Synthetic review: useful product but unnecessary upgrade',
    text: 'Synthetic review scenario — not customer testimony. Hypothetically, regular workplace use is effective, but owners of a functioning earlier model do not need to upgrade.',
    starRating: 4,
    relationshipToProduct:
      'Used it regularly through work, school or another setting',
    ownershipLengthMonths: 25,
    pros: [
      'Synthetic positive: effective regular use',
      'Synthetic positive: familiar core function',
    ],
    cons: ['Synthetic caution: limited upgrade value'],
    wouldBuyAgain: true,
    commercialRelationship: true,
  }),
]);

function plausibleOwnershipMonths(product, requestedMonths) {
  if (!Number.isInteger(product.releaseYear)) return requestedMonths;
  const monthsAvailable = Math.max(1, (2026 - product.releaseYear) * 12 + 6);
  return Math.min(requestedMonths, monthsAvailable);
}

const demoReviews = Object.freeze(
  demoProducts.flatMap((product, productIndex) =>
    syntheticReviewScenarios.map((scenario, reviewIndex) => {
      const reviewerNumber = String(reviewIndex + 1).padStart(2, '0');
      const topic = product.reviewTopics?.[scenario.topicKey];

      return Object.freeze({
        id: `${product.id}-synthetic-review-${reviewerNumber}`,
        productId: product.id,
        userId: `synthetic-demo-user-${reviewerNumber}`,
        displayName: `Synthetic reviewer ${reviewerNumber}`,
        starRating: scenario.starRating,
        relationshipToProduct: scenario.relationshipToProduct,
        ownershipLengthMonths: plausibleOwnershipMonths(
          product,
          scenario.ownershipLengthMonths
        ),
        title: `${scenario.title} — ${product.name}`,
        reviewText: `${scenario.text} The named product in this synthetic scenario is ${product.name}.${
          topic ? ` The hypothetical specifically considers ${topic}.` : ''
        }`,
        pros: [...scenario.pros],
        cons: [...scenario.cons],
        wouldBuyAgain: scenario.wouldBuyAgain,
        receivedFreeOrDiscounted:
          scenario.receivedFreeOrDiscounted === true,
        commercialRelationship: scenario.commercialRelationship === true,
        helpfulCount: 0,
        commentCount: 0,
        moderationStatus: 'visible',
        createdAt: new Date(
          Date.UTC(2026, 6, 10 - reviewIndex, 12, productIndex)
        ).toISOString(),
        updatedAt: null,
        provenance: 'synthetic_demo',
        isSynthetic: true,
        isDemoData: true,
      });
    })
  )
);

function getCommunityConfidenceLabel(reviewCount) {
  if (reviewCount < 3) return 'Insufficient community data';
  if (reviewCount < 10) return 'Early community rating';
  if (reviewCount < 50) return 'Developing community rating';
  return 'Established community rating';
}

function getReviewsForProduct(productId) {
  return demoReviews.filter(
    (review) =>
      review.productId === productId && review.moderationStatus === 'visible'
  );
}

function getCommunitySummary(productId) {
  const reviews = getReviewsForProduct(productId).filter(
    (review) =>
      review.isSynthetic !== true && review.provenance !== 'synthetic_demo'
  );
  const reviewCount = reviews.length;
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const review of reviews) distribution[review.starRating] += 1;

  const averageRating = reviewCount
    ? Math.round(
        (reviews.reduce((total, review) => total + review.starRating, 0) /
          reviewCount) *
          10
      ) / 10
    : null;
  const currentOwnerCount = reviews.filter(
    (review) => review.relationshipToProduct === 'Currently own it'
  ).length;
  const longTermOwnerCount = reviews.filter(
    (review) => review.ownershipLengthMonths >= 24
  ).length;
  const buyAgainAnswers = reviews.filter(
    (review) => typeof review.wouldBuyAgain === 'boolean'
  );
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
    isDemoData: false,
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
