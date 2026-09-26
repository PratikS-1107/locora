import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTripById, getTripItinerary, updateTripCover, deleteActivity } from '../services/api';
import { formatDuration } from '../utils/formatters';
import Modal from '../components/Modal';
import {
  ArrowLeft,
  Edit3,
  Globe,
  Lock,
  Calendar,
  MapPin,
  Clock,
  PieChart,
  Share2,
  Check,
  Compass,
  AlertTriangle,
  Info,
  Sparkles,
  DollarSign,
  ChevronRight,
  Upload,
  Trash2
} from 'lucide-react';

const ItineraryView = () => {
  const { id, tripId } = useParams();
  const targetTripId = tripId || id;
  const navigate = useNavigate();
  const { user } = useAuth();

  const [trip, setTrip] = useState(null);
  const [days, setDays] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState(null);

  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [isDeletingActivity, setIsDeletingActivity] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const coverInputRef = useRef(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  useEffect(() => {
    const loadTripData = async () => {
      if (!targetTripId) {
        setLoadError('No trip ID provided.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError('');

      try {
        const [tripRes, itineraryRes] = await Promise.all([
          getTripById(targetTripId),
          getTripItinerary(targetTripId)
        ]);

        if (tripRes.error || !tripRes.data) {
          setLoadError(tripRes.error?.message || 'Trip not found or you do not have permission to view it.');
          setLoading(false);
          return;
        }

        const tripData = tripRes.data;
        setTrip(tripData);

        const loadedDays = itineraryRes.data?.days || [];
        const loadedActivities = itineraryRes.data?.activities || [];

        setDays(loadedDays);
        setActivities(loadedActivities);

        if (loadedDays.length > 0) {
          setSelectedDayId(loadedDays[0].id);
        }
      } catch (err) {
        console.error('Error loading itinerary view:', err);
        setLoadError('Unable to load itinerary details.');
      } finally {
        setLoading(false);
      }
    };

    loadTripData();
  }, [targetTripId]);

  const isOwner = trip ? Boolean(user?.id && user.id === trip.user_id && trip.trip_source === 'personal') : false;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCoverFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    setIsUploadingCover(true);
    try {
      const { data: updatedTrip, coverUrl: newCoverUrl, error } = await updateTripCover(trip.id, file);
      if (error || !updatedTrip) {
        showToast('Failed to upload cover image. Please try again.');
      } else {
        setTrip(prev => ({ ...prev, cover_image_url: newCoverUrl || updatedTrip.cover_image_url }));
        showToast('Trip cover image updated successfully');
      }
    } catch (err) {
      showToast('Unable to upload cover image.');
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleDeleteActivity = async () => {
    if (!activityToDelete) return;
    setIsDeletingActivity(true);

    try {
      const res = await deleteActivity(activityToDelete.id);
      if (res.error) {
        showToast(`Failed to delete activity: ${res.error.message || res.error}`);
        return;
      }

      setActivities(prev => prev.filter(a => a.id !== activityToDelete.id));
      showToast('Activity removed from itinerary');
      setActivityToDelete(null);
    } catch (err) {
      console.error('Error deleting activity:', err);
      showToast('Unable to delete activity');
    } finally {
      setIsDeletingActivity(false);
    }
  };

  const activeDay = days.find(d => d.id === selectedDayId) || days[0] || null;
  const activeDayActivities = activities
    .filter(a => activeDay && a.itinerary_day_id === activeDay.id)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  // Multi-currency detection
  const uniqueCurrencies = Array.from(new Set(activities.map(a => a.currency || 'INR').filter(Boolean)));
  const hasMultipleCurrencies = uniqueCurrencies.length > 1;

  // Real Budget Calculations
  const plannedBudget = trip?.budget !== null && trip?.budget !== undefined && !isNaN(Number(trip.budget)) && Number(trip.budget) > 0
    ? Number(trip.budget)
    : null;

  const totalActivitiesCost = activities.reduce((sum, item) => sum + (Number(item.estimated_cost) || 0), 0);
  const mealsCost = activities.filter(i => i.category === 'Food').reduce((sum, item) => sum + (Number(item.estimated_cost) || 0), 0);
  const sightseeingCost = activities.filter(i => ['Sightseeing', 'Culture', 'Nature'].includes(i.category)).reduce((sum, item) => sum + (Number(item.estimated_cost) || 0), 0);
  const otherCost = Math.max(0, totalActivitiesCost - mealsCost - sightseeingCost);

  const remainingBudget = plannedBudget !== null ? plannedBudget - totalActivitiesCost : null;
  const isOverBudget = plannedBudget !== null && remainingBudget < 0;

  const getCategoryBadgeStyle = (cat) => {
    switch (cat?.toLowerCase()) {
      case 'food':
      case 'meals':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
      case 'culture':
      case 'workshop':
      case 'nightlife':
        return { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' };
      case 'adventure':
        return { bg: 'rgba(6, 182, 212, 0.15)', text: '#22d3ee', border: 'rgba(6, 182, 212, 0.3)' };
      case 'nature':
      case 'shopping':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
      case 'sightseeing':
      default:
        return { bg: 'rgba(14, 165, 233, 0.15)', text: '#38bdf8', border: 'rgba(14, 165, 233, 0.3)' };
    }
  };

  const tripTitle = trip?.title || trip?.name || 'Travel Itinerary';
  const coverUrl = trip?.cover_image_url || trip?.cover_image || trip?.image || null;

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
          src={
            coverUrl ||
            'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=85'
          }
          alt="Trip Background"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            filter: 'brightness(0.68) contrast(1.05)'
          }}
        />

        {/* Soft Dark Vignette & Gradient Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to bottom, rgba(7, 10, 16, 0.32) 0%, rgba(7, 10, 16, 0.5) 25%, rgba(7, 10, 16, 0.8) 60%, rgba(7, 10, 16, 0.96) 100%)',
            pointerEvents: 'none'
          }}
        />
      </div>

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
        {loading ? (
          /* Loading State */
          <div
            style={{
              padding: '120px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px'
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                border: '3px solid rgba(255, 255, 255, 0.1)',
                borderTopColor: '#0ea5e9',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }}
            />
            <span style={{ color: 'rgba(226, 232, 240, 0.8)', fontSize: '0.95rem', fontWeight: 500 }}>
              Loading live itinerary...
            </span>
          </div>
        ) : loadError || !trip ? (
          /* Error State */
          <div
            style={{
              maxWidth: '560px',
              margin: '60px auto',
              textAlign: 'center',
              backgroundColor: 'rgba(14, 20, 34, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '24px',
              padding: '48px 32px',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)'
            }}
          >
            <AlertTriangle size={40} style={{ color: '#f87171', margin: '0 auto 16px auto' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px', color: '#ffffff' }}>
              Itinerary Unavailable
            </h2>
            <p style={{ color: 'rgba(226, 232, 240, 0.75)', fontSize: '0.9rem', marginBottom: '28px', lineHeight: 1.6 }}>
              {loadError || 'This itinerary could not be found or you do not have permission to view it.'}
            </p>
            <button
              onClick={() => navigate('/my-trips')}
              style={{
                backgroundColor: '#0ea5e9',
                color: '#ffffff',
                border: 'none',
                padding: '11px 26px',
                borderRadius: '9999px',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35)',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0284c7')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0ea5e9')}
            >
              Back to My Trips
            </button>
          </div>
        ) : (
          <div>
            {/* Top Navigation Bar & Action Controls */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '28px',
                flexWrap: 'wrap',
                gap: '16px'
              }}
            >
              <button
                onClick={() => navigate('/my-trips')}
                style={{
                  background: 'rgba(20, 26, 38, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  backdropFilter: 'blur(16px)',
                  color: '#ffffff',
                  padding: '9px 18px',
                  borderRadius: '9999px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(20, 26, 38, 0.75)')}
              >
                <ArrowLeft size={16} />
                <span>Back to My Trips</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={handleCopyLink}
                  style={{
                    background: 'rgba(20, 26, 38, 0.75)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    backdropFilter: 'blur(16px)',
                    color: '#ffffff',
                    padding: '9px 18px',
                    borderRadius: '9999px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(20, 26, 38, 0.75)')}
                >
                  {copied ? <Check size={16} style={{ color: '#34d399' }} /> : <Share2 size={16} />}
                  <span>{copied ? 'Link Copied!' : 'Share'}</span>
                </button>

                {isOwner && (
                  <>
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleCoverFileChange}
                    />
                    <button
                      onClick={() => coverInputRef.current?.click()}
                      disabled={isUploadingCover}
                      style={{
                        background: 'rgba(20, 26, 38, 0.75)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        backdropFilter: 'blur(16px)',
                        color: '#ffffff',
                        padding: '9px 18px',
                        borderRadius: '9999px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(20, 26, 38, 0.75)')}
                      title="Upload new trip cover photo"
                    >
                      <Upload size={15} />
                      <span>{isUploadingCover ? 'Uploading...' : 'Change Cover'}</span>
                    </button>
                  </>
                )}

                {isOwner && (
                  <Link
                    to={`/trip/${trip.id}/edit`}
                    style={{
                      backgroundColor: '#0ea5e9',
                      color: '#ffffff',
                      textDecoration: 'none',
                      border: 'none',
                      padding: '9px 22px',
                      borderRadius: '9999px',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 16px rgba(14, 165, 233, 0.35)',
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
                    <Edit3 size={16} />
                    <span>Edit Trip</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Hero Cover Card */}
            <div
              style={{
                position: 'relative',
                borderRadius: '24px',
                overflow: 'hidden',
                marginBottom: '36px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: '0 24px 64px rgba(0, 0, 0, 0.75)',
                backgroundColor: '#0e1422'
              }}
            >
              <div
                style={{
                  height: '320px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  padding: '36px 40px'
                }}
              >
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt={tripTitle}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: 'brightness(0.75)'
                    }}
                  />
                ) : (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.25) 0%, rgba(13, 18, 31, 0.95) 100%)'
                    }}
                  />
                )}

                {/* Dark Gradient Overlay */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(to top, rgba(10, 14, 24, 0.98) 0%, rgba(10, 14, 24, 0.45) 55%, rgba(10, 14, 24, 0.2) 100%)'
                  }}
                />

                {/* Cover Details */}
                <div style={{ position: 'relative', zIndex: 2, maxWidth: '840px' }}>
                  {/* Badges Row */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        backgroundColor: trip.is_public ? 'rgba(14, 165, 233, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                        border: trip.is_public ? '1px solid rgba(14, 165, 233, 0.4)' : '1px solid rgba(255, 255, 255, 0.16)',
                        color: trip.is_public ? '#38bdf8' : '#cbd5e1',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        backdropFilter: 'blur(10px)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {trip.is_public ? <Globe size={12} /> : <Lock size={12} />}
                      <span>{trip.is_public ? 'Public Itinerary' : 'Private Trip'}</span>
                    </span>

                    {trip.trip_source && (
                      <span
                        style={{
                          backgroundColor: 'rgba(168, 85, 247, 0.2)',
                          border: '1px solid rgba(168, 85, 247, 0.4)',
                          color: '#c084fc',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          backdropFilter: 'blur(10px)',
                          textTransform: 'capitalize'
                        }}
                      >
                        {trip.trip_source}
                      </span>
                    )}
                  </div>

                  {/* Trip Title */}
                  <h1
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 'clamp(2.2rem, 3.5vw, 3rem)',
                      fontWeight: 900,
                      lineHeight: 1.1,
                      letterSpacing: '-0.025em',
                      color: '#ffffff',
                      margin: '0 0 12px 0',
                      textShadow: '0 2px 16px rgba(0, 0, 0, 0.8)'
                    }}
                  >
                    {tripTitle}
                  </h1>

                  {/* Metadata Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '18px',
                      fontSize: '0.9rem',
                      color: 'rgba(226, 232, 240, 0.88)',
                      flexWrap: 'wrap'
                    }}
                  >
                    {trip.start_date && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={15} style={{ color: '#38bdf8' }} />
                        {new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {trip.end_date &&
                          ` – ${new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                      </span>
                    )}

                    {trip.destination && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={15} style={{ color: '#34d399' }} />
                        {trip.destination}{trip.country ? `, ${trip.country}` : ''}
                      </span>
                    )}

                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={15} style={{ color: '#a855f7' }} />
                      {days.length} {days.length === 1 ? 'Day' : 'Days'} · {activities.length} {activities.length === 1 ? 'Activity' : 'Activities'}
                    </span>
                  </div>
                </div>
              </div>

              {trip.description && (
                <div
                  style={{
                    padding: '24px 40px',
                    backgroundColor: 'rgba(10, 14, 24, 0.85)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    color: 'rgba(226, 232, 240, 0.82)',
                    fontSize: '0.95rem',
                    lineHeight: 1.6
                  }}
                >
                  {trip.description}
                </div>
              )}
            </div>

            {/* ================= ITINERARY SCHEDULE & DAY SELECTOR ================= */}
            <section style={{ marginBottom: '40px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div>
                  <h2
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '1.6rem',
                      fontWeight: 800,
                      color: '#ffffff',
                      margin: '0 0 4px 0'
                    }}
                  >
                    Itinerary Schedule
                  </h2>
                  <p style={{ fontSize: '0.875rem', color: 'rgba(226, 232, 240, 0.7)', margin: 0 }}>
                    Select a calendar day to explore scheduled experiences and timings
                  </p>
                </div>
              </div>

              {/* Day Pills Bar */}
              {days.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    overflowX: 'auto',
                    paddingBottom: '12px',
                    marginBottom: '24px'
                  }}
                >
                  {days.map((d, idx) => {
                    const isSelected = activeDay?.id === d.id;
                    const actsInDay = activities.filter(a => a.itinerary_day_id === d.id).length;

                    return (
                      <button
                        key={d.id || idx}
                        onClick={() => setSelectedDayId(d.id)}
                        style={{
                          padding: '12px 20px',
                          borderRadius: '16px',
                          backgroundColor: isSelected ? '#0ea5e9' : 'rgba(14, 20, 34, 0.78)',
                          color: isSelected ? '#ffffff' : 'rgba(226, 232, 240, 0.85)',
                          border: isSelected ? '1px solid #0ea5e9' : '1px solid rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(16px)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          minWidth: '130px',
                          boxShadow: isSelected
                            ? '0 8px 24px rgba(14, 165, 233, 0.35)'
                            : '0 4px 16px rgba(0, 0, 0, 0.3)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            gap: '8px'
                          }}
                        >
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.04em' }}>
                            DAY {d.day_number || idx + 1}
                          </span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              padding: '2px 7px',
                              borderRadius: '9999px',
                              background: isSelected ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                              fontWeight: 700
                            }}
                          >
                            {actsInDay}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '4px' }}>
                          {d.date || `Day ${idx + 1}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: 'rgba(14, 20, 34, 0.78)',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '32px',
                    textAlign: 'center',
                    color: 'rgba(226, 232, 240, 0.65)'
                  }}
                >
                  No itinerary schedule days configured for this trip.
                </div>
              )}

              {/* Selected Day Activities Container */}
              {activeDay && (
                <div
                  style={{
                    backgroundColor: 'rgba(14, 20, 34, 0.78)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '32px',
                    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45)'
                  }}
                >
                  {/* Day Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '22px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      paddingBottom: '16px',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          fontFamily: 'var(--font-heading)',
                          fontSize: '1.3rem',
                          margin: 0,
                          fontWeight: 800,
                          color: '#ffffff'
                        }}
                      >
                        Day {activeDay.day_number || 1} — {activeDay.date || 'Day Schedule'}
                      </h3>
                      {activeDay.notes && (
                        <p style={{ fontSize: '0.875rem', color: '#38bdf8', margin: '6px 0 0 0', fontWeight: 500 }}>
                          📝 {activeDay.notes}
                        </p>
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: 'rgba(226, 232, 240, 0.75)',
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        padding: '6px 14px',
                        borderRadius: '9999px'
                      }}
                    >
                      {activeDayActivities.length} {activeDayActivities.length === 1 ? 'Activity' : 'Activities'}
                    </div>
                  </div>

                  {/* Activities List */}
                  {activeDayActivities.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {activeDayActivities.map((act) => {
                        const badgeStyle = getCategoryBadgeStyle(act.category);
                        return (
                          <div
                            key={act.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '18px 22px',
                              background: 'rgba(20, 28, 48, 0.65)',
                              borderRadius: '16px',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              borderLeft: '4px solid #0ea5e9',
                              transition: 'transform 0.2s ease, border-color 0.2s ease',
                              gap: '16px',
                              flexWrap: 'wrap'
                            }}
                          >
                            <div style={{ flex: 1, minWidth: '240px' }}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  marginBottom: '6px',
                                  flexWrap: 'wrap'
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: '0.85rem',
                                    fontWeight: 800,
                                    color: '#38bdf8',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                  }}
                                >
                                  <Clock size={13} />
                                  {act.start_time || '10:00 AM'}{' '}
                                  <span style={{ color: 'rgba(226, 232, 240, 0.55)', fontWeight: 500 }}>
                                    ({act.duration_minutes ? `${act.duration_minutes} min` : '60 min'})
                                  </span>
                                </span>

                                {act.category && (
                                  <span
                                    style={{
                                      fontSize: '0.725rem',
                                      fontWeight: 700,
                                      backgroundColor: badgeStyle.bg,
                                      color: badgeStyle.text,
                                      border: `1px solid ${badgeStyle.border}`,
                                      padding: '2px 8px',
                                      borderRadius: '6px'
                                    }}
                                  >
                                    {act.category}
                                  </span>
                                )}
                              </div>

                              <h4
                                style={{
                                  fontFamily: 'var(--font-heading)',
                                  fontSize: '1.05rem',
                                  fontWeight: 700,
                                  margin: '0 0 6px 0',
                                  color: '#ffffff'
                                }}
                              >
                                {act.title}
                              </h4>

                              {act.description && (
                                <p
                                  style={{
                                    fontSize: '0.85rem',
                                    color: 'rgba(226, 232, 240, 0.75)',
                                    margin: '0 0 8px 0',
                                    lineHeight: 1.45
                                  }}
                                >
                                  {act.description}
                                </p>
                              )}

                              {act.location && (
                                <span
                                  style={{
                                    fontSize: '0.825rem',
                                    color: 'rgba(226, 232, 240, 0.65)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                  }}
                                >
                                  <MapPin size={13} style={{ color: '#34d399', flexShrink: 0 }} />
                                  {act.location}
                                  {act.address ? ` · ${act.address}` : ''}
                                </span>
                              )}
                            </div>

                            <div
                              style={{
                                fontWeight: 800,
                                fontSize: '1rem',
                                color: Number(act.estimated_cost) > 0 ? '#ffffff' : '#34d399',
                                whiteSpace: 'nowrap',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                padding: '6px 14px',
                                borderRadius: '10px'
                              }}
                            >
                              {Number(act.estimated_cost) > 0
                                ? `₹${Number(act.estimated_cost).toLocaleString()}`
                                : 'Free'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: '0.9rem',
                        color: 'rgba(226, 232, 240, 0.55)',
                        fontStyle: 'italic',
                        padding: '24px 0',
                        textAlign: 'center'
                      }}
                    >
                      No activities planned for this day yet.
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ================= TRIP BUDGET BREAKDOWN ================= */}
            <section
              style={{
                backgroundColor: 'rgba(14, 20, 34, 0.78)',
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '32px',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <PieChart size={24} style={{ color: '#0ea5e9' }} />
                <div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '1.35rem',
                      margin: 0,
                      fontWeight: 800,
                      color: '#ffffff'
                    }}
                  >
                    Trip Budget Breakdown
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(226, 232, 240, 0.7)', margin: 0 }}>
                    Live financial analysis computed from actual stored activities
                  </p>
                </div>
              </div>

              {/* Multi-currency notification */}
              {hasMultipleCurrencies && (
                <div
                  style={{
                    padding: '14px 18px',
                    backgroundColor: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '12px',
                    color: '#fde68a',
                    fontSize: '0.85rem',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <Info size={18} style={{ flexShrink: 0 }} />
                  <span>
                    Activities specify multiple currencies ({uniqueCurrencies.join(', ')}). Totals below reflect numeric values without currency conversion.
                  </span>
                </div>
              )}

              {/* Over-budget alert */}
              {isOverBudget && (
                <div
                  style={{
                    padding: '14px 18px',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    color: '#fca5a5',
                    fontSize: '0.875rem',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <AlertTriangle size={18} />
                  <span>Activity expenses exceed your planned budget by ₹{Math.abs(remainingBudget).toLocaleString()}.</span>
                </div>
              )}

              {/* Main Budget Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '20px',
                  marginBottom: '28px'
                }}
              >
                <div
                  style={{
                    padding: '20px',
                    background: 'rgba(20, 28, 48, 0.65)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  <div style={{ fontSize: '0.8rem', color: 'rgba(226, 232, 240, 0.65)', marginBottom: '6px' }}>
                    Total Planned Budget
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>
                    {plannedBudget !== null ? `₹${plannedBudget.toLocaleString()}` : 'Budget not set'}
                  </div>
                </div>

                <div
                  style={{
                    padding: '20px',
                    background: 'rgba(20, 28, 48, 0.65)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  <div style={{ fontSize: '0.8rem', color: 'rgba(226, 232, 240, 0.65)', marginBottom: '6px' }}>
                    Activity Expenses
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8' }}>
                    {totalActivitiesCost > 0 ? `₹${totalActivitiesCost.toLocaleString()}` : '₹0'}
                  </div>
                </div>

                <div
                  style={{
                    padding: '20px',
                    background:
                      plannedBudget === null
                        ? 'rgba(20, 28, 48, 0.65)'
                        : isOverBudget
                        ? 'rgba(239, 68, 68, 0.12)'
                        : 'rgba(16, 185, 129, 0.12)',
                    borderRadius: '16px',
                    border:
                      plannedBudget === null
                        ? '1px solid rgba(255, 255, 255, 0.08)'
                        : isOverBudget
                        ? '1px solid rgba(239, 68, 68, 0.3)'
                        : '1px solid rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: plannedBudget === null ? 'rgba(226, 232, 240, 0.65)' : isOverBudget ? '#fca5a5' : '#34d399',
                      marginBottom: '6px'
                    }}
                  >
                    {plannedBudget === null ? 'Remaining Budget' : isOverBudget ? 'Over Budget' : 'Remaining Budget'}
                  </div>
                  <div
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      color: plannedBudget === null ? 'rgba(226, 232, 240, 0.75)' : isOverBudget ? '#fca5a5' : '#34d399'
                    }}
                  >
                    {plannedBudget !== null ? `₹${Math.abs(remainingBudget).toLocaleString()}` : '—'}
                  </div>
                </div>
              </div>

              {/* Visual Progress Graph */}
              {plannedBudget !== null && plannedBudget > 0 ? (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.85rem',
                      color: 'rgba(226, 232, 240, 0.75)',
                      marginBottom: '10px'
                    }}
                  >
                    <span>Category Allocation</span>
                    <span style={{ fontWeight: 700, color: isOverBudget ? '#fca5a5' : '#ffffff' }}>
                      {Math.round((totalActivitiesCost / plannedBudget) * 100)}% of Budget Utilized
                    </span>
                  </div>

                  <div
                    style={{
                      height: '14px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: '9999px',
                      overflow: 'hidden',
                      display: 'flex'
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, (sightseeingCost / plannedBudget) * 100)}%`,
                        background: '#0ea5e9',
                        transition: 'width 0.4s ease'
                      }}
                      title="Sightseeing & Culture"
                    />
                    <div
                      style={{
                        width: `${Math.min(100, (mealsCost / plannedBudget) * 100)}%`,
                        background: '#f59e0b',
                        transition: 'width 0.4s ease'
                      }}
                      title="Food & Dining"
                    />
                    <div
                      style={{
                        width: `${Math.min(100, (otherCost / plannedBudget) * 100)}%`,
                        background: '#a855f7',
                        transition: 'width 0.4s ease'
                      }}
                      title="Other Activities"
                    />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '24px',
                      marginTop: '16px',
                      fontSize: '0.8rem',
                      color: 'rgba(226, 232, 240, 0.7)',
                      flexWrap: 'wrap'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0ea5e9' }} />
                      Sightseeing & Culture (₹{sightseeingCost.toLocaleString()})
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                      Food & Dining (₹{mealsCost.toLocaleString()})
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7' }} />
                      Other Activities (₹{otherCost.toLocaleString()})
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.875rem', color: 'rgba(226, 232, 240, 0.65)', fontStyle: 'italic', paddingTop: '6px' }}>
                  Budget not set for this trip. Edit the trip to specify a planned budget.
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
          backgroundColor: 'rgba(12, 16, 26, 0.95)', border: '1px solid #0ea5e9',
          borderRadius: '12px', padding: '14px 20px', color: '#fff',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <Check size={18} style={{ color: '#38bdf8' }} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Delete Activity Confirmation Modal */}
      {activityToDelete && (
        <Modal
          isOpen={Boolean(activityToDelete)}
          onClose={() => setActivityToDelete(null)}
          title="Delete Activity"
          maxWidth="460px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <p style={{ color: 'rgba(226, 232, 240, 0.85)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>"{activityToDelete.title}"</strong> from your itinerary?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setActivityToDelete(null)}
                style={{
                  padding: '9px 18px', borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#fff', cursor: 'pointer', fontSize: '0.85rem'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteActivity}
                disabled={isDeletingActivity}
                style={{
                  padding: '9px 18px', borderRadius: '9999px',
                  background: '#ef4444', border: 'none', color: '#fff',
                  fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem'
                }}
              >
                {isDeletingActivity ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ItineraryView;
