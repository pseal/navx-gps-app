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

const App: React.FC = () => {
  // ── Mobile detection ─────────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showMap,  setShowMap]  = useState(window.innerWidth > 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setShowMap(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Load favorites on mount
  useEffect(() => { setFavorites(loadFavorites()); }, []);

  // Voice: announce step changes
  useEffect(() => {
    if (!isNavigating || !route) return;
    const step = route.steps[currentStep];
    if (!step) return;
    if (currentStep === route.steps.length - 1) {
      voice.announceArrival();
    } else {
      voice.announceStep(step.instruction, step.distance);
    }
  }, [currentStep, isNavigating, route]);

  // Auto-advance step based on GPS
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
    if (isMobile) setShowMap(false);
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
        if (isMobile) setShowMap(true); // auto-show map when route found
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
    if (isMobile) setShowMap(true);
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
    showToast(on ? '🔊 Voice guidance on' : '🔇 Voice guidance off');
  };

  const canRoute = !!originCoords && !!destCoords;
  const modes: { mode: TravelMode; label: string; icon: string }[] = [
    { mode: 'driving', label: 'Drive', icon: '🚗' },
    { mode: 'walking', label: 'Walk',  icon: '🚶' },
    { mode: 'cycling', label: 'Cycle', icon: '🚴' },
  ];

  // ── Mobile layout styles ──────────────────────────────────────────────────────
  const mobileMapStyle: React.CSSProperties | undefined = isMobile ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: showMap ? '55vh' : '100vh',
    zIndex: 1,
    transition: 'bottom 0.35s ease',
  } : undefined;

  const mobilePanelStyle: React.CSSProperties | undefined = isMobile ? {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    top: showMap ? '45vh' : 0,
    width: '100%',
    height: showMap ? '55vh' : '100dvh',
    zIndex: 500,
    overflowY: 'auto',
    transition: 'all 0.35s ease',
    borderRadius: showMap ? '20px 20px 0 0' : 0,
    borderTop: showMap ? '2px solid #1e2d45' : 'none',
  } : undefined;

  return (
    <div className="app-wrapper">

      {/* ── Side / Bottom Panel ─────────────────────────────────────────────── */}
      <aside className="nav-panel" style={mobilePanelStyle}>

        {/* Mobile drag handle + map toggle */}
        {isMobile && (
          <div className="mobile-handle" onClick={() => setShowMap(s => !s)}>
            <div className="handle-bar" />
            <span className="handle-label">
              {showMap ? '▼ Expand panel' : '▲ Show map'}
            </span>
          </div>
        )}

        {/* Brand — hide on mobile when map showing */}
        {(!isMobile || !showMap) && (
          <header className="panel-header">
            <div className="brand">
              <div className="brand-icon">🗺️</div>
              <div className="brand-name">Nav<span>X</span></div>
            </div>
            <div className="brand-tagline">GPS Navigation · Offline-Ready</div>
          </header>
        )}

        {/* Panel tabs */}
        <div className="panel-tabs">
          <button
            className={`ptab ${activeTab === 'route' ? 'active' : ''}`}
            onClick={() => setActiveTab('route')}
          >🗺️ Route</button>
          <button
            className={`ptab ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
          >⭐ Saved</button>
        </div>

        {/* ── ROUTE TAB ── */}
        {activeTab === 'route' && (
          <>
            <div className="mode-tabs">
              {modes.map(({ mode, label, icon }) => (
                <button
                  key={mode}
                  className={`mode-tab ${travelMode === mode ? 'active' : ''}`}
                  onClick={() => { setTravelMode(mode); setRoute(null); }}
                >
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
                <button
                  className="save-place-btn"
                  onClick={() => { setPendingSave(lastSelected); setActiveTab('favorites'); }}
                >♡ Save place</button>
              )}
            </div>

            {!isNavigating && (
              <div className="route-cta">
                <button
                  className={`btn-navigate ${isLoadingRoute ? 'loading' : ''}`}
                  onClick={handleCalculateRoute}
                  disabled={!canRoute || isLoadingRoute}
                >
                  {isLoadingRoute
                    ? <><span className="spinner" /> Calculating…</>
                    : <>{getModeIcon(travelMode)} Get Route</>}
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
                  <button className="btn-navigate" onClick={handleStartNavigation}>
                    ▶ Start Navigation
                  </button>
                </div>
                <DirectionsPanel route={route} activeStep={currentStep} onStepClick={setCurrentStep} />
              </>
            )}

            {!route && !isLoadingRoute && (
              <div className="empty-state">
                <div className="empty-icon">🗺️</div>
                <div className="empty-title">Plan your journey</div>
                <div className="empty-sub">
                  Type a place and pick from suggestions.<br />
                  Driving, walking & cycling supported.
                </div>
              </div>
            )}

            {isNavigating && route && (
              <DirectionsPanel route={route} activeStep={currentStep} onStepClick={setCurrentStep} />
            )}
          </>
        )}

        {/* ── FAVORITES TAB ── */}
        {activeTab === 'favorites' && (
          <FavoritesPanel
            favorites={favorites}
            onSelect={handleFavSelect}
            onUpdate={() => setFavorites(loadFavorites())}
            pendingSave={pendingSave}
            onClearPending={() => setPendingSave(null)}
          />
        )}

      </aside>

      {/* ── Map ─────────────────────────────────────────────────────────────── */}
      <main className="map-container" style={mobileMapStyle}>
        <MapView
          origin={originCoords}
          destination={destCoords}
          userLocation={userLocation}
          route={route}
          activeStepIdx={currentStep}
          panToUser={panToUser}
          mapStyle={mapStyle}
        />

        {/* Map controls */}
        <div className="map-top-bar">
          <button className="map-btn" title="Center on me" onClick={handleCenterOnUser}>◎</button>
          <button
            className="map-btn"
            title={mapStyle === 'satellite' ? 'Default map' : 'Satellite view'}
            onClick={() => setMapStyle(s => s === 'default' ? 'satellite' : 'default')}
            style={{ color: mapStyle === 'satellite' ? '#00d4ff' : undefined }}
          >{mapStyle === 'satellite' ? '🗺️' : '🛰️'}</button>
          <button
            className="map-btn"
            title={voiceOn ? 'Mute voice' : 'Enable voice'}
            onClick={handleToggleVoice}
            style={{ color: voiceOn ? '#00ff9d' : '#4a5568' }}
          >{voiceOn ? '🔊' : '🔇'}</button>
          <button className="map-btn" title="Clear route" onClick={handleClearAll}>↺</button>
        </div>

        {/* Active nav HUD */}
        {isNavigating && route && (
          <NavHUD route={route} currentStepIdx={currentStep} onStop={handleStopNavigation} />
        )}

        {/* Status bar — desktop only */}
        {!isMobile && (
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
      </main>

      {/* Toasts */}
      {toasts.map(toast => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onDismiss={() => dismissToast(toast.id)} />
      ))}
    </div>
  );
};

export default App;
