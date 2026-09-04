import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getUserTrips,
  deleteTrip,
  setTripVisibility,
  getWishlistTrips,
  toggleSaveWishlistItem,
  createTripFromReadyMade
} from '../services/api';
import TripCard from '../components/TripCard';
import Modal from '../components/Modal';
import ViewItineraryModal from '../components/ViewItineraryModal';
import ConvertTemplateModal from '../components/ConvertTemplateModal';
import {
  Plus,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Search,
  Eye,
  Trash2,
  MapPin,
  Edit3,
  Globe,
  Lock,
  ArrowRight,
  Clock,
  Heart
} from 'lucide-react';

const MyTrips = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Data State
  const [trips, setTrips] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Modals State
  const [tripToDelete, setTripToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewItineraryTrip, setViewItineraryTrip] = useState(null);
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [templateToConvert, setTemplateToConvert] = useState(null);

  const userId = user?.id || null;

  // Fetch all user trips and wishlist items from existing API / Supabase
  const loadDashboardData = async () => {
    setLoading(true);
    setErrorMsg('');
    if (!user?.id) {
      setTrips([]);
      setWishlistItems([]);
      setLoading(false);
      return;
    }

    try {
      const [tripsRes, wishRes] = await Promise.all([
        getUserTrips(user.id),
        getWishlistTrips(user.id)
      ]);

      if (tripsRes.error) {
        setErrorMsg('Unable to load your trips. Please try again.');
      } else {
        setTrips(tripsRes.data || []);
      }

      if (wishRes.data) {
        setWishlistItems(wishRes.data);
      }
    } catch (err) {
      setErrorMsg('Unable to load your travel dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  // Visibility toggle handler
  const handleToggleVisibility = async (trip) => {
    const newStatus = !trip.is_public;
    try {
      const { data, error } = await setTripVisibility(trip.id, newStatus);
      if (error || !data) {
        showToast('Unable to change trip visibility.');
      } else {
        setTrips(trips.map(t => t.id === trip.id ? { ...t, is_public: data.is_public } : t));
        showToast(data.is_public ? 'Your itinerary is now public.' : 'Your itinerary is now private.');
      }
    } catch (err) {
      showToast('Unable to change trip visibility.');
    }
  };

  // Delete handler
  const confirmDelete = async () => {
    if (!tripToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await deleteTrip(tripToDelete.id);
      if (error) {
        showToast('Unable to delete this trip.');
      } else {
        setTrips(trips.filter(t => t.id !== tripToDelete.id));
        showToast('Trip deleted successfully.');
        setTripToDelete(null);
      }
    } catch (err) {
      showToast('Unable to delete this trip.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Remove from Wishlist handler
  const handleRemoveFromWishlist = async (item) => {
    if (!user?.id) return;
    try {
      await toggleSaveWishlistItem(item, user.id);
      setWishlistItems(prev => prev.filter(i => (i.id || i.placeId) !== (item.id || item.placeId)));
      showToast('Removed item from Wishlist.');
    } catch (e) {
      showToast('Could not update Wishlist.');
    }
  };

  // Open Create Trip from Ready-Made Template Modal
  const handleCreateTripFromReadyMade = (readyMadeTrip) => {
    if (!user) {
      navigate('/login', { state: { returnTo: '/my-trips' } });
      return;
    }
    setViewItineraryTrip(null);
    setTemplateToConvert(readyMadeTrip);
  };

  // Confirm conversion with user selected dates and budget
  const handleConfirmConvertTemplate = async (templateTrip, { startDate, endDate, budget }) => {
    if (!user?.id) {
      navigate('/login', { state: { returnTo: '/my-trips' } });
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
        await loadDashboardData();
        navigate(`/trip/${newTrip.id}`);
      }
    } catch (err) {
      showToast('Failed to create trip.');
    } finally {
      setIsCreatingTrip(false);
    }
  };

  // Date Filtering Calculations
  const today = new Date().toISOString().split('T')[0];

  // 1. Current / Active Trip
  const activeTrip = trips.find(t => !t.is_wishlist && t.start_date && t.end_date && today >= t.start_date && today <= t.end_date) || null;

  // 2. Upcoming Trips
  const upcomingTrips = trips
    .filter(t => !t.is_wishlist && t.start_date && today < t.start_date && t.id !== activeTrip?.id)
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  // 3. Completed Trips
  const completedTrips = trips
    .filter(t => !t.is_wishlist && t.end_date && today > t.end_date && t.id !== activeTrip?.id)
    .sort((a, b) => new Date(b.end_date) - new Date(a.end_date));

  // 4. Other trips (without dates)
  const undatedTrips = trips.filter(t => !t.is_wishlist && !t.start_date && t.id !== activeTrip?.id);
  const allUpcomingAndPlanned = [...upcomingTrips, ...undatedTrips];

  // Calculate Active Trip Duration & Progress
  let activeDurationDays = 0;
  let daysElapsed = 0;
  let activeProgressPercent = 0;
  let activeDaysText = '';

  if (activeTrip?.start_date && activeTrip?.end_date) {
    const sDate = new Date(activeTrip.start_date);
    const eDate = new Date(activeTrip.end_date);
    const todayDate = new Date();
    activeDurationDays = Math.max(1, Math.round((eDate - sDate) / (1000 * 60 * 60 * 24)) + 1);
    daysElapsed = Math.min(activeDurationDays, Math.max(1, Math.round((todayDate - sDate) / (1000 * 60 * 60 * 24)) + 1));
    activeProgressPercent = Math.min(100, Math.round((daysElapsed / activeDurationDays) * 100));
    activeDaysText = `Day ${daysElapsed} of ${activeDurationDays}`;
  }

  // Calculate Countdown Helper for upcoming trips
  const getCountdownText = (trip) => {
    if (!trip.start_date) return null;
    const diffDays = Math.ceil((new Date(trip.start_date) - new Date()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Starts today';
    if (diffDays === 1) return 'Starts tomorrow';
    return `${diffDays} Days to go`;
  };

  // SVG Progress Ring calculations (Radius = 44, Circumference = 276.46)
  const circumference = 276.46;
  const strokeDashoffset = circumference - (circumference * (activeProgressPercent || 5)) / 100;

  return (
    <div style={{ width: '100%', maxWidth: '1240px', margin: '0 auto', paddingBottom: '80px' }}>

      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 1000,
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid var(--accent-teal)',
          borderRadius: '12px',
          padding: '14px 22px',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#ffffff',
          fontSize: '0.9rem',
          fontWeight: 600,
          backdropFilter: 'blur(16px)'
        }}>
          <CheckCircle2 size={18} style={{ color: 'var(--accent-teal)' }} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ================= 1. PAGE HEADER ================= */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <h1
            style={{
              fontFamily: "var(--font-serif), 'Playfair Display', Georgia, serif",
              fontSize: '3.4rem',
              fontWeight: 700,
              margin: '0 0 4px 0',
              color: '#f8fafc',
              letterSpacing: '-0.02em',
              lineHeight: 1.1
            }}
          >
            My Trips
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
            Curated travel itineraries, active journeys, and upcoming expeditions.
          </p>
        </div>

        <button
          onClick={() => navigate('/create-trip')}
          className="btn btn-primary"
          style={{
            padding: '11px 22px',
            borderRadius: '10px',
            fontWeight: 700,
            letterSpacing: '0.03em',
            fontSize: '0.875rem',
            boxShadow: '0 4px 16px rgba(0, 196, 140, 0.28)'
          }}
        >
          <Plus size={16} />
          <span>New Trip</span>
        </button>
      </div>

      {errorMsg && (
        <div style={{
          padding: '14px 18px',
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '10px',
          color: '#fca5a5',
          marginBottom: '32px',
          fontSize: '0.875rem'
        }}>
          {errorMsg}
        </div>
      )}

      {loading ? (
        /* Loading Skeleton */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div className="glass-panel" style={{ height: '380px', borderRadius: '22px', background: 'rgba(255,255,255,0.02)' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {[1, 2, 3].map((n) => (
              <div key={n} className="glass-panel" style={{ height: '260px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)' }} />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '44px' }}>

          {/* ================= 2. CURRENT / ACTIVE TRIP HERO ================= */}
          {activeTrip && (
            <div
              style={{
                position: 'relative',
                borderRadius: '22px',
                overflow: 'hidden',
                minHeight: '400px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: '40px 44px',
                backgroundImage: activeTrip.cover_image_url || activeTrip.cover_image || activeTrip.image ? `url("${activeTrip.cover_image_url || activeTrip.cover_image || activeTrip.image}")` : 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.95))',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transition: 'transform 0.3s ease'
              }}
            >
              {/* Atmospheric Dark Gradient Layers */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'transparent',
                  zIndex: 1
                }}
              />

              {/* Hero Content Area */}
              <div style={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                flexWrap: 'wrap',
                gap: '32px'
              }}>

                {/* Left Bottom Section: Title, Subtitle, Actions */}
                <div style={{ maxWidth: '680px' }}>

                  {/* Large Cinematic Title */}
                  <h2
                    style={{
                      fontFamily: "var(--font-serif), 'Playfair Display', Georgia, serif",
                      fontSize: '3rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      lineHeight: 1.12,
                      margin: '0 0 10px 0',
                      letterSpacing: '-0.015em',
                      textShadow: '0 2px 14px rgba(0, 0, 0, 0.6)'
                    }}
                  >
                    {activeTrip.name || activeTrip.title || 'Kyoto Autumn Retreat'}
                  </h2>

                  {/* Subtitle / Status row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '20px',
                    flexWrap: 'wrap'
                  }}>
                    <span
                      style={{
                        color: 'var(--accent-teal)',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase'
                      }}
                    >
                      CURRENT JOURNEY
                    </span>

                    <span style={{ color: '#cbd5e1', fontSize: '0.9rem', fontWeight: 600 }}>
                      {activeDaysText || 'Day 4 of 7'}
                    </span>

                    {activeTrip.destination && (
                      <>
                        <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>•</span>
                        <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                          {activeTrip.destination}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Hero Actions Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => navigate(`/trip/${activeTrip.id}/edit`)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.12)',
                        backdropFilter: 'blur(12px)',
                        color: '#ffffff',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        padding: '11px 22px',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        transition: 'all 0.18s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                      }}
                      title="Edit Itinerary"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => navigate(`/itinerary-view/${activeTrip.id}`)}
                      style={{
                        background: 'var(--accent-teal)',
                        color: '#080b11',
                        border: 'none',
                        padding: '11px 24px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 16px rgba(45, 212, 191, 0.35)',
                        transition: 'all 0.18s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(45, 212, 191, 0.45)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(45, 212, 191, 0.35)';
                      }}
                    >
                      <span>View Live Itinerary</span>
                      <ArrowRight size={16} />
                    </button>

                    {/* Subtle Utility Buttons */}
                    <button
                      onClick={() => handleToggleVisibility(activeTrip)}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: activeTrip.is_public ? 'var(--accent-teal)' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        backdropFilter: 'blur(10px)'
                      }}
                      title={activeTrip.is_public ? 'Make Private' : 'Make Public'}
                    >
                      {activeTrip.is_public ? <Globe size={16} /> : <Lock size={16} />}
                    </button>

                    <button
                      onClick={() => setTripToDelete(activeTrip)}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#fca5a5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        backdropFilter: 'blur(10px)'
                      }}
                      title="Delete Trip"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Right Bottom Section: Circular Progress Ring Indicator */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                  borderRadius: '20px',
                  background: 'rgba(10, 14, 24, 0.65)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  minWidth: '130px'
                }}>
                  <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                    <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                      <circle
                        cx="50"
                        cy="50"
                        r="44"
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.12)"
                        strokeWidth="6"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="44"
                        fill="none"
                        stroke="var(--accent-teal)"
                        strokeWidth="6"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                      />
                    </svg>

                    {/* Centered Percentage & Count */}
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{
                        fontSize: '1.4rem',
                        fontWeight: 800,
                        color: '#ffffff',
                        lineHeight: 1.1
                      }}>
                        {activeProgressPercent}%
                      </div>
                      <div style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: '#94a3b8',
                        marginTop: '2px'
                      }}>
                        {daysElapsed > 0 ? `${daysElapsed} of ${activeDurationDays}` : '4 of 7'}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ================= 3. UPCOMING SECTION ================= */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <Clock size={18} color="var(--accent-teal)" />
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                margin: 0,
                color: '#f8fafc',
                letterSpacing: '-0.01em'
              }}>
                Upcoming
              </h2>
            </div>

            {allUpcomingAndPlanned.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '24px'
              }}>
                {allUpcomingAndPlanned.map(trip => {
                  const countdown = getCountdownText(trip) || '42 Days to go';
                  const durationDays = trip.days_count || (trip.start_date && trip.end_date ? Math.max(1, Math.round((new Date(trip.end_date) - new Date(trip.start_date)) / (1000 * 60 * 60 * 24)) + 1) : 7);
                  const coverUrl = trip.cover_image_url || trip.cover_image || trip.image || null;

                  return (
                    <div
                      key={trip.id}
                      className="glass-panel"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '18px',
                        overflow: 'hidden',
                        height: '100%',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'rgba(13, 18, 28, 0.7)',
                        backdropFilter: 'blur(16px)',
                        transition: 'transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {/* Landscape Cover Image with Countdown Badge */}
                      <div style={{ height: '190px', position: 'relative', overflow: 'hidden', backgroundColor: 'var(--bg-surface)' }}>
                        {coverUrl ? (
                          <img
                            src={coverUrl}
                            alt={trip.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)' }} />
                        )}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13, 18, 28, 0.95) 0%, transparent 65%)' }} />

                        {/* Top Right Countdown Pill Badge */}
                        <div style={{ position: 'absolute', top: '14px', right: '14px' }}>
                          <span style={{
                            background: 'rgba(10, 14, 24, 0.75)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: '#ffffff',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '5px 12px',
                            borderRadius: '20px',
                            display: 'inline-block'
                          }}>
                            {countdown}
                          </span>
                        </div>
                      </div>

                      {/* Card Content Details */}
                      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          {/* Destination Tag */}
                          <div style={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: 'var(--accent-teal)',
                            marginBottom: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <MapPin size={12} />
                            <span>{trip.destination || 'Destination'}</span>
                          </div>

                          {/* Trip Title */}
                          <h3
                            onClick={() => navigate(`/trip/${trip.id}`)}
                            style={{
                              fontSize: '1.2rem',
                              fontWeight: 700,
                              margin: '0 0 6px 0',
                              color: '#ffffff',
                              cursor: 'pointer',
                              lineHeight: 1.3
                            }}
                          >
                            {trip.name}
                          </h3>

                          {trip.description && (
                            <p style={{
                              fontSize: '0.85rem',
                              color: 'var(--text-secondary)',
                              lineHeight: 1.5,
                              marginBottom: '14px',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}>
                              {trip.description}
                            </p>
                          )}

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                            {trip.start_date && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Calendar size={13} style={{ color: 'var(--accent-teal)' }} />
                                <span>
                                  {new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  {trip.end_date && ` – ${new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                                </span>
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Clock size={13} style={{ color: '#94a3b8' }} />
                              <span>{durationDays} Days Expedition</span>
                            </div>
                          </div>
                        </div>

                        {/* Card Actions Footer */}
                        <div style={{
                          paddingTop: '14px',
                          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px'
                        }}>
                          <button
                            onClick={() => navigate(`/itinerary-view/${trip.id}`)}
                            className="btn btn-secondary"
                            style={{ padding: '8px 14px', fontSize: '0.825rem', borderRadius: '8px' }}
                          >
                            <Eye size={14} />
                            <span>View Itinerary</span>
                          </button>

                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => navigate(`/trip/${trip.id}/edit`)}
                              className="btn btn-secondary"
                              style={{ padding: '8px 10px', fontSize: '0.825rem', borderRadius: '8px' }}
                              title="Edit Trip"
                            >
                              <Edit3 size={14} />
                            </button>

                            <button
                              onClick={() => setTripToDelete(trip)}
                              className="btn-icon"
                              style={{ width: '34px', height: '34px', color: '#fca5a5', borderRadius: '8px' }}
                              title="Delete Trip"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Plan a New Trip Card matching screenshot (+) style */}
                <div
                  onClick={() => navigate('/create-trip')}
                  style={{
                    minHeight: '280px',
                    borderRadius: '18px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backgroundColor: 'rgba(13, 18, 28, 0.45)',
                    backdropFilter: 'blur(16px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '32px 24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.22s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-teal)';
                    e.currentTarget.style.backgroundColor = 'rgba(45, 212, 191, 0.06)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.backgroundColor = 'rgba(13, 18, 28, 0.45)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  title="Plan a New Trip"
                >
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1.5px solid rgba(255, 255, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      marginBottom: '16px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Plus size={24} />
                  </div>

                  <h3 style={{
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    margin: '0 0 6px 0'
                  }}>
                    Plan a New Trip
                  </h3>

                  <p style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    margin: 0,
                    maxWidth: '240px',
                    lineHeight: 1.45
                  }}>
                    Create customized schedules and discover authentic local stays.
                  </p>
                </div>
              </div>
            ) : (
              /* Upcoming Empty State */
              <div
                className="glass-panel"
                style={{
                  padding: '40px 24px',
                  borderRadius: '18px',
                  border: '1px dashed rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '20px'
                }}
              >
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    No upcoming trips
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Plan your next journey in advance or convert a saved itinerary.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => navigate('/create-trip')}
                    className="btn btn-primary"
                    style={{ padding: '9px 18px', fontSize: '0.85rem', borderRadius: '8px' }}
                  >
                    <Plus size={14} />
                    <span>Plan a Trip</span>
                  </button>

                  <button
                    onClick={() => navigate('/explore')}
                    className="btn btn-secondary"
                    style={{ padding: '9px 16px', fontSize: '0.85rem', borderRadius: '8px' }}
                  >
                    <Search size={14} />
                    <span>Explore Ideas</span>
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ================= 4. WISHLIST SECTION ================= */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <Sparkles size={18} color="#c084fc" />
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                margin: 0,
                color: '#f8fafc',
                letterSpacing: '-0.01em'
              }}>
                Wishlist
              </h2>
            </div>

            {wishlistItems.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                {wishlistItems.map((item, idx) => {
                  const title = item.name || item.title || 'Wishlisted Travel Idea';
                  const destination = item.destination || item.location?.city || 'Explore Location';
                  const duration = item.duration || `${item.days_count || 5} Days`;
                  const budget = item.budget ? `₹${Number(item.budget).toLocaleString()}` : (item.price ? `₹${Number(item.price).toLocaleString()}` : 'Budget not set');
                  const coverImage = item.cover_image_url || item.cover_image || item.image || null;

                  return (
                    <div
                      key={item.id || idx}
                      className="glass-panel"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '18px',
                        overflow: 'hidden',
                        height: '100%',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'rgba(13, 18, 28, 0.7)',
                        backdropFilter: 'blur(16px)',
                        transition: 'transform 0.22s ease, border-color 0.22s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      }}
                    >
                      {/* Wishlist Cover Image */}
                      <div style={{ height: '180px', position: 'relative', overflow: 'hidden', backgroundColor: 'var(--bg-surface)' }}>
                        {coverImage ? (
                          <img
                            src={coverImage}
                            alt={title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)' }} />
                        )}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13, 18, 28, 0.95) 0%, transparent 65%)' }} />

                        <div style={{ position: 'absolute', top: '14px', left: '14px' }}>
                          <span className="badge badge-purple" style={{ backdropFilter: 'blur(8px)', fontSize: '0.725rem' }}>
                            ★ Wishlist
                          </span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: 'var(--accent-teal)',
                            marginBottom: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <MapPin size={12} />
                            <span>{destination}</span>
                          </div>

                          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 6px 0', color: '#ffffff', lineHeight: 1.3 }}>
                            {title}
                          </h3>

                          {item.description && (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px', display: '-webkit-box', WebKitLineClamp: 2, WebKitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {item.description}
                            </p>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                            <span>Duration: <strong>{duration}</strong></span>
                            <span style={{ fontWeight: 700, color: 'var(--accent-teal)' }}>{budget}</span>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div style={{
                          paddingTop: '14px',
                          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          flexWrap: 'wrap'
                        }}>
                          <button
                            onClick={() => setViewItineraryTrip(item)}
                            className="btn btn-secondary"
                            style={{ padding: '7px 12px', fontSize: '0.8rem', borderRadius: '8px' }}
                          >
                            <Eye size={14} />
                            <span>View Itinerary</span>
                          </button>

                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => handleCreateTripFromReadyMade(item)}
                              disabled={isCreatingTrip}
                              className="btn btn-primary"
                              style={{ padding: '7px 12px', fontSize: '0.8rem', fontWeight: 700, borderRadius: '8px' }}
                            >
                              <Plus size={14} />
                              <span>Create Trip</span>
                            </button>

                            <button
                              onClick={() => handleRemoveFromWishlist(item)}
                              className="btn-icon"
                              style={{ width: '32px', height: '32px', color: 'var(--text-muted)', borderRadius: '8px' }}
                              title="Remove from Wishlist"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Wishlist Empty State */
              <div
                className="glass-panel"
                style={{
                  padding: '40px 24px',
                  borderRadius: '18px',
                  border: '1px dashed rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '20px'
                }}
              >
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    No saved trips yet
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Save destinations and trips you love to find them here later.
                  </div>
                </div>

                <button
                  onClick={() => navigate('/explore')}
                  className="btn btn-primary"
                  style={{ padding: '9px 18px', fontSize: '0.85rem', borderRadius: '8px' }}
                >
                  <Search size={14} />
                  <span>Explore Destinations</span>
                </button>
              </div>
            )}
          </section>

          {/* ================= 5. COMPLETED EXPEDITIONS (If any) ================= */}
          {completedTrips.length > 0 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <CheckCircle2 size={18} color="var(--text-muted)" />
                <h2 style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  margin: 0,
                  color: '#f8fafc',
                  letterSpacing: '-0.01em'
                }}>
                  Completed Expeditions
                </h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                {completedTrips.map(trip => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    onEdit={(t) => navigate(`/trip/${t.id}/edit`)}
                    onDelete={(t) => setTripToDelete(t)}
                    onToggleVisibility={handleToggleVisibility}
                  />
                ))}
              </div>
            </section>
          )}

        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(tripToDelete)}
        onClose={() => setTripToDelete(null)}
        title="Delete Trip?"
        maxWidth="450px"
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
          <AlertTriangle size={24} style={{ color: 'var(--danger)' }} />
          <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            "{tripToDelete?.name}"
          </span>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.5 }}>
          This action cannot be undone. All itinerary items, schedule notes, and saved places will be permanently removed.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={() => setTripToDelete(null)}
            className="btn btn-secondary"
            disabled={isDeleting}
          >
            Cancel
          </button>

          <button
            onClick={confirmDelete}
            className="btn btn-danger"
            disabled={isDeleting}
          >
            <span>{isDeleting ? 'Deleting...' : 'Delete Trip'}</span>
          </button>
        </div>
      </Modal>

      {/* View Itinerary Modal */}
      <ViewItineraryModal
        isOpen={Boolean(viewItineraryTrip)}
        onClose={() => setViewItineraryTrip(null)}
        trip={viewItineraryTrip}
        isInWishlist={viewItineraryTrip ? wishlistItems.some(i => (i.id || i.placeId) === (viewItineraryTrip.id || viewItineraryTrip.placeId)) : false}
        onToggleWishlist={async (trip) => {
          await handleRemoveFromWishlist(trip);
          setViewItineraryTrip(null);
        }}
        onCreateTrip={handleCreateTripFromReadyMade}
      />

      {/* Create Trip from Template / Wishlist Modal */}
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

export default MyTrips;
