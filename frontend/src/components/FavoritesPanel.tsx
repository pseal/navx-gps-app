// src/components/FavoritesPanel.tsx
import React, { useState } from 'react';
import { FavoritePlace, SearchSuggestion } from '../types';
import { deleteFavorite, saveFavorite } from '../services/favorites';

interface FavoritesPanelProps {
  favorites: FavoritePlace[];
  onSelect: (suggestion: SearchSuggestion, field: 'origin' | 'destination') => void;
  onUpdate: () => void;
  pendingSave: SearchSuggestion | null;
  onClearPending: () => void;
}

const ICONS = ['🏠', '🏢', '🏋️', '🛒', '🍽️', '🏥', '🏫', '⭐', '❤️', '📍'];

const FavoritesPanel: React.FC<FavoritesPanelProps> = ({
  favorites, onSelect, onUpdate, pendingSave, onClearPending,
}) => {
  const [saveName, setSaveName]   = useState('');
  const [saveIcon, setSaveIcon]   = useState('⭐');
  const [showSave, setShowSave]   = useState(false);

  React.useEffect(() => {
    if (pendingSave) { setShowSave(true); setSaveName(pendingSave.shortName); }
  }, [pendingSave]);

  const handleSave = () => {
    if (!pendingSave || !saveName.trim()) return;
    saveFavorite(pendingSave, saveName.trim(), saveIcon);
    onUpdate();
    setShowSave(false);
    setSaveName('');
    onClearPending();
  };

  return (
    <div className="favorites-panel">
      <div className="fav-header">
        <span className="fav-title">⭐ Saved Places</span>
        {pendingSave && !showSave && (
          <button className="fav-add-btn" onClick={() => setShowSave(true)}>+ Save</button>
        )}
      </div>

      {/* Save form */}
      {showSave && pendingSave && (
        <div className="fav-save-form">
          <div className="fav-icon-picker">
            {ICONS.map(ic => (
              <button
                key={ic}
                className={`icon-opt ${saveIcon === ic ? 'selected' : ''}`}
                onClick={() => setSaveIcon(ic)}
              >{ic}</button>
            ))}
          </div>
          <div className="fav-save-row">
            <input
              type="text"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              placeholder="Name this place..."
              className="fav-name-input"
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <button className="fav-confirm-btn" onClick={handleSave}>Save</button>
            <button className="fav-cancel-btn" onClick={() => { setShowSave(false); onClearPending(); }}>✕</button>
          </div>
        </div>
      )}

      {/* Favorites list */}
      {favorites.length === 0 && !showSave && (
        <div className="fav-empty">Search a place then tap ♡ to save it here</div>
      )}

      <div className="fav-list">
        {favorites.map(fav => (
          <div key={fav.id} className="fav-item">
            <div className="fav-icon">{fav.icon}</div>
            <div className="fav-info">
              <div className="fav-name">{fav.name}</div>
              <div className="fav-addr">{fav.suggestion.displayName}</div>
            </div>
            <div className="fav-actions">
              <button
                className="fav-use-btn"
                title="Set as origin"
                onClick={() => onSelect(fav.suggestion, 'origin')}
              >A</button>
              <button
                className="fav-use-btn dest"
                title="Set as destination"
                onClick={() => onSelect(fav.suggestion, 'destination')}
              >B</button>
              <button
                className="fav-del-btn"
                title="Remove"
                onClick={() => { deleteFavorite(fav.id); onUpdate(); }}
              >✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FavoritesPanel;
