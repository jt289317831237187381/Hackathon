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

test('fixtures are sufficiently broad and are labelled as fictional demo data', () => {
  assert.equal(demoProducts.length, 15);
  assert.equal(demoReviews.length, 32);
  assert.match(DEMO_DATA_NOTICE, /fictional/i);
  assert.ok(demoProducts.every((product) => product.isDemoData === true));
  assert.ok(demoReviews.every((review) => review.isDemoData === true));
});

test('community statistics are derived only from visible fixture reviews', () => {
  const summary = getCommunitySummary('auraflow-nc1');
  const reviews = demoReviews.filter(
    (review) =>
      review.productId === 'auraflow-nc1' && review.moderationStatus === 'visible'
  );
  const expectedAverage =
    Math.round(
      (reviews.reduce((total, review) => total + review.starRating, 0) /
        reviews.length) *
        10
    ) / 10;

  assert.equal(summary.reviewCount, reviews.length);
  assert.equal(summary.averageRating, expectedAverage);
  assert.equal(
    Object.values(summary.distribution).reduce((total, count) => total + count, 0),
    reviews.length
  );
});

test('catalog queries use internal fixtures and deterministic sorting', () => {
  const result = queryCatalog({
    q: 'kettle',
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
  assert.equal(result.products[0].id, 'morrow-k2');
  assert.equal('redditReviews' in result.products[0], false);
  assert.equal('puppeteer' in packageJson.dependencies, false);
});
