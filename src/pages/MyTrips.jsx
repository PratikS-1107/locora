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
          className="mytrips-bg-entrance"
          src="/mytrips-bg.jpg"
          alt="My Trips Travel Background"
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
            gap: '10px',
            color: '#ffffff',
            fontSize: '0.9rem',
            fontWeight: 600,
            backdropFilter: 'blur(16px)'
          }}
        >
          <CheckCircle2 size={18} style={{ color: '#38bdf8' }} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 2. MAIN CONTENT WRAPPER */}
      <main
        className="mytrips-page-entrance"
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
          className="mytrips-stagger-header"
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
              My Trips
            </h1>

          </div>

          <button
            onClick={() => navigate('/create-trip')}
            style={{
              backgroundColor: '#0ea5e9',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 800,
              letterSpacing: '0.02em',
              padding: '11px 26px',
              borderRadius: '9999px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background-color 0.2s ease, transform 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0284c7';
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#0ea5e9';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>New Trip</span>
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '14px 18px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              color: '#fca5a5',
              marginBottom: '32px',
              fontSize: '0.875rem'
            }}
          >
            {errorMsg}
          </div>
        )}

        {loading ? (
          /* Loading Skeleton */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div
              style={{
                height: '380px',
                borderRadius: '24px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '24px'
              }}
            >
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  style={{
                    height: '260px',
                    borderRadius: '20px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>

            {/* ================= 2. CURRENT / ACTIVE TRIP HERO ================= */}
            {activeTrip && (
              <div
                className="mytrips-stagger-hero"
                style={{
                  position: 'relative',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  minHeight: '400px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: '0 24px 64px rgba(0, 0, 0, 0.75)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  padding: '40px 44px',
                  backgroundImage:
                    activeTrip.cover_image_url || activeTrip.cover_image || activeTrip.image
                      ? `url("${activeTrip.cover_image_url || activeTrip.cover_image || activeTrip.image}")`
                      : 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.95))',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  transition: 'transform 0.3s ease'
                }}
              >
                {/* Hero Content Area */}
                <div
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    flexWrap: 'wrap',
                    gap: '32px'
                  }}
                >
                  {/* Left Bottom Section: Title, Subtitle, Actions */}
                  <div style={{ maxWidth: '680px' }}>
                    {/* Large Cinematic Title */}
                    <h2
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: 'clamp(2rem, 3.2vw, 2.8rem)',
                        fontWeight: 900,
                        color: '#ffffff',
                        lineHeight: 1.12,
                        margin: '0 0 12px 0',
                        letterSpacing: '-0.02em',
                        textShadow: '0 2px 14px rgba(0, 0, 0, 0.7)'
                      }}
                    >
                      {activeTrip.name || activeTrip.title || 'Active Journey'}
                    </h2>

                    {/* Subtitle / Status row */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '22px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <span
                        style={{
                          backgroundColor: 'rgba(6, 78, 59, 0.85)',
                          border: '1px solid rgba(52, 211, 153, 0.3)',
                          color: '#34d399',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: '6px',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase'
                        }}
                      >
                        CURRENT JOURNEY
                      </span>

                      <span style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: 600 }}>
                        {activeDaysText || 'Active Trip'}
                      </span>

                      {activeTrip.destination && (
                        <>
                          <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>•</span>
                          <span
                            style={{
                              color: 'rgba(226, 232, 240, 0.85)',
                              fontSize: '0.875rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <MapPin size={13} style={{ color: '#38bdf8' }} />
                            {activeTrip.destination}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Hero Actions Row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => navigate(`/itinerary-view/${activeTrip.id}`)}
                        style={{
                          backgroundColor: '#0ea5e9',
                          color: '#ffffff',
                          border: 'none',
                          padding: '11px 24px',
                          borderRadius: '9999px',
                          fontWeight: 800,
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35)',
                          transition: 'background-color 0.2s ease, transform 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#0284c7';
                          e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#0ea5e9';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <span>View Live Itinerary</span>
                        <ArrowRight size={16} />
                      </button>

                      <button
                        onClick={() => navigate(`/trip/${activeTrip.id}/edit`)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(12px)',
                          WebkitBackdropFilter: 'blur(12px)',
                          color: '#ffffff',
                          border: '1px solid rgba(255, 255, 255, 0.18)',
                          padding: '11px 22px',
                          borderRadius: '9999px',
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                        }}
                        title="Edit Itinerary"
                      >
                        Edit
                      </button>

                      {/* Subtle Utility Buttons */}
                      <button
                        onClick={() => handleToggleVisibility(activeTrip)}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.14)',
                          color: activeTrip.is_public ? '#38bdf8' : '#94a3b8',
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
                          borderRadius: '50%',
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
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '18px 22px',
                      borderRadius: '20px',
                      background: 'rgba(10, 14, 24, 0.75)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      minWidth: '130px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
                    }}
                  >
                    <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                      <svg
                        width="100"
                        height="100"
                        viewBox="0 0 100 100"
                        style={{ transform: 'rotate(-90deg)' }}
                      >
                        <circle
                          cx="50"
                          cy="50"
                          r="44"
                          fill="none"
                          stroke="rgba(255, 255, 255, 0.1)"
                          strokeWidth="6"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="44"
                          fill="none"
                          stroke="#0ea5e9"
                          strokeWidth="6"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                        />
                      </svg>

                      {/* Centered Percentage & Count */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <div
                          style={{
                            fontSize: '1.4rem',
                            fontWeight: 900,
                            color: '#ffffff',
                            lineHeight: 1.1
                          }}
                        >
                          {activeProgressPercent}%
                        </div>
                        <div
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: 'rgba(226, 232, 240, 0.7)',
                            marginTop: '2px'
                          }}
                        >
                          {daysElapsed > 0 ? `${daysElapsed} of ${activeDurationDays}` : 'In Progress'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= 3. UPCOMING SECTION ================= */}
            <section className="mytrips-stagger-section-1">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '20px'
                }}
              >
                <Clock size={18} style={{ color: '#38bdf8' }} />
                <h2
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    margin: 0,
                    color: '#ffffff',
                    letterSpacing: '-0.015em'
                  }}
                >
                  Upcoming
                </h2>
              </div>

              {allUpcomingAndPlanned.length > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                    gap: '24px'
                  }}
                >
                  {allUpcomingAndPlanned.map((trip, idx) => {
                    const countdown = getCountdownText(trip) || 'Upcoming';
                    const durationDays =
                      trip.days_count ||
                      (trip.start_date && trip.end_date
                        ? Math.max(
                          1,
                          Math.round(
                            (new Date(trip.end_date) - new Date(trip.start_date)) /
                            (1000 * 60 * 60 * 24)
                          ) + 1
                        )
                        : 5);
                    const coverUrl =
                      trip.cover_image_url || trip.cover_image || trip.image || null;

                    return (
                      <div
                        key={trip.id}
                        className="mytrips-card-entrance"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          borderRadius: '20px',
                          overflow: 'hidden',
                          height: '100%',
                          border: '1px solid rgba(255, 255, 255, 0.09)',
                          backgroundColor: '#0d121f',
                          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.6)',
                          animationDelay: `${idx * 0.06}s`,
                          transition:
                            'transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-3px)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.22)';
                          e.currentTarget.style.boxShadow = '0 20px 45px rgba(0, 0, 0, 0.75)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.09)';
                          e.currentTarget.style.boxShadow = '0 16px 36px rgba(0, 0, 0, 0.6)';
                        }}
                      >
                        {/* Cover Image */}
                        <div
                          style={{
                            height: '190px',
                            position: 'relative',
                            overflow: 'hidden',
                            backgroundColor: '#141a28'
                          }}
                        >
                          {coverUrl ? (
                            <img
                              src={coverUrl}
                              alt={trip.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                background:
                                  'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(13, 18, 31, 0.95) 100%)'
                              }}
                            />
                          )}
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background:
                                'linear-gradient(to top, rgba(13, 18, 31, 0.98) 0%, rgba(13, 18, 31, 0.4) 50%, transparent 100%)'
                            }}
                          />

                          {/* Top Left Purple Duration Badge */}
                          <div
                            style={{
                              position: 'absolute',
                              top: '14px',
                              left: '14px',
                              backgroundColor: '#8b5cf6',
                              color: '#ffffff',
                              fontSize: '0.725rem',
                              fontWeight: 800,
                              padding: '4px 10px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)'
                            }}
                          >
                            <Calendar size={11} strokeWidth={2.5} />
                            <span>{durationDays} Days</span>
                          </div>

                          {/* Top Right Countdown Pill Badge */}
                          <div style={{ position: 'absolute', top: '14px', right: '14px' }}>
                            <span
                              style={{
                                background: 'rgba(13, 18, 31, 0.85)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.16)',
                                color: '#ffffff',
                                fontSize: '0.725rem',
                                fontWeight: 700,
                                padding: '4px 12px',
                                borderRadius: '9999px',
                                display: 'inline-block'
                              }}
                            >
                              {countdown}
                            </span>
                          </div>

                          {/* Bottom Left Emerald Location Badge */}
                          {trip.destination && (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: '12px',
                                left: '14px',
                                backgroundColor: 'rgba(6, 78, 59, 0.85)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(52, 211, 153, 0.3)',
                                color: '#34d399',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '3px 9px',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}
                            >
                              <MapPin size={12} style={{ color: '#34d399', flexShrink: 0 }} />
                              <span>{trip.destination}</span>
                            </div>
                          )}
                        </div>

                        {/* Card Content Details */}
                        <div
                          style={{
                            padding: '20px',
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                          }}
                        >
                          <div>
                            {/* Trip Title */}
                            <h3
                              onClick={() => navigate(`/trip/${trip.id}`)}
                              style={{
                                fontFamily: 'var(--font-heading)',
                                fontSize: '1.2rem',
                                fontWeight: 800,
                                margin: '0 0 6px 0',
                                color: '#ffffff',
                                cursor: 'pointer',
                                lineHeight: 1.3
                              }}
                            >
                              {trip.name}
                            </h3>

                            {trip.description && (
                              <p
                                style={{
                                  fontSize: '0.85rem',
                                  color: 'rgba(226, 232, 240, 0.75)',
                                  lineHeight: 1.5,
                                  marginBottom: '14px',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden'
                                }}
                              >
                                {trip.description}
                              </p>
                            )}

                            {trip.start_date && (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '0.8rem',
                                  color: 'rgba(226, 232, 240, 0.65)',
                                  marginBottom: '16px'
                                }}
                              >
                                <Calendar size={13} style={{ color: '#38bdf8' }} />
                                <span>
                                  {new Date(trip.start_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                  {trip.end_date &&
                                    ` – ${new Date(trip.end_date).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}`}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Card Actions Footer */}
                          <div
                            style={{
                              paddingTop: '14px',
                              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px'
                            }}
                          >
                            <button
                              onClick={() => navigate(`/itinerary-view/${trip.id}`)}
                              style={{
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.14)',
                                color: '#ffffff',
                                padding: '8px 14px',
                                fontSize: '0.825rem',
                                fontWeight: 700,
                                borderRadius: '9999px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <Eye size={14} />
                              <span>View Itinerary</span>
                            </button>

                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => navigate(`/trip/${trip.id}/edit`)}
                                style={{
                                  background: 'rgba(255, 255, 255, 0.08)',
                                  border: '1px solid rgba(255, 255, 255, 0.14)',
                                  color: '#ffffff',
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  cursor: 'pointer'
                                }}
                                title="Edit Trip"
                              >
                                <Edit3 size={14} />
                              </button>

                              <button
                                onClick={() => setTripToDelete(trip)}
                                style={{
                                  width: '34px',
                                  height: '34px',
                                  color: '#fca5a5',
                                  background: 'rgba(239, 68, 68, 0.12)',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                  borderRadius: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer'
                                }}
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

                  {/* Plan a New Trip Card */}
                  <div
                    onClick={() => navigate('/create-trip')}
                    style={{
                      minHeight: '280px',
                      borderRadius: '20px',
                      border: '1px dashed rgba(255, 255, 255, 0.18)',
                      backgroundColor: 'rgba(13, 18, 31, 0.45)',
                      backdropFilter: 'blur(16px)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '32px 24px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.22s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#0ea5e9';
                      e.currentTarget.style.backgroundColor = 'rgba(14, 165, 233, 0.08)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                      e.currentTarget.style.backgroundColor = 'rgba(13, 18, 31, 0.45)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                    title="Plan a New Trip"
                  >
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        background: 'rgba(14, 165, 233, 0.12)',
                        border: '1.5px solid rgba(14, 165, 233, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#38bdf8',
                        marginBottom: '16px'
                      }}
                    >
                      <Plus size={24} strokeWidth={2.5} />
                    </div>

                    <h3
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '1.15rem',
                        fontWeight: 800,
                        color: '#ffffff',
                        margin: '0 0 6px 0'
                      }}
                    >
                      Plan a New Trip
                    </h3>

                    <p
                      style={{
                        fontSize: '0.85rem',
                        color: 'rgba(226, 232, 240, 0.75)',
                        margin: 0,
                        maxWidth: '240px',
                        lineHeight: 1.45
                      }}
                    >
                      Create customized schedules and discover authentic local stays.
                    </p>
                  </div>
                </div>
              ) : (
                /* Upcoming Empty State */
                <div
                  style={{
                    padding: '40px 28px',
                    borderRadius: '20px',
                    border: '1px dashed rgba(255, 255, 255, 0.16)',
                    backgroundColor: 'rgba(13, 18, 31, 0.65)',
                    backdropFilter: 'blur(16px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '20px'
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        color: '#ffffff',
                        marginBottom: '4px'
                      }}
                    >
                      No upcoming trips
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'rgba(226, 232, 240, 0.75)' }}>
                      Plan your next journey in advance or convert a saved itinerary.
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => navigate('/create-trip')}
                      style={{
                        backgroundColor: '#0ea5e9',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        padding: '9px 18px',
                        borderRadius: '9999px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Plus size={14} strokeWidth={2.5} />
                      <span>Plan a Trip</span>
                    </button>

                    <button
                      onClick={() => navigate('/explore')}
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.16)',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        padding: '9px 16px',
                        borderRadius: '9999px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Search size={14} />
                      <span>Explore Ideas</span>
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* ================= 4. WISHLIST SECTION ================= */}
            <section className="mytrips-stagger-section-2">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '20px'
                }}
              >
                <div>
                  <h2
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      margin: 0,
                      color: '#ffffff',
                      letterSpacing: '-0.015em'
                    }}
                  >
                    Wishlist
                  </h2>
                </div>

                <span
                  style={{
                    backgroundColor: 'rgba(139, 92, 246, 0.2)',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    color: '#c084fc',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '4px 14px',
                    borderRadius: '9999px',
                    letterSpacing: '0.02em'
                  }}
                >
                  {wishlistItems.length} Saved
                </span>
              </div>

              {wishlistItems.length > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                    gap: '24px'
                  }}
                >
                  {wishlistItems.map((item, idx) => {
                    const title = item.name || item.title || 'Wishlisted Travel Idea';
                    const destination = item.destination || item.location?.city || 'Explore Destination';
                    const duration = item.duration || `${item.days_count || 5} Days`;
                    const coverImage =
                      item.cover_image_url || item.cover_image || item.image || null;

                    return (
                      <div
                        key={item.id || idx}
                        className="mytrips-card-entrance"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          borderRadius: '20px',
                          overflow: 'hidden',
                          height: '100%',
                          border: '1px solid rgba(255, 255, 255, 0.09)',
                          backgroundColor: '#0d121f',
                          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.6)',
                          animationDelay: `${idx * 0.06}s`,
                          transition: 'transform 0.22s ease, border-color 0.22s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-3px)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.09)';
                        }}
                      >
                        {/* Wishlist Cover Image */}
                        <div
                          style={{
                            height: '190px',
                            position: 'relative',
                            overflow: 'hidden',
                            backgroundColor: '#141a28'
                          }}
                        >
                          {coverImage ? (
                            <img
                              src={coverImage}
                              alt={title}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                background:
                                  'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(13, 18, 31, 0.95) 100%)'
                              }}
                            />
                          )}
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background:
                                'linear-gradient(to top, rgba(13, 18, 31, 0.98) 0%, rgba(13, 18, 31, 0.4) 50%, transparent 100%)'
                            }}
                          />

                          {/* Top Left Purple Duration Badge */}
                          <div
                            style={{
                              position: 'absolute',
                              top: '14px',
                              left: '14px',
                              backgroundColor: '#8b5cf6',
                              color: '#ffffff',
                              fontSize: '0.725rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Clock size={11} />
                            <span>{duration}</span>
                          </div>

                          {/* Bottom Left Emerald Location Badge */}
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '12px',
                              left: '14px',
                              backgroundColor: 'rgba(6, 78, 59, 0.85)',
                              backdropFilter: 'blur(8px)',
                              border: '1px solid rgba(52, 211, 153, 0.3)',
                              color: '#34d399',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '3px 9px',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}
                          >
                            <MapPin size={12} style={{ color: '#34d399', flexShrink: 0 }} />
                            <span>{destination}</span>
                          </div>
                        </div>

                        {/* Card Content */}
                        <div
                          style={{
                            padding: '20px',
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                          }}
                        >
                          <div>
                            <h3
                              style={{
                                fontFamily: 'var(--font-heading)',
                                fontSize: '1.15rem',
                                fontWeight: 800,
                                margin: '0 0 6px 0',
                                color: '#ffffff',
                                lineHeight: 1.3
                              }}
                            >
                              {title}
                            </h3>

                            {item.description && (
                              <p
                                style={{
                                  fontSize: '0.85rem',
                                  color: 'rgba(226, 232, 240, 0.75)',
                                  lineHeight: 1.5,
                                  marginBottom: '14px',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden'
                                }}
                              >
                                {item.description}
                              </p>
                            )}
                          </div>

                          {/* Card Actions */}
                          <div
                            style={{
                              paddingTop: '14px',
                              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                              flexWrap: 'wrap'
                            }}
                          >
                            <button
                              onClick={() => setViewItineraryTrip(item)}
                              style={{
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.14)',
                                color: '#ffffff',
                                padding: '7px 12px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                borderRadius: '9999px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}
                            >
                              <Eye size={14} />
                              <span>View Itinerary</span>
                            </button>

                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => handleCreateTripFromReadyMade(item)}
                                disabled={isCreatingTrip}
                                style={{
                                  backgroundColor: '#0ea5e9',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '7px 14px',
                                  fontSize: '0.8rem',
                                  fontWeight: 800,
                                  borderRadius: '9999px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Plus size={14} strokeWidth={2.5} />
                                <span>Create Trip</span>
                              </button>

                              <button
                                onClick={() => handleRemoveFromWishlist(item)}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  color: 'rgba(226, 232, 240, 0.65)',
                                  background: 'rgba(255, 255, 255, 0.06)',
                                  border: '1px solid rgba(255, 255, 255, 0.12)',
                                  borderRadius: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer'
                                }}
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
                  style={{
                    padding: '40px 28px',
                    borderRadius: '20px',
                    border: '1px dashed rgba(255, 255, 255, 0.16)',
                    backgroundColor: 'rgba(13, 18, 31, 0.65)',
                    backdropFilter: 'blur(16px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '20px'
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        color: '#ffffff',
                        marginBottom: '4px'
                      }}
                    >
                      No saved trips yet
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'rgba(226, 232, 240, 0.75)' }}>
                      Save destinations and trips you love to find them here later.
                    </div>
                  </div>

                  <button
                    onClick={() => navigate('/explore')}
                    style={{
                      backgroundColor: '#0ea5e9',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      padding: '9px 18px',
                      borderRadius: '9999px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Search size={14} />
                    <span>Explore Destinations</span>
                  </button>
                </div>
              )}
            </section>

            {/* ================= 5. COMPLETED EXPEDITIONS (If any) ================= */}
            {completedTrips.length > 0 && (
              <section className="mytrips-stagger-section-3">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '20px'
                  }}
                >
                  <CheckCircle2 size={18} style={{ color: 'rgba(226, 232, 240, 0.65)' }} />
                  <h2
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      margin: 0,
                      color: '#ffffff',
                      letterSpacing: '-0.015em'
                    }}
                  >
                    Completed Expeditions
                  </h2>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                    gap: '24px'
                  }}
                >
                  {completedTrips.map((trip, idx) => (
                    <div
                      key={trip.id}
                      className="mytrips-card-entrance"
                      style={{ animationDelay: `${idx * 0.06}s` }}
                    >
                      <TripCard
                        trip={trip}
                        onEdit={(t) => navigate(`/trip/${t.id}/edit`)}
                        onDelete={(t) => setTripToDelete(t)}
                        onToggleVisibility={handleToggleVisibility}
                      />
                    </div>
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
            <AlertTriangle size={24} style={{ color: '#ef4444' }} />
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
              "{tripToDelete?.name}"
            </span>
          </div>

          <p
            style={{
              color: 'rgba(226, 232, 240, 0.8)',
              fontSize: '0.9rem',
              marginBottom: '24px',
              lineHeight: 1.5
            }}
          >
            This action cannot be undone. All itinerary items, schedule notes, and saved places will
            be permanently removed.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              onClick={() => setTripToDelete(null)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.85rem',
                padding: '9px 18px',
                borderRadius: '9999px',
                cursor: 'pointer'
              }}
              disabled={isDeleting}
            >
              Cancel
            </button>

            <button
              onClick={confirmDelete}
              style={{
                backgroundColor: '#ef4444',
                border: 'none',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.85rem',
                padding: '9px 20px',
                borderRadius: '9999px',
                cursor: 'pointer'
              }}
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
          isInWishlist={
            viewItineraryTrip
              ? wishlistItems.some(
                (i) => (i.id || i.placeId) === (viewItineraryTrip.id || viewItineraryTrip.placeId)
              )
              : false
          }
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
      </main>
    </div>
  );
};

export default MyTrips;
