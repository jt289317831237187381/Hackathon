import { useState } from 'react';

function Dashboard({ inventory, onRemove, onAdd }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    purchaseDate: '',
    expectedLifespan: 24,
    condition: 'Good'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.purchaseDate) return;
    onAdd({
      name: formData.name,
      category: formData.category,
      purchaseDate: formData.purchaseDate,
      expectedLifespan: Number(formData.expectedLifespan),
      condition: formData.condition
    });
    setFormData({ name: '', category: '', purchaseDate: '', expectedLifespan: 24, condition: 'Good' });
    setShowForm(false);
  };

  const getPurchaseDate = (item) => item.purchase_date || item.purchaseDate;
  const getLifespan = (item) => item.expected_lifespan || item.expectedLifespan;

  const getLifespanPercent = (item) => {
    const ownedMonths = (Date.now() - new Date(getPurchaseDate(item)).getTime()) / (1000 * 60 * 60 * 24 * 30);
    return Math.min(100, (ownedMonths / getLifespan(item)) * 100);
  };

  const getLifespanColor = (percent) => {
    if (percent < 50) return '#2d6a4f';
    if (percent < 75) return '#b5890a';
    return '#c1121f';
  };

  const getOwnedDuration = (item) => {
    const months = Math.floor((Date.now() - new Date(getPurchaseDate(item)).getTime()) / (1000 * 60 * 60 * 24 * 30));
    if (months < 1) return '<1mo';
    if (months < 12) return `${months}mo`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${years}y ${rem}mo` : `${years}y`;
  };

  return (
    <div>
      <div className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h2 className="section-title">Your stuff</h2>
          <span className="item-count">{inventory.length}</span>
        </div>
        <button className="add-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {showForm && (
        <form className="add-form" onSubmit={handleSubmit}>
          <h3>New item</h3>
          <div className="form-grid">
            <input
              placeholder="Product name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <input
              placeholder="Category (e.g. headphones)"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            />
            <input
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              required
            />
            <input
              type="number"
              placeholder="Lifespan (months)"
              value={formData.expectedLifespan}
              onChange={(e) => setFormData({ ...formData, expectedLifespan: e.target.value })}
              min="1"
            />
            <select
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
            >
              <option value="New">New</option>
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
            </select>
          </div>
          <button type="submit" className="submit-btn">Add to inventory</button>
        </form>
      )}

      {inventory.length === 0 ? (
        <div className="empty-state">
          <p>Nothing here yet. Add your first item.</p>
        </div>
      ) : (
        <div className="inventory-grid">
          {inventory.map((item) => {
            const lifespanPercent = getLifespanPercent(item);
            return (
              <div key={item.id} className="inventory-item">
                <h3>{item.name}</h3>
                <div className="meta">
                  <span>{item.category}</span>
                  <span>owned {getOwnedDuration(item)}</span>
                </div>
                <span className={`condition condition-${item.condition.toLowerCase()}`}>
                  {item.condition}
                </span>
                <div className="lifespan-bar">
                  <div
                    className="lifespan-fill"
                    style={{
                      width: `${lifespanPercent}%`,
                      background: getLifespanColor(lifespanPercent)
                    }}
                  />
                </div>
                <div className="lifespan-label">
                  <span>{Math.round(lifespanPercent)}% used</span>
                  <span>{getLifespan(item)}mo lifespan</span>
                </div>
                <button className="remove-btn" onClick={() => onRemove(item.id)}>
                  remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
