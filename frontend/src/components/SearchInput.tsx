// src/components/SearchInput.tsx
import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { SearchSuggestion } from '../types';
import { useSearch } from '../utils/hooks';
import { getTypeIcon } from '../utils/helpers';

interface SearchInputProps {
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  onSelect: (suggestion: SearchSuggestion) => void;
  onLocationClick?: () => void;
  variant: 'origin' | 'destination';
  locationLoading?: boolean;
}

const SearchInput: React.FC<SearchInputProps> = ({
  placeholder, value, onChange, onSelect, onLocationClick, variant, locationLoading,
}) => {
  const [focused, setFocused] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const { suggestions, loading, clearSuggestions } = useSearch(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const showDropdown = focused && (suggestions.length > 0 || loading) && value.length >= 2;

  useEffect(() => { setHighlightIdx(-1); }, [suggestions]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && highlightIdx >= 0) { handleSelect(suggestions[highlightIdx]); }
    if (e.key === 'Escape') { inputRef.current?.blur(); clearSuggestions(); }
  };

  const handleSelect = (s: SearchSuggestion) => {
    onSelect(s);
    onChange(s.shortName);
    clearSuggestions();
    inputRef.current?.blur();
  };

  return (
    <div className="search-field">
      <div className={`search-dot ${variant}`}>
        {variant === 'origin' ? 'A' : 'B'}
      </div>

      <div className="search-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 180)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          className={`input-clear ${value ? 'visible' : ''}`}
          onClick={() => { onChange(''); clearSuggestions(); }}
          tabIndex={-1}
          aria-label="Clear"
        >✕</button>

        {showDropdown && (
          <div className="suggestions-dropdown" ref={dropdownRef}>
            {loading && (
              <div className="suggestions-loading">
                <span className="spinner" />
                <span>Searching...</span>
              </div>
            )}
            {!loading && suggestions.map((s, idx) => (
              <div
                key={s.id}
                className={`suggestion-item ${idx === highlightIdx ? 'highlighted' : ''}`}
                onMouseDown={() => handleSelect(s)}
                onMouseEnter={() => setHighlightIdx(idx)}
              >
                <div className="sug-icon">{getTypeIcon(s.type)}</div>
                <div className="sug-info">
                  <div className="sug-name">{s.shortName}</div>
                  <div className="sug-detail">{s.displayName}</div>
                </div>
                <div className="sug-type">{s.type}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {onLocationClick && (
        <button
          className={`location-btn ${locationLoading ? 'loading' : ''}`}
          onClick={onLocationClick}
          title="Use current location"
          aria-label="Use my location"
        >
          {locationLoading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '◎'}
        </button>
      )}
    </div>
  );
};

export default SearchInput;
