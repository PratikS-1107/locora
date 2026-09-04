import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createTrip, updateTrip, getTripById, uploadTripCover } from '../services/api';
import { Sparkles, Calendar, MapPin, Image as ImageIcon, ArrowRight, Upload, X, CheckCircle2 } from 'lucide-react';

const CreateTrip = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams(); // If id exists, we are in edit mode!
  const location = useLocation();

  const isEditMode = Boolean(id);

  const [tripName, setTripName] = useState('');
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

  // Load existing trip details if in Edit mode
  useEffect(() => {
    if (isEditMode && id) {
      getTripById(id).then(({ data }) => {
        if (data) {
          setTripName(data.name || data.title || '');
          setStartDate(data.start_date || '');
          setEndDate(data.end_date || '');
          if (data.budget !== undefined) setBudget(data.budget);
          setDescription(data.description || '');
          setCoverPhoto(data.cover_image || data.cover_image_url || data.coverPhoto || '');
        }
      });
    }
  }, [id, isEditMode]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
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

    // Validation
    if (!tripName.trim()) {
      setErrorMsg('Trip Name is required.');
      return;
    }

    if (!startDate || !endDate) {
      setErrorMsg('Please specify both Start Date and End Date.');
      return;
    }

    if (endDate < startDate) {
      setErrorMsg('End Date cannot be before Start Date.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode) {
        // Edit existing trip
        const { data, error } = await updateTrip(id, {
          title: tripName,
          start_date: startDate,
          end_date: endDate,
          budget: Number(budget) || 0,
          description,
          cover_image_url: coverPhoto || null
        });

        if (error) {
          setErrorMsg('Unable to update this trip. Please try again.');
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
          title: tripName,
          startDate,
          endDate,
          budget: Number(budget) || 0,
          description,
          coverImage: coverPhoto || null
        });

        if (error || !data) {
          setErrorMsg('Unable to create this trip. Please try again.');
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
      setErrorMsg(isEditMode ? 'Unable to update trip.' : 'Unable to create trip.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '640px', margin: '0 auto', paddingBottom: '60px' }}>

      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
          backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--accent-emerald)',
          borderRadius: 'var(--radius-md)', padding: '14px 20px', color: '#fff',
          boxShadow: 'var(--shadow-lg)', backdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <CheckCircle2 size={18} style={{ color: 'var(--accent-emerald)' }} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          {isEditMode ? 'Edit Trip Details' : 'Create New Trip'}
        </h1>
        <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
          {isEditMode ? 'Update your trip destination, dates, and cover.' : 'Start your custom itinerary. Add destinations and schedule activities next.'}
        </p>
      </div>

      {/* Form Card */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <form onSubmit={handleSubmit}>

          {errorMsg && (
            <div style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              marginBottom: '20px'
            }}>
              {errorMsg}
            </div>
          )}

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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>Start Date *</label>
              <input
                type="date"
                required
                className="form-input"
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
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ height: '44px', fontSize: '0.85rem' }}
              />
            </div>
          </div>

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
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => navigate('/my-trips')}
              className="btn btn-secondary"
              style={{ padding: '10px 20px', fontSize: '0.9rem' }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="btn btn-primary"
              style={{ padding: '10px 24px', fontSize: '0.9rem', borderRadius: 'var(--radius-sm)' }}
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
  );
};

export default CreateTrip;
