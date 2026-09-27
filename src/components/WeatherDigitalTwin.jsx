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
  Sparkles,
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
function WeatherDigitalTwinInner({
  destinationLocation,
  experiences = [],
  activeTrip = null,
  onAddToItinerary = null,
  onAddToWishlist = null,
  wishlistIds = []
}) {
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

  const destName = destinationLocation?.destination || destinationLocation?.city || destinationLocation?.name || 'Selected Destination';
  const destLat = destinationLocation?.latitude;
  const destLng = destinationLocation?.longitude;

  // Race condition prevention: only the latest request should update state
  const weatherRequestIdRef = useRef(0);
  const weatherMismatchRetryRef = useRef(0);

  // 1. Fetch live destination weather whenever destination coordinates or name change
  const loadLiveWeather = async () => {
    if (!destinationLocation && !destName) return;

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

  // Evaluated Map Experiences
  const mapExperiences = useMemo(() => {
    return simulationResult?.evaluatedExperiences || experiences.slice(0, 8);
  }, [simulationResult, experiences]);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.25) 0%, rgba(99, 102, 241, 0.25) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)'
            }}
          >
            <Sparkles size={18} />
          </div>
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
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '320px',
                  backgroundColor: '#090d16',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(14, 165, 233, 0.25)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '16px'
                }}
              >
                {/* RADAR / MAP CANVAS OVERLAY */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: 'radial-gradient(circle at center, rgba(14, 165, 233, 0.08) 0%, transparent 70%), linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
                    backgroundSize: '100% 100%, 32px 32px, 32px 32px',
                    pointerEvents: 'none'
                  }}
                />

                {/* SIMULATED PRECIPITATION RADAR CONTOUR */}
                {simRain > 20 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: `${Math.min(280, 100 + simRain * 1.8)}px`,
                      height: `${Math.min(280, 100 + simRain * 1.8)}px`,
                      borderRadius: '50%',
                      background: `radial-gradient(circle, rgba(14, 165, 233, ${simRain / 350}) 0%, rgba(99, 102, 241, 0.05) 60%, transparent 100%)`,
                      border: `1px dashed rgba(56, 189, 248, ${Math.min(0.8, simRain / 100)})`,
                      pointerEvents: 'none',
                      animation: 'pulse 3s infinite ease-in-out'
                    }}
                  />
                )}

                {/* MAP HEADER HUD */}
                <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={16} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                      {destName} Tactical Weather Sector
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      ({destLat ? `${Number(destLat).toFixed(3)}°N, ${Number(destLng).toFixed(3)}°E` : 'Coordinates active'})
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '0.7rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-emerald)' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-emerald)' }}></span> Sheltered
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-rose)' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-rose)' }}></span> Exposed
                    </span>
                  </div>
                </div>

                {/* GEOSPATIAL EXPERIENCE PINS PROJECTION */}
                <div style={{ position: 'relative', zIndex: 2, flex: 1, margin: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* Destination Center Pin */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      zIndex: 5
                    }}
                  >
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary)',
                        boxShadow: '0 0 16px var(--primary), 0 0 24px rgba(14, 165, 233, 0.8)',
                        border: '2px solid #fff'
                      }}
                    />
                    <span style={{ fontSize: '0.675rem', fontWeight: 700, color: '#fff', marginTop: '4px', backgroundColor: 'rgba(0,0,0,0.7)', padding: '1px 5px', borderRadius: '4px' }}>
                      {destName}
                    </span>
                  </div>

                  {/* Satellite Experience Pins */}
                  {mapExperiences.map((exp, i) => {
                    const angle = (i / Math.max(1, mapExperiences.length)) * 2 * Math.PI;
                    const radius = 65 + ((i % 3) * 35);
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    const isIndoor = exp.environment === 'indoor' || exp.impactStatus === 'optimal_shelter';
                    const isSelected = selectedMapItem?.id === exp.id;

                    return (
                      <div
                        key={exp.id || i}
                        onClick={() => setSelectedMapItem(exp)}
                        style={{
                          position: 'absolute',
                          top: `calc(50% + ${y}px)`,
                          left: `calc(50% + ${x}px)`,
                          transform: 'translate(-50%, -50%)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          zIndex: isSelected ? 10 : 3
                        }}
                      >
                        <div
                          style={{
                            width: isSelected ? '14px' : '10px',
                            height: isSelected ? '14px' : '10px',
                            borderRadius: '50%',
                            backgroundColor: isIndoor ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                            boxShadow: isIndoor ? '0 0 8px var(--accent-emerald)' : '0 0 8px var(--accent-rose)',
                            border: '1.5px solid #fff',
                            transition: 'all 0.2s ease'
                          }}
                        />
                        <span
                          style={{
                            fontSize: '0.6rem',
                            color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                            backgroundColor: 'rgba(10, 15, 29, 0.85)',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            marginTop: '2px',
                            whiteSpace: 'nowrap',
                            maxWidth: '100px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            border: isSelected ? '1px solid var(--primary)' : 'none'
                          }}
                        >
                          {exp.name || exp.title}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* SELECTED PIN DETAILS HUD */}
                {selectedMapItem && (
                  <div
                    style={{
                      position: 'relative',
                      zIndex: 3,
                      padding: '8px 14px',
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '6px',
                      border: '1px solid rgba(14, 165, 233, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem'
                    }}
                  >
                    <div>
                      <strong style={{ color: '#fff' }}>{selectedMapItem.name || selectedMapItem.title}</strong>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>
                        {selectedMapItem.environment === 'indoor' ? 'Sheltered Indoor Venue' : 'Outdoor Weather-Sensitive'}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedMapItem(null)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem' }}
                    >
                      Dismiss
                    </button>
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
