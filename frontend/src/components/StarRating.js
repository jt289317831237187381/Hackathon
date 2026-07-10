function StarRating({ rating }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) {
      stars.push(<span key={i} className="star-filled">&#9733;</span>);
    } else if (i - 0.5 <= rating) {
      stars.push(<span key={i} className="star-filled">&#9733;</span>);
    } else {
      stars.push(<span key={i} className="star-empty">&#9733;</span>);
    }
  }

  return <div className="rating-stars">{stars}</div>;
}

export default StarRating;
