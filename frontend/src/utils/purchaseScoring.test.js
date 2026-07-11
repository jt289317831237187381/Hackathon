import {
  GUIDANCE_DISCLAIMER,
  calculateLifespanDetails,
  calculatePersonalPurchaseScore,
  getCommunityConfidenceLabel,
  getPurchaseRecommendationLabel,
} from './purchaseScoring';

describe('getCommunityConfidenceLabel', () => {
  test.each([
    [0, 'Insufficient community data'],
    [2, 'Insufficient community data'],
    [3, 'Early community rating'],
    [9, 'Early community rating'],
    [10, 'Developing community rating'],
    [49, 'Developing community rating'],
    [50, 'Established community rating'],
    [127, 'Established community rating'],
  ])('maps %i reviews to %s', (count, expectedLabel) => {
    expect(getCommunityConfidenceLabel(count)).toBe(expectedLabel);
  });

  it('rejects invalid review counts', () => {
    expect(() => getCommunityConfidenceLabel(-1)).toThrow(
      'Review count must be a non-negative integer.'
    );
    expect(() => getCommunityConfidenceLabel(2.5)).toThrow(
      'Review count must be a non-negative integer.'
    );
  });
});

describe('calculateLifespanDetails', () => {
  it('calculates calendar age, end of life, and remaining lifespan', () => {
    const details = calculateLifespanDetails(
      {
        purchaseDate: '2024-01-01',
        expectedLifespanMonths: 24,
      },
      '2025-01-01'
    );

    expect(details).toEqual(
      expect.objectContaining({
        ageMonths: 12,
        expectedLifespanMonths: 24,
        expectedEndOfLifeDate: '2026-01-01',
        percentageUsed: 50,
        remainingLifespanPercentage: 50,
        estimatedRemainingMonths: 12,
        hasExceededExpectedLifespan: false,
      })
    );
  });

  it('prefers the user-adjusted lifespan and identifies an exceeded item', () => {
    const details = calculateLifespanDetails(
      {
        purchase_date: '2024-01-01',
        expected_lifespan: 48,
        user_adjusted_lifespan: 12,
      },
      '2025-02-01'
    );

    expect(details.expectedLifespanMonths).toBe(12);
    expect(details.expectedEndOfLifeDate).toBe('2025-01-01');
    expect(details.percentageUsed).toBeCloseTo(108.3, 1);
    expect(details.remainingLifespanPercentage).toBe(0);
    expect(details.estimatedRemainingMonths).toBe(0);
    expect(details.hasExceededExpectedLifespan).toBe(true);
  });

  it('handles end-of-month calendar dates deterministically', () => {
    const details = calculateLifespanDetails(
      {
        purchaseDate: '2024-01-31',
        expectedLifespanMonths: 1,
      },
      '2024-02-29'
    );

    expect(details.ageMonths).toBe(1);
    expect(details.expectedEndOfLifeDate).toBe('2024-02-29');
    expect(details.hasExceededExpectedLifespan).toBe(false);
  });
});

describe('getPurchaseRecommendationLabel', () => {
  test.each([
    [0, 'Probably skip'],
    [49, 'Probably skip'],
    [50, 'Consider carefully'],
    [74, 'Consider carefully'],
    [75, 'Reasonable purchase'],
    [100, 'Reasonable purchase'],
  ])('maps score %i to %s', (score, expectedLabel) => {
    expect(getPurchaseRecommendationLabel(score)).toBe(expectedLabel);
  });
});

describe('calculatePersonalPurchaseScore', () => {
  const activeHeadphones = {
    id: 'owned-1',
    name: 'Existing headphones',
    category: 'Headphones',
    purchaseDate: '2025-01-01',
    expectedLifespanMonths: 36,
    status: 'Active',
  };

  it('reproduces the prompt-style 34/100 outcome and explains it', () => {
    const result = calculatePersonalPurchaseScore({
      category: ' headphones ',
      communityRating: 4.3,
      reviewCount: 10,
      ownedProducts: [activeHeadphones],
      asOfDate: '2026-01-01',
    });

    expect(result.score).toBe(34);
    expect(result.rawScore).toBe(33.6);
    expect(result.recommendationLabel).toBe('Probably skip');
    expect(result.communityConfidenceLabel).toBe(
      'Developing community rating'
    );
    expect(result.positiveFactors.map((factor) => factor.impact)).toEqual([
      15.6,
      8,
    ]);
    expect(result.negativeFactors).toHaveLength(1);
    expect(result.negativeFactors[0]).toEqual(
      expect.objectContaining({
        code: 'active-alternative-over-half-remaining',
        impact: -45,
      })
    );
    expect(result.factors[0].text).toBe(
      '+16: Community rating is 4.3 out of 5.'
    );
    expect(result.explanation).toContain(
      'You already own Existing headphones in the same category.'
    );
    expect(result.explanation).toContain(
      'approximately 67% of its expected lifespan remaining'
    );
    expect(result.relevantOwnedProducts[0].usedInCalculation).toBe(true);
    expect(result.disclaimer).toBe(GUIDANCE_DISCLAIMER);
  });

  it('accepts the product and owned-items shape used by the frontend', () => {
    const result = calculatePersonalPurchaseScore({
      product: {
        category: 'audio',
        rating: 4.3,
        reviewCount: 127,
      },
      ownedItems: [
        {
          name: 'Current headphones',
          category: 'audio',
          purchaseDate: '2025-05-10',
          expectedLifespanMonths: 48,
          status: 'Active',
        },
      ],
      asOfDate: '2026-07-11',
    });

    expect(result.score).toBe(39);
    expect(result.recommendationLabel).toBe('Probably skip');
    expect(result.relevantOwnedProducts).toHaveLength(1);
  });

  it.each([
    ['50% remaining', '2025-07-01', 12, -25],
    ['20% remaining', '2025-09-01', 10, -25],
    ['less than 20% remaining', '2025-11-01', 12, -10],
  ])('applies the %s active-alternative band', (_label, asOfDate, expectedLifespanMonths, impact) => {
    const result = calculatePersonalPurchaseScore({
      category: 'phone',
      communityRating: 3,
      reviewCount: 3,
      ownedProducts: [
        {
          category: 'phone',
          purchaseDate: '2025-01-01',
          expectedLifespanMonths,
          status: 'active',
        },
      ],
      asOfDate,
    });

    expect(result.negativeFactors).toEqual([
      expect.objectContaining({ impact }),
    ]);
  });

  it('adds 10 when the closest alternative exceeded its lifespan', () => {
    const result = calculatePersonalPurchaseScore({
      category: 'phone',
      communityRating: 3,
      reviewCount: 3,
      ownedProducts: [
        {
          category: 'phone',
          purchaseDate: '2024-01-01',
          expectedLifespanMonths: 12,
          status: 'active',
        },
      ],
      asOfDate: '2025-01-02',
    });

    expect(result.score).toBe(65);
    expect(result.positiveFactors).toEqual([
      expect.objectContaining({
        code: 'alternative-exceeded-lifespan',
        impact: 10,
      }),
    ]);
  });

  it('stacks the damaged and exceeded-lifespan bonuses', () => {
    const result = calculatePersonalPurchaseScore({
      category: 'vacuum',
      communityRating: 3,
      reviewCount: 3,
      ownedProducts: [
        {
          category: 'vacuum',
          purchaseDate: '2020-01-01',
          expectedLifespanMonths: 24,
          status: 'damaged',
        },
      ],
      asOfDate: '2026-01-01',
    });

    expect(result.score).toBe(75);
    expect(result.recommendationLabel).toBe('Reasonable purchase');
    expect(result.positiveFactors.map((factor) => factor.code)).toEqual([
      'alternative-exceeded-lifespan',
      'alternative-damaged',
    ]);
  });

  it.each([
    ['damaged', 10, 'alternative-damaged'],
    ['disposed', 5, 'alternative-disposed-or-replaced'],
    ['replaced', 5, 'alternative-disposed-or-replaced'],
  ])('applies the %s status adjustment', (status, impact, code) => {
    const result = calculatePersonalPurchaseScore({
      product: {
        category: 'camera',
        communityRating: 3,
        reviewCount: 3,
      },
      ownedProducts: [
        {
          category: 'camera',
          purchaseDate: '2026-01-01',
          expectedLifespanMonths: 24,
          status,
        },
      ],
      asOfDate: '2026-02-01',
    });

    expect(result.positiveFactors).toContainEqual(
      expect.objectContaining({ code, impact })
    );
  });

  it('adds both review-count bonuses at 50 reviews', () => {
    const result = calculatePersonalPurchaseScore({
      category: 'bicycle',
      communityRating: 5,
      reviewCount: 50,
      ownedProducts: [],
      asOfDate: '2026-01-01',
    });

    expect(result.score).toBe(92);
    expect(result.positiveFactors.map((factor) => factor.impact)).toEqual([
      24,
      8,
      5,
    ]);
    expect(result.communityConfidenceLabel).toBe(
      'Established community rating'
    );
  });

  it('uses a neutral rating contribution when no reviews exist', () => {
    const result = calculatePersonalPurchaseScore({
      category: 'toaster',
      communityRating: null,
      reviewCount: 0,
      ownedProducts: [],
      asOfDate: '2026-01-01',
    });

    expect(result.score).toBe(40);
    expect(result.negativeFactors).toEqual([
      expect.objectContaining({
        code: 'insufficient-community-data',
        impact: -15,
      }),
    ]);
    expect(result.dataLimitations).toContainEqual(
      expect.objectContaining({
        message: 'No community rating is available yet.',
      })
    );
  });

  it('clamps scores to the inclusive 0–100 range', () => {
    const lowResult = calculatePersonalPurchaseScore({
      category: 'headphones',
      communityRating: 1,
      reviewCount: 2,
      ownedProducts: [activeHeadphones],
      asOfDate: '2025-02-01',
    });

    expect(lowResult.rawScore).toBe(-29);
    expect(lowResult.score).toBe(0);
  });

  it('deterministically chooses the active item with most lifespan remaining', () => {
    const ownedProducts = [
      {
        id: 'older',
        category: 'laptop',
        purchaseDate: '2023-01-01',
        expectedLifespanMonths: 48,
        status: 'active',
      },
      {
        id: 'newer',
        category: 'Laptop',
        purchaseDate: '2025-01-01',
        expectedLifespanMonths: 48,
        status: 'ACTIVE',
      },
      {
        id: 'irrelevant',
        category: 'tablet',
        purchaseDate: '2025-01-01',
        expectedLifespanMonths: 48,
        status: 'active',
      },
    ];

    const result = calculatePersonalPurchaseScore({
      category: ' laptop ',
      communityRating: 3,
      reviewCount: 3,
      ownedProducts,
      asOfDate: '2026-01-01',
    });

    expect(result.relevantOwnedProducts).toHaveLength(2);
    expect(
      result.relevantOwnedProducts.find((item) => item.usedInCalculation).id
    ).toBe('newer');
    expect(ownedProducts[1]).not.toHaveProperty('usedInCalculation');
  });

  it('reports incomplete ownership data without silently inventing lifespan', () => {
    const result = calculatePersonalPurchaseScore({
      category: 'watch',
      communityRating: 3,
      reviewCount: 3,
      ownedProducts: [{ id: 1, name: 'Old watch', category: 'watch' }],
      asOfDate: '2026-01-01',
    });

    expect(result.score).toBe(55);
    expect(result.relevantOwnedProducts[0].lifespan).toBeNull();
    expect(result.dataLimitations[0]).toEqual(
      expect.objectContaining({
        productId: 1,
        message: 'Purchase date is required to calculate lifespan.',
      })
    );
    expect(result.explanation).toContain(
      'remaining lifespan could not be estimated'
    );
  });

  it('validates inputs that would otherwise create a misleading score', () => {
    expect(() =>
      calculatePersonalPurchaseScore({
        category: 'phone',
        communityRating: 6,
        reviewCount: 2,
      })
    ).toThrow('Community rating must be between 1 and 5.');

    expect(() =>
      calculatePersonalPurchaseScore({
        category: 'phone',
        reviewCount: 2,
      })
    ).toThrow('A community rating is required when reviews are present.');
  });
});
