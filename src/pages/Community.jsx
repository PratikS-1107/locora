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
import TripCard from '../components/TripCard';
import Modal from '../components/Modal';
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
  Sparkles,
  Users,
  Compass,
  AlertCircle
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
  return tomorrow.toISOString().split('T')[0];
};

const calculateEndDate = (startDateStr, daysCount) => {
  if (!startDateStr) return '';
  const d = new Date(startDateStr);
  const count = Math.max(1, Number(daysCount) || 1);
  d.setDate(d.getDate() + (count - 1));
  return d.toISOString().split('T')[0];
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
    setTimeout(() => setToastMsg(''), 3500);
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

  return (
    <div style={{ width: '100%', maxWidth: '1240px', margin: '0 auto', paddingBottom: '60px' }}>

      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
          backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--accent-emerald)',
          borderRadius: 'var(--radius-md)', padding: '14px 20px', color: '#fff',
          boxShadow: 'var(--shadow-lg)', backdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <CheckCircle2 size={18} style={{ color: 'var(--accent-emerald)' }} />
          <span style={{ fontSize: '0.9rem' }}>{toastMsg}</span>
          {copiedTripId && (
            <button
              onClick={() => navigate('/my-trips')}
              className="btn btn-primary"
              style={{ padding: '4px 10px', fontSize: '0.75rem', marginLeft: '8px' }}
            >
              View My Trip
            </button>
          )}
        </div>
      )}

      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <div className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginBottom: '8px', fontSize: '0.725rem' }}>
          <Globe size={12} /> Public Travel Inspiration
        </div>
        <h1 style={{ fontSize: '2.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          Community
        </h1>
        <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
          Get inspired by journeys from fellow travelers. View, copy, and save public itineraries.
        </p>
      </div>

      {/* SEARCH BAR & FILTERS ROW */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        {/* Search Input */}
        <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search public trips by destination, creator, or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '44px', height: '44px', fontSize: '0.9rem', background: 'var(--bg-card)' }}
          />
          <Search size={16} style={{ position: 'absolute', left: '15px', top: '14px', color: 'var(--text-muted)' }} />
        </div>

        {/* Duration Filter Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Filter size={15} style={{ color: 'var(--primary)' }} />
          <select
            className="form-select"
            value={durationFilter}
            onChange={(e) => setDurationFilter(e.target.value)}
            style={{ height: '44px', minWidth: '150px', background: 'var(--bg-card)', fontSize: '0.85rem' }}
          >
            {DURATION_FILTERS.map(df => (
              <option key={df.id} value={df.id}>{df.label}</option>
            ))}
          </select>
        </div>

        {/* Sort By Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowUpDown size={15} style={{ color: 'var(--accent-cyan)' }} />
          <select
            className="form-select"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            style={{ height: '44px', minWidth: '150px', background: 'var(--bg-card)', fontSize: '0.85rem' }}
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* PUBLIC TRIPS GRID */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-panel" style={{ height: '360px', opacity: 0.5, animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : filteredTrips.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          {filteredTrips.map(trip => (
            <TripCard
              key={trip.id}
              trip={trip}
              isCommunityCard={true}
              isSaved={savedIds.includes(trip.id)}
              onViewTrip={handleViewTrip}
              onCopyTrip={handleOpenCopyModal}
              onSaveTrip={handleSaveToggle}
            />
          ))}
        </div>
      ) : (
        /* POLISHED EMPTY STATE */
        <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center', maxWidth: '500px', margin: '40px auto' }}>
          <Users size={40} style={{ color: 'var(--text-muted)', marginBottom: '14px' }} />
          <h3 style={{ fontSize: '1.2rem', margin: '0 0 8px 0', color: 'var(--text-primary)' }}>No public trips found.</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '24px' }}>
            Be the first to share your journey with the Locora community!
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="btn btn-secondary">
                Clear Search
              </button>
            )}
            <button onClick={() => navigate('/my-trips')} className="btn btn-primary">
              Share a Trip from My Trips
            </button>
          </div>
        </div>
      )}

      {/* MODAL: READ-ONLY PUBLIC ITINERARY VIEW */}
      {selectedTrip && (
        <Modal
          isOpen={Boolean(selectedTrip)}
          onClose={() => setSelectedTrip(null)}
          title={selectedTrip.title || selectedTrip.name}
        >
          <div>
            {/* Cover Banner */}
            <div style={{ height: '200px', borderRadius: 'var(--radius-md)', overflow: 'hidden', position: 'relative', marginBottom: '20px', backgroundColor: 'var(--bg-surface)' }}>
              {(selectedTrip.cover_image_url || selectedTrip.cover_image || selectedTrip.coverPhoto) ? (
                <img
                  src={selectedTrip.cover_image_url || selectedTrip.cover_image || selectedTrip.coverPhoto}
                  alt={selectedTrip.title || selectedTrip.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%)' }} />
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.9) 0%, transparent 60%)' }} />

              <div style={{ position: 'absolute', bottom: '16px', left: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {selectedTrip.author_avatar ? (
                  <img
                    src={selectedTrip.author_avatar}
                    alt={selectedTrip.author_name || 'Creator'}
                    style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid var(--primary)', objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                      border: '2px solid var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      color: '#fff'
                    }}
                  >
                    {(selectedTrip.author_name || selectedTrip.title || 'C')[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Created by</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>{selectedTrip.author_name || 'Community Traveler'}</div>
                </div>
              </div>
            </div>

            {/* Metadata Summary */}
            <div style={{ display: 'flex', gap: '20px', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={15} style={{ color: 'var(--accent-cyan)' }} />
                <span>{selectedTrip.destination || selectedTrip.stops?.join(' · ') || selectedTrip.country || 'Destination'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={15} style={{ color: 'var(--primary)' }} />
                <span>{getTripDaysCount(selectedTrip)} Days Itinerary</span>
              </div>
              {selectedTrip.budget ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>₹{Number(selectedTrip.budget).toLocaleString()}</span>
                  <span>Est. Budget</span>
                </div>
              ) : null}
            </div>

            {selectedTrip.description && (
              <p style={{ fontSize: '0.925rem', lineHeight: 1.6, color: 'var(--text-primary)', marginBottom: '24px' }}>
                "{selectedTrip.description}"
              </p>
            )}

            {/* Day-by-Day Activities */}
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>
              Day-by-Day Activities
            </h4>

            {loadingItems ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading itinerary details...
              </div>
            ) : selectedTripDays.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
                {selectedTripDays.map((day) => (
                  <div key={day.id || day.day_number} style={{ marginBottom: '6px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} /> Day {day.day_number} {day.date ? `· ${day.date}` : ''} {day.notes ? `(${day.notes})` : ''}
                    </div>
                    {day.activities && day.activities.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {day.activities.map((act, idx) => (
                          <div key={act.id || idx} className="glass-panel" style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                {act.startTime || act.start_time || '10:00 AM'} — {act.title}
                              </span>
                              <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>{act.category || 'Activity'}</span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                              {act.description || act.location || 'Local experience spot'}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: '8px' }}>
                        No activities scheduled for this day.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : selectedTripItems.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', maxHeight: '280px', overflowY: 'auto' }}>
                {selectedTripItems.map((act, idx) => (
                  <div key={act.id || idx} className="glass-panel" style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {act.startTime || act.start_time || '10:00 AM'} — {act.title}
                      </span>
                      <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>{act.category || 'Activity'}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                      {act.description || act.location || 'Local experience spot'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
                No activities found for this trip.
              </div>
            )}

            {/* Action Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => handleSaveToggle(selectedTrip)}
                className="btn btn-secondary"
              >
                <Heart size={16} style={{ fill: savedIds.includes(selectedTrip.id) ? '#ef4444' : 'none', color: savedIds.includes(selectedTrip.id) ? '#ef4444' : 'inherit' }} />
                <span>{savedIds.includes(selectedTrip.id) ? 'Saved to Wishlist' : 'Save Trip'}</span>
              </button>

              <button
                onClick={() => handleOpenCopyModal(selectedTrip)}
                className="btn btn-primary"
              >
                <Copy size={16} />
                <span>Copy Trip to My Trips</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: CHOOSE TRAVEL DATES FOR COPY TRIP */}
      {copyModalTrip && (
        <Modal
          isOpen={Boolean(copyModalTrip)}
          onClose={() => !copying && setCopyModalTrip(null)}
          title="Choose Travel Dates"
        >
          <form onSubmit={handleConfirmCopy} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
                {copyModalTrip.title || copyModalTrip.name}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                Set your travel dates. The {getTripDaysCount(copyModalTrip)}-day itinerary will be copied and customized to your timeline.
              </p>
            </div>

            {copyError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-sm)',
                color: '#fca5a5',
                fontSize: '0.85rem'
              }}>
                <AlertCircle size={16} />
                <span>{copyError}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                  Start Date
                </label>
                <input
                  type="date"
                  className="form-input"
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
                  style={{ width: '100%', height: '42px', background: 'var(--bg-card)' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                  End Date
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={copyEndDate}
                  min={copyStartDate || new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setCopyEndDate(e.target.value);
                    setCopyError('');
                  }}
                  required
                  style={{ width: '100%', height: '42px', background: 'var(--bg-card)' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={copying}
                onClick={() => setCopyModalTrip(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={copying}
              >
                {copying ? 'Copying Itinerary...' : 'Confirm & Copy Trip'}
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
};

export default Community;

