import { useState } from 'react';
import StarRating from './StarRating';

const API = 'http://localhost:3001/api';

function SearchPanel({ token, searchResults, setSearchResults }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`${API}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productName: query.trim() })
      });
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const getSentimentClass = (sentiment) => {
    if (sentiment >= 4) return 'sentiment-positive';
    if (sentiment >= 2.5) return 'sentiment-neutral';
    return 'sentiment-negative';
  };

  const getSentimentLabel = (sentiment) => {
    if (sentiment >= 4) return 'positive';
    if (sentiment >= 2.5) return 'mixed';
    return 'negative';
  };

  return (
    <div>
      <h2 className="section-title" style={{ marginBottom: '1.2rem' }}>Product lookup</h2>

      <div className="search-container">
        <form className="search-box" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="What are you thinking of buying?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" disabled={loading || !query.trim()}>
            {loading ? 'Searching...' : 'Look up'}
          </button>
        </form>
      </div>

      {loading && (
        <div className="loading">
          <div className="loading-dots">
            <span /><span /><span />
          </div>
          <span className="loading-text">Scraping Reddit for real reviews...</span>
        </div>
      )}

      {searchResults && !loading && (
        <div className="results-section">
          <h2 className="results-title">
            Results for <span>{searchResults.product}</span>
          </h2>

          <div className="ratings-row">
            <div className="rating-card reddit">
              <h3>Community rating</h3>
              <div className="rating-number">{searchResults.redditRating}</div>
              <StarRating rating={searchResults.redditRating} />
              <p className="rating-subtitle">
                from {searchResults.redditReviews.length} Reddit threads
              </p>
            </div>

            <div className="rating-card inventory">
              <h3>Your inventory score</h3>
              <div className="rating-number">{searchResults.inventoryRating.overall}</div>
              <StarRating rating={searchResults.inventoryRating.overall} />
              <div className="rating-breakdown">
                <div>
                  <span>similar owned</span>
                  <span>{searchResults.inventoryRating.breakdown.similarItems}</span>
                </div>
                <div>
                  <span>avg ownership</span>
                  <span>{searchResults.inventoryRating.breakdown.ownershipMonths}mo</span>
                </div>
                <div>
                  <span>lifespan used</span>
                  <span>{searchResults.inventoryRating.breakdown.lifespanRatio}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="alternatives-section">
            <h2>Alternatives from Reddit comments</h2>
            {searchResults.alternatives.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No alternatives found in comments.</p>
            ) : (
              <div className="alt-list">
                {searchResults.alternatives.map((alt, i) => (
                  <div key={i} className="alternative-item">
                    <span className="alt-rank">{i + 1}</span>
                    <div className="alt-content">
                      <h4>{alt.name}</h4>
                      <p>{alt.reason}</p>
                      <a href={alt.url} target="_blank" rel="noopener noreferrer" className="alt-source">
                        {alt.source}
                      </a>
                    </div>
                    <span className={`alt-badge ${alt.type === 'Second-hand' ? 'secondhand' : 'cheaper'}`}>
                      {alt.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="reviews-section">
            <h2>Reddit threads</h2>
            {searchResults.redditReviews.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No reviews found.</p>
            ) : (
              <div className="review-list">
                {searchResults.redditReviews.map((review, i) => (
                  <div key={i} className="review-item">
                    <div className="review-header">
                      <h4>{review.title}</h4>
                      <span className={`review-sentiment ${getSentimentClass(review.sentiment)}`}>
                        {getSentimentLabel(review.sentiment)}
                      </span>
                    </div>
                    <div className="review-meta">
                      r/{review.subreddit} · {review.score} pts
                    </div>
                    {review.snippet && (
                      <p className="review-snippet">{review.snippet}</p>
                    )}
                    <a href={review.url} target="_blank" rel="noopener noreferrer" className="review-link">
                      Open thread →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchPanel;
