import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  createTrip,
  updateTrip,
  getTripById,
  uploadTripCover,
  updateTripDatesAndItinerary
} from '../services/api';
import { getTodayLocalDateString } from '../utils/formatters';
import {
  getAllCountries,
  getStatesForCountry,
  getCitiesForState,
  getAdminTerminology,
  formatStructuredDestination,
  getCountryByCodeOrName
} from '../utils/geographicHierarchy';
import CustomDropdown from '../components/CustomDropdown';
import {
  ArrowRight,
  Upload,
  X,
  CheckCircle2,
  Globe,
  MapPin,
  Navigation,
  ChevronRight
} from 'lucide-react';

const CreateTrip = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams(); // If id exists, we are in edit mode!

  const isEditMode = Boolean(id);
  const todayStr = getTodayLocalDateString();

  const [tripName, setTripName] = useState('');
  const [destination, setDestination] = useState('');

  // Structured Geographic Hierarchy state
  const [selectedCountry, setSelectedCountry] = useState(null); // { value, label, code, name }
  const [selectedState, setSelectedState] = useState(null); // { value, label, code, name }
  const [selectedCity, setSelectedCity] = useState(null); // { value, label, name, latitude, longitude }
  const [selectedCoords, setSelectedCoords] = useState(null); // { latitude, longitude }

  // Preserved state variables per downstream compatibility requirements
  // eslint-disable-next-line no-unused-vars
  const [placeId, setPlaceId] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [formattedAddress, setFormattedAddress] = useState('');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState(30000);
  const [description, setDescription] = useState('');
  const [coverPhoto, setCoverPhoto] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [coverFile, setCoverFile] = useState(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // 1. Memoized list of all worldwide countries
  const countryOptions = useMemo(() => {
    return getAllCountries();
  }, []);

  // 2. Memoized list of first-level administrative regions for selected country
  const stateOptions = useMemo(() => {
    if (!selectedCountry?.code) return [];
    return getStatesForCountry(selectedCountry.code);
  }, [selectedCountry]);

  // 3. Memoized list of second-level administrative localities for selected region
  const cityOptions = useMemo(() => {
    if (!selectedCountry?.code || !selectedState) return [];
    return getCitiesForState(selectedCountry.code, selectedState.code || selectedState.value, selectedState.name);
  }, [selectedCountry, selectedState]);

  // 4. Adaptive administrative terminology based on country
  const adminLabels = useMemo(() => {
    return getAdminTerminology(selectedCountry?.code);
  }, [selectedCountry]);

  // Cascading Selection Handler 1: Country Selection
  const handleSelectCountry = (isoCode) => {
    const found = countryOptions.find((c) => c.value === isoCode || c.code === isoCode);
    if (!found) return;

    // Requirement 16: Changing country clears previously selected state and district
    setSelectedCountry(found);
    setSelectedState(null);
    setSelectedCity(null);
    setSelectedCoords(null);
    setDestination('');
    setFormattedAddress('');
    setPlaceId('');
    setErrorMsg('');
  };

  // Cascading Selection Handler 2: State / Region Selection
  const handleSelectState = (stateVal) => {
    if (!selectedCountry) return;
    const found = stateOptions.find((s) => s.value === stateVal || s.code === stateVal || s.name === stateVal);
    if (!found) return;

    // Requirement 17: Changing state clears previously selected district
    setSelectedState(found);
    setSelectedCity(null);
    setSelectedCoords(null);
    setDestination('');
    setFormattedAddress('');
    setErrorMsg('');
  };

  // Cascading Selection Handler 3: District / Locality Selection
  const handleSelectCity = (cityName) => {
    if (!selectedCountry || !selectedState) return;
    const found = cityOptions.find((c) => c.value === cityName || c.name === cityName);
    const cityObj = found || { name: cityName };

    setSelectedCity(cityObj);

    const lat = Number(cityObj.latitude ?? selectedState.latitude ?? selectedCountry.latitude);
    const lng = Number(cityObj.longitude ?? selectedState.longitude ?? selectedCountry.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setSelectedCoords({ latitude: lat, longitude: lng });
    }

    // Format authoritative destination name: e.g. "Thane, Maharashtra, India"
    const formatted = formatStructuredDestination(
      cityObj.name,
      selectedState.name,
      selectedCountry.name
    );
    setDestination(formatted);
    setFormattedAddress(formatted);
    setErrorMsg('');
  };

  // Load existing trip details if in Edit mode and pre-populate hierarchy
  useEffect(() => {
    if (isEditMode && id) {
      getTripById(id).then(({ data }) => {
        if (data) {
          setTripName(data.name || data.title || '');
          const existingDest = data.destination || data.city || '';
          setDestination(existingDest);
          setFormattedAddress(existingDest);
          setStartDate(data.start_date || '');
          setEndDate(data.end_date || '');
          if (data.budget !== undefined) setBudget(data.budget);
          setDescription(data.description || '');
          setCoverPhoto(data.cover_image || data.cover_image_url || data.coverPhoto || '');

          // Attempt to pre-populate geographic hierarchy from existing trip details
          const cCode = data.country_code || data.countryCode;
          const countryMatch = getCountryByCodeOrName(cCode || data.country);
          if (countryMatch) {
            const countryItem = {
              value: countryMatch.isoCode,
              label: countryMatch.name,
              code: countryMatch.isoCode,
              name: countryMatch.name,
              latitude: countryMatch.latitude ? Number(countryMatch.latitude) : null,
              longitude: countryMatch.longitude ? Number(countryMatch.longitude) : null
            };
            setSelectedCountry(countryItem);

            const states = getStatesForCountry(countryMatch.isoCode);
            const parts = existingDest.split(',').map((s) => s.trim()).filter(Boolean);
            let stateMatch = null;
            let cityMatchName = null;

            if (parts.length >= 3) {
              cityMatchName = parts[0];
              const stateQuery = parts[1].toLowerCase();
              stateMatch = states.find((s) => s.name.toLowerCase() === stateQuery || stateQuery.includes(s.name.toLowerCase()));
            } else if (parts.length === 2) {
              cityMatchName = parts[0];
              stateMatch = states.find((s) => s.name.toLowerCase() === parts[0].toLowerCase());
            }

            if (stateMatch) {
              setSelectedState(stateMatch);
              if (cityMatchName) {
                const cities = getCitiesForState(countryMatch.isoCode, stateMatch.code || stateMatch.value, stateMatch.name);
                const cityMatch = cities.find((c) => c.name.toLowerCase() === cityMatchName.toLowerCase());
                if (cityMatch) {
                  setSelectedCity(cityMatch);
                  const lat = Number(cityMatch.latitude ?? stateMatch.latitude ?? countryMatch.latitude);
                  const lng = Number(cityMatch.longitude ?? stateMatch.longitude ?? countryMatch.longitude);
                  if (Number.isFinite(lat) && Number.isFinite(lng)) {
                    setSelectedCoords({ latitude: lat, longitude: lng });
                  }
                } else {
                  setSelectedCity({ name: cityMatchName, value: cityMatchName, label: cityMatchName });
                }
              }
            }
          }
        }
      });
    }
  }, [id, isEditMode]);

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
    } catch {
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

    if (!selectedCountry) {
      setErrorMsg('Country selection is required. Please select a country first.');
      return;
    }

    if (!selectedState) {
      setErrorMsg(`Please select a ${adminLabels.level1.toLowerCase()}.`);
      return;
    }

    if (!selectedCity || !destination.trim()) {
      setErrorMsg(`Please select a ${adminLabels.level2.toLowerCase()}.`);
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

        const { error } = await updateTrip(id, {
          title: tripName.trim(),
          destination: destination.trim(),
          country: selectedCountry.name.trim(),
          country_code: selectedCountry.code.trim(),
          state: selectedState?.name?.trim() || '',
          state_code: selectedState?.code?.trim() || '',
          city: selectedCity?.name?.trim() || '',
          latitude: selectedCoords?.latitude ?? null,
          longitude: selectedCoords?.longitude ?? null,
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
          country: selectedCountry.name.trim(),
          country_code: selectedCountry.code.trim(),
          state: selectedState?.name?.trim() || '',
          state_code: selectedState?.code?.trim() || '',
          city: selectedCity?.name?.trim() || '',
          latitude: selectedCoords?.latitude ?? null,
          longitude: selectedCoords?.longitude ?? null,
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

          {/* Dependent Geographic Hierarchy Destination Selection */}
          <div
            className="form-group"
            style={{
              marginBottom: '20px',
              padding: '18px 20px',
              borderRadius: '16px',
              backgroundColor: 'rgba(11, 16, 28, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '6px' }}>
              <label className="form-label" style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: '#ffffff' }}>
                Destination Hierarchy *
              </label>
              <div style={{
                fontSize: '0.72rem',
                color: 'rgba(226, 232, 240, 0.6)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{ color: selectedCountry ? '#38bdf8' : 'inherit', fontWeight: selectedCountry ? 600 : 400 }}>Country</span>
                <ChevronRight size={11} style={{ opacity: 0.5 }} />
                <span style={{ color: selectedState ? '#38bdf8' : 'inherit', fontWeight: selectedState ? 600 : 400 }}>{adminLabels.level1}</span>
                <ChevronRight size={11} style={{ opacity: 0.5 }} />
                <span style={{ color: selectedCity ? '#34d399' : 'inherit', fontWeight: selectedCity ? 600 : 400 }}>{adminLabels.level2}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Level 1: Country Selection */}
              <div>
                <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'rgba(226, 232, 240, 0.85)', marginBottom: '6px' }}>
                  1. Country *
                </div>
                <CustomDropdown
                  value={selectedCountry?.value || ''}
                  onChange={handleSelectCountry}
                  options={countryOptions}
                  placeholder="Select a country..."
                  icon={<Globe size={16} style={{ color: 'var(--accent-cyan, #38bdf8)' }} />}
                  pill={false}
                  fullWidth={true}
                  align="left"
                  searchable={true}
                  searchPlaceholder="Search countries (e.g. India, Japan, United States)..."
                  emptyMessage="No countries found"
                  buttonStyle={{
                    height: '44px',
                    borderRadius: 'var(--radius-md, 12px)',
                    backgroundColor: 'var(--bg-card, rgba(20, 26, 38, 0.72))',
                    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    color: selectedCountry ? '#ffffff' : 'rgba(255, 255, 255, 0.45)'
                  }}
                  menuStyle={{
                    maxHeight: '300px',
                    width: '100%',
                    maxWidth: '100%'
                  }}
                />
              </div>

              {/* Level 2: State / Province / Region Selection (Disabled until country is chosen) */}
              <div>
                <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'rgba(226, 232, 240, 0.85)', marginBottom: '6px' }}>
                  2. {adminLabels.level1} *
                  {!selectedCountry && (
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.4)', marginLeft: '6px', fontWeight: 400 }}>
                      (Disabled · Select Country First)
                    </span>
                  )}
                </div>
                <CustomDropdown
                  value={selectedState?.value || ''}
                  onChange={handleSelectState}
                  options={stateOptions}
                  disabled={!selectedCountry}
                  placeholder={selectedCountry ? adminLabels.level1Placeholder : 'Disabled — select a country first'}
                  icon={<MapPin size={16} style={{ color: selectedCountry ? '#38bdf8' : 'rgba(255, 255, 255, 0.3)' }} />}
                  pill={false}
                  fullWidth={true}
                  align="left"
                  searchable={true}
                  searchPlaceholder={selectedCountry ? `Search ${adminLabels.level1.toLowerCase()}...` : 'Disabled'}
                  emptyMessage={`No ${adminLabels.level1.toLowerCase()} found`}
                  buttonStyle={{
                    height: '44px',
                    borderRadius: 'var(--radius-md, 12px)',
                    backgroundColor: 'var(--bg-card, rgba(20, 26, 38, 0.72))',
                    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    color: selectedState ? '#ffffff' : 'rgba(255, 255, 255, 0.45)'
                  }}
                  menuStyle={{
                    maxHeight: '300px',
                    width: '100%',
                    maxWidth: '100%'
                  }}
                />
              </div>

              {/* Level 3: District / County / Locality Selection (Disabled until state is chosen) */}
              <div>
                <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'rgba(226, 232, 240, 0.85)', marginBottom: '6px' }}>
                  3. {adminLabels.level2} *
                  {(!selectedCountry || !selectedState) && (
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.4)', marginLeft: '6px', fontWeight: 400 }}>
                      (Disabled · Select {selectedCountry ? adminLabels.level1 : 'Country'} First)
                    </span>
                  )}
                </div>
                <CustomDropdown
                  value={selectedCity?.value || ''}
                  onChange={handleSelectCity}
                  options={cityOptions}
                  disabled={!selectedCountry || !selectedState}
                  placeholder={selectedState ? adminLabels.level2Placeholder : `Disabled — select a ${adminLabels.level1.toLowerCase()} first`}
                  icon={<Navigation size={16} style={{ color: selectedState ? '#34d399' : 'rgba(255, 255, 255, 0.3)' }} />}
                  pill={false}
                  fullWidth={true}
                  align="left"
                  searchable={true}
                  searchPlaceholder={selectedState ? `Search ${adminLabels.level2.toLowerCase()}...` : 'Disabled'}
                  emptyMessage={`No ${adminLabels.level2.toLowerCase()} found`}
                  buttonStyle={{
                    height: '44px',
                    borderRadius: 'var(--radius-md, 12px)',
                    backgroundColor: 'var(--bg-card, rgba(20, 26, 38, 0.72))',
                    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    color: selectedCity ? '#ffffff' : 'rgba(255, 255, 255, 0.45)'
                  }}
                  menuStyle={{
                    maxHeight: '300px',
                    width: '100%',
                    maxWidth: '100%'
                  }}
                />
              </div>
            </div>

            {/* Authoritative Structured Destination Summary Badge */}
            {destination && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(14, 165, 233, 0.08)',
                  border: '1px solid rgba(14, 165, 233, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <CheckCircle2 size={18} style={{ color: '#38bdf8', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(226, 232, 240, 0.65)', fontWeight: 700 }}>
                      Authoritative Destination
                    </div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {destination}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#38bdf8', marginTop: '2px' }}>
                      {selectedCountry?.name} ({selectedCountry?.code}) · {selectedState?.name} {selectedState?.code && `(${selectedState.code})`} · {selectedCity?.name}
                      {selectedCoords && ` · ${selectedCoords.latitude.toFixed(4)}°, ${selectedCoords.longitude.toFixed(4)}°`}
                    </div>
                  </div>
                </div>
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
