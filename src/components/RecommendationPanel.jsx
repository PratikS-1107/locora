import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Clock,
  Coins,
  Search,
  RefreshCw,
  AlertCircle,
  LocateFixed,
  Compass,
  X,
  Loader2,
  Check
} from 'lucide-react';
import {
  getCurrentLocation,
  resolveLocationName,
  resolveDestinationLocation,
  getPlacesAutocomplete,
  getPlaceDetails,
  fetchRecommendations,
  addRecommendationToItinerary,
  toggleSaveWishlistItem,
  getSavedWishlistIds
} from '../services/api';
import RecommendationCard from './RecommendationCard';
import { useAuth } from '../context/AuthContext';

const CATEGORY_OPTIONS = [
  { id: null, label: 'All' },
  { id: 'food', label: 'Food' },
  { id: 'nature', label: 'Nature' },
  { id: 'culture', label: 'Culture' },
  { id: 'hidden gems', label: 'Hidden Gems' },
  { id: 'activities', label: 'Activities' },
  { id: 'workshops', label: 'Workshops' },
  { id: 'local', label: 'Local' }
];

const TIME_OPTIONS = [
  { label: 'Flexible', value: null },
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: '3 hours', value: 180 },
  { label: '4+ hours', value: 240 }
];

const BUDGET_OPTIONS = [
  { label: 'Any Budget', value: null },
  { label: 'Free Only', value: 0 },
  { label: '₹500', value: 500 },
  { label: '₹1,000', value: 1000 },
  { label: '₹2,500', value: 2500 },
  { label: '₹5,000', value: 5000 },
  { label: '₹10,000+', value: 10000 }
];

const RecommendationPanel = ({
  initialLocation = null,
  activeTrip = null,
  onAddToTrip = null,
  title = 'Real Place Recommendations',
  subtitle = 'Find authentic verified destinations that realistically fit your available time gap and budget.'
}) => {
  const { user } = useAuth();

  // Location State
  const [coords, setCoords] = useState(initialLocation?.coords || (initialLocation?.latitude ? initialLocation : null));
  const [locationName, setLocationName] = useState(initialLocation?.city || initialLocation?.formatted_address || '');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Search Destination State
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef(null);

  // Constraints State
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Results State
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [addedIds, setAddedIds] = useState([]);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [toastMsg, setToastMsg] = useState('');

  const isInitialMount = useRef(true);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Load wishlist IDs
  useEffect(() => {
    const loadWishlist = async () => {
      if (user?.id) {
        try {
          const res = await getSavedWishlistIds(user.id);
          setWishlistIds(res.data || []);
        } catch (_) {}
      }
    };
    loadWishlist();
  }, [user?.id]);

  // Autocomplete destination search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await getPlacesAutocomplete(searchQuery);
        if (res.success && Array.isArray(res.predictions)) {
          setSuggestions(res.predictions);
          setShowDropdown(true);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Detect GPS Location
  const handleDetectGps = async () => {
    setIsLocating(true);
    setLocationError(null);
    try {
      const pos = await getCurrentLocation();
      setCoords({ latitude: pos.latitude, longitude: pos.longitude });
      const nameData = await resolveLocationName(pos.latitude, pos.longitude);
      const label = nameData.city || nameData.formatted || `${pos.latitude.toFixed(2)}°, ${pos.longitude.toFixed(2)}°`;
      setLocationName(label);
      setSearchQuery('');
      setShowDropdown(false);
      showToast(`Location set to ${label}`);
      // Fetch recommendations immediately
      fetchData({ latitude: pos.latitude, longitude: pos.longitude, city: nameData.city, country: nameData.country });
    } catch (err) {
      setLocationError('Unable to detect your GPS. Please search your city or destination above.');
    } finally {
      setIsLocating(false);
    }
  };

  // Select place from autocomplete
  const handleSelectSuggestion = async (pred) => {
    const destText = pred.main_text || pred.description;
    setSearchQuery(destText);
    setShowDropdown(false);
    setIsSearching(true);
    setLocationError(null);

    try {
      let lat = null;
      let lng = null;
      let city = destText;
      let country = '';

      if (pred.place_id) {
        const details = await getPlaceDetails(pred.place_id);
        if (details && details.success && Number.isFinite(details.latitude) && Number.isFinite(details.longitude)) {
          lat = details.latitude;
          lng = details.longitude;
          city = details.destination || details.name || destText;
          country = details.country || '';
        }
      }

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setCoords({ latitude: lat, longitude: lng });
        setLocationName(city);
        showToast(`Searching experiences in ${city}`);
        fetchData({ latitude: lat, longitude: lng, city, country });
      } else {
        setLocationError('Unable to resolve coordinates for this destination.');
      }
    } catch (err) {
      setLocationError('Error locating destination coordinates.');
    } finally {
      setIsSearching(false);
    }
  };

  // Fetch recommendations from backend
  const fetchData = async (overrideCoords = null) => {
    const targetCoords = overrideCoords || coords;
    if (!targetCoords || !Number.isFinite(targetCoords.latitude) || !Number.isFinite(targetCoords.longitude)) {
      setLocationError('Please provide a location or use GPS detection.');
      return;
    }

    setIsLoading(true);
    setLocationError(null);

    try {
      const categoryParam = selectedCategory ? selectedCategory.toLowerCase().trim() : null;
      const res = await fetchRecommendations({
        location: {
          latitude: targetCoords.latitude,
          longitude: targetCoords.longitude,
          city: targetCoords.city || locationName,
          country: targetCoords.country || ''
        },
        availableMinutes: selectedTime,
        budget: selectedBudget,
        currency: 'INR',
        category: categoryParam,
        preferences: categoryParam ? [categoryParam] : []
      });

      if (res.success && Array.isArray(res.recommendations)) {
        setRecommendations(res.recommendations);
      } else {
        setRecommendations([]);
      }
      setHasSearched(true);
    } catch (err) {
      console.error('Recommendations fetch error:', err);
      setRecommendations([]);
      setHasSearched(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial GPS detection or destination resolution if location passed
  useEffect(() => {
    let isMounted = true;
    const initLocation = async () => {
      const cityQuery = initialLocation?.city || initialLocation?.destination || activeTrip?.destination;
      if (!coords && cityQuery) {
        setIsLocating(true);
        try {
          const resolved = await resolveDestinationLocation(cityQuery);
          if (isMounted && resolved && Number.isFinite(resolved.latitude) && Number.isFinite(resolved.longitude)) {
            setCoords({ latitude: resolved.latitude, longitude: resolved.longitude });
            setLocationName(resolved.city || cityQuery);
            fetchData({ latitude: resolved.latitude, longitude: resolved.longitude, city: resolved.city, country: resolved.country });
            return;
          }
        } catch (err) {
          console.warn('Could not resolve initial destination location:', err);
        } finally {
          if (isMounted) setIsLocating(false);
        }
      }

      if (!coords) {
        handleDetectGps();
      } else {
        fetchData(coords);
      }
    };

    initLocation();
    return () => {
      isMounted = false;
    };
  }, []);

  // Re-fetch when constraints change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (coords && Number.isFinite(coords.latitude) && Number.isFinite(coords.longitude)) {
      const debounceTimer = setTimeout(() => {
        fetchData(coords);
      }, 300);
      return () => clearTimeout(debounceTimer);
    }
  }, [selectedTime, selectedBudget, selectedCategory]);

  // Handle Add to Trip
  const handleAddToItinerary = async (rec) => {
    if (onAddToTrip) {
      onAddToTrip(rec);
      setAddedIds(prev => [...prev, rec.placeId || rec.id]);
      showToast(`Added "${rec.name}" to trip schedule.`);
      return;
    }

    if (activeTrip?.id) {
      try {
        await addRecommendationToItinerary(rec, activeTrip.id);
        setAddedIds(prev => [...prev, rec.placeId || rec.id]);
        showToast(`Added "${rec.name}" to your active trip.`);
      } catch (err) {
        showToast('Unable to add activity right now.');
      }
    } else {
      setAddedIds(prev => [...prev, rec.placeId || rec.id]);
      showToast(`Added "${rec.name}" to itinerary.`);
    }
  };

  // Handle Wishlist Toggle
  const handleToggleWishlist = async (rec) => {
    if (!user?.id) {
      showToast('Please log in to save items to your wishlist.');
      return;
    }
    const recId = rec.placeId || rec.id;
    try {
      const res = await toggleSaveWishlistItem(rec, user.id);
      if (res.data?.isSaved) {
        setWishlistIds(prev => [...prev, recId]);
        showToast(`Saved "${rec.name}" to wishlist.`);
      } else {
        setWishlistIds(prev => prev.filter(id => id !== recId));
        showToast(`Removed from wishlist.`);
      }
    } catch (_) {
      showToast('Wishlist update failed.');
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--accent-emerald)',
          color: 'var(--text-primary)',
          padding: '10px 18px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.85rem',
          fontWeight: 600,
          animation: 'slideUp 0.3s ease-out'
        }}>
          <Check size={16} style={{ color: 'var(--accent-emerald)' }} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Control Filters Panel */}
      <div
        className="glass-panel"
        style={{
          padding: '20px',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={20} style={{ color: 'var(--primary)' }} />
              {title}
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              {subtitle}
            </p>
          </div>

          {/* Refresh Action */}
          <button
            onClick={() => fetchData()}
            disabled={isLoading || !coords}
            className="btn btn-secondary"
            style={{ padding: '7px 14px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>{isLoading ? 'Finding Experiences...' : 'Update Recommendations'}</span>
          </button>
        </div>

        {/* Location & Autocomplete Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', alignItems: 'center' }}>
          {/* Destination Search */}
          <div ref={searchContainerRef} style={{ position: 'relative' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0 12px',
              gap: '8px'
            }}>
              <Search size={15} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={locationName ? `Current: ${locationName}` : 'Search city or destination...'}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  padding: '10px 0'
                }}
              />
              {isSearching && <Loader2 size={15} className="animate-spin" style={{ color: 'var(--primary)' }} />}
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setSuggestions([]); }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                zIndex: 50,
                maxHeight: '220px',
                overflowY: 'auto'
              }}>
                {suggestions.map(s => (
                  <button
                    key={s.place_id}
                    onClick={() => handleSelectSuggestion(s)}
                    style={{
                      width: '100%',
                      padding: '9px 14px',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <MapPin size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.description}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* GPS Quick Action Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleDetectGps}
              disabled={isLocating}
              className="btn btn-secondary"
              style={{
                padding: '9px 14px',
                fontSize: '0.825rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              <LocateFixed size={15} style={{ color: isLocating ? 'var(--primary)' : 'var(--accent-cyan)' }} className={isLocating ? 'animate-spin' : ''} />
              <span>{isLocating ? 'Locating...' : 'Use My GPS'}</span>
            </button>

            {locationName && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={13} style={{ color: 'var(--accent-emerald)' }} />
                <strong>{locationName}</strong>
              </span>
            )}
          </div>
        </div>

        {locationError && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            color: '#f87171',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={15} />
            <span>{locationError}</span>
          </div>
        )}

        {/* Constraint Filters (Time, Budget, Category) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
          {/* Time Selector */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
              <Clock size={12} style={{ color: 'var(--primary)' }} />
              <span>Available Time</span>
            </label>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {TIME_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => setSelectedTime(opt.value)}
                  className={selectedTime === opt.value ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ padding: '4px 8px', fontSize: '0.725rem' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Budget Selector */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
              <Coins size={12} style={{ color: 'var(--accent-emerald)' }} />
              <span>Budget Limit (INR)</span>
            </label>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {BUDGET_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => setSelectedBudget(opt.value)}
                  className={selectedBudget === opt.value ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ padding: '4px 8px', fontSize: '0.725rem' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Selector */}
          <div style={{ gridColumn: 'span 1' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
              <span>Category / Interest</span>
            </label>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {CATEGORY_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => setSelectedCategory(opt.id)}
                  className={selectedCategory === opt.id ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ padding: '4px 8px', fontSize: '0.725rem' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations Output Grid */}
      <div>
        {isLoading ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '18px'
          }}>
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="glass-panel"
                style={{
                  height: '380px',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  animation: 'pulse 1.5s infinite',
                  opacity: 0.6
                }}
              />
            ))}
          </div>
        ) : recommendations.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '18px'
          }}>
            {recommendations.map((rec) => (
              <RecommendationCard
                key={rec.placeId || rec.id}
                recommendation={rec}
                onAddToItinerary={handleAddToItinerary}
                onToggleWishlist={handleToggleWishlist}
                isAdded={addedIds.includes(rec.placeId || rec.id)}
                isWishlisted={wishlistIds.includes(rec.placeId || rec.id)}
              />
            ))}
          </div>
        ) : hasSearched ? (
          <div
            className="glass-panel"
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <Compass size={36} style={{ color: 'var(--text-muted)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              No verified experiences matched your exact constraints
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '460px' }}>
              Try expanding your available time window, choosing "Flexible", or switching to another category (such as Culture or Local).
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default RecommendationPanel;
