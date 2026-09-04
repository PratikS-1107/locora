import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getTripById,
  updateTrip,
  updateTripBudget,
  getItineraryDays,
  ensureItineraryDays,
  updateItineraryDay,
  getActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  reorderActivities
} from '../services/api';
import ActivityCard from '../components/ActivityCard';
import Modal from '../components/Modal';
import {
  ArrowLeft,
  Plus,
  Calendar,
  MapPin,
  Clock,
  PieChart,
  Save,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Edit3,
  Compass,
  Coins,
  Lock,
  Eye,
  Info,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

const CATEGORIES = [
  'Sightseeing',
  'Food',
  'Culture',
  'Adventure',
  'Shopping',
  'Nightlife',
  'Workshop',
  'Nature',
  'Entertainment',
  'Other'
];

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'AED', 'SGD', 'THB'];

const ItineraryBuilder = () => {
  const { id, tripId } = useParams();
  const targetTripId = tripId || id;
  const navigate = useNavigate();
  const { user } = useAuth();

  const [trip, setTrip] = useState(null);
  const [days, setDays] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Save button status for trip-level metadata
  const [saveStatus, setSaveStatus] = useState('Save'); // 'Save', 'Saving...', 'Saved'

  // Active day selection
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  // Toast message
  const [toastMsg, setToastMsg] = useState('');
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Add / Edit Activity Modal State
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [actTitle, setActTitle] = useState('');
  const [actCategory, setActCategory] = useState('Sightseeing');
  const [actDayId, setActDayId] = useState('');
  const [actStartTime, setActStartTime] = useState('10:00 AM');
  const [actDuration, setActDuration] = useState(60);
  const [actLocation, setActLocation] = useState('');
  const [actAddress, setActAddress] = useState('');
  const [actDescription, setActDescription] = useState('');
  const [actCost, setActCost] = useState(0);
  const [actCurrency, setActCurrency] = useState('INR');
  const [isSubmittingActivity, setIsSubmittingActivity] = useState(false);

  // Confirmation Modals
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeletingActivity, setIsDeletingActivity] = useState(false);

  // Budget Modal State
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  // Day Note Edit State
  const [showDayNoteModal, setShowDayNoteModal] = useState(false);
  const [editingDayNote, setEditingDayNote] = useState('');
  const [isSavingDayNote, setIsSavingDayNote] = useState(false);

  // Trip metadata editable state
  const [tripTitleInput, setTripTitleInput] = useState('');
  const [tripDescInput, setTripDescInput] = useState('');

  // Load Trip, Days, and Activities
  const loadWorkspace = async () => {
    if (!targetTripId) {
      setLoadError('No trip ID specified.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError('');

      // 1. Fetch Trip details
      const tripRes = await getTripById(targetTripId);
      if (tripRes.error || !tripRes.data) {
        setLoadError(tripRes.error || 'Trip not found');
        setLoading(false);
        return;
      }

      const tripData = tripRes.data;
      setTrip(tripData);
      setTripTitleInput(tripData.title || tripData.name || '');
      setTripDescInput(tripData.description || '');
      setBudgetInput(tripData.budget !== null && tripData.budget !== undefined ? String(tripData.budget) : '');

      // 2. Ensure Itinerary Days are synced for date range
      if (tripData.start_date && tripData.end_date) {
        await ensureItineraryDays(tripData.id, tripData.start_date, tripData.end_date);
      }

      // 3. Fetch Days
      const daysRes = await getItineraryDays(tripData.id);
      const loadedDays = daysRes.data || [];
      setDays(loadedDays);

      // 4. Fetch Activities
      const actRes = await getActivities(tripData.id);
      const loadedActivities = actRes.data || [];
      setActivities(loadedActivities);

    } catch (err) {
      console.error('Error loading itinerary workspace:', err);
      setLoadError(err.message || 'Failed to load itinerary data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, [targetTripId]);

  // Auth & Permissions Guard
  const canEdit = Boolean(
    trip &&
    user &&
    user.id &&
    trip.user_id === user.id &&
    trip.trip_source === 'personal'
  );

  const currentDay = days[activeDayIndex] || days[0] || null;

  const currentDayActivities = activities
    .filter(a => currentDay && a.itinerary_day_id === currentDay.id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  // ----------------------------------------------------
  // Activity Operations (Immediate Persist)
  // ----------------------------------------------------

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setActTitle('');
    setActCategory('Sightseeing');
    setActDayId(currentDay ? currentDay.id : (days[0]?.id || ''));
    setActStartTime('10:00 AM');
    setActDuration(60);
    setActLocation(trip?.destination || '');
    setActAddress('');
    setActDescription('');
    setActCost(0);
    setActCurrency(activities[0]?.currency || 'INR');
    setShowActivityModal(true);
  };

  const handleOpenEditModal = (activity) => {
    setEditingItem(activity);
    setActTitle(activity.title || '');
    setActCategory(activity.category || 'Sightseeing');
    setActDayId(activity.itinerary_day_id || (currentDay ? currentDay.id : ''));
    setActStartTime(activity.start_time || '10:00 AM');
    setActDuration(activity.duration_minutes || 60);
    setActLocation(activity.location || '');
    setActAddress(activity.address || '');
    setActDescription(activity.description || '');
    setActCost(activity.estimated_cost || 0);
    setActCurrency(activity.currency || 'INR');
    setShowActivityModal(true);
  };

  const handleSaveActivity = async (e) => {
    e.preventDefault();
    if (!actTitle.trim()) {
      alert('Please enter an activity title.');
      return;
    }

    if (!actDayId) {
      alert('Please select an itinerary day for this activity.');
      return;
    }

    setIsSubmittingActivity(true);

    try {
      const payload = {
        trip_id: trip.id,
        itinerary_day_id: actDayId,
        title: actTitle.trim(),
        description: actDescription.trim(),
        category: actCategory,
        location: actLocation.trim(),
        address: actAddress.trim(),
        start_time: actStartTime,
        duration_minutes: Number(actDuration) || 0,
        estimated_cost: Number(actCost) || 0,
        currency: actCurrency.toUpperCase()
      };

      if (editingItem) {
        // Update existing activity
        const res = await updateActivity(editingItem.id, payload);
        if (res.error) {
          alert(`Failed to update activity: ${res.error}`);
          return;
        }

        const updated = res.data;
        setActivities(prev => prev.map(a => a.id === editingItem.id ? updated : a));
        showToast('Activity updated successfully');
      } else {
        // Insert new activity
        const currentCount = activities.filter(a => a.itinerary_day_id === actDayId).length;
        payload.sort_order = currentCount;

        const res = await createActivity(payload);
        if (res.error) {
          alert(`Failed to add activity: ${res.error}`);
          return;
        }

        const created = res.data;
        setActivities(prev => [...prev, created]);
        showToast('Activity added to itinerary');
      }

      setShowActivityModal(false);
      setEditingItem(null);
    } catch (err) {
      console.error('Error saving activity:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmittingActivity(false);
    }
  };

  const handleDeleteActivity = async () => {
    if (!itemToDelete) return;
    setIsDeletingActivity(true);

    try {
      const res = await deleteActivity(itemToDelete.id);
      if (res.error) {
        alert(`Failed to delete activity: ${res.error}`);
        return;
      }

      setActivities(prev => prev.filter(a => a.id !== itemToDelete.id));
      showToast('Activity removed from itinerary');
      setItemToDelete(null);
    } catch (err) {
      console.error('Error deleting activity:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsDeletingActivity(false);
    }
  };

  const handleMoveSort = async (activity, direction) => {
    const dayActs = [...currentDayActivities];
    const currentIndex = dayActs.findIndex(a => a.id === activity.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= dayActs.length) return;

    // Swap positions
    const [moved] = dayActs.splice(currentIndex, 1);
    dayActs.splice(targetIndex, 0, moved);

    const orderedIds = dayActs.map(a => a.id);

    // Optimistically update sort order in UI
    const updatedActivities = activities.map(a => {
      const idx = orderedIds.indexOf(a.id);
      if (idx !== -1) {
        return { ...a, sort_order: idx };
      }
      return a;
    });
    setActivities(updatedActivities);

    // Persist real sort order in Supabase
    const res = await reorderActivities(orderedIds);
    if (res.error) {
      console.error('Failed to persist reorder in Supabase:', res.error);
      showToast('Warning: Could not save order to database');
    }
  };

  // ----------------------------------------------------
  // Budget & Day Notes
  // ----------------------------------------------------

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    setIsSavingBudget(true);

    const newBudgetValue = budgetInput.trim() === '' ? null : Number(budgetInput);

    try {
      const res = await updateTripBudget(trip.id, newBudgetValue);
      if (res.error) {
        alert(`Failed to update budget: ${res.error}`);
        return;
      }

      setTrip(prev => ({ ...prev, budget: newBudgetValue }));
      setShowBudgetModal(false);
      showToast('Budget updated successfully');
    } catch (err) {
      console.error('Error updating budget:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSavingBudget(false);
    }
  };

  const handleOpenDayNote = () => {
    setEditingDayNote(currentDay?.notes || '');
    setShowDayNoteModal(true);
  };

  const handleSaveDayNote = async (e) => {
    e.preventDefault();
    if (!currentDay) return;
    setIsSavingDayNote(true);

    try {
      const res = await updateItineraryDay(currentDay.id, { notes: editingDayNote.trim() || null });
      if (res.error) {
        alert(`Failed to save note: ${res.error}`);
        return;
      }

      setDays(prev => prev.map(d => d.id === currentDay.id ? { ...d, notes: editingDayNote.trim() || null } : d));
      setShowDayNoteModal(false);
      showToast('Day notes saved');
    } catch (err) {
      console.error('Error saving day note:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSavingDayNote(false);
    }
  };

  // Trip-level metadata Save button
  const handleGlobalSave = async () => {
    if (!trip) return;
    setSaveStatus('Saving...');

    try {
      const payload = {
        title: tripTitleInput.trim() || trip.title,
        description: tripDescInput.trim() || trip.description,
        budget: budgetInput.trim() === '' ? null : Number(budgetInput)
      };

      const res = await updateTrip(trip.id, payload);
      if (res.error) {
        alert(`Failed to save trip details: ${res.error}`);
        setSaveStatus('Save');
        return;
      }

      setTrip(prev => ({ ...prev, ...payload }));
      setSaveStatus('Saved');
      showToast('Trip details saved successfully');
      setTimeout(() => setSaveStatus('Save'), 2500);
    } catch (err) {
      console.error('Error saving trip metadata:', err);
      alert(`Save error: ${err.message}`);
      setSaveStatus('Save');
    }
  };

  // ----------------------------------------------------
  // Budget & Currency Calculations (No Fabricated Numbers)
  // ----------------------------------------------------

  const plannedBudget = trip?.budget !== null && trip?.budget !== undefined ? Number(trip.budget) : null;

  // Track distinct currencies across activities with non-zero cost
  const distinctCurrencies = Array.from(
    new Set(
      activities
        .filter(a => a.estimated_cost && Number(a.estimated_cost) > 0)
        .map(a => a.currency || 'INR')
    )
  );

  const hasMultipleCurrencies = distinctCurrencies.length > 1;
  const primaryCurrency = distinctCurrencies[0] || 'INR';

  // Calculate total expense only if single currency or 0
  let totalActivityExpenses = 0;
  if (!hasMultipleCurrencies) {
    totalActivityExpenses = activities.reduce((sum, act) => {
      const cost = Number(act.estimated_cost) || 0;
      return sum + cost;
    }, 0);
  }

  const remainingBudget = plannedBudget !== null ? (plannedBudget - totalActivityExpenses) : null;
  const isOverBudget = plannedBudget !== null && !hasMultipleCurrencies && remainingBudget < 0;

  // ----------------------------------------------------
  // UI Render
  // ----------------------------------------------------

  if (loading) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ width: '24px', height: '24px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px auto' }} />
        Loading itinerary workspace...
      </div>
    );
  }

  if (loadError || !trip) {
    return (
      <div style={{ width: '100%', maxWidth: '600px', margin: '60px auto', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '40px' }}>
          <AlertTriangle size={36} style={{ color: '#f87171', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>Cannot Open Itinerary Editor</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
            {loadError || 'This trip could not be found or you do not have permission to view it.'}
          </p>
          <button onClick={() => navigate('/my-trips')} className="btn btn-primary" style={{ padding: '10px 24px' }}>
            Back to My Trips
          </button>
        </div>
      </div>
    );
  }

  // Protection Guard: If the trip is not personal or not owned by the current user
  if (!canEdit) {
    return (
      <div style={{ width: '100%', maxWidth: '640px', margin: '60px auto', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '40px' }}>
          <Lock size={36} style={{ color: 'var(--accent-amber)', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>Read-Only Itinerary</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '24px' }}>
            {trip.trip_source === 'template'
              ? 'This is a curated Explore template and cannot be edited directly. To customize it, click "Use Template" or "Copy Trip" from Explore.'
              : trip.trip_source === 'community'
              ? 'This is a Community published trip and cannot be edited directly.'
              : 'You do not have permission to edit this personal trip.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={() => navigate('/my-trips')} className="btn btn-secondary" style={{ padding: '10px 20px' }}>
              Back to My Trips
            </button>
            <Link to={`/trip/${trip.id}`} className="btn btn-primary" style={{ padding: '10px 20px' }}>
              <Eye size={16} />
              <span>View Itinerary</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const tripTitle = trip.title || trip.name || 'My Journey Itinerary';

  return (
    <div style={{ width: '100%', maxWidth: '1240px', margin: '0 auto', paddingBottom: '60px' }}>

      {/* Toast Feedback */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
          backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--primary)',
          borderRadius: 'var(--radius-md)', padding: '14px 20px', color: '#fff',
          boxShadow: 'var(--shadow-lg)', backdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <CheckCircle2 size={18} style={{ color: 'var(--primary)' }} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px',
        paddingBottom: '20px',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/my-trips')} className="btn btn-secondary" style={{ padding: '8px 14px' }}>
            <ArrowLeft size={16} />
            <span>Back to My Trips</span>
          </button>

          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              {tripTitle}
            </h1>
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {trip.start_date && trip.end_date && (
                <span>📅 {trip.start_date} — {trip.end_date}</span>
              )}
              {trip.destination && (
                <span>📍 {trip.destination}{trip.country ? `, ${trip.country}` : ''}</span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            to={`/trip/${trip.id}`}
            className="btn btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.875rem' }}
          >
            <Eye size={16} />
            <span>View Itinerary</span>
          </Link>

          <button
            onClick={handleGlobalSave}
            className="btn btn-primary"
            style={{ padding: '8px 20px', fontSize: '0.875rem', fontWeight: 700 }}
          >
            <Save size={16} />
            <span>{saveStatus}</span>
          </button>
        </div>
      </div>

      {/* WORKSPACE MAIN LAYOUT (LEFT / RIGHT) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', alignItems: 'start' }} className="itinerary-workspace-grid">

        {/* LEFT / MAIN AREA */}
        <div>

          {/* DAY PICKER SELECTOR */}
          {days.length > 0 ? (
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '24px',
              overflowX: 'auto',
              paddingBottom: '8px'
            }}>
              {days.map((day, idx) => {
                const isActive = activeDayIndex === idx;
                const countForDay = activities.filter(a => a.itinerary_day_id === day.id).length;

                return (
                  <button
                    key={day.id || idx}
                    onClick={() => setActiveDayIndex(idx)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 700 : 500,
                      backgroundColor: isActive ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
                      color: isActive ? '#ffffff' : 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      minWidth: '110px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
                      <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>DAY {day.day_number || idx + 1}</span>
                      <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px', background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)' }}>
                        {countForDay}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '2px' }}>
                      {day.date || `Day ${idx + 1}`}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No itinerary days found for this trip. Set start and end dates in trip details to create days automatically.
            </div>
          )}

          {/* DAILY ITINERARY HEADER */}
          {currentDay && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
                  DAY {currentDay.day_number || activeDayIndex + 1} — {currentDay.date || 'Scheduled Activities'}
                </h2>
                {currentDay.notes && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', margin: '4px 0 0 0' }}>
                    📝 {currentDay.notes}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleOpenDayNote}
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                >
                  <Edit3 size={14} />
                  <span>{currentDay.notes ? 'Edit Notes' : 'Add Day Note'}</span>
                </button>

                <button
                  onClick={handleOpenAddModal}
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  <Plus size={16} />
                  <span>Add Activity</span>
                </button>
              </div>
            </div>
          )}

          {/* ACTIVITIES LIST */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {currentDayActivities.length === 0 ? (
              <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center' }}>
                <Compass size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px auto', opacity: 0.6 }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  No activities planned for this day yet.
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 20px auto' }}>
                  Add your first sightseeing spot, meal, or workshop to schedule your day.
                </p>
                <button
                  onClick={handleOpenAddModal}
                  className="btn btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.875rem' }}
                >
                  <Plus size={16} />
                  <span>Add Activity to Day {currentDay?.day_number || activeDayIndex + 1}</span>
                </button>
              </div>
            ) : (
              currentDayActivities.map((activity, actIndex) => (
                <div
                  key={activity.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  {/* Reorder Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button
                      type="button"
                      disabled={actIndex === 0}
                      onClick={() => handleMoveSort(activity, 'up')}
                      style={{
                        padding: '4px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        cursor: actIndex === 0 ? 'not-allowed' : 'pointer',
                        opacity: actIndex === 0 ? 0.3 : 0.8,
                        color: '#fff'
                      }}
                      title="Move Up"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={actIndex === currentDayActivities.length - 1}
                      onClick={() => handleMoveSort(activity, 'down')}
                      style={{
                        padding: '4px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        cursor: actIndex === currentDayActivities.length - 1 ? 'not-allowed' : 'pointer',
                        opacity: actIndex === currentDayActivities.length - 1 ? 0.3 : 0.8,
                        color: '#fff'
                      }}
                      title="Move Down"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  {/* Main Activity Card */}
                  <div style={{ flex: 1 }}>
                    <ActivityCard
                      activity={activity}
                      showActions={true}
                      onEdit={() => handleOpenEditModal(activity)}
                      onDelete={() => setItemToDelete(activity)}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT / SIDEBAR (BUDGET & TRIP DETAILS) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* REAL BUDGET PANEL */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Coins size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Trip Budget</h3>
              </div>
              <button
                onClick={() => setShowBudgetModal(true)}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              >
                {plannedBudget !== null ? 'Edit Budget' : 'Set Budget'}
              </button>
            </div>

            {hasMultipleCurrencies ? (
              <div style={{
                padding: '14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                border: '1px solid rgba(234, 179, 8, 0.25)',
                color: '#fef08a',
                fontSize: '0.85rem',
                lineHeight: 1.5
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '4px' }}>
                  <AlertTriangle size={16} />
                  <span>Multiple Currencies Detected</span>
                </div>
                Activities use multiple currencies ({distinctCurrencies.join(', ')}). Totals cannot be combined without exchange rates.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Planned Budget</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {plannedBudget !== null ? `${primaryCurrency} ${plannedBudget.toLocaleString()}` : 'Budget not set'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Activity Expenses</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {totalActivityExpenses > 0 ? `${primaryCurrency} ${totalActivityExpenses.toLocaleString()}` : 'No activity expenses yet'}
                  </span>
                </div>

                {plannedBudget !== null && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.875rem',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border-subtle)'
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Remaining</span>
                    <span style={{
                      fontWeight: 800,
                      color: isOverBudget ? '#f87171' : 'var(--accent-emerald)'
                    }}>
                      {isOverBudget ? `Over by ${primaryCurrency} ${Math.abs(remainingBudget).toLocaleString()}` : `${primaryCurrency} ${remainingBudget.toLocaleString()}`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* TRIP DETAILS CARD */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 16px 0' }}>Trip Metadata</h3>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Trip Title</label>
              <input
                type="text"
                className="form-input"
                style={{ fontSize: '0.875rem', padding: '8px 12px' }}
                value={tripTitleInput}
                onChange={(e) => setTripTitleInput(e.target.value)}
                placeholder="Trip Title"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Description</label>
              <textarea
                rows={3}
                className="form-textarea"
                style={{ fontSize: '0.875rem', padding: '8px 12px' }}
                value={tripDescInput}
                onChange={(e) => setTripDescInput(e.target.value)}
                placeholder="Notes or description for this trip"
              />
            </div>

            <button
              onClick={handleGlobalSave}
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px', fontSize: '0.875rem', fontWeight: 600 }}
            >
              <Save size={16} />
              <span>{saveStatus}</span>
            </button>
          </div>

        </div>

      </div>

      {/* MODAL: ADD / EDIT ACTIVITY */}
      <Modal
        isOpen={showActivityModal}
        onClose={() => { if (!isSubmittingActivity) setShowActivityModal(false); }}
        title={editingItem ? 'Edit Activity' : 'Add Activity'}
        maxWidth="540px"
      >
        <form onSubmit={handleSaveActivity}>
          <div className="form-group">
            <label className="form-label">Activity Title *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Fushimi Inari Morning Walk"
              value={actTitle}
              onChange={(e) => setActTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={actCategory}
                onChange={(e) => setActCategory(e.target.value)}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Assign to Day *</label>
              <select
                className="form-select"
                value={actDayId}
                onChange={(e) => setActDayId(e.target.value)}
                required
              >
                {days.map((d, idx) => (
                  <option key={d.id} value={d.id}>
                    Day {d.day_number || idx + 1} ({d.date || 'Unscheduled'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Start Time</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 09:30 AM"
                value={actStartTime}
                onChange={(e) => setActStartTime(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Duration (Minutes)</label>
              <input
                type="number"
                min="0"
                step="5"
                className="form-input"
                value={actDuration}
                onChange={(e) => setActDuration(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Location / Spot</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Fushimi Ward"
                value={actLocation}
                onChange={(e) => setActLocation(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Address</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 68 Fukakusa Yabunouchicho"
                value={actAddress}
                onChange={(e) => setActAddress(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Estimated Cost</label>
              <input
                type="number"
                min="0"
                step="any"
                className="form-input"
                placeholder="0"
                value={actCost}
                onChange={(e) => setActCost(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Currency</label>
              <select
                className="form-select"
                value={actCurrency}
                onChange={(e) => setActCurrency(e.target.value)}
              >
                {CURRENCIES.map(curr => (
                  <option key={curr} value={curr}>{curr}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes & Description</label>
            <textarea
              rows={3}
              className="form-textarea"
              placeholder="What to see, tips, transport instructions..."
              value={actDescription}
              onChange={(e) => setActDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={() => setShowActivityModal(false)}
              className="btn btn-secondary"
              disabled={isSubmittingActivity}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmittingActivity}
            >
              {isSubmittingActivity ? 'Saving...' : editingItem ? 'Update Activity' : 'Add Activity'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: DELETE ACTIVITY CONFIRMATION */}
      <Modal
        isOpen={Boolean(itemToDelete)}
        onClose={() => { if (!isDeletingActivity) setItemToDelete(null); }}
        title="Delete Activity"
        maxWidth="440px"
      >
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '20px' }}>
            Are you sure you want to remove <strong style={{ color: 'var(--text-primary)' }}>{itemToDelete?.title}</strong> from your itinerary? This cannot be undone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setItemToDelete(null)}
              className="btn btn-secondary"
              disabled={isDeletingActivity}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteActivity}
              className="btn"
              style={{ backgroundColor: '#ef4444', color: '#fff', padding: '8px 18px', fontWeight: 600 }}
              disabled={isDeletingActivity}
            >
              {isDeletingActivity ? 'Deleting...' : 'Delete Activity'}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: BUDGET SETTINGS */}
      <Modal
        isOpen={showBudgetModal}
        onClose={() => setShowBudgetModal(false)}
        title="Set Trip Planned Budget"
        maxWidth="440px"
      >
        <form onSubmit={handleSaveBudget}>
          <div className="form-group">
            <label className="form-label">Total Planned Budget ({primaryCurrency})</label>
            <input
              type="number"
              min="0"
              step="any"
              className="form-input"
              placeholder="e.g. 50000"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Leave blank to clear the budget.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={() => setShowBudgetModal(false)}
              className="btn btn-secondary"
              disabled={isSavingBudget}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSavingBudget}
            >
              {isSavingBudget ? 'Updating...' : 'Update Budget'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: DAY NOTE */}
      <Modal
        isOpen={showDayNoteModal}
        onClose={() => setShowDayNoteModal(false)}
        title={`Notes for Day ${currentDay?.day_number || activeDayIndex + 1}`}
        maxWidth="460px"
      >
        <form onSubmit={handleSaveDayNote}>
          <div className="form-group">
            <label className="form-label">Day Focus / Highlights</label>
            <textarea
              rows={3}
              className="form-textarea"
              placeholder="e.g. Morning temple stroll, afternoon tea ceremony..."
              value={editingDayNote}
              onChange={(e) => setEditingDayNote(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={() => setShowDayNoteModal(false)}
              className="btn btn-secondary"
              disabled={isSavingDayNote}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSavingDayNote}
            >
              {isSavingDayNote ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default ItineraryBuilder;
