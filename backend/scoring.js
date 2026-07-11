const BASE_SCORE = 55;
const GUIDANCE_DISCLAIMER =
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

function normalizeCategory(category) {
  return String(category || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeStatus(status) {
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
  const finalDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate();
  result.setUTCDate(Math.min(originalDay, finalDay));
  return result;
}

function addCalendarMonths(date, numberOfMonths) {
  const wholeMonths = Math.trunc(numberOfMonths);
  const partialMonth = numberOfMonths - wholeMonths;
  const wholeMonthDate = addWholeCalendarMonths(date, wholeMonths);

  if (partialMonth === 0) return wholeMonthDate;

  const nextMonthDate = addWholeCalendarMonths(date, wholeMonths + 1);
  return new Date(
    wholeMonthDate.getTime() +
      (nextMonthDate.getTime() - wholeMonthDate.getTime()) * partialMonth
  );
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

function resolveExpectedLifespanMonths(ownedItem) {
  const value =
    ownedItem.userAdjustedLifespanMonths ?? ownedItem.expectedLifespanMonths;
  const lifespan = Number(value);

  if (!Number.isFinite(lifespan) || lifespan <= 0) {
    throw new TypeError('Expected lifespan must be a positive number of months.');
  }

  return lifespan;
}

function calculateLifespanDetails(ownedItem, asOfDate = new Date()) {
  if (!ownedItem || typeof ownedItem !== 'object' || Array.isArray(ownedItem)) {
    throw new TypeError('An owned item is required.');
  }

  if (!ownedItem.purchaseDate) {
    throw new TypeError('Purchase date is required to calculate lifespan.');
  }

  const purchaseDate = parseDate(ownedItem.purchaseDate, 'Purchase date');
  const calculationDate = parseDate(asOfDate, 'Calculation date');
  const expectedLifespanMonths = resolveExpectedLifespanMonths(ownedItem);
  const ageMonths = calendarMonthsBetween(purchaseDate, calculationDate);
  const rawPercentageUsed = (ageMonths / expectedLifespanMonths) * 100;
  const rawRemainingLifespanPercentage = 100 - rawPercentageUsed;
  const expectedEndOfLifeDate = addCalendarMonths(
    purchaseDate,
    expectedLifespanMonths
  );

  return {
    ageMonths: round(ageMonths, 1),
    expectedLifespanMonths: round(expectedLifespanMonths, 1),
    expectedEndOfLifeDate: expectedEndOfLifeDate.toISOString().slice(0, 10),
    percentageUsed: round(Math.max(0, rawPercentageUsed), 1),
    remainingLifespanPercentage: round(
      Math.max(0, rawRemainingLifespanPercentage),
      1
    ),
    estimatedRemainingMonths: round(
      Math.max(0, expectedLifespanMonths - ageMonths),
      1
    ),
    hasExceededExpectedLifespan:
      calculationDate.getTime() > expectedEndOfLifeDate.getTime(),
    rawRemainingLifespanPercentage,
  };
}

function getCommunityConfidenceLabel(reviewCount) {
  if (!Number.isInteger(reviewCount) || reviewCount < 0) {
    throw new TypeError('Review count must be a non-negative integer.');
  }

  if (reviewCount < 3) return 'Insufficient community data';
  if (reviewCount < 10) return 'Early community rating';
  if (reviewCount < 50) return 'Developing community rating';
  return 'Established community rating';
}

function getRecommendationLabel(score) {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new TypeError('Purchase score must be between 0 and 100.');
  }

  if (score >= 75) return 'Reasonable purchase';
  if (score >= 50) return 'Consider carefully';
  return 'Probably skip';
}

function createFactor(code, impact, message) {
  const normalizedImpact = round(impact, 2);
  const roundedImpact = Math.round(normalizedImpact);
  const prefix = roundedImpact > 0 ? '+' : roundedImpact < 0 ? '−' : '';

  return {
    code,
    impact: normalizedImpact,
    displayImpact: roundedImpact,
    message,
    text: `${prefix}${Math.abs(roundedImpact)}: ${message}`,
  };
}

function annotateRelevantItems(categoryId, ownedItems, asOfDate) {
  const targetCategory = normalizeCategory(categoryId);

  return ownedItems
    .filter((item) => normalizeCategory(item.categoryId) === targetCategory)
    .map((item, originalIndex) => {
      let lifespan = null;
      let lifespanDataError = null;

      try {
        lifespan = calculateLifespanDetails(item, asOfDate);
      } catch (error) {
        lifespanDataError = error.message;
      }

      const normalizedStatus = normalizeStatus(item.status);
      const normalizedCondition = normalizeStatus(item.condition || '');
      const purchaseTimestamp = item.purchaseDate
        ? new Date(item.purchaseDate).getTime()
        : Number.NEGATIVE_INFINITY;

      return {
        ...item,
        lifespan,
        lifespanDataError,
        normalizedStatus,
        isDamaged:
          normalizedStatus === 'damaged' || normalizedCondition === 'damaged',
        _originalIndex: originalIndex,
        _purchaseTimestamp: Number.isNaN(purchaseTimestamp)
          ? Number.NEGATIVE_INFINITY
          : purchaseTimestamp,
      };
    });
}

function compareAlternatives(left, right) {
  const statusDifference =
    (STATUS_PRIORITY[right.normalizedStatus] || 0) -
    (STATUS_PRIORITY[left.normalizedStatus] || 0);
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

function stripInternalFields(item, closestAlternative) {
  const { _originalIndex, _purchaseTimestamp, ...publicItem } = item;
  return { ...publicItem, usedInCalculation: item === closestAlternative };
}

function buildOwnershipExplanation(categoryLabel, closestAlternative) {
  if (!closestAlternative) {
    return `You do not have a recorded product in the ${categoryLabel} category.`;
  }

  const productName = closestAlternative.productName || 'An item you own';
  const { lifespan, normalizedStatus } = closestAlternative;

  if (!lifespan) {
    return `${productName} is recorded in the same category and is marked ${normalizedStatus}, but its remaining lifespan could not be estimated.`;
  }

  if (lifespan.hasExceededExpectedLifespan) {
    return `${productName} is recorded in the same category. It has exceeded its expected ${Math.round(
      lifespan.expectedLifespanMonths
    )}-month lifespan and is marked ${normalizedStatus}.`;
  }

  return `You already own ${productName} in the same category. It was purchased approximately ${Math.round(
    lifespan.ageMonths
  )} months ago and is estimated to have approximately ${Math.round(
    lifespan.remainingLifespanPercentage
  )}% of its expected lifespan remaining. Its status is ${normalizedStatus}.`;
}

function calculatePersonalPurchaseScore({
  product,
  communityRating,
  reviewCount,
  ownedItems = [],
  asOfDate = new Date(),
}) {
  if (!product || typeof product !== 'object' || !product.categoryId) {
    throw new TypeError('A product with a category is required.');
  }
  if (!Array.isArray(ownedItems)) {
    throw new TypeError('Owned items must be an array.');
  }
  if (!Number.isInteger(reviewCount) || reviewCount < 0) {
    throw new TypeError('Review count must be a non-negative integer.');
  }
  if (
    communityRating !== null &&
    (!Number.isFinite(communityRating) || communityRating < 1 || communityRating > 5)
  ) {
    throw new TypeError('Community rating must be null or between 1 and 5.');
  }
  if (reviewCount > 0 && communityRating === null) {
    throw new TypeError('A community rating is required when reviews are present.');
  }
  parseDate(asOfDate, 'Calculation date');

  const annotatedItems = annotateRelevantItems(
    product.categoryId,
    ownedItems,
    asOfDate
  );
  const closestAlternative = [...annotatedItems].sort(compareAlternatives)[0] || null;
  const factors = [];
  const dataLimitations = annotatedItems
    .filter((item) => item.lifespanDataError)
    .map((item) => ({
      ownedItemId: item.id || null,
      productName: item.productName || 'Owned item',
      message: item.lifespanDataError,
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
      ownedItemId: null,
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
    const { lifespan, normalizedStatus } = closestAlternative;
    const remaining = lifespan.rawRemainingLifespanPercentage;
    const isActive = normalizedStatus === 'active';

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
    ['disposed', 'replaced'].includes(closestAlternative.normalizedStatus)
  ) {
    factors.push(
      createFactor(
        'alternative-disposed-or-replaced',
        5,
        `The closest owned alternative is marked ${closestAlternative.normalizedStatus}.`
      )
    );
    rawScore += 5;
  }

  const score = Math.round(Math.min(100, Math.max(0, rawScore)));
  const relevantOwnedItems = annotatedItems.map((item) =>
    stripInternalFields(item, closestAlternative)
  );

  return {
    score,
    rawScore: round(rawScore, 2),
    baseScore: BASE_SCORE,
    recommendationLabel: getRecommendationLabel(score),
    communityConfidenceLabel: getCommunityConfidenceLabel(reviewCount),
    positiveFactors: factors.filter((factor) => factor.impact > 0),
    negativeFactors: factors.filter((factor) => factor.impact < 0),
    factors,
    relevantOwnedItems,
    explanation: buildOwnershipExplanation(
      product.categoryLabel || product.categoryId,
      closestAlternative
    ),
    dataLimitations,
    disclaimer: GUIDANCE_DISCLAIMER,
  };
}

module.exports = {
  BASE_SCORE,
  GUIDANCE_DISCLAIMER,
  calculateLifespanDetails,
  calculatePersonalPurchaseScore,
  getCommunityConfidenceLabel,
  getRecommendationLabel,
};
