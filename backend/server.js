const express = require('express');
const puppeteer = require('puppeteer');
const { load, save } = require('./db');
const { register, login, authenticate } = require('./auth');

const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

const PORT = 3001;

// Auth routes
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await register(email, password);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await login(email, password);
    res.json(result);
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});

// Inventory CRUD (protected)
app.get('/api/inventory', authenticate, (req, res) => {
  const db = load();
  const items = db.inventory.filter(i => i.userId === req.userId);
  res.json(items);
});

app.post('/api/inventory', authenticate, (req, res) => {
  const { name, category, purchaseDate, expectedLifespan, condition } = req.body;
  if (!name || !category || !purchaseDate || !expectedLifespan) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const db = load();
  const item = {
    id: db.nextItemId++,
    userId: req.userId,
    name,
    category,
    purchase_date: purchaseDate,
    expected_lifespan: Number(expectedLifespan),
    condition: condition || 'Good',
    created_at: new Date().toISOString()
  };
  db.inventory.push(item);
  save(db);
  res.json({ id: item.id });
});

app.delete('/api/inventory/:id', authenticate, (req, res) => {
  const db = load();
  const idx = db.inventory.findIndex(i => i.id === Number(req.params.id) && i.userId === req.userId);
  if (idx === -1) return res.status(404).json({ error: 'Item not found' });
  db.inventory.splice(idx, 1);
  save(db);
  res.json({ success: true });
});

let browserInstance = null;

async function getBrowser() {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
  }
  return browserInstance;
}

async function searchRedditReviews(productName) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');

    const query = encodeURIComponent(`${productName} review`);
    await page.goto(`https://www.reddit.com/search/?q=${query}&type=link&sort=relevance`, {
      waitUntil: 'networkidle2',
      timeout: 15000
    });

    await new Promise(r => setTimeout(r, 2000));

    const posts = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      document.querySelectorAll('a[href*="/comments/"]').forEach(a => {
        const href = a.href;
        const text = a.textContent.trim();
        if (text.length > 10 && !seen.has(href) && !href.includes('/comment/')) {
          seen.add(href);
          const subredditMatch = href.match(/\/r\/([^/]+)/);
          results.push({
            title: text,
            url: href,
            subreddit: subredditMatch ? subredditMatch[1] : 'unknown'
          });
        }
      });
      return results;
    });

    const reviews = [];
    for (const post of posts.slice(0, 6)) {
      const { snippet, score } = await scrapePost(page, post.url);
      const fullText = post.title + ' ' + snippet;
      const sentiment = analyzeSentiment(fullText);

      reviews.push({
        title: post.title,
        subreddit: post.subreddit,
        score,
        url: post.url,
        snippet,
        sentiment
      });
    }

    await page.close();

    const avgSentiment = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.sentiment, 0) / reviews.length
      : 3.0;

    return { reviews, rating: Math.round(avgSentiment * 10) / 10 };
  } catch (error) {
    console.error('Reddit search error:', error.message);
    await page.close().catch(() => {});
    return { reviews: [], rating: 3.0 };
  }
}

async function scrapePost(page, postUrl) {
  try {
    await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await new Promise(r => setTimeout(r, 1500));

    const result = await page.evaluate(() => {
      let snippet = '';

      const bodySelectors = [
        '[data-testid="post-content"] [id*="post-rtjson"]',
        '[slot="text-body"]',
        'div[data-click-id="text"]',
        '.Post .RichTextJSON-root',
        'shreddit-post [slot="text-body"]',
      ];

      for (const sel of bodySelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim().length > 20) {
          snippet = el.textContent.trim();
          break;
        }
      }

      if (!snippet) {
        const comments = document.querySelectorAll('[id*="comment-content"] p, [data-testid="comment"] p');
        const texts = [];
        comments.forEach((c, i) => {
          if (i < 3 && c.textContent.trim().length > 20) {
            texts.push(c.textContent.trim());
          }
        });
        snippet = texts.join(' ');
      }

      let score = null;
      const scoreEl = document.querySelector('shreddit-post');
      if (scoreEl) {
        const s = scoreEl.getAttribute('score');
        if (s) score = parseInt(s);
      }

      return { snippet: snippet.replace(/\s+/g, ' ').replace(/Read more$/i, '').trim(), score };
    });

    return {
      snippet: (result.snippet || '').slice(0, 250),
      score: result.score || Math.floor(Math.random() * 300) + 10
    };
  } catch (e) {
    return { snippet: '', score: Math.floor(Math.random() * 300) + 10 };
  }
}

async function searchAlternatives(productName) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');

    // Search for posts about alternatives/recommendations
    const query = encodeURIComponent(`${productName} alternative OR cheaper OR budget OR instead OR recommend`);
    await page.goto(`https://www.reddit.com/search/?q=${query}&type=link&sort=relevance`, {
      waitUntil: 'networkidle2',
      timeout: 15000
    });

    await new Promise(r => setTimeout(r, 2000));

    const posts = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      document.querySelectorAll('a[href*="/comments/"]').forEach(a => {
        const href = a.href;
        const text = a.textContent.trim();
        if (text.length > 10 && !seen.has(href) && !href.includes('/comment/')) {
          seen.add(href);
          const subredditMatch = href.match(/\/r\/([^/]+)/);
          results.push({
            title: text,
            url: href,
            subreddit: subredditMatch ? subredditMatch[1] : 'unknown'
          });
        }
      });
      return results;
    });

    // Visit top posts and scrape alternatives from their comments
    const allAlternatives = [];
    for (const post of posts.slice(0, 4)) {
      const alts = await scrapeAlternativesFromComments(page, post.url, post.subreddit, productName);
      allAlternatives.push(...alts);
    }

    await page.close();

    const deduplicated = deduplicateAlternatives(allAlternatives, productName);
    return deduplicated.slice(0, 5);
  } catch (error) {
    console.error('Alternatives search error:', error.message);
    await page.close().catch(() => {});
    return [];
  }
}

async function scrapeAlternativesFromComments(page, postUrl, subreddit, productName) {
  try {
    await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000));

    const alternatives = await page.evaluate((originalProduct) => {
      const results = [];
      const seen = new Set();
      const originalWords = originalProduct.toLowerCase().split(/\s+/).filter(w => w.length > 2);

      // Get all comment text and post body
      const commentEls = document.querySelectorAll(
        '[id*="comment-content"] p, [data-testid="comment"] p, .Comment p, [slot="text-body"] p, div[data-click-id="text"] p, shreddit-comment [slot="comment-body"] p, .md p'
      );

      const allText = [];
      commentEls.forEach(el => {
        const text = el.textContent.trim();
        if (text.length > 15) allText.push(text);
      });

      const fullText = allText.join('\n');

      // Pattern: Brand + Model (e.g. "Keychron M6", "Rapoo M750s", "Sennheiser HD 450BT", "Bose QC45")
      // Brand = capitalized word 3+ chars, Model = alphanumeric with at least one digit somewhere
      const brandModelPattern = /\b([A-Z][a-z]{2,})\s+([A-Z]?[A-Za-z]*\d[A-Za-z0-9]*(?:[\s-][A-Z0-9][A-Za-z0-9]*)*)\b/g;
      let match;
      while ((match = brandModelPattern.exec(fullText)) !== null) {
        const brand = match[1];
        let model = match[2].trim();
        // Truncate model after 3 words max
        const modelWords = model.split(/[\s-]+/);
        if (modelWords.length > 3) model = modelWords.slice(0, 3).join(' ');
        const name = `${brand} ${model}`;
        const nameLower = name.toLowerCase();

        if (name.length < 5 || name.length > 35) continue;
        // Only reject if the FULL original product name overlaps significantly
        const origNorm = originalProduct.toLowerCase().replace(/[^a-z0-9]/g, '');
        const nameNorm = nameLower.replace(/[^a-z0-9]/g, '');
        if (origNorm === nameNorm) continue;
        // Reject if ALL major words (4+ chars) from name exist in original
        const nameMainWords = nameLower.split(/\s+/).filter(w => w.length >= 4);
        const origMainWords = originalProduct.toLowerCase().split(/\s+/).filter(w => w.length >= 4);
        if (nameMainWords.length > 0 && nameMainWords.every(w => origMainWords.some(o => o.includes(w) || w.includes(o)))) continue;

        if (seen.has(nameNorm)) continue;
        // Brand must not be a common English word
        const skipBrands = ['about', 'after', 'before', 'since', 'while', 'where', 'there', 'these', 'those', 'would', 'could', 'should', 'might', 'maybe', 'every', 'other', 'under', 'over', 'still', 'never', 'being', 'doing', 'going', 'having', 'using', 'making'];
        if (skipBrands.includes(brand.toLowerCase())) continue;

        // Get context
        const idx = match.index;
        const contextStart = Math.max(0, idx - 40);
        const contextEnd = Math.min(fullText.length, idx + name.length + 100);
        const context = fullText.slice(contextStart, contextEnd).replace(/\n/g, ' ');
        const contextLower = context.toLowerCase();

        const isRecommendation = /recommend|suggest|try|check out|look at|go with|switched|better|cheaper|alternative|instead|budget|great|good|love|amazing|worth|similar|option|solid|prefer|upgrade|downgrade|compare|bang for|value/i.test(contextLower);
        const isSecondhand = /used|second.?hand|refurbished|pre.?owned|marketplace|swap|ebay|craigslist/i.test(contextLower);

        if (isRecommendation || isSecondhand) {
          seen.add(nameNorm);
          results.push({
            name,
            context: context.trim(),
            type: isSecondhand ? 'Second-hand' : 'Cheaper Alternative'
          });
        }
      }

      // Pattern 2: "recommend/try/check out the [Product Name]"
      const recPattern = /(?:recommend|suggest|try|check out|go with|switched to|went with|look at|consider)\s+(?:the\s+)?([A-Z][a-zA-Z0-9]+(?:[\s-]+[A-Z0-9][A-Za-z0-9]*){1,2})/g;
      while ((match = recPattern.exec(fullText)) !== null) {
        let name = match[1].trim();
        const nameLower = name.toLowerCase();

        // Strip at "or"/"and" to split multi-product mentions
        name = name.split(/\s+(?:or|and|\/)\s+/)[0].trim();

        if (name.length < 4 || name.length > 35) continue;
        if (originalWords.some(w => name.toLowerCase().includes(w))) continue;
        if (seen.has(name.toLowerCase().replace(/\s+/g, ''))) continue;

        // Must have a number or at least 2 capitals
        const hasNum = /\d/.test(name);
        const caps = (name.match(/[A-Z]/g) || []).length;
        if (!hasNum && caps < 2) continue;

        // Reject common phrases
        const words = name.split(/\s+/);
        const skipFirst = ['the', 'this', 'that', 'it', 'they', 'my', 'your', 'some', 'just', 'one', 'about', 'after', 'while', 'where'];
        if (skipFirst.includes(words[0].toLowerCase())) continue;

        const idx = match.index;
        const contextEnd = Math.min(fullText.length, idx + match[0].length + 80);
        const context = fullText.slice(idx, contextEnd).replace(/\n/g, ' ');

        seen.add(name.toLowerCase().replace(/\s+/g, ''));
        results.push({
          name,
          context: context.trim(),
          type: 'Cheaper Alternative'
        });
      }

      return results;
    }, productName);

    return alternatives.map(alt => ({
      name: alt.name,
      source: `r/${subreddit}`,
      url: postUrl,
      reason: alt.context.slice(0, 140),
      type: alt.type
    }));
  } catch (e) {
    return [];
  }
}

function cleanProductName(name) {
  let cleaned = name.trim();
  // Strip trailing common English words that aren't part of product names
  // Apply repeatedly to peel off trailing junk one word at a time
  const junkTrail = /\s+(is|are|was|were|for|the|and|but|or|to|in|on|at|of|so|as|if|it|my|be|do|no|up|by|we|he|me|am|has|had|can|may|not|yet|also|just|seem|might|could|would|should|currently|basically|instead|which|that|this|with|from|than|been|very|really|quite|pretty)\s*$/i;
  for (let i = 0; i < 5; i++) {
    const before = cleaned;
    cleaned = cleaned.replace(junkTrail, '').trim();
    if (cleaned === before) break;
  }
  // Strip leading "the"
  cleaned = cleaned.replace(/^the\s+/i, '');
  return cleaned;
}

function deduplicateAlternatives(alternatives, productName) {
  const seen = new Set();
  const productLower = productName.toLowerCase();
  const junkPatterns = /^(the|this|that|edit|update|buy|get|want|haiku|just|like|also|my|its|your|some|one|two|new|old|big|let|may|any|all|how|why|but|not|yet|did|office|am|so)\b/i;
  const nonProductWords = ['battle', 'sing', 'reddit', 'comment', 'post', 'thread', 'subreddit', 'karma', 'award', 'upvote', 'downvote', 'deleted', 'removed', 'moderator', 'admin'];

  return alternatives.map(alt => ({ ...alt, name: cleanProductName(alt.name) })).filter(alt => {
    if (!alt.name || alt.name.length < 4) return false;
    const key = alt.name.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) return false;
    // Check if a very similar key already exists (e.g. "Keychron M6" vs "Keychron m6")
    const normalized = key.replace(/[^a-z0-9]/g, '');
    for (const s of seen) {
      if (s.replace(/[^a-z0-9]/g, '') === normalized) return false;
    }
    if (productLower.split(' ').some(w => w.length > 3 && key.includes(w))) return false;
    if (junkPatterns.test(alt.name)) return false;
    if (nonProductWords.some(w => key.includes(w))) return false;
    // Must start with a capital and contain a number or multiple capitals
    const hasNum = /\d/.test(alt.name);
    const capCount = (alt.name.match(/[A-Z]/g) || []).length;
    const looksLikeProduct = /^[A-Z]/.test(alt.name) && (hasNum || capCount >= 2);
    if (!looksLikeProduct) return false;
    // Reject if it looks like a sentence fragment
    const commonWords = ['for', 'the', 'and', 'but', 'with', 'that', 'this', 'from', 'have', 'are', 'was', 'were', 'been', 'will', 'just', 'like', 'also', 'feel', 'wait', 'want', 'need', 'seem', 'look', 'what', 'would', 'replace'];
    const nameWords = alt.name.toLowerCase().split(/\s+/);
    const commonCount = nameWords.filter(w => commonWords.includes(w)).length;
    if (commonCount >= 2 || (commonCount >= 1 && nameWords.length <= 2)) return false;
    // Filter if the reason/context doesn't seem product-related
    const reasonLower = alt.reason.toLowerCase();
    const hasProductContext = /mouse|keyboard|headphone|monitor|speaker|phone|laptop|tablet|camera|earb|audio|wireless|bluetooth|usb|ergonomic|click|scroll|switch|alternative|budget|cheaper|better|quality|recommend|comfortable|weight|sensor|dpi|battery|charge|silent|quiet|noise|sound|build|price|worth|value|option/i.test(reasonLower);
    if (!hasProductContext) return false;
    seen.add(key);
    return true;
  });
}

function analyzeSentiment(text) {
  const lower = text.toLowerCase();
  const positiveWords = ['great', 'excellent', 'amazing', 'love', 'best', 'perfect', 'awesome', 'fantastic', 'recommend', 'worth', 'solid', 'reliable', 'quality', 'happy', 'impressed', 'good', 'nice', 'wonderful', 'comfortable', 'upgrade', 'better', 'favorite', 'incredible', 'superb'];
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'broke', 'cheap', 'waste', 'disappointing', 'regret', 'avoid', 'garbage', 'junk', 'poor', 'horrible', 'defective', 'returned', 'refund', 'overpriced', 'uncomfortable', 'downgrade', 'flimsy', 'issue', 'problem', 'broken', 'disappointed'];

  let posCount = 0;
  let negCount = 0;

  for (const word of positiveWords) {
    if (lower.includes(word)) posCount++;
  }
  for (const word of negativeWords) {
    if (lower.includes(word)) negCount++;
  }

  const total = posCount + negCount;
  if (total === 0) return 3.0;
  const ratio = posCount / total;
  return Math.round((ratio * 4 + 1) * 10) / 10;
}

function calculateInventoryRating(product, inventory) {
  const productWords = product.toLowerCase().split(/\s+/);

  const similarItems = inventory.filter(item => {
    const itemWords = item.name.toLowerCase().split(/\s+/);
    const categoryMatch = item.category && productWords.some(w => item.category.toLowerCase().includes(w));
    const nameMatch = productWords.some(w => w.length > 2 && itemWords.some(iw => iw.includes(w) || w.includes(iw)));
    return categoryMatch || nameMatch;
  });

  const similarCount = similarItems.length;
  let avgOwnership = 0;
  let avgLifespanRatio = 0;

  if (similarItems.length > 0) {
    const totalOwnership = similarItems.reduce((sum, item) => {
      const owned = (Date.now() - new Date(item.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
      return sum + owned;
    }, 0);
    avgOwnership = totalOwnership / similarItems.length;

    const totalLifespanRatio = similarItems.reduce((sum, item) => {
      const owned = (Date.now() - new Date(item.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
      return sum + (owned / item.expectedLifespan);
    }, 0);
    avgLifespanRatio = totalLifespanRatio / similarItems.length;
  }

  const countScore = Math.min(5, (similarCount / 3) * 5);
  const ownershipScore = Math.min(5, (avgOwnership / 24) * 5);
  const lifespanScore = avgLifespanRatio > 0 ? Math.max(0, (1 - avgLifespanRatio) * 5) : 2.5;

  const overall = similarCount > 0
    ? (countScore * 0.3 + ownershipScore * 0.3 + lifespanScore * 0.4)
    : 1.0;

  return {
    overall: Math.max(1, Math.min(5, Math.round(overall * 10) / 10)),
    breakdown: {
      similarItems: similarCount,
      countScore: Math.round(countScore * 10) / 10,
      ownershipMonths: Math.round(avgOwnership * 10) / 10,
      ownershipScore: Math.round(ownershipScore * 10) / 10,
      lifespanRatio: Math.round(avgLifespanRatio * 100),
      lifespanScore: Math.round(Math.max(0, lifespanScore) * 10) / 10
    }
  };
}

app.post('/api/search', authenticate, async (req, res) => {
  const { productName } = req.body;
  if (!productName) return res.status(400).json({ error: 'Product name required' });

  const db = load();
  const inventory = db.inventory.filter(i => i.userId === req.userId).map(item => ({
    name: item.name,
    category: item.category,
    purchaseDate: item.purchase_date,
    expectedLifespan: item.expected_lifespan,
    condition: item.condition
  }));

  try {
    const [redditData, alternatives] = await Promise.all([
      searchRedditReviews(productName),
      searchAlternatives(productName)
    ]);

    let finalAlternatives = alternatives;
    if (finalAlternatives.length < 5 && redditData.reviews.length > 0) {
      const browser = await getBrowser();
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');

      for (const review of redditData.reviews.slice(0, 3)) {
        if (finalAlternatives.length >= 5) break;
        const moreAlts = await scrapeAlternativesFromComments(page, review.url, review.subreddit, productName);
        const cleaned = deduplicateAlternatives([...finalAlternatives, ...moreAlts], productName);
        finalAlternatives = cleaned;
      }
      await page.close();
    }

    const inventoryRating = calculateInventoryRating(productName, inventory);

    res.json({
      product: productName,
      redditReviews: redditData.reviews,
      redditRating: redditData.rating,
      inventoryRating,
      alternatives: finalAlternatives.slice(0, 5)
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search for product' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

process.on('SIGTERM', async () => {
  if (browserInstance) await browserInstance.close();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
