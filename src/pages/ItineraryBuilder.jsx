import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getTripById,
  updateTrip,
  updateTripBudget,
  updateTripCover,
  updateTripDatesAndItinerary,
  checkShortenTripImpact,
  getDatesInRange,
  getItineraryDays,
  ensureItineraryDays,
  updateItineraryDay,
  getActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  reorderActivities,
  getTripDayRecommendations,
  addRecommendationToTripDay
} from '../services/api';
import ActivityCard from '../components/ActivityCard';
import RecommendationCard from '../components/RecommendationCard';
import Modal from '../components/Modal';
import { formatDuration } from '../utils/formatters';
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
  Globe,
  Eye,
  Info,
  ChevronUp,
  ChevronDown,
  Upload,
  Image as ImageIcon,
  RefreshCw
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

  // Dates editing state
  const [showDatesModal, setShowDatesModal] = useState(false);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [isSavingDates, setIsSavingDates] = useState(false);
  const [datesErrorMsg, setDatesErrorMsg] = useState('');
  const [shortenWarning, setShortenWarning] = useState(null);

  // Cover image uploading state
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const coverInputRef = useRef(null);

  // Trip metadata editable state
  const [tripTitleInput, setTripTitleInput] = useState('');
  const [tripDescInput, setTripDescInput] = useState('');

  // Context-Aware Recommendations State for Active Day
  const [dayRecs, setDayRecs] = useState([]);
  const [loadingDayRecs, setLoadingDayRecs] = useState(false);
  const [recCategory, setRecCategory] = useState(null);
  const [addedRecIds, setAddedRecIds] = useState([]);
  const [showRecsPanel, setShowRecsPanel] = useState(true);

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

  const handleOpenDatesModal = () => {
    setEditStartDate(trip?.start_date || '');
    setEditEndDate(trip?.end_date || '');
    setDatesErrorMsg('');
    setShortenWarning(null);
    setShowDatesModal(true);
  };

  const handleSaveDates = async (forceConfirmed = false) => {
    setDatesErrorMsg('');
    if (!editStartDate || !editEndDate) {
      setDatesErrorMsg('Please specify both Start Date and End Date.');
      return;
    }
    if (editEndDate < editStartDate) {
      setDatesErrorMsg('End Date cannot be before Start Date.');
      return;
    }

    // Check impact if shortening
    if (!forceConfirmed) {
      const impact = await checkShortenTripImpact(trip.id, editStartDate, editEndDate);
      if (impact.willShorten && impact.affectedActivitiesCount > 0) {
        setShortenWarning(impact);
        return;
      }
    }

    setIsSavingDates(true);
    try {
      const res = await updateTripDatesAndItinerary(trip.id, editStartDate, editEndDate, true);
      if (res.error) {
        setDatesErrorMsg(res.error.message || 'Unable to update trip dates.');
        return;
      }

      setTrip(res.data);
      setDays(res.days || []);
      const actRes = await getActivities(trip.id);
      setActivities(actRes.data || []);

      if (activeDayIndex >= (res.days || []).length) {
        setActiveDayIndex(0);
      }

      setShowDatesModal(false);
      setShortenWarning(null);
      showToast('Trip dates and itinerary schedule updated successfully');
    } catch (err) {
      setDatesErrorMsg(err.message || 'Failed to update trip dates');
    } finally {
      setIsSavingDates(false);
    }
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
      const { data: updatedTrip, coverUrl, error } = await updateTripCover(trip.id, file);
      if (error || !updatedTrip) {
        showToast('Failed to upload cover image. Please try again.');
      } else {
        setTrip(prev => ({ ...prev, cover_image_url: coverUrl || updatedTrip.cover_image_url }));
        showToast('Trip cover image updated successfully');
      }
    } catch (err) {
      showToast('Unable to upload cover image.');
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
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

  // Day-level remaining time and context metrics
  const scheduledMinutesForDay = currentDayActivities.reduce((sum, act) => sum + (Number(act.duration_minutes) || 60), 0);
  const availableGapMinutes = Math.max(30, 600 - scheduledMinutesForDay);

  // ----------------------------------------------------
  // Context-Aware Day Recommendations
  // ----------------------------------------------------
  const refreshDayRecs = async () => {
    if (!trip || !currentDay) return;
    setLoadingDayRecs(true);
    try {
      const res = await getTripDayRecommendations({
        trip,
        day: currentDay,
        dayActivities: currentDayActivities,
        allActivities: activities,
        category: recCategory
      });

      if (res.success && Array.isArray(res.recommendations)) {
        setDayRecs(res.recommendations);
      } else {
        setDayRecs([]);
      }
    } catch (err) {
      console.error('Error fetching day recommendations:', err);
      setDayRecs([]);
    } finally {
      setLoadingDayRecs(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      if (!trip || !currentDay) return;
      setLoadingDayRecs(true);
      try {
        const res = await getTripDayRecommendations({
          trip,
          day: currentDay,
          dayActivities: currentDayActivities,
          allActivities: activities,
          category: recCategory
        });

        if (isMounted) {
          if (res.success && Array.isArray(res.recommendations)) {
            setDayRecs(res.recommendations);
          } else {
            setDayRecs([]);
          }
        }
      } catch (err) {
        if (isMounted) setDayRecs([]);
      } finally {
        if (isMounted) setLoadingDayRecs(false);
      }
    }, 280);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [activeDayIndex, currentDay?.id, recCategory, trip?.destination, activities.length]);

  const handleAddRecToDay = async (rec) => {
    if (!currentDay || !trip) return;
    try {
      const res = await addRecommendationToTripDay({
        recommendation: rec,
        tripId: trip.id,
        itineraryDayId: currentDay.id,
        dayActivities: currentDayActivities
      });

      if (res.error || !res.data) {
        showToast('Unable to add activity to this day.');
      } else {
        const newAct = res.data;
        setActivities(prev => [...prev, newAct]);
        setAddedRecIds(prev => [...prev, rec.placeId || rec.id]);
        showToast(`Added "${rec.name || rec.title}" to Day ${currentDay.day_number}!`);
      }
    } catch (err) {
      showToast('Could not add recommendation.');
    }
  };

  // ----------------------------------------------------
  // UI Render
  // ----------------------------------------------------

  if (loading) {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 24px 80px 24px',
        textAlign: 'center',
        color: 'var(--text-secondary)'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px auto'
        }} />
        <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>Loading itinerary workspace...</span>
      </div>
    );
  }

  if (loadError || !trip) {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 24px 80px 24px'
      }}>
        <div className="glass-panel" style={{
          maxWidth: '560px',
          width: '100%',
          padding: '40px',
          textAlign: 'center',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}>
          <AlertTriangle size={36} style={{ color: '#f87171', margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px', color: '#ffffff' }}>
            Cannot Open Itinerary Editor
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.6 }}>
            {loadError || 'This trip could not be found or you do not have permission to view it.'}
          </p>
          <button
            onClick={() => navigate('/my-trips')}
            className="btn btn-primary"
            style={{ padding: '10px 24px', borderRadius: '9999px' }}
          >
            Back to My Trips
          </button>
        </div>
      </div>
    );
  }

  // Protection Guard: If the trip is not personal or not owned by the current user
  if (!canEdit) {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 24px 80px 24px'
      }}>
        <div className="glass-panel" style={{
          maxWidth: '640px',
          width: '100%',
          padding: '40px',
          textAlign: 'center',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}>
          <Lock size={36} style={{ color: 'var(--accent-amber)', margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px', color: '#ffffff' }}>
            Read-Only Itinerary
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '24px' }}>
            {trip.trip_source === 'template'
              ? 'This is a curated Explore template and cannot be edited directly. To customize it, click "Use Template" or "Copy Trip" from Explore.'
              : trip.trip_source === 'community'
              ? 'This is a Community published trip and cannot be edited directly.'
              : 'You do not have permission to edit this personal trip.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/my-trips')}
              className="btn btn-secondary"
              style={{ padding: '10px 20px', borderRadius: '9999px' }}
            >
              Back to My Trips
            </button>
            <Link
              to={`/trip/${trip.id}`}
              className="btn btn-primary"
              style={{ padding: '10px 20px', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
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
    <div className="itinerary-builder-page page-entrance">

      {/* Toast Feedback */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 1000,
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid var(--primary)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 20px',
          color: '#fff',
          boxShadow: 'var(--shadow-lg)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <CheckCircle2 size={18} style={{ color: 'var(--primary)' }} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* TOP NAVIGATION & ACTION ROW */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <button
          onClick={() => navigate('/my-trips')}
          className="btn btn-secondary"
          style={{
            borderRadius: '9999px',
            padding: '9px 18px',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to My Trips</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            to={`/trip/${trip.id}`}
            className="btn btn-secondary"
            style={{
              borderRadius: '9999px',
              padding: '9px 18px',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Eye size={16} />
            <span>View Itinerary</span>
          </Link>

          <button
            onClick={handleGlobalSave}
            className="btn btn-primary"
            style={{
              borderRadius: '9999px',
              padding: '9px 22px',
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Save size={16} />
            <span>{saveStatus}</span>
          </button>
        </div>
      </div>

      {/* 2. TRIP HERO SECTION WITH COVER IMAGE */}
      <div className="itinerary-hero-banner">
        {/* Cover Background Visual */}
        {trip.cover_image_url ? (
          <img
            src={trip.cover_image_url}
            alt={tripTitle}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              filter: 'brightness(0.68)'
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.28) 0%, rgba(13, 18, 31, 0.96) 100%)'
            }}
          />
        )}

        {/* Dark Gradient Overlay for Maximum Legibility */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(7, 10, 16, 0.98) 0%, rgba(7, 10, 16, 0.62) 50%, rgba(7, 10, 16, 0.28) 100%)',
            pointerEvents: 'none'
          }}
        />

        {/* Hero Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '36px 36px 32px 36px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            gap: '20px'
          }}
        >
          <div style={{ maxWidth: '820px', flex: 1, minWidth: '280px' }}>
            {/* Badges Row */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
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

              {days.length > 0 && (
                <span
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    color: '#e2e8f0',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  {days.length} {days.length === 1 ? 'Day' : 'Days'}
                </span>
              )}

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

            {/* Dominant Trip Title */}
            <h1
              style={{
                fontSize: 'clamp(1.75rem, 3.5vw, 2.35rem)',
                fontWeight: 800,
                margin: '0 0 14px 0',
                color: '#ffffff',
                letterSpacing: '-0.025em',
                lineHeight: 1.25,
                textShadow: '0 2px 12px rgba(0, 0, 0, 0.7)'
              }}
            >
              {tripTitle}
            </h1>

            {/* Dates & Location Row */}
            <div style={{ display: 'flex', gap: '14px', fontSize: '0.875rem', color: '#cbd5e1', flexWrap: 'wrap', alignItems: 'center' }}>
              {trip.start_date && trip.end_date ? (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: 'rgba(15, 23, 42, 0.78)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  <Calendar size={14} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontWeight: 600 }}>{trip.start_date} — {trip.end_date}</span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={handleOpenDatesModal}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '2px',
                        marginLeft: '2px'
                      }}
                      title="Edit Trip Dates"
                    >
                      <Edit3 size={13} />
                    </button>
                  )}
                </div>
              ) : canEdit && (
                <button
                  type="button"
                  onClick={handleOpenDatesModal}
                  className="btn btn-secondary"
                  style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '9999px' }}
                >
                  <Calendar size={13} />
                  <span>Set Trip Dates</span>
                </button>
              )}

              {trip.destination && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: 'rgba(15, 23, 42, 0.78)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  <MapPin size={14} style={{ color: 'var(--accent-cyan)' }} />
                  <span style={{ fontWeight: 600 }}>{trip.destination}{trip.country && !trip.destination.includes(trip.country) ? `, ${trip.country}` : ''}</span>
                </div>
              )}
            </div>
          </div>

          {/* Change Cover Action Overlay Button */}
          {canEdit && (
            <div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                style={{ display: 'none' }}
                onChange={handleCoverFileChange}
              />
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={isUploadingCover}
                style={{
                  background: 'rgba(20, 26, 38, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(16px)',
                  color: '#ffffff',
                  padding: '9px 18px',
                  borderRadius: '9999px',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: isUploadingCover ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(20, 26, 38, 0.85)')}
                title="Upload new trip cover photo"
              >
                <Upload size={14} />
                <span>{isUploadingCover ? 'Uploading...' : 'Change Cover'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. MAIN EDITOR WORKSPACE (RESPONSIVE 2-COLUMN LAYOUT) */}
      <div className="itinerary-builder-grid">

        {/* LEFT / MAIN AREA */}
        <div>

          {/* DAY PICKER SELECTOR */}
          {days.length > 0 ? (
            <div style={{
              display: 'flex',
              gap: '10px',
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
                    className={`itinerary-day-tab ${isActive ? 'active' : ''}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
                      <span style={{ fontSize: '0.725rem', letterSpacing: '0.04em', fontWeight: 700, opacity: isActive ? 1 : 0.75 }}>
                        DAY {day.day_number || idx + 1}
                      </span>
                      <span style={{
                        fontSize: '0.675rem',
                        padding: '2px 7px',
                        borderRadius: '9999px',
                        fontWeight: 700,
                        background: isActive ? 'rgba(14, 165, 233, 0.35)' : 'rgba(255, 255, 255, 0.08)',
                        color: isActive ? '#38bdf8' : 'var(--text-muted)'
                      }}>
                        {countForDay}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '4px' }}>
                      {day.date || `Day ${idx + 1}`}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', color: 'var(--text-muted)', fontSize: '0.9rem', borderRadius: '16px' }}>
              No itinerary days found for this trip. Set start and end dates in trip details to create days automatically.
            </div>
          )}

          {/* DAILY ITINERARY HEADER */}
          {currentDay && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '14px',
              padding: '16px 20px',
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px'
            }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  DAY {currentDay.day_number || activeDayIndex + 1} — {currentDay.date || 'Scheduled Activities'}
                </h2>
                {currentDay.notes ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📝</span>
                    <span>{currentDay.notes}</span>
                  </p>
                ) : (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    No focus notes added for this day yet.
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  onClick={handleOpenDayNote}
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.825rem', borderRadius: '9999px' }}
                >
                  <Edit3 size={14} />
                  <span>{currentDay.notes ? 'Edit Notes' : 'Add Note'}</span>
                </button>

                <button
                  onClick={handleOpenAddModal}
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.825rem', fontWeight: 700, borderRadius: '9999px' }}
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
              <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center', borderRadius: '20px' }}>
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
                  style={{ padding: '8px 20px', fontSize: '0.875rem', borderRadius: '9999px' }}
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
                        padding: '5px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        cursor: actIndex === 0 ? 'not-allowed' : 'pointer',
                        opacity: actIndex === 0 ? 0.3 : 0.8,
                        color: '#fff',
                        transition: 'background-color 0.15s ease'
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
                        padding: '5px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        cursor: actIndex === currentDayActivities.length - 1 ? 'not-allowed' : 'pointer',
                        opacity: actIndex === currentDayActivities.length - 1 ? 0.3 : 0.8,
                        color: '#fff',
                        transition: 'background-color 0.15s ease'
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

          {/* CONTEXT-AWARE SMART RECOMMENDATIONS FOR SELECTED DAY */}
          {currentDay && (
            <div
              className="glass-panel"
              style={{
                marginTop: '32px',
                padding: '24px',
                borderRadius: '20px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'rgba(15, 23, 42, 0.7)'
              }}
            >
              {/* Header with Context Badges */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <div style={{ marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      Suggested for Day {currentDay.day_number} in {trip.destination || 'Area'}
                    </h3>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                    Real nearby attractions and activities fitting your available schedule and budget.
                  </p>
                </div>

                {/* Day Metrics */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="badge" style={{ backgroundColor: 'rgba(56, 189, 248, 0.12)', color: 'var(--accent-cyan)', border: '1px solid rgba(56, 189, 248, 0.25)', fontSize: '0.725rem', fontWeight: 600 }}>
                    <Clock size={11} /> Available Gap: ~{formatDuration(availableGapMinutes)}
                  </span>
                  {remainingBudget !== null && (
                    <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: 'var(--accent-emerald)', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '0.725rem', fontWeight: 600 }}>
                      <Coins size={11} /> Remaining: ₹{remainingBudget.toLocaleString()}
                    </span>
                  )}
                  <button
                    onClick={refreshDayRecs}
                    disabled={loadingDayRecs}
                    className="btn btn-secondary"
                    style={{ padding: '5px 12px', fontSize: '0.725rem', display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '9999px' }}
                    title="Refresh suggestions"
                  >
                    <RefreshCw size={11} className={loadingDayRecs ? 'animate-spin' : ''} />
                    <span>{loadingDayRecs ? 'Finding...' : 'Refresh'}</span>
                  </button>
                </div>
              </div>

              {/* Category Pills */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {[
                  { id: null, label: 'All' },
                  { id: 'food', label: 'Food' },
                  { id: 'culture', label: 'Culture' },
                  { id: 'nature', label: 'Nature' },
                  { id: 'hidden gems', label: 'Hidden Gems' },
                  { id: 'activities', label: 'Activities' },
                  { id: 'workshops', label: 'Workshops' },
                  { id: 'local', label: 'Local' }
                ].map(cat => (
                  <button
                    key={cat.label}
                    onClick={() => setRecCategory(cat.id)}
                    className={recCategory === cat.id ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ padding: '5px 12px', fontSize: '0.75rem', borderRadius: '9999px' }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Recommendations Cards Grid */}
              {loadingDayRecs ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {[1, 2].map(i => (
                    <div key={i} className="glass-panel" style={{ height: '360px', opacity: 0.5, animation: 'pulse 1.5s infinite', borderRadius: '16px' }} />
                  ))}
                </div>
              ) : dayRecs.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {dayRecs.map(rec => (
                    <RecommendationCard
                      key={rec.placeId || rec.id}
                      recommendation={rec}
                      onAddToItinerary={handleAddRecToDay}
                      isAdded={addedRecIds.includes(rec.placeId || rec.id)}
                    />
                  ))}
                </div>
              ) : (
                <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  No additional recommendations matched this day's constraints. Try switching categories or expanding your filters.
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT / SIDEBAR (BUDGET, DATES & TRIP DETAILS) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* 1. TRIP BUDGET PANEL */}
          <div className="glass-panel" style={{ padding: '22px', borderRadius: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Coins size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>Trip Budget</h3>
              </div>
              <button
                onClick={() => setShowBudgetModal(true)}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '9999px' }}
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
                    paddingTop: '12px',
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

          {/* 2. TRIP DATES PANEL */}
          <div className="glass-panel" style={{ padding: '22px', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>Trip Dates</h3>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={handleOpenDatesModal}
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '9999px' }}
                >
                  <Edit3 size={11} />
                  <span>Edit Dates</span>
                </button>
              )}
            </div>

            <div style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.85rem',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Calendar size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600 }}>
                  {trip?.start_date && trip?.end_date ? `${trip.start_date} — ${trip.end_date}` : 'Dates not set'}
                </div>
                {days.length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Scheduled for {days.length} {days.length === 1 ? 'day' : 'days'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. TRIP DETAILS PANEL */}
          <div className="glass-panel" style={{ padding: '22px', borderRadius: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Edit3 size={16} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>Trip Details</h3>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Trip Title</label>
              <input
                type="text"
                className="form-input"
                style={{ fontSize: '0.875rem', padding: '10px 14px', borderRadius: '10px' }}
                value={tripTitleInput}
                onChange={(e) => setTripTitleInput(e.target.value)}
                placeholder="Trip Title"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Description</label>
              <textarea
                rows={3}
                className="form-textarea"
                style={{ fontSize: '0.875rem', padding: '10px 14px', borderRadius: '10px' }}
                value={tripDescInput}
                onChange={(e) => setTripDescInput(e.target.value)}
                placeholder="Notes or description for this trip"
              />
            </div>

            <button
              onClick={handleGlobalSave}
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px', fontSize: '0.875rem', fontWeight: 700, borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Save size={16} />
              <span>{saveStatus === 'Save' ? 'Save Details' : saveStatus}</span>
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
        title="Delete activity?"
        maxWidth="440px"
      >
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '20px' }}>
            Are you sure you want to remove <strong style={{ color: 'var(--text-primary)' }}>{itemToDelete?.title}</strong> from your itinerary?
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
              {isDeletingActivity ? 'Deleting...' : 'Delete'}
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

      {/* MODAL: EDIT TRIP DATES */}
      <Modal
        isOpen={showDatesModal}
        onClose={() => {
          if (!isSavingDates) {
            setShowDatesModal(false);
            setShortenWarning(null);
            setDatesErrorMsg('');
          }
        }}
        title="Edit Trip Dates"
        maxWidth="480px"
      >
        <div>
          {datesErrorMsg && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{datesErrorMsg}</span>
            </div>
          )}

          {shortenWarning ? (
            <div>
              <div style={{
                padding: '14px 16px',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 'var(--radius-sm)',
                color: '#fde68a',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '6px' }}>
                  <AlertTriangle size={18} style={{ color: 'var(--accent-amber)' }} />
                  <span>Confirm Shortening Trip</span>
                </div>
                Changing the trip to {getDatesInRange(editStartDate, editEndDate).length} days will remove Day {shortenWarning.removedDays.map(d => d.day_number).join(', ')} from this itinerary. These days contain {shortenWarning.affectedActivitiesCount} activities. Continue?
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShortenWarning(null)}
                  className="btn btn-secondary"
                  disabled={isSavingDates}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveDates(true)}
                  className="btn"
                  style={{ backgroundColor: '#ef4444', color: '#fff', padding: '8px 18px', fontWeight: 600 }}
                  disabled={isSavingDates}
                >
                  {isSavingDates ? 'Updating...' : 'Continue'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Start Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>End Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                  />
                </div>
              </div>

              {editStartDate && editEndDate && editEndDate >= editStartDate && (
                <div style={{
                  fontSize: '0.825rem',
                  color: 'var(--accent-cyan)',
                  marginBottom: '20px',
                  padding: '8px 12px',
                  background: 'rgba(56, 189, 248, 0.08)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(56, 189, 248, 0.2)'
                }}>
                  Trip Duration: <strong>{getDatesInRange(editStartDate, editEndDate).length} Days</strong>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowDatesModal(false)}
                  className="btn btn-secondary"
                  disabled={isSavingDates}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveDates(false)}
                  className="btn btn-primary"
                  disabled={isSavingDates}
                >
                  {isSavingDates ? 'Saving Dates...' : 'Save Dates'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
};

export default ItineraryBuilder;
