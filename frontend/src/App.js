import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './components/Icon';
import {
  categories,
  currentUser,
  demoCredentials,
  demoOwnedItems,
  formatPrice,
  products as initialProducts,
  reviewsByProduct,
  trendingDiscussions,
} from './data/demoData';
import {
  calculateLifespanDetails,
  calculatePersonalPurchaseScore,
  getCommunityConfidenceLabel,
} from './utils/purchaseScoring';
import './App.css';

const TODAY = '2026-07-11';
const STORAGE = {
  session: 'worthit.session.v1',
  saved: 'worthit.saved.v1',
  owned: 'worthit.owned.v1',
  reviews: 'worthit.reviews.v1',
  accounts: 'worthit.accounts.v1',
};

function readStored(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function getRoute() {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, queryString = ''] = raw.split('?');
  return { path: path || '/', query: new URLSearchParams(queryString) };
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function monthsToWords(months) {
  if (months < 12) return `${months} month${months === 1 ? '' : 's'}`;
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  return `${years} year${years === 1 ? '' : 's'}${remainder ? ` ${remainder} mo` : ''}`;
}

function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

function localPasswordHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `local-${(hash >>> 0).toString(16)}`;
}

function RatingStars({ rating, size = 'normal' }) {
  return (
    <span className={`stars stars-${size}`} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= Math.round(rating) ? 'star-on' : 'star-off'}>★</span>
      ))}
    </span>
  );
}

function Logo({ onClick, compact = false }) {
  return (
    <button className={classNames('brand', compact && 'brand-compact')} onClick={onClick} aria-label="WorthIt? home">
      <span className="brand-mark"><span>W</span></span>
      <span className="brand-word">WorthIt<span>?</span></span>
    </button>
  );
}

function DemoBanner() {
  return (
    <div className="demo-banner" role="note">
      <div className="site-width demo-banner-inner">
        <span className="demo-dot" />
        <span><strong>Demo workspace</strong> · Reviews and activity shown here are labelled fictional fixtures, not real community claims.</span>
        <button onClick={() => window.location.hash = '/guidelines'}>How trust works <Icon name="arrow" size={14} /></button>
      </div>
    </div>
  );
}

function Header({ route, navigate, session, onSignIn, onSignOut, onContribute, mobileOpen, setMobileOpen }) {
  const navItems = [
    ['Home', '/'],
    ['Discover', '/discover'],
    ['Community', '/community'],
  ];

  return (
    <header className="site-header">
      <div className="site-width header-inner">
        <Logo onClick={() => navigate('/')} />
        <nav className="desktop-nav" aria-label="Primary navigation">
          {navItems.map(([label, path]) => (
            <button key={label} className={route.path === path ? 'active' : ''} onClick={() => navigate(path)}>{label}</button>
          ))}
        </nav>
        <div className="header-actions">
          <button className="icon-button header-search-button" onClick={() => navigate('/discover')} aria-label="Search products"><Icon name="search" /></button>
          <button className="button button-ink header-contribute" onClick={onContribute}><Icon name="edit" size={16} /> Share an experience</button>
          {session ? (
            <div className="profile-menu-wrap">
              <button className="avatar-button" onClick={() => navigate('/dashboard')} aria-label="Open your dashboard">
                <span className="avatar small">{session.initials}</span>
                <span className="avatar-copy"><strong>{session.displayName.split(' ')[0]}</strong><small>Your things</small></span>
                <Icon name="down" size={14} />
              </button>
              <button className="signout-quiet" onClick={onSignOut}>Sign out</button>
            </div>
          ) : (
            <button className="button button-outline" onClick={onSignIn}>Sign in</button>
          )}
          <button className="icon-button mobile-menu-button" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
            <Icon name={mobileOpen ? 'close' : 'menu'} />
          </button>
        </div>
      </div>
      {mobileOpen && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {navItems.map(([label, path]) => <button key={label} onClick={() => { setMobileOpen(false); navigate(path); }}>{label}<Icon name="chevron" size={16} /></button>)}
          {session && <><button onClick={() => { setMobileOpen(false); navigate('/dashboard'); }}>Your things<Icon name="chevron" size={16} /></button><button onClick={() => { setMobileOpen(false); navigate('/saved'); }}>Saved products<Icon name="chevron" size={16} /></button></>}
          {!session && <button onClick={() => { setMobileOpen(false); onSignIn(); }}>Sign in or create account<Icon name="chevron" size={16} /></button>}
        </nav>
      )}
    </header>
  );
}

function ProductVisual({ product, size = 'card' }) {
  return (
    <div className={`product-visual product-visual-${size} palette-${product.palette}`} aria-hidden="true">
      <span className="visual-orbit" />
      <span className="product-glyph">{product.glyph}</span>
      <span className="visual-label">{product.categoryLabel}</span>
    </div>
  );
}

function ConfidencePill({ count }) {
  const label = getCommunityConfidenceLabel(count);
  return <span className={classNames('confidence-pill', count >= 50 && 'established')}><Icon name="shield" size={13} />{label.replace(' community rating', '')}</span>;
}

function SaveButton({ productId, saved, onToggle, compact = false }) {
  return (
    <button
      className={classNames('save-button', saved && 'saved', compact && 'compact')}
      onClick={(event) => { event.stopPropagation(); onToggle(productId); }}
      aria-label={saved ? 'Remove from saved products' : 'Save product'}
      aria-pressed={saved}
    >
      <Icon name="bookmark" size={compact ? 17 : 19} fill={saved ? 'currentColor' : 'none'} />
      {!compact && <span>{saved ? 'Saved' : 'Save'}</span>}
    </button>
  );
}

function ProductCard({ product, navigate, saved, onSave, variant = 'standard', showPersonal, ownedItems }) {
  let score;
  if (showPersonal) {
    try { score = calculatePersonalPurchaseScore({ product, ownedItems, asOfDate: TODAY }); } catch { score = null; }
  }

  return (
    <article className={`product-card product-card-${variant}`} onClick={() => navigate(`/product/${product.id}`)}>
      <div className="product-card-visual-wrap">
        <ProductVisual product={product} />
        {product.trendingRank <= 4 && <span className="trend-chip">Trending #{product.trendingRank}</span>}
        <SaveButton compact productId={product.id} saved={saved} onToggle={onSave} />
      </div>
      <div className="product-card-body">
        <div className="eyebrow">{product.categoryLabel}</div>
        <h3>{product.name}</h3>
        <p className="product-brand">{product.brand} · {product.model}</p>
        <div className="card-rating-line">
          <strong>{product.rating.toFixed(1)}</strong>
          <RatingStars rating={product.rating} size="small" />
          <span>{product.reviewCount} reviews</span>
        </div>
        <div className="card-facts">
          <span><Icon name="clock" size={15} />{monthsToWords(product.lifespanMonths)} expected</span>
          <span><Icon name="user" size={15} />{product.owners} current owners</span>
        </div>
        {score && (
          <div className={`personal-preview score-${score.score < 50 ? 'skip' : score.score < 75 ? 'consider' : 'go'}`}>
            <span>Your score</span><strong>{score.score}/100</strong><em>{score.recommendationLabel}</em>
          </div>
        )}
        <button className="text-link card-link">See the evidence <Icon name="arrow" size={15} /></button>
      </div>
    </article>
  );
}

function SectionHeading({ eyebrow, title, description, action, onAction }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <div className="eyebrow accent">{eyebrow}</div>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action && <button className="text-link" onClick={onAction}>{action}<Icon name="arrow" size={16} /></button>}
    </div>
  );
}

function FeedTabs({ value, onChange }) {
  return (
    <div className="feed-tabs" role="tablist" aria-label="Sort community content">
      {[['popular', 'Popular'], ['recent', 'Recent'], ['lasting', 'Long lasting']].map(([id, label]) => (
        <button key={id} role="tab" aria-selected={value === id} className={value === id ? 'active' : ''} onClick={() => onChange(id)}>{label}</button>
      ))}
    </div>
  );
}

function ProductFeedItem({ product, navigate, saved, onSave, session, ownedItems, rank }) {
  let score;
  if (session) {
    try { score = calculatePersonalPurchaseScore({ product, ownedItems, asOfDate: TODAY }); } catch { score = null; }
  }
  const latestReview = (reviewsByProduct[product.id] || [])[0];
  return (
    <article className="feed-item">
      <div className="feed-rank"><span>{String(rank).padStart(2, '0')}</span><small>hot</small></div>
      <button className="feed-visual-button" onClick={() => navigate(`/product/${product.id}`)} aria-label={`Open ${product.name}`}><ProductVisual product={product} size="feed" /></button>
      <div className="feed-item-body">
        <div className="feed-meta"><span>{product.categoryLabel}</span><span>·</span><span>{product.brand}</span>{product.trendingRank <= 3 && <em>Trending</em>}</div>
        <button className="feed-title" onClick={() => navigate(`/product/${product.id}`)}>{product.name}</button>
        <p>{product.discussion || product.summary}</p>
        <div className="feed-evidence">
          <span className="feed-rating"><strong>{product.rating.toFixed(1)}</strong><RatingStars rating={product.rating} size="small" /></span>
          <span>{product.reviewCount} reviews</span>
          <span><Icon name="clock" size={14} />{monthsToWords(product.lifespanMonths)} expected</span>
          {score && <span className={classNames('feed-score', score.score < 50 && 'skip')}>{score.score}/100 · {score.recommendationLabel}</span>}
        </div>
        <div className="feed-actions">
          <button onClick={() => navigate(`/product/${product.id}`)}><Icon name="message" size={15} />{latestReview?.comments || 0} discussions</button>
          <button onClick={() => navigate(`/product/${product.id}`)}><Icon name="user" size={15} />{product.owners} owners</button>
          <button className={saved ? 'active' : ''} onClick={() => onSave(product.id)}><Icon name="bookmark" size={15} fill={saved ? 'currentColor' : 'none'} />{saved ? 'Saved' : 'Save'}</button>
        </div>
      </div>
    </article>
  );
}

function ScoreSystemExplainer({ navigate }) {
  return (
    <aside className="simple-score-explainer">
      <div className="eyebrow light">Two separate answers</div>
      <h2>A good product can still be the wrong purchase.</h2>
      <div className="simple-score-row community">
        <span><small>Community rating</small><strong>4.3<em>/5</em></strong></span>
        <span><b>Is it good?</b><small>From 127 platform reviews</small></span>
      </div>
      <div className="score-not-equal">≠</div>
      <div className="simple-score-row personal">
        <span><small>Personal score</small><strong>39<em>/100</em></strong></span>
        <span><b>Is it right for you?</b><small>You own a similar active item</small></span>
      </div>
      <p>Community quality and personal need are never blended into one unexplained rating.</p>
      <button onClick={() => navigate('/product/auraflow-nc1')}>See the score explained <Icon name="arrow" size={14} /></button>
    </aside>
  );
}

function HomePage({ navigate, products, savedIds, onSave, session, ownedItems }) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('popular');
  const submitSearch = (event) => {
    event.preventDefault();
    navigate(`/discover${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ''}`);
  };
  const feedProducts = useMemo(() => [...products].sort((a, b) => {
    if (tab === 'recent') return b.releaseYear - a.releaseYear || a.trendingRank - b.trendingRank;
    if (tab === 'lasting') return b.lifespanMonths - a.lifespanMonths;
    return a.trendingRank - b.trendingRank;
  }).slice(0, 9), [products, tab]);

  return (
    <main className="feed-page">
      <div className="site-width feed-layout">
        <section className="feed-main">
          <div className="feed-intro">
            <div><h1>What people are weighing up</h1><p>First-party product experiences, repair stories and honest “keep what you have” advice.</p></div>
            <button className="button button-ink" onClick={() => navigate('/contribute')}><Icon name="edit" size={15} />Post</button>
          </div>
          <form className="feed-search" onSubmit={submitSearch}>
            <Icon name="search" size={19} />
            <label className="sr-only" htmlFor="home-search">Search products</label>
            <input id="home-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products, brands or categories" />
            <button type="submit">Search</button>
          </form>
          <div className="feed-toolbar">
            <FeedTabs value={tab} onChange={setTab} />
            <button className="feed-all-link" onClick={() => navigate('/discover')}>All products <Icon name="arrow" size={14} /></button>
          </div>
          <div className="feed-list">
            {feedProducts.map((product, index) => (
              <div className="feed-sequence" key={product.id}>
                <ProductFeedItem product={product} rank={index + 1} navigate={navigate} saved={savedIds.includes(product.id)} onSave={onSave} session={session} ownedItems={ownedItems} />
                {index === 1 && <div className="mobile-score-explainer"><ScoreSystemExplainer navigate={navigate} /></div>}
              </div>
            ))}
          </div>
          <button className="load-more" onClick={() => navigate('/discover')}>See more products</button>
        </section>
        <aside className="feed-sidebar">
          <ScoreSystemExplainer navigate={navigate} />
          <div className="sidebar-panel trending-panel">
            <div className="sidebar-panel-head"><strong>Trending discussions</strong><button onClick={() => navigate('/community')}>See all</button></div>
            {trendingDiscussions.map((discussion) => (
              <button key={discussion.productId} className="simple-discussion-link" onClick={() => navigate(`/product/${discussion.productId}`)}><span>{discussion.tag}</span><strong>{discussion.title}</strong><small><Icon name="message" size={13} />{discussion.replies} replies</small></button>
            ))}
          </div>
          <div className="sidebar-panel category-panel">
            <strong>Browse a category</strong>
            <div>{categories.slice(1, 7).map((category) => <button key={category.id} onClick={() => navigate(`/discover?q=${category.label}`)}>{category.glyph}<span>{category.label}</span></button>)}</div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function FilterSelect({ label, value, onChange, children }) {
  return <label className="filter-select"><span>{label}</span><select value={value} onChange={onChange}>{children}</select><Icon name="down" size={14} /></label>;
}

function DiscoverPage({ route, navigate, products, savedIds, onSave, session, ownedItems }) {
  const [query, setQuery] = useState(route.query.get('q') || '');
  const [category, setCategory] = useState('all');
  const [minRating, setMinRating] = useState('0');
  const [lifespan, setLifespan] = useState('0');
  const [sort, setSort] = useState(route.query.get('sort') || 'trending');

  useEffect(() => { setQuery(route.query.get('q') || ''); }, [route]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    const result = products.filter((product) => {
      const matchesSearch = !search || [product.name, product.brand, product.model, product.categoryLabel].join(' ').toLowerCase().includes(search);
      return matchesSearch && (category === 'all' || product.category === category) && product.rating >= Number(minRating) && product.lifespanMonths >= Number(lifespan);
    });
    return result.sort((a, b) => {
      if (sort === 'rating') return b.rating - a.rating || b.reviewCount - a.reviewCount;
      if (sort === 'reviews') return b.reviewCount - a.reviewCount;
      if (sort === 'lifespan') return b.lifespanMonths - a.lifespanMonths;
      if (sort === 'recent') return b.releaseYear - a.releaseYear;
      return a.trendingRank - b.trendingRank;
    });
  }, [products, query, category, minRating, lifespan, sort]);

  return (
    <main className="page-shell simple-catalog-page">
      <div className="site-width simple-page-shell">
        <header className="simple-page-head">
          <div><div className="eyebrow accent">Product catalogue</div><h1>Discover products</h1><p>Search community evidence, not sales listings.</p></div>
          <form className="simple-search" onSubmit={(event) => event.preventDefault()}>
            <Icon name="search" size={19} />
            <label className="sr-only" htmlFor="discover-search">Search products, brands, models or categories</label>
            <input id="discover-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products, brands or categories" autoFocus={Boolean(route.query.get('q'))} />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><Icon name="close" size={16} /></button>}
          </form>
        </header>
        <div className="catalog-controls" aria-label="Product filters">
          <FilterSelect label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</FilterSelect>
          <FilterSelect label="Rating" value={minRating} onChange={(event) => setMinRating(event.target.value)}><option value="0">Any rating</option><option value="4">4.0+</option><option value="4.5">4.5+</option></FilterSelect>
          <FilterSelect label="Lifespan" value={lifespan} onChange={(event) => setLifespan(event.target.value)}><option value="0">Any lifespan</option><option value="48">4+ years</option><option value="84">7+ years</option><option value="120">10+ years</option></FilterSelect>
          <FilterSelect label="Sort" value={sort} onChange={(event) => setSort(event.target.value)}><option value="trending">Trending</option><option value="rating">Highest rated</option><option value="reviews">Most reviewed</option><option value="lifespan">Longest lifespan</option><option value="recent">Newest release</option></FilterSelect>
          {(category !== 'all' || minRating !== '0' || lifespan !== '0') && <button className="reset-filters" onClick={() => { setCategory('all'); setMinRating('0'); setLifespan('0'); }}>Reset</button>}
        </div>
        <div className="catalog-summary"><strong>{filtered.length} {filtered.length === 1 ? 'product' : 'products'}</strong>{query && <span>for “{query}”</span>}</div>
        {filtered.length ? (
          <div className="catalog-list">
            {filtered.map((product, index) => <ProductFeedItem key={product.id} product={product} rank={index + 1} navigate={navigate} saved={savedIds.includes(product.id)} onSave={onSave} session={session} ownedItems={ownedItems} />)}
          </div>
        ) : (
          <div className="empty-card"><span><Icon name="search" size={28} /></span><h2>No matching products.</h2><p>Try a broader search or remove a filter.</p><button className="button button-ink" onClick={() => { setQuery(''); setCategory('all'); setMinRating('0'); setLifespan('0'); }}>Clear filters</button></div>
        )}
      </div>
    </main>
  );
}

function CommunityPage({ navigate, products, onContribute }) {
  const [tab, setTab] = useState('popular');
  const discussions = useMemo(() => [...products].sort((a, b) => tab === 'recent' ? b.releaseYear - a.releaseYear : a.trendingRank - b.trendingRank).slice(0, 12), [products, tab]);
  return (
    <main className="page-shell community-page-simple">
      <div className="site-width simple-page-shell community-layout-simple">
        <section className="community-main-simple">
          <header className="simple-page-head community-head-simple">
            <div><div className="eyebrow accent">WorthIt? community</div><h1>Real questions. Lived experience.</h1><p>Discussions and reviews started by people on this platform.</p></div>
            <button className="button button-ink" onClick={onContribute}><Icon name="edit" size={15} />Start a post</button>
          </header>
          <div className="community-toolbar-simple">
            <div className="feed-tabs" role="tablist"><button role="tab" aria-selected={tab === 'popular'} className={tab === 'popular' ? 'active' : ''} onClick={() => setTab('popular')}>Popular</button><button role="tab" aria-selected={tab === 'recent'} className={tab === 'recent' ? 'active' : ''} onClick={() => setTab('recent')}>Recent</button></div>
            <span>{discussions.length} discussions</span>
          </div>
          <div className="community-thread-list">
            {discussions.map((product) => {
              const review = (reviewsByProduct[product.id] || [])[0];
              return (
                <article className="community-thread" key={product.id}>
                  <div className="thread-signal"><Icon name="message" size={17} /><strong>{review?.comments || product.trendingRank + 2}</strong><small>replies</small></div>
                  <div className="thread-body">
                    <div className="feed-meta"><span>{product.categoryLabel}</span><span>·</span><span>{product.name}</span><em>Demo discussion</em></div>
                    <button className="thread-title" onClick={() => navigate(`/product/${product.id}`)}>{product.discussion}</button>
                    <p>{review?.text || product.summary}</p>
                    <div className="thread-footer"><span><RatingStars rating={product.rating} size="small" /> {product.rating} community rating</span><span>{product.reviewCount} reviews</span><span>Active today</span></div>
                  </div>
                  <button className="thread-open" onClick={() => navigate(`/product/${product.id}`)} aria-label={`Open discussion about ${product.name}`}><Icon name="chevron" size={18} /></button>
                </article>
              );
            })}
          </div>
        </section>
        <aside className="community-sidebar-simple">
          <div className="sidebar-panel community-about"><h2>About this community</h2><p>Share what you actually used. Show your relationship to the product. Disclose incentives and commercial ties.</p><button onClick={() => navigate('/guidelines')}>Read the guidelines <Icon name="arrow" size={14} /></button></div>
          <div className="sidebar-panel community-rules"><strong>Keep it useful</strong><ol><li>First-party experience only</li><li>Be specific and respectful</li><li>No sales links or copied reviews</li></ol></div>
        </aside>
      </div>
    </main>
  );
}

function RatingDistribution({ product }) {
  const max = Math.max(...product.distribution);
  return (
    <div className="rating-distribution">
      {[5, 4, 3, 2, 1].map((star, index) => {
        const value = product.distribution[4 - index];
        return <div key={star}><span>{star}</span><span className="tiny-star">★</span><i><b style={{ width: `${(value / max) * 100}%` }} /></i><em>{value}</em></div>;
      })}
    </div>
  );
}

function PersonalScoreCard({ product, session, ownedItems, onSignIn }) {
  if (!session) {
    return (
      <aside className="personal-score-card locked-score">
        <span className="score-card-icon"><Icon name="lock" size={21} /></span>
        <div className="eyebrow">Personal purchase score</div>
        <h3>Is it worth it <em>for you?</em></h3>
        <p>Sign in to compare this product with what you already own. Your ownership data stays private.</p>
        <button className="button button-ink full" onClick={onSignIn}>Check my score <Icon name="arrow" size={16} /></button>
        <small><Icon name="shield" size={14} /> Explainable guidance, not financial advice</small>
      </aside>
    );
  }

  let result;
  try { result = calculatePersonalPurchaseScore({ product, ownedItems, asOfDate: TODAY }); } catch { return null; }
  const tone = result.score < 50 ? 'skip' : result.score < 75 ? 'consider' : 'go';
  return (
    <aside className={`personal-score-card score-tone-${tone}`}>
      <div className="score-card-head"><div><div className="eyebrow">Your purchase score</div><h3>{result.recommendationLabel}</h3></div><div className="score-ring" style={{ '--score': result.score }}><strong>{result.score}</strong><span>/100</span></div></div>
      <p className="score-explanation">{result.explanation}</p>
      <div className="factor-list">
        {result.factors.slice(0, 4).map((factor) => <div key={factor.code} className={factor.impact < 0 ? 'negative' : 'positive'}><strong>{factor.impact > 0 ? '+' : '−'}{Math.abs(Math.round(factor.impact))}</strong><span>{factor.message}</span></div>)}
      </div>
      <button className="score-details-button">How this score works <Icon name="down" size={14} /></button>
      <small><Icon name="info" size={14} /> {result.disclaimer}</small>
    </aside>
  );
}

function ReviewCard({ review, helpful, onHelpful, onComment, onReport }) {
  const [commenting, setCommenting] = useState(false);
  const [comment, setComment] = useState('');
  const submitComment = (event) => {
    event.preventDefault();
    if (!comment.trim()) return;
    onComment(review.id, comment.trim());
    setComment('');
    setCommenting(false);
  };
  return (
    <article className="review-card">
      <div className="reviewer-column">
        <span className="avatar review-avatar">{review.initials}</span>
        <strong>{review.user}</strong>
        <small>Platform member</small>
      </div>
      <div className="review-main">
        <div className="review-topline">
          <div><RatingStars rating={review.rating} /><span className="review-date">{formatDate(review.date)}</span></div>
          {review.demo && <span className="fixture-chip">Demonstration review</span>}
        </div>
        <span className="relationship-pill"><Icon name="box" size={14} />{review.relationship}{review.ownershipMonths > 1 && ` · ${monthsToWords(review.ownershipMonths)}`}</span>
        <h3>{review.title}</h3>
        {review.text && <p>{review.text}</p>}
        {(review.pros?.length || review.cons?.length) && <div className="pros-cons"><div><strong>Worked well</strong>{review.pros.map((item) => <span key={item}><Icon name="check" size={13} />{item}</span>)}</div><div><strong>Worth knowing</strong>{review.cons.map((item) => <span key={item}><i>−</i>{item}</span>)}</div></div>}
        <div className="review-buy-again"><span className={review.wouldBuyAgain ? 'yes' : 'no'}><Icon name={review.wouldBuyAgain ? 'check' : 'close'} size={13} /></span>{review.wouldBuyAgain ? 'Would buy it again' : 'Would not buy it again'}<small>No commercial relationship disclosed</small></div>
        <div className="review-actions">
          <button className={helpful ? 'active' : ''} onClick={() => onHelpful(review.id)}><Icon name="thumb" size={16} /> Helpful · {review.helpful + (helpful ? 1 : 0)}</button>
          <button onClick={() => setCommenting(!commenting)}><Icon name="message" size={16} /> Discuss · {review.comments}</button>
          <button className="report-action" onClick={() => onReport(review.id)}><Icon name="flag" size={15} /> Report</button>
        </div>
        {commenting && <form className="comment-form" onSubmit={submitComment}><label className="sr-only" htmlFor={`comment-${review.id}`}>Add a comment</label><input id={`comment-${review.id}`} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a respectful question or comment…" autoFocus /><button className="button button-ink" type="submit">Post</button></form>}
      </div>
    </article>
  );
}

function ProductPage({ product, navigate, savedIds, onSave, session, ownedItems, requireAuth, onOpenReview, onOpenOwned, userReviews, helpfulIds, onHelpful, onComment, onReport }) {
  const [sort, setSort] = useState('helpful');
  const [writtenOnly, setWrittenOnly] = useState(false);
  const demoReviews = reviewsByProduct[product.id] || [];
  const userReview = userReviews.find((review) => review.productId === product.id);
  const reviews = [...(userReview ? [userReview] : []), ...demoReviews]
    .filter((review) => !writtenOnly || review.text)
    .sort((a, b) => sort === 'recent' ? new Date(b.date) - new Date(a.date) : sort === 'highest' ? b.rating - a.rating : sort === 'lowest' ? a.rating - b.rating : b.helpful - a.helpful);
  const substitutes = initialProducts.filter((item) => item.category === product.category && item.id !== product.id).sort((a, b) => b.rating - a.rating).slice(0, 2);

  return (
    <main className="page-shell product-page">
      <div className="site-width">
        <div className="breadcrumbs"><button onClick={() => navigate('/')}>Home</button><Icon name="chevron" size={13} /><button onClick={() => navigate(`/discover?q=${product.categoryLabel}`)}>{product.categoryLabel}</button><Icon name="chevron" size={13} /><span>{product.name}</span></div>
        <section className="product-identity-grid">
          <ProductVisual product={product} size="detail" />
          <div className="product-identity">
            <div className="product-meta-line"><span>{product.categoryLabel}</span><span>•</span><span>Released {product.releaseYear}</span></div>
            <h1>{product.name}</h1>
            <p className="product-byline">{product.brand} · Model {product.model}</p>
            <p className="product-summary">{product.summary}</p>
            <div className="validation-line"><span className="validation-badge"><Icon name="shield" size={15} />{product.validation}</span><span>Submitted by <strong>community member Lena T.</strong></span></div>
            <div className="identity-actions">
              <SaveButton productId={product.id} saved={savedIds.includes(product.id)} onToggle={onSave} />
              <button className="button button-outline" onClick={() => requireAuth(() => onOpenOwned(product))}><Icon name="plus" size={16} /> I own this</button>
              <a className="external-product-link" href={product.officialUrl} target="_blank" rel="noreferrer">Official product page <Icon name="external" size={15} /></a>
            </div>
          </div>
          <div className="identity-facts">
            <div><span>Typical price</span><strong>{formatPrice(product)}</strong><small>Community-entered guide</small></div>
            <div><span>Expected lifespan</span><strong>{monthsToWords(product.lifespanMonths)}</strong><small>Source: owner consensus</small></div>
            <div><span>Repairability</span><strong>{product.repairability.toFixed(1)} <small>/ 5</small></strong><small>From platform reviews</small></div>
          </div>
        </section>

        <section className="product-evidence-grid">
          <div className="community-rating-card">
            <div className="card-section-title"><div><div className="eyebrow">Question one</div><h2>Is it considered good?</h2></div><ConfidencePill count={product.reviewCount} /></div>
            <div className="community-rating-body">
              <div className="big-rating"><strong>{product.rating.toFixed(1)}</strong><span><RatingStars rating={product.rating} /><small>from {product.reviewCount} community reviews</small></span></div>
              <RatingDistribution product={product} />
            </div>
            <div className="owner-signal-grid"><div><strong>{product.owners}</strong><span>current owners</span></div><div><strong>{product.longTermOwners}</strong><span>long-term owners</span></div><div><strong>{product.buyAgain}%</strong><span>would buy again</span></div></div>
          </div>
          <PersonalScoreCard product={product} session={session} ownedItems={ownedItems} onSignIn={() => requireAuth()} />
        </section>

        <section className="reviews-layout">
          <div className="reviews-content">
            <div className="reviews-title-row"><div><div className="eyebrow accent">First-party experiences</div><h2>What owners are saying</h2><p>Relationship and length of use stay visible so you can weigh each perspective.</p></div><button className="button button-clay" onClick={() => requireAuth(() => onOpenReview(product))}><Icon name="edit" size={16} />{userReview ? 'Edit your review' : 'Share your experience'}</button></div>
            <div className="review-controls">
              <FilterSelect label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)}><option value="helpful">Most helpful</option><option value="recent">Most recent</option><option value="highest">Highest rating</option><option value="lowest">Lowest rating</option></FilterSelect>
              <label className="check-filter"><input type="checkbox" checked={writtenOnly} onChange={(e) => setWrittenOnly(e.target.checked)} /><i><Icon name="check" size={12} /></i> Written reviews only</label>
              <button className="more-filters"><Icon name="sliders" size={15} /> More filters</button>
            </div>
            <div className="fixture-notice"><Icon name="info" size={16} /><span><strong>Development fixture content</strong> — these sample reviews demonstrate the experience and are not presented as real community testimony.</span></div>
            <div className="review-stack">
              {reviews.map((review) => <ReviewCard key={review.id} review={review} helpful={helpfulIds.includes(review.id)} onHelpful={(id) => requireAuth(() => onHelpful(id))} onComment={(id, comment) => requireAuth(() => onComment(id, comment))} onReport={(id) => requireAuth(() => onReport(id))} />)}
            </div>
          </div>
          <aside className="review-sidebar">
            <div className="sidebar-card longevity-card"><span className="sidebar-icon"><Icon name="clock" size={22} /></span><div className="eyebrow">Ownership & longevity</div><h3>What happens after year one?</h3><div className="longevity-stat"><strong>{product.longTermOwners}</strong><span>reviewers have used it for 2+ years</span></div><div className="meter"><i style={{ width: `${Math.min(100, product.longTermOwners / Math.max(1, product.owners) * 100)}%` }} /></div><p>Long-term owners most often mention replaceable wear parts and battery health.</p></div>
            <div className="sidebar-card trust-card"><Icon name="shield" size={22} /><h3>Human reviews only</h3><p>WorthIt? doesn’t scrape or blend in ratings from elsewhere. Reviews require a phone-verified account.</p><button onClick={() => navigate('/guidelines')}>Read the community rules <Icon name="arrow" size={14} /></button></div>
          </aside>
        </section>

        <section className="substitute-section">
          <SectionHeading eyebrow="Before replacing anything" title="A few honest alternatives" description="Including the option most shopping sites leave out." />
          <div className="substitute-grid">
            <article className="keep-card"><div className="keep-visual"><Icon name="leaf" size={31} /></div><div><span className="best-choice-chip">Lowest-impact option</span><h3>Keep what you already have</h3><p>{session ? `Your ${ownedItems.find((item) => item.category === product.category)?.name || 'current item'} may still cover the same need.` : 'If your current item still works, maintaining it is a valid recommendation.'}</p><button onClick={() => navigate('/dashboard')}>Check what I own <Icon name="arrow" size={15} /></button></div></article>
            {substitutes.map((item) => <article className="substitute-card" key={item.id} onClick={() => navigate(`/product/${item.id}`)}><ProductVisual product={item} /><div><small>{item.categoryLabel}</small><h3>{item.name}</h3><span><RatingStars rating={item.rating} size="small" /> {item.rating} · {monthsToWords(item.lifespanMonths)}</span><p>{item.summary}</p><button>Compare evidence <Icon name="arrow" size={14} /></button></div></article>)}
          </div>
        </section>

        <section className="spec-section">
          <div><div className="eyebrow">Objective product record</div><h2>Details, without the sales copy</h2><p>Community-entered facts linked to a manufacturer page. Suggest a correction if something looks wrong.</p><button className="text-link" onClick={() => requireAuth()}><Icon name="edit" size={15} /> Suggest an edit</button></div>
          <dl>{product.specs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}<div><dt>Typical price</dt><dd>{formatPrice(product)}</dd></div><div><dt>Expected lifespan</dt><dd>{monthsToWords(product.lifespanMonths)}</dd></div></dl>
        </section>
      </div>
    </main>
  );
}

function AuthGate({ title, copy, onSignIn }) {
  return <div className="auth-gate"><span className="auth-gate-icon"><Icon name="lock" size={27} /></span><div className="eyebrow accent">Private by design</div><h1>{title}</h1><p>{copy}</p><button className="button button-ink" onClick={onSignIn}><Icon name="user" size={17} /> Sign in or create account</button><small><Icon name="shield" size={14} /> Phone verification is required only when creating an account.</small></div>;
}

function OwnershipCard({ item, onRemove }) {
  let details;
  try { details = calculateLifespanDetails(item, TODAY); } catch { details = null; }
  const used = Math.min(100, details?.percentageUsed || 0);
  const tone = details?.hasExceededExpectedLifespan ? 'over' : used >= 80 ? 'near' : 'good';
  return (
    <article className="owned-card">
      <div className={`owned-visual palette-${item.palette}`}><span>{item.glyph}</span><em className={`status-dot status-${tone}`} /></div>
      <div className="owned-copy">
        <div className="owned-head"><div><small>{item.categoryLabel}</small><h3>{item.name}</h3></div><button onClick={() => onRemove(item.id)} aria-label={`Remove ${item.name}`}><Icon name="trash" size={16} /></button></div>
        <div className="status-row"><span className={`item-status status-${item.status.toLowerCase()}`}>{item.status}</span><span>{item.condition} condition</span></div>
        <div className="life-copy"><span>{details?.hasExceededExpectedLifespan ? 'Beyond expected life' : `${Math.round(details?.remainingLifespanPercentage || 0)}% estimated life left`}</span><strong>{details ? monthsToWords(Math.round(details.ageMonths)) : '—'} old</strong></div>
        <div className="owned-meter"><i className={`tone-${tone}`} style={{ width: `${used}%` }} /></div>
        <p>{item.notes}</p>
        <div className="owned-footer"><span>Purchased {formatDate(item.purchaseDate)}</span><button><Icon name="edit" size={13} /> Update</button></div>
      </div>
    </article>
  );
}

function DashboardPage({ session, ownedItems, navigate, onSignIn, onAdd, onRemove }) {
  if (!session) return <main className="page-shell"><div className="site-width"><AuthGate title="Your things belong to you." copy="Sign in to open a private record of what you own, its condition and the useful life it may have left." onSignIn={onSignIn} /></div></main>;
  const details = ownedItems.map((item) => { try { return { item, life: calculateLifespanDetails(item, TODAY) }; } catch { return { item, life: null }; } });
  const totalCost = ownedItems.reduce((sum, item) => sum + Number(item.purchasePrice || 0), 0);
  const nearing = details.filter(({ life }) => life && (life.hasExceededExpectedLifespan || life.remainingLifespanPercentage <= 20)).length;
  const duplicateCategories = new Set(ownedItems.map((item) => item.category).filter((category, index, all) => all.indexOf(category) !== index)).size;
  return (
    <main className="page-shell dashboard-page">
      <section className="dashboard-head">
        <div className="site-width dashboard-head-inner"><div><div className="eyebrow light">Private ownership dashboard</div><h1>The things you’re <em>keeping.</em></h1><p>Useful-life estimates are guidance. You can adjust them to match your own experience.</p></div><button className="button button-paper" onClick={onAdd}><Icon name="plus" size={17} /> Add an item</button></div>
      </section>
      <div className="site-width dashboard-body">
        <nav className="account-tabs"><button className="active">Your things <span>{ownedItems.length}</span></button><button onClick={() => navigate('/saved')}>Saved products</button><button onClick={() => navigate('/recommendations')}>Recommendations</button><button onClick={() => navigate('/profile')}>Profile</button></nav>
        <section className="dashboard-metrics">
          <div><span className="metric-icon clay"><Icon name="box" /></span><span><small>Items recorded</small><strong>{ownedItems.length}</strong></span></div>
          <div><span className="metric-icon green"><Icon name="leaf" /></span><span><small>Still active</small><strong>{ownedItems.filter((item) => item.status === 'Active').length}</strong></span></div>
          <div><span className="metric-icon amber"><Icon name="clock" /></span><span><small>Needs attention</small><strong>{nearing}</strong></span></div>
          <div><span className="metric-icon blue">$</span><span><small>Recorded cost</small><strong>${totalCost.toLocaleString('en-AU')}</strong></span></div>
        </section>
        {duplicateCategories > 0 && <div className="dashboard-insight"><span><Icon name="spark" size={20} /></span><div><strong>You have overlap in {duplicateCategories} {duplicateCategories === 1 ? 'category' : 'categories'}.</strong><p>We’ll flag those items when you check another purchase in the same category.</p></div><button onClick={() => navigate('/recommendations')}>See your guidance <Icon name="arrow" size={15} /></button></div>}
        <div className="dashboard-section-head"><div><h2>Current items</h2><p>Sorted by items that may need attention first.</p></div><FilterSelect label="Show" value="all" onChange={() => {}}><option value="all">All statuses</option></FilterSelect></div>
        {ownedItems.length ? <div className="owned-grid">{ownedItems.map((item) => <OwnershipCard key={item.id} item={item} onRemove={onRemove} />)}</div> : <div className="empty-card"><span><Icon name="box" size={28} /></span><h2>Your shelf is empty.</h2><p>Add the things you already own to make purchase guidance personal.</p><button className="button button-ink" onClick={onAdd}>Add your first item</button></div>}
      </div>
    </main>
  );
}

function RecommendationsPage({ session, ownedItems, products, navigate, onSignIn, savedIds, onSave }) {
  if (!session) return <main className="page-shell"><div className="site-width"><AuthGate title="Recommendations with a memory." copy="WorthIt? uses your private ownership history to suggest what may last—and what you may not need at all." onSignIn={onSignIn} /></div></main>;
  const oldItem = ownedItems.find((item) => { try { return calculateLifespanDetails(item, TODAY).remainingLifespanPercentage < 20; } catch { return false; } });
  const notNeeded = products.filter((product) => ownedItems.some((item) => item.category === product.category)).slice(0, 3);
  const durable = [...products].filter((product) => product.rating >= 4.5).sort((a, b) => b.lifespanMonths - a.lifespanMonths).slice(0, 3);
  return (
    <main className="page-shell recommendations-page"><div className="site-width">
      <div className="page-title-row"><div><div className="eyebrow accent">Personal guidance</div><h1>For you, with reasons.</h1><p>Every suggestion shows the ownership or community signal behind it.</p></div></div>
      <nav className="account-tabs"><button onClick={() => navigate('/dashboard')}>Your things</button><button onClick={() => navigate('/saved')}>Saved products</button><button className="active">Recommendations</button><button onClick={() => navigate('/profile')}>Profile</button></nav>
      {oldItem && <section className="replacement-callout"><span className={`mini-visual palette-${oldItem.palette}`}>{oldItem.glyph}</span><div><div className="eyebrow light">Possible replacement moment</div><h2>Your {oldItem.name} has passed its expected lifespan.</h2><p>It’s marked {oldItem.status.toLowerCase()}. Check repair options before replacing it.</p></div><button className="button button-paper" onClick={() => navigate(`/discover?q=${oldItem.categoryLabel}`)}>Explore carefully <Icon name="arrow" size={15} /></button></section>}
      <section className="section compact-section"><SectionHeading eyebrow="Products you may not need" title="Good products, familiar jobs" description="These overlap with an active category on your private shelf." /><div className="product-grid three-up">{notNeeded.map((product) => <ProductCard key={product.id} product={product} navigate={navigate} saved={savedIds.includes(product.id)} onSave={onSave} showPersonal ownedItems={ownedItems} />)}</div></section>
      <section className="section compact-section"><SectionHeading eyebrow="Long-lasting alternatives" title="Community favourites with staying power" description="High owner ratings, long expected life, and enough reviews to be useful." /><div className="product-grid three-up">{durable.map((product) => <ProductCard key={product.id} product={product} navigate={navigate} saved={savedIds.includes(product.id)} onSave={onSave} />)}</div></section>
    </div></main>
  );
}

function SavedPage({ session, products, savedIds, onSave, navigate, onSignIn, ownedItems }) {
  if (!session) return <main className="page-shell"><div className="site-width"><AuthGate title="Keep a shortlist, not a cart." copy="Save products for later research without urgency, promotions or checkout pressure." onSignIn={onSignIn} /></div></main>;
  const savedProducts = products.filter((product) => savedIds.includes(product.id));
  return <main className="page-shell"><div className="site-width"><div className="page-title-row"><div><div className="eyebrow accent">Your shortlist</div><h1>Saved for <em>later.</em></h1><p>No price alerts or scarcity nudges—just a place to think.</p></div></div><nav className="account-tabs"><button onClick={() => navigate('/dashboard')}>Your things</button><button className="active">Saved products <span>{savedProducts.length}</span></button><button onClick={() => navigate('/recommendations')}>Recommendations</button><button onClick={() => navigate('/profile')}>Profile</button></nav>{savedProducts.length ? <div className="product-grid three-up saved-grid">{savedProducts.map((product) => <ProductCard key={product.id} product={product} navigate={navigate} saved onSave={onSave} showPersonal ownedItems={ownedItems} />)}</div> : <div className="empty-card"><span><Icon name="bookmark" size={28} /></span><h2>Nothing saved yet.</h2><p>Use the bookmark on any product to build a calm research list.</p><button className="button button-ink" onClick={() => navigate('/discover')}>Explore products</button></div>}</div></main>;
}

function ContributePage({ session, products, onSignIn, navigate, onProductAdded }) {
  const [tab, setTab] = useState('experience');
  const [form, setForm] = useState({ name: '', brand: '', model: '', category: 'electronics', officialUrl: '', price: '', lifespan: '48', lifespanSource: '' });
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState('');
  if (!session) return <main className="page-shell"><div className="site-width"><AuthGate title="Contributions need a real person." copy="A verified phone number helps keep product records and experiences accountable. It is never displayed publicly." onSignIn={onSignIn} /></div></main>;
  const terms = `${form.name} ${form.brand} ${form.model}`.trim().toLowerCase().split(/\s+/).filter((term) => term.length > 2);
  const matches = terms.length ? products.filter((product) => terms.some((term) => `${product.name} ${product.brand} ${product.model}`.toLowerCase().includes(term))).slice(0, 3) : [];
  const submitProduct = (event) => {
    event.preventDefault();
    setMessage('');
    if (matches.length && !confirmed) { setMessage('Please check the possible matches and confirm this is a different product.'); return; }
    const newProduct = { id: `${form.brand}-${form.model || form.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: form.name, brand: form.brand, model: form.model, category: form.category, categoryLabel: categories.find((item) => item.id === form.category)?.label || form.category, price: Number(form.price), currency: 'AUD', rating: 0, reviewCount: 0, owners: 0, longTermOwners: 0, buyAgain: 0, lifespanMonths: Number(form.lifespan), repairability: 0, releaseYear: 2026, validation: 'Community submitted', trendingRank: 999, savedCount: 0, palette: 'sage', glyph: '◇', summary: 'New community-submitted product awaiting independent validation.', discussion: '', distribution: [0, 0, 0, 0, 0], officialUrl: form.officialUrl, specs: [['Expected lifespan source', form.lifespanSource]] };
    onProductAdded(newProduct);
    setMessage('success');
  };
  return (
    <main className="page-shell contribute-page"><div className="site-width narrow-site">
      <div className="page-title-row centered"><div><div className="eyebrow accent">Contribute to WorthIt?</div><h1>Add what only a <em>person</em> can.</h1><p>Share an experience you actually had, or help build the objective product catalogue.</p></div></div>
      <div className="contribute-tabs"><button className={tab === 'experience' ? 'active' : ''} onClick={() => setTab('experience')}><Icon name="edit" size={18} />Review a product</button><button className={tab === 'product' ? 'active' : ''} onClick={() => setTab('product')}><Icon name="plus" size={18} />Add a missing product</button></div>
      {tab === 'experience' ? <div className="contribute-panel"><div className="form-intro"><span>1</span><div><h2>Which product did you use?</h2><p>Search the catalogue first so your experience lands in the right place.</p></div></div><div className="contribute-search"><Icon name="search" /><input placeholder="Search by product, brand or model" onChange={(event) => setMessage(event.target.value)} /></div><div className="quick-products">{products.filter((product) => !message || `${product.name} ${product.brand}`.toLowerCase().includes(message.toLowerCase())).slice(0, 5).map((product) => <button key={product.id} onClick={() => navigate(`/product/${product.id}`)}><span className={`tiny-product palette-${product.palette}`}>{product.glyph}</span><span><strong>{product.name}</strong><small>{product.categoryLabel} · {product.reviewCount} reviews</small></span><Icon name="chevron" size={16} /></button>)}</div></div> : (
        <form className="contribute-panel product-form" onSubmit={submitProduct}>
          <div className="form-intro"><span>1</span><div><h2>Start with the exact identity</h2><p>We check names, models and URLs before creating a new record.</p></div></div>
          <div className="field-grid two"><label><span>Product name *</span><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. AuraFlow NC1" /></label><label><span>Brand *</span><input required value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Brand name" /></label><label><span>Model or version *</span><input required value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Exact model" /></label><label><span>Category *</span><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.filter((item) => item.id !== 'all').map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="full-row"><span>Official manufacturer URL *</span><input required type="url" value={form.officialUrl} onChange={(e) => setForm({ ...form, officialUrl: e.target.value })} placeholder="https://manufacturer.example/product" /></label></div>
          {matches.length > 0 && <div className="duplicate-check"><div><Icon name="search" size={18} /><span><strong>Possible matches found</strong><small>Check these before you continue.</small></span></div>{matches.map((product) => <button type="button" key={product.id} onClick={() => navigate(`/product/${product.id}`)}><span>{product.name} · {product.model}</span><Icon name="external" size={14} /></button>)}<label className="check-filter"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /><i><Icon name="check" size={12} /></i> None of these is the same product</label></div>}
          <div className="form-intro form-step"><span>2</span><div><h2>Add useful, objective context</h2><p>Leave promotional claims out; link lifespan estimates to a source or explanation.</p></div></div>
          <div className="field-grid two"><label><span>Typical price (AUD) *</span><input required type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="299" /></label><label><span>Expected lifespan (months) *</span><input required type="number" min="1" value={form.lifespan} onChange={(e) => setForm({ ...form, lifespan: e.target.value })} /></label><label className="full-row"><span>Lifespan source or explanation *</span><textarea required value={form.lifespanSource} onChange={(e) => setForm({ ...form, lifespanSource: e.target.value })} placeholder="Explain where this estimate comes from…" /></label></div>
          {message && message !== 'success' && <div className="form-message error"><Icon name="info" size={15} />{message}</div>}{message === 'success' && <div className="form-message success"><Icon name="check" size={15} />Product submitted for community validation.</div>}
          <button className="button button-ink submit-product" type="submit">Submit product record <Icon name="arrow" size={16} /></button>
        </form>
      )}
    </div></main>
  );
}

function ProfilePage({ session, navigate, onSignIn, reviewCount }) {
  if (!session) return <main className="page-shell"><div className="site-width"><AuthGate title="Your public name, your private number." copy="Manage your display profile and contribution history. Your phone number is never visible here." onSignIn={onSignIn} /></div></main>;
  return <main className="page-shell"><div className="site-width profile-page"><nav className="account-tabs"><button onClick={() => navigate('/dashboard')}>Your things</button><button onClick={() => navigate('/saved')}>Saved products</button><button onClick={() => navigate('/recommendations')}>Recommendations</button><button className="active">Profile</button></nav><section className="profile-card"><div className="profile-hero"><span className="avatar profile-avatar">{session.initials}</span><div><div className="eyebrow light">Phone-verified member</div><h1>{session.displayName}</h1><p>{session.bio}</p></div><button className="button button-paper"><Icon name="edit" size={15} /> Edit profile</button></div><div className="profile-stats"><div><strong>{reviewCount}</strong><span>Experiences shared</span></div><div><strong>0</strong><span>Helpful votes received</span></div><div><strong>{session.memberSince}</strong><span>Member since</span></div></div></section><section className="profile-privacy"><span><Icon name="lock" size={21} /></span><div><h2>Your private information stays private.</h2><p>Your verified phone number and ownership dashboard are not part of your public profile.</p></div><button>Privacy settings <Icon name="chevron" size={15} /></button></section></div></main>;
}

function TextPage({ type, navigate }) {
  const guidelines = type === 'guidelines';
  return <main className="page-shell text-page"><div className="site-width text-layout"><aside><button onClick={() => navigate('/guidelines')} className={guidelines ? 'active' : ''}>Community guidelines</button><button onClick={() => navigate('/privacy')} className={!guidelines ? 'active' : ''}>Privacy</button></aside><article><div className="eyebrow accent">{guidelines ? 'Trust on WorthIt?' : 'Private by default'}</div><h1>{guidelines ? 'Useful experience, shared honestly.' : 'Your data should help you—not expose you.'}</h1><p className="lead">{guidelines ? 'WorthIt? is built around first-party experience. These rules keep the catalogue human, useful and accountable.' : 'We collect only what the service needs and keep ownership information private to the signed-in member.'}</p>{guidelines ? <><h2>Reviews come from this community</h2><p>Do not copy reviews from other websites or present generated text as personal experience. Every published review is tied to a phone-verified account, and the reviewer’s relationship to the product stays visible.</p><h2>Be clear about your connection</h2><p>Say whether you own the product, used it through work, briefly tested it, received a discount, or have a commercial relationship with the brand. WorthIt? never invents a verified-purchase badge.</p><h2>Disagree with the experience, not the person</h2><p>Questions and disagreement are welcome. Harassment, spam and undisclosed commercial promotion can be reported and reviewed with an audit trail.</p><h2>Demonstration content</h2><p>This hackathon build includes clearly marked fictional fixture content so the interface can be evaluated. It must be replaced with authenticated first-party contributions before production.</p></> : <><h2>Your phone number</h2><p>Phone verification is used for account access and contribution accountability. It is never shown on public profiles, product records, reviews or comments.</p><h2>Your ownership dashboard</h2><p>Ownership records, purchase dates, prices, conditions and notes are private. Production deployment requires Supabase Row Level Security so only the owner can read or change those rows.</p><h2>Personal scores</h2><p>Scores are calculated deterministically from product community evidence and the signed-in user’s relevant owned items. They are guidance, not financial advice, and every factor is displayed.</p></>}</article></div></main>;
}

function AuthModal({ open, onClose, onVerified }) {
  const [mode, setMode] = useState('signin');
  const [stage, setStage] = useState('details');
  const [identifier, setIdentifier] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signup, setSignup] = useState({ email: '', username: '', password: '', country: '+61', phone: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!open) return;
    setMode('signin'); setStage('details'); setIdentifier(''); setSignInPassword('');
    setSignup({ email: '', username: '', password: '', country: '+61', phone: '' });
    setShowPassword(false); setCode(''); setError(''); setCooldown(0);
  }, [open]);
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);
  if (!open) return null;

  const switchMode = (nextMode) => { setMode(nextMode); setStage('details'); setError(''); setCode(''); };
  const signIn = (event) => {
    event.preventDefault(); setError('');
    const normalizedIdentifier = identifier.trim().toLowerCase();
    if (!normalizedIdentifier || !signInPassword) { setError('Enter your username or email and password.'); return; }
    const storedAccounts = readStored(STORAGE.accounts, []);
    const storedAccount = storedAccounts.find((account) => account.username.toLowerCase() === normalizedIdentifier || account.email.toLowerCase() === normalizedIdentifier);
    const isDemoAccount = [demoCredentials.identifier, demoCredentials.alternateIdentifier].includes(normalizedIdentifier) && signInPassword === demoCredentials.password;
    const isStoredAccount = storedAccount && storedAccount.passwordHash === localPasswordHash(signInPassword);
    if (!isDemoAccount && !isStoredAccount) { setError('That username/email and password combination was not recognised.'); return; }
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      onVerified(isDemoAccount ? currentUser : storedAccount.profile);
    }, 300);
  };

  const phoneDigits = signup.phone.replace(/\D/g, '').replace(/^0/, '');
  const maskedPhone = `${signup.country} ••• ••• ${phoneDigits.slice(-3)}`;
  const startSignup = (event) => {
    event.preventDefault(); setError('');
    const email = signup.email.trim().toLowerCase();
    const username = signup.username.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address.'); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(username)) { setError('Username must be 3–20 characters using letters, numbers or underscores.'); return; }
    if (signup.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (phoneDigits.length < 8 || phoneDigits.length > 12) { setError('Enter a valid phone number, including the area code.'); return; }
    const accounts = readStored(STORAGE.accounts, []);
    if ([currentUser.email, ...accounts.map((account) => account.email)].some((value) => value.toLowerCase() === email)) { setError('An account already uses that email address.'); return; }
    if ([currentUser.username, ...accounts.map((account) => account.username)].some((value) => value.toLowerCase() === username)) { setError('That username is already taken.'); return; }
    setLoading(true);
    window.setTimeout(() => { setLoading(false); setStage('otp'); setCooldown(30); }, 350);
  };

  const verifySignup = (event) => {
    event.preventDefault(); setError('');
    if (code !== '123456') { setError(code.length < 6 ? 'Enter the full 6-digit code.' : 'That code is incorrect or expired. Use 123456 in this local demo.'); return; }
    const username = signup.username.trim().toLowerCase();
    const profile = {
      id: `local-${Date.now()}`,
      displayName: username,
      username,
      email: signup.email.trim().toLowerCase(),
      initials: username.slice(0, 2).toUpperCase(),
      role: 'member',
      phoneVerified: true,
      bio: 'New WorthIt? community member.',
      memberSince: 'July 2026',
    };
    const account = { username, email: profile.email, passwordHash: localPasswordHash(signup.password), phoneVerified: true, phoneLastFour: phoneDigits.slice(-4), profile };
    const nextAccounts = [...readStored(STORAGE.accounts, []), account];
    window.localStorage.setItem(STORAGE.accounts, JSON.stringify(nextAccounts));
    setLoading(true);
    window.setTimeout(() => { setLoading(false); onVerified(profile); }, 300);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal auth-modal credentials-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="modal-close" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        <Logo onClick={() => {}} compact />
        {stage === 'details' && <div className="auth-mode-tabs"><button className={mode === 'signin' ? 'active' : ''} onClick={() => switchMode('signin')}>Sign in</button><button className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')}>Create account</button></div>}

        {mode === 'signin' && stage === 'details' && <>
          <h2 id="auth-title">Sign in</h2>
          <p>Use your username or email and password.</p>
          <form className="credentials-form" onSubmit={signIn}>
            <label><span>Username or email</span><input required value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" autoFocus /></label>
            <label><span>Password</span><div className="password-field"><input required type={showPassword ? 'text' : 'password'} value={signInPassword} onChange={(event) => setSignInPassword(event.target.value)} autoComplete="current-password" /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
            {error && <div className="auth-error"><Icon name="info" size={15} />{error}</div>}
            <button className="button button-ink full auth-primary" disabled={loading}>{loading ? <span className="spinner" /> : 'Sign in'}</button>
          </form>
          <div className="demo-login-note"><span>Demo account</span><code>maya</code><code>worthit123</code></div>
          <p className="auth-switch-line">New to WorthIt? <button onClick={() => switchMode('signup')}>Create an account</button></p>
        </>}

        {mode === 'signup' && stage === 'details' && <>
          <h2 id="auth-title">Create account</h2>
          <p>Your phone is verified once during sign-up and is never displayed publicly.</p>
          <form className="credentials-form signup-form" onSubmit={startSignup}>
            <label><span>Email</span><input required type="email" value={signup.email} onChange={(event) => setSignup({ ...signup, email: event.target.value })} autoComplete="email" autoFocus /></label>
            <label><span>Username</span><input required minLength="3" maxLength="20" value={signup.username} onChange={(event) => setSignup({ ...signup, username: event.target.value })} autoComplete="username" /></label>
            <label><span>Password</span><div className="password-field"><input required minLength="8" type={showPassword ? 'text' : 'password'} value={signup.password} onChange={(event) => setSignup({ ...signup, password: event.target.value })} autoComplete="new-password" /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></div><small>At least 8 characters</small></label>
            <label><span>Phone number</span><div className="phone-field"><select aria-label="Country code" value={signup.country} onChange={(event) => setSignup({ ...signup, country: event.target.value })}><option value="+61">🇦🇺 +61</option><option value="+64">🇳🇿 +64</option><option value="+1">🇺🇸 +1</option><option value="+44">🇬🇧 +44</option></select><input required aria-label="Phone number" value={signup.phone} onChange={(event) => setSignup({ ...signup, phone: event.target.value })} inputMode="tel" autoComplete="tel" placeholder="412 345 678" /></div></label>
            {error && <div className="auth-error"><Icon name="info" size={15} />{error}</div>}
            <button className="button button-ink full auth-primary" disabled={loading}>{loading ? <span className="spinner" /> : <>Continue to phone verification <Icon name="arrow" size={16} /></>}</button>
          </form>
          <p className="auth-switch-line">Already have an account? <button onClick={() => switchMode('signin')}>Sign in</button></p>
        </>}

        {mode === 'signup' && stage === 'otp' && <>
          <button className="auth-back" onClick={() => { setStage('details'); setError(''); }}>← Back to account details</button>
          <div className="auth-icon"><Icon name="phone" size={24} /></div>
          <div className="eyebrow accent">Final sign-up step</div>
          <h2 id="auth-title">Verify your phone</h2>
          <p>Enter the code sent to <strong>{maskedPhone}</strong>.</p>
          <form className="credentials-form" onSubmit={verifySignup}>
            <label><span>Verification code</span><input className="otp-input" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" inputMode="numeric" autoComplete="one-time-code" autoFocus /></label>
            {error && <div className="auth-error"><Icon name="info" size={15} />{error}</div>}
            <div className="local-code-note"><Icon name="info" size={15} /><span>Local development code: <strong>123456</strong></span></div>
            <button className="button button-ink full auth-primary" disabled={loading || code.length !== 6}>{loading ? <span className="spinner" /> : <>Verify phone & create account <Icon name="arrow" size={16} /></>}</button>
            <button type="button" className="resend-button" disabled={cooldown > 0} onClick={() => setCooldown(30)}>{cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend code'}</button>
          </form>
        </>}
        <div className="auth-privacy"><Icon name="shield" size={16} /><span>Credentials are local-demo data. Production uses server-side password hashing and SMS verification.</span></div>
      </section>
    </div>
  );
}

function ReviewModal({ product, existing, onClose, onSubmit }) {
  const [form, setForm] = useState(existing || { rating: 0, relationship: 'Currently own it', title: '', text: '', prosText: '', consText: '', wouldBuyAgain: true });
  const submit = (event) => {
    event.preventDefault();
    if (!form.rating) return;
    onSubmit({ ...form, pros: (form.prosText || '').split(',').map((item) => item.trim()).filter(Boolean), cons: (form.consText || '').split(',').map((item) => item.trim()).filter(Boolean) });
  };
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className="modal form-modal" role="dialog" aria-modal="true"><button className="modal-close" onClick={onClose}><Icon name="close" /></button><div className="eyebrow accent">{existing ? 'Edit your experience' : 'A first-party experience'}</div><h2>{product.name}</h2><p>Your written review is optional. A rating and honest relationship to the product are required.</p><form onSubmit={submit}><fieldset className="rating-field"><legend>Your rating *</legend><div>{[1, 2, 3, 4, 5].map((star) => <button type="button" key={star} className={star <= form.rating ? 'active' : ''} onClick={() => setForm({ ...form, rating: star })} aria-label={`${star} stars`}>★</button>)}</div><span>{form.rating ? `${form.rating} out of 5` : 'Choose a rating'}</span></fieldset><label><span>Relationship to this product *</span><select value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })}><option>Currently own it</option><option>Previously owned it</option><option>Used regularly through work</option><option>Briefly tested it</option><option>Do not own it</option></select></label><label><span>Review title</span><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Sum up your experience" /></label><label><span>What was it like to live with?</span><textarea rows="5" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="Useful details, changes over time, what surprised you…" /></label><div className="field-grid two"><label><span>Pros <small>(comma separated)</small></span><input value={form.prosText || ''} onChange={(e) => setForm({ ...form, prosText: e.target.value })} placeholder="Comfort, repair support" /></label><label><span>Cons <small>(comma separated)</small></span><input value={form.consText || ''} onChange={(e) => setForm({ ...form, consText: e.target.value })} placeholder="Battery, documentation" /></label></div><label className="toggle-row"><input type="checkbox" checked={form.wouldBuyAgain} onChange={(e) => setForm({ ...form, wouldBuyAgain: e.target.checked })} /><i /><span>I would buy it again</span></label><div className="review-honesty"><Icon name="shield" size={17} /><span>By submitting, you confirm this is your own experience and you have disclosed commercial relationships.</span></div><button className="button button-ink full" type="submit" disabled={!form.rating}>{existing ? 'Save changes' : 'Publish experience'} <Icon name="arrow" size={16} /></button></form></section></div>;
}

function OwnedModal({ product, products, onClose, onSubmit }) {
  const first = product || products[0];
  const [productId, setProductId] = useState(first.id);
  const [form, setForm] = useState({ purchaseDate: '2025-01-01', purchasePrice: first.price || '', expectedLifespanMonths: first.lifespanMonths || 48, condition: 'Good', status: 'Active', notes: '' });
  const selected = products.find((item) => item.id === productId) || first;
  const submit = (event) => { event.preventDefault(); onSubmit({ ...form, productId: selected.id, name: selected.name, category: selected.category, categoryLabel: selected.categoryLabel, purchasePrice: Number(form.purchasePrice), expectedLifespanMonths: Number(form.expectedLifespanMonths), glyph: selected.glyph, palette: selected.palette, id: `owned-${Date.now()}` }); };
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className="modal form-modal owned-modal"><button className="modal-close" onClick={onClose}><Icon name="close" /></button><div className="eyebrow accent">Private ownership record</div><h2>Add something you own</h2><p>This information is used for your guidance and is never shown on your public profile.</p><form onSubmit={submit}><label><span>Product *</span><select value={productId} onChange={(e) => { const next = products.find((item) => item.id === e.target.value); setProductId(e.target.value); setForm({ ...form, purchasePrice: next.price, expectedLifespanMonths: next.lifespanMonths }); }}>{products.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.categoryLabel}</option>)}</select></label><div className="field-grid two"><label><span>Purchase date *</span><input required type="date" max={TODAY} value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} /></label><label><span>Purchase price (AUD)</span><input type="number" min="0" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} /></label><label><span>Expected lifespan (months) *</span><input required type="number" min="1" value={form.expectedLifespanMonths} onChange={(e) => setForm({ ...form, expectedLifespanMonths: e.target.value })} /></label><label><span>Condition *</span><select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}><option>Excellent</option><option>Good</option><option>Fair</option><option>Damaged</option></select></label><label className="full-row"><span>Status *</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Active</option><option>Damaged</option><option>Being repaired</option><option>Replaced</option><option>Sold</option><option>Donated</option><option>Recycled</option><option>Disposed</option></select></label><label className="full-row"><span>Notes</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Repairs, parts replaced, how it is holding up…" /></label></div><div className="review-honesty"><Icon name="lock" size={16} /><span>Private to your account. You can update or remove this at any time.</span></div><button className="button button-ink full" type="submit">Add to your things <Icon name="arrow" size={16} /></button></form></section></div>;
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  return <div className={`toast toast-${toast.tone || 'success'}`} role="status"><span><Icon name={toast.tone === 'error' ? 'info' : 'check'} size={16} /></span><p>{toast.message}</p><button onClick={onClose}><Icon name="close" size={15} /></button></div>;
}

function Footer({ navigate }) {
  return <footer className="footer"><div className="site-width footer-top"><div className="footer-brand"><Logo onClick={() => navigate('/')} /><p>Buy less. Choose well. Keep things longer.</p><span>Human-led product guidance.</span></div><div><strong>Explore</strong><button onClick={() => navigate('/discover')}>Browse products</button><button onClick={() => navigate('/community')}>Community discussions</button><button onClick={() => navigate('/contribute')}>Share an experience</button></div><div><strong>Your space</strong><button onClick={() => navigate('/dashboard')}>Your things</button><button onClick={() => navigate('/saved')}>Saved products</button><button onClick={() => navigate('/recommendations')}>Recommendations</button></div><div><strong>Trust</strong><button onClick={() => navigate('/guidelines')}>Community guidelines</button><button onClick={() => navigate('/privacy')}>Privacy</button><span>No review scraping</span></div></div><div className="site-width footer-bottom"><span>© 2026 WorthIt? · Hackathon demonstration</span><span>Made for things worth keeping <Icon name="leaf" size={14} /></span></div></footer>;
}

function App() {
  const [route, setRoute] = useState(getRoute);
  const [session, setSession] = useState(() => readStored(STORAGE.session, null));
  const [savedIds, setSavedIds] = useState(() => readStored(STORAGE.saved, []));
  const [ownedItems, setOwnedItems] = useState(() => readStored(STORAGE.owned, demoOwnedItems));
  const [userReviews, setUserReviews] = useState(() => readStored(STORAGE.reviews, []));
  const [helpfulIds, setHelpfulIds] = useState([]);
  const [products, setProducts] = useState(initialProducts);
  const [authOpen, setAuthOpen] = useState(false);
  const [reviewProduct, setReviewProduct] = useState(null);
  const [ownedProduct, setOwnedProduct] = useState(null);
  const [ownedModalOpen, setOwnedModalOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const pendingAction = useRef(null);

  useEffect(() => {
    const onHash = () => { setRoute(getRoute()); setMobileOpen(false); window.scrollTo({ top: 0, behavior: 'instant' }); };
    window.addEventListener('hashchange', onHash);
    if (!window.location.hash) window.location.hash = '/';
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const navigate = (path) => { window.location.hash = path; };
  const requireAuth = (action) => {
    if (session) { action?.(); return true; }
    pendingAction.current = action || null;
    setAuthOpen(true);
    return false;
  };
  const verified = (profile) => {
    window.localStorage.setItem(STORAGE.session, JSON.stringify(profile));
    setSession(profile); setAuthOpen(false); setToast({ message: `Welcome, ${profile.displayName.split(' ')[0]}. You’re signed in.` });
    const action = pendingAction.current; pendingAction.current = null;
    window.setTimeout(() => action?.(), 80);
  };
  const signOut = () => { window.localStorage.removeItem(STORAGE.session); setSession(null); navigate('/'); setToast({ message: 'You have been signed out.' }); };
  const toggleSave = (productId) => requireAuth(() => {
    const removing = savedIds.includes(productId);
    const next = removing ? savedIds.filter((id) => id !== productId) : [...savedIds, productId];
    setSavedIds(next); window.localStorage.setItem(STORAGE.saved, JSON.stringify(next));
    setToast({ message: removing ? 'Removed from your saved products.' : 'Saved for later—no urgency attached.' });
  });
  const openOwned = (product = null) => { setOwnedProduct(product); setOwnedModalOpen(true); };
  const addOwned = (item) => {
    const next = [item, ...ownedItems]; setOwnedItems(next); window.localStorage.setItem(STORAGE.owned, JSON.stringify(next));
    setOwnedModalOpen(false); setOwnedProduct(null); setToast({ message: `${item.name} was added to your private shelf.` });
  };
  const removeOwned = (id) => {
    const next = ownedItems.filter((item) => item.id !== id); setOwnedItems(next); window.localStorage.setItem(STORAGE.owned, JSON.stringify(next)); setToast({ message: 'Item removed from your private shelf.' });
  };
  const submitReview = (data) => {
    const existing = userReviews.find((review) => review.productId === reviewProduct.id);
    const activeUser = session || currentUser;
    const review = { ...data, id: existing?.id || `user-review-${Date.now()}`, productId: reviewProduct.id, userId: activeUser.id, user: activeUser.displayName, initials: activeUser.initials, ownershipMonths: 0, helpful: existing?.helpful || 0, comments: existing?.comments || 0, date: new Date().toISOString(), demo: false, commercialRelationship: false };
    const next = [review, ...userReviews.filter((item) => item.productId !== reviewProduct.id)]; setUserReviews(next); window.localStorage.setItem(STORAGE.reviews, JSON.stringify(next)); setReviewProduct(null); setToast({ message: existing ? 'Your experience was updated.' : 'Your experience is now part of this local demo.' });
  };
  const toggleHelpful = (reviewId) => { setHelpfulIds((ids) => ids.includes(reviewId) ? ids.filter((id) => id !== reviewId) : [...ids, reviewId]); setToast({ message: helpfulIds.includes(reviewId) ? 'Helpful vote removed.' : 'Marked as helpful.' }); };
  const addComment = () => setToast({ message: 'Your comment was added to this local discussion.' });
  const reportReview = () => setToast({ message: 'Report received. A moderator would review it with an audit trail.' });
  const addProduct = (product) => { setProducts((items) => [product, ...items]); setToast({ message: `${product.name} was submitted for community validation.` }); };

  let content;
  if (route.path === '/') content = <HomePage navigate={navigate} products={products} savedIds={savedIds} onSave={toggleSave} session={session} ownedItems={ownedItems} />;
  else if (route.path === '/discover') content = <DiscoverPage route={route} navigate={navigate} products={products} savedIds={savedIds} onSave={toggleSave} session={session} ownedItems={ownedItems} />;
  else if (route.path === '/community') content = <CommunityPage navigate={navigate} products={products} onContribute={() => requireAuth(() => navigate('/contribute'))} />;
  else if (route.path.startsWith('/product/')) {
    const product = products.find((item) => item.id === route.path.split('/')[2]);
    content = product ? <ProductPage product={product} navigate={navigate} savedIds={savedIds} onSave={toggleSave} session={session} ownedItems={ownedItems} requireAuth={requireAuth} onOpenReview={setReviewProduct} onOpenOwned={openOwned} userReviews={userReviews} helpfulIds={helpfulIds} onHelpful={toggleHelpful} onComment={addComment} onReport={reportReview} /> : <div className="site-width empty-card page-empty"><h1>Product not found</h1><button className="button button-ink" onClick={() => navigate('/discover')}>Browse the catalogue</button></div>;
  } else if (route.path === '/dashboard') content = <DashboardPage session={session} ownedItems={ownedItems} navigate={navigate} onSignIn={() => requireAuth(() => navigate('/dashboard'))} onAdd={() => requireAuth(() => openOwned())} onRemove={removeOwned} />;
  else if (route.path === '/saved') content = <SavedPage session={session} products={products} savedIds={savedIds} onSave={toggleSave} navigate={navigate} onSignIn={() => requireAuth(() => navigate('/saved'))} ownedItems={ownedItems} />;
  else if (route.path === '/recommendations') content = <RecommendationsPage session={session} ownedItems={ownedItems} products={products} navigate={navigate} onSignIn={() => requireAuth(() => navigate('/recommendations'))} savedIds={savedIds} onSave={toggleSave} />;
  else if (route.path === '/contribute') content = <ContributePage session={session} products={products} onSignIn={() => requireAuth(() => navigate('/contribute'))} navigate={navigate} onProductAdded={addProduct} />;
  else if (route.path === '/profile') content = <ProfilePage session={session} navigate={navigate} onSignIn={() => requireAuth(() => navigate('/profile'))} reviewCount={userReviews.length} />;
  else if (route.path === '/guidelines') content = <TextPage type="guidelines" navigate={navigate} />;
  else if (route.path === '/privacy') content = <TextPage type="privacy" navigate={navigate} />;
  else content = <HomePage navigate={navigate} products={products} savedIds={savedIds} onSave={toggleSave} session={session} ownedItems={ownedItems} />;

  return (
    <div className="app">
      <DemoBanner />
      <Header route={route} navigate={navigate} session={session} onSignIn={() => requireAuth()} onSignOut={signOut} onContribute={() => requireAuth(() => navigate('/contribute'))} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      {content}
      <Footer navigate={navigate} />
      <AuthModal open={authOpen} onClose={() => { setAuthOpen(false); pendingAction.current = null; }} onVerified={verified} />
      {reviewProduct && <ReviewModal product={reviewProduct} existing={userReviews.find((review) => review.productId === reviewProduct.id)} onClose={() => setReviewProduct(null)} onSubmit={submitReview} />}
      {ownedModalOpen && <OwnedModal product={ownedProduct} products={products.filter((product) => product.rating > 0)} onClose={() => { setOwnedModalOpen(false); setOwnedProduct(null); }} onSubmit={addOwned} />}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

export default App;
