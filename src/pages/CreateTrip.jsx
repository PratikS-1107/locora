import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  createTrip,
  updateTrip,
  getTripById,
  uploadTripCover,
  updateTripDatesAndItinerary,
  getPlacesAutocomplete,
  getPlaceDetails
} from '../services/api';
import { getTodayLocalDateString } from '../utils/formatters';
import {
  Sparkles,
  Calendar,
  MapPin,
  Image as ImageIcon,
  ArrowRight,
  Upload,
  X,
  CheckCircle2,
  Search,
  Loader2,
  Check
} from 'lucide-react';

const CreateTrip = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams(); // If id exists, we are in edit mode!
  const location = useLocation();

  const isEditMode = Boolean(id);
  const todayStr = getTodayLocalDateString();

  const [tripName, setTripName] = useState('');
  const [destination, setDestination] = useState('');
  const [country, setCountry] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [placeId, setPlaceId] = useState('');
  const [formattedAddress, setFormattedAddress] = useState('');
  const [destInput, setDestInput] = useState('');
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [isDestSelected, setIsDestSelected] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState(30000);
  const [description, setDescription] = useState('');
  const [coverPhoto, setCoverPhoto] = useState('');
  const [coverFile, setCoverFile] = useState(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const searchContainerRef = useRef(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced Google Places autocomplete search
  useEffect(() => {
    if (!destInput.trim() || isDestSelected) {
      setDestSuggestions([]);
      setIsSearchingDest(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingDest(true);
      try {
        const res = await getPlacesAutocomplete(destInput);
        if (res.success && Array.isArray(res.predictions)) {
          setDestSuggestions(res.predictions);
          setShowSuggestions(true);
        } else {
          setDestSuggestions([]);
        }
      } catch (err) {
        console.error('Destination autocomplete search error:', err);
        setDestSuggestions([]);
      } finally {
        setIsSearchingDest(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [destInput, isDestSelected]);

  // Load existing trip details if in Edit mode
  useEffect(() => {
    if (isEditMode && id) {
      getTripById(id).then(({ data }) => {
        if (data) {
          setTripName(data.name || data.title || '');
          const existingDest = data.destination || data.city || '';
          setDestination(existingDest);
          setDestInput(existingDest);
          setCountry(data.country || '');
          setCountryCode(data.country_code || '');
          if (existingDest) {
            setIsDestSelected(true);
          }
          setStartDate(data.start_date || '');
          setEndDate(data.end_date || '');
          if (data.budget !== undefined) setBudget(data.budget);
          setDescription(data.description || '');
          setCoverPhoto(data.cover_image || data.cover_image_url || data.coverPhoto || '');
        }
      });
    }
  }, [id, isEditMode]);

  const handleSelectPrediction = async (prediction) => {
    const destName = prediction.main_text || prediction.description;
    setDestInput(destName);
    setDestination(destName);
    setPlaceId(prediction.place_id || '');
    setFormattedAddress(prediction.description || '');
    setIsDestSelected(true);
    setShowSuggestions(false);
    setErrorMsg('');

    // Fetch place details for country, country_code, lat, lng
    if (prediction.place_id) {
      try {
        const details = await getPlaceDetails(prediction.place_id);
        if (details && details.success) {
          if (details.country) setCountry(details.country);
          if (details.country_code) setCountryCode(details.country_code);
          if (details.destination) setDestination(details.destination);
          if (details.formatted_address) setFormattedAddress(details.formatted_address);
        }
      } catch (err) {
        console.warn('Place details fetch warning:', err);
      }
    }
  };

  const handleClearDestination = () => {
    setDestination('');
    setCountry('');
    setCountryCode('');
    setPlaceId('');
    setFormattedAddress('');
    setDestInput('');
    setIsDestSelected(false);
    setDestSuggestions([]);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    setCoverFile(file);
    setIsUploading(true);
    setErrorMsg('');

    try {
      const { data, error } = await uploadTripCover(file);
      if (error) {
        setErrorMsg('Unable to upload your cover image. Please try again.');
      } else if (data) {
        setCoverPhoto(data);
      }
    } catch (err) {
      setErrorMsg('Unable to upload your cover image.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Form Validations
    if (!tripName.trim()) {
      setErrorMsg('Trip Name is required.');
      return;
    }

    if (!destination.trim() || !isDestSelected) {
      setErrorMsg('Destination is required. Please search and select a verified destination from the suggestions.');
      return;
    }

    if (!startDate || !endDate) {
      setErrorMsg('Please specify both Start Date and End Date.');
      return;
    }

    if (!isEditMode) {
      if (startDate < todayStr) {
        setErrorMsg('Start Date cannot be in the past for a new trip.');
        return;
      }
      if (endDate < todayStr) {
        setErrorMsg('End Date cannot be in the past for a new trip.');
        return;
      }
    }

    if (endDate < startDate) {
      setErrorMsg('End Date cannot be before Start Date.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode) {
        // Edit existing trip: synchronize dates & itinerary days first
        const dateRes = await updateTripDatesAndItinerary(id, startDate, endDate, true);
        if (dateRes.error) {
          setErrorMsg(dateRes.error.message || 'Unable to update trip dates.');
          setIsSubmitting(false);
          return;
        }

        const { data, error } = await updateTrip(id, {
          title: tripName.trim(),
          destination: destination.trim(),
          country: country.trim(),
          country_code: countryCode.trim(),
          budget: Number(budget) || 0,
          description: description.trim(),
          cover_image_url: coverPhoto || null
        });

        if (error) {
          setErrorMsg(error.message || 'Unable to update this trip. Please try again.');
        } else {
          setToastMsg('Trip updated successfully.');
          setTimeout(() => navigate('/my-trips'), 1200);
        }
      } else {
        // Create new trip
        if (!user?.id) {
          navigate('/login', { state: { from: '/create-trip' } });
          return;
        }

        const { data, error } = await createTrip({
          userId: user.id,
          title: tripName.trim(),
          destination: destination.trim(),
          country: country.trim(),
          country_code: countryCode.trim(),
          startDate,
          endDate,
          budget: Number(budget) || 0,
          description: description.trim(),
          coverImage: coverPhoto || null
        });

        if (error || !data) {
          setErrorMsg(error?.message || 'Unable to create this trip. Please try again.');
        } else {
          setToastMsg('Trip created successfully!');
          // Redirect straight to itinerary edit builder
          setTimeout(() => {
            navigate(`/trip/${data.id}/edit`, {
              state: { tripData: data }
            });
          }, 1000);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || (isEditMode ? 'Unable to update trip.' : 'Unable to create trip.'));
    } finally {
      setIsSubmitting(false);
    }
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
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '680px',
          margin: '0 auto',
          padding: '100px 24px 80px 24px'
        }}
      >
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

        {/* Header */}
        <div className="page-stagger-header" style={{ marginBottom: '28px', textAlign: 'center' }}>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2.2rem, 3.2vw, 2.7rem)',
              fontWeight: 900,
              margin: '0 0 8px 0',
              color: '#ffffff',
              letterSpacing: '-0.03em',
              textShadow: '0 2px 14px rgba(0, 0, 0, 0.7)'
            }}
          >
            {isEditMode ? 'Edit Trip Details' : 'Create New Trip'}
          </h1>
          <p
            style={{
              fontSize: 'clamp(0.9rem, 1.1vw, 1rem)',
              color: 'rgba(226, 232, 240, 0.8)',
              margin: 0,
              lineHeight: 1.5,
              textShadow: '0 1px 8px rgba(0, 0, 0, 0.6)'
            }}
          >
            {isEditMode
              ? 'Update your trip destination, dates, and cover photo.'
              : 'Start your custom itinerary. Add destinations and schedule activities next.'}
          </p>
        </div>

        {/* Form Card */}
        <div
          className="page-stagger-hero"
          style={{
            backgroundColor: 'rgba(14, 20, 34, 0.82)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '24px',
            padding: '36px 32px',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)'
          }}
        >
          <form onSubmit={handleSubmit}>

          {errorMsg && (
            <div style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              marginBottom: '20px',
              lineHeight: 1.5
            }}>
              {errorMsg}
            </div>
          )}

          {/* Trip Name */}
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>Trip Name *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Kyoto Zen & Culinary Explorer"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              style={{ height: '44px', fontSize: '0.9rem' }}
            />
          </div>

          {/* Destination Search with Real Google Places Autocomplete */}
          <div className="form-group" style={{ marginBottom: '18px', position: 'relative' }} ref={searchContainerRef}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Destination *</span>
              {isDestSelected && destination && (
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={12} /> Verified Location
                </span>
              )}
            </label>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'absolute', left: '12px', pointerEvents: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                {isSearchingDest ? (
                  <Loader2 size={16} className="animate-spin" style={{ color: 'var(--primary)' }} />
                ) : (
                  <Search size={16} />
                )}
              </div>

              <input
                type="text"
                required
                className="form-input"
                placeholder="Search for a city or destination"
                value={destInput}
                onChange={(e) => {
                  setDestInput(e.target.value);
                  setIsDestSelected(false);
                  setErrorMsg('');
                }}
                onFocus={() => {
                  if (destSuggestions.length > 0 && !isDestSelected) {
                    setShowSuggestions(true);
                  }
                }}
                style={{
                  height: '44px',
                  fontSize: '0.9rem',
                  paddingLeft: '38px',
                  paddingRight: isDestSelected ? '38px' : '12px',
                  borderColor: isDestSelected ? 'rgba(0, 196, 140, 0.4)' : undefined
                }}
              />

              {isDestSelected && (
                <button
                  type="button"
                  onClick={handleClearDestination}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                  title="Clear selected destination"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Selected Destination Pill */}
            {isDestSelected && destination && (
              <div style={{
                marginTop: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(0, 196, 140, 0.1)',
                border: '1px solid rgba(0, 196, 140, 0.3)',
                fontSize: '0.775rem',
                color: 'var(--accent-emerald)'
              }}>
                <MapPin size={12} />
                <span style={{ fontWeight: 600 }}>{destination}</span>
                {country && <span>· {country} {countryCode ? `(${countryCode})` : ''}</span>}
              </div>
            )}

            {/* Google Places Autocomplete Suggestions Dropdown */}
            {showSuggestions && destSuggestions.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 200,
                  marginTop: '4px',
                  backgroundColor: 'var(--bg-surface, #0f172a)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                  maxHeight: '240px',
                  overflowY: 'auto'
                }}
              >
                {destSuggestions.map((pred) => (
                  <div
                    key={pred.place_id || pred.description}
                    onClick={() => handleSelectPrediction(pred)}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <MapPin size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {pred.main_text || pred.description}
                      </div>
                      {pred.secondary_text && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {pred.secondary_text}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>Start Date *</label>
              <input
                type="date"
                required
                className="form-input"
                min={isEditMode ? undefined : todayStr}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ height: '44px', fontSize: '0.85rem' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>End Date *</label>
              <input
                type="date"
                required
                className="form-input"
                min={startDate || (isEditMode ? undefined : todayStr)}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ height: '44px', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Planned Budget */}
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>Planned Budget (₹)</label>
            <input
              type="number"
              min="0"
              step="500"
              className="form-input"
              placeholder="e.g. 50000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              style={{ height: '44px', fontSize: '0.85rem' }}
            />
          </div>

          {/* Description */}
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>Description (Optional)</label>
            <textarea
              rows={3}
              className="form-textarea"
              placeholder="Describe your travel vibe, main goals, or key neighborhoods..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ fontSize: '0.875rem' }}
            />
          </div>

          {/* Cover Photo Upload / URL */}
          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>Cover Photo (Optional)</label>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
              <label className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem', cursor: 'pointer' }}>
                <Upload size={14} />
                <span>{isUploading ? 'Uploading...' : 'Upload Image File'}</span>
                <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              </label>

              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OR enter image URL below</span>
            </div>

            <input
              type="url"
              className="form-input"
              placeholder="https://images.unsplash.com/..."
              value={coverPhoto}
              onChange={(e) => setCoverPhoto(e.target.value)}
              style={{ height: '42px', fontSize: '0.85rem' }}
            />

            {coverPhoto && (
              <div style={{ marginTop: '10px', height: '110px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', position: 'relative' }}>
                <img src={coverPhoto} alt="Cover Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => setCoverPhoto('')}
                  style={{
                    position: 'absolute', top: '6px', right: '6px',
                    background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff',
                    borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'flex-end', marginTop: '28px' }}>
            <button
              type="button"
              onClick={() => navigate('/my-trips')}
              style={{
                padding: '12px 24px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              style={{
                padding: '12px 28px',
                borderRadius: '9999px',
                background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: isSubmitting || isUploading ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || isUploading ? 0.7 : 1,
                boxShadow: '0 8px 24px rgba(14, 165, 233, 0.35)'
              }}
            >
              <span>
                {isSubmitting
                  ? (isEditMode ? 'Saving Changes...' : 'Creating Trip...')
                  : (isEditMode ? 'Save Changes' : 'Start Planning')}
              </span>
              {!isSubmitting && <ArrowRight size={16} />}
            </button>
          </div>

        </form>

      </div>
      </div>
    </div>
  );
};

export default CreateTrip;
