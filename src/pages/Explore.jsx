import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  searchExploreItems,
  getSavedWishlistIds,
  toggleSaveWishlistItem,
  getUserTrips,
  addRecommendationToItinerary,
  getExploreTrips,
  createTripFromReadyMade
} from '../services/api';
import ExploreCard from '../components/ExploreCard';
import Modal from '../components/Modal';
import ViewItineraryModal from '../components/ViewItineraryModal';
import ConvertTemplateModal from '../components/ConvertTemplateModal';
import {
  Search,
  Filter,
  ArrowUpDown,
  X,
  Compass,
  CheckCircle2,
  MapPin,
  Star,
  Plus,
  Heart,
  Sparkles,
  Eye,
  Calendar
} from 'lucide-react';

const CATEGORIES = [
  'All',
  'Nature',
  'Culture',
  'Food',
  'Adventure',
  'History',
  'Shopping',
  'Hidden Gems',
  'Workshops'
];

const PRICE_RANGES = [
  { id: 'Any', label: 'Any Price' },
  { id: 'Budget', label: 'Budget (Under ₹800)' },
  { id: 'Moderate', label: 'Moderate (₹800–₹1,500)' },
  { id: 'Premium', label: 'Premium (Above ₹1,500)' }
];

const EXPERIENCE_TYPES = ['All', 'Attraction', 'Activity', 'Experience'];

const SORT_OPTIONS = [
  'Recommended',
  'Most Popular',
  'Highest Rated',
  'Price: Low to High',
  'Price: High to Low',
  'A–Z'
];

const Explore = () => {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { user } = useAuth();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [priceFilter, setPriceFilter] = useState('Any');
  const [typeFilter, setTypeFilter] = useState('All');
  const [sortOption, setSortOption] = useState('Recommended');

  // UI Control State
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [results, setResults] = useState([]);
  const [templateTrips, setTemplateTrips] = useState([]);

  // Saved Wishlist State
  const [savedIds, setSavedIds] = useState([]);

  // Detail Modal & Add to Trip Modal State
  const [selectedItem, setSelectedItem] = useState(null);
  const [viewItineraryTrip, setViewItineraryTrip] = useState(null);
  const [userTrips, setUserTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);

  // Toast Feedback State
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  // Sync URL query params on mount / route change
  useEffect(() => {
    const params = new URLSearchParams(routeLocation.search);
    const searchParam = params.get('search');
    const categoryParam = params.get('category');
    if (searchParam) {
      setSearchQuery(searchParam);
      setDebouncedQuery(searchParam);
    }
    if (categoryParam) {
      setCategoryFilter(categoryParam);
    }
  }, [routeLocation.search]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load Explore template trips from Supabase (trip_source = 'template')
  useEffect(() => {
    const loadTemplateTrips = async () => {
      try {
        const res = await getExploreTrips();
        setTemplateTrips(res.data || []);
      } catch (err) {
        console.error('Error loading explore template trips:', err);
      }
    };
    loadTemplateTrips();
  }, []);

  // Load Saved Wishlist IDs & User Trips
  useEffect(() => {
    const loadUserData = async () => {
      if (!user?.id) {
        setSavedIds([]);
        setUserTrips([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [wishRes, tripsRes] = await Promise.all([
          getSavedWishlistIds(user.id),
          getUserTrips(user.id)
        ]);
        setSavedIds(wishRes.data || []);
        setUserTrips(tripsRes.data || []);
        if (tripsRes.data?.length > 0) {
          setSelectedTripId(tripsRes.data[0].id);
        }
      } catch (err) {
        console.error('Error loading user explore data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadUserData();
  }, [user]);

  // Load Verified Explore Results Asynchronously
  useEffect(() => {
    let isMounted = true;
    const loadExploreData = async () => {
      setLoadingResults(true);
      try {
        const items = await searchExploreItems(debouncedQuery, {
          category: categoryFilter,
          price: priceFilter,
          type: typeFilter
        }, sortOption);
        if (isMounted) {
          setResults(items || []);
        }
      } catch (err) {
        if (isMounted) {
          setResults([]);
        }
      } finally {
        if (isMounted) {
          setLoadingResults(false);
        }
      }
    };
    loadExploreData();
    return () => { isMounted = false; };
  }, [debouncedQuery, categoryFilter, priceFilter, typeFilter, sortOption]);

  const visibleReadyMadeTrips = useMemo(() => {
    const query = debouncedQuery.trim().toLowerCase();
    if (!query) return templateTrips;
    return templateTrips.filter((trip) => [
      trip.title,
      trip.name,
      trip.destination,
      trip.description,
      trip.duration,
      trip.country,
      ...(trip.days || []).flatMap(day => [day.title, ...(day.activities || []).flatMap(activity => [activity.title, activity.location, activity.description])])
    ].filter(Boolean).some(value => value.toLowerCase().includes(query)));
  }, [debouncedQuery, templateTrips]);

  // Active Filters Count
  const activeFiltersCount = (categoryFilter !== 'All' ? 1 : 0) +
    (priceFilter !== 'Any' ? 1 : 0) +
    (typeFilter !== 'All' ? 1 : 0);

  // Handle Save / Wishlist Toggle
  const handleSaveToggle = async (item) => {
    if (!user?.id) {
      navigate('/login', { state: { returnTo: '/explore' } });
      return;
    }
    const itemId = item.id || item.placeId;
    try {
      const res = await toggleSaveWishlistItem(item, user.id);
      if (res.data.isSaved) {
        setSavedIds(prev => [...prev, itemId]);
        showToast('Saved to your Wishlist.');
      } else {
        setSavedIds(prev => prev.filter(id => id !== itemId));
        showToast('Removed from Wishlist.');
      }
    } catch (err) {
      showToast('Could not update Wishlist.');
    }
  };

  // State for converting ready-made templates with custom dates
  const [templateToConvert, setTemplateToConvert] = useState(null);

  // Open Create Trip from Ready-Made Template Modal
  const handleCreateTripFromReadyMade = (readyMadeTrip) => {
    if (!user) {
      navigate('/login', { state: { returnTo: '/explore' } });
      return;
    }
    setViewItineraryTrip(null);
    setTemplateToConvert(readyMadeTrip);
  };

  // Confirm conversion with user selected dates and budget
  const handleConfirmConvertTemplate = async (templateTrip, { startDate, endDate, budget }) => {
    if (!user?.id) {
      navigate('/login', { state: { returnTo: '/explore' } });
      return;
    }
    setIsCreatingTrip(true);
    try {
      const { data: newTrip, error } = await createTripFromReadyMade(templateTrip, user.id, { startDate, endDate, budget });
      if (error || !newTrip) {
        showToast('Failed to create trip from template.');
      } else {
        showToast(`Created trip "${newTrip.title || newTrip.name}"!`);
        setTemplateToConvert(null);
        navigate(`/trip/${newTrip.id}`);
      }
    } catch (err) {
      showToast('Failed to create trip.');
    } finally {
      setIsCreatingTrip(false);
    }
  };

  // Reset Filters Handler
  const handleResetFilters = () => {
    setCategoryFilter('All');
    setPriceFilter('Any');
    setTypeFilter('All');
    setSearchQuery('');
    setDebouncedQuery('');
    setSortOption('Recommended');
  };

  // Add to Trip Handler
  const handleAddToTripSubmit = async () => {
    if (!selectedItem || !selectedTripId) return;
    try {
      await addRecommendationToItinerary(selectedItem, selectedTripId, '2026-08-27');
      setShowAddTripModal(false);
      setSelectedItem(null);
      showToast('Added experience to your trip itinerary!');
    } catch (e) {
      showToast('Could not add to trip.');
    }
  };

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

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          Explore
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
          Discover ready-made trips, destinations, culture, and local experiences.
        </p>
      </div>

      {/* Primary global search — Prominent Travel Search Input */}
      <div style={{ marginBottom: '32px', position: 'relative' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search destinations, places, experiences, or trip templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            paddingLeft: '48px',
            paddingRight: searchQuery ? '48px' : '16px',
            height: '52px',
            fontSize: '0.95rem',
            background: 'rgba(14, 20, 34, 0.8)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)'
          }}
        />
        <Search size={19} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            aria-label="Clear Explore search"
            style={{ position: 'absolute', right: '14px', top: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={17} />
          </button>
        )}
      </div>

      {/* SECTION: READY-MADE TRIP TEMPLATES */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} style={{ color: 'var(--accent-purple)' }} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Pre-Planned Trips
            </h2>
          </div>
          <span className="badge badge-purple" style={{ fontSize: '0.725rem', fontWeight: 700 }}>
            {visibleReadyMadeTrips.length} Curated
          </span>
        </div>

        {visibleReadyMadeTrips.length > 0 ? (
          <div className="explore-two-column-grid" style={{ gap: '20px' }}>
            {visibleReadyMadeTrips.map(trip => {
              const isSaved = savedIds.includes(trip.id);
              return (
                <div
                  key={trip.id}
                  className="glass-panel"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    height: '100%',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-card)'
                  }}
                >
                  <div style={{ height: '185px', position: 'relative', overflow: 'hidden', backgroundColor: 'var(--bg-surface)' }}>
                    <img
                      src={trip.cover_image}
                      alt={trip.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8, 11, 17, 0.88) 0%, transparent 60%)' }} />

                    <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                      <span className="badge badge-purple" style={{ backdropFilter: 'blur(10px)', fontSize: '0.725rem' }}>
                        <Calendar size={11} /> {trip.duration}
                      </span>
                    </div>

                    <button
                      onClick={() => handleSaveToggle(trip)}
                      className="btn"
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        padding: '5px 10px',
                        fontSize: '0.725rem',
                        background: isSaved ? 'rgba(168, 85, 247, 0.9)' : 'rgba(8, 11, 17, 0.75)',
                        backdropFilter: 'blur(10px)',
                        color: '#fff',
                        border: isSaved ? '1px solid #a855f7' : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-full)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                      title={isSaved ? 'Remove from Wishlist' : 'Add to Wishlist'}
                    >
                      <Heart size={13} style={{ fill: isSaved ? '#fff' : 'none' }} />
                      <span>{isSaved ? 'Saved' : 'Wishlist'}</span>
                    </button>

                    <div style={{ position: 'absolute', bottom: '10px', left: '12px', right: '12px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.775rem', color: '#fff' }}>
                      <MapPin size={12} style={{ color: 'var(--accent-emerald)' }} />
                      <span style={{ fontWeight: 600 }}>{trip.destination}</span>
                    </div>
                  </div>

                  <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                        {trip.name}
                      </h3>
                      <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '14px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {trip.description}
                      </p>
                    </div>

                    <div style={{
                      paddingTop: '12px',
                      borderTop: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}>
                      <button
                        onClick={() => setViewItineraryTrip(trip)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        <Eye size={13} />
                        <span>View Itinerary</span>
                      </button>

                      <button
                        onClick={() => handleCreateTripFromReadyMade(trip)}
                        disabled={isCreatingTrip}
                        className="btn btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700 }}
                      >
                        <Plus size={13} />
                        <span>Create Trip</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            No pre-planned itineraries match "{debouncedQuery}".
          </div>
        )}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', marginBottom: '32px' }} />

      {/* Explore-content controls */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Explore Destinations & Experiences
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
          Browse curated travel inspiration across destinations, culture, food, nature, and crafts.
        </p>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setShowFilterModal(true)}
          className={activeFiltersCount > 0 ? 'btn btn-primary' : 'btn btn-secondary'}
          style={{ height: '42px', padding: '0 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Filter size={15} />
          <span>Filters</span>
          {activeFiltersCount > 0 && (
            <span style={{
              background: '#fff', color: 'var(--primary)', borderRadius: '50%',
              width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800
            }}>
              {activeFiltersCount}
            </span>
          )}
        </button>

        {/* Sort By Dropdown (Beside Filters Button) */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowSortDropdown(prev => !prev)}
            className="btn btn-secondary"
            style={{ height: '42px', padding: '0 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <ArrowUpDown size={15} style={{ color: 'var(--accent-cyan)' }} />
            <span>Sort: <strong style={{ color: 'var(--text-primary)' }}>{sortOption}</strong></span>
          </button>

          {showSortDropdown && (
            <div className="glass-panel" style={{
              position: 'absolute', top: '48px', right: 0, zIndex: 100,
              minWidth: '190px', padding: '6px 0', background: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)', boxShadow: 'var(--shadow-lg)'
            }}>
              {SORT_OPTIONS.map(opt => (
                <div
                  key={opt}
                  onClick={() => {
                    setSortOption(opt);
                    setShowSortDropdown(false);
                  }}
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                    color: sortOption === opt ? 'var(--primary)' : 'var(--text-primary)',
                    fontWeight: sortOption === opt ? 700 : 400,
                    background: sortOption === opt ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                  }}
                >
                  {opt}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DISMISSIBLE ACTIVE FILTER CHIPS */}
      {activeFiltersCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active Filters:</span>

          {categoryFilter !== 'All' && (
            <span className="badge badge-purple" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.8rem' }}>
              Category: {categoryFilter}
              <X size={13} style={{ cursor: 'pointer' }} onClick={() => setCategoryFilter('All')} />
            </span>
          )}

          {priceFilter !== 'Any' && (
            <span className="badge badge-cyan" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.8rem' }}>
              Price: {priceFilter}
              <X size={13} style={{ cursor: 'pointer' }} onClick={() => setPriceFilter('Any')} />
            </span>
          )}

          {typeFilter !== 'All' && (
            <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.8rem' }}>
              Type: {typeFilter}
              <X size={13} style={{ cursor: 'pointer' }} onClick={() => setTypeFilter('All')} />
            </span>
          )}

          <button
            onClick={handleResetFilters}
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}
          >
            Clear All
          </button>
        </div>
      )}

      {/* RESULTS GRID */}
      {loading || loadingResults ? (
        <div className="explore-two-column-grid" style={{ gap: '24px' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-panel" style={{ height: '340px', opacity: 0.5, animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="explore-two-column-grid" style={{ gap: '24px' }}>
          {results.map(item => (
            <ExploreCard
              key={item.id}
              item={item}
              isSaved={savedIds.includes(item.id)}
              onSaveToggle={handleSaveToggle}
              onCardClick={(selected) => setSelectedItem(selected)}
            />
          ))}
        </div>
      ) : (
        /* POLISHED EMPTY STATE */
        <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center', maxWidth: '500px', margin: '40px auto' }}>
          <Compass size={40} style={{ color: 'var(--text-muted)', marginBottom: '14px' }} />
          <h3 style={{ fontSize: '1.2rem', margin: '0 0 8px 0', color: 'var(--text-primary)' }}>No verified experiences found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '24px' }}>
            No authentic places match your current search and filters. Try adjusting your search query or resetting active filters.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="btn btn-secondary">
                Clear Search
              </button>
            )}
            <button onClick={handleResetFilters} className="btn btn-primary">
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* MODAL 1: FILTERS MODAL */}
      <Modal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Filter Experiences"
      >
        <div style={{ padding: '8px 0' }}>

          {/* Category Section */}
          <div style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ fontWeight: 700 }}>Category</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
              {CATEGORIES.map(cat => {
                const isActive = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={isActive ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: 'var(--radius-full)' }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Range Section */}
          <div style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ fontWeight: 700 }}>Price Range</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
              {PRICE_RANGES.map(p => {
                const isActive = priceFilter === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPriceFilter(p.id)}
                    className={isActive ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ padding: '10px 12px', fontSize: '0.8rem', textAlign: 'left' }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Experience Type Section */}
          <div style={{ marginBottom: '28px' }}>
            <label className="form-label" style={{ fontWeight: 700 }}>Experience Type</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
              {EXPERIENCE_TYPES.map(t => {
                const isActive = typeFilter === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={isActive ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: 'var(--radius-full)' }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter Modal Action Bar */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <button
              onClick={() => {
                setCategoryFilter('All');
                setPriceFilter('Any');
                setTypeFilter('All');
              }}
              className="btn btn-secondary"
            >
              Reset
            </button>
            <button
              onClick={() => setShowFilterModal(false)}
              className="btn btn-primary"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </Modal>

      {/* View Itinerary Modal */}
      <ViewItineraryModal
        isOpen={Boolean(viewItineraryTrip)}
        onClose={() => setViewItineraryTrip(null)}
        trip={viewItineraryTrip}
        isInWishlist={viewItineraryTrip ? savedIds.includes(viewItineraryTrip.id) : false}
        onToggleWishlist={handleSaveToggle}
        onCreateTrip={handleCreateTripFromReadyMade}
      />

      {/* Create Trip from Template Modal */}
      <ConvertTemplateModal
        isOpen={Boolean(templateToConvert)}
        onClose={() => setTemplateToConvert(null)}
        templateTrip={templateToConvert}
        onConfirm={handleConfirmConvertTemplate}
        isSubmitting={isCreatingTrip}
      />

    </div>
  );
};

export default Explore;
