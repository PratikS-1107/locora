import React, { useState, useEffect, useRef } from 'react';
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
  toggleSaveWishlistItem,
  getPlacesAutocomplete,
  getPlaceDetails,
  resolveDestinationLocation,
  fetchLiveDestinationWeather
} from '../services/api';
import { formatDuration, getTodayLocalDateString } from '../utils/formatters';
import ExperienceCard from '../components/ExperienceCard';
import WeatherDigitalTwin from '../components/WeatherDigitalTwin';
import {
  Sparkles,
  MapPin,
  Clock,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Compass,
  Navigation,
  PlusCircle,
  ArrowRight,
  Search,
  X,
  Loader2,
  LocateFixed,
  Globe
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

  // Location Context Modes: 'gps' | 'destination' | 'active_trip'
  const [locationMode, setLocationMode] = useState('gps');
  const [isManualOverride, setIsManualOverride] = useState(false);

  // User-Selected Destination State
  const [selectedDestination, setSelectedDestination] = useState(null);

  // Refs to prevent asynchronous stale closures (e.g. from detectLocation or loadDiscoverContext)
  // from accidentally overwriting a user's manually searched destination
  const locationModeRef = useRef('gps');
  const selectedDestinationRef = useRef(null);
  const isManualOverrideRef = useRef(false);

  useEffect(() => {
    locationModeRef.current = locationMode;
  }, [locationMode]);
  useEffect(() => {
    selectedDestinationRef.current = selectedDestination;
  }, [selectedDestination]);
  useEffect(() => {
    isManualOverrideRef.current = isManualOverride;
  }, [isManualOverride]);

  // Browser GPS State
  const [userGpsCoords, setUserGpsCoords] = useState(null);
  const [userGpsName, setUserGpsName] = useState(null);
  const [userGpsSource, setUserGpsSource] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Destination Search UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef(null);
  const isSelectingPredictionRef = useRef(false);

  // Itinerary Context State
  const [context, setContext] = useState(null);
  const [contextLoading, setContextLoading] = useState(true);

  // Intent / Category State
  const [activeIntent, setActiveIntent] = useState('local');

  // Discovery Process Loading Step
  const [loadingStep, setLoadingStep] = useState('Detecting location...');

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

  // Close destination search suggestions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced Destination Autocomplete Search (Google Places)
  useEffect(() => {
    if (isSelectingPredictionRef.current) {
      isSelectingPredictionRef.current = false;
      setIsSearchingPlaces(false);
      return;
    }

    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchSuggestions([]);
      setIsSearchingPlaces(false);
      return;
    }

    setIsSearchingPlaces(true);
    setShowSuggestions(true);

    const timer = setTimeout(async () => {
      try {
        console.log('[Discover Search] Autocomplete request fired for:', trimmed);
        const res = await getPlacesAutocomplete(trimmed);
        console.log('[Discover Search] Autocomplete response received:', res);
        if (res && res.success && Array.isArray(res.predictions)) {
          console.log(`[Discover Search] Updated searchSuggestions with ${res.predictions.length} results`);
          setSearchSuggestions(res.predictions);
        } else {
          setSearchSuggestions([]);
        }
      } catch (err) {
        console.error('[Discover Search] Destination autocomplete search error:', err);
        setSearchSuggestions([]);
      } finally {
        setIsSearchingPlaces(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  // Derive the active location object based on mode priority
  // Rule: When user selects 'destination', NEVER silently fall back to GPS or Active Trip
  const getEffectiveLocation = () => {
    if (locationMode === 'destination') {
      return selectedDestination;
    }
    if (locationMode === 'active_trip') {
      return (context?.hasTrip && context?.activeTripLocation) ? context.activeTripLocation : null;
    }
    if (locationMode === 'gps') {
      if (userGpsCoords) {
        return {
          destination: userGpsName?.split(',')[0]?.trim() || 'Current Location',
          city: userGpsName?.split(',')[0]?.trim() || 'Current Location',
          country: userGpsName?.includes(',') ? userGpsName.split(',')[1]?.trim() : '',
          country_code: '',
          latitude: userGpsCoords.latitude,
          longitude: userGpsCoords.longitude,
          formatted_address: userGpsName || 'Current Location',
          source: userGpsSource || 'Browser GPS'
        };
      }
      return null;
    }
    // Initial mount fallback before user interaction:
    if (selectedDestination) return selectedDestination;
    if (context?.hasTrip && context?.activeTripLocation && !isManualOverride) return context.activeTripLocation;
    if (userGpsCoords) {
      return {
        destination: userGpsName?.split(',')[0]?.trim() || 'Current Location',
        city: userGpsName?.split(',')[0]?.trim() || 'Current Location',
        country: userGpsName?.includes(',') ? userGpsName.split(',')[1]?.trim() : '',
        country_code: '',
        latitude: userGpsCoords.latitude,
        longitude: userGpsCoords.longitude,
        formatted_address: userGpsName || 'Current Location',
        source: userGpsSource || 'Browser GPS'
      };
    }
    return null;
  };

  // 1. Fetch Supabase User Active Trip & Itinerary Context
  const loadDiscoverContext = async () => {
    setContextLoading(true);
    try {
      if (user?.id) {
        const ctx = await getDiscoverContext(user.id);
        setContext(ctx);

        // Priority Rule: If active trip exists and user has NOT manually chosen a destination, set active_trip mode
        if (ctx.hasTrip && ctx.activeTripLocation && !isManualOverrideRef.current && !selectedDestinationRef.current && locationModeRef.current !== 'destination') {
          setLocationMode('active_trip');
          locationModeRef.current = 'active_trip';
        }
      } else {
        setContext({
          hasTrip: false,
          activeTrip: null,
          activeTripLocation: null,
          todayDate: getTodayLocalDateString(),
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
        activeTripLocation: null,
        todayDate: getTodayLocalDateString(),
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
      setUserGpsCoords(coords);

      setLoadingStep('Resolving location address via Google Maps...');
      const resolved = await resolveLocationName(coords.latitude, coords.longitude);
      setUserGpsName(resolved.formatted);
      setUserGpsSource(resolved.source || 'Browser GPS');

      // If no manual destination override and no active trip, stay in GPS mode
      if (!isManualOverrideRef.current && locationModeRef.current !== 'destination' && !selectedDestinationRef.current && (!context?.hasTrip || !context?.activeTripLocation)) {
        setLocationMode('gps');
        locationModeRef.current = 'gps';
      }
    } catch (err) {
      console.warn('Geolocation detection error:', err);
      setLocationDenied(true);
      setUserGpsCoords(null);
      setUserGpsName(null);
      setUserGpsSource(null);
      setLocationError(err.message || 'Location permission denied or unavailable.');
    } finally {
      setLocationLoading(false);
    }
  };

  // 3. Fetch Recommendations based on the active location coordinates
  const fetchRecs = async (overrideIntent = activeIntent, locationObj = null, modeOverride = null, forceRefresh = false) => {
    const currentMode = modeOverride || locationMode;
    const loc = locationObj || (currentMode === 'destination' ? selectedDestination : getEffectiveLocation());

    if (!loc || !Number.isFinite(loc.latitude) || !Number.isFinite(loc.longitude)) {
      setRecommendations([]);
      setRecsLoading(false);
      return;
    }

    setRecsLoading(true);
    const destLabel = loc.destination || loc.city || 'area';
    setLoadingStep(`Searching verified places in ${destLabel} for ${overrideIntent} mode...`);

    try {
      const recs = await getRecommendations({
        location: {
          city: loc.city || loc.destination || null,
          country: loc.country || null,
          coords: {
            latitude: loc.latitude,
            longitude: loc.longitude
          }
        },
        trip: currentMode === 'active_trip' ? (context?.activeTrip || null) : null,
        available_windows: currentMode === 'active_trip' ? (context?.availableWindows || (context?.availableTimeMinutes ? [{ duration_minutes: context.availableTimeMinutes }] : [])) : [],
        intent: overrideIntent,
        availableTimeMinutes: currentMode === 'active_trip' ? (context?.availableTimeMinutes || null) : null,
        remainingBudget: currentMode === 'active_trip' ? (context?.remainingBudget || null) : null,
        occupiedItems: currentMode === 'active_trip' ? (context?.occupiedItems || []) : []
      }, { forceRefresh });

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

  // Synchronize recommendations when active location or category changes
  const activeLoc = getEffectiveLocation();
  const activeLat = activeLoc?.latitude;
  const activeLng = activeLoc?.longitude;

  useEffect(() => {
    if (Number.isFinite(activeLat) && Number.isFinite(activeLng)) {
      fetchRecs(activeIntent, activeLoc);
    } else if (!locationLoading && !contextLoading) {
      setRecommendations([]);
      setRecsLoading(false);
    }
  }, [activeLat, activeLng, activeIntent, locationMode]);

  // Handle Intent / Category Switch
  const handleIntentChange = (intentId) => {
    setActiveIntent(intentId);
  };

  // Submit manual destination search (e.g. on Enter key)
  const handleSearchSubmit = async (queryText = searchQuery) => {
    const q = (queryText || '').trim();
    if (!q) return;

    if (searchSuggestions.length > 0) {
      handleSelectPrediction(searchSuggestions[0]);
      return;
    }

    isSelectingPredictionRef.current = true;
    setIsSearchingPlaces(true);
    setShowSuggestions(false);
    try {
      const resolved = await resolveDestinationLocation(q);
      if (resolved && Number.isFinite(resolved.latitude) && Number.isFinite(resolved.longitude)) {
        const newDestLocation = {
          name: resolved.city || resolved.destination || q,
          destination: resolved.city || resolved.destination || q,
          city: resolved.city || resolved.destination || q,
          address: resolved.formatted_address || q,
          country: resolved.country || '',
          country_code: resolved.country_code || '',
          latitude: Number(resolved.latitude),
          longitude: Number(resolved.longitude),
          placeId: resolved.place_id || '',
          place_id: resolved.place_id || '',
          formatted_address: resolved.formatted_address || q,
          source: resolved.source || 'Search'
        };
        locationModeRef.current = 'destination';
        selectedDestinationRef.current = newDestLocation;
        isManualOverrideRef.current = true;
        setSelectedDestination(newDestLocation);
        setLocationMode('destination');
        setIsManualOverride(true);
        showToast(`Exploring experiences in ${resolved.city || q}`);
        fetchRecs(activeIntent, newDestLocation, 'destination', false);
      } else {
        showToast("Couldn't resolve that location. Try another place or area.");
      }
    } catch (err) {
      showToast("Couldn't resolve that location. Try another place or area.");
    } finally {
      setIsSearchingPlaces(false);
    }
  };

  // Handle Destination Prediction Selection from Google Places Autocomplete
  const handleSelectPrediction = async (prediction) => {
    console.log('[Discover Search] User selected prediction:', prediction);
    isSelectingPredictionRef.current = true;
    const destName = prediction.main_text || prediction.description;
    setSearchQuery(destName);
    setShowSuggestions(false);
    setSearchSuggestions([]);
    setIsSearchingPlaces(true);

    try {
      let lat = null;
      let lng = null;
      let country = '';
      let countryCode = '';
      let formattedAddress = prediction.description || destName;
      let city = destName;

      // 1. Fetch exact place details
      if (prediction.place_id) {
        console.log('[Discover Search] Place details request fired for place_id:', prediction.place_id);
        const details = await getPlaceDetails(prediction.place_id);
        console.log('[Discover Search] Place details response received:', details);
        if (details && details.success) {
          lat = details.latitude ?? null;
          lng = details.longitude ?? null;
          if (details.country) country = details.country;
          if (details.country_code) countryCode = details.country_code;
          if (details.destination) city = details.destination;
          if (details.formatted_address) formattedAddress = details.formatted_address;
        }
      }

      // 2. Fallback coordinates if place details lacked lat/lng
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        console.log('[Discover Search] Resolving coordinates fallback for:', destName);
        const resolved = await resolveDestinationLocation(destName);
        console.log('[Discover Search] Fallback resolved coordinates received:', resolved);
        if (resolved && Number.isFinite(resolved.latitude) && Number.isFinite(resolved.longitude)) {
          lat = resolved.latitude;
          lng = resolved.longitude;
          if (resolved.country) country = resolved.country;
          if (resolved.country_code) countryCode = resolved.country_code;
          if (resolved.city) city = resolved.city;
        }
      }

      console.log(`[Discover Search] Coordinates received: lat=${lat}, lng=${lng}`);

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const newDestLocation = {
          name: city || destName,
          destination: city || destName,
          city: city || destName,
          address: formattedAddress,
          country,
          country_code: countryCode,
          latitude: Number(lat),
          longitude: Number(lng),
          placeId: prediction.place_id || '',
          place_id: prediction.place_id || '',
          formatted_address: formattedAddress,
          source: 'Google Places'
        };

        console.log('[Discover Search] Setting locationMode = "destination" with destination:', newDestLocation);
        locationModeRef.current = 'destination';
        selectedDestinationRef.current = newDestLocation;
        isManualOverrideRef.current = true;
        setSelectedDestination(newDestLocation);
        setLocationMode('destination');
        setIsManualOverride(true);
        showToast(`Exploring experiences in ${city || destName}`);
        console.log('[Discover Search] Recommendation request uses coordinates:', newDestLocation.latitude, newDestLocation.longitude);
        fetchRecs(activeIntent, newDestLocation, 'destination', false);
      } else {
        showToast("Couldn't resolve that location. Try another place or area.");
      }
    } catch (err) {
      console.error('[Discover Search] Error selecting destination:', err);
      showToast("Couldn't resolve that location. Try another place or area.");
    } finally {
      setIsSearchingPlaces(false);
    }
  };

  // Switch to Current Browser GPS Location
  const handleUseCurrentLocation = async () => {
    locationModeRef.current = 'gps';
    selectedDestinationRef.current = null;
    isManualOverrideRef.current = true;
    setIsManualOverride(true);
    setLocationMode('gps');
    setSelectedDestination(null);
    setSearchQuery('');
    setShowSuggestions(false);

    if (userGpsCoords && Number.isFinite(userGpsCoords.latitude) && Number.isFinite(userGpsCoords.longitude)) {
      showToast(`Switched to current location (${userGpsName?.split(',')[0]?.trim() || 'GPS'})`);
      const gpsLocation = {
        destination: userGpsName?.split(',')[0]?.trim() || 'Current Location',
        city: userGpsName?.split(',')[0]?.trim() || 'Current Location',
        country: userGpsName?.includes(',') ? userGpsName.split(',')[1]?.trim() : '',
        country_code: '',
        latitude: userGpsCoords.latitude,
        longitude: userGpsCoords.longitude,
        formatted_address: userGpsName || 'Current Location',
        source: userGpsSource || 'Browser GPS'
      };
      fetchRecs(activeIntent, gpsLocation, 'gps');
    } else {
      await detectLocation();
    }
  };

  // Switch to Active Trip Destination
  const handleSwitchToActiveTrip = () => {
    if (context?.hasTrip && context?.activeTripLocation) {
      locationModeRef.current = 'active_trip';
      selectedDestinationRef.current = null;
      isManualOverrideRef.current = false;
      setIsManualOverride(false);
      setLocationMode('active_trip');
      setSelectedDestination(null);
      setSearchQuery('');
      setShowSuggestions(false);
      showToast(`Switched to active trip destination (${context.destination})`);
      fetchRecs(activeIntent, context.activeTripLocation, 'active_trip');
    }
  };

  // Clear manual destination search
  const handleClearDestinationSearch = () => {
    selectedDestinationRef.current = null;
    setSelectedDestination(null);
    setSearchQuery('');
    setShowSuggestions(false);
    setSearchSuggestions([]);

    if (context?.hasTrip && context?.activeTripLocation) {
      locationModeRef.current = 'active_trip';
      isManualOverrideRef.current = false;
      setLocationMode('active_trip');
      setIsManualOverride(false);
      fetchRecs(activeIntent, context.activeTripLocation, 'active_trip');
    } else {
      locationModeRef.current = 'gps';
      setLocationMode('gps');
      if (userGpsCoords) {
        const gpsLocation = {
          destination: userGpsName?.split(',')[0]?.trim() || 'Current Location',
          city: userGpsName?.split(',')[0]?.trim() || 'Current Location',
          country: userGpsName?.includes(',') ? userGpsName.split(',')[1]?.trim() : '',
          country_code: '',
          latitude: userGpsCoords.latitude,
          longitude: userGpsCoords.longitude,
          formatted_address: userGpsName || 'Current Location',
          source: userGpsSource || 'Browser GPS'
        };
        fetchRecs(activeIntent, gpsLocation, 'gps');
      } else {
        detectLocation();
      }
    }
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
      setConflictMsg(`This experience (${formatDuration(durationMinutes)}) exceeds your available free window (${context?.availableTimeFormatted}).`);
      setTimeout(() => setConflictMsg(''), 3500);
      return;
    }

    try {
      const tripId = context.activeTrip.id;
      const dateStr = context.todayDate || getTodayLocalDateString();
      await addRecommendationToItinerary(rec, tripId, dateStr);

      setAddedIds(prev => [...prev, rec.id || rec.placeId]);
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

  // Active Location Header Labels
  const effectiveLocation = getEffectiveLocation();
  const activeCityName = effectiveLocation?.destination || effectiveLocation?.city || 'Selected Location';

  const getLocationHeaderBadge = () => {
    if (locationMode === 'destination') {
      return `📍 Exploring ${activeCityName}`;
    }
    if (locationMode === 'active_trip') {
      return `📍 Exploring ${context?.destination || activeCityName}`;
    }
    return userGpsName ? `📍 Near ${userGpsName.split(',')[0]?.trim()}` : '📍 Detecting Location...';
  };

  // Live Weather for Active Discovery Destination (Follows Destination / Active Trip / Current Location)
  const [liveWeather, setLiveWeather] = useState(null);

  useEffect(() => {
    if (effectiveLocation && (Number.isFinite(effectiveLocation.latitude) || effectiveLocation.destination || effectiveLocation.city)) {
      fetchLiveDestinationWeather({
        latitude: effectiveLocation.latitude,
        longitude: effectiveLocation.longitude,
        destination: effectiveLocation.destination || effectiveLocation.city
      }).then(res => {
        if (res && res.success) {
          setLiveWeather(res);
        } else {
          setLiveWeather(null);
        }
      }).catch(() => setLiveWeather(null));
    }
  }, [effectiveLocation?.latitude, effectiveLocation?.longitude, effectiveLocation?.destination, effectiveLocation?.city]);

  // Weather Suitability Signal Generator for Recommended Experiences
  const getExperienceWeatherSignal = (exp) => {
    if (!liveWeather) return null;
    const rain = Number(liveWeather.rain?.probabilityPercent ?? 15);
    const temp = Number(liveWeather.temperature ?? 24);
    const text = `${exp.name || exp.title || ''} ${exp.category || ''} ${exp.description || ''} ${exp.whyVisit || ''}`.toLowerCase();
    
    const isOutdoor = text.includes('park') || text.includes('nature') || text.includes('hike') || text.includes('viewpoint') || text.includes('trail') || text.includes('outdoor') || text.includes('garden') || text.includes('walk') || text.includes('beach') || text.includes('trek');
    const isIndoor = text.includes('museum') || text.includes('cafe') || text.includes('gallery') || text.includes('workshop') || text.includes('dining') || text.includes('restaurant') || text.includes('tea') || text.includes('spa') || text.includes('craft') || text.includes('indoor');

    if (rain > 45) {
      if (isOutdoor) return { type: 'exposed', label: '🌧️ Rain Exposed' };
      if (isIndoor) return { type: 'sheltered', label: '🛡️ Weather Sheltered' };
    } else if (temp > 33) {
      if (isOutdoor) return { type: 'exposed', label: '☀️ High Heat Index' };
      if (isIndoor) return { type: 'sheltered', label: '❄️ Air-Conditioned' };
    } else if (rain < 25 && isOutdoor) {
      return { type: 'optimal', label: '☀️ Weather Ideal' };
    }
    if (isIndoor) return { type: 'sheltered', label: '🏛️ Sheltered Venue' };
    return null;
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#070a10',
        color: '#ffffff',
        overflowX: 'hidden'
      }}
    >
      {/* 1. CINEMATIC DARK BACKGROUND WITH SUBTLE OVERLAYS */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          backgroundColor: '#070a10',
          pointerEvents: 'none',
          zIndex: 0
        }}
      >
        <img
          className="page-bg-entrance"
          src="/discover-fuji.jpg"
          alt="Discover Landscape Background"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 40%',
            filter: 'brightness(0.75) contrast(1.05)'
          }}
        />

        {/* Soft Dark Vignette & Gradient Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to bottom, rgba(7, 10, 16, 0.35) 0%, rgba(7, 10, 16, 0.5) 25%, rgba(7, 10, 16, 0.8) 60%, rgba(7, 10, 16, 0.98) 100%)',
            pointerEvents: 'none'
          }}
        />
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '1280px', margin: '0 auto', padding: '96px 32px 60px 32px' }}>

      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
          backgroundColor: 'rgba(12, 16, 26, 0.95)', border: '1px solid #0ea5e9',
          borderRadius: '12px', padding: '14px 20px', color: '#fff',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <CheckCircle2 size={18} style={{ color: '#38bdf8' }} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Warning Toast */}
      {conflictMsg && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
          backgroundColor: 'rgba(239, 68, 68, 0.95)', border: '1px solid #fca5a5',
          borderRadius: '12px', padding: '14px 20px', color: '#fff',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <AlertCircle size={18} />
          <span>{conflictMsg}</span>
        </div>
      )}

      {/* DISCOVER HEADER & DESTINATION SEARCH BAR */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '18px', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
              <span className="badge badge-purple">
                <Sparkles size={11} /> Context-Aware Discovery
              </span>
              {hasGoogleKey && (
                <span className="badge badge-primary">
                  <Navigation size={10} /> Verified Places Data
                </span>
              )}
              {locationMode === 'destination' && (
                <span className="badge" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                  <Globe size={11} /> Destination Search Mode
                </span>
              )}
              {locationMode === 'active_trip' && (
                <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <Compass size={11} /> Active Trip Destination
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '2.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              Discover
            </h1>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Authentic local places and experiences matched to your live location, destination, or travel journey.
            </p>
          </div>

          {/* ACTIVE LOCATION STATUS CHIP */}
          <div className="glass-panel" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MapPin size={17} style={{ color: locationMode === 'destination' ? 'var(--primary)' : (locationMode === 'active_trip' ? 'var(--accent-emerald)' : (locationDenied ? 'var(--accent-amber)' : 'var(--accent-emerald)')) }} />
            <div>
              <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {locationMode === 'destination' ? 'Selected Destination' : (locationMode === 'active_trip' ? 'Active Journey Destination' : `Current Location (${userGpsSource || 'GPS'})`)}
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {getLocationHeaderBadge()}
              </div>
            </div>
            <button
              onClick={() => fetchRecs(activeIntent, null, null, true)}
              disabled={recsLoading || !effectiveLocation}
              className="btn btn-secondary"
              style={{ padding: '5px 10px', fontSize: '0.75rem', marginLeft: '4px' }}
              title="Refresh experiences for current location"
            >
              <RefreshCw size={12} className={recsLoading ? 'animate-spin' : ''} />
              <span>{recsLoading ? '...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* DESTINATION SEARCH & LOCATION CONTROLS BAR */}
        <div className="glass-panel" style={{
          position: 'relative',
          zIndex: 50,
          overflow: 'visible',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid var(--border-medium)'
        }}>
          {/* Real Google Places Autocomplete Destination Input */}
          <div style={{ flex: '1 1 340px', minWidth: '260px', position: 'relative', zIndex: 60, overflow: 'visible' }} ref={searchContainerRef}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'absolute', left: '12px', pointerEvents: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                {isSearchingPlaces ? (
                  <Loader2 size={16} className="animate-spin" style={{ color: 'var(--primary)' }} />
                ) : (
                  <Search size={16} />
                )}
              </div>

              <input
                type="text"
                className="form-input"
                placeholder="Search any destination (e.g. Udaipur, Manali, London, Tokyo)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!showSuggestions && e.target.value.trim().length >= 2) setShowSuggestions(true);
                }}
                onFocus={() => {
                  if (searchQuery.trim().length >= 2) setShowSuggestions(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowSuggestions(false);
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchSubmit();
                  }
                }}
                style={{
                  height: '42px',
                  fontSize: '0.875rem',
                  paddingLeft: '38px',
                  paddingRight: searchQuery ? '36px' : '12px',
                  backgroundColor: 'rgba(11, 16, 28, 0.95)',
                  border: locationMode === 'destination' ? '1px solid var(--primary-border)' : '1px solid var(--border-subtle)'
                }}
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchSuggestions([]);
                    setShowSuggestions(false);
                    setIsSearchingPlaces(false);
                  }}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '22px',
                    height: '22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                  title="Clear input"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Suggestions Dropdown - Positioned cleanly and elevated above the rest of the page */}
            {showSuggestions && searchQuery.trim().length >= 2 && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  zIndex: 200,
                  backgroundColor: 'rgba(12, 17, 30, 0.98)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 20px 48px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(14, 165, 233, 0.25)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  maxHeight: '280px',
                  overflowY: 'auto'
                }}
              >
                {isSearchingPlaces ? (
                  <div style={{
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: 'var(--text-secondary)',
                    fontSize: '0.85rem'
                  }}>
                    <Loader2 size={16} className="animate-spin" style={{ color: 'var(--primary)' }} />
                    <span>Searching destinations for "{searchQuery}"...</span>
                  </div>
                ) : searchSuggestions.length > 0 ? (
                  searchSuggestions.map((pred) => (
                    <div
                      key={pred.place_id || pred.description}
                      onClick={() => handleSelectPrediction(pred)}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <MapPin size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {pred.main_text || pred.description}
                        </div>
                        {pred.secondary_text && (
                          <div style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginTop: '2px'
                          }}>
                            {pred.secondary_text}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{
                    padding: '14px 18px',
                    color: 'var(--text-secondary)',
                    fontSize: '0.85rem',
                    textAlign: 'center'
                  }}>
                    No destinations found for "{searchQuery}". Try pressing Enter to search.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Location Mode Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Reset / Use Current Location Button */}
            <button
              onClick={handleUseCurrentLocation}
              className={locationMode === 'gps' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ padding: '7px 14px', fontSize: '0.8rem', gap: '6px' }}
              title="Switch to browser GPS location"
            >
              <LocateFixed size={14} />
              <span>Use my current location</span>
            </button>

            {/* Switch to Active Trip Button (if user has an active trip and is currently viewing another location) */}
            {context?.hasTrip && context?.activeTripLocation && locationMode !== 'active_trip' && (
              <button
                onClick={handleSwitchToActiveTrip}
                className="btn btn-secondary"
                style={{ padding: '7px 14px', fontSize: '0.8rem', gap: '6px', borderColor: 'var(--accent-emerald-subtle)', color: 'var(--accent-emerald)' }}
                title={`Switch back to active trip in ${context.destination}`}
              >
                <Compass size={14} />
                <span>Active Trip: {context.destination}</span>
              </button>
            )}

            {/* Clear Destination Button (if in destination search mode) */}
            {locationMode === 'destination' && (
              <button
                onClick={handleClearDestinationSearch}
                className="btn btn-secondary"
                style={{ padding: '7px 12px', fontSize: '0.8rem', gap: '4px' }}
                title="Reset destination"
              >
                <X size={13} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Location Access Error/Denied Warning Banner */}
        {locationDenied && locationMode === 'gps' && (
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
                Browser GPS is unavailable or disabled. You can search any destination above (e.g. Udaipur, London) or enable location access.
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
        position: 'relative',
        zIndex: 1,
        padding: '18px 22px',
        marginBottom: '26px',
        background: 'linear-gradient(135deg, rgba(21, 29, 48, 0.85) 0%, rgba(10, 14, 24, 0.95) 100%)',
        borderLeft: locationMode === 'destination' ? '3px solid var(--accent-cyan)' : (context?.hasTrip ? '3px solid var(--primary)' : '3px solid var(--text-dim)'),
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: locationMode === 'destination' ? 'var(--accent-cyan)' : (context?.hasTrip ? 'var(--primary)' : 'var(--text-muted)'),
            letterSpacing: '0.06em',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            {locationMode === 'destination' ? (
              <>
                <Globe size={13} style={{ color: 'var(--accent-cyan)' }} />
                <span>DISCOVERING DESTINATION: {activeCityName.toUpperCase()} (MANUAL OVERRIDE)</span>
              </>
            ) : context?.hasTrip ? (
              <>
                <Compass size={13} style={{ color: 'var(--primary)' }} />
                <span>ACTIVE JOURNEY CONTEXT</span>
              </>
            ) : (
              <span>LOCAL EXPLORATION MODE (GPS DISCOVERY)</span>
            )}
          </div>

          {locationMode === 'destination' && context?.hasTrip && (
            <button
              onClick={handleSwitchToActiveTrip}
              className="btn btn-secondary"
              style={{ padding: '4px 12px', fontSize: '0.725rem', gap: '6px' }}
            >
              <Compass size={12} style={{ color: 'var(--accent-emerald)' }} />
              <span>Return to Active Trip ({context.destination})</span>
            </button>
          )}

          {!context?.hasTrip && locationMode !== 'destination' && (
            <button onClick={() => navigate('/create-trip')} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.725rem', gap: '4px' }}>
              <PlusCircle size={12} /> Create Trip
            </button>
          )}
        </div>

        {contextLoading ? (
          <div style={{ padding: '8px 0', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            Loading active trip context...
          </div>
        ) : locationMode === 'destination' ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ fontSize: '0.975rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={17} style={{ color: 'var(--accent-cyan)' }} />
                <span>Currently discovering places in {effectiveLocation?.formatted_address || activeCityName}</span>
              </div>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {context?.hasTrip ? (
                  <span>
                    Active trip <strong style={{ color: '#fff' }}>{context.activeTrip.name || context.activeTrip.title}</strong> is saved in background. Discovery is focused on <strong style={{ color: 'var(--accent-cyan)' }}>{activeCityName}</strong>.
                  </span>
                ) : (
                  <span>Showing authentic verified experiences near {activeCityName}.</span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => fetchRecs(activeIntent, selectedDestination, 'destination', true)}
                disabled={recsLoading}
                className="btn btn-secondary"
                style={{ padding: '6px 14px', fontSize: '0.775rem', gap: '6px' }}
              >
                <RefreshCw size={13} className={recsLoading ? 'animate-spin' : ''} />
                <span>Refresh {activeCityName}</span>
              </button>
              <button
                onClick={handleClearDestinationSearch}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.775rem', gap: '4px' }}
              >
                <X size={13} />
                <span>Reset to {context?.hasTrip ? 'Trip' : 'GPS'}</span>
              </button>
            </div>
          </div>
        ) : context?.hasTrip ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Active Trip</div>
              <div style={{ fontWeight: 700, fontSize: '0.925rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                {context.activeTrip.name || context.activeTrip.title}
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

      {/* WEATHER-DRIVEN AI DIGITAL TWIN */}
      <WeatherDigitalTwin
        destinationLocation={effectiveLocation}
        experiences={recommendations}
        activeTrip={context?.activeTrip}
        onAddToItinerary={handleAddToItinerary}
        onAddToWishlist={handleToggleWishlist}
        wishlistIds={wishlistIds}
      />

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
              {locationMode === 'active_trip'
                ? 'ACTIVE TRIP ITINERARY & LOCATION'
                : (locationMode === 'destination' ? 'DESTINATION SEARCH EXPERIENCES' : 'GPS NEARBY EXPERIENCES')}
            </span>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              {effectiveLocation ? (
                <>
                  Verified authentic places in/near <strong>{effectiveLocation.formatted_address || activeCityName}</strong>
                  {context?.hasTrip && context?.availableTimeFormatted && locationMode === 'active_trip' ? ` fitting your ${context.availableTimeFormatted} free window` : ''}
                  {context?.hasTrip && context?.remainingBudget !== null && locationMode === 'active_trip' ? ` within ₹${context.remainingBudget.toLocaleString()} budget` : ''}.
                </>
              ) : (
                'Grant browser location access or search a destination above to view authentic places.'
              )}
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchRecs(activeIntent)}
          disabled={recsLoading || !effectiveLocation}
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
            Searching verified places near {activeCityName}.
          </p>
        </div>
      ) : !effectiveLocation ? (
        <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center', maxWidth: '520px', margin: '30px auto' }}>
          <MapPin size={32} style={{ color: 'var(--accent-amber)', marginBottom: '12px' }} />
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
            Location selection required
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '440px', margin: '0 auto 18px auto' }}>
            {locationError ? locationError : 'Locora requires a destination or browser GPS location to recommend authentic local and cultural experiences.'}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={detectLocation} className="btn btn-primary" style={{ padding: '8px 20px' }}>
              <RefreshCw size={14} /> Enable Location
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
                availableTimeLabel={context?.availableTimeFormatted && locationMode === 'active_trip' ? `${context.availableTimeFormatted} gap` : 'Available'}
                weatherSignal={getExperienceWeatherSignal(rec)}
              />
            );
          })}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center', maxWidth: '500px', margin: '30px auto' }}>
          <Compass size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>
            No experiences found for "{activeIntent}" in {activeCityName}
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '18px' }}>
            Try selecting a different experience category or search another destination.
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
    </div>
  );
};

export default Discover;
