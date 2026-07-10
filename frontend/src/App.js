import { useState, useEffect, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import SearchPanel from './components/SearchPanel';
import AuthForm from './components/AuthForm';
import './App.css';

const API = 'http://localhost:3001/api';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [inventory, setInventory] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }), [token]);

  const fetchInventory = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/inventory`, { headers: authHeaders() });
      if (res.status === 401) { logout(); return; }
      const data = await res.json();
      setInventory(data);
    } catch (e) {
      console.error('Failed to fetch inventory:', e);
    }
  }, [token, authHeaders]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleAuth = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setInventory([]);
    setSearchResults(null);
  };

  const addToInventory = async (item) => {
    try {
      const res = await fetch(`${API}/inventory`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(item)
      });
      if (res.ok) fetchInventory();
    } catch (e) {
      console.error('Failed to add item:', e);
    }
  };

  const removeFromInventory = async (id) => {
    try {
      const res = await fetch(`${API}/inventory/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (res.ok) setInventory(inventory.filter(item => item.id !== id));
    } catch (e) {
      console.error('Failed to remove item:', e);
    }
  };

  if (!token) {
    return (
      <div className="app">
        <AuthForm onAuth={handleAuth} />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <h1>placeholdername</h1>
          <span className="logo-dot" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <nav className="tabs">
            <button
              className={activeTab === 'dashboard' ? 'active' : ''}
              onClick={() => setActiveTab('dashboard')}
            >
              Inventory
            </button>
            <button
              className={activeTab === 'search' ? 'active' : ''}
              onClick={() => setActiveTab('search')}
            >
              Lookup
            </button>
          </nav>
          <button className="logout-btn" onClick={logout}>Log out</button>
        </div>
      </header>
      <main className="app-main">
        {activeTab === 'dashboard' && (
          <Dashboard
            inventory={inventory}
            onRemove={removeFromInventory}
            onAdd={addToInventory}
          />
        )}
        {activeTab === 'search' && (
          <SearchPanel
            token={token}
            searchResults={searchResults}
            setSearchResults={setSearchResults}
          />
        )}
      </main>
    </div>
  );
}

export default App;
