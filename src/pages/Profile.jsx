import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { evaluateUserAchievements, deleteUserAccount, uploadProfileAvatar, apiGetUserProfile } from '../services/api';
import AchievementCard from '../components/AchievementCard';
import CountryAchievementModal from '../components/CountryAchievementModal';
import CheckInModal from '../components/CheckInModal';
import Modal from '../components/Modal';
import CustomDropdown from '../components/CustomDropdown';
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
  Navigation,
  Shield,
  Flag
} from 'lucide-react';

const Profile = () => {
  const { user, logout, updateUserProfile, updateUserPassword, updateUserEmail, removeProfileAvatar } = useAuth();
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

  // Remove Profile Picture Modal State
  const [showRemoveAvatarConfirm, setShowRemoveAvatarConfirm] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const [avatarRemoveError, setAvatarRemoveError] = useState('');

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

  // Handle Remove Profile Picture
  const handleRemoveAvatar = async () => {
    setIsRemovingAvatar(true);
    setAvatarRemoveError('');
    try {
      const res = await removeProfileAvatar(avatarUrl);
      if (res?.error) {
        setAvatarRemoveError(res.error.message || 'Failed to remove avatar.');
      } else {
        setAvatarUrl('');
        setAvatarPreview(null);
        setSelectedImageFile(null);
        setShowRemoveAvatarConfirm(false);
      }
    } catch (err) {
      setAvatarRemoveError(err.message || 'Failed to remove avatar.');
    } finally {
      setIsRemovingAvatar(false);
    }
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
      {/* 1. CINEMATIC TRAVEL BACKGROUND (USES USER PROFILE PICTURE DYNAMICALLY) */}
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
          key={(avatarPreview && avatarPreview.trim()) || (avatarUrl && avatarUrl.trim()) || 'default-profile-bg'}
          className="page-bg-entrance"
          src={(avatarPreview && avatarPreview.trim()) || (avatarUrl && avatarUrl.trim()) || '/profile-bg.jpg'}
          alt="Traveler Profile Background"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            filter: Boolean((avatarPreview && avatarPreview.trim()) || (avatarUrl && avatarUrl.trim()))
              ? 'brightness(0.48) contrast(1.1) saturate(1.15) blur(6px)'
              : 'brightness(0.70) contrast(1.05)',
            transform: Boolean((avatarPreview && avatarPreview.trim()) || (avatarUrl && avatarUrl.trim()))
              ? 'scale(1.06)'
              : 'scale(1)',
            transition: 'filter 0.6s ease, transform 0.6s ease, opacity 0.6s ease'
          }}
          onError={(e) => {
            e.currentTarget.src = '/profile-bg.jpg';
            e.currentTarget.style.filter = 'brightness(0.70) contrast(1.05)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        />

        {/* Soft Dark Vignette & Gradient Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: Boolean((avatarPreview && avatarPreview.trim()) || (avatarUrl && avatarUrl.trim()))
              ? 'linear-gradient(to bottom, rgba(7, 10, 16, 0.42) 0%, rgba(7, 10, 16, 0.60) 25%, rgba(7, 10, 16, 0.82) 65%, rgba(7, 10, 16, 0.98) 100%)'
              : 'linear-gradient(to bottom, rgba(7, 10, 16, 0.32) 0%, rgba(7, 10, 16, 0.48) 25%, rgba(7, 10, 16, 0.78) 60%, rgba(7, 10, 16, 0.96) 100%)',
            pointerEvents: 'none'
          }}
        />
      </div>

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

      {/* 2. MAIN CONTENT WRAPPER WITH PROPER NAVBAR CLEARANCE */}
      <main
        className="page-entrance"
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '108px 32px 80px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px'
        }}
      >
        {/* ================= 1. PROFILE HEADER ================= */}
        <div
          className="glass-panel page-stagger-header"
          style={{
            padding: '32px',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '20px',
            background: 'rgba(14, 20, 34, 0.78)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)'
          }}
        >
          {/* Subtle Ambient Radial Highlight */}
          <div style={{
            position: 'absolute',
            top: '-20%',
            right: '-10%',
            width: '350px',
            height: '350px',
            background: 'radial-gradient(circle, rgba(14, 165, 233, 0.15), transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div style={{ display: 'flex', gap: '28px', alignItems: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>

            {/* Avatar with Vibrant Ring Border & Initial Fallback */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {Boolean(avatarUrl && avatarUrl.trim()) ? (
                <img
                  src={avatarUrl}
                  alt={`${firstName} ${lastName}`}
                  style={{
                    width: '110px',
                    height: '110px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid #0ea5e9',
                    boxShadow: '0 0 24px rgba(14, 165, 233, 0.45)'
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
                  width: '110px',
                  height: '110px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #7c3aed 100%)',
                  border: '3px solid #0ea5e9',
                  boxShadow: '0 0 24px rgba(14, 165, 233, 0.45)',
                  display: Boolean(avatarUrl && avatarUrl.trim()) ? 'none' : 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.6rem',
                  fontWeight: 900,
                  color: '#ffffff',
                  textTransform: 'uppercase'
                }}
              >
                {firstName?.[0] || 'T'}
              </div>
            </div>

            {/* User Details */}
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <h1 style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'clamp(1.8rem, 2.6vw, 2.4rem)',
                    fontWeight: 900,
                    margin: 0,
                    color: '#ffffff',
                    letterSpacing: '-0.025em',
                    textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                  }}>
                    {firstName} {lastName}
                  </h1>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      background: 'rgba(45, 212, 191, 0.15)',
                      color: '#2dd4bf',
                      border: '1px solid rgba(45, 212, 191, 0.35)',
                      letterSpacing: '0.03em'
                    }}
                  >
                    <CheckCircle2 size={13} />
                    <span>Verified Traveler</span>
                  </span>
                </div>

                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="btn btn-secondary"
                  style={{
                    padding: '8px 18px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}
                >
                  <Edit3 size={15} />
                  <span>Edit Profile</span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'rgba(226, 232, 240, 0.75)', fontSize: '0.85rem', marginBottom: '14px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} style={{ color: '#38bdf8' }} />
                  <span>{user?.email || email}</span>
                </div>
              </div>

              <p style={{
                color: 'rgba(226, 232, 240, 0.88)',
                fontSize: '0.925rem',
                lineHeight: 1.6,
                margin: 0,
                maxWidth: '720px',
                fontStyle: 'italic'
              }}>
                "{bio}"
              </p>
            </div>

          </div>
        </div>

        {/* ================= 2. TRAVEL MILESTONES SUMMARY ================= */}
        <div
          className="glass-panel page-stagger-header"
          style={{
            padding: '24px 32px',
            borderRadius: '18px',
            background: 'rgba(14, 20, 34, 0.78)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)'
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'rgba(14, 165, 233, 0.16)',
                border: '1px solid rgba(14, 165, 233, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
                boxShadow: '0 0 16px rgba(14, 165, 233, 0.25)'
              }}>
                <Globe size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.1 }}>
                  {achievementsData.stats.countriesVisited}
                </div>
                <div style={{ fontSize: '0.825rem', color: 'rgba(226, 232, 240, 0.7)', fontWeight: 500 }}>
                  Countries Visited
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'rgba(16, 185, 129, 0.16)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34d399',
                boxShadow: '0 0 16px rgba(16, 185, 129, 0.25)'
              }}>
                <Compass size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.1 }}>
                  {achievementsData.stats.tripsCompleted}
                </div>
                <div style={{ fontSize: '0.825rem', color: 'rgba(226, 232, 240, 0.7)', fontWeight: 500 }}>
                  Trips Completed
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'rgba(245, 158, 11, 0.16)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbbf24',
                boxShadow: '0 0 16px rgba(245, 158, 11, 0.25)'
              }}>
                <Award size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.1 }}>
                  {achievementsData.stats.unlockedCount}
                </div>
                <div style={{ fontSize: '0.825rem', color: 'rgba(226, 232, 240, 0.7)', fontWeight: 500 }}>
                  Achievements Unlocked
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= 3. TRAVEL ACHIEVEMENTS ================= */}
        <div className="page-stagger-section-1">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', flexWrap: 'wrap', gap: '18px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Award size={24} style={{ color: '#fbbf24' }} />
                <h2 style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.6rem',
                  fontWeight: 900,
                  margin: 0,
                  color: '#ffffff',
                  letterSpacing: '-0.02em'
                }}>
                  Travel Achievements
                </h2>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'rgba(226, 232, 240, 0.75)', margin: '4px 0 0 0' }}>
                You've unlocked {achievementsData.stats.unlockedCount} badges based on verified travel activity.
              </p>
            </div>

            {/* Action & Filter Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowCheckInModal(true)}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  borderRadius: '12px',
                  boxShadow: '0 4px 16px rgba(14, 165, 233, 0.45)'
                }}
              >
                <Navigation size={16} />
                <span>Verify Visit / Check In</span>
              </button>

              {/* Status Filter */}
              <div
                className="tab-group"
                style={{
                  padding: '4px',
                  background: 'rgba(20, 26, 38, 0.72)',
                  borderRadius: '9999px',
                  border: '1px solid rgba(255, 255, 255, 0.12)'
                }}
              >
                {['All', 'Unlocked', 'Locked'].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`tab-item ${statusFilter === st ? 'active' : ''}`}
                    style={{
                      padding: '6px 16px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      borderRadius: '9999px',
                      color: statusFilter === st ? '#ffffff' : 'rgba(248, 250, 252, 0.7)',
                      backgroundColor: statusFilter === st ? 'rgba(14, 165, 233, 0.85)' : 'transparent',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Region Filter Custom Dropdown */}
              <CustomDropdown
                value={countryFilter}
                onChange={setCountryFilter}
                options={[
                  { value: 'All', label: 'All Regions' },
                  { value: 'India', label: 'India' },
                  { value: 'United States', label: 'USA' },
                  { value: 'Japan', label: 'Japan' },
                  { value: 'France', label: 'France' },
                  { value: 'Global', label: 'Global' }
                ]}
                icon={<Globe size={13} style={{ color: '#38bdf8' }} />}
                pill={false}
                minWidth="160px"
                ariaLabel="Filter achievements by region"
              />
            </div>
          </div>

          {/* Achievement Cards Grid */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="glass-panel" style={{ height: '180px', opacity: 0.5, borderRadius: '16px' }} />
              ))}
            </div>
          ) : displayedAchievements.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {displayedAchievements.map((item, idx) => (
                <div
                  key={item.id}
                  className="page-card-entrance"
                  style={{ animationDelay: `${idx * 0.04}s` }}
                >
                  <AchievementCard
                    achievement={item}
                    onClick={() => setSelectedAchievement(item)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'rgba(226, 232, 240, 0.65)', borderRadius: '16px' }}>
              No achievements match the selected filter.
            </div>
          )}
        </div>

        {/* ================= 4. COUNTRY PROGRESS ================= */}
        <div className="page-stagger-section-2">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Flag size={20} style={{ color: '#38bdf8' }} />
              <h3 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.35rem',
                fontWeight: 800,
                margin: 0,
                color: '#ffffff'
              }}>
                Country Achievement Progress
              </h3>
            </div>
            <span style={{ fontSize: '0.825rem', color: 'rgba(226, 232, 240, 0.6)' }}>
              Click any country to view passport details
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
            {achievementsData.countryProgress.map((cp, idx) => (
              <div
                key={cp.country}
                onClick={() => setSelectedCountryStat(cp)}
                className="glass-panel-interactive page-card-entrance"
                style={{
                  padding: '22px',
                  cursor: 'pointer',
                  borderRadius: '16px',
                  background: 'rgba(14, 20, 34, 0.78)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  animationDelay: `${idx * 0.05}s`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.75rem' }}>{cp.flag}</span>
                    <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#ffffff' }}>{cp.country}</span>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 700 }}>
                    {cp.unlockedCount} / {cp.totalCount}
                  </span>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'rgba(226, 232, 240, 0.7)', marginBottom: '10px' }}>
                  {cp.unlockedCount} of {cp.totalCount} achievements unlocked ({cp.unlockedPercentage}%)
                </div>

                <div style={{ width: '100%', height: '7px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.max(4, cp.unlockedPercentage)}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #0ea5e9 0%, #10b981 100%)',
                    borderRadius: '9999px',
                    boxShadow: '0 0 10px rgba(14, 165, 233, 0.5)'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================= 5. ACCOUNT & DANGER ZONE ================= */}
        <div
          className="glass-panel page-stagger-section-3"
          style={{
            padding: '28px 32px',
            borderRadius: '18px',
            background: 'rgba(14, 20, 34, 0.78)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Shield size={20} style={{ color: '#fca5a5' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#fca5a5' }}>
              Account & Danger Zone
            </h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'rgba(226, 232, 240, 0.7)', marginBottom: '22px' }}>
            Manage your session or permanently remove your Locora account.
          </p>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.16)'
              }}
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
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: '12px'
              }}
            >
              <Trash2 size={16} />
              <span>Delete Account</span>
            </button>
          </div>
        </div>
      </main>

      {/* ================= MODAL: EDIT PROFILE ================= */}
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
                style={{ width: '76px', height: '76px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #0ea5e9' }}
              />
              <label
                htmlFor="profile-photo-input"
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  backgroundColor: '#0ea5e9',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                }}
                title="Upload Photo"
              >
                <Camera size={15} />
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
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>Profile Photo</div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(226, 232, 240, 0.65)', marginTop: '2px' }}>
                Upload JPEG, PNG or WEBP (Max 5MB)
              </div>
              {(avatarUrl || avatarPreview) && (
                <button
                  type="button"
                  onClick={() => setShowRemoveAvatarConfirm(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#f87171',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                    marginTop: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Trash2 size={12} /> Remove Picture
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label" style={{ color: 'rgba(226, 232, 240, 0.85)', fontSize: '0.8rem', fontWeight: 600 }}>First Name</label>
              <input
                type="text"
                className="form-input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ color: 'rgba(226, 232, 240, 0.85)', fontSize: '0.8rem', fontWeight: 600 }}>Last Name</label>
              <input
                type="text"
                className="form-input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label" style={{ color: 'rgba(226, 232, 240, 0.85)', fontSize: '0.8rem', fontWeight: 600 }}>Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ color: 'rgba(226, 232, 240, 0.85)', fontSize: '0.8rem', fontWeight: 600 }}>Bio</label>
            <textarea
              rows={3}
              className="form-textarea"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell other travelers about your travel vibe..."
            />
          </div>

          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '16px', marginBottom: '16px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ffffff', marginBottom: '10px' }}>
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

      {/* ================= MODAL: COUNTRY PASSPORT EXPLORER ================= */}
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

      {/* ================= MODAL: CHECK IN ================= */}
      <CheckInModal
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        userId={user?.id}
        onCheckinSuccess={handleCheckinSuccess}
      />

      {/* ================= MODAL: ACHIEVEMENT DETAIL ================= */}
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

      {/* ================= LOG OUT CONFIRMATION MODAL ================= */}
      <Modal isOpen={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} title="Confirm Log Out" maxWidth="450px">
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Are you sure you want to log out of Locora?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button onClick={() => setShowLogoutConfirm(false)} className="btn btn-secondary">Cancel</button>
          <button onClick={handleLogout} className="btn btn-primary">Yes, Log Out</button>
        </div>
      </Modal>

      {/* ================= DELETE ACCOUNT CONFIRMATION MODAL ================= */}
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

      {/* ================= REMOVE AVATAR CONFIRMATION MODAL ================= */}
      <Modal
        isOpen={showRemoveAvatarConfirm}
        onClose={() => setShowRemoveAvatarConfirm(false)}
        title="Remove Profile Picture"
        maxWidth="440px"
      >
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
          Are you sure you want to remove your profile picture? This will reset your avatar to the default traveler icon.
        </p>
        {avatarRemoveError && (
          <div style={{
            padding: '8px 12px',
            background: 'rgba(239,68,68,0.15)',
            color: '#fca5a5',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            marginBottom: '14px'
          }}>
            {avatarRemoveError}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setShowRemoveAvatarConfirm(false)}
            className="btn btn-secondary"
            disabled={isRemovingAvatar}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRemoveAvatar}
            className="btn btn-danger"
            disabled={isRemovingAvatar}
          >
            {isRemovingAvatar ? 'Removing...' : 'Remove Photo'}
          </button>
        </div>
      </Modal>

    </div>
  );
};

export default Profile;
