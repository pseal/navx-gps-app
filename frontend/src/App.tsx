// src/App.tsx
import React, { useState, useCallback, useEffect } from 'react';
import MapView from './components/MapView';
import SearchInput from './components/SearchInput';
import DirectionsPanel from './components/DirectionsPanel';
import NavHUD from './components/NavHUD';
import Toast from './components/Toast';
import FavoritesPanel from './components/FavoritesPanel';
import { SearchSuggestion, TravelMode, RouteInfo, Coordinates, FavoritePlace } from './types';
import { fetchRoute, reverseGeocode } from './services/api';
import { formatETA, getModeIcon, snapToRoute } from './utils/helpers';
import { useGeolocation, useWatchPosition } from './utils/hooks';
import { loadFavorites } from './services/favorites';
import { voice } from './services/voice';

interface ToastItem { id: number; message: string; type: 'info' | 'error' | 'success'; }

const MOBILE = window.innerWidth <= 768;

const App: React.FC = () => {
  // ── Mobile view toggle — 'panel' or 'map', no transitions ───────────────────
  const [mobileView, setMobileView] = useState<'panel' | 'map'>('panel');

  // ── Inputs ───────────────────────────────────────────────────────────────────
  const [originText,   setOriginText]   = useState('');
  const [destText,     setDestText]     = useState('');
  const [originCoords, setOriginCoords] = useState<Coordinates | null>(null);
  const [destCoords,   setDestCoords]   = useState<Coordinates | null>(null);
  const [lastSelected, setLastSelected] = useState<SearchSuggestion | null>(null);

  // ── Route ────────────────────────────────────────────────────────────────────
  const [travelMode,     setTravelMode]     = useState<TravelMode>('driving');
  const [route,          setRoute]          = useState<RouteInfo | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // ── Navigation ───────────────────────────────────────────────────────────────
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStep,  setCurrentStep]  = useState(0);
  const [panToUser,    setPanToUser]    = useState(false);

  // ── Map style ────────────────────────────────────────────────────────────────
  const [mapStyle, setMapStyle] = useState<'default' | 'satellite'>('default');

  // ── Voice ────────────────────────────────────────────────────────────────────
  const [voiceOn, setVoiceOn] = useState(true);

  // ── Favorites ────────────────────────────────────────────────────────────────
  const [favorites,   setFavorites]   = useState<FavoritePlace[]>([]);
  const [pendingSave, setPendingSave] = useState<SearchSuggestion | null>(null);

  // ── Panel tab ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'route' | 'favorites'>('route');

  // ── Toasts ───────────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const showToast = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);
  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── Geolocation ──────────────────────────────────────────────────────────────
  const { loading: geoLoading, getLocation } = useGeolocation();
  const watchedPos = useWatchPosition(isNavigating);
  const userLocation: Coordinates | null = watchedPos
    ? { lat: watchedPos.coords.latitude, lon: watchedPos.coords.longitude }
    : null;

  useEffect(() => { setFavorites(loadFavorites()); }, []);

  useEffect(() => {
    if (!isNavigating || !route) return;
    const step = route.steps[currentStep];
    if (!step) return;
    if (currentStep === route.steps.length - 1) voice.announceArrival();
    else voice.announceStep(step.instruction, step.distance);
  }, [currentStep, isNavigating, route]);

  useEffect(() => {
    if (isNavigating && userLocation && route) {
      const idx = snapToRoute(userLocation.lat, userLocation.lon, route.steps);
      setCurrentStep(idx);
    }
  }, [isNavigating, userLocation, route]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleUseLocation = () => {
    getLocation(async (lat, lon) => {
      const suggestion = await reverseGeocode(lat, lon);
      setOriginCoords({ lat, lon });
      setOriginText(suggestion?.shortName || 'My Location');
      if (suggestion) setLastSelected(suggestion);
      showToast('Location detected ✓', 'success');
    });
  };

  const handleOriginSelect = (s: SearchSuggestion) => {
    setOriginCoords(s.coordinates);
    setOriginText(s.shortName);
    setLastSelected(s);
  };

  const handleDestSelect = (s: SearchSuggestion) => {
    setDestCoords(s.coordinates);
    setDestText(s.shortName);
    setLastSelected(s);
  };

  const handleFavSelect = (s: SearchSuggestion, field: 'origin' | 'destination') => {
    if (field === 'origin') { setOriginCoords(s.coordinates); setOriginText(s.shortName); }
    else                    { setDestCoords(s.coordinates);   setDestText(s.shortName); }
    setActiveTab('route');
  };

  const handleCalculateRoute = async () => {
    if (!originCoords || !destCoords) {
      showToast('Select both origin and destination from suggestions', 'error');
      return;
    }
    setIsLoadingRoute(true);
    setRoute(null);
    setCurrentStep(0);
    try {
      const result = await fetchRoute(originCoords, destCoords, travelMode);
      if (result) {
        setRoute(result);
        showToast(`Route found: ${result.summary}`, 'success');
        if (MOBILE) setMobileView('map');
      } else {
        showToast('No route found — try different locations', 'error');
      }
    } catch {
      showToast('Route calculation failed. Check your connection.', 'error');
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const handleStartNavigation = () => {
    if (!route) return;
    setIsNavigating(true);
    setCurrentStep(0);
    setPanToUser(true);
    voice.announceRouteStart(route.summary);
    showToast('Navigation started!', 'success');
    if (MOBILE) setMobileView('map');
  };

  const handleStopNavigation = () => {
    setIsNavigating(false);
    setPanToUser(false);
    voice.cancel();
    showToast('Navigation ended');
  };

  const handleClearAll = () => {
    setRoute(null);
    setOriginCoords(null); setDestCoords(null);
    setOriginText('');     setDestText('');
    setIsNavigating(false);
    voice.cancel();
  };

  const handleCenterOnUser = () => {
    setPanToUser(true);
    setTimeout(() => setPanToUser(false), 200);
  };

  const handleToggleVoice = () => {
    const on = voice.toggle();
    setVoiceOn(on);
    showToast(on ? '🔊 Voice on' : '🔇 Voice off');
  };

  const canRoute = !!originCoords && !!destCoords;
  const modes: { mode: TravelMode; label: string; icon: string }[] = [
    { mode: 'driving', label: 'Drive', icon: '🚗' },
    { mode: 'walking', label: 'Walk',  icon: '🚶' },
    { mode: 'cycling', label: 'Cycle', icon: '🚴' },
  ];

  // ── Panel content ─────────────────────────────────────────────────────────────
  const panelContent = (
    <>
      {/* Panel tabs */}
      <div className="panel-tabs">
        <button className={`ptab ${activeTab === 'route' ? 'active' : ''}`} onClick={() => setActiveTab('route')}>🗺️ Route</button>
        <button className={`ptab ${activeTab === 'favorites' ? 'active' : ''}`} onClick={() => setActiveTab('favorites')}>⭐ Saved</button>
      </div>

      {activeTab === 'route' && (
        <>
          <div className="mode-tabs">
            {modes.map(({ mode, label, icon }) => (
              <button key={mode} className={`mode-tab ${travelMode === mode ? 'active' : ''}`}
                onClick={() => { setTravelMode(mode); setRoute(null); }}>
                <span className="mode-icon">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="search-section">
            {originCoords && destCoords && <div className="search-connector" />}
            <SearchInput
              placeholder="From: Enter departure point..."
              value={originText}
              onChange={(v) => { setOriginText(v); if (!v) setOriginCoords(null); }}
              onSelect={handleOriginSelect}
              onLocationClick={handleUseLocation}
              variant="origin"
              locationLoading={geoLoading}
            />
            <SearchInput
              placeholder="To: Enter destination..."
              value={destText}
              onChange={(v) => { setDestText(v); if (!v) setDestCoords(null); }}
              onSelect={handleDestSelect}
              variant="destination"
            />
            {lastSelected && (
              <button className="save-place-btn"
                onClick={() => { setPendingSave(lastSelected); setActiveTab('favorites'); }}>
                ♡ Save place
              </button>
            )}
          </div>

          {!isNavigating && (
            <div className="route-cta">
              <button
                className={`btn-navigate ${isLoadingRoute ? 'loading' : ''}`}
                onClick={handleCalculateRoute}
                disabled={!canRoute || isLoadingRoute}
              >
                {isLoadingRoute ? <><span className="spinner" /> Calculating…</> : <>{getModeIcon(travelMode)} Get Route</>}
              </button>
            </div>
          )}

          {route && !isNavigating && (
            <>
              <div className="route-info-bar">
                <div className="route-stats">
                  <div className="stat">
                    <div className="stat-value">{(route.distance / 1000).toFixed(1)}</div>
                    <div className="stat-label">km</div>
                  </div>
                  <div className="stat">
                    <div className="stat-value">{Math.round(route.duration / 60)}</div>
                    <div className="stat-label">min</div>
                  </div>
                  <div className="stat">
                    <div className="stat-value" style={{ fontSize: 12 }}>{formatETA(route.duration)}</div>
                    <div className="stat-label">ETA</div>
                  </div>
                </div>
              </div>
              <div className="route-cta">
                <button className="btn-navigate" onClick={handleStartNavigation}>▶ Start Navigation</button>
              </div>
              <DirectionsPanel route={route} activeStep={currentStep} onStepClick={setCurrentStep} />
            </>
          )}

          {!route && !isLoadingRoute && (
            <div className="empty-state">
              <div className="empty-icon">🗺️</div>
              <div className="empty-title">Plan your journey</div>
              <div className="empty-sub">Type a place and pick from suggestions.<br />Driving, walking & cycling supported.</div>
            </div>
          )}

          {isNavigating && route && (
            <DirectionsPanel route={route} activeStep={currentStep} onStepClick={setCurrentStep} />
          )}
        </>
      )}

      {activeTab === 'favorites' && (
        <FavoritesPanel
          favorites={favorites}
          onSelect={handleFavSelect}
          onUpdate={() => setFavorites(loadFavorites())}
          pendingSave={pendingSave}
          onClearPending={() => setPendingSave(null)}
        />
      )}
    </>
  );

  // ── Map content ───────────────────────────────────────────────────────────────
  const mapContent = (
    <>
      <MapView
        origin={originCoords}
        destination={destCoords}
        userLocation={userLocation}
        route={route}
        activeStepIdx={currentStep}
        panToUser={panToUser}
        mapStyle={mapStyle}
      />
      <div className="map-top-bar">
        <button className="map-btn" onClick={handleCenterOnUser} title="Center">◎</button>
        <button className="map-btn" onClick={() => setMapStyle(s => s === 'default' ? 'satellite' : 'default')}
          style={{ color: mapStyle === 'satellite' ? '#00d4ff' : undefined }}>
          {mapStyle === 'satellite' ? '🗺️' : '🛰️'}
        </button>
        <button className="map-btn" onClick={handleToggleVoice}
          style={{ color: voiceOn ? '#00ff9d' : '#4a5568' }}>
          {voiceOn ? '🔊' : '🔇'}
        </button>
        <button className="map-btn" onClick={handleClearAll} title="Clear">↺</button>
      </div>
      {isNavigating && route && (
        <NavHUD route={route} currentStepIdx={currentStep} onStop={handleStopNavigation} />
      )}
      {!MOBILE && (
        <div className="status-bar">
          <div className="status-dot" />
          <span>NavX v1.0</span>
          <span className="status-sep">|</span>
          <span>OSM · OSRM · ORS</span>
          <span className="status-sep">|</span>
          <span>{getModeIcon(travelMode)} {travelMode.charAt(0).toUpperCase() + travelMode.slice(1)}</span>
          {route && <><span className="status-sep">|</span><span style={{ color: '#00d4ff' }}>{route.summary}</span></>}
          {voiceOn && <><span className="status-sep">|</span><span>🔊 Voice</span></>}
        </div>
      )}
    </>
  );

  // ── MOBILE layout — full screen switch, no overlap ────────────────────────────
  if (MOBILE) {
    return (
      <div style={{ width: '100vw', height: '100dvh', background: '#0a0e1a', overflow: 'hidden', position: 'fixed', inset: 0 }}>

        {/* Map view — full screen, only rendered when showing map */}
        <div style={{
          position: 'absolute', inset: 0,
          visibility: mobileView === 'map' ? 'visible' : 'hidden',
          pointerEvents: mobileView === 'map' ? 'auto' : 'none',
          zIndex: mobileView === 'map' ? 1 : 0,
        }}>
          {mapContent}
          {/* Back to panel button */}
          <button
            onClick={() => setMobileView('panel')}
            style={{
              position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              background: '#111827', border: '1px solid #1e2d45', borderRadius: 24,
              color: '#f0f4ff', padding: '10px 24px', fontSize: 13, fontWeight: 600,
              zIndex: 900, cursor: 'pointer', whiteSpace: 'nowrap',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}
          >☰ Route Panel</button>
        </div>

        {/* Panel view — full screen, only rendered when showing panel */}
        <div style={{
          position: 'absolute', inset: 0,
          visibility: mobileView === 'panel' ? 'visible' : 'hidden',
          pointerEvents: mobileView === 'panel' ? 'auto' : 'none',
          zIndex: mobileView === 'panel' ? 2 : 0,
          display: 'flex',
          flexDirection: 'column',
          background: '#060910',
          overflowY: 'auto',
        }}>
          {/* Header */}
          <header className="panel-header" style={{ flexShrink: 0 }}>
            <div className="brand">
              <div className="brand-icon">🗺️</div>
              <div className="brand-name">Nav<span>X</span></div>
            </div>
            <div className="brand-tagline">GPS Navigation · Offline-Ready</div>
          </header>

          {/* Show map button */}
          <div style={{ padding: '8px 16px', flexShrink: 0 }}>
            <button
              onClick={() => setMobileView('map')}
              style={{
                width: '100%', background: 'rgba(0,212,255,0.08)',
                border: '1px solid rgba(0,212,255,0.25)', borderRadius: 8,
                color: '#00d4ff', padding: '9px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer',
              }}
            >🗺️ View Map</button>
          </div>

          {panelContent}
        </div>

        {/* Toasts */}
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} onDismiss={() => dismissToast(toast.id)} />
        ))}
      </div>
    );
  }

  // ── DESKTOP layout ────────────────────────────────────────────────────────────
  return (
    <div className="app-wrapper">
      <aside className="nav-panel">
        <header className="panel-header">
          <div className="brand">
            <div className="brand-icon">🗺️</div>
            <div className="brand-name">Nav<span>X</span></div>
          </div>
          <div className="brand-tagline">GPS Navigation · Offline-Ready</div>
        </header>
        {panelContent}
      </aside>

      <main className="map-container">
        {mapContent}
      </main>

      {toasts.map(toast => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onDismiss={() => dismissToast(toast.id)} />
      ))}
    </div>
  );
};

export default App;
