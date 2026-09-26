import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatAuthError, uploadProfileAvatar } from '../services/api';
import { Logo } from '../components/Logo';
import { Eye, EyeOff, Camera } from 'lucide-react';

const Signup = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const fromPath = location.state?.from || '/my-trips';

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size must be less than 5MB.');
      return;
    }

    setSelectedImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Inline Validations
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg('Please enter your first and last name.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Your password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please check and try again.');
      return;
    }

    setIsSigningUp(true);

    try {
      let finalAvatarUrl = avatarUrl;

      const res = await signUp({
        email,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        avatarUrl: finalAvatarUrl,
        bio: bio.trim()
      });

      if (res?.error) {
        setErrorMsg(formatAuthError(res.error));
      } else {
        // If an image file was selected and user was created
        if (selectedImageFile && res?.data?.user?.id) {
          try {
            await uploadProfileAvatar(res.data.user.id, selectedImageFile);
          } catch (uploadErr) {
            console.warn('Initial avatar upload note:', uploadErr);
          }
        }
        navigate(fromPath, { replace: true });
      }
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setIsGoogleLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res?.error) {
        setErrorMsg(formatAuthError(res.error));
      } else if (res?.data?.user) {
        navigate(fromPath, { replace: true });
      }
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="auth-centered-page page-entrance">
      {/* 1. FULL VIEWPORT CINEMATIC THEME BACKGROUND */}
      <div className="auth-bg-layer" aria-hidden="true">
        <img
          src="/profile-bg.jpg"
          alt="Locora Traveler Vista"
          className="auth-bg-image"
          onError={(e) => {
            e.currentTarget.src = '/community-bg.jpg';
          }}
        />
        <div className="auth-bg-overlay" />
      </div>

      {/* 2. CENTERED FLOATING GLASSMORPHIC SIGNUP CARD */}
      <div className="auth-glass-card" style={{ maxWidth: '520px' }}>
        {/* Locora Brand Logo */}
        <div className="auth-card-logo-wrap">
          <Logo variant="auth" width="260px" />
        </div>

        {/* Header Titles */}
        <h1 className="auth-card-title">Join the Journey</h1>
        <p className="auth-card-subtitle">
          Create your account to unlock AI-crafted itineraries, discover local gems, and connect with fellow travelers.
        </p>

        {/* Profile Photo Upload Circle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '22px' }}>
          <label
            style={{
              width: '74px',
              height: '74px',
              borderRadius: '50%',
              border: '2px dashed rgba(56, 189, 248, 0.55)',
              background: 'rgba(18, 26, 42, 0.7)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)'
            }}
            title="Click to upload profile photo"
          >
            {Boolean(avatarPreview || avatarUrl) ? (
              <img
                src={avatarPreview || avatarUrl}
                alt="Profile Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <>
                <Camera size={20} color="#38bdf8" />
                <span
                  style={{
                    fontSize: '0.625rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    color: '#38bdf8',
                    marginTop: '3px'
                  }}
                >
                  PHOTO
                </span>
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {/* Error Notification Alert */}
        {errorMsg && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(239, 68, 68, 0.16)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '12px',
              color: '#fca5a5',
              fontSize: '0.85rem',
              marginBottom: '20px',
              lineHeight: 1.45,
              animation: 'authSlideUp 0.3s ease'
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit}>
          {/* First & Last Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label className="auth-field-label">First Name</label>
              <input
                type="text"
                required
                className="auth-field-input"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
            </div>
            <div>
              <label className="auth-field-label">Last Name</label>
              <input
                type="text"
                required
                className="auth-field-input"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="auth-field-group">
            <label className="auth-field-label">Email</label>
            <div className="auth-field-input-wrapper">
              <input
                type="email"
                required
                className="auth-field-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password & Confirm Password */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label className="auth-field-label">Password</label>
              <div className="auth-field-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="auth-field-input"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  style={{ paddingRight: '38px' }}
                />
                <button
                  type="button"
                  className="auth-field-icon-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="auth-field-label">Confirm</label>
              <div className="auth-field-input-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  className="auth-field-input"
                  placeholder="••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  style={{ paddingRight: '38px' }}
                />
                <button
                  type="button"
                  className="auth-field-icon-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>

          {/* Bio / Traveler Style (Optional) */}
          <div className="auth-field-group" style={{ marginBottom: '24px' }}>
            <label className="auth-field-label">Traveler Bio <span style={{ opacity: 0.6, fontWeight: 400 }}>(Optional)</span></label>
            <div className="auth-field-input-wrapper">
              <textarea
                rows={2}
                className="auth-field-input"
                placeholder="Share your travel vibe or favorite destinations..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                style={{
                  minHeight: '60px',
                  resize: 'vertical',
                  paddingTop: '8px',
                  lineHeight: 1.4
                }}
              />
            </div>
          </div>

          {/* Primary Submit Button */}
          <button
            type="submit"
            disabled={isSigningUp || isGoogleLoading}
            className="auth-btn-primary-pill"
          >
            {isSigningUp ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span>Creating Account...</span>
              </div>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        {/* Or Divider */}
        <div className="auth-or-divider">Or</div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isSigningUp || isGoogleLoading}
          className="auth-btn-google-pill"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>{isGoogleLoading ? 'Connecting to Google...' : 'Sign Up with Google'}</span>
        </button>

        {/* Footer Navigation Link */}
        <div className="auth-bottom-switch">
          <span>Already have an account?</span>
          <Link to="/login" state={{ from: fromPath }} className="auth-bottom-switch-link">
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
