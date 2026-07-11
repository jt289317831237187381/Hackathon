const BASE_SCORE = 55;

export const GUIDANCE_DISCLAIMER =
  'This personal purchase score is guidance, not financial advice.';

const STATUS_PRIORITY = {
  active: 5,
  'being repaired': 4,
  damaged: 3,
  replaced: 2,
  disposed: 2,
  sold: 1,
  donated: 1,
  recycled: 1,
};

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function round(value, decimalPlaces = 1) {
  const multiplier = 10 ** decimalPlaces;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function parseDate(value, fieldName) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`${fieldName} must be a valid date.`);
  }

  return date;
}

function normaliseCategory(category) {
  return String(category || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normaliseStatus(status) {
  return String(status || 'active')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function addWholeCalendarMonths(date, numberOfMonths) {
  const result = new Date(date.getTime());
  const originalDay = result.getUTCDate();

  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + numberOfMonths);

  const lastDayOfTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate();

  result.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
  return result;
}

function addCalendarMonths(date, numberOfMonths) {
  const wholeMonths = Math.trunc(numberOfMonths);
  const partialMonth = numberOfMonths - wholeMonths;
  const wholeMonthDate = addWholeCalendarMonths(date, wholeMonths);

  if (partialMonth === 0) return wholeMonthDate;

  const nextMonthDate = addWholeCalendarMonths(date, wholeMonths + 1);
  const partialMonthMilliseconds =
    (nextMonthDate.getTime() - wholeMonthDate.getTime()) * partialMonth;

  return new Date(wholeMonthDate.getTime() + partialMonthMilliseconds);
}

function calendarMonthsBetween(startDate, endDate) {
  if (endDate.getTime() <= startDate.getTime()) return 0;

  let wholeMonths =
    (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
    endDate.getUTCMonth() -
    startDate.getUTCMonth();
  let anchorDate = addWholeCalendarMonths(startDate, wholeMonths);

  if (anchorDate.getTime() > endDate.getTime()) {
    wholeMonths -= 1;
    anchorDate = addWholeCalendarMonths(startDate, wholeMonths);
  }

  const nextAnchorDate = addWholeCalendarMonths(startDate, wholeMonths + 1);
  const partialMonth =
    (endDate.getTime() - anchorDate.getTime()) /
    (nextAnchorDate.getTime() - anchorDate.getTime());

  return wholeMonths + partialMonth;
}

function resolveExpectedLifespanMonths(ownedProduct) {
  const adjustedMonths = firstDefined(
    ownedProduct.userAdjustedLifespanMonths,
    ownedProduct.user_adjusted_lifespan_months,
    ownedProduct.userAdjustedLifespan,
    ownedProduct.user_adjusted_lifespan,
    ownedProduct.adjustedLifespanMonths,
    ownedProduct.adjusted_lifespan_months
  );
  const expectedMonths = firstDefined(
    ownedProduct.expectedLifespanMonths,
    ownedProduct.expected_lifespan_months,
    ownedProduct.expectedLifespan,
    ownedProduct.expected_lifespan
  );
  const adjustedYears = firstDefined(
    ownedProduct.userAdjustedLifespanYears,
    ownedProduct.user_adjusted_lifespan_years
  );
  const expectedYears = firstDefined(
    ownedProduct.expectedLifespanYears,
    ownedProduct.expected_lifespan_years
  );
  const lifespanMonths = firstDefined(
    adjustedMonths,
    expectedMonths,
    adjustedYears === undefined ? undefined : Number(adjustedYears) * 12,
    expectedYears === undefined ? undefined : Number(expectedYears) * 12
  );
  const numericLifespan = Number(lifespanMonths);

  if (!Number.isFinite(numericLifespan) || numericLifespan <= 0) {
    throw new TypeError('Expected lifespan must be a positive number of months.');
  }

  return numericLifespan;
}

/**
 * Calculates ownership age and lifespan progress using UTC calendar months.
 * A user-adjusted lifespan takes precedence over the product default.
 */
export function calculateLifespanDetails(ownedProduct, asOfDate = new Date()) {
  if (!ownedProduct || typeof ownedProduct !== 'object') {
    throw new TypeError('An owned product is required.');
  }

  const purchaseDateValue = firstDefined(
    ownedProduct.purchaseDate,
    ownedProduct.purchase_date,
    ownedProduct.acquiredAt,
    ownedProduct.acquired_at
  );

  if (purchaseDateValue === undefined) {
    throw new TypeError('Purchase date is required to calculate lifespan.');
  }

  const purchaseDate = parseDate(purchaseDateValue, 'Purchase date');
  const calculationDate = parseDate(asOfDate, 'Calculation date');
  const expectedLifespanMonths = resolveExpectedLifespanMonths(ownedProduct);
  const ageMonths = calendarMonthsBetween(purchaseDate, calculationDate);
  const rawPercentageUsed = (ageMonths / expectedLifespanMonths) * 100;
  const rawRemainingPercentage = 100 - rawPercentageUsed;
  const expectedEndOfLife = addCalendarMonths(purchaseDate, expectedLifespanMonths);

  return {
    ageMonths: round(ageMonths, 1),
    expectedLifespanMonths: round(expectedLifespanMonths, 1),
    expectedEndOfLifeDate: expectedEndOfLife.toISOString().slice(0, 10),
    percentageUsed: round(Math.max(0, rawPercentageUsed), 1),
    remainingLifespanPercentage: round(
      Math.max(0, rawRemainingPercentage),
      1
    ),
    estimatedRemainingMonths: round(
      Math.max(0, expectedLifespanMonths - ageMonths),
      1
    ),
    hasExceededExpectedLifespan:
      calculationDate.getTime() > expectedEndOfLife.getTime(),
    // Kept for exact threshold comparisons before display rounding.
    rawRemainingLifespanPercentage: rawRemainingPercentage,
  };
}

function getReviewCount(value) {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue < 0) {
    throw new TypeError('Review count must be a non-negative integer.');
  }

  return numericValue;
}

/** Returns the prompt-defined label without changing the community average. */
export function getCommunityConfidenceLabel(reviewCount) {
  const count = getReviewCount(reviewCount);

  if (count < 3) return 'Insufficient community data';
  if (count < 10) return 'Early community rating';
  if (count < 50) return 'Developing community rating';
  return 'Established community rating';
}

export function getPurchaseRecommendationLabel(score) {
  const numericScore = Number(score);

  if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 100) {
    throw new TypeError('Purchase score must be between 0 and 100.');
  }

  if (numericScore >= 75) return 'Reasonable purchase';
  if (numericScore >= 50) return 'Consider carefully';
  return 'Probably skip';
}

function tryCalculateLifespanDetails(ownedProduct, asOfDate) {
  try {
    return { details: calculateLifespanDetails(ownedProduct, asOfDate), error: null };
  } catch (error) {
    return { details: null, error: error.message };
  }
}

function annotateRelevantProducts(category, ownedProducts, asOfDate) {
  const normalisedTargetCategory = normaliseCategory(category);

  return ownedProducts
    .filter(
      (ownedProduct) =>
        normaliseCategory(
          firstDefined(
            ownedProduct.category,
            ownedProduct.productCategory,
            ownedProduct.product_category
          )
        ) === normalisedTargetCategory
    )
    .map((ownedProduct, index) => {
      const lifespanResult = tryCalculateLifespanDetails(ownedProduct, asOfDate);
      const status = normaliseStatus(ownedProduct.status);
      const condition = normaliseStatus(ownedProduct.condition || '');
      const purchaseDate = firstDefined(
        ownedProduct.purchaseDate,
        ownedProduct.purchase_date,
        ownedProduct.acquiredAt,
        ownedProduct.acquired_at
      );
      const purchaseTimestamp = purchaseDate
        ? new Date(purchaseDate).getTime()
        : Number.NEGATIVE_INFINITY;

      return {
        ...ownedProduct,
        normalisedStatus: status,
        lifespan: lifespanResult.details,
        lifespanDataError: lifespanResult.error,
        isDamaged: status === 'damaged' || condition === 'damaged',
        _originalIndex: index,
        _purchaseTimestamp: Number.isNaN(purchaseTimestamp)
          ? Number.NEGATIVE_INFINITY
          : purchaseTimestamp,
      };
    });
}

function compareAlternatives(left, right) {
  const statusDifference =
    (STATUS_PRIORITY[right.normalisedStatus] || 0) -
    (STATUS_PRIORITY[left.normalisedStatus] || 0);

  if (statusDifference !== 0) return statusDifference;

  const leftRemaining =
    left.lifespan?.rawRemainingLifespanPercentage ?? Number.NEGATIVE_INFINITY;
  const rightRemaining =
    right.lifespan?.rawRemainingLifespanPercentage ?? Number.NEGATIVE_INFINITY;

  if (leftRemaining !== rightRemaining) return rightRemaining - leftRemaining;
  if (left._purchaseTimestamp !== right._purchaseTimestamp) {
    return right._purchaseTimestamp - left._purchaseTimestamp;
  }

  return left._originalIndex - right._originalIndex;
}

function removeInternalFields(ownedProduct, closestAlternative) {
  const {
    _originalIndex,
    _purchaseTimestamp,
    ...publicOwnedProduct
  } = ownedProduct;

  return {
    ...publicOwnedProduct,
    usedInCalculation: ownedProduct === closestAlternative,
  };
}

function createFactor(code, impact, message) {
  const normalisedImpact = round(impact, 2);
  const roundedImpact = Math.round(normalisedImpact);
  const impactPrefix = roundedImpact > 0 ? '+' : roundedImpact < 0 ? '−' : '';

  return {
    code,
    impact: normalisedImpact,
    displayImpact: roundedImpact,
    message,
    text: `${impactPrefix}${Math.abs(roundedImpact)}: ${message}`,
  };
}

function formatAge(ageMonths) {
  const roundedMonths = Math.round(ageMonths);

  if (roundedMonths < 1) return 'less than one month';
  if (roundedMonths === 1) return '1 month';
  return `${roundedMonths} months`;
}

function buildOwnershipExplanation(category, closestAlternative) {
  if (!closestAlternative) {
    return `You do not have a recorded product in the ${category} category.`;
  }

  const productName = firstDefined(
    closestAlternative.name,
    closestAlternative.productName,
    closestAlternative.product_name,
    'A product you own'
  );
  const status = closestAlternative.normalisedStatus;
  const { lifespan } = closestAlternative;

  if (!lifespan) {
    return `${productName} is recorded in the same category and is marked ${status}, but its remaining lifespan could not be estimated.`;
  }

  if (lifespan.hasExceededExpectedLifespan) {
    return `${productName} is recorded in the same category. It has exceeded its expected ${Math.round(
      lifespan.expectedLifespanMonths
    )}-month lifespan and is marked ${status}.`;
  }

  return `You already own ${productName} in the same category. It was purchased ${formatAge(
    lifespan.ageMonths
  )} ago and is estimated to have approximately ${Math.round(
    lifespan.remainingLifespanPercentage
  )}% of its expected lifespan remaining. Its status is ${status}.`;
}

function getProposedProductValues(input) {
  const proposedProduct = input.product || input.proposedProduct || {};
  const reviews = firstDefined(
    input.communityReviews,
    proposedProduct.communityReviews,
    proposedProduct.community_reviews
  );
  const reviewCountValue = firstDefined(
    input.reviewCount,
    input.communityReviewCount,
    proposedProduct.reviewCount,
    proposedProduct.review_count,
    proposedProduct.communityReviewCount,
    proposedProduct.community_review_count,
    Array.isArray(reviews) ? reviews.length : undefined,
    0
  );

  return {
    category: firstDefined(
      input.category,
      input.productCategory,
      proposedProduct.category,
      proposedProduct.productCategory,
      proposedProduct.product_category
    ),
    communityRating: firstDefined(
      input.communityRating,
      proposedProduct.communityRating,
      proposedProduct.community_rating,
      proposedProduct.averageRating,
      proposedProduct.average_rating,
      proposedProduct.rating
    ),
    reviewCount: getReviewCount(reviewCountValue),
  };
}

/**
 * Applies the prompt's deterministic personal purchase formula.
 *
 * Accepted input shape:
 * {
 *   category, communityRating, reviewCount, ownedProducts, asOfDate
 * }
 * The three product values may instead be supplied under `product`.
 */
export function calculatePersonalPurchaseScore(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Purchase score input must be an object.');
  }

  const { category, communityRating: ratingValue, reviewCount } =
    getProposedProductValues(input);
  const displayCategory = String(category || '').trim();

  if (!displayCategory) {
    throw new TypeError('Product category is required.');
  }

  const ownedProducts =
    input.ownedProducts ||
    input.owned_products ||
    input.ownedItems ||
    input.owned_items ||
    input.inventory ||
    [];

  if (!Array.isArray(ownedProducts)) {
    throw new TypeError('Owned products must be an array.');
  }

  let communityRating = null;
  if (ratingValue !== undefined && ratingValue !== null && ratingValue !== '') {
    communityRating = Number(ratingValue);
    const ratingCanBeAbsent = reviewCount === 0 && communityRating === 0;

    if (
      !ratingCanBeAbsent &&
      (!Number.isFinite(communityRating) ||
        communityRating < 1 ||
        communityRating > 5)
    ) {
      throw new TypeError('Community rating must be between 1 and 5.');
    }

    if (ratingCanBeAbsent) communityRating = null;
  }

  if (reviewCount > 0 && communityRating === null) {
    throw new TypeError('A community rating is required when reviews are present.');
  }

  const asOfDate = input.asOfDate || input.as_of_date || new Date();
  // Validate once even when no owned products match.
  parseDate(asOfDate, 'Calculation date');

  const annotatedProducts = annotateRelevantProducts(
    displayCategory,
    ownedProducts,
    asOfDate
  );
  const rankedAlternatives = [...annotatedProducts].sort(compareAlternatives);
  const closestAlternative = rankedAlternatives[0] || null;
  const factors = [];
  const dataLimitations = annotatedProducts
    .filter((ownedProduct) => ownedProduct.lifespanDataError)
    .map((ownedProduct) => ({
      productId: firstDefined(ownedProduct.id, ownedProduct.productId, null),
      productName: firstDefined(
        ownedProduct.name,
        ownedProduct.productName,
        'Owned product'
      ),
      message: ownedProduct.lifespanDataError,
    }));

  let rawScore = BASE_SCORE;

  if (communityRating !== null) {
    const ratingImpact = (communityRating - 3) * 12;
    factors.push(
      createFactor(
        'community-rating',
        ratingImpact,
        `Community rating is ${round(communityRating, 1)} out of 5.`
      )
    );
    rawScore += ratingImpact;
  } else {
    dataLimitations.push({
      productId: null,
      productName: null,
      message: 'No community rating is available yet.',
    });
  }

  if (reviewCount >= 10) {
    factors.push(
      createFactor(
        'at-least-10-reviews',
        8,
        'The product has at least 10 community reviews.'
      )
    );
    rawScore += 8;
  }

  if (reviewCount >= 50) {
    factors.push(
      createFactor(
        'at-least-50-reviews',
        5,
        'The product has at least 50 community reviews.'
      )
    );
    rawScore += 5;
  }

  if (reviewCount < 3) {
    factors.push(
      createFactor(
        'insufficient-community-data',
        -15,
        'There are fewer than 3 community reviews.'
      )
    );
    rawScore -= 15;
  }

  if (closestAlternative?.lifespan) {
    const { lifespan, normalisedStatus } = closestAlternative;
    const remaining = lifespan.rawRemainingLifespanPercentage;
    const isActive = normalisedStatus === 'active';

    if (lifespan.hasExceededExpectedLifespan) {
      factors.push(
        createFactor(
          'alternative-exceeded-lifespan',
          10,
          'The closest owned alternative has exceeded its expected lifespan.'
        )
      );
      rawScore += 10;
    } else if (isActive && remaining > 50) {
      factors.push(
        createFactor(
          'active-alternative-over-half-remaining',
          -45,
          'You own an active product in the same category with more than 50% of its expected lifespan remaining.'
        )
      );
      rawScore -= 45;
    } else if (remaining >= 20 && remaining <= 50) {
      factors.push(
        createFactor(
          'alternative-20-to-50-percent-remaining',
          -25,
          'The closest owned alternative has between 20% and 50% of its expected lifespan remaining.'
        )
      );
      rawScore -= 25;
    } else if (isActive && remaining < 20) {
      factors.push(
        createFactor(
          'active-alternative-under-20-percent-remaining',
          -10,
          'The closest owned alternative is active with less than 20% of its expected lifespan remaining.'
        )
      );
      rawScore -= 10;
    }
  }

  if (closestAlternative?.isDamaged) {
    factors.push(
      createFactor(
        'alternative-damaged',
        10,
        'The closest owned alternative is marked damaged.'
      )
    );
    rawScore += 10;
  }

  if (
    closestAlternative &&
    ['disposed', 'replaced'].includes(closestAlternative.normalisedStatus)
  ) {
    factors.push(
      createFactor(
        'alternative-disposed-or-replaced',
        5,
        `The closest owned alternative is marked ${closestAlternative.normalisedStatus}.`
      )
    );
    rawScore += 5;
  }

  const clampedRawScore = Math.min(100, Math.max(0, rawScore));
  const score = Math.round(clampedRawScore);
  const relevantOwnedProducts = annotatedProducts.map((ownedProduct) =>
    removeInternalFields(ownedProduct, closestAlternative)
  );

  return {
    score,
    rawScore: round(rawScore, 2),
    baseScore: BASE_SCORE,
    recommendationLabel: getPurchaseRecommendationLabel(score),
    communityConfidenceLabel: getCommunityConfidenceLabel(reviewCount),
    positiveFactors: factors.filter((factor) => factor.impact > 0),
    negativeFactors: factors.filter((factor) => factor.impact < 0),
    neutralFactors: factors.filter((factor) => factor.impact === 0),
    factors,
    relevantOwnedProducts,
    explanation: buildOwnershipExplanation(
      displayCategory,
      closestAlternative
    ),
    dataLimitations,
    disclaimer: GUIDANCE_DISCLAIMER,
  };
}
