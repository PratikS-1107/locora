import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import { formatAuthError, uploadProfileAvatar } from '../services/api';
import { Mail, Lock, User, Eye, EyeOff, Camera, FileText, ArrowRight } from 'lucide-react';

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
    <div className="auth-split-page">
      {/* LEFT VISUAL / BRAND PANEL */}
      <div
        className="auth-visual-panel"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=85")'
        }}
      >
        {/* Deep Seam & Radial Dark Gradient Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to right, rgba(8, 11, 17, 0.4) 0%, rgba(8, 11, 17, 0.72) 70%, rgba(8, 11, 17, 0.98) 100%), linear-gradient(to bottom, rgba(8, 11, 17, 0.45) 0%, transparent 40%, rgba(8, 11, 17, 0.85) 100%)',
            pointerEvents: 'none',
            zIndex: 1
          }}
        />

        {/* Top-Left Brand Logo */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div
            onClick={() => navigate('/')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              cursor: 'pointer',
              userSelect: 'none'
            }}
            title="Locora Home"
          >
            <Logo variant="auth" />
          </div>
        </div>

        {/* Bottom-Left Editorial Testimonial Card */}
        <div
          className="auth-quote-card"
          style={{
            position: 'relative',
            zIndex: 2,
            maxWidth: '420px',
            padding: '26px 24px',
            borderRadius: '16px',
            background: 'rgba(14, 20, 32, 0.76)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
          }}
        >
          {/* Teal Quote Badge */}
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              background: 'rgba(45, 212, 191, 0.12)',
              border: '1px solid rgba(45, 212, 191, 0.28)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-teal)',
              fontSize: '1.25rem',
              fontWeight: 800,
              marginBottom: '16px',
              lineHeight: 1
            }}
          >
            ”
          </div>

          <p
            style={{
              fontSize: '0.925rem',
              fontStyle: 'italic',
              lineHeight: 1.65,
              color: '#e2e8f0',
              marginBottom: '20px'
            }}
          >
            "Locora has redefined how I document and experience journeys. The interface feels like a meticulously crafted journal, perfect for curating authentic local discoveries."
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
              alt="Eleanor Vance"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid var(--accent-teal)'
              }}
            />
            <div>
              <div
                style={{
                  fontSize: '0.825rem',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  color: '#ffffff',
                  textTransform: 'uppercase'
                }}
              >
                Eleanor Vance
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Travel Journalist
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT AUTHENTICATION FORM PANEL */}
      <div className="auth-form-panel">
        <div className="auth-form-container">
          <h1 className="auth-heading">Create your account.</h1>
          <p className="auth-subtitle">
            Fill in your traveler profile to start your journey.
          </p>

          {/* Segmented Auth Navigation Toggle */}
          <div className="auth-toggle-group">
            <button
              type="button"
              className="auth-toggle-btn"
              onClick={() => navigate('/login', { state: { from: fromPath } })}
            >
              Login
            </button>
            <button
              type="button"
              className="auth-toggle-btn active"
              onClick={() => {}}
            >
              Signup
            </button>
          </div>

          {/* Profile Photo Upload Circle */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '22px' }}>
            <label
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                border: '2px dashed rgba(45, 212, 191, 0.65)',
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
                  <Camera size={20} color="var(--accent-teal)" />
                  <span
                    style={{
                      fontSize: '0.625rem',
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      color: 'var(--accent-teal)',
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

          {/* Error Message Alert */}
          {errorMsg && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '10px',
                color: '#fca5a5',
                fontSize: '0.875rem',
                marginBottom: '20px',
                lineHeight: 1.45
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSubmit}>
            {/* First Name & Last Name (2 columns) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="auth-input-wrapper">
                <input
                  type="text"
                  required
                  className="auth-input"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
                <User size={16} className="auth-input-icon" />
              </div>

              <div className="auth-input-wrapper">
                <input
                  type="text"
                  required
                  className="auth-input"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
                <User size={16} className="auth-input-icon" />
              </div>
            </div>

            {/* Email Address */}
            <div className="auth-input-wrapper">
              <input
                type="email"
                required
                className="auth-input"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <Mail size={16} className="auth-input-icon" />
            </div>

            {/* Password & Confirm Password (2 columns) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="auth-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="auth-input"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  style={{ paddingRight: '40px' }}
                />
                <Lock size={16} className="auth-input-icon" />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              <div className="auth-input-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  className="auth-input"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  style={{ paddingRight: '40px' }}
                />
                <Lock size={16} className="auth-input-icon" />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Bio / Additional Info */}
            <div className="auth-input-wrapper" style={{ marginBottom: '20px' }}>
              <textarea
                rows={2}
                className="auth-input"
                placeholder="Additional Information (e.g., travel style, preferences, interests)..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                style={{
                  minHeight: '64px',
                  resize: 'vertical',
                  paddingLeft: '44px',
                  paddingTop: '12px',
                  lineHeight: 1.45
                }}
              />
              <FileText size={16} className="auth-input-icon" style={{ top: '22px' }} />
            </div>

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={isSigningUp || isGoogleLoading}
              className="auth-submit-btn"
            >
              {isSigningUp ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span>Creating Account...</span>
                </div>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* OR Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              margin: '22px 0 18px 0',
              color: '#64748b',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.08em'
            }}
          >
            <hr style={{ flex: 1, borderColor: 'rgba(255, 255, 255, 0.08)' }} />
            <span>OR CONTINUE WITH</span>
            <hr style={{ flex: 1, borderColor: 'rgba(255, 255, 255, 0.08)' }} />
          </div>

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSigningUp || isGoogleLoading}
            className="auth-google-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{isGoogleLoading ? 'Connecting to Google...' : 'Google'}</span>
          </button>

          {/* Terms & Privacy Notice */}
          <div
            style={{
              textAlign: 'center',
              fontSize: '0.75rem',
              color: '#64748b',
              marginTop: '22px',
              lineHeight: 1.5
            }}
          >
            By continuing, you agree to our{' '}
            <a href="#terms" onClick={(e) => e.preventDefault()} style={{ color: '#94a3b8', textDecoration: 'underline' }}>
              Terms
            </a>{' '}
            and{' '}
            <a href="#privacy" onClick={(e) => e.preventDefault()} style={{ color: '#94a3b8', textDecoration: 'underline' }}>
              Privacy Policy
            </a>.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
