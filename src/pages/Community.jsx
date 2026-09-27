import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getPublicTrips,
  searchPublicTrips,
  copyPublicTrip,
  getSavedWishlistIds,
  toggleSaveWishlistItem,
  getTripItinerary
} from '../services/api';
import { getTodayLocalDateString } from '../utils/formatters';
import TripCard from '../components/TripCard';
import Modal from '../components/Modal';
import CustomDropdown from '../components/CustomDropdown';
import {
  Search,
  Globe,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  Calendar,
  MapPin,
  Eye,
  Copy,
  Heart,
  Clock,
  Users,
  Compass,
  AlertCircle,
  Plus,
  ArrowRight,
  X
} from 'lucide-react';

const DURATION_FILTERS = [
  { id: 'All', label: 'All Durations' },
  { id: '1-3', label: '1–3 Days' },
  { id: '4-7', label: '4–7 Days' },
  { id: '8+', label: '8+ Days' }
];

const SORT_OPTIONS = ['Recommended', 'Newest', 'Duration'];

const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getTodayLocalDateString(tomorrow);
};

const calculateEndDate = (startDateStr, daysCount) => {
  if (!startDateStr) return '';
  const d = new Date(startDateStr);
  const count = Math.max(1, Number(daysCount) || 1);
  d.setDate(d.getDate() + (count - 1));
  return getTodayLocalDateString(d);
};

const getTripDaysCount = (trip) => {
  if (!trip) return 5;
  if (trip.days_count) return Number(trip.days_count);
  if (trip.start_date && trip.end_date) {
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    const diff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (!isNaN(diff) && diff > 0) return diff;
  }
  return 5;
};

const Community = () => {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { user } = useAuth();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [durationFilter, setDurationFilter] = useState('All');
  const [sortOption, setSortOption] = useState('Recommended');

  // Data & Loading State
  const [publicTrips, setPublicTrips] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Read-only Itinerary Detail View Modal State
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedTripDays, setSelectedTripDays] = useState([]);
  const [selectedTripItems, setSelectedTripItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Copy Trip Date Modal State
  const [copyModalTrip, setCopyModalTrip] = useState(null);
  const [copyStartDate, setCopyStartDate] = useState('');
  const [copyEndDate, setCopyEndDate] = useState('');
  const [copyError, setCopyError] = useState('');
  const [copying, setCopying] = useState(false);

  // Toast & Copy Confirmation State
  const [toastMsg, setToastMsg] = useState('');
  const [copiedTripId, setCopiedTripId] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Fetch Public Trips & Wishlist Data
  useEffect(() => {
    const loadCommunityData = async () => {
      setLoading(true);
      try {
        const [tripsRes, wishRes] = await Promise.all([
          getPublicTrips(),
          user ? getSavedWishlistIds(user.id) : Promise.resolve({ data: [] })
        ]);
        setPublicTrips(tripsRes.data || []);
        setSavedIds(wishRes.data || []);
      } catch (err) {
        console.error('Error loading community trips:', err);
      } finally {
        setLoading(false);
      }
    };
    loadCommunityData();
  }, [user]);

  // Filtered & Sorted Public Trips
  const filteredTrips = useMemo(() => {
    return searchPublicTrips(publicTrips, searchQuery, durationFilter, sortOption);
  }, [publicTrips, searchQuery, durationFilter, sortOption]);

  // Handle View Public Trip
  const handleViewTrip = async (trip) => {
    setSelectedTrip(trip);
    setLoadingItems(true);
    try {
      const res = await getTripItinerary(trip.id);
      setSelectedTripDays(res.data?.days || []);
      setSelectedTripItems(res.data?.activities || []);
    } catch (e) {
      console.error('Error loading trip itinerary:', e);
      setSelectedTripDays([]);
      setSelectedTripItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  // Open Copy Trip Date Modal
  const handleOpenCopyModal = (trip) => {
    if (!user) {
      navigate('/login', { state: { returnTo: routeLocation.pathname } });
      return;
    }
    const days = getTripDaysCount(trip);
    const start = getTomorrowDate();
    const end = calculateEndDate(start, days);
    setCopyModalTrip(trip);
    setCopyStartDate(start);
    setCopyEndDate(end);
    setCopyError('');
  };

  // Handle Copy Trip Submission
  const handleConfirmCopy = async (e) => {
    e?.preventDefault();
    if (!user) {
      navigate('/login', { state: { returnTo: routeLocation.pathname } });
      return;
    }
    if (!copyStartDate || !copyEndDate) {
      setCopyError('Please select both start and end dates.');
      return;
    }
    if (new Date(copyEndDate) < new Date(copyStartDate)) {
      setCopyError('End date cannot be earlier than start date.');
      return;
    }

    setCopying(true);
    setCopyError('');
    try {
      const res = await copyPublicTrip(copyModalTrip.id, user.id, {
        startDate: copyStartDate,
        endDate: copyEndDate
      });

      if (res.data) {
        setCopiedTripId(res.data.id);
        showToast('Trip copied successfully! Saved to your My Trips.');
        setCopyModalTrip(null);
        if (selectedTrip) setSelectedTrip(null);
      }
    } catch (err) {
      console.error('Copy trip error:', err);
      setCopyError(err.message || 'Failed to copy trip.');
      showToast(err.message || 'Failed to copy trip.');
    } finally {
      setCopying(false);
    }
  };

  // Handle Save / Wishlist Toggle
  const handleSaveToggle = async (trip) => {
    if (!user) {
      navigate('/login', { state: { returnTo: routeLocation.pathname } });
      return;
    }

    try {
      const res = await toggleSaveWishlistItem(trip.id, user.id);
      if (res.data?.isSaved) {
        setSavedIds(prev => [...prev, trip.id]);
        showToast('Public trip saved to your Wishlist.');
      } else {
        setSavedIds(prev => prev.filter(id => id !== trip.id));
        showToast('Removed trip from Wishlist.');
      }
    } catch (err) {
      console.error('Error toggling save status:', err);
      showToast('Could not update saved trip status.');
    }
  };

  const inputStyle = {
    width: '100%',
    backgroundColor: 'rgba(20, 28, 48, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '12px',
    padding: '10px 14px',
    color: '#ffffff',
    fontSize: '0.875rem',
    outline: 'none',
    boxSizing: 'border-box'
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
          src="/community-bg.jpg"
          alt="Community Travel Background"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            filter: 'brightness(0.72) contrast(1.05)'
          }}
        />

        {/* Soft Dark Vignette & Gradient Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to bottom, rgba(7, 10, 16, 0.28) 0%, rgba(7, 10, 16, 0.42) 25%, rgba(7, 10, 16, 0.76) 60%, rgba(7, 10, 16, 0.95) 100%)',
            pointerEvents: 'none'
          }}
        />
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 1000,
            backgroundColor: 'rgba(12, 16, 26, 0.95)',
            border: '1px solid #0ea5e9',
            borderRadius: '12px',
            padding: '14px 22px',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#ffffff',
            fontSize: '0.9rem',
            fontWeight: 600,
            backdropFilter: 'blur(16px)'
          }}
        >
          <CheckCircle2 size={18} style={{ color: '#38bdf8' }} />
          <span>{toastMsg}</span>
          {copiedTripId && (
            <button
              onClick={() => navigate('/my-trips')}
              style={{
                backgroundColor: '#0ea5e9',
                color: '#ffffff',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
                marginLeft: '6px'
              }}
            >
              View My Trips
            </button>
          )}
        </div>
      )}

      {/* 2. MAIN CONTENT WRAPPER */}
      <main
        className="page-entrance"
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '100px 32px 80px 32px'
        }}
      >
        {/* ================= 1. PAGE HEADER ================= */}
        <div
          className="page-stagger-header"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '32px',
            flexWrap: 'wrap',
            gap: '20px'
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(2.4rem, 3.8vw, 3.2rem)',
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: '-0.03em',
                color: '#ffffff',
                margin: '0 0 8px 0',
                textShadow: '0 2px 14px rgba(0, 0, 0, 0.7)'
              }}
            >
              Community
            </h1>
            <p
              style={{
                fontSize: 'clamp(0.9rem, 1.1vw, 1rem)',
                color: 'rgba(226, 232, 240, 0.82)',
                margin: 0,
                fontWeight: 400,
                lineHeight: 1.5,
                textShadow: '0 1px 8px rgba(0, 0, 0, 0.6)'
              }}
            >
              Get inspired by journeys from fellow travelers across the world. View, save, and adapt real travel stories.
            </p>
          </div>
        </div>

        {/* ================= 2. SEARCH & FILTER CONTROLS ================= */}
        <div
          className="page-stagger-hero"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginBottom: '24px',
            flexWrap: 'wrap',
            position: 'relative',
            zIndex: 50
          }}
        >
          {/* Search Input Bar */}
          <div
            style={{
              flex: 1,
              minWidth: '280px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <input
              type="text"
              placeholder="Search community journeys by destination, creator, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: '46px',
                backgroundColor: 'rgba(20, 26, 38, 0.72)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '9999px',
                padding: '0 44px 0 46px',
                color: '#ffffff',
                fontSize: '0.9rem',
                outline: 'none',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#0ea5e9';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.25)';
              }}
            />
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '18px',
                color: '#38bdf8',
                pointerEvents: 'none'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '16px',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(226, 232, 240, 0.6)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Sort By Custom Glassmorphic Dropdown */}
          <CustomDropdown
            value={sortOption}
            onChange={setSortOption}
            options={SORT_OPTIONS}
            icon={<ArrowUpDown size={14} style={{ color: '#38bdf8' }} />}
            pill={true}
            minWidth="180px"
            ariaLabel="Sort community trips"
          />
        </div>

        {/* ================= 3. DURATION FILTER PILLS ================= */}
        <div
          className="page-stagger-section-1"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '32px',
            overflowX: 'auto',
            paddingBottom: '8px'
          }}
        >
          {DURATION_FILTERS.map((df) => {
            const isActive = durationFilter === df.id;
            return (
              <button
                key={df.id}
                onClick={() => setDurationFilter(df.id)}
                style={{
                  backgroundColor: isActive ? '#0ea5e9' : 'rgba(14, 20, 34, 0.75)',
                  color: isActive ? '#ffffff' : 'rgba(226, 232, 240, 0.85)',
                  border: isActive ? '1px solid #0ea5e9' : '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(16px)',
                  padding: '8px 18px',
                  borderRadius: '9999px',
                  fontSize: '0.825rem',
                  fontWeight: isActive ? 800 : 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 4px 14px rgba(14, 165, 233, 0.35)' : 'none',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(14, 20, 34, 0.75)';
                  }
                }}
              >
                {df.label}
              </button>
            );
          })}
        </div>

        {/* ================= 4. PUBLIC TRIPS GRID ================= */}
        {loading ? (
          /* Loading Skeletons */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '28px'
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                style={{
                  height: '380px',
                  borderRadius: '20px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              />
            ))}
          </div>
        ) : filteredTrips.length > 0 ? (
          <div
            className="page-stagger-section-2"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '28px'
            }}
          >
            {filteredTrips.map((trip, idx) => (
              <div
                key={trip.id}
                className="page-card-entrance"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <TripCard
                  trip={trip}
                  isCommunityCard={true}
                  isSaved={savedIds.includes(trip.id)}
                  onViewTrip={handleViewTrip}
                  onCopyTrip={handleOpenCopyModal}
                  onSaveTrip={handleSaveToggle}
                />
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div
            style={{
              backgroundColor: 'rgba(14, 20, 34, 0.85)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '24px',
              padding: '56px 32px',
              textAlign: 'center',
              maxWidth: '520px',
              margin: '40px auto',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)'
            }}
          >
            <Compass size={44} style={{ color: '#0ea5e9', margin: '0 auto 16px auto', opacity: 0.85 }} />
            <h3
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.35rem',
                fontWeight: 800,
                color: '#ffffff',
                marginBottom: '8px'
              }}
            >
              No public journeys found
            </h3>
            <p
              style={{
                color: 'rgba(226, 232, 240, 0.75)',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                marginBottom: '28px'
              }}
            >
              Be the first to share your journey with the Locora global community!
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    color: '#ffffff',
                    padding: '10px 20px',
                    borderRadius: '9999px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Clear Search
                </button>
              )}
              <button
                onClick={() => navigate('/my-trips')}
                style={{
                  backgroundColor: '#0ea5e9',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '9999px',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35)'
                }}
              >
                Share a Trip from My Trips
              </button>
            </div>
          </div>
        )}

        {/* ================= 5. MODAL: READ-ONLY PUBLIC ITINERARY VIEW ================= */}
        {selectedTrip && (
          <Modal
            isOpen={Boolean(selectedTrip)}
            onClose={() => setSelectedTrip(null)}
            title={selectedTrip.title || selectedTrip.name}
            maxWidth="640px"
          >
            <div>
              {/* Cover Banner */}
              <div
                style={{
                  height: '220px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  position: 'relative',
                  marginBottom: '20px',
                  backgroundColor: '#0d121f'
                }}
              >
                {(selectedTrip.cover_image_url || selectedTrip.cover_image || selectedTrip.coverPhoto) ? (
                  <img
                    src={selectedTrip.cover_image_url || selectedTrip.cover_image || selectedTrip.coverPhoto}
                    alt={selectedTrip.title || selectedTrip.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.25) 0%, rgba(13, 18, 31, 0.95) 100%)'
                    }}
                  />
                )}

                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(10, 14, 24, 0.95) 0%, transparent 60%)'
                  }}
                />

                <div
                  style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  {selectedTrip.author_avatar ? (
                    <img
                      src={selectedTrip.author_avatar}
                      alt={selectedTrip.author_name || 'Creator'}
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        border: '2px solid #0ea5e9',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0ea5e9 0%, #7c3aed 100%)',
                        border: '2px solid #0ea5e9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9rem',
                        fontWeight: 800,
                        color: '#fff'
                      }}
                    >
                      {(selectedTrip.author_name || selectedTrip.title || 'C')[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(226, 232, 240, 0.7)' }}>Created by</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                      {selectedTrip.author_name || 'Community Traveler'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Metadata Summary */}
              <div
                style={{
                  display: 'flex',
                  gap: '18px',
                  fontSize: '0.875rem',
                  color: 'rgba(226, 232, 240, 0.8)',
                  marginBottom: '18px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={15} style={{ color: '#34d399' }} />
                  <span>{selectedTrip.destination || selectedTrip.stops?.join(' · ') || selectedTrip.country || 'Destination'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={15} style={{ color: '#38bdf8' }} />
                  <span>{getTripDaysCount(selectedTrip)} Days Itinerary</span>
                </div>
                {selectedTrip.budget ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#34d399', fontWeight: 700 }}>₹{Number(selectedTrip.budget).toLocaleString()}</span>
                    <span>Est. Budget</span>
                  </div>
                ) : null}
              </div>

              {selectedTrip.description && (
                <p
                  style={{
                    fontSize: '0.925rem',
                    lineHeight: 1.6,
                    color: '#ffffff',
                    marginBottom: '24px',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  "{selectedTrip.description}"
                </p>
              )}

              {/* Day-by-Day Activities */}
              <h4
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  marginBottom: '14px',
                  color: '#ffffff'
                }}
              >
                Day-by-Day Schedule
              </h4>

              {loadingItems ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(226, 232, 240, 0.6)' }}>
                  Loading itinerary details...
                </div>
              ) : selectedTripDays.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    marginBottom: '24px',
                    maxHeight: '320px',
                    overflowY: 'auto',
                    paddingRight: '6px'
                  }}
                >
                  {selectedTripDays.map((day) => (
                    <div key={day.id || day.day_number}>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          color: '#38bdf8',
                          marginBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Calendar size={13} /> Day {day.day_number} {day.date ? `· ${day.date}` : ''} {day.notes ? `(${day.notes})` : ''}
                      </div>
                      {day.activities && day.activities.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {day.activities.map((act, idx) => (
                            <div
                              key={act.id || idx}
                              style={{
                                padding: '12px 16px',
                                background: 'rgba(20, 28, 48, 0.65)',
                                borderRadius: '12px',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderLeft: '3px solid #0ea5e9'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>
                                  {act.startTime || act.start_time || '10:00 AM'} — {act.title}
                                </span>
                                <span
                                  style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    backgroundColor: 'rgba(168, 85, 247, 0.15)',
                                    color: '#c084fc',
                                    border: '1px solid rgba(168, 85, 247, 0.3)',
                                    padding: '2px 8px',
                                    borderRadius: '6px'
                                  }}
                                >
                                  {act.category || 'Activity'}
                                </span>
                              </div>
                              <p style={{ fontSize: '0.8rem', color: 'rgba(226, 232, 240, 0.7)', margin: 0 }}>
                                {act.description || act.location || 'Local experience spot'}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: 'rgba(226, 232, 240, 0.5)', paddingLeft: '8px' }}>
                          No activities scheduled for this day.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : selectedTripItems.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    marginBottom: '24px',
                    maxHeight: '280px',
                    overflowY: 'auto'
                  }}
                >
                  {selectedTripItems.map((act, idx) => (
                    <div
                      key={act.id || idx}
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(20, 28, 48, 0.65)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderLeft: '3px solid #0ea5e9'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>
                          {act.startTime || act.start_time || '10:00 AM'} — {act.title}
                        </span>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            backgroundColor: 'rgba(168, 85, 247, 0.15)',
                            color: '#c084fc',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                            padding: '2px 8px',
                            borderRadius: '6px'
                          }}
                        >
                          {act.category || 'Activity'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'rgba(226, 232, 240, 0.7)', margin: 0 }}>
                        {act.description || act.location || 'Local experience spot'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(226, 232, 240, 0.5)', fontSize: '0.85rem', marginBottom: '20px' }}>
                  No activities found for this trip.
                </div>
              )}

              {/* Action Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '18px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  gap: '12px'
                }}
              >
                <button
                  onClick={() => handleSaveToggle(selectedTrip)}
                  style={{
                    background: savedIds.includes(selectedTrip.id) ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                    border: savedIds.includes(selectedTrip.id) ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(255, 255, 255, 0.14)',
                    color: savedIds.includes(selectedTrip.id) ? '#f87171' : '#ffffff',
                    padding: '9px 18px',
                    borderRadius: '9999px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Heart size={15} style={{ fill: savedIds.includes(selectedTrip.id) ? '#ef4444' : 'none' }} />
                  <span>{savedIds.includes(selectedTrip.id) ? 'Saved to Wishlist' : 'Save Trip'}</span>
                </button>

                <button
                  onClick={() => handleOpenCopyModal(selectedTrip)}
                  style={{
                    backgroundColor: '#0ea5e9',
                    color: '#ffffff',
                    border: 'none',
                    padding: '9px 22px',
                    borderRadius: '9999px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35)'
                  }}
                >
                  <Copy size={15} />
                  <span>Copy Trip to My Trips</span>
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* ================= 6. MODAL: CHOOSE TRAVEL DATES FOR COPY TRIP ================= */}
        {copyModalTrip && (
          <Modal
            isOpen={Boolean(copyModalTrip)}
            onClose={() => !copying && setCopyModalTrip(null)}
            title="Choose Travel Dates"
            maxWidth="480px"
          >
            <form onSubmit={handleConfirmCopy} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    margin: '0 0 6px 0',
                    color: '#ffffff'
                  }}
                >
                  {copyModalTrip.title || copyModalTrip.name}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'rgba(226, 232, 240, 0.75)', margin: 0 }}>
                  Set your travel dates. The {getTripDaysCount(copyModalTrip)}-day itinerary will be copied and customized to your timeline.
                </p>
              </div>

              {copyError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '10px',
                    color: '#fca5a5',
                    fontSize: '0.85rem'
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{copyError}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.825rem', fontWeight: 600, color: 'rgba(226, 232, 240, 0.85)' }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={copyStartDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setCopyStartDate(newStart);
                      setCopyError('');
                      if (newStart) {
                        setCopyEndDate(calculateEndDate(newStart, getTripDaysCount(copyModalTrip)));
                      }
                    }}
                    required
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.825rem', fontWeight: 600, color: 'rgba(226, 232, 240, 0.85)' }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={copyEndDate}
                    min={copyStartDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      setCopyEndDate(e.target.value);
                      setCopyError('');
                    }}
                    required
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    color: '#ffffff',
                    padding: '9px 18px',
                    borderRadius: '9999px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  disabled={copying}
                  onClick={() => setCopyModalTrip(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    backgroundColor: '#0ea5e9',
                    color: '#ffffff',
                    border: 'none',
                    padding: '9px 22px',
                    borderRadius: '9999px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35)'
                  }}
                  disabled={copying}
                >
                  {copying ? 'Copying Itinerary...' : 'Confirm & Copy Trip'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </main>
    </div>
  );
};

export default Community;
