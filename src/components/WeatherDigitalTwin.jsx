import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Cloud,
  CloudRain,
  Sun,
  Wind,
  Droplets,
  Eye,
  Thermometer,
  Clock,
  Compass,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  MapPin,
  Calendar,
  Layers,
  Info,
  Radio,
  PlusCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { fetchLiveDestinationWeather, simulateWeatherDigitalTwin } from '../services/api';

/**
 * Weather-Driven AI Digital Twin Component for Locora
 * 
 * Features:
 * 1. Live Weather Integration (OpenWeather API via server proxy)
 * 2. Real-World Public Meteorological Bulletin / Social Signal Integration
 * 3. Interactive What-If Simulation (Rain intensity, Temperature, Storm duration, Normal/Extreme presets)
 * 4. Geospatial Map with Weather Impact Markers & Weather Zone Overlay
 * 5. Probabilistic Confidence & Uncertainty Indicator
 * 6. AI Strategic Contingency Analysis (Gemini via server proxy)
 * 7. Non-destructive simulation: Real trip itinerary is NEVER modified automatically.
 */
// Reliable coordinate extractor from any experience/place shape
const getExperienceCoords = (exp) => {
  if (!exp) return null;
  const lat = exp.latitude ?? exp.lat ?? exp.location?.latitude ?? exp.location?.lat ?? exp.geometry?.location?.lat ?? exp.coords?.latitude;
  const lng = exp.longitude ?? exp.lng ?? exp.lon ?? exp.location?.longitude ?? exp.location?.lng ?? exp.geometry?.location?.lng ?? exp.coords?.longitude;
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (Number.isFinite(latNum) && Number.isFinite(lngNum) && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180) {
    return { lat: latNum, lng: lngNum };
  }
  return null;
};

// Client-side environment classifier to ensure instant shelter/exposure status
const classifyExperienceEnvironment = (exp) => {
  if (exp?.environment) return exp.environment;
  const text = [
    exp?.name || exp?.title || '',
    exp?.category || '',
    exp?.description || exp?.reason || '',
    exp?.whyVisit || '',
    exp?.address || ''
  ].join(' ').toLowerCase();

  const outdoorKeywords = [
    'outdoor', 'park', 'garden', 'hike', 'trail', 'viewpoint', 'peak', 'mountain',
    'pass', 'river', 'lake', 'waterfall', 'beach', 'walk', 'trek', 'terrace',
    'shrine walk', 'forest', 'canyon', 'valley', 'rooftop', 'bazaar', 'open-air',
    'safari', 'nature', 'sanctuary', 'cycling', 'promenade'
  ];

  const indoorKeywords = [
    'museum', 'gallery', 'cafe', 'coffee', 'tea', 'dining', 'restaurant',
    'workshop', 'pottery', 'cooking', 'craft', 'indoor', 'temple interior',
    'library', 'spa', 'bath', 'onsen', 'palace interior', 'market hall',
    'arcade', 'bistro', 'brewery', 'cellar', 'theatre', 'cultural center'
  ];

  let outdoorScore = 0;
  let indoorScore = 0;
  outdoorKeywords.forEach(k => { if (text.includes(k)) outdoorScore += 1; });
  indoorKeywords.forEach(k => { if (text.includes(k)) indoorScore += 1; });

  if (outdoorScore > indoorScore) return 'outdoor';
  if (indoorScore > outdoorScore) return 'indoor';
  return 'mixed';
};

function WeatherDigitalTwinInner({
  destinationLocation,
  experiences = [],
  activeTrip = null,
  onAddToItinerary = null,
  onAddToWishlist = null,
  wishlistIds = []
}) {
  const destName = destinationLocation?.destination || destinationLocation?.city || destinationLocation?.name || 'Selected Destination';
  const destLat = destinationLocation?.latitude;
  const destLng = destinationLocation?.longitude;

  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState('simulation'); // 'simulation' | 'geospatial' | 'forecast'
  
  // Live Weather State
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(null);

  // What-If Simulation State
  const [scenarioMode, setScenarioMode] = useState('live'); // 'live' | 'normal' | 'extreme' | 'custom'
  const [simRain, setSimRain] = useState(15);
  const [simTemp, setSimTemp] = useState(24);
  const [simDuration, setSimDuration] = useState(2);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [selectedMapItem, setSelectedMapItem] = useState(null);

  // Geospatial Radar Zoom & Viewport Pan State
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0, hasMoved: false });
  const radarContainerRef = useRef(null);

  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3.0;

  // Reset radar viewport when destination changes
  useEffect(() => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
    setSelectedMapItem(null);
  }, [destLat, destLng, destName]);

  // Native non-passive wheel event listener ensuring e.preventDefault() blocks browser window scroll
  useEffect(() => {
    const container = radarContainerRef.current;
    if (!container || activeTab !== 'geospatial') return;

    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;

      setZoomLevel(prevZoom => {
        const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((prevZoom * zoomFactor).toFixed(3))));
        if (nextZoom === prevZoom) return prevZoom;

        // Zoom toward mouse position
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - rect.width / 2;
        const mouseY = e.clientY - rect.top - rect.height / 2;

        setPanOffset(prevPan => {
          const ratio = nextZoom / prevZoom;
          const newPanX = mouseX - (mouseX - prevPan.x) * ratio;
          const newPanY = mouseY - (mouseY - prevPan.y) * ratio;
          const maxPan = 180 * (nextZoom - 0.4);
          return {
            x: Math.max(-maxPan, Math.min(maxPan, newPanX)),
            y: Math.max(-maxPan, Math.min(maxPan, newPanY))
          };
        });

        return nextZoom;
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [activeTab]);

  // Touch pinch-to-zoom handler
  useEffect(() => {
    const container = radarContainerRef.current;
    if (!container || activeTab !== 'geospatial') return;

    let initialDist = null;
    let initialZoom = 1.0;

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        initialDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        initialZoom = zoomLevel;
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2 && initialDist) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const scale = currentDist / initialDist;
        const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((initialZoom * scale).toFixed(3))));
        setZoomLevel(nextZoom);
      }
    };

    const handleTouchEnd = (e) => {
      if (e.touches.length < 2) {
        initialDist = null;
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [activeTab, zoomLevel]);

  const handleRadarMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('[data-radar-control="true"]')) return;

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      panX: panOffset.x,
      panY: panOffset.y,
      hasMoved: false
    };
    setIsDragging(true);
  };

  const handleRadarMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragStartRef.current.hasMoved = true;
    }

    const maxPan = 180 * (zoomLevel - 0.4);
    setPanOffset({
      x: Math.max(-maxPan, Math.min(maxPan, dragStartRef.current.panX + dx)),
      y: Math.max(-maxPan, Math.min(maxPan, dragStartRef.current.panY + dy))
    });
  };

  const handleRadarMouseUp = () => {
    setIsDragging(false);
  };

  // Race condition prevention: only the latest request should update state
  const weatherRequestIdRef = useRef(0);
  const weatherMismatchRetryRef = useRef(0);

  // 1. Fetch live destination weather whenever destination coordinates or name change
  const loadLiveWeather = async () => {
    if (!Number.isFinite(Number(destLat)) || !Number.isFinite(Number(destLng))) {
      setWeatherData(null);
      setWeatherLoading(false);
      return;
    }

    // Increment request ID to track which request is current
    const currentRequestId = ++weatherRequestIdRef.current;

    // CRITICAL: Clear stale weather data BEFORE fetching new destination weather
    // This prevents showing Panvel weather when Kyoto is selected during the loading period
    setWeatherData(null);
    setSimulationResult(null);
    setWeatherError(null);
    setWeatherLoading(true);

    try {
      const res = await fetchLiveDestinationWeather({
        latitude: destLat,
        longitude: destLng,
        destination: destName
      });

      // RACE CONDITION GUARD: If the destination changed while we were fetching,
      // discard this response — it belongs to an older destination
      if (currentRequestId !== weatherRequestIdRef.current) {
        console.log(`[WeatherDigitalTwin] Discarding stale weather response (requestId ${currentRequestId} vs current ${weatherRequestIdRef.current})`);
        return;
      }

      if (res && res.success) {
        const weatherLat = Number(res.location?.latitude ?? res.coordinates?.latitude);
        const weatherLng = Number(res.location?.longitude ?? res.coordinates?.longitude);
        const coordinatesMatch = Number.isFinite(weatherLat) && Number.isFinite(weatherLng)
          && Math.abs(weatherLat - Number(destLat)) <= 0.1
          && Math.abs(weatherLng - Number(destLng)) <= 0.1;

        if (!coordinatesMatch) {
          setWeatherData(null);
          setWeatherError('Weather location mismatch — refreshing destination weather.');
          if (weatherMismatchRetryRef.current < 1) {
            weatherMismatchRetryRef.current += 1;
            loadLiveWeather();
          }
          return;
        }

        setWeatherData(res);
        // Initialize simulation baseline with live weather values
        const liveRain = Number(res.rain?.probabilityPercent ?? 15);
        const liveTemp = Number(res.temperature ?? 24);
        setSimRain(liveRain);
        setSimTemp(liveTemp);
        setScenarioMode('live');
        
        // Run initial simulation using live conditions
        runSimulation({
          rainIntensity: liveRain,
          temperature: liveTemp,
          stormDurationHours: 2,
          preset: 'live'
        }, res);
      } else {
        setWeatherError(res?.error || 'Weather data temporarily unavailable.');
        // Still run fallback deterministic simulation so the digital twin remains interactive
        runSimulation({
          rainIntensity: simRain,
          temperature: simTemp,
          stormDurationHours: simDuration,
          preset: 'fallback'
        }, null);
      }
    } catch (err) {
      // Only set error if this is still the current request
      if (currentRequestId === weatherRequestIdRef.current) {
        setWeatherError('Weather data temporarily unavailable.');
      }
    } finally {
      // Only clear loading if this is still the current request
      if (currentRequestId === weatherRequestIdRef.current) {
        setWeatherLoading(false);
      }
    }
  };

  useEffect(() => {
    weatherMismatchRetryRef.current = 0;
    loadLiveWeather();
    return () => {
      weatherRequestIdRef.current += 1;
    };
  }, [destLat, destLng, destName]);

  // 2. Run What-If Simulation
  const runSimulation = async (scenarioParams = null, weatherContext = weatherData) => {
    setIsSimulating(true);
    const params = scenarioParams || {
      rainIntensity: simRain,
      temperature: simTemp,
      stormDurationHours: simDuration,
      preset: scenarioMode
    };

    try {
      const res = await simulateWeatherDigitalTwin({
        destination: destName,
        weather: weatherContext,
        scenario: params,
        experiences: experiences.slice(0, 16),
        activeTrip
      });

      if (res && res.success) {
        setSimulationResult(res);
      }
    } catch (err) {
      console.warn('Digital Twin simulation catch:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Preset Handlers
  const handleApplyNormalPreset = () => {
    setScenarioMode('normal');
    setSimRain(10);
    setSimTemp(23);
    setSimDuration(1);
    runSimulation({
      rainIntensity: 10,
      temperature: 23,
      stormDurationHours: 1,
      preset: 'normal'
    });
  };

  const handleApplyExtremePreset = () => {
    setScenarioMode('extreme');
    setSimRain(85);
    setSimTemp(16);
    setSimDuration(5);
    runSimulation({
      rainIntensity: 85,
      temperature: 16,
      stormDurationHours: 5,
      preset: 'extreme'
    });
  };

  const handleResetToLive = () => {
    setScenarioMode('live');
    if (weatherData) {
      const liveRain = Number(weatherData.rain?.probabilityPercent ?? 15);
      const liveTemp = Number(weatherData.temperature ?? 24);
      setSimRain(liveRain);
      setSimTemp(liveTemp);
      setSimDuration(2);
      runSimulation({
        rainIntensity: liveRain,
        temperature: liveTemp,
        stormDurationHours: 2,
        preset: 'live'
      });
    }
  };

  // Weather Icon Helper
  const getWeatherIcon = (condition = 'Clear') => {
    const c = condition.toLowerCase();
    if (c.includes('rain') || c.includes('drizzle')) return <CloudRain size={20} style={{ color: 'var(--accent-cyan)' }} />;
    if (c.includes('thunder') || c.includes('storm')) return <CloudRain size={20} style={{ color: 'var(--accent-amber)' }} />;
    if (c.includes('cloud')) return <Cloud size={20} style={{ color: '#94a3b8' }} />;
    return <Sun size={20} style={{ color: '#f59e0b' }} />;
  };

  // Synchronize simulation whenever real experiences arrive asynchronously
  useEffect(() => {
    if (experiences && experiences.length > 0 && weatherData) {
      runSimulation({
        rainIntensity: simRain,
        temperature: simTemp,
        stormDurationHours: simDuration,
        preset: scenarioMode
      }, weatherData);
    }
  }, [experiences, weatherData]);

  const centerLat = Number(destLat);
  const centerLng = Number(destLng);
  const hasCenterCoords = Number.isFinite(centerLat) && Number.isFinite(centerLng) && centerLat >= -90 && centerLat <= 90 && centerLng >= -180 && centerLng <= 180;

  // Real candidate pool: evaluated experiences first, fallback to raw experiences if simulation hasn't returned yet
  const candidatePool = useMemo(() => {
    if (Array.isArray(simulationResult?.evaluatedExperiences) && simulationResult.evaluatedExperiences.length > 0) {
      return simulationResult.evaluatedExperiences;
    }
    if (Array.isArray(experiences) && experiences.length > 0) {
      return experiences;
    }
    return [];
  }, [simulationResult, experiences]);

  // Extract, validate, classify, and calculate relative distances for real points
  const geospatialPoints = useMemo(() => {
    if (!hasCenterCoords || candidatePool.length === 0) return [];

    const valid = [];
    const seenIds = new Set();

    for (let i = 0; i < candidatePool.length; i++) {
      const exp = candidatePool[i];
      if (!exp) continue;
      const coords = getExperienceCoords(exp);
      if (!coords) continue;

      const id = exp.id || exp.placeId || `${coords.lat.toFixed(5)}_${coords.lng.toFixed(5)}`;
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const env = exp.environment || classifyExperienceEnvironment(exp);
      const isSheltered = env === 'indoor' || exp.impactStatus === 'optimal_shelter' || exp.impactStatus === 'suitable';

      // Real distance in km using geographic delta from center
      const dLat = coords.lat - centerLat;
      const dLng = coords.lng - centerLng;
      const cosLat = Math.cos((centerLat * Math.PI) / 180);
      const dLatKm = dLat * 111.32;
      const dLngKm = dLng * 111.32 * cosLat;
      const distKm = Math.sqrt(dLatKm * dLatKm + dLngKm * dLngKm);

      valid.push({
        ...exp,
        coords,
        env,
        isSheltered,
        dLatKm,
        dLngKm,
        distKm
      });
    }

    // Diagnostic logging per STEP 2
    console.log('[Radar] destination:', destName);
    console.log('[Radar] coordinates:', centerLat, centerLng);
    console.log('[Radar] experiences count:', experiences?.length);
    console.log('[Radar] valid geospatial points:', valid.length);

    return valid;
  }, [hasCenterCoords, centerLat, centerLng, candidatePool, experiences, destName]);

  // Radar Viewport Scale & Relative Spatial Placement (Step 6)
  const radarScale = useMemo(() => {
    if (geospatialPoints.length === 0) {
      return { maxKm: 5, pixelRadius: 105, pointsWithPixels: [] };
    }

    const maxDist = Math.max(...geospatialPoints.map(p => p.distKm));
    // Dynamic maxKm: bounds the viewport between 0.6 km and 25 km, with 15% breathing room
    const maxKm = Math.max(0.6, Math.min(25, maxDist * 1.15));
    const pixelRadius = 105;
    const scaleFactor = (pixelRadius * 0.85) / maxKm;

    const pointsWithPixels = geospatialPoints.map(p => {
      let x = p.dLngKm * scaleFactor;
      let y = -p.dLatKm * scaleFactor; // North is -Y in screen coordinates

      const currentDist = Math.sqrt(x * x + y * y);
      if (currentDist > pixelRadius) {
        x = (x / currentDist) * pixelRadius;
        y = (y / currentDist) * pixelRadius;
      }

      return {
        ...p,
        x: Math.round(x),
        y: Math.round(y)
      };
    });

    return { maxKm, pixelRadius, pointsWithPixels };
  }, [geospatialPoints]);

  // Inverse visual scale for markers and labels during radar zoom
  // Separates spatial geographic zoom (which spreads coordinates) from marker visual scale.
  // When zooming IN (zoomLevel > 1): markers, labels, and padding shrink to reduce visual overlap.
  // When zooming OUT (zoomLevel < 1): markers and labels enlarge so they remain clear and readable.
  const { netVisualScale, childScale } = useMemo(() => {
    // netVisualScale is the target on-screen visual scale (clamped between 0.60 and 1.35)
    // At zoomLevel = 1.0 (100%): netVisualScale = 1.00 (exact normal size)
    // At zoomLevel = 1.5 (150%): netVisualScale = ~0.84 (smaller markers and labels)
    // At zoomLevel = 2.0 (200%): netVisualScale = ~0.74 (even smaller, minimal overlap)
    // At zoomLevel = 2.5 (250%): netVisualScale = ~0.67 (compact, readable)
    // At zoomLevel = 0.75 (75%): netVisualScale = ~1.14 (larger markers and labels)
    // At zoomLevel = 0.50 (50%): netVisualScale = ~1.35 (larger markers and labels, readable)
    const net = Math.max(0.60, Math.min(1.35, Math.pow(1 / zoomLevel, 0.44)));
    // Since the parent viewport already applies CSS scale(zoomLevel),
    // child elements must scale by (netVisualScale / zoomLevel) so their effective on-screen scale is netVisualScale.
    const child = Number((net / zoomLevel).toFixed(4));
    return { netVisualScale: net, childScale: child };
  }, [zoomLevel]);

  return (
    <div
      className="glass-panel"
      style={{
        position: 'relative',
        zIndex: 10,
        marginBottom: '26px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid rgba(14, 165, 233, 0.3)',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 29, 0.98) 100%)',
        boxShadow: '0 20px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(14, 165, 233, 0.15)',
        overflow: 'hidden'
      }}
    >
      {/* HEADER BAR */}
      <div
        style={{
          padding: '16px 22px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'linear-gradient(90deg, rgba(14, 165, 233, 0.08) 0%, rgba(139, 92, 246, 0.05) 100%)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                Weather-Driven AI Digital Twin
              </h3>
              <span
                className="badge"
                style={{
                  fontSize: '0.65rem',
                  padding: '2px 8px',
                  backgroundColor: 'rgba(14, 165, 233, 0.15)',
                  color: 'var(--primary)',
                  border: '1px solid rgba(14, 165, 233, 0.3)'
                }}
              >
                Simulation Engine
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Real-time atmospheric modeling and predictive trip impact for <strong style={{ color: 'var(--accent-cyan)' }}>{destName}</strong>
            </div>
          </div>
        </div>

        {/* Tab Controls & Collapse */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              onClick={() => setActiveTab('simulation')}
              className={activeTab === 'simulation' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '5px' }}
            >
              <Sliders size={12} />
              <span>What-If Model</span>
            </button>
            <button
              onClick={() => setActiveTab('geospatial')}
              className={activeTab === 'geospatial' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '5px' }}
            >
              <Layers size={12} />
              <span>Geospatial Radar</span>
            </button>
            <button
              onClick={() => setActiveTab('forecast')}
              className={activeTab === 'forecast' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '5px' }}
            >
              <Clock size={12} />
              <span>Trend Forecast</span>
            </button>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center'
            }}
            title={isExpanded ? 'Collapse Digital Twin' : 'Expand Digital Twin'}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div style={{ padding: '20px 22px' }}>
          {/* 1. LIVE ATMOSPHERIC METRICS BAR */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '12px',
              padding: '14px 18px',
              backgroundColor: 'rgba(11, 16, 28, 0.85)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              marginBottom: '20px'
            }}
          >
            {/* Condition & Temp */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {getWeatherIcon(weatherData?.condition)}
              <div>
                <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {weatherData?.condition || 'Atmosphere'}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                  {weatherLoading ? '...' : `${weatherData?.temperature ?? 22}°C`}
                </div>
              </div>
            </div>

            {/* Feels Like */}
            <div>
              <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Feels Like</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {weatherLoading ? '...' : `${weatherData?.feelsLike ?? 21}°C`}
              </div>
            </div>

            {/* Precipitation / Rain */}
            <div>
              <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rain Index</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Droplets size={13} />
                <span>{weatherLoading ? '...' : `${weatherData?.rain?.probabilityPercent ?? 15}%`}</span>
              </div>
            </div>

            {/* Wind */}
            <div>
              <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Wind Speed</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Wind size={13} style={{ color: '#94a3b8' }} />
                <span>{weatherLoading ? '...' : `${weatherData?.wind?.speedKmH ?? 12} km/h`}</span>
              </div>
            </div>

            {/* Humidity */}
            <div>
              <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Humidity</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {weatherLoading ? '...' : `${weatherData?.humidity ?? 55}%`}
              </div>
            </div>

            {/* Visibility */}
            <div>
              <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Visibility</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {weatherLoading ? '...' : `${weatherData?.visibilityKm ?? 10} km`}
              </div>
            </div>
          </div>

          {/* REAL-WORLD SOCIAL / PUBLIC BULLETIN SIGNAL */}
          {weatherData?.publicSignals && weatherData.publicSignals.length > 0 && (
            <div
              style={{
                padding: '10px 16px',
                backgroundColor: 'rgba(30, 41, 59, 0.45)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}
            >
              <Radio size={16} style={{ color: 'var(--accent-cyan)', marginTop: '2px', flexShrink: 0 }} className="animate-pulse" />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Live Public Signal: {weatherData.publicSignals[0].type}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                    ({weatherData.publicSignals[0].source})
                  </span>
                </div>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  {weatherData.publicSignals[0].headline} — <span style={{ color: '#fff' }}>{weatherData.publicSignals[0].impactSummary}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: WHAT-IF DIGITAL TWIN SIMULATION */}
          {activeTab === 'simulation' && (
            <div>
              {/* SIMULATED IMPACT RESULTS — Auto-computed from live weather */}
              <div
                style={{
                  padding: '18px 20px',
                  backgroundColor: 'rgba(11, 16, 28, 0.7)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  marginBottom: '20px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Traveler Suitability Analysis
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isSimulating && (
                        <RefreshCw size={13} className="animate-spin" style={{ color: 'var(--primary)' }} />
                      )}
                      <span
                        className="badge"
                        style={{
                          fontSize: '0.65rem',
                          backgroundColor: simulationResult?.weatherImpact === 'high' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: simulationResult?.weatherImpact === 'high' ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                          border: `1px solid ${simulationResult?.weatherImpact === 'high' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                        }}
                      >
                        Impact: {(simulationResult?.weatherImpact || 'moderate').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* GAUGES */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    {/* OUTDOOR SUITABILITY */}
                    <div style={{ padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Outdoor Viability</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                        {Math.round((simulationResult?.simulated?.outdoorSuitability ?? 0.8) * 100)}%
                      </div>
                      <div style={{ fontSize: '0.725rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', color: (simulationResult?.simulated?.outdoorDeltaPercent ?? 0) < 0 ? '#f87171' : 'var(--accent-emerald)' }}>
                        {(simulationResult?.simulated?.outdoorDeltaPercent ?? 0) < 0 ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
                        <span>{simulationResult?.simulated?.outdoorDeltaPercent ?? 0 > 0 ? `+${simulationResult?.simulated?.outdoorDeltaPercent}%` : `${simulationResult?.simulated?.outdoorDeltaPercent ?? 0}%`}</span>
                      </div>
                    </div>

                    {/* INDOOR SUITABILITY */}
                    <div style={{ padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Indoor Shelter Value</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                        {Math.round((simulationResult?.simulated?.indoorSuitability ?? 0.65) * 100)}%
                      </div>
                      <div style={{ fontSize: '0.725rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', color: (simulationResult?.simulated?.indoorDeltaPercent ?? 0) >= 0 ? 'var(--accent-emerald)' : '#f87171' }}>
                        {(simulationResult?.simulated?.indoorDeltaPercent ?? 0) >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        <span>+{simulationResult?.simulated?.indoorDeltaPercent ?? 0}% shift</span>
                      </div>
                    </div>
                  </div>

                  {/* CONFIDENCE & UNCERTAINTY INDICATOR */}
                  <div style={{ padding: '10px 14px', backgroundColor: 'rgba(14, 165, 233, 0.07)', borderRadius: '8px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <ShieldCheck size={14} style={{ color: 'var(--primary)' }} /> Model Confidence
                      </span>
                      <strong style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
                        {simulationResult?.confidence?.percent ?? 84}% ({simulationResult?.confidence?.level ?? 'High'})
                      </strong>
                    </div>
                    {simulationResult?.confidence?.uncertaintyFactors && simulationResult.confidence.uncertaintyFactors.length > 0 && (
                      <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Uncertainty factor: {simulationResult.confidence.uncertaintyFactors[0]}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SIMULATED IMPACT CARDS: AFFECTED VS RESILIENT ALTERNATIVES */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
                {/* AFFECTED EXPERIENCES */}
                <div style={{ padding: '16px', backgroundColor: 'rgba(11, 16, 28, 0.65)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                    <ShieldAlert size={15} style={{ color: 'var(--accent-rose)' }} />
                    <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Weather-Sensitive Places ({simulationResult?.affectedExperiences?.length || 0})
                    </span>
                  </div>

                  {simulationResult?.affectedExperiences && simulationResult.affectedExperiences.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {simulationResult.affectedExperiences.map((item, idx) => (
                        <div
                          key={item.id || item.placeId || idx}
                          style={{
                            padding: '10px 12px',
                            backgroundColor: 'rgba(239, 68, 68, 0.05)',
                            border: '1px solid rgba(239, 68, 68, 0.15)',
                            borderRadius: '6px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#fff' }}>{item.name || item.title}</div>
                            <span style={{ fontSize: '0.675rem', color: '#fca5a5' }}>
                              Suitability: {Math.round((item.simulatedSuitability || 0.3) * 100)}%
                            </span>
                          </div>
                          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {item.impactNote || 'Adverse weather reduces outdoor viability.'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '12px 0' }}>
                      No severe negative weather disruptions detected under current scenario parameters.
                    </div>
                  )}
                </div>

                {/* RECOMMENDED RESILIENT ALTERNATIVES */}
                <div style={{ padding: '16px', backgroundColor: 'rgba(11, 16, 28, 0.65)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShieldCheck size={15} style={{ color: 'var(--accent-emerald)' }} />
                      <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Simulated Resilient Alternatives
                      </span>
                    </div>
                    <span style={{ fontSize: '0.675rem', color: 'var(--accent-cyan)' }}>Real Verified Places</span>
                  </div>

                  {simulationResult?.recommendedAlternatives && simulationResult.recommendedAlternatives.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {simulationResult.recommendedAlternatives.map((item, idx) => (
                        <div
                          key={item.id || item.placeId || idx}
                          style={{
                            padding: '10px 12px',
                            backgroundColor: 'rgba(16, 185, 129, 0.05)',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            borderRadius: '6px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '10px'
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.name || item.title}
                            </div>
                            <div style={{ fontSize: '0.725rem', color: 'var(--accent-emerald)', marginTop: '2px' }}>
                              {item.impactNote || 'Weather sheltered sanctuary'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {onAddToWishlist && (
                              <button
                                onClick={() => onAddToWishlist(item)}
                                className="btn btn-secondary"
                                style={{ padding: '3px 7px', fontSize: '0.675rem' }}
                                title="Save to Wishlist"
                              >
                                {wishlistIds.includes(item.id || item.placeId) ? 'Saved' : 'Save'}
                              </button>
                            )}
                            {activeTrip && onAddToItinerary && (
                              <button
                                onClick={() => onAddToItinerary(item)}
                                className="btn btn-primary"
                                style={{ padding: '3px 8px', fontSize: '0.675rem', gap: '3px' }}
                                title="Add to itinerary without altering other items"
                              >
                                <PlusCircle size={10} />
                                <span>Add</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '12px 0' }}>
                      All current options remain balanced. No forced indoor substitutions needed.
                    </div>
                  )}
                </div>
              </div>

              {/* NON-DESTRUCTIVE SIMULATION NOTICE */}
              <div
                style={{
                  marginTop: '16px',
                  padding: '10px 14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '6px',
                  border: '1px dashed rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.725rem',
                  color: 'var(--text-muted)'
                }}
              >
                <Info size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <span>
                  <strong>Digital Twin Safeguard:</strong> This what-if model simulates atmospheric shifts in real time. Your real itinerary is <em>never modified automatically</em> unless you explicitly click "Add" on a recommended alternative.
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: GEOSPATIAL MAP VISUALIZATION */}
          {activeTab === 'geospatial' && (
            <div>
              <style>{`
                @keyframes radarSweep {
                  0% { transform: translate(-50%, -50%) rotate(0deg); }
                  100% { transform: translate(-50%, -50%) rotate(360deg); }
                }
              `}</style>
              <div
                ref={radarContainerRef}
                onMouseDown={handleRadarMouseDown}
                onMouseMove={handleRadarMouseMove}
                onMouseUp={handleRadarMouseUp}
                onMouseLeave={handleRadarMouseUp}
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '350px',
                  backgroundColor: '#070b14',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(14, 165, 233, 0.25)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '16px',
                  boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.6)',
                  cursor: isDragging ? 'grabbing' : (zoomLevel > 1.0 ? 'grab' : 'crosshair'),
                  userSelect: 'none'
                }}
              >
                {/* MAP HEADER HUD (FIXED OVERLAY - DOES NOT SCALE WITH ZOOM) */}
                <div style={{ position: 'relative', zIndex: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', pointerEvents: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                      {destName} Tactical Weather Sector
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      ({hasCenterCoords ? `${centerLat.toFixed(3)}°N, ${centerLng.toFixed(3)}°E` : 'Coordinates active'})
                    </span>
                    {radarScale.pointsWithPixels.length > 0 && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(14, 165, 233, 0.15)',
                          color: 'var(--primary)',
                          border: '1px solid rgba(14, 165, 233, 0.3)',
                          fontWeight: 600
                        }}
                      >
                        {radarScale.pointsWithPixels.length} places plotted
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', fontSize: '0.7rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-emerald)' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-emerald)', boxShadow: '0 0 6px var(--accent-emerald)' }}></span> Sheltered
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-rose)' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-rose)', boxShadow: '0 0 6px var(--accent-rose)' }}></span> Exposed
                    </span>
                  </div>
                </div>

                {/* TACTICAL ZOOM CONTROLS HUD (FIXED OVERLAY - MATCHES DARK RADAR UI) */}
                <div
                  data-radar-control="true"
                  style={{
                    position: 'absolute',
                    top: '48px',
                    right: '16px',
                    zIndex: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    backgroundColor: 'rgba(8, 14, 26, 0.9)',
                    border: '1px solid rgba(14, 165, 233, 0.35)',
                    borderRadius: '6px',
                    padding: '3px',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(8px)',
                    userSelect: 'none',
                    pointerEvents: 'auto'
                  }}
                >
                  {/* Zoom In Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomLevel(prev => Math.min(MAX_ZOOM, Number((prev + 0.25).toFixed(2))));
                    }}
                    disabled={zoomLevel >= MAX_ZOOM}
                    title="Zoom In (+)"
                    aria-label="Zoom In"
                    style={{
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      color: zoomLevel >= MAX_ZOOM ? 'rgba(255, 255, 255, 0.25)' : 'var(--primary)',
                      fontSize: '15px',
                      fontWeight: 700,
                      cursor: zoomLevel >= MAX_ZOOM ? 'not-allowed' : 'pointer',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => { if (zoomLevel < MAX_ZOOM) e.currentTarget.style.backgroundColor = 'rgba(14, 165, 233, 0.18)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    +
                  </button>

                  {/* Zoom Readout */}
                  <span
                    style={{
                      fontSize: '0.58rem',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      color: 'rgba(14, 165, 233, 0.85)',
                      padding: '1px 2px',
                      textAlign: 'center',
                      minWidth: '28px'
                    }}
                  >
                    {Math.round(zoomLevel * 100)}%
                  </span>

                  {/* Zoom Out Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomLevel(prev => Math.max(MIN_ZOOM, Number((prev - 0.25).toFixed(2))));
                    }}
                    disabled={zoomLevel <= MIN_ZOOM}
                    title="Zoom Out (−)"
                    aria-label="Zoom Out"
                    style={{
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      color: zoomLevel <= MIN_ZOOM ? 'rgba(255, 255, 255, 0.25)' : 'var(--primary)',
                      fontSize: '15px',
                      fontWeight: 700,
                      cursor: zoomLevel <= MIN_ZOOM ? 'not-allowed' : 'pointer',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => { if (zoomLevel > MIN_ZOOM) e.currentTarget.style.backgroundColor = 'rgba(14, 165, 233, 0.18)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    −
                  </button>

                  {/* Reset Button (visible when zoomed or panned) */}
                  {(zoomLevel !== 1.0 || panOffset.x !== 0 || panOffset.y !== 0) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomLevel(1.0);
                        setPanOffset({ x: 0, y: 0 });
                      }}
                      title="Reset View"
                      aria-label="Reset View"
                      style={{
                        marginTop: '2px',
                        padding: '2px 5px',
                        fontSize: '0.55rem',
                        fontWeight: 600,
                        backgroundColor: 'rgba(14, 165, 233, 0.15)',
                        border: '1px solid rgba(14, 165, 233, 0.4)',
                        borderRadius: '3px',
                        color: '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textTransform: 'uppercase'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(14, 165, 233, 0.3)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(14, 165, 233, 0.15)'; }}
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* ZOOMABLE SPATIAL VIEWPORT (SCALES & PANS ALL RADAR SPATIAL ELEMENTS TOGETHER) */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                    transformOrigin: '50% 50%',
                    transition: isDragging ? 'none' : 'transform 0.12s cubic-bezier(0.2, 0, 0, 1)',
                    pointerEvents: 'auto',
                    zIndex: 2
                  }}
                >
                  {/* RADAR TACTICAL GRID OVERLAY */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: 'radial-gradient(circle at center, rgba(14, 165, 233, 0.08) 0%, transparent 70%), linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
                      backgroundSize: '100% 100%, 32px 32px, 32px 32px',
                      pointerEvents: 'none'
                    }}
                  />

                  {/* CONCENTRIC RADAR RANGE RINGS & CROSSHAIRS (SVG LAYER) */}
                  <svg
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: `${radarScale.pixelRadius * 2 + 20}px`,
                      height: `${radarScale.pixelRadius * 2 + 20}px`,
                      pointerEvents: 'none',
                      zIndex: 1
                    }}
                  >
                    {/* Outer Range Ring */}
                    <circle
                      cx="50%"
                      cy="50%"
                      r={radarScale.pixelRadius}
                      fill="none"
                      stroke="rgba(14, 165, 233, 0.22)"
                      strokeWidth="1"
                      strokeDasharray="4 3"
                    />
                    {/* Mid Range Ring */}
                    <circle
                      cx="50%"
                      cy="50%"
                      r={radarScale.pixelRadius * 0.66}
                      fill="none"
                      stroke="rgba(14, 165, 233, 0.16)"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    {/* Inner Range Ring */}
                    <circle
                      cx="50%"
                      cy="50%"
                      r={radarScale.pixelRadius * 0.33}
                      fill="none"
                      stroke="rgba(14, 165, 233, 0.12)"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    {/* Axis Crosshairs */}
                    <line
                      x1="50%"
                      y1="4%"
                      x2="50%"
                      y2="96%"
                      stroke="rgba(14, 165, 233, 0.14)"
                      strokeWidth="1"
                      strokeDasharray="2 4"
                    />
                    <line
                      x1="4%"
                      y1="50%"
                      x2="96%"
                      y2="50%"
                      stroke="rgba(14, 165, 233, 0.14)"
                      strokeWidth="1"
                      strokeDasharray="2 4"
                    />
                  </svg>

                  {/* RANGE DISTANCE ANNOTATIONS ON RINGS */}
                  <span
                    style={{
                      position: 'absolute',
                      top: `calc(50% - ${radarScale.pixelRadius}px + 4px)`,
                      left: 'calc(50% + 6px)',
                      fontSize: '0.575rem',
                      color: 'rgba(14, 165, 233, 0.65)',
                      pointerEvents: 'none',
                      zIndex: 2,
                      fontFamily: 'monospace'
                    }}
                  >
                    {radarScale.maxKm.toFixed(1)} km
                  </span>
                  <span
                    style={{
                      position: 'absolute',
                      top: `calc(50% - ${radarScale.pixelRadius * 0.66}px + 4px)`,
                      left: 'calc(50% + 6px)',
                      fontSize: '0.575rem',
                      color: 'rgba(14, 165, 233, 0.45)',
                      pointerEvents: 'none',
                      zIndex: 2,
                      fontFamily: 'monospace'
                    }}
                  >
                    {(radarScale.maxKm * 0.66).toFixed(1)} km
                  </span>

                  {/* CARDINAL DIRECTION MARKERS */}
                  <span style={{ position: 'absolute', top: `calc(50% - ${radarScale.pixelRadius + 14}px)`, left: '50%', transform: 'translateX(-50%)', fontSize: '0.625rem', fontWeight: 800, color: 'rgba(14, 165, 233, 0.6)', pointerEvents: 'none', zIndex: 2 }}>N</span>
                  <span style={{ position: 'absolute', top: `calc(50% + ${radarScale.pixelRadius + 2}px)`, left: '50%', transform: 'translateX(-50%)', fontSize: '0.625rem', fontWeight: 800, color: 'rgba(14, 165, 233, 0.4)', pointerEvents: 'none', zIndex: 2 }}>S</span>
                  <span style={{ position: 'absolute', top: '50%', left: `calc(50% - ${radarScale.pixelRadius + 14}px)`, transform: 'translateY(-50%)', fontSize: '0.625rem', fontWeight: 800, color: 'rgba(14, 165, 233, 0.4)', pointerEvents: 'none', zIndex: 2 }}>W</span>
                  <span style={{ position: 'absolute', top: '50%', left: `calc(50% + ${radarScale.pixelRadius + 5}px)`, transform: 'translateY(-50%)', fontSize: '0.625rem', fontWeight: 800, color: 'rgba(14, 165, 233, 0.4)', pointerEvents: 'none', zIndex: 2 }}>E</span>

                  {/* ROTATING TACTICAL RADAR BEAM SWEEP */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: `${radarScale.pixelRadius * 2}px`,
                      height: `${radarScale.pixelRadius * 2}px`,
                      borderRadius: '50%',
                      pointerEvents: 'none',
                      zIndex: 1,
                      background: 'conic-gradient(from 0deg at 50% 50%, rgba(14, 165, 233, 0) 0deg, rgba(14, 165, 233, 0) 300deg, rgba(14, 165, 233, 0.12) 360deg)',
                      animation: 'radarSweep 6s linear infinite'
                    }}
                  />

                  {/* SIMULATED PRECIPITATION / WEATHER IMPACT RADAR CONTOUR */}
                  {simRain > 15 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: `${Math.min(radarScale.pixelRadius * 2, 80 + simRain * 1.5)}px`,
                        height: `${Math.min(radarScale.pixelRadius * 2, 80 + simRain * 1.5)}px`,
                        borderRadius: '50%',
                        background: `radial-gradient(circle, rgba(14, 165, 233, ${Math.min(0.25, simRain / 400)}) 0%, rgba(99, 102, 241, 0.04) 60%, transparent 100%)`,
                        border: `1px dashed rgba(56, 189, 248, ${Math.min(0.65, simRain / 120)})`,
                        pointerEvents: 'none',
                        animation: 'pulse 3s infinite ease-in-out',
                        zIndex: 1
                      }}
                    />
                  )}

                  {/* THERMAL EXPOSURE BOUNDARY CONTOUR */}
                  {simTemp > 33 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: `${radarScale.pixelRadius * 1.6}px`,
                        height: `${radarScale.pixelRadius * 1.6}px`,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, transparent 75%)',
                        border: '1px dashed rgba(245, 158, 11, 0.3)',
                        pointerEvents: 'none',
                        zIndex: 1
                      }}
                    />
                  )}

                  {/* Destination Center Pin */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: `translate(-50%, -50%) scale(${childScale})`,
                      transformOrigin: '50% 50%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      zIndex: 8,
                      pointerEvents: 'none',
                      transition: isDragging ? 'none' : 'transform 0.12s ease-out'
                    }}
                  >
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary)',
                        boxShadow: '0 0 16px var(--primary), 0 0 24px rgba(14, 165, 233, 0.8)',
                        border: '2px solid #fff'
                      }}
                    />
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: '#fff',
                        marginTop: '4px',
                        backgroundColor: 'rgba(8, 12, 22, 0.9)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        border: '1px solid rgba(14, 165, 233, 0.4)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {destName}
                    </span>
                  </div>

                  {/* Satellite Real Experience Pins Projected via Relative Coordinates */}
                  {radarScale.pointsWithPixels.map((exp, i) => {
                    const isSelected = selectedMapItem?.id === exp.id || selectedMapItem?.placeId === exp.placeId;
                    const isSheltered = exp.isSheltered;
                    const markerColor = isSheltered ? 'var(--accent-emerald)' : 'var(--accent-rose)';

                    return (
                      <div
                        key={exp.id || exp.placeId || i}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!dragStartRef.current.hasMoved) {
                            setSelectedMapItem(exp);
                          }
                        }}
                        style={{
                          position: 'absolute',
                          top: `calc(50% + ${exp.y}px)`,
                          left: `calc(50% + ${exp.x}px)`,
                          transform: `translate(-50%, -50%) scale(${childScale})`,
                          transformOrigin: '50% 50%',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          zIndex: isSelected ? 12 : 5,
                          transition: isDragging ? 'none' : 'transform 0.12s ease-out',
                          pointerEvents: 'auto'
                        }}
                        title={`${exp.name || exp.title} (${exp.distKm ? `${exp.distKm.toFixed(1)} km` : 'nearby'})`}
                      >
                        {/* Generous invisible hit target to maintain easy selection at all zoom levels */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: `${Math.round(38 / netVisualScale)}px`,
                            height: `${Math.round(38 / netVisualScale)}px`,
                            borderRadius: '50%',
                            pointerEvents: 'auto',
                            cursor: 'pointer'
                          }}
                        />

                        <div
                          style={{
                            width: isSelected ? '14px' : '10px',
                            height: isSelected ? '14px' : '10px',
                            borderRadius: '50%',
                            backgroundColor: markerColor,
                            boxShadow: isSelected
                              ? `0 0 12px ${markerColor}, 0 0 20px ${markerColor}`
                              : `0 0 8px ${markerColor}`,
                            border: '1.5px solid #fff',
                            transition: 'all 0.2s ease',
                            position: 'relative',
                            zIndex: 2
                          }}
                        />
                        <span
                          style={{
                            fontSize: '0.6rem',
                            color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                            backgroundColor: 'rgba(8, 12, 22, 0.9)',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            marginTop: '2px',
                            whiteSpace: 'nowrap',
                            maxWidth: '95px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.08)',
                            fontWeight: isSelected ? 700 : 500,
                            position: 'relative',
                            zIndex: 2
                          }}
                        >
                          {exp.name || exp.title}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* BOTTOM STATUS / SELECTED PIN DETAILS HUD (FIXED OVERLAY - DOES NOT SCALE WITH ZOOM) */}
                {selectedMapItem ? (
                  <div
                    style={{
                      position: 'relative',
                      zIndex: 12,
                      padding: '8px 14px',
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '6px',
                      border: '1px solid rgba(14, 165, 233, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      fontSize: '0.75rem',
                      flexWrap: 'wrap',
                      pointerEvents: 'auto'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ color: '#fff' }}>{selectedMapItem.name || selectedMapItem.title}</strong>
                      <span
                        style={{
                          fontSize: '0.675rem',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: selectedMapItem.isSheltered ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                          color: selectedMapItem.isSheltered ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                          border: `1px solid ${selectedMapItem.isSheltered ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                          fontWeight: 600
                        }}
                      >
                        {selectedMapItem.isSheltered ? 'Sheltered' : 'Exposed'}
                      </span>
                      {selectedMapItem.distKm !== undefined && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                          ~{selectedMapItem.distKm.toFixed(1)} km from center
                        </span>
                      )}
                      {selectedMapItem.impactNote && (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', display: 'block', width: '100%' }}>
                          {selectedMapItem.impactNote}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {onAddToItinerary && (
                        <button
                          onClick={() => onAddToItinerary(selectedMapItem)}
                          className="btn btn-primary"
                          style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                        >
                          Add to Trip
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedMapItem(null)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem' }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ) : radarScale.pointsWithPixels.length === 0 ? (
                  <div
                    style={{
                      position: 'relative',
                      zIndex: 12,
                      padding: '6px 12px',
                      backgroundColor: 'rgba(15, 23, 42, 0.7)',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      textAlign: 'center',
                      fontSize: '0.725rem',
                      color: 'var(--text-muted)',
                      pointerEvents: 'auto'
                    }}
                  >
                    No nearby geospatial data available for this sector
                  </div>
                ) : (
                  <div
                    style={{
                      position: 'relative',
                      zIndex: 12,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.675rem',
                      color: 'var(--text-muted)',
                      pointerEvents: 'auto'
                    }}
                  >
                    <span>Sector coverage: {radarScale.maxKm.toFixed(1)} km radius</span>
                    <span>Click any place marker for microclimate details</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: 5-INTERVAL WEATHER TREND */}
          {activeTab === 'forecast' && (
            <div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                  gap: '10px'
                }}
              >
                {weatherData?.forecast && weatherData.forecast.length > 0 ? (
                  weatherData.forecast.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 10px',
                        backgroundColor: 'rgba(11, 16, 28, 0.75)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.time}</div>
                      <div style={{ margin: '6px 0', display: 'flex', justifyContent: 'center' }}>
                        {getWeatherIcon(item.condition)}
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>{item.temp}°C</div>
                      <div style={{ fontSize: '0.675rem', color: 'var(--accent-cyan)', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                        <Droplets size={10} />
                        <span>{item.pop}%</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.825rem', textAlign: 'center', width: '100%' }}>
                    Detailed 24-hour forecast data temporarily loading or unavailable.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

class WeatherDigitalTwinErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('WeatherDigitalTwin error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: '24px', fontSize: '0.825rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cloud size={16} style={{ color: 'var(--text-dim)' }} />
          <span>Weather data temporarily unavailable. Discover functionality remains fully active.</span>
        </div>
      );
    }
    return <WeatherDigitalTwinInner {...this.props} />;
  }
}

export default function WeatherDigitalTwin(props) {
  return <WeatherDigitalTwinErrorBoundary {...props} />;
}
