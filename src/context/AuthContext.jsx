import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  supabase,
  isSupabaseConfigured,
  apiSignIn,
  apiSignUp,
  apiSignInWithGoogle,
  apiSignOut,
  apiUpdateProfile,
  apiUpdatePassword,
  apiUpdateEmail,
  apiEnsureUserProfile,
  formatAuthError
} from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Settings modal global state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Global user preferences state (Settings modal)
  const [userPreferences, setUserPreferences] = useState({
    language: 'English (US)',
    currency: 'INR (₹)',
    distanceUnits: 'Kilometers (km)',
    notifications: {
      tripReminders: true,
      activityReminders: true,
      experienceRecommendations: true,
      achievementAlerts: true
    },
    locationAccess: true,
    dataPrivacy: 'Balanced'
  });

  // Track intended path after login/signup
  const [redirectAfterAuth, setRedirectAfterAuth] = useState(null);

  useEffect(() => {
    // Listen to Supabase auth state changes if configured
    if (isSupabaseConfigured()) {
      const loadSession = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          setSession(session);
          if (session?.user) {
            const dbProfile = await apiEnsureUserProfile(session.user);
            const mergedUser = {
              ...session.user,
              user_metadata: {
                ...session.user.user_metadata,
                ...(dbProfile || {}),
                avatar_url: dbProfile?.avatar_url || session.user.user_metadata?.avatar_url || null
              },
              profile: dbProfile || null
            };
            setUser(mergedUser);
          } else {
            setUser(null);
          }
        } catch (err) {
          console.warn('Session load error:', err);
        } finally {
          setLoading(false);
        }
      };

      loadSession();

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        setSession(session);
        if (session?.user) {
          const dbProfile = await apiEnsureUserProfile(session.user);
          const mergedUser = {
            ...session.user,
            user_metadata: {
              ...session.user.user_metadata,
              ...(dbProfile || {}),
              avatar_url: dbProfile?.avatar_url || session.user.user_metadata?.avatar_url || null
            },
            profile: dbProfile || null
          };
          setUser(mergedUser);
        } else {
          setUser(null);
        }
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    } else {
      // Default demo traveler state when Supabase env keys aren't set yet
      const savedMockUser = localStorage.getItem('locora_mock_user');
      if (savedMockUser) {
        setUser(JSON.parse(savedMockUser));
      } else {
        // Pre-populate demo user for smooth hackathon testing
        const demoUser = {
          id: 'local-mock-user',
          email: 'pratik@locora.travel',
          user_metadata: {
            full_name: 'Pratik Sharma',
            first_name: 'Pratik',
            last_name: 'Sharma',
            avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
            location: 'Kyoto, Japan (Traveling)',
            bio: 'Passionate slow traveler & culture enthusiast. Discovering hidden alleyways across Asia.'
          }
        };
        setUser(demoUser);
        localStorage.setItem('locora_mock_user', JSON.stringify(demoUser));
      }
      setLoading(false);
    }
  }, []);

  const signIn = async (email, password) => {
    const res = await apiSignIn(email, password);
    if (!res.error && res.data?.user) {
      const dbProfile = await apiEnsureUserProfile(res.data.user);
      const mergedUser = {
        ...res.data.user,
        user_metadata: {
          ...res.data.user.user_metadata,
          ...(dbProfile || {}),
          avatar_url: dbProfile?.avatar_url || res.data.user.user_metadata?.avatar_url || null
        },
        profile: dbProfile || null
      };
      setUser(mergedUser);
      localStorage.setItem('locora_mock_user', JSON.stringify(mergedUser));
    }
    return res;
  };

  const signUp = async ({ email, password, firstName, lastName, avatarUrl, bio }) => {
    const res = await apiSignUp({ email, password, firstName, lastName, avatarUrl, bio });
    if (!res.error && res.data?.user) {
      const dbProfile = await apiEnsureUserProfile(res.data.user);
      const mergedUser = {
        ...res.data.user,
        user_metadata: {
          ...res.data.user.user_metadata,
          ...(dbProfile || {}),
          avatar_url: dbProfile?.avatar_url || avatarUrl || res.data.user.user_metadata?.avatar_url || null
        },
        profile: dbProfile || null
      };
      setUser(mergedUser);
      localStorage.setItem('locora_mock_user', JSON.stringify(mergedUser));
    }
    return res;
  };

  const signInWithGoogle = async () => {
    const res = await apiSignInWithGoogle();
    if (res.data?.user) {
      const dbProfile = await apiEnsureUserProfile(res.data.user);
      const mergedUser = {
        ...res.data.user,
        user_metadata: {
          ...res.data.user.user_metadata,
          ...(dbProfile || {}),
          avatar_url: dbProfile?.avatar_url || res.data.user.user_metadata?.avatar_url || null
        },
        profile: dbProfile || null
      };
      setUser(mergedUser);
      localStorage.setItem('locora_mock_user', JSON.stringify(mergedUser));
    }
    return res;
  };

  const signOut = async () => {
    await apiSignOut();
    setUser(null);
    setSession(null);
    localStorage.removeItem('locora_mock_user');
  };

  const updateUserProfile = async (updates) => {
    if (!user) return { error: { message: 'Not authenticated' } };

    if (isSupabaseConfigured()) {
      const { data, error } = await apiUpdateProfile(user.id, updates);
      if (error) {
        return { data: null, error };
      }
      const updatedUser = {
        ...user,
        user_metadata: {
          ...user.user_metadata,
          ...updates,
          ...(data || {})
        }
      };
      setUser(updatedUser);
      localStorage.setItem('locora_mock_user', JSON.stringify(updatedUser));
      return { data, error: null };
    }

    const updatedUser = {
      ...user,
      user_metadata: {
        ...user.user_metadata,
        ...updates
      }
    };
    setUser(updatedUser);
    localStorage.setItem('locora_mock_user', JSON.stringify(updatedUser));
    return { data: updatedUser, error: null };
  };

  const updateUserPassword = async (newPassword) => {
    return await apiUpdatePassword(newPassword);
  };

  const updateUserEmail = async (newEmail) => {
    return await apiUpdateEmail(newEmail);
  };

  const openSettings = () => setIsSettingsOpen(true);
  const closeSettings = () => setIsSettingsOpen(false);

  const updatePreferences = (newPrefs) => {
    setUserPreferences((prev) => ({ ...prev, ...newPrefs }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        // Aliases for convenience
        login: signIn,
        signup: signUp,
        loginWithGoogle: signInWithGoogle,
        logout: signOut,
        updateUserProfile,
        updateUserPassword,
        updateUserEmail,
        isSettingsOpen,
        openSettings,
        closeSettings,
        userPreferences,
        updatePreferences,
        redirectAfterAuth,
        setRedirectAfterAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      session: null,
      loading: false,
      signIn: async () => ({ error: null }),
      signUp: async () => ({ error: null }),
      signInWithGoogle: async () => ({ error: null }),
      signInAsDemo: () => ({ data: { user: null }, error: null }),
      signOut: async () => {},
      login: async () => ({ error: null }),
      signup: async () => ({ error: null }),
      loginWithGoogle: async () => ({ error: null }),
      loginAsDemo: () => ({ data: { user: null }, error: null }),
      logout: async () => {},
      updateUserProfile: async () => ({ error: null }),
      updateUserPassword: async () => ({ error: null }),
      updateUserEmail: async () => ({ error: null }),
      isSettingsOpen: false,
      openSettings: () => {},
      closeSettings: () => {},
      userPreferences: {},
      updatePreferences: () => {}
    };
  }
  return context;
};
