import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { evaluateUserAchievements, deleteUserAccount, uploadProfileAvatar, apiGetUserProfile } from '../services/api';
import AchievementCard from '../components/AchievementCard';
import CountryAchievementModal from '../components/CountryAchievementModal';
import CheckInModal from '../components/CheckInModal';
import Modal from '../components/Modal';
import {
  User,
  Edit3,
  Award,
  Globe,
  MapPin,
  Mail,
  Lock,
  LogOut,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Camera,
  Compass,
  Check,
  Navigation
} from 'lucide-react';

const Profile = () => {
  const { user, logout, updateUserProfile, updateUserPassword, updateUserEmail } = useAuth();
  const navigate = useNavigate();

  // Profile Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [emailNotice, setEmailNotice] = useState('');

  // Achievements State
  const [achievementsData, setAchievementsData] = useState({
    allAchievements: [],
    unlockedList: [],
    lockedList: [],
    countryProgress: [],
    stats: { unlockedCount: 0, countriesVisited: 0, tripsCompleted: 0 }
  });
  const [statusFilter, setStatusFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  // Selected Country for Country Explorer Modal
  const [selectedCountryStat, setSelectedCountryStat] = useState(null);

  // Check In Modal State
  const [showCheckInModal, setShowCheckInModal] = useState(false);

  // Real-time Unlock Celebration Toast State
  const [celebrationToast, setCelebrationToast] = useState(null);

  // Selected Achievement Detail Modal
  const [selectedAchievement, setSelectedAchievement] = useState(null);

  // Danger Zone Confirmations
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Populate user data & calculate achievements
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const loadProfileAndAchievements = async () => {
      setLoading(true);
      try {
        let dbProfile = null;
        if (user.id) {
          dbProfile = await apiGetUserProfile(user.id);
        }

        const meta = user.user_metadata || {};
        const sourceData = dbProfile || meta;
        const fullName = meta.full_name || sourceData.full_name || `${meta.first_name || ''} ${meta.last_name || ''}`.trim() || 'Traveler';
        const parts = fullName.split(' ');
        setFirstName(meta.first_name || parts[0] || 'Traveler');
        setLastName(meta.last_name || parts.slice(1).join(' ') || '');
        setEmail(user.email || sourceData.email || '');
        setAvatarUrl(sourceData.avatar_url || meta.avatar_url || user.avatar_url || '');
        setBio(meta.bio || sourceData.bio || 'Passionate slow traveler & culture enthusiast. Discovering hidden alleyways across the globe.');

        const res = await evaluateUserAchievements(user.id);
        setAchievementsData(res);
      } catch (err) {
        console.error('Error loading profile/achievements:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfileAndAchievements();
  }, [user, navigate]);

  // Handle Edit Profile Save
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setStatusMsg('');
    setEmailNotice('');

    if (newPassword && newPassword !== confirmPassword) {
      setStatusMsg('Passwords do not match.');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setStatusMsg('Password must be at least 6 characters.');
      return;
    }

    setIsSaving(true);

    try {
      let persistentAvatarUrl = avatarUrl;

      // 1. If a new image file is selected, upload to Supabase Storage
      if (selectedImageFile && user?.id) {
        setStatusMsg('Uploading image to Supabase Storage...');
        const { publicUrl, error: uploadErr } = await uploadProfileAvatar(user.id, selectedImageFile);
        if (uploadErr || !publicUrl) {
          console.error('Avatar upload failed:', uploadErr);
          const detail = uploadErr?.message || 'Failed to upload profile image.';
          setStatusMsg(`Image upload failed: ${detail}`);
          setIsSaving(false);
          return;
        }
        persistentAvatarUrl = publicUrl;
      }

      const fullName = `${firstName} ${lastName}`.trim();

      // 2. Update user's profile row in public.profiles
      setStatusMsg('Saving profile details...');
      const updateRes = await updateUserProfile({
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
        avatar_url: persistentAvatarUrl,
        bio
      });

      if (updateRes?.error) {
        console.error('Profile update failed:', updateRes.error);
        const detail = updateRes.error.message || 'Failed to update profile record.';
        setStatusMsg(`Database update error: ${detail}`);
        setIsSaving(false);
        return;
      }

      // Update email if changed
      if (email && email !== user?.email) {
        const emailRes = await updateUserEmail(email);
        if (!emailRes.error) {
          setEmailNotice('Check your new email address to confirm this change.');
        }
      }

      // Update password if specified
      if (newPassword) {
        await updateUserPassword(newPassword);
      }

      // Clean up local preview object URL
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
      }
      setSelectedImageFile(null);
      setAvatarUrl(persistentAvatarUrl);

      setStatusMsg('Profile updated successfully!');
      setTimeout(() => {
        setIsEditModalOpen(false);
        setStatusMsg('');
      }, 1200);
    } catch (err) {
      console.error('Profile update caught error:', err);
      setStatusMsg(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Profile Image File Select (Local Preview)
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setStatusMsg('File size exceeds 5MB limit.');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setStatusMsg('Supported formats: JPG, PNG, WEBP');
      return;
    }

    setSelectedImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  };

  const handleCloseEditModal = () => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
    }
    setSelectedImageFile(null);
    setStatusMsg('');
    setEmailNotice('');
    setIsEditModalOpen(false);
  };

  // Handle Log Out
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Handle Delete Account
  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm account deletion.');
      return;
    }

    try {
      await deleteUserAccount(user.id);
      await logout();
      navigate('/');
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete account.');
    }
  };

  // Instant Check-In Success Callback
  const handleCheckinSuccess = (result) => {
    if (result.evaluation) {
      setAchievementsData(result.evaluation);
    }
    if (result.newUnlocks && result.newUnlocks.length > 0) {
      // Trigger celebration moment for newly earned badge
      setCelebrationToast(result.newUnlocks[0]);
      setTimeout(() => {
        setCelebrationToast(null);
      }, 6000);
    }
  };

  // Filter achievements
  const displayedAchievements = achievementsData.allAchievements.filter(item => {
    // Status Filter
    if (statusFilter === 'Unlocked' && !item.isUnlocked) return false;
    if (statusFilter === 'Locked' && item.isUnlocked) return false;

    // Country Filter
    if (countryFilter !== 'All' && item.country !== countryFilter) return false;

    return true;
  });

  return (
    <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '36px', paddingBottom: '60px' }}>

      {/* CELEBRATION UNLOCK TOAST */}
      {celebrationToast && (
        <div style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          zIndex: 2000,
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.98) 100%)',
          border: '2px solid var(--accent-amber)',
          borderRadius: 'var(--radius-md)',
          padding: '18px 24px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(245, 158, 11, 0.3)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          maxWidth: '420px',
          animation: 'slideUp 0.4s ease-out'
        }}>
          <div style={{
            fontSize: '2.4rem',
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {celebrationToast.icon || '🏆'}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--accent-amber)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Sparkles size={14} />
              <span>Achievement Unlocked!</span>
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: '2px 0 4px 0' }}>
              {celebrationToast.name}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {celebrationToast.description}
            </div>
          </div>
        </div>
      )}

      {/* 1. PROFILE HEADER */}
      <div className="glass-panel" style={{ padding: '28px', position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-lg)' }}>
        <div style={{
          position: 'absolute', top: 0, right: 0, width: '220px', height: '100%',
          background: 'radial-gradient(circle at top right, rgba(59, 130, 246, 0.1), transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* Avatar with subtle Ring Border & Initial Fallback */}
          <div style={{ position: 'relative' }}>
            {Boolean(avatarUrl && avatarUrl.trim()) ? (
              <img
                src={avatarUrl}
                alt={`${firstName} ${lastName}`}
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--primary)',
                  boxShadow: 'var(--shadow-md)'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  const fallback = e.target.nextSibling;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                border: '2px solid var(--primary)',
                boxShadow: 'var(--shadow-md)',
                display: Boolean(avatarUrl && avatarUrl.trim()) ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.2rem',
                fontWeight: 800,
                color: '#ffffff',
                textTransform: 'uppercase'
              }}
            >
              {firstName?.[0] || 'T'}
            </div>
          </div>

          {/* User Details */}
          <div style={{ flex: 1, minWidth: '260px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  {firstName} {lastName}
                </h1>
              </div>

              <button
                onClick={() => setIsEditModalOpen(true)}
                className="btn btn-secondary"
                style={{ padding: '7px 14px', fontSize: '0.825rem' }}
              >
                <Edit3 size={14} />
                <span>Edit Profile</span>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Mail size={13} style={{ color: 'var(--text-muted)' }} />
                <span>{user?.email || email}</span>
              </div>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.55, margin: 0, maxWidth: '640px' }}>
              "{bio}"
            </p>
          </div>

        </div>
      </div>

      {/* 2. TRAVEL ACHIEVEMENTS */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Award size={24} style={{ color: 'var(--accent-amber)' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Travel Achievements
              </h2>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              You've unlocked {achievementsData.stats.unlockedCount} badges based on verified travel activity.
            </p>
          </div>

          {/* Action & Filter Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowCheckInModal(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700 }}
            >
              <Navigation size={16} />
              <span>Verify Visit / Check In</span>
            </button>

            {/* Status Filter */}
            <div className="tab-group" style={{ padding: '3px' }}>
              {['All', 'Unlocked', 'Locked'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`tab-item ${statusFilter === st ? 'active' : ''}`}
                  style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Country Filter (Includes France) */}
            <select
              className="form-select"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              style={{ height: '36px', padding: '0 12px', fontSize: '0.8rem', minWidth: '130px' }}
            >
              <option value="All">All Regions</option>
              <option value="India">India</option>
              <option value="United States">USA</option>
              <option value="Japan">Japan</option>
              <option value="France">France</option>
              <option value="Global">Global</option>
            </select>
          </div>
        </div>

        {/* Achievement Cards Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="glass-panel" style={{ height: '180px', opacity: 0.5 }} />
            ))}
          </div>
        ) : displayedAchievements.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {displayedAchievements.map(item => (
              <AchievementCard
                key={item.id}
                achievement={item}
                onClick={() => setSelectedAchievement(item)}
              />
            ))}
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No achievements match the selected filter.
          </div>
        )}
      </div>

      {/* 3. COUNTRY PROGRESS */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Country Achievement Progress
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Click any country to view passport details
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '18px' }}>
          {achievementsData.countryProgress.map(cp => (
            <div
              key={cp.country}
              onClick={() => setSelectedCountryStat(cp)}
              className="glass-panel-interactive"
              style={{ padding: '20px', cursor: 'pointer', border: '1px solid var(--border-subtle)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.6rem' }}>{cp.flag}</span>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{cp.country}</span>
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                  {cp.unlockedCount} / {cp.totalCount}
                </span>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                {cp.unlockedCount} of {cp.totalCount} achievements unlocked ({cp.unlockedPercentage}%)
              </div>

              <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.max(4, cp.unlockedPercentage)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)',
                  borderRadius: '3px'
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. COMPACT TRAVEL MILESTONES */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
          Travel Milestones
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <Globe size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {achievementsData.stats.countriesVisited}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Countries Visited</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-emerald)' }}>
              <Compass size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {achievementsData.stats.tripsCompleted}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Trips Completed</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-amber)' }}>
              <Award size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {achievementsData.stats.unlockedCount}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Achievements Unlocked</div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. DANGER ZONE */}
      <div className="glass-panel" style={{ padding: '24px', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: '#fca5a5' }}>
          Account & Danger Zone
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Manage your session or permanently remove your Locora account.
        </p>

        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '0.85rem' }}
          >
            <LogOut size={16} />
            <span>Log Out</span>
          </button>

          <button
            onClick={() => {
              setDeleteInput('');
              setDeleteError('');
              setShowDeleteConfirm(true);
            }}
            className="btn btn-danger"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '0.85rem' }}
          >
            <Trash2 size={16} />
            <span>Delete Account</span>
          </button>
        </div>
      </div>

      {/* MODAL: EDIT PROFILE */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        title="Edit Profile"
        maxWidth="520px"
      >
        <form onSubmit={handleSaveProfile}>
          {statusMsg && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '16px',
              fontSize: '0.85rem',
              backgroundColor: statusMsg.includes('success') ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              color: statusMsg.includes('success') ? '#34d399' : '#fca5a5',
              border: `1px solid ${statusMsg.includes('success') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
            }}>
              {statusMsg}
            </div>
          )}

          {emailNotice && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '16px',
              fontSize: '0.85rem',
              backgroundColor: 'rgba(59,130,246,0.15)',
              color: '#93c5fd',
              border: '1px solid rgba(59,130,246,0.3)'
            }}>
              {emailNotice}
            </div>
          )}

          {/* Avatar Edit with Upload Trigger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <div style={{ position: 'relative' }}>
              <img
                src={avatarPreview || avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
                alt="Avatar Preview"
                style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
              />
              <label
                htmlFor="profile-photo-input"
                style={{
                  position: 'absolute',
                  bottom: '-4px',
                  right: '-4px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-md)'
                }}
                title="Upload Photo"
              >
                <Camera size={14} />
              </label>
              <input
                id="profile-photo-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
              />
            </div>

            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Profile Photo</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Upload JPEG, PNG or WEBP (Max 5MB)
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input
                type="text"
                className="form-input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input
                type="text"
                className="form-input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Bio</label>
            <textarea
              rows={3}
              className="form-textarea"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell other travelers about your travel vibe..."
            />
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', marginBottom: '16px' }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '10px' }}>
              Change Password (Optional)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <input
                  type="password"
                  className="form-input"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="form-group">
                <input
                  type="password"
                  className="form-input"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={handleCloseEditModal}
              className="btn btn-secondary"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? 'Saving Profile...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: COUNTRY PASSPORT EXPLORER */}
      {selectedCountryStat && (
        <CountryAchievementModal
          isOpen={Boolean(selectedCountryStat)}
          onClose={() => setSelectedCountryStat(null)}
          countryStat={selectedCountryStat}
          allAchievements={achievementsData.allAchievements}
          onSelectAchievement={(achievement) => {
            setSelectedCountryStat(null);
            setSelectedAchievement(achievement);
          }}
        />
      )}

      {/* MODAL: CHECK IN */}
      <CheckInModal
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        userId={user?.id}
        onCheckinSuccess={handleCheckinSuccess}
      />

      {/* MODAL: ACHIEVEMENT DETAIL */}
      {selectedAchievement && (
        <Modal isOpen={Boolean(selectedAchievement)} onClose={() => setSelectedAchievement(null)} title={selectedAchievement.name}>
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>{selectedAchievement.icon}</div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}>
              <span className="badge badge-purple">{selectedAchievement.category}</span>
              <span className="badge badge-primary">{selectedAchievement.rarity}</span>
            </div>

            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
              {selectedAchievement.description}
            </p>

            <div className="glass-panel" style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', marginBottom: '20px', textAlign: 'left' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Requirement Status</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                {selectedAchievement.isUnlocked
                  ? `Unlocked on ${selectedAchievement.unlockedAt ? new Date(selectedAchievement.unlockedAt).toLocaleDateString() : 'Verified Check-In'}`
                  : `Progress: ${selectedAchievement.progressCurrent} / ${selectedAchievement.progressTotal}`}
              </div>
            </div>

            <button onClick={() => setSelectedAchievement(null)} className="btn btn-primary" style={{ width: '100%' }}>
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* LOG OUT CONFIRMATION MODAL */}
      <Modal isOpen={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} title="Confirm Log Out" maxWidth="450px">
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Are you sure you want to log out of Locora?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button onClick={() => setShowLogoutConfirm(false)} className="btn btn-secondary">Cancel</button>
          <button onClick={handleLogout} className="btn btn-primary">Yes, Log Out</button>
        </div>
      </Modal>

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="DELETE ACCOUNT?" maxWidth="480px">
        <p style={{ color: '#fca5a5', marginBottom: '12px', fontWeight: 700 }}>
          This permanently removes your account and associated data. This action cannot be undone.
        </p>

        {deleteError && (
          <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '14px' }}>
            {deleteError}
          </div>
        )}

        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label className="form-label">Type "DELETE" to confirm:</label>
          <input
            type="text"
            className="form-input"
            placeholder="DELETE"
            value={deleteInput}
            onChange={(e) => setDeleteInput(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-secondary">Cancel</button>
          <button onClick={handleDeleteAccount} className="btn btn-danger">Delete Account</button>
        </div>
      </Modal>

    </div>
  );
};

export default Profile;
