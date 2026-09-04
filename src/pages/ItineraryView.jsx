import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTripById, getTripItinerary } from '../services/api';
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
  Info
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

  // Calculate percentage utilization
  const budgetUtilizationPercent = plannedBudget !== null && plannedBudget > 0
    ? Math.min(100, Math.round((totalActivitiesCost / plannedBudget) * 100))
    : 0;

  // Progress ring math
  const ringRadius = 48;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringStrokeOffset = ringCircumference - (ringCircumference * budgetUtilizationPercent) / 100;

  if (loading) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ width: '24px', height: '24px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px auto' }} />
        Loading itinerary details...
      </div>
    );
  }

  if (loadError || !trip) {
    return (
      <div style={{ width: '100%', maxWidth: '600px', margin: '60px auto', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '40px' }}>
          <AlertTriangle size={36} style={{ color: '#f87171', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>Itinerary Unavailable</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
            {loadError || 'This itinerary could not be found or you do not have permission to view it.'}
          </p>
          <button onClick={() => navigate('/my-trips')} className="btn btn-primary" style={{ padding: '10px 24px' }}>
            Back to My Trips
          </button>
        </div>
      </div>
    );
  }

  const tripTitle = trip.title || trip.name || 'Travel Itinerary';
  const coverUrl = trip.cover_image_url || null;

  return (
    <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', paddingBottom: '60px' }}>

      {/* Top Header Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <button onClick={() => navigate('/my-trips')} className="btn btn-secondary" style={{ padding: '8px 14px' }}>
          <ArrowLeft size={16} />
          <span>Back to My Trips</span>
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleCopyLink} className="btn btn-secondary" style={{ padding: '8px 14px' }}>
            {copied ? <Check size={16} style={{ color: 'var(--accent-emerald)' }} /> : <Share2 size={16} />}
            <span>{copied ? 'Link Copied!' : 'Share'}</span>
          </button>

          {isOwner && (
            <Link to={`/trip/${trip.id}/edit`} className="btn btn-primary" style={{ padding: '8px 16px' }}>
              <Edit3 size={16} />
              <span>Edit Trip</span>
            </Link>
          )}
        </div>
      </div>

      {/* Hero Cover Card */}
      <div className="glass-panel" style={{ overflow: 'hidden', marginBottom: '32px', padding: 0 }}>
        <div style={{ height: '260px', position: 'relative', backgroundColor: 'var(--bg-card)' }}>
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={tripTitle}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2) 0%, rgba(124, 58, 237, 0.25) 50%, rgba(15, 23, 42, 0.8) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Compass size={64} style={{ color: 'rgba(255,255,255,0.15)' }} />
            </div>
          )}

          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(9, 12, 18, 0.95) 0%, rgba(9, 12, 18, 0.2) 60%, transparent 100%)' }} />

          <div style={{ position: 'absolute', bottom: '24px', left: '24px', right: '24px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <span className={`badge ${trip.is_public ? 'badge-primary' : 'badge-slate'}`} style={{ backdropFilter: 'blur(8px)' }}>
                {trip.is_public ? <Globe size={12} /> : <Lock size={12} />}
                <span>{trip.is_public ? 'Public Itinerary' : 'Private Trip'}</span>
              </span>

              {trip.trip_source && (
                <span className="badge badge-purple" style={{ backdropFilter: 'blur(8px)', textTransform: 'capitalize' }}>
                  {trip.trip_source}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 8px 0', textShadow: '0 2px 10px rgba(0,0,0,0.5)', color: '#ffffff' }}>
              {tripTitle}
            </h1>

            <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              {trip.start_date && trip.end_date && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={15} style={{ color: 'var(--primary)' }} />
                  {trip.start_date} — {trip.end_date}
                </span>
              )}
              {trip.destination && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={15} style={{ color: 'var(--accent-cyan)' }} />
                  {trip.destination}{trip.country ? `, ${trip.country}` : ''}
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={15} style={{ color: 'var(--accent-emerald)' }} />
                {days.length} {days.length === 1 ? 'Day' : 'Days'} · {activities.length} {activities.length === 1 ? 'Activity' : 'Activities'}
              </span>
            </div>
          </div>
        </div>

        {trip.description && (
          <div style={{ padding: '20px 24px', color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6 }}>
            {trip.description}
          </div>
        )}
      </div>

      {/* ================= REAL INTERACTIVE CALENDAR / DAY SELECTOR ================= */}
      <section style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
              Itinerary Schedule
            </h2>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Select a calendar day to explore scheduled experiences and timings
            </p>
          </div>
        </div>

        {days.length > 0 ? (
          <div style={{
            display: 'flex',
            gap: '10px',
            overflowX: 'auto',
            paddingBottom: '8px',
            marginBottom: '20px'
          }}>
            {days.map((d, idx) => {
              const isSelected = activeDay?.id === d.id;
              const actsInDay = activities.filter(a => a.itinerary_day_id === d.id).length;

              return (
                <button
                  key={d.id || idx}
                  onClick={() => setSelectedDayId(d.id)}
                  style={{
                    padding: '12px 18px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isSelected ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
                    color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                    border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    minWidth: '120px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.85 }}>
                      DAY {d.day_number || idx + 1}
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      background: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                      fontWeight: 700
                    }}>
                      {actsInDay}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, marginTop: '4px' }}>
                    {d.date || `Day ${idx + 1}`}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No itinerary schedule days configured for this trip.
          </div>
        )}

        {/* SELECTED DAY ACTIVITIES CONTAINER */}
        {activeDay && (
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>
                  Day {activeDay.day_number || 1} — {activeDay.date || 'Day Schedule'}
                </h3>
                {activeDay.notes && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', margin: '4px 0 0 0' }}>
                    📝 {activeDay.notes}
                  </p>
                )}
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {activeDayActivities.length} {activeDayActivities.length === 1 ? 'Activity' : 'Activities'}
              </div>
            </div>

            {/* Activities List */}
            {activeDayActivities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeDayActivities.map((act) => (
                  <div
                    key={act.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      borderLeft: '3px solid var(--primary)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                          {act.start_time || '10:00 AM'} ({act.duration_minutes ? `${act.duration_minutes} min` : '60 min'})
                        </span>
                        {act.category && (
                          <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                            {act.category}
                          </span>
                        )}
                      </div>

                      <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                        {act.title}
                      </h4>

                      {act.description && (
                        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: '0 0 6px 0', lineHeight: 1.4 }}>
                          {act.description}
                        </p>
                      )}

                      {act.location && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} style={{ color: 'var(--accent-cyan)' }} />
                          {act.location}{act.address ? ` · ${act.address}` : ''}
                        </span>
                      )}
                    </div>

                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: act.estimated_cost ? 'var(--text-primary)' : 'var(--accent-emerald)', whiteSpace: 'nowrap', marginLeft: '16px' }}>
                      {Number(act.estimated_cost) > 0 ? `₹${Number(act.estimated_cost).toLocaleString()}` : 'Free'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '16px 0', textAlign: 'center' }}>
                No activities planned for this day yet.
              </div>
            )}
          </div>
        )}
      </section>

      {/* ================= REAL BUDGET GRAPH & VISUAL BREAKDOWN ================= */}
      <section className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <PieChart size={24} style={{ color: 'var(--primary)' }} />
          <div>
            <h3 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>Trip Budget Breakdown</h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0 }}>
              Live financial analysis computed from actual stored activities
            </p>
          </div>
        </div>

        {/* Multi-currency notification */}
        {hasMultipleCurrencies && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: '#fde68a',
            fontSize: '0.85rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Info size={18} style={{ flexShrink: 0 }} />
            <span>
              Activities specify multiple currencies ({uniqueCurrencies.join(', ')}). Totals below reflect numeric values without currency conversion.
            </span>
          </div>
        )}

        {/* Over-budget alert */}
        {isOverBudget && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: '#fca5a5',
            fontSize: '0.875rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertTriangle size={18} />
            <span>Activity expenses exceed your planned budget by ₹{Math.abs(remainingBudget).toLocaleString()}.</span>
          </div>
        )}

        {/* Main Budget Grid with Visual Progress Ring */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px', marginBottom: '24px' }}>
          
          <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Planned Budget</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>
              {plannedBudget !== null ? `₹${plannedBudget.toLocaleString()}` : 'Budget not set'}
            </div>
          </div>

          <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Activity Expenses</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>
              {totalActivitiesCost > 0 ? `₹${totalActivitiesCost.toLocaleString()}` : 'No activity expenses yet'}
            </div>
          </div>

          <div style={{
            padding: '16px',
            background: plannedBudget === null
              ? 'rgba(255, 255, 255, 0.03)'
              : isOverBudget ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            borderRadius: 'var(--radius-sm)',
            border: plannedBudget === null
              ? '1px solid var(--border-subtle)'
              : isOverBudget ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            <div style={{ fontSize: '0.75rem', color: plannedBudget === null ? 'var(--text-muted)' : (isOverBudget ? '#fca5a5' : '#34d399'), marginBottom: '4px' }}>
              {plannedBudget === null ? 'Remaining Budget' : (isOverBudget ? 'Over Budget' : 'Remaining Budget')}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: plannedBudget === null ? 'var(--text-secondary)' : (isOverBudget ? '#fca5a5' : '#34d399') }}>
              {plannedBudget !== null ? `₹${Math.abs(remainingBudget).toLocaleString()}` : '—'}
            </div>
          </div>

        </div>

        {/* Visual Progress Graph */}
        {plannedBudget !== null && plannedBudget > 0 ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
              <span>Category Allocation</span>
              <span style={{ fontWeight: 700, color: isOverBudget ? '#fca5a5' : 'var(--text-primary)' }}>
                {Math.round((totalActivitiesCost / plannedBudget) * 100)}% of Budget Utilized
              </span>
            </div>

            <div style={{ height: '14px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-full)', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${Math.min(100, (sightseeingCost / plannedBudget) * 100)}%`, background: 'var(--primary)', transition: 'width 0.4s ease' }} title="Sightseeing & Culture" />
              <div style={{ width: `${Math.min(100, (mealsCost / plannedBudget) * 100)}%`, background: 'var(--accent-amber)', transition: 'width 0.4s ease' }} title="Food & Dining" />
              <div style={{ width: `${Math.min(100, (otherCost / plannedBudget) * 100)}%`, background: 'var(--accent-purple)', transition: 'width 0.4s ease' }} title="Other Activities" />
            </div>

            <div style={{ display: 'flex', gap: '20px', marginTop: '14px', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }} /> Sightseeing & Culture (₹{sightseeingCost.toLocaleString()})</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-amber)' }} /> Food & Dining (₹{mealsCost.toLocaleString()})</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-purple)' }} /> Other Activities (₹{otherCost.toLocaleString()})</span>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', paddingTop: '6px' }}>
            Budget not set for this trip. Edit the trip to specify a planned budget.
          </div>
        )}
      </section>

    </div>
  );
};

export default ItineraryView;
