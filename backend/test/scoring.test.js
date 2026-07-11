const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateLifespanDetails,
  calculatePersonalPurchaseScore,
  getCommunityConfidenceLabel,
} = require('../scoring');

const headphones = {
  id: 'demo-headphones',
  name: 'Demo headphones',
  categoryId: 'audio',
  categoryLabel: 'Audio',
};

test('community confidence labels use the prompt thresholds', () => {
  assert.equal(getCommunityConfidenceLabel(2), 'Insufficient community data');
  assert.equal(getCommunityConfidenceLabel(3), 'Early community rating');
  assert.equal(getCommunityConfidenceLabel(9), 'Early community rating');
  assert.equal(getCommunityConfidenceLabel(10), 'Developing community rating');
  assert.equal(getCommunityConfidenceLabel(49), 'Developing community rating');
  assert.equal(getCommunityConfidenceLabel(50), 'Established community rating');
});

test('lifespan calculations use UTC calendar months and user overrides', () => {
  const result = calculateLifespanDetails(
    {
      purchaseDate: '2024-01-31',
      expectedLifespanMonths: 24,
      userAdjustedLifespanMonths: 1,
    },
    new Date('2024-02-29T00:00:00.000Z')
  );

  assert.equal(result.ageMonths, 1);
  assert.equal(result.expectedLifespanMonths, 1);
  assert.equal(result.expectedEndOfLifeDate, '2024-02-29');
  assert.equal(result.remainingLifespanPercentage, 0);
  assert.equal(result.hasExceededExpectedLifespan, false);
});

test('purchase score applies rating and review-count factors exactly', () => {
  const result = calculatePersonalPurchaseScore({
    product: headphones,
    communityRating: 4.3,
    reviewCount: 127,
    ownedItems: [],
    asOfDate: new Date('2026-01-01T00:00:00.000Z'),
  });

  assert.equal(result.rawScore, 83.6);
  assert.equal(result.score, 84);
  assert.equal(result.recommendationLabel, 'Reasonable purchase');
  assert.match(result.explanation, /do not have a recorded product/i);
  assert.match(result.disclaimer, /not financial advice/i);
});

test('an active same-category item with over half its lifespan remaining subtracts 45', () => {
  const result = calculatePersonalPurchaseScore({
    product: headphones,
    communityRating: 4.3,
    reviewCount: 127,
    ownedItems: [
      {
        id: 1,
        productName: 'Existing headphones',
        categoryId: 'audio',
        purchaseDate: '2025-01-01',
        expectedLifespanMonths: 48,
        condition: 'Good',
        status: 'Active',
      },
    ],
    asOfDate: new Date('2026-01-01T00:00:00.000Z'),
  });

  assert.equal(result.rawScore, 38.6);
  assert.equal(result.score, 39);
  assert.ok(
    result.negativeFactors.some(
      (factor) => factor.code === 'active-alternative-over-half-remaining'
    )
  );
  assert.equal(result.relevantOwnedItems[0].usedInCalculation, true);
});

test('score clamps at both zero and one hundred', () => {
  const low = calculatePersonalPurchaseScore({
    product: headphones,
    communityRating: 1,
    reviewCount: 2,
    ownedItems: [
      {
        id: 1,
        productName: 'New headphones',
        categoryId: 'audio',
        purchaseDate: '2025-12-01',
        expectedLifespanMonths: 120,
        status: 'Active',
      },
    ],
    asOfDate: new Date('2026-01-01T00:00:00.000Z'),
  });
  const high = calculatePersonalPurchaseScore({
    product: headphones,
    communityRating: 5,
    reviewCount: 50,
    ownedItems: [
      {
        id: 2,
        productName: 'Damaged old headphones',
        categoryId: 'audio',
        purchaseDate: '2020-01-01',
        expectedLifespanMonths: 12,
        condition: 'Damaged',
        status: 'Damaged',
      },
    ],
    asOfDate: new Date('2026-01-01T00:00:00.000Z'),
  });

  assert.equal(low.score, 0);
  assert.ok(low.rawScore < 0);
  assert.equal(high.score, 100);
  assert.ok(high.rawScore > 100);
});
