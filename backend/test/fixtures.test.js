const test = require('node:test');
const assert = require('node:assert/strict');
const packageJson = require('../package.json');
const {
  DEMO_DATA_NOTICE,
  demoProducts,
  demoReviews,
  getCommunitySummary,
} = require('../demo-fixtures');
const { app, queryCatalog } = require('../server');

test('the API module is importable without starting a server', () => {
  assert.equal(typeof app, 'function');
  assert.equal(typeof app.listen, 'function');
});

test('catalog products are real official records and review scenarios are synthetic', () => {
  assert.equal(demoProducts.length, 15);
  assert.equal(demoReviews.length, 120);
  assert.match(DEMO_DATA_NOTICE, /official manufacturer/i);
  assert.match(DEMO_DATA_NOTICE, /synthetic/i);
  assert.ok(
    demoProducts.every(
      (product) =>
        product.isRealProduct === true &&
        product.isDemoData === false &&
        product.provenance === 'official_manufacturer_website' &&
        product.officialUrl.startsWith('https://') &&
        product.specSourceUrl.startsWith('https://') &&
        product.imageUrl.startsWith('https://') &&
        product.imageSourceUrl.startsWith('https://') &&
        typeof product.imageAlt === 'string' &&
        product.imageAlt.length > 0
    )
  );
  assert.ok(
    demoReviews.every(
      (review) =>
        review.isDemoData === true &&
        review.isSynthetic === true &&
        review.provenance === 'synthetic_demo' &&
        /^Synthetic reviewer \d{2}$/.test(review.displayName) &&
        /synthetic/i.test(review.title) &&
        /synthetic/i.test(review.reviewText)
    )
  );
  assert.ok(
    demoProducts.every(
      (product) =>
        demoReviews.filter((review) => review.productId === product.id).length === 8
    )
  );
  assert.deepEqual(
    [...new Set(demoReviews.map((review) => review.starRating))].sort(),
    [1, 2, 3, 4, 5]
  );
  assert.ok(
    demoReviews.every(
      (review) => review.helpfulCount === 0 && review.commentCount === 0
    )
  );
  assert.ok(
    Math.max(
      ...demoReviews
        .filter((review) => review.productId === 'kitchenaid-ksm195-spearmint')
        .map((review) => review.ownershipLengthMonths)
    ) <= 6
  );
});

test('synthetic scenarios are excluded from all community statistics', () => {
  const summary = getCommunitySummary('breville-bes875');
  const syntheticScenarios = demoReviews.filter(
    (review) => review.productId === 'breville-bes875'
  );

  assert.equal(syntheticScenarios.length, 8);
  assert.equal(summary.reviewCount, 0);
  assert.equal(summary.averageRating, null);
  assert.equal(
    Object.values(summary.distribution).reduce((total, count) => total + count, 0),
    0
  );
  assert.equal(summary.currentOwnerCount, 0);
  assert.equal(summary.longTermOwnerCount, 0);
  assert.equal(summary.wouldBuyAgainPercentage, null);
  assert.equal(summary.confidenceLabel, 'Insufficient community data');
  assert.ok(
    demoProducts.every((product) => {
      const productSummary = getCommunitySummary(product.id);
      return (
        productSummary.averageRating === null &&
        productSummary.reviewCount === 0 &&
        Object.values(productSummary.distribution).every((count) => count === 0)
      );
    })
  );
});

test('catalog queries use the canonical official catalog and deterministic sorting', () => {
  const result = queryCatalog({
    q: 'breville',
    category: null,
    minPrice: undefined,
    maxPrice: undefined,
    minRating: undefined,
    minReviews: undefined,
    minLifespanMonths: undefined,
    minRepairability: undefined,
    sort: 'trending',
    limit: 20,
    offset: 0,
  });

  assert.equal(result.total, 1);
  assert.equal(result.products[0].id, 'breville-bes875');
  assert.equal(result.products[0].isRealProduct, true);
  assert.equal(
    result.products[0].imageUrl,
    'https://assets.breville.com/cdn-cgi/image/width=1300,format=auto/BES875/BES875BSS2JAN1/pdp_1300px.png?pdp'
  );
  assert.equal(result.products[0].imageSourceUrl, result.products[0].officialUrl);
  assert.match(result.products[0].imageAlt, /Breville Barista Express/);
  assert.equal(result.products[0].communityRating, null);
  assert.equal(result.products[0].reviewCount, 0);
  assert.equal('redditReviews' in result.products[0], false);
  assert.equal('puppeteer' in packageJson.dependencies, false);
});

test('catalog filters do not coerce unknown official values to zero', () => {
  const baseFilters = {
    q: '',
    category: null,
    minPrice: undefined,
    maxPrice: undefined,
    minRating: undefined,
    minReviews: undefined,
    minLifespanMonths: undefined,
    minRepairability: undefined,
    sort: 'longest-lifespan',
    limit: 20,
    offset: 0,
  };
  const unpricedSamsung = queryCatalog({
    ...baseFilters,
    q: 'samsung',
    maxPrice: 5000,
  });
  const unknownBrevilleLifespan = queryCatalog({
    ...baseFilters,
    q: 'breville',
    minLifespanMonths: 1,
  });
  const allProducts = queryCatalog(baseFilters);

  assert.equal(unpricedSamsung.total, 0);
  assert.equal(unknownBrevilleLifespan.total, 0);
  assert.equal(allProducts.total, 15);
  assert.ok(
    allProducts.products.every(
      (product) => product.expectedLifespanMonths === null
    )
  );
});
