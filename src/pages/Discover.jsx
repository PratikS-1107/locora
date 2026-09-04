import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getCurrentLocation,
  resolveLocationName,
  getDiscoverContext,
  getRecommendations,
  addRecommendationToItinerary,
  getGoogleMapsApiKey,
  getSavedWishlistIds,
  toggleSaveWishlistItem
} from '../services/api';
import ExperienceCard from '../components/ExperienceCard';
import {
  Sparkles,
  MapPin,
  Clock,
  IndianRupee,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Compass,
  Navigation,
  PlusCircle,
  ArrowRight
} from 'lucide-react';

const INTENT_MODES = [
  { id: 'local', label: 'Local' },
  { id: 'cultural', label: 'Cultural' },
  { id: 'food', label: 'Food' },
  { id: 'hidden gems', label: 'Hidden Gems' },
  { id: 'workshops', label: 'Workshops' },
  { id: 'nature', label: 'Nature' }
];

const Discover = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Location State
  const [locationName, setLocationName] = useState(null);
  const [locationSource, setLocationSource] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Itinerary Context State
  const [context, setContext] = useState(null);
  const [contextLoading, setContextLoading] = useState(true);

  // Intent State
  const [activeIntent, setActiveIntent] = useState('local');

  // Discovery Process Loading Step
  const [loadingStep, setLoadingStep] = useState('Detecting browser GPS location...');

  // Recommendations & State
  const [recommendations, setRecommendations] = useState([]);
  const [recsLoading, setRecsLoading] = useState(true);
  const [addedIds, setAddedIds] = useState([]);
  const [wishlistIds, setWishlistIds] = useState([]);

  // Toast & Warning States
  const [toastMsg, setToastMsg] = useState('');
  const [conflictMsg, setConflictMsg] = useState('');

  const hasGoogleKey = Boolean(getGoogleMapsApiKey());

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const loadWishlist = async () => {
    try {
      if (user?.id) {
        const res = await getSavedWishlistIds(user.id);
        setWishlistIds(res.data || []);
      } else {
        setWishlistIds([]);
      }
    } catch (_) { }
  };

  const handleToggleWishlist = async (rec) => {
    if (!user?.id) {
      navigate('/login', { state: { returnTo: '/discover' } });
      return;
    }
    try {
      const itemId = rec.id || rec.placeId;
      const res = await toggleSaveWishlistItem(rec, user.id);
      const isNowSaved = Boolean(res.data?.isSaved);
      setWishlistIds(prev => isNowSaved ? [...new Set([...prev, itemId])] : prev.filter(id => id !== itemId));
      showToast(isNowSaved ? `Added "${rec.name}" to Wishlist!` : `Removed "${rec.name}" from Wishlist.`);
    } catch (err) {
      showToast('Could not update Wishlist.');
    }
  };

  // 1. Fetch Supabase User Active Trip & Itinerary Context
  const loadDiscoverContext = async () => {
    setContextLoading(true);
    try {
      if (user?.id) {
        const ctx = await getDiscoverContext(user.id);
        setContext(ctx);
      } else {
        setContext({
          hasTrip: false,
          activeTrip: null,
          todayDate: new Date().toISOString().split('T')[0],
          destination: null,
          availableTimeMinutes: null,
          availableTimeFormatted: null,
          remainingBudget: null,
          occupiedItems: []
        });
      }
    } catch (e) {
      console.error('Error fetching discover context from Supabase:', e);
      setContext({
        hasTrip: false,
        activeTrip: null,
        todayDate: new Date().toISOString().split('T')[0],
        destination: null,
        availableTimeMinutes: null,
        availableTimeFormatted: null,
        remainingBudget: null,
        occupiedItems: []
      });
    } finally {
      setContextLoading(false);
    }
  };

  // 2. Real Browser Geolocation Detection & Reverse Geocoding
  const detectLocation = async () => {
    setLocationLoading(true);
    setLocationDenied(false);
    setLocationError(null);
    setLoadingStep('Detecting browser GPS location...');

    try {
      const coords = await getCurrentLocation();
      setUserCoords(coords);

      setLoadingStep('Resolving location address via Google Maps...');
      const resolved = await resolveLocationName(coords.latitude, coords.longitude);
      setLocationName(resolved.formatted);
      setLocationSource(resolved.source || 'Browser GPS');
    } catch (err) {
      console.warn('Geolocation detection error:', err);
      setLocationDenied(true);
      setUserCoords(null);
      setLocationName(null);
      setLocationSource(null);
      setLocationError(err.message || 'Location permission denied or unavailable.');
    } finally {
      setLocationLoading(false);
    }
  };

  // 3. Fetch Real Recommendations based on GPS Coords, Category & Context
  const fetchRecs = async (overrideIntent = activeIntent, coordsToUse = userCoords) => {
    if (!coordsToUse || !coordsToUse.latitude || !coordsToUse.longitude) {
      setRecommendations([]);
      setRecsLoading(false);
      return;
    }

    setRecsLoading(true);
    setLoadingStep(`Searching places for ${overrideIntent} mode...`);

    try {
      const cityPart = locationName ? locationName.split(',')[0]?.trim() : null;
      const countryPart = locationName && locationName.includes(',') ? locationName.split(',')[1]?.trim() : null;

      setLoadingStep('Personalizing recommendations with Gemini AI...');

      const recs = await getRecommendations({
        location: {
          city: cityPart,
          country: countryPart,
          coords: coordsToUse
        },
        trip: context?.activeTrip || null,
        available_windows: context?.availableWindows || (context?.availableTimeMinutes ? [{ duration_minutes: context.availableTimeMinutes }] : []),
        intent: overrideIntent,
        availableTimeMinutes: context?.availableTimeMinutes || null,
        remainingBudget: context?.remainingBudget || null,
        occupiedItems: context?.occupiedItems || []
      });

      setRecommendations(recs || []);
    } catch (e) {
      console.error('Error fetching recommendations:', e);
      setRecommendations([]);
    } finally {
      setRecsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadDiscoverContext();
    loadWishlist();
    detectLocation();
  }, [user?.id]);

  // Fetch recommendations whenever location or category changes
  const latKey = userCoords?.latitude;
  const lngKey = userCoords?.longitude;

  useEffect(() => {
    if (latKey && lngKey) {
      fetchRecs(activeIntent, { latitude: latKey, longitude: lngKey });
    } else {
      setRecommendations([]);
      setRecsLoading(false);
    }
  }, [latKey, lngKey, activeIntent]);

  // Handle Intent Switch
  const handleIntentChange = (intentId) => {
    setActiveIntent(intentId);
  };

  // Handle Add to Itinerary
  const handleAddToItinerary = async (rec) => {
    if (!context?.hasTrip || !context?.activeTrip) {
      setConflictMsg('Please select or create an active trip first to add itinerary items.');
      setTimeout(() => setConflictMsg(''), 3500);
      return;
    }

    const durationMinutes = Number(rec.duration_minutes || rec.durationMinutes || 60);
    const availableMinutes = Number(context?.availableTimeMinutes || 0);

    if (availableMinutes > 0 && durationMinutes > availableMinutes) {
      setConflictMsg(`This experience (${durationMinutes} min) exceeds your available free window (${context?.availableTimeFormatted}).`);
      setTimeout(() => setConflictMsg(''), 3500);
      return;
    }

    try {
      const tripId = context.activeTrip.id;
      const dateStr = context.todayDate || new Date().toISOString().split('T')[0];
      await addRecommendationToItinerary(rec, tripId, dateStr);

      setAddedIds(prev => [...prev, rec.id]);
      showToast(`Added "${rec.name}" to your itinerary.`);

      await loadDiscoverContext();
    } catch (err) {
      showToast('Unable to add this experience.');
    }
  };

  const currentDateLabel = new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div style={{ width: '100%', maxWidth: '1240px', margin: '0 auto', paddingBottom: '60px' }}>

      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
          backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--accent-emerald)',
          borderRadius: 'var(--radius-md)', padding: '14px 20px', color: '#fff',
          boxShadow: 'var(--shadow-lg)', backdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <CheckCircle2 size={18} style={{ color: 'var(--accent-emerald)' }} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Warning Toast */}
      {conflictMsg && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
          backgroundColor: 'rgba(239, 68, 68, 0.95)', border: '1px solid #fca5a5',
          borderRadius: 'var(--radius-md)', padding: '14px 20px', color: '#fff',
          boxShadow: 'var(--shadow-lg)', backdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <AlertCircle size={18} />
          <span>{conflictMsg}</span>
        </div>
      )}

      {/* DISCOVER HEADER & LOCATION BAR */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
              <span className="badge badge-purple">
                <Sparkles size={11} /> Context-Aware Discovery
              </span>
              {hasGoogleKey && (
                <span className="badge badge-primary">
                  <Navigation size={10} /> Verified Places Data
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '2.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              Discover
            </h1>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Authentic local places and experiences matched to your live location and travel journey.
            </p>
          </div>

          {/* REAL LOCATION STATUS BAR */}
          <div className="glass-panel" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MapPin size={16} style={{ color: locationDenied ? 'var(--accent-amber)' : (locationName ? 'var(--accent-emerald)' : 'var(--text-muted)') }} />
            <div>
              <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Location {locationSource ? `(${locationSource})` : ''}
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: locationName ? 'var(--text-primary)' : 'var(--accent-amber)' }}>
                {locationLoading ? 'Detecting GPS...' : (locationName || 'Location Access Required')}
              </div>
            </div>

            <button
              onClick={detectLocation}
              disabled={locationLoading}
              className="btn btn-secondary"
              style={{ padding: '5px 10px', fontSize: '0.75rem' }}
              title="Request browser GPS location"
            >
              <RefreshCw size={12} className={locationLoading ? 'animate-spin' : ''} />
              <span>{locationLoading ? 'Detecting...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Location Access Error/Denied Warning Banner */}
        {locationDenied && (
          <div style={{
            padding: '12px 18px',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            color: 'var(--accent-amber)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            marginBottom: '18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>
                Location access is required for nearby recommendations. Please allow browser GPS access.
              </span>
            </div>
            <button onClick={detectLocation} className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: '0.75rem', flexShrink: 0 }}>
              Enable Location
            </button>
          </div>
        )}
      </div>

      {/* TRIP CONTEXT PANEL */}
      <div className="glass-panel" style={{
        padding: '18px 22px',
        marginBottom: '26px',
        background: 'linear-gradient(135deg, rgba(21, 29, 48, 0.85) 0%, rgba(10, 14, 24, 0.95) 100%)',
        borderLeft: context?.hasTrip ? '3px solid var(--primary)' : '3px solid var(--text-dim)',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: context?.hasTrip ? 'var(--primary)' : 'var(--text-muted)', letterSpacing: '0.06em' }}>
            {context?.hasTrip ? 'Active Journey Context' : 'Local Exploration Mode (GPS Discovery)'}
          </div>
          {!context?.hasTrip && (
            <button onClick={() => navigate('/create-trip')} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.725rem', gap: '4px' }}>
              <PlusCircle size={12} /> Create Trip
            </button>
          )}
        </div>

        {contextLoading ? (
          <div style={{ padding: '8px 0', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            Loading active trip context...
          </div>
        ) : context?.hasTrip ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Active Trip</div>
              <div style={{ fontWeight: 700, fontSize: '0.925rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                {context.activeTrip.name}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Schedule Date</div>
              <div style={{ fontWeight: 600, fontSize: '0.925rem', color: 'var(--text-primary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Calendar size={13} style={{ color: 'var(--accent-cyan)' }} />
                Day {context.dayIndex} · {currentDateLabel}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Available Time</div>
              <div style={{ fontWeight: 700, fontSize: '0.975rem', color: 'var(--accent-emerald)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Clock size={14} />
                {context.availableTimeFormatted || 'Flexible'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Remaining Budget</div>
              <div style={{ fontWeight: 700, fontSize: '0.975rem', color: 'var(--primary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>

                {context.remainingBudget !== null ? `₹${context.remainingBudget.toLocaleString()}` : 'Budget not set'}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                GPS Nearby Discovery Active
              </div>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Showing authentic recommendations near your location. Create a trip to filter by available time gaps and remaining budget.
              </div>
            </div>
            <button onClick={() => navigate('/my-trips')} className="btn btn-secondary" style={{ fontSize: '0.775rem', padding: '6px 12px' }}>
              View My Trips <ArrowRight size={12} />
            </button>
          </div>
        )}
      </div>

      {/* EXPERIENCE INTENT CATEGORY SELECTOR */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '10px' }}>
          Experience Category
        </h3>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {INTENT_MODES.map(mode => {
            const isActive = activeIntent === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => handleIntentChange(mode.id)}
                className={isActive ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{
                  padding: '7px 16px',
                  fontSize: '0.825rem',
                  fontWeight: isActive ? 700 : 500,
                  borderRadius: 'var(--radius-full)'
                }}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTEXT MATCHED BANNER */}
      <div className="glass-panel" style={{
        padding: '14px 20px',
        marginBottom: '24px',
        background: 'rgba(168, 85, 247, 0.06)',
        borderLeft: '3px solid var(--accent-purple)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={18} style={{ color: 'var(--accent-purple)', flexShrink: 0 }} />
          <div>
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {context?.hasTrip ? 'ITINERARY & LOCATION MATCHED' : 'GPS NEARBY EXPERIENCES'}
            </span>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              {locationName ? (
                <>
                  Verified authentic places near <strong>{locationName}</strong>
                  {context?.hasTrip && context?.availableTimeFormatted ? ` fitting your ${context.availableTimeFormatted} free window` : ''}
                  {context?.hasTrip && context?.remainingBudget !== null ? ` within ₹${context.remainingBudget.toLocaleString()} budget` : ''}.
                </>
              ) : (
                'Grant browser location access to view places near your current position.'
              )}
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchRecs(activeIntent)}
          disabled={recsLoading || !userCoords}
          className="btn btn-secondary"
          style={{ padding: '6px 14px', fontSize: '0.775rem' }}
        >
          <RefreshCw size={13} className={recsLoading ? 'animate-spin' : ''} />
          <span>{recsLoading ? 'Searching...' : 'Refresh Results'}</span>
        </button>
      </div>

      {/* RECOMMENDED EXPERIENCES GRID & STATES */}
      {recsLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <RefreshCw size={28} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '14px' }} />
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {loadingStep}
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
            Searching verified places near your coordinates.
          </p>
        </div>
      ) : !userCoords ? (
        <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center', maxWidth: '520px', margin: '30px auto' }}>
          <MapPin size={32} style={{ color: 'var(--accent-amber)', marginBottom: '12px' }} />
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
            Location access required
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '440px', margin: '0 auto 18px auto' }}>
            {locationError ? locationError : 'Locora requires your browser GPS location to recommend authentic local and cultural experiences near you.'}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={detectLocation} className="btn btn-primary" style={{ padding: '8px 20px' }}>
              <RefreshCw size={14} /> Enable Location
            </button>
            <button onClick={detectLocation} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
              Retry
            </button>
          </div>
        </div>
      ) : recommendations.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {recommendations.map(rec => {
            const recId = rec.id || rec.placeId;
            return (
              <ExperienceCard
                key={recId}
                experience={rec}
                isAdded={addedIds.includes(recId)}
                isWishlisted={wishlistIds.includes(recId)}
                onAddToItinerary={handleAddToItinerary}
                onToggleWishlist={handleToggleWishlist}
                availableTimeLabel={context?.availableTimeFormatted ? `${context.availableTimeFormatted} gap` : 'Available'}
              />
            );
          })}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center', maxWidth: '500px', margin: '30px auto' }}>
          <Compass size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>
            No experiences found matching "{activeIntent}" near {locationName || 'your location'}
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '18px' }}>
            Try selecting a different experience category or refresh to check nearby places.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => handleIntentChange('local')} className="btn btn-primary" style={{ padding: '8px 16px' }}>
              Explore Local Category
            </button>
            <button onClick={() => fetchRecs(activeIntent)} className="btn btn-secondary" style={{ padding: '8px 14px' }}>
              Refresh Results
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Discover;
