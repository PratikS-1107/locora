import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Compass, Sparkles, AlertCircle, Coins } from 'lucide-react';

const getDefaultStartDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

const calculateEndDate = (startStr, daysCount) => {
  if (!startStr) return '';
  const d = new Date(startStr);
  const days = Math.max(1, Number(daysCount) || 5);
  d.setDate(d.getDate() + (days - 1));
  return d.toISOString().split('T')[0];
};

const getTemplateDefaultBudget = (template) => {
  if (!template) return 30000;
  if (template.budget && !isNaN(Number(template.budget))) {
    return Number(template.budget);
  }
  if (template.price && !isNaN(Number(template.price))) {
    return Number(template.price);
  }
  if (template.days && Array.isArray(template.days)) {
    const actSum = template.days.reduce((dSum, d) => {
      const dayActs = d.activities || [];
      return dSum + dayActs.reduce((aSum, a) => aSum + (Number(a.estimated_cost ?? a.cost) || 0), 0);
    }, 0);
    if (actSum > 0) return actSum + 15000; // estimated activities + stay/travel
  }
  return 30000;
};

const ConvertTemplateModal = ({
  isOpen,
  onClose,
  templateTrip,
  onConfirm,
  isSubmitting = false
}) => {
  const templateDays = templateTrip?.days_count || (templateTrip?.days ? templateTrip.days.length : 5);

  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(calculateEndDate(getDefaultStartDate(), templateDays));
  const [budget, setBudget] = useState(getTemplateDefaultBudget(templateTrip));
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && templateTrip) {
      const start = getDefaultStartDate();
      setStartDate(start);
      setEndDate(calculateEndDate(start, templateDays));
      setBudget(getTemplateDefaultBudget(templateTrip));
      setError('');
    }
  }, [isOpen, templateTrip, templateDays]);

  const title = templateTrip?.title || templateTrip?.name || 'Ready-Made Itinerary';
  const destination = templateTrip?.destination || templateTrip?.location?.city || 'Travel Destination';
  const coverImage = templateTrip?.cover_image_url || templateTrip?.cover_image || templateTrip?.image || 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80';

  const handleStartDateChange = (e) => {
    const newStart = e.target.value;
    setStartDate(newStart);
    setError('');
    if (newStart) {
      setEndDate(calculateEndDate(newStart, templateDays));
    }
  };

  const handleEndDateChange = (e) => {
    const newEnd = e.target.value;
    setEndDate(newEnd);
    setError('');
  };

  const handleBudgetChange = (e) => {
    setBudget(e.target.value);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setError('Please choose both start and end dates.');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError('End date cannot be earlier than start date.');
      return;
    }

    const numBudget = Number(budget);
    if (isNaN(numBudget) || numBudget < 0) {
      setError('Please enter a valid trip budget (numbers only).');
      return;
    }

    onConfirm(templateTrip, {
      startDate,
      endDate,
      budget: numBudget
    });
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <Modal
      isOpen={Boolean(isOpen && templateTrip)}
      onClose={onClose}
      title="Create Your Trip"
      maxWidth="500px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Subtitle */}
        <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
          Set your travel dates and budget. Your curated itinerary and activities will be added automatically.
        </p>

        {/* Template Overview Card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '12px',
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <img
            src={coverImage}
            alt={title}
            style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 4px 0', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {title}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: '#94a3b8' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Compass size={12} style={{ color: '#00c48c' }} />
                <span>{destination}</span>
              </span>
              <span>•</span>
              <span style={{ color: '#00c48c', fontWeight: 600 }}>
                {templateDays} Days
              </span>
            </div>
          </div>
        </div>

        {/* Date Selection Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
              Start Date
            </label>
            <input
              type="date"
              className="form-input"
              value={startDate}
              min={todayStr}
              onChange={handleStartDateChange}
              required
              disabled={isSubmitting}
              style={{ background: 'rgba(15, 23, 42, 0.6)' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
              End Date
            </label>
            <input
              type="date"
              className="form-input"
              value={endDate}
              min={startDate || todayStr}
              onChange={handleEndDateChange}
              required
              disabled={isSubmitting}
              style={{ background: 'rgba(15, 23, 42, 0.6)' }}
            />
          </div>
        </div>

        {/* Budget Input */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Coins size={14} style={{ color: '#00c48c' }} />
            <span>Trip Planned Budget (₹)</span>
          </label>
          <input
            type="number"
            className="form-input"
            value={budget}
            min={0}
            step={500}
            placeholder="e.g. 50000"
            onChange={handleBudgetChange}
            required
            disabled={isSubmitting}
            style={{ background: 'rgba(15, 23, 42, 0.6)' }}
          />
        </div>

        {/* Helper Note */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          borderRadius: '8px',
          background: 'rgba(0, 196, 140, 0.08)',
          border: '1px solid rgba(0, 196, 140, 0.2)',
          fontSize: '0.8rem',
          color: '#00c48c'
        }}>
          <Sparkles size={14} style={{ flexShrink: 0 }} />
          <span>
            Your itinerary days and activities will be copied and dated automatically.
          </span>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            fontSize: '0.825rem',
            color: '#fca5a5'
          }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={isSubmitting}
            style={{ padding: '9px 18px', fontSize: '0.85rem' }}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{ padding: '9px 20px', fontSize: '0.85rem', fontWeight: 700 }}
          >
            {isSubmitting ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '14px', height: '14px', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span>Creating your trip...</span>
              </div>
            ) : (
              <span>Create Trip</span>
            )}
          </button>
        </div>

      </form>
    </Modal>
  );
};

export default ConvertTemplateModal;
