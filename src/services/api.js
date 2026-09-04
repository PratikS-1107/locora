import { supabase, isSupabaseConfigured } from './supabaseClient';
export { supabase, isSupabaseConfigured };

// --- UUID VALIDATION HELPER ---
export const isValidUUID = (id) => {
  if (typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

// --- ACTIVITY NORMALIZATION HELPER ---
export const normalizeActivity = (act) => {
  if (!act) return null;
  const startTime = act.start_time || act.startTime || act.time || '10:00 AM';
  const endTime = act.end_time || act.endTime || null;
  const durationMinutes = Number(act.duration_minutes ?? act.durationMinutes) || 60;
  const estimatedCost = Number(act.estimated_cost ?? act.estimatedCost ?? act.cost) || 0;
  const imageUrl = act.image_url || act.imageUrl || act.image || null;

  return {
    ...act,
    id: act.id,
    trip_id: act.trip_id,
    itinerary_day_id: act.itinerary_day_id,
    title: act.title || 'Untitled Activity',
    description: act.description || '',
    category: act.category || 'Sightseeing',
    location: act.location || '',
    address: act.address || '',
    country: act.country || '',
    country_code: act.country_code || act.countryCode || '',
    latitude: act.latitude ?? null,
    longitude: act.longitude ?? null,
    start_time: startTime,
    startTime: startTime,
    end_time: endTime,
    endTime: endTime,
    duration_minutes: durationMinutes,
    durationMinutes: durationMinutes,
    duration: `${durationMinutes} min`,
    estimated_cost: estimatedCost,
    estimatedCost: estimatedCost,
    cost: estimatedCost,
    currency: act.currency || 'INR',
    image_url: imageUrl,
    imageUrl: imageUrl,
    is_local_experience: Boolean(act.is_local_experience),
    is_cultural_experience: Boolean(act.is_cultural_experience),
    source: act.source || 'user',
    sort_order: Number(act.sort_order ?? act.sortOrder ?? act.position) || 1,
    position: Number(act.sort_order ?? act.sortOrder ?? act.position) || 1
  };
};

// --- AUTH ERROR TRANSLATOR ---
export const formatAuthError = (error) => {
  if (!error) return '';
  const msg = typeof error === 'string' ? error : error.message || '';

  if (msg.includes('User already registered') || msg.includes('already exists') || msg.includes('23505')) {
    return 'An account with this email already exists.';
  }
  if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
    return 'Incorrect email or password.';
  }
  if (msg.includes('Password should be at least') || msg.includes('password_too_short')) {
    return 'Your password must be at least 6 characters.';
  }
  if (msg.includes('Email not confirmed')) {
    return 'Please check your inbox to confirm your email before logging in.';
  }
  if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit')) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  return msg || 'Unable to complete authentication. Please try again.';
};

export const apiEnsureUserProfile = async (user) => {
  if (!user || !user.id || !isSupabaseConfigured() || !isValidUUID(user.id)) return null;

  try {
    // 1. Fetch existing profile row from public.profiles table
    const { data: existingProfile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (existingProfile && existingProfile.avatar_url) {
      return existingProfile;
    }

    // 2. Resolve image URL from storage bucket if available
    const { data: publicUrlData } = supabase.storage
      .from('profile-images')
      .getPublicUrl(`${user.id}/profile.jpg`);

    const storageAvatarUrl = publicUrlData?.publicUrl ? `${publicUrlData.publicUrl}?v=${Date.now()}` : null;
    const resolvedAvatar = existingProfile?.avatar_url || user.user_metadata?.avatar_url || storageAvatarUrl;

    if (existingProfile) {
      if (!existingProfile.avatar_url && resolvedAvatar) {
        await supabase
          .from('profiles')
          .update({ avatar_url: resolvedAvatar, updated_at: new Date().toISOString() })
          .eq('id', user.id);
        existingProfile.avatar_url = resolvedAvatar;
      }
      return existingProfile;
    }

    // 3. If no row exists, upsert minimal record into public.profiles
    const newProfile = {
      id: user.id,
      avatar_url: resolvedAvatar,
      bio: user.user_metadata?.bio || 'Passionate slow traveler & culture enthusiast.',
      updated_at: new Date().toISOString()
    };

    const { data: insertedData, error: insertError } = await supabase
      .from('profiles')
      .upsert(newProfile)
      .select()
      .maybeSingle();

    if (insertError) {
      console.warn('apiEnsureUserProfile upsert warning:', insertError);
    }

    return insertedData || newProfile;
  } catch (err) {
    console.warn('Profile lookup catch:', err);
    return user.user_metadata || null;
  }
};

// --- AUTHENTICATION SERVICES ---

export const apiSignUp = async ({ email, password, firstName, lastName, avatarUrl, bio }) => {
  const fullName = `${firstName} ${lastName}`.trim();
  if (!isSupabaseConfigured()) {
    const mockUser = {
      id: `user-${Date.now()}`,
      email,
      user_metadata: {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
        avatar_url: avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        bio: bio || 'Exploring local experiences.'
      }
    };
    return { data: { user: mockUser, session: { access_token: 'mock-session' } }, error: null };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
        avatar_url: avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        bio: bio || 'Exploring local experiences.'
      }
    }
  });

  if (data?.user && !error) {
    await apiEnsureUserProfile(data.user);
  }

  return { data, error };
};

export const apiSignIn = async (email, password) => {
  if (!isSupabaseConfigured()) {
    const mockUser = {
      id: 'local-mock-user',
      email,
      user_metadata: {
        full_name: 'Pratik Sharma',
        first_name: 'Pratik',
        last_name: 'Sharma',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        bio: 'Local explorer & culture enthusiast.'
      }
    };
    return { data: { user: mockUser, session: { access_token: 'mock-session' } }, error: null };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (data?.user && !error) {
    await apiEnsureUserProfile(data.user);
  }
  return { data, error };
};

export const apiSignInWithGoogle = async () => {
  if (!isSupabaseConfigured()) {
    const mockUser = {
      id: 'google-user-999',
      email: 'alex.rivera.google@locora.travel',
      user_metadata: {
        full_name: 'Alex Rivera',
        first_name: 'Alex',
        last_name: 'Rivera',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        bio: 'Slow traveler discovering hidden cultural spots.'
      }
    };
    return { data: { user: mockUser, session: { access_token: 'mock-google-session' } }, error: null };
  }

  return await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
};

export const apiSignOut = async () => {
  if (!isSupabaseConfigured()) {
    return { error: null };
  }
  return await supabase.auth.signOut();
};

export const uploadProfileAvatar = async (userId, file) => {
  if (!userId || !file || (isSupabaseConfigured() && !isValidUUID(userId))) {
    return { publicUrl: null, error: new Error('Valid user ID and file required') };
  }

  if (!isSupabaseConfigured()) {
    const mockUrl = URL.createObjectURL(file);
    return { publicUrl: mockUrl, error: null };
  }

  try {
    // The profile image upload endpoint is always: profile-images/{authenticated-user-id}/profile.jpg
    const filePath = `${userId}/profile.jpg`;

    // 1. Upload File to profile-images bucket (upsert: true to replace existing)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(filePath, file, {
        contentType: file.type || 'image/jpeg',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Supabase Storage upload error:', uploadError);
      return { publicUrl: null, error: uploadError };
    }

    // 2. Obtain Public URL with timestamp query for immediate cache refresh
    const { data: urlData } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filePath);

    const rawUrl = urlData?.publicUrl || '';
    const publicUrlWithTimestamp = rawUrl ? `${rawUrl}?v=${Date.now()}` : '';

    return { publicUrl: publicUrlWithTimestamp, error: null };
  } catch (err) {
    console.error('uploadProfileAvatar exception:', err);
    return { publicUrl: null, error: err };
  }
};

export const apiGetUserProfile = async (userId) => {
  if (!userId || !isSupabaseConfigured() || !isValidUUID(userId)) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching profile from public.profiles:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('apiGetUserProfile catch:', err);
    return null;
  }
};

export const apiUpdateProfile = async (userId, updates) => {
  if (!userId || (isSupabaseConfigured() && !isValidUUID(userId))) {
    return { data: null, error: new Error('Valid User ID is required') };
  }

  if (!isSupabaseConfigured()) {
    return { data: updates, error: null };
  }

  try {
    // 1. Primary persistence: Update Supabase Auth User Metadata (native to Supabase Auth)
    // Securely persists user profile details (first_name, last_name, bio, avatar_url) on the auth user object
    const { data: authData, error: authError } = await supabase.auth.updateUser({
      data: {
        ...updates
      }
    });

    if (authError) {
      console.error('supabase.auth.updateUser error:', authError);
      return { data: null, error: authError };
    }

    // 2. Secondary persistence: Check if profiles table exists and contains verified matching columns
    let dbRow = null;
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (existingProfile) {
        const existingColumns = Object.keys(existingProfile);
        const validDbPayload = {};

        // Explicitly prohibited columns proven to NOT exist in the profiles table schema
        const excludedColumns = ['id', 'first_name', 'full_name'];

        for (const [key, value] of Object.entries(updates)) {
          if (existingColumns.includes(key) && !excludedColumns.includes(key) && value !== undefined) {
            validDbPayload[key] = value;
          }
        }

        // Always ensure avatar_url is persisted to profiles table if passed
        if (updates.avatar_url !== undefined) {
          validDbPayload.avatar_url = updates.avatar_url;
        }

        if (existingColumns.includes('updated_at')) {
          validDbPayload.updated_at = new Date().toISOString();
        }

        // Only send UPDATE if there are confirmed existing columns in the table
        if (Object.keys(validDbPayload).length > 0) {
          const { data: updateData, error: dbUpdateError } = await supabase
            .from('profiles')
            .update(validDbPayload)
            .eq('id', userId)
            .select()
            .maybeSingle();

          if (dbUpdateError) {
            console.warn('Non-fatal profiles table update warning:', dbUpdateError);
          } else if (updateData) {
            dbRow = updateData;
          }
        }
      } else {
        // Row does not exist yet: upsert minimal profile row
        const upsertPayload = {
          id: userId,
          updated_at: new Date().toISOString()
        };
        if (updates.avatar_url !== undefined) {
          upsertPayload.avatar_url = updates.avatar_url;
        }
        if (updates.bio !== undefined) {
          upsertPayload.bio = updates.bio;
        }

        const { data: upsertData, error: upsertErr } = await supabase
          .from('profiles')
          .upsert(upsertPayload)
          .select()
          .maybeSingle();

        if (upsertErr) {
          console.warn('profiles table upsert warning:', upsertErr);
        } else if (upsertData) {
          dbRow = upsertData;
        }
      }
    } catch (tableErr) {
      console.warn('profiles table sync skipped:', tableErr);
    }

    return {
      data: {
        ...(authData?.user?.user_metadata || {}),
        ...(dbRow || {}),
        ...updates
      },
      error: null
    };
  } catch (err) {
    console.error('apiUpdateProfile catch exception:', err);
    return { data: null, error: err };
  }
};

export const apiUpdatePassword = async (newPassword) => {
  if (!isSupabaseConfigured()) {
    return { data: { message: 'Password updated' }, error: null };
  }
  return await supabase.auth.updateUser({ password: newPassword });
};

export const apiUpdateEmail = async (newEmail) => {
  if (!isSupabaseConfigured()) {
    return { data: { message: 'Verification email sent' }, error: null };
  }
  return await supabase.auth.updateUser({ email: newEmail });
};

// --- CENTRALIZED TRIP CRUD SERVICES ---

const INITIAL_MOCK_TRIPS = [
  {
    id: 'trip-kyoto-active',
    user_id: 'guest',
    title: 'Kyoto Zen & Culinary Exploration',
    name: 'Kyoto Zen & Culinary Exploration',
    description: 'Immersive exploration of ancient tea houses, bamboo groves, and Nishiki Market culinary walk.',
    destination: 'Kyoto, Japan',
    country: 'Japan',
    country_code: 'JP',
    cover_image_url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80',
    cover_image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80',
    start_date: '2026-08-20',
    end_date: '2026-08-30',
    status: 'active',
    budget: 30000,
    is_public: false,
    destinations_count: 3,
    stops: ['Kyoto', 'Uji', 'Arashiyama'],
    created_at: new Date('2026-08-01').toISOString(),
    updated_at: new Date('2026-08-01').toISOString()
  },
  {
    id: 'trip-hokkaido-upcoming',
    user_id: 'guest',
    title: 'Hokkaido Winter Artisan Trail',
    name: 'Hokkaido Winter Artisan Trail',
    author_name: 'Marcus Vance',
    author_avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80',
    description: 'Snow lantern festivals, hot springs, and local ceramic craft studios.',
    destination: 'Hokkaido, Japan',
    country: 'Japan',
    country_code: 'JP',
    cover_image_url: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=600&q=80',
    cover_image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=600&q=80',
    start_date: '2026-11-10',
    end_date: '2026-11-20',
    status: 'upcoming',
    budget: 45000,
    is_public: true,
    destinations_count: 4,
    stops: ['Sapporo', 'Otaru', 'Niseko', 'Noboribetsu'],
    created_at: new Date('2026-08-10').toISOString(),
    updated_at: new Date('2026-08-10').toISOString()
  },
  {
    id: 'trip-varanasi-completed',
    user_id: 'guest',
    title: 'Varanasi Heritage Ghats Trail',
    name: 'Varanasi Heritage Ghats Trail',
    author_name: 'Aarav Sharma',
    author_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80',
    description: 'Dawn boat rides, silk weaving workshops, and evening Ganga Aarti rituals.',
    destination: 'Varanasi, India',
    country: 'India',
    country_code: 'IN',
    cover_image_url: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=600&q=80',
    cover_image: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=600&q=80',
    start_date: '2026-05-10',
    end_date: '2026-05-16',
    status: 'completed',
    budget: 20000,
    is_public: false,
    destinations_count: 2,
    stops: ['Varanasi', 'Sarnath'],
    created_at: new Date('2026-05-01').toISOString(),
    updated_at: new Date('2026-05-16').toISOString()
  },
  {
    id: 'trip-tokyo-wishlist',
    user_id: 'user-public-101',
    title: 'Tokyo Backstreet Izakaya Crawl',
    name: 'Tokyo Backstreet Izakaya Crawl',
    author_name: 'Kenji Takahashi',
    author_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
    description: 'Saved public itinerary highlighting neighborhood izakayas and ramen artisan kitchens.',
    destination: 'Tokyo, Japan',
    country: 'Japan',
    country_code: 'JP',
    cover_image_url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80',
    cover_image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80',
    start_date: '2026-12-01',
    end_date: '2026-12-07',
    status: 'upcoming',
    budget: 35000,
    is_public: true,
    is_wishlist: true,
    destinations_count: 3,
    stops: ['Shinjuku', 'Yanaka', 'Kichijoji'],
    created_at: new Date('2026-08-15').toISOString(),
    updated_at: new Date('2026-08-15').toISOString()
  },
  {
    id: 'trip-japan-public-1',
    user_id: 'user-public-102',
    title: 'Japan Golden Route Cultural Odyssey',
    name: 'Japan Golden Route Cultural Odyssey',
    author_name: 'Sophia Chen',
    author_avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=80',
    description: 'A balanced 8-day Japan itinerary covering ancient temples, tea ceremonies, and local food markets.',
    destination: 'Japan Golden Route',
    country: 'Japan',
    country_code: 'JP',
    cover_image_url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80',
    cover_image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80',
    start_date: '2026-09-01',
    end_date: '2026-09-09',
    status: 'upcoming',
    budget: 42000,
    is_public: true,
    destinations_count: 3,
    stops: ['Tokyo', 'Kyoto', 'Osaka'],
    activities_count: 18,
    created_at: new Date('2026-08-12').toISOString(),
    updated_at: new Date('2026-08-12').toISOString()
  },
  {
    id: 'trip-goa-public-2',
    user_id: 'user-public-103',
    title: 'Goa Latin Quarter & Spice Trail',
    name: 'Goa Latin Quarter & Spice Trail',
    author_name: 'Elena Rostova',
    author_avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=100&q=80',
    description: 'Explore century-old Portuguese architecture in Fontainhas and organic spice plantation feasts.',
    destination: 'Goa, India',
    country: 'India',
    country_code: 'IN',
    cover_image_url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80',
    cover_image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80',
    start_date: '2026-10-05',
    end_date: '2026-10-10',
    status: 'upcoming',
    budget: 18000,
    is_public: true,
    destinations_count: 2,
    stops: ['Panaji', 'Ponda'],
    activities_count: 12,
    created_at: new Date('2026-08-14').toISOString(),
    updated_at: new Date('2026-08-14').toISOString()
  }
];

export const normalizeTrip = (trip) => {
  if (!trip) return null;
  const title = trip.title || trip.name || 'Untitled Trip';
  const coverUrl = trip.cover_image_url || trip.cover_image || trip.coverPhoto || 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80';
  const budget = trip.budget !== undefined && trip.budget !== null && !isNaN(Number(trip.budget)) ? Number(trip.budget) : 0;
  const rawStatus = trip.status ? String(trip.status).toLowerCase() : 'upcoming';
  const status = (rawStatus === 'active' || rawStatus === 'completed') ? rawStatus : 'upcoming';
  const trip_source = trip.trip_source || 'personal';

  let daysCount = trip.days_count ? Number(trip.days_count) : null;
  if (!daysCount && trip.start_date && trip.end_date) {
    const diff = Math.round((new Date(trip.end_date) - new Date(trip.start_date)) / (1000 * 60 * 60 * 24)) + 1;
    if (!isNaN(diff) && diff > 0) daysCount = diff;
  }
  if (!daysCount) daysCount = 5;

  return {
    ...trip,
    title,
    name: title,
    cover_image_url: coverUrl,
    cover_image: coverUrl,
    destination: trip.destination || '',
    country: trip.country || '',
    country_code: trip.country_code || '',
    start_date: trip.start_date || '',
    end_date: trip.end_date || '',
    status,
    budget,
    is_public: Boolean(trip.is_public),
    trip_source,
    days_count: daysCount,
    duration: trip.duration || `${daysCount} Days`
  };
};

const getLocalTrips = () => {
  const stored = localStorage.getItem('locora_trips');
  if (stored) {
    try { return JSON.parse(stored); } catch (e) { console.error(e); }
  }
  localStorage.setItem('locora_trips', JSON.stringify(INITIAL_MOCK_TRIPS));
  return INITIAL_MOCK_TRIPS;
};

const setLocalTrips = (trips) => {
  localStorage.setItem('locora_trips', JSON.stringify(trips));
};

export const getUserTrips = async (userId) => {
  if (!isSupabaseConfigured()) {
    const all = getLocalTrips().map(normalizeTrip);
    return { data: all, error: null };
  }

  if (!userId || !isValidUUID(userId)) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', userId)
      .eq('trip_source', 'personal')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase getUserTrips error:', error.message);
      return { data: [], error };
    }
    return { data: (data || []).map(normalizeTrip), error: null };
  } catch (err) {
    console.error('Supabase getUserTrips catch:', err);
    return { data: [], error: err };
  }
};

export const getExploreTrips = async () => {
  if (!isSupabaseConfigured()) {
    return { data: (READY_MADE_TRIPS || []).map(normalizeTrip), error: null };
  }

  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('trip_source', 'template')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase getExploreTrips error:', error.message);
      throw error;
    }
    return { data: (data || []).map(normalizeTrip), error: null };
  } catch (err) {
    console.error('Supabase getExploreTrips catch:', err);
    return { data: [], error: err };
  }
};

export const getTripById = async (tripId) => {
  if (!tripId) return { data: null, error: 'No trip ID provided' };

  if (!isSupabaseConfigured() || !isValidUUID(tripId)) {
    const trips = getLocalTrips();
    const found = trips.find(t => t.id === tripId) || null;
    return { data: normalizeTrip(found), error: null };
  }

  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (error) {
      console.error('Supabase getTripById error:', error.message);
      return { data: null, error };
    }
    return { data: normalizeTrip(data), error: null };
  } catch (err) {
    console.error('Supabase getTripById catch:', err);
    return { data: null, error: err };
  }
};

export const createTrip = async (tripData) => {
  const userId = tripData.userId || tripData.user_id;
  if (!userId || (isSupabaseConfigured() && !isValidUUID(userId))) {
    return { data: null, error: new Error('User authentication required to create trips.') };
  }

  const title = tripData.title || tripData.name || 'New Trip';
  const description = tripData.description || '';
  const destination = tripData.destination || '';
  const country = tripData.country || '';
  const country_code = tripData.country_code || tripData.countryCode || '';
  const start_date = tripData.startDate || tripData.start_date || null;
  const end_date = tripData.endDate || tripData.end_date || null;
  // Newly created trips MUST use status: "upcoming" and trip_source: "personal"
  const status = 'upcoming';
  const is_public = Boolean(tripData.is_public);
  const trip_source = tripData.trip_source || 'personal';
  const cover_image_url = tripData.cover_image_url || tripData.coverImage || tripData.cover_image || null;
  const budget = tripData.budget !== undefined && tripData.budget !== null && !isNaN(Number(tripData.budget)) ? Number(tripData.budget) : 0;

  if (!isSupabaseConfigured()) {
    const newTrip = normalizeTrip({
      id: `trip-${Date.now()}`,
      user_id: userId,
      title,
      description,
      destination,
      country,
      country_code,
      start_date,
      end_date,
      status,
      is_public,
      trip_source,
      cover_image_url,
      budget,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    const current = getLocalTrips();
    setLocalTrips([newTrip, ...current]);
    if (start_date && end_date) {
      await ensureItineraryDays(newTrip.id, start_date, end_date);
    }
    return { data: newTrip, error: null };
  }

  // Insert payload strictly matching real Supabase trips table schema
  const insertPayload = {
    user_id: userId,
    title,
    description,
    destination,
    country,
    country_code,
    start_date,
    end_date,
    status: 'upcoming',
    is_public,
    trip_source,
    cover_image_url,
    budget
  };

  const { data, error } = await supabase
    .from('trips')
    .insert([insertPayload])
    .select()
    .single();

  if (error) {
    console.error('Supabase trip creation error:', error.message);
    return { data: null, error };
  }

  // If start_date and end_date provided, initialize itinerary_days rows for the trip
  if (data?.id && data.start_date && data.end_date) {
    try {
      await ensureItineraryDays(data.id, data.start_date, data.end_date);
    } catch (dayErr) {
      console.warn('Initial itinerary days generation warning:', dayErr);
    }
  }

  return { data: normalizeTrip(data), error: null };
};

export const updateTrip = async (tripId, updates) => {
  const allowedColumns = [
    'title', 'description', 'destination', 'country', 'country_code',
    'start_date', 'end_date', 'status', 'is_public', 'cover_image_url', 'budget'
  ];
  const payload = {};

  if (updates.title !== undefined) payload.title = updates.title;
  else if (updates.name !== undefined) payload.title = updates.name;

  if (updates.cover_image_url !== undefined) payload.cover_image_url = updates.cover_image_url;
  else if (updates.cover_image !== undefined) payload.cover_image_url = updates.cover_image;
  else if (updates.coverPhoto !== undefined) payload.cover_image_url = updates.coverPhoto;

  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.destination !== undefined) payload.destination = updates.destination;
  if (updates.country !== undefined) payload.country = updates.country;
  if (updates.country_code !== undefined) payload.country_code = updates.country_code;
  if (updates.start_date !== undefined) payload.start_date = updates.start_date;
  if (updates.end_date !== undefined) payload.end_date = updates.end_date;
  if (updates.status !== undefined) {
    const s = String(updates.status).toLowerCase();
    if (['upcoming', 'active', 'completed'].includes(s)) payload.status = s;
  }
  if (updates.is_public !== undefined) payload.is_public = Boolean(updates.is_public);
  if (updates.budget !== undefined && updates.budget !== null) {
    payload.budget = Number(updates.budget) || 0;
  }

  if (!isSupabaseConfigured()) {
    const current = getLocalTrips();
    const updated = current.map(t => t.id === tripId ? normalizeTrip({ ...t, ...payload, updated_at: new Date().toISOString() }) : t);
    setLocalTrips(updated);
    return { data: updated.find(t => t.id === tripId), error: null };
  }

  if (Object.keys(payload).length === 0) {
    return { data: updates, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('trips')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', tripId)
      .select()
      .single();

    if (error) {
      console.error('Supabase updateTrip error:', error.message);
      return { data: null, error };
    }
    return { data: normalizeTrip(data), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
};

export const deleteTrip = async (tripId) => {
  if (!isSupabaseConfigured()) {
    const current = getLocalTrips();
    setLocalTrips(current.filter(t => t.id !== tripId));
    return { data: { id: tripId }, error: null };
  }

  // Clean up child activities, days, and saved entries
  try {
    await supabase.from('activities').delete().eq('trip_id', tripId);
    await supabase.from('itinerary_days').delete().eq('trip_id', tripId);
    await supabase.from('saved_trips').delete().eq('trip_id', tripId);
  } catch (e) {
    console.warn('Child cleanup before deleteTrip:', e);
  }

  const { data, error } = await supabase
    .from('trips')
    .delete()
    .eq('id', tripId);

  if (error) {
    console.error('Supabase deleteTrip error:', error.message);
    return { data: null, error };
  }

  return { data: { id: tripId }, error: null };
};

export const setTripVisibility = async (tripId, isPublic) => {
  return await updateTrip(tripId, { is_public: isPublic });
};

export const updateTripBudget = async (tripId, totalBudget) => {
  return await updateTrip(tripId, { budget: Number(totalBudget) || 0 });
};

export const uploadTripCover = async (file) => {
  if (!isSupabaseConfigured()) {
    return { data: URL.createObjectURL(file), error: null };
  }

  try {
    const fileExt = file.name.split('.').pop();
    const filePath = `trip-covers/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('trip-media')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('trip-media')
      .getPublicUrl(filePath);

    return { data: data.publicUrl, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
};

// --- ITINERARY DAYS SERVICES (itinerary_days table) ---

export const getItineraryDays = async (tripId) => {
  if (!isSupabaseConfigured()) {
    const stored = localStorage.getItem(`locora_days_${tripId}`);
    if (stored) {
      try { return { data: JSON.parse(stored), error: null }; } catch (e) { console.error(e); }
    }
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('itinerary_days')
      .select('*')
      .eq('trip_id', tripId)
      .order('day_number', { ascending: true });

    if (error) {
      console.error('Supabase getItineraryDays error:', error.message);
      return { data: [], error };
    }
    return { data: data || [], error: null };
  } catch (err) {
    console.error('Supabase getItineraryDays catch:', err);
    return { data: [], error: err };
  }
};

export const createItineraryDay = async ({ tripId, dayNumber, date, notes }) => {
  if (!isSupabaseConfigured()) {
    const newDay = {
      id: `day-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      trip_id: tripId,
      day_number: dayNumber,
      date,
      notes: notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const stored = localStorage.getItem(`locora_days_${tripId}`);
    const days = stored ? JSON.parse(stored) : [];
    localStorage.setItem(`locora_days_${tripId}`, JSON.stringify([...days, newDay]));
    return { data: newDay, error: null };
  }

  const { data, error } = await supabase
    .from('itinerary_days')
    .insert([{
      trip_id: tripId,
      day_number: dayNumber,
      date,
      notes: notes || ''
    }])
    .select()
    .single();

  if (error) {
    console.error('Supabase createItineraryDay error:', error.message);
    return { data: null, error };
  }

  return { data, error: null };
};

export const updateItineraryDay = async (dayId, updates) => {
  if (!isSupabaseConfigured()) {
    return { data: updates, error: null };
  }

  const { data, error } = await supabase
    .from('itinerary_days')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', dayId)
    .select()
    .single();

  if (error) {
    console.error('Supabase updateItineraryDay error:', error.message);
    return { data: null, error };
  }

  return { data, error: null };
};

export const deleteItineraryDay = async (dayId) => {
  if (!isSupabaseConfigured()) {
    return { data: { id: dayId }, error: null };
  }

  try {
    await supabase.from('activities').delete().eq('itinerary_day_id', dayId);
  } catch (e) {
    console.warn('Activities cleanup before deleteItineraryDay:', e);
  }

  const { data, error } = await supabase
    .from('itinerary_days')
    .delete()
    .eq('id', dayId);

  if (error) {
    console.error('Supabase deleteItineraryDay error:', error.message);
    return { data: null, error };
  }

  return { data: { id: dayId }, error: null };
};

export const ensureItineraryDays = async (tripId, startDate, endDate) => {
  if (!tripId || !startDate || !endDate) {
    return await getItineraryDays(tripId);
  }

  const { data: existingDays, error: daysErr } = await getItineraryDays(tripId);
  if (daysErr) return { data: [], error: daysErr };

  const existingDateMap = new Map((existingDays || []).map(d => [d.date, d]));

  // Generate target dates array
  const targetDates = [];
  let curr = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(curr.getTime()) || isNaN(end.getTime()) || curr > end) {
    return { data: existingDays || [], error: null };
  }

  while (curr <= end) {
    targetDates.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }

  // Identify missing dates to create
  const missingDates = targetDates.filter(d => !existingDateMap.has(d));

  if (missingDates.length > 0) {
    if (!isSupabaseConfigured()) {
      for (const d of missingDates) {
        const dayNum = (existingDays || []).length + 1;
        await createItineraryDay({
          tripId,
          dayNumber: dayNum,
          date: d,
          notes: ''
        });
      }
      return await getItineraryDays(tripId);
    }

    const nextDayNum = (existingDays || []).length + 1;
    const newRows = missingDates.map((d, idx) => ({
      trip_id: tripId,
      day_number: nextDayNum + idx,
      date: d,
      notes: ''
    }));

    const { error: insertErr } = await supabase
      .from('itinerary_days')
      .insert(newRows);

    if (insertErr) {
      console.error('ensureItineraryDays insert error:', insertErr.message);
    }
  }

  return await getItineraryDays(tripId);
};

// --- ACTIVITIES SERVICES (activities table) ---

export const getActivities = async (tripId) => {
  if (!isSupabaseConfigured()) {
    const stored = localStorage.getItem(`locora_activities_${tripId}`);
    if (stored) {
      try { return { data: JSON.parse(stored), error: null }; } catch (e) { console.error(e); }
    }
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('trip_id', tripId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Supabase getActivities error:', error.message);
      return { data: [], error };
    }
    return { data: data || [], error: null };
  } catch (err) {
    console.error('Supabase getActivities catch:', err);
    return { data: [], error: err };
  }
};

export const createActivity = async (actData) => {
  const payload = {
    trip_id: actData.tripId || actData.trip_id,
    itinerary_day_id: actData.itineraryDayId || actData.itinerary_day_id,
    title: actData.title,
    description: actData.description || '',
    category: actData.category || 'Sightseeing',
    location: actData.location || '',
    address: actData.address || '',
    country: actData.country || '',
    country_code: actData.countryCode || actData.country_code || '',
    latitude: actData.latitude || null,
    longitude: actData.longitude || null,
    start_time: actData.startTime || actData.start_time || '10:00 AM',
    end_time: actData.endTime || actData.end_time || null,
    duration_minutes: Number(actData.durationMinutes || actData.duration_minutes) || 60,
    estimated_cost: Number(actData.estimatedCost || actData.estimated_cost || actData.cost) || 0,
    currency: actData.currency || 'INR',
    image_url: actData.imageUrl || actData.image_url || null,
    is_local_experience: Boolean(actData.is_local_experience),
    is_cultural_experience: Boolean(actData.is_cultural_experience),
    source: actData.source || 'user',
    sort_order: Number(actData.sortOrder || actData.sort_order || actData.position) || 1
  };

  if (!isSupabaseConfigured()) {
    const newAct = {
      ...payload,
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const stored = localStorage.getItem(`locora_activities_${payload.trip_id}`);
    const list = stored ? JSON.parse(stored) : [];
    localStorage.setItem(`locora_activities_${payload.trip_id}`, JSON.stringify([...list, newAct]));
    return { data: newAct, error: null };
  }

  const { data, error } = await supabase
    .from('activities')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Supabase createActivity error:', error.message);
    return { data: null, error };
  }

  return { data, error: null };
};

export const updateActivity = async (activityId, updates) => {
  const allowed = [
    'title', 'description', 'category', 'location', 'address',
    'country', 'country_code', 'latitude', 'longitude',
    'start_time', 'end_time', 'duration_minutes', 'estimated_cost',
    'currency', 'image_url', 'is_local_experience', 'is_cultural_experience',
    'source', 'sort_order', 'itinerary_day_id'
  ];
  const payload = {};
  for (const [k, v] of Object.entries(updates)) {
    if (allowed.includes(k) && v !== undefined) payload[k] = v;
  }
  if (updates.cost !== undefined && payload.estimated_cost === undefined) {
    payload.estimated_cost = Number(updates.cost);
  }
  if (updates.position !== undefined && payload.sort_order === undefined) {
    payload.sort_order = Number(updates.position);
  }

  if (!isSupabaseConfigured()) {
    return { data: { id: activityId, ...payload }, error: null };
  }

  const { data, error } = await supabase
    .from('activities')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', activityId)
    .select()
    .single();

  if (error) {
    console.error('Supabase updateActivity error:', error.message);
    return { data: null, error };
  }

  return { data, error: null };
};

export const deleteActivity = async (activityId) => {
  if (!isSupabaseConfigured()) {
    return { data: { id: activityId }, error: null };
  }

  const { data, error } = await supabase
    .from('activities')
    .delete()
    .eq('id', activityId);

  if (error) {
    console.error('Supabase deleteActivity error:', error.message);
    return { data: null, error };
  }

  return { data: { id: activityId }, error: null };
};

export const reorderActivities = async (tripId, reorderedActivities) => {
  if (!isSupabaseConfigured()) {
    return { data: reorderedActivities, error: null };
  }

  const updates = reorderedActivities.map((act, idx) => ({
    id: act.id,
    trip_id: tripId,
    itinerary_day_id: act.itinerary_day_id,
    sort_order: idx + 1
  }));

  const { data, error } = await supabase
    .from('activities')
    .upsert(updates);

  if (error) {
    console.error('Supabase reorderActivities error:', error.message);
    return { data: null, error };
  }

  return { data: reorderedActivities, error: null };
};

// --- SAVED TRIPS SERVICES (saved_trips table) ---

export const getSavedTrips = async (userId) => {
  if (!isSupabaseConfigured()) {
    const savedIds = getLocalWishlist(userId);
    const trips = getLocalTrips().filter(t => savedIds.includes(t.id));
    return { data: trips.map(normalizeTrip), error: null };
  }

  try {
    const { data, error } = await supabase
      .from('saved_trips')
      .select(`
        id,
        user_id,
        trip_id,
        created_at,
        trip:trips (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase getSavedTrips error:', error.message);
      return { data: [], error };
    }

    const trips = (data || []).map(row => normalizeTrip(row.trip)).filter(Boolean);
    return { data: trips, error: null };
  } catch (err) {
    console.error('Supabase getSavedTrips catch:', err);
    return { data: [], error: err };
  }
};

export const saveTrip = async (tripId, userId) => {
  if (!isSupabaseConfigured()) {
    const current = getLocalWishlist(userId);
    if (!current.includes(tripId)) setLocalWishlist(userId, [...current, tripId]);
    return { data: { trip_id: tripId }, error: null };
  }

  const { data, error } = await supabase
    .from('saved_trips')
    .insert([{ user_id: userId, trip_id: tripId }])
    .select()
    .single();

  if (error) {
    console.error('Supabase saveTrip error:', error.message);
    return { data: null, error };
  }

  return { data, error: null };
};

export const removeSavedTrip = async (tripId, userId) => {
  if (!isSupabaseConfigured()) {
    const current = getLocalWishlist(userId);
    setLocalWishlist(userId, current.filter(id => id !== tripId));
    return { data: { trip_id: tripId }, error: null };
  }

  const { data, error } = await supabase
    .from('saved_trips')
    .delete()
    .eq('user_id', userId)
    .eq('trip_id', tripId);

  if (error) {
    console.error('Supabase removeSavedTrip error:', error.message);
    return { data: null, error };
  }

  return { data: { trip_id: tripId }, error: null };
};

// --- COMPATIBILITY ADAPTERS FOR EXISTING VIEWS ---
// (Maps old stop/item queries to the real itinerary_days & activities tables)

export const getTripStops = async (tripId) => {
  const { data: days } = await getItineraryDays(tripId);
  const tripRes = await getTripById(tripId);
  const trip = tripRes.data;

  if (!days || days.length === 0) {
    return {
      data: trip ? [{ id: 'main-stop', trip_id: tripId, city: trip.destination || 'Destination', country: trip.country || '', start_date: trip.start_date, end_date: trip.end_date, position: 1 }] : [],
      error: null
    };
  }

  const stops = days.map((d, idx) => ({
    id: d.id,
    trip_id: tripId,
    city: d.notes || trip?.destination || 'Destination',
    country: trip?.country || '',
    start_date: d.date,
    end_date: d.date,
    position: idx + 1
  }));
  return { data: stops, error: null };
};

export const createTripStop = async (stopData) => {
  return { data: { id: `stop-${Date.now()}`, ...stopData }, error: null };
};
export const updateTripStop = async (stopId, tripId, updates) => {
  return { data: { id: stopId, ...updates }, error: null };
};
export const deleteTripStop = async (stopId, tripId) => {
  return { data: { id: stopId }, error: null };
};
export const reorderTripStops = async (tripId, reorderedStops) => {
  return { data: reorderedStops, error: null };
};

export const getItineraryItems = async (tripId) => {
  const [daysRes, actsRes] = await Promise.all([
    getItineraryDays(tripId),
    getActivities(tripId)
  ]);
  const days = daysRes.data || [];
  const acts = actsRes.data || [];

  const items = acts.map(a => {
    const day = days.find(d => d.id === a.itinerary_day_id);
    return {
      ...a,
      date: day?.date || '',
      cost: a.estimated_cost,
      position: a.sort_order
    };
  });
  return { data: items, error: null };
};

export const createItineraryItem = async (itemData) => {
  const tripId = itemData.tripId || itemData.trip_id;
  let dayId = itemData.itineraryDayId || itemData.itinerary_day_id;
  if (!dayId && itemData.date) {
    const { data: days } = await getItineraryDays(tripId);
    let matchedDay = (days || []).find(d => d.date === itemData.date);
    if (!matchedDay) {
      const dayNum = (days || []).length + 1;
      const { data: newDay } = await createItineraryDay({
        tripId,
        dayNumber: dayNum,
        date: itemData.date,
        notes: itemData.location || ''
      });
      matchedDay = newDay;
    }
    dayId = matchedDay?.id;
  }
  return await createActivity({
    ...itemData,
    tripId,
    itineraryDayId: dayId
  });
};

export const updateItineraryItem = async (itemId, tripId, updates) => {
  return await updateActivity(itemId, updates);
};

export const deleteItineraryItem = async (itemId, tripId) => {
  return await deleteActivity(itemId);
};

export const reorderItineraryItems = async (tripId, reorderedItems) => {
  return await reorderActivities(tripId, reorderedItems);
};

// --- GEOLOCATION & LOCATION DISCOVERY SERVICES ---

export const getGoogleMapsApiKey = () => {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key || key === 'YOUR_GOOGLE_API_KEY' || key.includes('YOUR_')) return null;
  return key;
};

export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  });
};

export const resolveLocationName = async (latitude, longitude) => {
  try {
    const res = await fetch('/api/places/reverse-geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude, longitude, lat: latitude, lng: longitude })
    });
    if (res && res.ok) {
      const data = await res.json();
      if (data.success && (data.formatted || data.formattedAddress)) {
        return {
          city: data.city,
          state: data.state,
          country: data.country,
          formatted: data.formatted || data.formattedAddress,
          formattedAddress: data.formattedAddress || data.formatted,
          source: data.source || 'Google Maps'
        };
      }
    }
  } catch (e) {
    console.warn('Backend reverse geocode error:', e);
  }

  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
    if (!res.ok) throw new Error('Failed reverse geocode');
    const data = await res.json();
    const city = data.city || data.locality || data.principalSubdivision;
    const country = data.countryName;
    if (city && country) {
      return { city, country, formatted: `${city}, ${country}`, source: 'Browser GPS' };
    }
  } catch (e) {
    console.warn('Reverse geocode warning:', e);
  }

  return {
    city: null,
    country: null,
    formatted: `${Number(latitude).toFixed(3)}°, ${Number(longitude).toFixed(3)}°`,
    source: 'GPS Coordinates'
  };
};

const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const recsCache = new Map();
const recommendationRequestCache = new Map();
const recommendationInFlight = new Map();

export const fetchGoogleNearbyPlaces = async ({ latitude, longitude, intent = 'local', budget = null, availableTimeMinutes = null }) => {
  if (!latitude || !longitude) return [];

  const cacheKey = `${intent}_${Number(latitude).toFixed(3)}_${Number(longitude).toFixed(3)}`;
  const cached = recsCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < 15000)) {
    return cached.data;
  }

  try {
    const payload = {
      location: { latitude, longitude },
      availableTime: { durationMinutes: availableTimeMinutes },
      budget,
      category: intent
    };

    const targetUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001/api/ai/recommendations' : '/api/ai/recommendations';
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.recommendations)) {
        recsCache.set(cacheKey, { timestamp: Date.now(), data: data.recommendations });
        return data.recommendations;
      }
    }
  } catch (err) {
    console.warn('Backend Places recommendation fetch warning:', err);
  }

  return [];
};

// --- DISCOVER ITINERARY CONTEXT BUILDER ---

export const getDiscoverContext = async (userId) => {
  if (!userId) {
    return {
      hasTrip: false,
      activeTrip: null,
      todayDate: new Date().toISOString().split('T')[0],
      destination: null,
      availableTimeMinutes: null,
      availableTimeFormatted: null,
      remainingBudget: null,
      occupiedItems: []
    };
  }

  const { data: userTrips } = await getUserTrips(userId);
  if (!userTrips || userTrips.length === 0) {
    return {
      hasTrip: false,
      activeTrip: null,
      todayDate: new Date().toISOString().split('T')[0],
      destination: null,
      availableTimeMinutes: null,
      availableTimeFormatted: null,
      remainingBudget: null,
      occupiedItems: []
    };
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const activeTrip = userTrips.find(t => t.start_date <= todayStr && t.end_date >= todayStr) || userTrips[0];

  if (!activeTrip) {
    return {
      hasTrip: false,
      activeTrip: null,
      todayDate: todayStr,
      destination: null,
      availableTimeMinutes: null,
      availableTimeFormatted: null,
      remainingBudget: null,
      occupiedItems: []
    };
  }

  const itineraryRes = await getTripItinerary(activeTrip.id);
  const days = itineraryRes.data?.days || [];
  const activities = itineraryRes.data?.activities || [];

  const todayDay = days.find(d => d.date === todayStr);
  const todayItems = activities.filter(a => todayDay && a.itinerary_day_id === todayDay.id);

  const activitiesCost = activities.reduce((sum, a) => sum + Number(a.estimated_cost || 0), 0);
  const totalPlannedBudget = activeTrip.budget ? Number(activeTrip.budget) : null;
  const remainingBudget = totalPlannedBudget !== null ? Math.max(0, totalPlannedBudget - activitiesCost) : null;

  const occupiedMinutes = todayItems.reduce((sum, item) => sum + Number(item.duration_minutes || 60), 0);
  const freeMinutes = Math.max(0, (10 * 60) - occupiedMinutes);
  const hours = Math.floor(freeMinutes / 60);
  const mins = freeMinutes % 60;
  const availableTimeFormatted = freeMinutes > 0 ? `${hours}h ${mins}m` : 'Full Schedule';

  let dayIndex = 1;
  if (activeTrip.start_date) {
    const start = new Date(activeTrip.start_date);
    const today = new Date(todayStr);
    const diffTime = Math.abs(today - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    dayIndex = Math.max(1, diffDays);
  }

  return {
    hasTrip: true,
    activeTrip,
    stops: days,
    todayDate: todayStr,
    dayIndex,
    destination: activeTrip.destination || activeTrip.title || activeTrip.name,
    availableTimeMinutes: freeMinutes,
    availableTimeFormatted,
    remainingBudget,
    occupiedItems: todayItems,
    availableWindows: [
      { start: '14:00', end: '18:00', durationMinutes: freeMinutes }
    ]
  };
};

// --- STRICT AI RECOMMENDATION VALIDATOR ---

export const validateRecommendationResponse = (response) => {
  if (!response || typeof response !== 'object') return false;
  if (!Array.isArray(response.recommendations)) return false;

  for (const rec of response.recommendations) {
    if (!rec.name && !rec.title) return false;
  }
  return true;
};

const getRecommendationsUncached = async (context = {}) => {
  const intentKey = (context.intent || 'local').toLowerCase();
  const coords = context.location?.coords;
  const availableMins = context.available_windows?.[0]?.duration_minutes || context.availableTimeMinutes || null;
  const budget = context.trip?.remaining_budget ?? context.remainingBudget ?? null;

  if (!coords || !coords.latitude || !coords.longitude) {
    return [];
  }

  // 1. Send request to Locora Backend API (POST /api/ai/recommendations)
  try {
    const payload = {
      location: {
        latitude: coords.latitude,
        longitude: coords.longitude,
        city: context.location?.city || null,
        country: context.location?.country || null
      },
      availableTime: {
        durationMinutes: availableMins
      },
      itinerary: context.occupiedItems || [],
      budget,
      preferences: [intentKey, 'local experiences'],
      category: intentKey
    };

    const res = await fetch('/api/ai/recommendations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }).catch(() => null);

    if (res && res.ok) {
      const result = await res.json();
      if (result.success && Array.isArray(result.recommendations) && result.recommendations.length > 0) {
        return result.recommendations.map((rec, idx) => ({
          id: rec.id || rec.placeId || `rec-server-${idx}`,
          placeId: rec.placeId || rec.id,
          name: rec.title || rec.name || 'Local Place',
          address: rec.address || (typeof rec.location === 'object' ? rec.location.name : rec.location) || 'Local Area',
          latitude: rec.latitude ?? rec.location?.lat ?? null,
          longitude: rec.longitude ?? rec.location?.lng ?? null,
          category: rec.category || intentKey.charAt(0).toUpperCase() + intentKey.slice(1),
          description: rec.description || 'Authentic place or experience near your location.',
          location: typeof rec.location === 'object' ? rec.location : { name: rec.location || 'Local Vicinity', distance_km: parseFloat(rec.distance) || 1.2 },
          distance: rec.distance || `${parseFloat(rec.location?.distance_km || 1.2).toFixed(1)} km away`,
          rating: rec.rating !== undefined ? rec.rating : null, // REAL GOOGLE RATING (NO FABRICATION)
          reviewCount: rec.reviewCount !== undefined ? rec.reviewCount : null, // REAL REVIEW COUNT
          openNow: rec.openNow ?? null,
          priceLevel: rec.priceLevel ?? null,
          priceDisplay: rec.priceDisplay || 'Price unavailable',
          durationMinutes: parseInt(rec.durationMinutes || rec.estimatedDuration || rec.duration_minutes) || 60,
          duration_minutes: parseInt(rec.durationMinutes || rec.estimatedDuration || rec.duration_minutes) || 60,
          travelMinutes: rec.travelMinutes || rec.estimated_travel_minutes || 15,
          estimated_travel_minutes: rec.travelMinutes || rec.estimated_travel_minutes || 15,
          estimated_cost: Number(rec.estimated_cost ?? rec.estimatedCost ?? rec.price ?? 0),
          currency: rec.currency || 'INR',
          whyVisit: rec.whyVisit || rec.why_it_fits || rec.whyItFits || rec.reason || (availableMins ? `Fits your ${Math.floor(availableMins / 60)}h ${availableMins % 60}m gap` : 'Verified destination near your location'),
          why_it_fits: rec.whyVisit || rec.why_it_fits || rec.whyItFits || rec.reason || (availableMins ? `Fits your ${Math.floor(availableMins / 60)}h ${availableMins % 60}m gap` : 'Verified destination near your location'),
          image: rec.image || null, // STRICTLY from original Google Place object
          googleMapsUrl: rec.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rec.title || rec.name || 'Place')}`
        }));
      }
    }
  } catch (err) {
    // Silent catch
  }

  // 2. Direct Google Places call if backend AI endpoint is unreachable
  if (coords && coords.latitude && coords.longitude) {
    const googlePlaces = await fetchGoogleNearbyPlaces({
      latitude: coords.latitude,
      longitude: coords.longitude,
      intent: intentKey,
      budget: budget || 5000,
      availableTimeMinutes: availableMins || 240
    });

    if (googlePlaces && googlePlaces.length > 0) {
      return googlePlaces;
    }
  }

  return [];
};

// React Strict Mode deliberately replays mount effects in development. Share one
// request for an identical GPS/category/context snapshot so this does not create
// duplicate Places or Gemini work on the server.
export const getRecommendations = async (context = {}) => {
  const coords = context.location?.coords;
  if (!coords || !Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) return [];

  const cacheKey = [
    Number(coords.latitude).toFixed(4),
    Number(coords.longitude).toFixed(4),
    (context.intent || 'local').toLowerCase(),
    context.trip?.id || 'no-trip',
    context.availableTimeMinutes ?? '',
    context.remainingBudget ?? ''
  ].join(':');
  const cached = recommendationRequestCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 30_000) return cached.data;
  if (recommendationInFlight.has(cacheKey)) return recommendationInFlight.get(cacheKey);

  const request = getRecommendationsUncached(context)
    .then((data) => {
      recommendationRequestCache.set(cacheKey, { timestamp: Date.now(), data });
      return data;
    })
    .finally(() => recommendationInFlight.delete(cacheKey));

  recommendationInFlight.set(cacheKey, request);
  return request;
};


// --- ADD RECOMMENDATION TO ITINERARY SERVICE ---

export const addRecommendationToItinerary = async (recommendation, tripId, dateStr = '2026-08-27') => {
  const duration = Number(recommendation.duration_minutes || 60);
  const cost = Number(recommendation.estimated_cost ?? recommendation.price ?? 0);
  const title = recommendation.name || recommendation.title || 'New Experience';
  const category = recommendation.category || 'Local';
  const locationName = typeof recommendation.location === 'object'
    ? (recommendation.location.name || 'Local Area')
    : (recommendation.location || 'Local Area');

  const { data: createdItem, error } = await createItineraryItem({
    tripId: tripId || 'trip-kyoto-active',
    date: dateStr,
    title,
    category,
    startTime: '02:00 PM',
    durationMinutes: duration,
    location: locationName,
    description: recommendation.description || 'Added from Locora Discover',
    cost
  });

  return { data: createdItem, error };
};

// --- EXPLORE DATASET & VERIFIED PLACE DISCOVERY SERVICES ---
// STRICT IMAGE INTEGRITY: Every image MUST belong to the EXACT place entity or be null.

const VERIFIED_INITIAL_EXPERIENCES = [
  {
    id: 'exp-kyoto-fushimi',
    placeId: 'ChIJz2xYq_INAWARK4q3f2vY_3A',
    name: 'Fushimi Inari Taisha',
    address: '68 Fukakusa Yabunouchicho, Fushimi Ward, Kyoto',
    location: { city: 'Kyoto', country: 'Japan', lat: 34.9671, lng: 135.7727 },
    category: 'Culture',
    type: 'Attraction',
    description: 'Iconic Shinto shrine renowned for its scenic mountain paths enveloped by over 10,000 vermilion torii gates.',
    rating: 4.7,
    reviewCount: 52400,
    priceLevel: 0,
    priceDisplay: 'Free',
    image: 'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?auto=format&fit=crop&w=800&q=80',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Fushimi+Inari+Taisha+Kyoto&query_place_id=ChIJz2xYq_INAWARK4q3f2vY_3A',
    tags: ['kyoto', 'japan', 'shinto', 'shrine', 'culture', 'heritage', 'temple', 'hiking'],
    verified: true
  },
  {
    id: 'exp-kyoto-kinkakuji',
    placeId: 'ChIJb6e9-hINAWARsC-rQO0pW3k',
    name: 'Kinkaku-ji (Golden Pavilion)',
    address: '1 Kinkakujicho, Kita Ward, Kyoto',
    location: { city: 'Kyoto', country: 'Japan', lat: 35.0394, lng: 135.7292 },
    category: 'Culture',
    type: 'Attraction',
    description: 'Zen Buddhist temple with the top two floors completely covered in gold leaf, reflecting over Mirror Pond.',
    rating: 4.5,
    reviewCount: 38200,
    priceLevel: 1,
    priceDisplay: 'Price varies',
    image: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=800&q=80',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Kinkaku-ji+Kyoto&query_place_id=ChIJb6e9-hINAWARsC-rQO0pW3k',
    tags: ['kyoto', 'japan', 'zen', 'temple', 'culture', 'heritage', 'gold pavilion'],
    verified: true
  },
  {
    id: 'exp-kyoto-arashiyama',
    placeId: 'ChIJz2rYjF4MAWARyT9QdJ86aVo',
    name: 'Arashiyama Bamboo Grove',
    address: 'Sagatenryuji Sagano, Ukyo Ward, Kyoto',
    location: { city: 'Kyoto', country: 'Japan', lat: 35.0169, lng: 135.6713 },
    category: 'Nature',
    type: 'Attraction',
    description: 'Atmospheric path sheltered by soaring natural green bamboo stalks located in western Kyoto.',
    rating: 4.6,
    reviewCount: 29800,
    priceLevel: 0,
    priceDisplay: 'Free',
    image: null,
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Arashiyama+Bamboo+Grove+Kyoto&query_place_id=ChIJz2rYjF4MAWARyT9QdJ86aVo',
    tags: ['kyoto', 'japan', 'nature', 'bamboo', 'scenic', 'forest', 'walk'],
    verified: true
  },
  {
    id: 'exp-goa-bom-jesus',
    placeId: 'ChIJbU5qgZ_cvzsRLG9t6qMvjVE',
    name: 'Basilica of Bom Jesus',
    address: 'Old Goa Road, Bainguinim, Goa',
    location: { city: 'Goa', country: 'India', lat: 15.5009, lng: 73.9116 },
    category: 'Culture',
    type: 'Attraction',
    description: '16th-century UNESCO World Heritage Baroque basilica holding the mortal remains of St. Francis Xavier.',
    rating: 4.6,
    reviewCount: 31500,
    priceLevel: 0,
    priceDisplay: 'Free',
    image: null,
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Basilica+of+Bom+Jesus+Goa&query_place_id=ChIJbU5qgZ_cvzsRLG9t6qMvjVE',
    tags: ['goa', 'india', 'unesco', 'heritage', 'church', 'culture', 'history'],
    verified: true
  },
  {
    id: 'exp-goa-fontainhas',
    placeId: 'ChIJn3uP8bravzsRM3r6XbW2D3E',
    name: 'Fontainhas Heritage Quarter',
    address: 'Altinho, Panaji, Goa',
    location: { city: 'Goa', country: 'India', lat: 15.4989, lng: 73.8315 },
    category: 'Culture',
    type: 'Experience',
    description: 'Historic Latin Quarter in Panaji known for Portuguese colonial architecture, narrow cobblestone streets, and tiled roofs.',
    rating: 4.5,
    reviewCount: 14200,
    priceLevel: 0,
    priceDisplay: 'Free',
    image: null,
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Fontainhas+Panaji+Goa&query_place_id=ChIJn3uP8bravzsRM3r6XbW2D3E',
    tags: ['goa', 'india', 'culture', 'architecture', 'portuguese', 'heritage', 'walk'],
    verified: true
  },
  {
    id: 'exp-goa-dudhsagar',
    placeId: 'ChIJ42wKq8P9vzsRhF0e7t3_a8E',
    name: 'Dudhsagar Waterfalls',
    address: 'Sonaulim, Bhagwan Mahavir Sanctuary, Goa',
    location: { city: 'Goa', country: 'India', lat: 15.3144, lng: 74.3143 },
    category: 'Nature',
    type: 'Attraction',
    description: 'Four-tiered white waterfall cascade on the Mandovi River located within dense Western Ghats jungle reserves.',
    rating: 4.6,
    reviewCount: 22400,
    priceLevel: 1,
    priceDisplay: 'Price varies',
    image: null,
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Dudhsagar+Waterfalls+Goa&query_place_id=ChIJ42wKq8P9vzsRhF0e7t3_a8E',
    tags: ['goa', 'india', 'nature', 'waterfall', 'trekking', 'scenic', 'jungle'],
    verified: true
  },
  {
    id: 'exp-jaipur-amer-fort',
    placeId: 'ChIJ0VqYwQjcbTkR1H8914D1h7I',
    name: 'Amer Fort & Palace',
    address: 'Devisinghpura, Amer, Jaipur, Rajasthan',
    location: { city: 'Jaipur', country: 'India', lat: 26.9855, lng: 75.8513 },
    category: 'Culture',
    type: 'Attraction',
    description: 'Hilltop fort palace crafted from red sandstone and marble, overlooking Maota Lake with the famous Sheesh Mahal mirror hall.',
    rating: 4.6,
    reviewCount: 96500,
    priceLevel: 1,
    priceDisplay: 'Price varies',
    image: 'https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=800&q=80',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Amer+Fort+Jaipur&query_place_id=ChIJ0VqYwQjcbTkR1H8914D1h7I',
    tags: ['jaipur', 'india', 'rajasthan', 'fort', 'heritage', 'palace', 'culture', 'history'],
    verified: true
  },
  {
    id: 'exp-jaipur-city-palace',
    placeId: 'ChIJ7Yv1Z3LcbTkR0N4B8aM3i1s',
    name: 'City Palace, Jaipur',
    address: 'Tulsi Marg, Gangori Bazaar, J.D.A. Market, Pink City, Jaipur',
    location: { city: 'Jaipur', country: 'India', lat: 26.9258, lng: 75.8236 },
    category: 'Culture',
    type: 'Attraction',
    description: 'Grand royal residence combining Rajput, Mughal, and European architectural styles with museum courtyards.',
    rating: 4.5,
    reviewCount: 68400,
    priceLevel: 1,
    priceDisplay: 'Price varies',
    image: null,
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=City+Palace+Jaipur&query_place_id=ChIJ7Yv1Z3LcbTkR0N4B8aM3i1s',
    tags: ['jaipur', 'india', 'rajasthan', 'palace', 'museum', 'culture', 'royal'],
    verified: true
  },
  {
    id: 'exp-thane-talaopali',
    placeId: 'ChIJk7Qv9xK_5zsR7Y1m9tF2aVw',
    name: 'Talao Pali (Masunda Lake)',
    address: 'Jambli Naka, Thane West, Thane, Maharashtra',
    location: { city: 'Thane', country: 'India', lat: 19.1932, lng: 72.9723 },
    category: 'Nature',
    type: 'Attraction',
    description: 'Historic city lake surrounded by lakeside promenades, Shivaji Maharaj statue, boating, and traditional street food stalls.',
    rating: 4.4,
    reviewCount: 18200,
    priceLevel: 0,
    priceDisplay: 'Free',
    image: null,
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Talao+Pali+Thane&query_place_id=ChIJk7Qv9xK_5zsR7Y1m9tF2aVw',
    tags: ['thane', 'mumbai', 'india', 'lake', 'nature', 'promenade', 'local'],
    verified: true
  },
  {
    id: 'exp-thane-kopineshwar',
    placeId: 'ChIJb6e9_xK_5zsRsN9m9tF2bCw',
    name: 'Shree Kopineshwar Mandir',
    address: 'Station Road, Jambli Naka, Thane West, Thane, Maharashtra',
    location: { city: 'Thane', country: 'India', lat: 19.1915, lng: 72.9735 },
    category: 'Culture',
    type: 'Attraction',
    description: 'Ancient Shiva temple built during the Shilahara dynasty, holding historical significance as the patron deity of Thane.',
    rating: 4.7,
    reviewCount: 6500,
    priceLevel: 0,
    priceDisplay: 'Free',
    image: null,
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Kopineshwar+Mandir+Thane&query_place_id=ChIJb6e9_xK_5zsRsN9m9tF2bCw',
    tags: ['thane', 'mumbai', 'india', 'temple', 'heritage', 'culture', 'ancient'],
    verified: true
  }
];

export const getExploreItems = async () => {
  try {
    const res = await fetch('/api/places/explore-search');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.items) && data.items.length > 0) {
        return { data: data.items, error: null };
      }
    }
  } catch (e) {
    console.warn('Explore search backend fetch warning, using verified repository:', e);
  }
  return { data: VERIFIED_INITIAL_EXPERIENCES, error: null };
};

export const searchExploreItems = async (query = '', filters = {}, sortOption = 'Recommended') => {
  let items = [...VERIFIED_INITIAL_EXPERIENCES];

  try {
    const res = await fetch('/api/places/explore-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query.trim(),
        category: filters.category || 'All',
        price: filters.price || 'Any',
        type: filters.type || 'All'
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.items)) {
        items = data.items;
      }
    }
  } catch (err) {
    console.warn('Fallback to memory filtering for explore items:', err);
  }

  // Pure memory filtering as fallback/enhancement
  const q = query.trim().toLowerCase();
  if (q) {
    items = items.filter(item => {
      const nameMatch = (item.name || '').toLowerCase().includes(q);
      const cityMatch = (item.location?.city || '').toLowerCase().includes(q);
      const countryMatch = (item.location?.country || '').toLowerCase().includes(q);
      const catMatch = (item.category || '').toLowerCase().includes(q);
      const typeMatch = (item.type || '').toLowerCase().includes(q);
      const descMatch = (item.description || '').toLowerCase().includes(q);
      const tagMatch = (item.tags || []).some(t => t.toLowerCase().includes(q));
      const addressMatch = (item.address || '').toLowerCase().includes(q);
      return nameMatch || cityMatch || countryMatch || catMatch || typeMatch || descMatch || tagMatch || addressMatch;
    });
  }

  if (filters.category && filters.category !== 'All') {
    items = items.filter(i => (i.category || '').toLowerCase() === filters.category.toLowerCase());
  }

  if (filters.price && filters.price !== 'Any') {
    if (filters.price === 'Budget' || filters.price.toLowerCase() === 'free') {
      items = items.filter(i => i.priceLevel === 0 || i.priceDisplay === 'Free' || i.priceLevel === 1);
    } else if (filters.price === 'Moderate') {
      items = items.filter(i => i.priceLevel === 2 || i.priceDisplay === 'Price varies');
    }
  }

  if (filters.type && filters.type !== 'All') {
    items = items.filter(i => (i.type || '').toLowerCase() === filters.type.toLowerCase());
  }

  // Sorting
  if (sortOption === 'Highest Rated') {
    items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sortOption === 'Price: Low to High') {
    items.sort((a, b) => (a.priceLevel || 0) - (b.priceLevel || 0));
  } else if (sortOption === 'Price: High to Low') {
    items.sort((a, b) => (b.priceLevel || 0) - (a.priceLevel || 0));
  } else if (sortOption === 'A–Z') {
    items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } else if (sortOption === 'Most Popular') {
    items.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
  }

  return items;
};

// --- SINGLE SOURCE OF TRUTH: PRE-PLANNED MULTI-DAY ITINERARIES ---

export const getReadyMadeTrips = () => {
  return READY_MADE_TRIPS;
};

export const getFeaturedItineraries = () => {
  return READY_MADE_TRIPS.slice(0, 3);
};

// --- WISHLIST INTEGRATION SERVICES ---

export const READY_MADE_TRIPS = [
  {
    id: 'rmt-kyoto-7d',
    title: '7 Days in Kyoto & Osaka',
    name: '7 Days in Kyoto & Osaka',
    destination: 'Kyoto & Osaka, Japan',
    country: 'Japan',
    country_code: 'JP',
    cover_image_url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
    cover_image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
    description: 'Immerse in bamboo groves, historic geisha districts, ancient shrines, and vibrant street food.',
    duration: '7 Days',
    days_count: 7,
    budget: 68500,
    currency: 'INR',
    is_ready_made: true,
    days: [
      {
        day: 1,
        title: 'Arrival in Kyoto & Gion Twilight Walk',
        activities: [
          { start_time: '02:00 PM', title: 'Check-in at Machiya Townhouse', location: 'Higashiyama, Kyoto', estimated_cost: 0, description: 'Settle into authentic wooden townhouse quarters.', category: 'Sightseeing' },
          { start_time: '05:30 PM', title: 'Gion Lantern-Lit Alleyways Stroll', location: 'Gion District', estimated_cost: 0, description: 'Guided evening walk through historic teahouse lanes.', category: 'Culture' },
          { start_time: '07:30 PM', title: 'Kaiseki Multi-Course Dinner', location: 'Pontocho Alley', estimated_cost: 3200, description: 'Seasonal Kyoto culinary tasting menu by the Kamogawa river.', category: 'Food' }
        ]
      },
      {
        day: 2,
        title: 'Arashiyama Bamboo Forest & Tenryu-ji',
        activities: [
          { start_time: '08:00 AM', title: 'Arashiyama Bamboo Sanctuary Walk', location: 'Arashiyama', estimated_cost: 0, description: 'Early morning tranquility in soaring green bamboo groves.', category: 'Nature' },
          { start_time: '10:30 AM', title: 'Tenryu-ji Zen Landscape Garden', location: 'Arashiyama', estimated_cost: 300, description: 'Unesco World Heritage 14th-century Zen garden.', category: 'Culture' },
          { start_time: '02:00 PM', title: 'Iwatayama Monkey Park Hike', location: 'Mount Arashiyama', estimated_cost: 350, description: 'Panoramic city lookout surrounded by wild macaques.', category: 'Adventure' }
        ]
      },
      {
        day: 3,
        title: 'Fushimi Inari Gates & Sake Tasting',
        activities: [
          { start_time: '07:30 AM', title: 'Fushimi Inari 10,000 Torii Shrine', location: 'Fushimi', estimated_cost: 0, description: 'Hike mountain paths under iconic vermilion shrine gates.', category: 'Culture' },
          { start_time: '01:00 PM', title: 'Fushimi Sake Brewery Tour', location: 'Fushimi Canals', estimated_cost: 1200, description: 'Sample artisanal unpasteurized sakes in canal-side breweries.', category: 'Food' }
        ]
      },
      {
        day: 4,
        title: 'Kinkaku-ji & Golden Pavilion Gardens',
        activities: [
          { start_time: '09:00 AM', title: 'Kinkaku-ji Golden Pavilion', location: 'Northern Kyoto', estimated_cost: 300, description: 'Iconic Zen temple clad in leaf gold reflecting over Mirror Pond.', category: 'Culture' },
          { start_time: '01:30 PM', title: 'Traditional Matcha Tea Ceremony Workshop', location: 'Daitoku-ji', estimated_cost: 1500, description: 'Learn tea whisking etiquette from a Kyoto tea master.', category: 'Workshop' }
        ]
      },
      {
        day: 5,
        title: 'Day Trip to Nara Deer Park & Todai-ji',
        activities: [
          { start_time: '09:00 AM', title: 'Express Train to Nara', location: 'Nara Park', estimated_cost: 400, description: 'Meet free-roaming sacred deer in ancient cedar groves.', category: 'Nature' },
          { start_time: '11:00 AM', title: 'Todai-ji Great Bronze Buddha Temple', location: 'Nara', estimated_cost: 400, description: 'World’s largest wooden building housing a giant bronze Buddha.', category: 'Culture' }
        ]
      },
      {
        day: 6,
        title: 'Osaka Dotonbori & Street Food Safari',
        activities: [
          { start_time: '11:00 AM', title: 'Transfer to Osaka & Shinsaibashi Walk', location: 'Osaka', estimated_cost: 350, description: 'Bustling covered shopping arcades.', category: 'Shopping' },
          { start_time: '05:00 PM', title: 'Dotonbori Neon Canal & Takoyaki Tasting', location: 'Dotonbori', estimated_cost: 1200, description: 'Sample hot octopus balls and kushikatsu under Glico Man neon.', category: 'Food' }
        ]
      },
      {
        day: 7,
        title: 'Osaka Castle & Departure',
        activities: [
          { start_time: '09:30 AM', title: 'Osaka Castle Citadel & Park', location: 'Chuo-ku, Osaka', estimated_cost: 400, description: 'Explore historic Maru ramparts and samurai museum galleries.', category: 'Culture' }
        ]
      }
    ]
  },
  {
    id: 'rmt-goa-5d',
    title: '5 Days Goan Cultural & Coastal Trail',
    name: '5 Days Goan Cultural & Coastal Trail',
    destination: 'Goa, India',
    country: 'India',
    country_code: 'IN',
    cover_image_url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
    cover_image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
    description: 'Explore Asia’s oldest Portuguese Latin Quarter, lush organic spice groves, Dudhsagar waterfalls, and artisan bazaars.',
    duration: '5 Days',
    days_count: 5,
    budget: 18500,
    currency: 'INR',
    is_ready_made: true,
    days: [
      {
        day: 1,
        title: 'Fontainhas Heritage Walk & Bakery Crawl',
        activities: [
          { start_time: '10:00 AM', title: 'Fontainhas Portuguese Latin Quarter Walk', location: 'Panaji', estimated_cost: 0, description: 'Color-splashed Portuguese villas, azulejo tiles, and art studios.', category: 'Culture' },
          { start_time: '01:00 PM', title: '31st January Bakery Bebinca Tasting', location: 'Fontainhas', estimated_cost: 250, description: 'Sample traditional 7-layer Goan Bebinca dessert.', category: 'Food' },
          { start_time: '05:30 PM', title: 'Mandovi River Sunset Promenade Walk', location: 'Panaji', estimated_cost: 0, description: 'Evening breeze along riverside jetties.', category: 'Sightseeing' }
        ]
      },
      {
        day: 2,
        title: 'Organic Spice Plantation & Traditional Feast',
        activities: [
          { start_time: '10:00 AM', title: 'Ponda Organic Spice Plantation Guided Walk', location: 'Ponda', estimated_cost: 500, description: 'Smell fresh cardamom, nutmeg, pepper, and cinnamon.', category: 'Nature' },
          { start_time: '01:00 PM', title: 'Banana-Leaf Traditional Goan Lunch', location: 'Ponda', estimated_cost: 450, description: 'Authentic fish curry rice and Solkadhi feast.', category: 'Food' }
        ]
      },
      {
        day: 3,
        title: 'Dudhsagar Waterfall Jeep Safari',
        activities: [
          { start_time: '07:00 AM', title: 'Bhagwan Mahavir Sanctuary Jeep Drive', location: 'Mollem', estimated_cost: 1200, description: 'Jungle trek and jeep safari to four-tiered white cascades.', category: 'Adventure' }
        ]
      },
      {
        day: 4,
        title: 'Old Goa Cathedrals & Archaeological Museum',
        activities: [
          { start_time: '09:30 AM', title: 'Basilica of Bom Jesus Heritage Tour', location: 'Old Goa', estimated_cost: 0, description: '16th-century Baroque architecture landmark.', category: 'Culture' },
          { start_time: '02:00 PM', title: 'Se Cathedral & Convent of St. Francis', location: 'Old Goa', estimated_cost: 0, description: 'Ancient vaulted cathedrals and colonial art.', category: 'Culture' }
        ]
      },
      {
        day: 5,
        title: 'Anjuna Flea Market & Sunset Lookout',
        activities: [
          { start_time: '11:00 AM', title: 'Anjuna Open-Air Flea Market', location: 'Anjuna', estimated_cost: 0, description: 'Handcrafted jewelry, woven hammocks, and local crafts.', category: 'Shopping' }
        ]
      }
    ]
  },
  {
    id: 'rmt-jaipur-3d',
    title: '3 Days Golden Triangle Jaipur Heritage',
    name: '3 Days Golden Triangle Jaipur Heritage',
    destination: 'Jaipur, India',
    country: 'India',
    country_code: 'IN',
    cover_image_url: 'https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=800&q=80',
    cover_image: 'https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=800&q=80',
    description: 'Fortress ramparts, royal palaces, block-printing artisan workshops, and vibrant bazaar food walks.',
    duration: '3 Days',
    days_count: 3,
    budget: 14500,
    currency: 'INR',
    is_ready_made: true,
    days: [
      {
        day: 1,
        title: 'Amer Fort Citadel & Sheesh Mahal',
        activities: [
          { start_time: '08:30 AM', title: 'Amer Fort Hilltop Ramparts Exploration', location: 'Amer', estimated_cost: 500, description: 'Explore Maota Lake views and Mirror Palace.', category: 'Culture' },
          { start_time: '02:00 PM', title: 'Stepwell Panna Meena ka Kund', location: 'Amer', estimated_cost: 0, description: 'Geometric symmetrical stepwell architecture.', category: 'Sightseeing' }
        ]
      },
      {
        day: 2,
        title: 'City Palace & Block Printing Workshop',
        activities: [
          { start_time: '09:30 AM', title: 'Jaipur City Palace & Royal Armoury', location: 'Pink City', estimated_cost: 700, description: 'Maharaja museum galleries and Peacock Courtyard.', category: 'Culture' },
          { start_time: '02:00 PM', title: 'Bagru Natural Dye Block-Printing Studio', location: 'Sanganer', estimated_cost: 900, description: 'Carve teak blocks and print your own cotton scarf.', category: 'Workshop' }
        ]
      },
      {
        day: 3,
        title: 'Hawa Mahal Sunrise & Johari Bazaar',
        activities: [
          { start_time: '06:30 AM', title: 'Hawa Mahal Palace of Winds Golden Hour', location: 'Pink City', estimated_cost: 200, description: 'View 953 honeycomb pink sandstone windows.', category: 'Sightseeing' },
          { start_time: '11:00 AM', title: 'Johari Bazaar Lac Bangle & Spice Walk', location: 'Old City', estimated_cost: 0, description: 'Bustling traditional artisan bazaar.', category: 'Shopping' }
        ]
      }
    ]
  }
];

const getLocalWishlist = (userId = 'guest') => {
  const key = `locora_wishlist_${userId}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    try { return JSON.parse(stored); } catch (e) { console.error(e); }
  }
  const defaults = ['rmt-kyoto-7d', 'rmt-goa-5d', 'exp-goa-1'];
  localStorage.setItem(key, JSON.stringify(defaults));
  return defaults;
};

const setLocalWishlist = (userId, ids) => {
  localStorage.setItem(`locora_wishlist_${userId}`, JSON.stringify(ids));
};

export const getSavedWishlistIds = async (userId) => {
  if (!userId) return { data: [], error: null };

  if (!isSupabaseConfigured() || !isValidUUID(userId)) {
    return { data: getLocalWishlist(userId), error: null };
  }

  try {
    const { data, error } = await supabase
      .from('saved_trips')
      .select('trip_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase getSavedWishlistIds error:', error.message);
      throw error;
    }

    const ids = (data || []).map(r => r.trip_id).filter(Boolean);
    return { data: ids, error: null };
  } catch (err) {
    console.error('getSavedWishlistIds catch:', err);
    throw err;
  }
};

export const toggleSaveWishlistItem = async (itemOrId, userId) => {
  if (!userId) {
    throw new Error('User must be logged in to save trips.');
  }

  const itemId = typeof itemOrId === 'string' ? itemOrId : (itemOrId?.id || itemOrId?.placeId || itemOrId?.trip_id);

  if (isSupabaseConfigured() && isValidUUID(itemId) && isValidUUID(userId)) {
    try {
      const { data: existing, error: checkErr } = await supabase
        .from('saved_trips')
        .select('id, trip_id')
        .eq('user_id', userId)
        .eq('trip_id', itemId)
        .maybeSingle();

      if (checkErr) {
        console.error('Supabase toggleSaveWishlistItem lookup error:', checkErr.message);
        throw checkErr;
      }

      if (existing) {
        // Unsave
        const { error: deleteErr } = await supabase
          .from('saved_trips')
          .delete()
          .eq('user_id', userId)
          .eq('trip_id', itemId);

        if (deleteErr) {
          console.error('Supabase toggleSaveWishlistItem delete error:', deleteErr.message);
          throw deleteErr;
        }

        return { data: { isSaved: false, itemId }, error: null };
      } else {
        // Save
        const { error: insertErr } = await supabase
          .from('saved_trips')
          .insert([{ user_id: userId, trip_id: itemId }]);

        if (insertErr) {
          console.error('Supabase toggleSaveWishlistItem insert error:', insertErr.message);
          throw insertErr;
        }

        return { data: { isSaved: true, itemId }, error: null };
      }
    } catch (err) {
      console.error('toggleSaveWishlistItem catch:', err);
      throw err;
    }
  }

  // Fallback for non-UUID / offline local storage (e.g. explore items)
  const current = getLocalWishlist(userId);
  const isSaved = current.includes(itemId);
  const updated = isSaved ? current.filter(id => id !== itemId) : [...current, itemId];
  setLocalWishlist(userId, updated);
  return { data: { isSaved: !isSaved, itemId }, error: null };
};

export const getWishlistTrips = async (userId) => {
  if (!userId) return { data: [], error: null };

  if (!isSupabaseConfigured() || !isValidUUID(userId)) {
    const wishlistIds = getLocalWishlist(userId);
    const wishlistedReadyMade = READY_MADE_TRIPS.filter(t => wishlistIds.includes(t.id));
    const exploreItems = VERIFIED_INITIAL_EXPERIENCES.filter(e => wishlistIds.includes(e.id));
    const userTrips = (await getUserTrips(userId)).data || [];
    const userWishlistTrips = userTrips.filter(t => t.is_wishlist);
    return { data: [...wishlistedReadyMade, ...exploreItems, ...userWishlistTrips].map(normalizeTrip), error: null };
  }

  try {
    // 1. Fetch saved_trips rows for this user
    const { data: savedRows, error: savedErr } = await supabase
      .from('saved_trips')
      .select('trip_id')
      .eq('user_id', userId);

    if (savedErr) {
      console.error('Supabase getWishlistTrips saved_trips error:', savedErr.message);
      throw savedErr;
    }

    const tripIds = (savedRows || []).map(r => r.trip_id).filter(isValidUUID);
    let savedTrips = [];

    if (tripIds.length > 0) {
      const { data: tripsData, error: tripsErr } = await supabase
        .from('trips')
        .select('*')
        .in('id', tripIds);

      if (tripsErr) {
        console.error('Supabase getWishlistTrips trips error:', tripsErr.message);
        throw tripsErr;
      }

      savedTrips = (tripsData || []).map(t => ({
        ...normalizeTrip(t),
        is_wishlist: true
      }));
    }

    return { data: savedTrips, error: null };
  } catch (err) {
    console.error('getWishlistTrips catch:', err);
    throw err;
  }
};

export const createTripFromReadyMade = async (readyMadeTrip, userId, options = {}) => {
  if (!userId || (isSupabaseConfigured() && !isValidUUID(userId))) {
    throw new Error('User authentication required to create trips.');
  }

  if (!readyMadeTrip) {
    throw new Error('No template provided.');
  }

  const templateId = readyMadeTrip?.id || (typeof readyMadeTrip === 'string' ? readyMadeTrip : '');

  // If the template is a real Supabase trip (has a UUID), copy via copyPublicTrip
  if (isSupabaseConfigured() && isValidUUID(templateId)) {
    return await copyPublicTrip(templateId, userId, options);
  }

  // Fallback for static mock templates
  const fullTemplate = READY_MADE_TRIPS.find(t => t.id === templateId) || (typeof readyMadeTrip === 'object' ? readyMadeTrip : {});
  const templateDaysCount = fullTemplate.days_count || (fullTemplate.days ? fullTemplate.days.length : 5);
  const startDate = options.startDate || readyMadeTrip.start_date || new Date().toISOString().split('T')[0];
  const endDate = options.endDate || readyMadeTrip.end_date || new Date(new Date(startDate).getTime() + (templateDaysCount - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const budget = options.budget !== undefined && options.budget !== null && !isNaN(Number(options.budget))
    ? Number(options.budget)
    : (Number(fullTemplate.budget) || Number(readyMadeTrip.budget) || 30000);

  const title = fullTemplate.title || fullTemplate.name || 'New Travel Itinerary';
  const description = fullTemplate.description || '';
  const destination = fullTemplate.destination || fullTemplate.location?.city || 'Custom Destination';
  const country = fullTemplate.country || '';
  const country_code = fullTemplate.country_code || fullTemplate.countryCode || '';
  const cover_image_url = fullTemplate.cover_image_url || fullTemplate.cover_image || fullTemplate.image || 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80';

  const { data: newTrip, error: tripErr } = await createTrip({
    userId,
    title,
    description,
    destination,
    country,
    country_code,
    startDate,
    endDate,
    status: 'upcoming',
    is_public: false,
    trip_source: 'personal',
    cover_image_url,
    budget
  });

  if (tripErr || !newTrip) {
    throw tripErr || new Error('Failed to create trip from template.');
  }

  // Copy local template itinerary days and activities
  const sDateObj = new Date(startDate);

  if (fullTemplate.days && Array.isArray(fullTemplate.days) && fullTemplate.days.length > 0) {
    for (let i = 0; i < fullTemplate.days.length; i++) {
      const templateDay = fullTemplate.days[i];
      const dayNumber = templateDay.day || (i + 1);
      const dayDate = new Date(sDateObj.getTime() + (dayNumber - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const dayNotes = templateDay.title || templateDay.notes || '';

      const { data: createdDay, error: dayErr } = await createItineraryDay({
        tripId: newTrip.id,
        dayNumber,
        date: dayDate,
        notes: dayNotes
      });

      if (dayErr || !createdDay) {
        console.error('Failed to create itinerary day:', dayErr);
        continue;
      }

      if (templateDay.activities && Array.isArray(templateDay.activities)) {
        for (let actIdx = 0; actIdx < templateDay.activities.length; actIdx++) {
          const act = templateDay.activities[actIdx];
          await createActivity({
            tripId: newTrip.id,
            itineraryDayId: createdDay.id,
            title: act.title,
            description: act.description || '',
            category: act.category || 'Sightseeing',
            location: act.location || destination,
            address: act.address || '',
            country: act.country || country,
            countryCode: act.country_code || country_code,
            startTime: act.start_time || act.time || '10:00 AM',
            endTime: act.end_time || null,
            durationMinutes: Number(act.duration_minutes || act.durationMinutes) || 60,
            estimatedCost: Number(act.estimated_cost || act.cost) || 0,
            currency: act.currency || fullTemplate.currency || 'INR',
            imageUrl: act.image_url || act.image || null,
            is_local_experience: Boolean(act.is_local_experience),
            is_cultural_experience: Boolean(act.is_cultural_experience),
            source: 'template',
            sortOrder: actIdx + 1
          });
        }
      }
    }
  }

  return { data: newTrip, error: null };
};

// --- PUBLIC COMMUNITY TRIPS SERVICES ---

export const getPublicTrips = async () => {
  if (!isSupabaseConfigured()) {
    const trips = getLocalTrips();
    const publicOnly = trips.filter(t => t.is_public === true);
    return { data: publicOnly.map(normalizeTrip), error: null };
  }

  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('is_public', true)
      .eq('trip_source', 'community')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase getPublicTrips error:', error.message);
      throw error;
    }
    return { data: (data || []).map(normalizeTrip), error: null };
  } catch (err) {
    console.error('getPublicTrips catch:', err);
    throw err;
  }
};

export const searchPublicTrips = (tripsOrQuery = [], queryOrDuration = '', filterDuration = 'All', sortOption = 'Recommended') => {
  let trips = [];
  let query = '';
  let duration = 'All';
  let sort = 'Recommended';

  if (Array.isArray(tripsOrQuery)) {
    trips = tripsOrQuery;
    query = typeof queryOrDuration === 'string' ? queryOrDuration : '';
    duration = filterDuration || 'All';
    sort = sortOption || 'Recommended';
  } else {
    trips = getLocalTrips().filter(t => t.is_public === true).map(normalizeTrip);
    query = typeof tripsOrQuery === 'string' ? tripsOrQuery : '';
    duration = typeof queryOrDuration === 'string' ? queryOrDuration : 'All';
    sort = typeof filterDuration === 'string' ? filterDuration : 'Recommended';
  }

  let results = [...trips];

  const q = query.trim().toLowerCase();
  if (q) {
    results = results.filter(t => {
      const titleMatch = (t.title || t.name || '').toLowerCase().includes(q);
      const descMatch = (t.description || '').toLowerCase().includes(q);
      const destMatch = (t.destination || '').toLowerCase().includes(q);
      const countryMatch = (t.country || '').toLowerCase().includes(q);
      const authorMatch = (t.author_name || '').toLowerCase().includes(q);
      const stopMatch = Array.isArray(t.stops) && t.stops.some(s => String(s).toLowerCase().includes(q));
      return titleMatch || descMatch || destMatch || countryMatch || authorMatch || stopMatch;
    });
  }

  const getTripDaysCount = (t) => {
    if (t.days_count) return Number(t.days_count);
    if (t.start_date && t.end_date) {
      const start = new Date(t.start_date);
      const end = new Date(t.end_date);
      const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
      if (!isNaN(diffDays) && diffDays > 0) return diffDays;
    }
    return 1;
  };

  if (duration !== 'All') {
    results = results.filter(t => {
      const days = getTripDaysCount(t);
      if (duration === '1-3') return days <= 3;
      if (duration === '4-7') return days >= 4 && days <= 7;
      if (duration === '8+') return days >= 8;
      return true;
    });
  }

  if (sort === 'Newest') {
    results.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  } else if (sort === 'Duration') {
    results.sort((a, b) => getTripDaysCount(b) - getTripDaysCount(a));
  }

  return results;
};

export const getTripItinerary = async (tripId) => {
  if (!tripId || !isValidUUID(tripId)) {
    console.warn('getTripItinerary called with non-UUID tripId:', tripId);
    return { data: { days: [], activities: [] }, error: null };
  }

  if (!isSupabaseConfigured()) {
    const daysRes = await getItineraryDays(tripId);
    const actsRes = await getActivities(tripId);
    const normalizedActivities = (actsRes.data || []).map(normalizeActivity);
    const days = (daysRes.data || []).map(day => ({
      ...day,
      activities: normalizedActivities.filter(a => a.itinerary_day_id === day.id)
    }));
    return { data: { days, activities: normalizedActivities }, error: null };
  }

  try {
    // 1. Fetch itinerary_days for this trip
    const { data: daysData, error: daysError } = await supabase
      .from('itinerary_days')
      .select('*')
      .eq('trip_id', tripId)
      .order('day_number', { ascending: true });

    if (daysError) {
      console.error('Supabase getTripItinerary days error:', daysError.message);
      throw daysError;
    }

    // 2. Fetch activities for this trip
    const { data: actsData, error: actsError } = await supabase
      .from('activities')
      .select('*')
      .eq('trip_id', tripId)
      .order('sort_order', { ascending: true });

    if (actsError) {
      console.error('Supabase getTripItinerary activities error:', actsError.message);
      throw actsError;
    }

    const normalizedActivities = (actsData || []).map(normalizeActivity);

    // Group activities under their respective itinerary_days
    const days = (daysData || []).map(day => ({
      ...day,
      activities: normalizedActivities.filter(a => a.itinerary_day_id === day.id)
    }));

    return {
      data: {
        days,
        activities: normalizedActivities
      },
      error: null
    };
  } catch (err) {
    console.error('getTripItinerary catch:', err);
    throw err;
  }
};

export const copyPublicTrip = async (publicTripId, currentUserId, options = {}) => {
  if (!currentUserId || (isSupabaseConfigured() && !isValidUUID(currentUserId))) {
    throw new Error('Authentication required to copy trips.');
  }

  if (!publicTripId || (isSupabaseConfigured() && !isValidUUID(publicTripId))) {
    throw new Error('Invalid trip ID.');
  }

  if (!isSupabaseConfigured()) {
    const publicRes = await getTripById(publicTripId);
    const sourceTrip = publicRes.data;
    if (!sourceTrip) {
      throw new Error('This itinerary is not available.');
    }
    const copiedTitle = sourceTrip.title || sourceTrip.name || 'Copied Trip';
    const startDate = options.startDate || new Date().toISOString().split('T')[0];
    const endDate = options.endDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const newTrip = normalizeTrip({
      id: `trip-copy-${Date.now()}`,
      user_id: currentUserId,
      title: copiedTitle,
      description: sourceTrip.description || 'Copied from Locora',
      destination: sourceTrip.destination || '',
      country: sourceTrip.country || '',
      country_code: sourceTrip.country_code || '',
      cover_image_url: sourceTrip.cover_image_url || sourceTrip.cover_image,
      start_date: startDate,
      end_date: endDate,
      budget: sourceTrip.budget || 0,
      status: 'upcoming',
      is_public: false,
      trip_source: 'personal',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    const currentTrips = getLocalTrips();
    setLocalTrips([newTrip, ...currentTrips]);
    return { data: newTrip, error: null };
  }

  // 1. Fetch source public/template trip
  const { data: sourceTrip, error: sourceErr } = await supabase
    .from('trips')
    .select('*')
    .eq('id', publicTripId)
    .single();

  if (sourceErr || !sourceTrip) {
    console.error('Supabase copyPublicTrip source lookup error:', sourceErr);
    throw new Error('This itinerary is not available or could not be found.');
  }

  // 2. Fetch source itinerary_days
  const { data: sourceDays, error: daysErr } = await supabase
    .from('itinerary_days')
    .select('*')
    .eq('trip_id', publicTripId)
    .order('day_number', { ascending: true });

  if (daysErr) {
    console.error('Supabase copyPublicTrip source days error:', daysErr);
    throw daysErr;
  }

  // 3. Fetch source activities
  const { data: sourceActs, error: actsErr } = await supabase
    .from('activities')
    .select('*')
    .eq('trip_id', publicTripId)
    .order('sort_order', { ascending: true });

  if (actsErr) {
    console.error('Supabase copyPublicTrip source activities error:', actsErr);
    throw actsErr;
  }

  // Calculate duration and dates
  const daysCount = (sourceDays && sourceDays.length > 0)
    ? sourceDays.length
    : (sourceTrip.start_date && sourceTrip.end_date
      ? Math.max(1, Math.round((new Date(sourceTrip.end_date) - new Date(sourceTrip.start_date)) / 86400000) + 1)
      : 5);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultStartDate = tomorrow.toISOString().split('T')[0];
  const startDate = options.startDate || defaultStartDate;

  const defaultEndDate = new Date(new Date(startDate).getTime() + (daysCount - 1) * 86400000).toISOString().split('T')[0];
  const endDate = options.endDate || defaultEndDate;

  let newTripId = null;

  try {
    // Step 1: Create NEW trip row with trip_source = 'personal'
    const insertPayload = {
      user_id: currentUserId,
      title: sourceTrip.title || 'Copied Trip',
      description: sourceTrip.description || '',
      destination: sourceTrip.destination || '',
      country: sourceTrip.country || '',
      country_code: sourceTrip.country_code || '',
      start_date: startDate,
      end_date: endDate,
      status: 'upcoming',
      is_public: false,
      trip_source: 'personal',
      cover_image_url: sourceTrip.cover_image_url || null,
      budget: sourceTrip.budget !== null && sourceTrip.budget !== undefined ? Number(sourceTrip.budget) : 0
    };

    const { data: newTrip, error: createTripErr } = await supabase
      .from('trips')
      .insert([insertPayload])
      .select()
      .single();

    if (createTripErr || !newTrip) {
      throw createTripErr || new Error('Failed to create copied trip in database.');
    }

    newTripId = newTrip.id;

    // Step 2: Create NEW itinerary_days rows with shifted dates
    const dayIdMap = new Map(); // originalDayId -> newDayId

    if (sourceDays && sourceDays.length > 0) {
      const baseStart = new Date(startDate);
      const newDaysPayload = sourceDays.map(origDay => {
        const shiftedDate = new Date(baseStart.getTime() + (origDay.day_number - 1) * 86400000).toISOString().split('T')[0];
        return {
          trip_id: newTripId,
          day_number: origDay.day_number,
          date: shiftedDate,
          notes: origDay.notes || null
        };
      });

      const { data: createdDays, error: createDaysErr } = await supabase
        .from('itinerary_days')
        .insert(newDaysPayload)
        .select();

      if (createDaysErr || !createdDays) {
        throw createDaysErr || new Error('Failed to create copied itinerary days.');
      }

      sourceDays.forEach(origDay => {
        const matchingNewDay = createdDays.find(d => d.day_number === origDay.day_number);
        if (matchingNewDay) {
          dayIdMap.set(origDay.id, matchingNewDay.id);
        }
      });
    }

    // Step 3: Create NEW activities rows
    if (sourceActs && sourceActs.length > 0) {
      const newActsPayload = sourceActs.map(origAct => {
        const newItineraryDayId = dayIdMap.get(origAct.itinerary_day_id) || null;
        return {
          trip_id: newTripId,
          itinerary_day_id: newItineraryDayId,
          title: origAct.title || 'Untitled Activity',
          description: origAct.description || null,
          category: origAct.category || 'Sightseeing',
          location: origAct.location || null,
          address: origAct.address || null,
          country: origAct.country || null,
          country_code: origAct.country_code || null,
          latitude: origAct.latitude ?? null,
          longitude: origAct.longitude ?? null,
          start_time: origAct.start_time || null,
          end_time: origAct.end_time || null,
          duration_minutes: origAct.duration_minutes !== null && origAct.duration_minutes !== undefined ? Number(origAct.duration_minutes) : null,
          estimated_cost: origAct.estimated_cost !== null && origAct.estimated_cost !== undefined ? Number(origAct.estimated_cost) : null,
          currency: origAct.currency || 'INR',
          image_url: origAct.image_url || null,
          is_local_experience: Boolean(origAct.is_local_experience),
          is_cultural_experience: Boolean(origAct.is_cultural_experience),
          source: origAct.source || 'user',
          sort_order: Number(origAct.sort_order) || 1
        };
      });

      const { error: createActsErr } = await supabase
        .from('activities')
        .insert(newActsPayload);

      if (createActsErr) {
        throw createActsErr;
      }
    }

    return { data: normalizeTrip(newTrip), error: null };
  } catch (err) {
    console.error('copyPublicTrip error, performing rollback:', err);
    if (newTripId) {
      try {
        await supabase.from('activities').delete().eq('trip_id', newTripId);
        await supabase.from('itinerary_days').delete().eq('trip_id', newTripId);
        await supabase.from('trips').delete().eq('id', newTripId);
      } catch (rollbackErr) {
        console.warn('Rollback delete failed:', rollbackErr);
      }
    }
    throw err;
  }
};

// --- AUTHORITATIVE TRAVEL CHECK-INS & ACHIEVEMENT ENGINE SERVICES ---

/**
 * Fetch all verified check-ins for an authenticated user
 */
export const getUserCheckins = async (userId) => {
  if (!userId) return { data: [], error: null };

  const localKey = `locora_checkins_${userId}`;
  let localData = [];
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) localData = JSON.parse(raw);
  } catch (_) {}

  if (!isSupabaseConfigured() || !isValidUUID(userId)) {
    return { data: localData, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('travel_checkins')
      .select('*')
      .eq('user_id', userId)
      .order('checked_in_at', { ascending: false });

    if (error) {
      // If table does not exist or network fails, gracefully fallback to local cache
      console.warn('Supabase travel_checkins lookup fallback:', error.message);
      return { data: localData, error: null };
    }

    // Synchronize local cache with confirmed Supabase data
    const list = data || [];
    try {
      localStorage.setItem(localKey, JSON.stringify(list));
    } catch (_) {}

    return { data: list, error: null };
  } catch (err) {
    console.warn('travel_checkins catch:', err);
    return { data: localData, error: null };
  }
};

/**
 * Persist a verified travel check-in with duplicate prevention
 */
export const createTravelCheckin = async (userId, checkinData) => {
  if (!userId) {
    return { data: null, error: 'Authenticated user required for verified check-in.' };
  }

  const nowIso = new Date().toISOString();
  const newRecord = {
    id: checkinData.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `checkin-${Date.now()}`),
    user_id: userId,
    place_id: checkinData.place_id || checkinData.placeId || null,
    place_name: checkinData.place_name || checkinData.placeName || checkinData.name || 'Verified Destination',
    city: checkinData.city || 'Unknown City',
    country: checkinData.country || 'Unknown Country',
    country_code: (checkinData.country_code || checkinData.countryCode || 'GLOBAL').toUpperCase(),
    latitude: Number(checkinData.latitude),
    longitude: Number(checkinData.longitude),
    accuracy_meters: Number(checkinData.accuracy_meters || checkinData.accuracy || 0),
    category: checkinData.category || 'Exploration',
    verification_method: checkinData.verification_method || 'gps_geofence',
    checked_in_at: checkinData.checked_in_at || nowIso,
    created_at: nowIso
  };

  // Local sync
  const localKey = `locora_checkins_${userId}`;
  let localList = [];
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) localList = JSON.parse(raw);
  } catch (_) {}

  // Prevent duplicate check-in to same place within 6 hours (21600000 ms)
  const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
  const isRecentDuplicate = localList.some(item => {
    const isSamePlace = (item.place_id && item.place_id === newRecord.place_id) || (item.city === newRecord.city && item.place_name === newRecord.place_name);
    const itemTime = new Date(item.checked_in_at).getTime();
    return isSamePlace && itemTime > sixHoursAgo;
  });

  if (isRecentDuplicate) {
    return { data: null, error: `You have already checked in at ${newRecord.place_name} recently. Cooldown is 6 hours.` };
  }

  localList.unshift(newRecord);
  try {
    localStorage.setItem(localKey, JSON.stringify(localList));
  } catch (_) {}

  if (!isSupabaseConfigured() || !isValidUUID(userId)) {
    return { data: newRecord, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('travel_checkins')
      .insert([newRecord])
      .select()
      .maybeSingle();

    if (error) {
      console.warn('Supabase insert travel_checkins warning (using cached):', error.message);
      return { data: newRecord, error: null };
    }

    return { data: data || newRecord, error: null };
  } catch (err) {
    console.warn('Supabase insert travel_checkins catch:', err);
    return { data: newRecord, error: null };
  }
};

/**
 * Fetch persisted achievement unlocks (Client Read-Only)
 */
export const getUserAchievements = async (userId) => {
  if (!userId) return { data: [], error: null };

  const localKey = `locora_user_achievements_${userId}`;
  let localList = [];
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) localList = JSON.parse(raw);
  } catch (_) {}

  if (!isSupabaseConfigured() || !isValidUUID(userId)) {
    return { data: localList, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.warn('Supabase user_achievements SELECT warning:', error.message);
      return { data: localList, error: null };
    }

    const list = data || [];
    try {
      localStorage.setItem(localKey, JSON.stringify(list));
    } catch (_) {}

    return { data: list, error: null };
  } catch (err) {
    return { data: localList, error: null };
  }
};

/**
 * Cache confirmed achievement unlock state in local storage
 * (Direct client INSERT/UPSERT to public.user_achievements is disallowed to prevent arbitrary badge awarding)
 */
export const saveUserAchievement = (userId, achievementId, progressCurrent = 1, progressTotal = 1) => {
  if (!userId || !achievementId) return null;

  const nowIso = new Date().toISOString();
  const record = {
    user_id: userId,
    achievement_id: achievementId,
    unlocked_at: nowIso,
    progress_current: progressCurrent,
    progress_total: progressTotal,
    updated_at: nowIso
  };

  const localKey = `locora_user_achievements_${userId}`;
  try {
    const raw = localStorage.getItem(localKey);
    const list = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(item => item.achievement_id === achievementId);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...record };
    } else {
      list.push({ id: `ach-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, ...record, created_at: nowIso });
    }
    localStorage.setItem(localKey, JSON.stringify(list));
  } catch (_) {}

  return record;
};

/**
 * Verify GPS location against verified destination targets with target-specific geofencing
 * Automatically detects nearest verified place & evaluates newly earned badges
 */
export const verifyLocationCheckin = async (userId, { latitude, longitude, accuracy = 0 }) => {
  if (!userId) {
    return { success: false, error: 'Please log in to verify visits and unlock travel achievements.' };
  }

  const lat = Number(latitude);
  const lng = Number(longitude);
  const acc = Number(accuracy) || 0;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { success: false, error: 'Invalid GPS coordinates provided.' };
  }

  // GPS Accuracy validation: reject readings with accuracy > 500m for imprecise location
  if (acc > 500) {
    return {
      success: false,
      error: `GPS signal accuracy (${Math.round(acc)}m) is too imprecise for reliable verification. Please move to an open area with clear satellite view.`
    };
  }

  const { VERIFIED_TARGETS } = await import('../data/achievements');

  // Find nearest verified destination target within its specific geofence radius
  let matchedTarget = null;
  let minDistanceKm = Infinity;

  for (const target of VERIFIED_TARGETS) {
    const dist = calculateHaversineDistance(lat, lng, target.lat, target.lng);
    const maxRadius = target.radiusKm || 0.35; // Target specific geofence

    if (dist <= maxRadius && dist < minDistanceKm) {
      minDistanceKm = dist;
      matchedTarget = { ...target, distanceMeters: Math.round(dist * 1000) };
    }
  }

  let finalCheckinData = null;

  if (matchedTarget) {
    finalCheckinData = {
      place_id: matchedTarget.placeId || matchedTarget.id,
      place_name: matchedTarget.name,
      city: matchedTarget.city,
      country: matchedTarget.country,
      country_code: matchedTarget.countryCode,
      latitude: lat,
      longitude: lng,
      accuracy_meters: acc,
      category: matchedTarget.category || 'Exploration',
      verification_method: 'gps_geofence'
    };
  } else {
    // If outside specific POI radii, resolve location via reverse geocoding
    const resolved = await resolveLocationName(lat, lng);
    if (resolved && resolved.city && resolved.country) {
      let derivedCountryCode = 'GLOBAL';
      const cLower = resolved.country.toLowerCase();
      if (cLower.includes('india')) derivedCountryCode = 'IN';
      else if (cLower.includes('japan')) derivedCountryCode = 'JP';
      else if (cLower.includes('united states') || cLower.includes('usa')) derivedCountryCode = 'US';
      else if (cLower.includes('france')) derivedCountryCode = 'FR';

      finalCheckinData = {
        place_id: `geo-${resolved.city.toLowerCase().replace(/\s+/g, '-')}`,
        place_name: resolved.formattedAddress || `${resolved.city}, ${resolved.country}`,
        city: resolved.city,
        country: resolved.country,
        country_code: derivedCountryCode,
        latitude: lat,
        longitude: lng,
        accuracy_meters: acc,
        category: 'Exploration',
        verification_method: 'device_geolocation'
      };
    } else {
      return {
        success: false,
        error: 'No recognized travel destination or municipality found at your current GPS coordinates.'
      };
    }
  }

  // Check state of achievements before check-in to identify newly unlocked badges
  const prevEvaluation = await evaluateUserAchievements(userId);
  const previouslyUnlockedIds = new Set(prevEvaluation.unlockedList.map(a => a.id));

  // Persist check-in record to travel_checkins
  const checkinRes = await createTravelCheckin(userId, finalCheckinData);
  if (checkinRes.error) {
    return { success: false, error: checkinRes.error };
  }

  // Run authoritative evaluation with new check-in
  const nextEvaluation = await evaluateUserAchievements(userId);

  // Identify newly unlocked badges
  const newUnlocks = nextEvaluation.unlockedList.filter(a => !previouslyUnlockedIds.has(a.id));

  return {
    success: true,
    checkin: checkinRes.data,
    matchedTarget,
    newUnlocks,
    evaluation: nextEvaluation
  };
};

/**
 * Authoritative, purely dynamic evaluation of user achievements from real database records
 * Calculates exact country statistics without hardcoded totals or fake demo unlocks
 */
export const evaluateUserAchievements = async (userId) => {
  const { ACHIEVEMENTS_COLLECTION, SUPPORTED_COUNTRIES } = await import('../data/achievements');

  // Fallback for unauthenticated/uninitialized state
  if (!userId || (isSupabaseConfigured() && !isValidUUID(userId))) {
    const unauthCountryProgress = SUPPORTED_COUNTRIES.map(c => {
      const countryAchievements = ACHIEVEMENTS_COLLECTION.filter(a => a.countryCode === c.countryCode);
      return {
        country: c.country,
        countryCode: c.countryCode,
        flag: c.flag,
        totalCount: countryAchievements.length,
        unlockedCount: 0,
        unlockedPercentage: 0
      };
    });

    return {
      allAchievements: ACHIEVEMENTS_COLLECTION.map(item => ({
        ...item,
        isUnlocked: false,
        progressCurrent: 0,
        progressTotal: item.requirement?.value || 1,
        unlockedAt: null
      })),
      unlockedList: [],
      lockedList: ACHIEVEMENTS_COLLECTION.map(item => ({
        ...item,
        isUnlocked: false,
        progressCurrent: 0,
        progressTotal: item.requirement?.value || 1,
        unlockedAt: null
      })),
      countryProgress: unauthCountryProgress,
      stats: {
        unlockedCount: 0,
        countriesVisited: 0,
        tripsCompleted: 0,
        activitiesCompleted: 0
      }
    };
  }

  // Trigger authoritative server-side RPC if deployed
  if (isSupabaseConfigured() && isValidUUID(userId)) {
    const { data, error } = await supabase.rpc(
      'evaluate_user_travel_achievements'
    );

    if (error) {
      console.error('Achievement RPC failed:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
    } else {
      console.log('Achievement RPC succeeded:', data);
    }
  }

  // 1. Fetch real user evidence from Supabase
  const [checkinsRes, tripsRes, persistedUnlocksRes] = await Promise.all([
    getUserCheckins(userId),
    getUserTrips(userId),
    getUserAchievements(userId)
  ]);

  const checkins = checkinsRes.data || [];
  const userTrips = tripsRes.data || [];
  const persistedUnlocks = persistedUnlocksRes.data || [];
  const persistedMap = new Map(persistedUnlocks.map(u => [u.achievement_id, u]));

  // 2. Identify completed trips & activities
  const todayStr = new Date().toISOString().split('T')[0];
  const completedTrips = userTrips.filter(t => (t.end_date && t.end_date <= todayStr) || t.status === 'completed');

  let totalActivitiesCount = 0;
  userTrips.forEach(t => {
    totalActivitiesCount += Number(t.activities_count || (t.itinerary_days || []).length || 0);
  });

  const copiedTripsCount = userTrips.filter(t => t.trip_source === 'personal' && (t.original_trip_id || t.is_copied)).length;
  const publishedTripsCount = userTrips.filter(t => t.is_public === true).length;

  // 3. Extract verified visited cities & countries exclusively from real check-ins
  const visitedCities = new Set();
  const visitedCountries = new Set();
  const visitedPlacesSet = new Set();
  const categoryVisitsMap = new Map(); // category -> count
  const countryCategoryMap = new Map(); // countryCode_category -> count
  const countryCityMap = new Map(); // countryCode -> Set of cities

  checkins.forEach(ci => {
    if (ci.city) {
      visitedCities.add(ci.city);
      const cCode = ci.country_code || 'GLOBAL';
      if (!countryCityMap.has(cCode)) countryCityMap.set(cCode, new Set());
      countryCityMap.get(cCode).add(ci.city);
    }
    if (ci.country_code && ci.country_code !== 'GLOBAL') {
      visitedCountries.add(ci.country_code);
    }
    if (ci.place_name || ci.place_id) {
      visitedPlacesSet.add(ci.place_id || ci.place_name);
    }
    if (ci.category) {
      categoryVisitsMap.set(ci.category, (categoryVisitsMap.get(ci.category) || 0) + 1);
      const key = `${ci.country_code}_${ci.category}`;
      countryCategoryMap.set(key, (countryCategoryMap.get(key) || 0) + 1);
    }
  });

  // 4. Evaluate each achievement rule against real evidence
  const evaluatedAchievements = ACHIEVEMENTS_COLLECTION.map(item => {
    const req = item.requirement || {};
    let isUnlocked = false;
    let progressCurrent = 0;
    let progressTotal = req.value || 1;

    switch (req.type) {
      case 'checkin_count':
        progressTotal = req.value || 1;
        progressCurrent = checkins.length;
        if (progressCurrent >= progressTotal) isUnlocked = true;
        break;

      case 'unique_places_count':
        progressTotal = req.value || 1;
        progressCurrent = visitedPlacesSet.size;
        if (progressCurrent >= progressTotal) isUnlocked = true;
        break;

      case 'country_count':
        progressTotal = req.value || 1;
        progressCurrent = visitedCountries.size;
        if (progressCurrent >= progressTotal) isUnlocked = true;
        break;

      case 'country_visit_count':
        progressTotal = req.value || 1;
        progressCurrent = checkins.filter(ci => ci.country_code === req.countryCode).length;
        if (progressCurrent >= progressTotal) isUnlocked = true;
        break;

      case 'city_visit_count':
        progressTotal = req.value || 1;
        progressCurrent = (countryCityMap.get(req.countryCode) || new Set()).size;
        if (progressCurrent >= progressTotal) isUnlocked = true;
        break;

      case 'city_count':
        progressTotal = req.value || 1;
        progressCurrent = visitedCities.size;
        if (progressCurrent >= progressTotal) isUnlocked = true;
        break;

      case 'destination_visit':
        progressTotal = 1;
        progressCurrent = visitedCities.has(req.city) ? 1 : 0;
        if (progressCurrent >= 1) isUnlocked = true;
        break;

      case 'destination_set':
        progressTotal = req.destinations.length;
        progressCurrent = req.destinations.filter(d => visitedCities.has(d)).length;
        if (progressCurrent >= progressTotal) isUnlocked = true;
        break;

      case 'place_category_count':
        progressTotal = req.value || 1;
        progressCurrent = categoryVisitsMap.get(req.category) || 0;
        if (progressCurrent >= progressTotal) isUnlocked = true;
        break;

      case 'country_category_count':
        progressTotal = req.value || 1;
        progressCurrent = countryCategoryMap.get(`${req.countryCode}_${req.category}`) || 0;
        if (progressCurrent >= progressTotal) isUnlocked = true;
        break;

      case 'trip_completed_count':
        progressTotal = req.value || 1;
        progressCurrent = completedTrips.length;
        if (progressCurrent >= progressTotal) isUnlocked = true;
        break;

      case 'activity_count':
        progressTotal = req.value || 1;
        progressCurrent = totalActivitiesCount;
        if (progressCurrent >= progressTotal) isUnlocked = true;
        break;

      case 'community_trip_copied':
        progressTotal = req.value || 1;
        progressCurrent = copiedTripsCount;
        if (progressCurrent >= progressTotal) isUnlocked = true;
        break;

      case 'community_trip_published':
        progressTotal = req.value || 1;
        progressCurrent = publishedTripsCount;
        if (progressCurrent >= progressTotal) isUnlocked = true;
        break;

      case 'time_based_visit': {
        progressTotal = 1;
        const matched = checkins.some(ci => {
          if (req.countryCode && ci.country_code !== req.countryCode) return false;
          if (req.city && ci.city !== req.city) return false;
          const dt = new Date(ci.checked_in_at);
          const hour = dt.getHours();
          if (req.timeWindow === 'sunrise') return hour >= 5 && hour < 9;
          if (req.timeWindow === 'night') return hour >= 20 || hour < 4;
          return true;
        });
        progressCurrent = matched ? 1 : 0;
        if (matched) isUnlocked = true;
        break;
      }

      case 'total_unlocked_count':
        progressTotal = req.value || 25;
        progressCurrent = persistedUnlocks.length;
        if (progressCurrent >= progressTotal) isUnlocked = true;
        break;

      default:
        progressTotal = 1;
        progressCurrent = 0;
    }

    const persisted = persistedMap.get(item.id);
    const confirmedUnlock = isUnlocked || Boolean(persisted?.unlocked_at);
    const unlockDate = persisted?.unlocked_at || (isUnlocked ? new Date().toISOString() : null);

    // Save newly confirmed unlock to local cache if not already stored
    if (isUnlocked && !persisted) {
      saveUserAchievement(userId, item.id, progressCurrent, progressTotal);
    }

    return {
      ...item,
      isUnlocked: confirmedUnlock,
      progressCurrent: Math.min(progressCurrent, progressTotal),
      progressTotal,
      unlockedAt: unlockDate
    };
  });

  // 5. Calculate dynamic country statistics directly from catalogue
  const countryProgress = SUPPORTED_COUNTRIES.map(c => {
    const countryAchievements = evaluatedAchievements.filter(a => a.countryCode === c.countryCode);
    const totalCount = countryAchievements.length;
    const unlockedCount = countryAchievements.filter(a => a.isUnlocked).length;
    const unlockedPercentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

    return {
      country: c.country,
      countryCode: c.countryCode,
      flag: c.flag,
      totalCount,
      unlockedCount,
      unlockedPercentage
    };
  });

  const totalUnlockedCount = evaluatedAchievements.filter(a => a.isUnlocked).length;

  return {
    allAchievements: evaluatedAchievements,
    unlockedList: evaluatedAchievements.filter(a => a.isUnlocked),
    lockedList: evaluatedAchievements.filter(a => !a.isUnlocked),
    countryProgress,
    stats: {
      unlockedCount: totalUnlockedCount,
      countriesVisited: visitedCountries.size,
      tripsCompleted: completedTrips.length,
      activitiesCompleted: totalActivitiesCount
    }
  };
};

export const deleteUserAccount = async (userId) => {
  if (!userId || (isSupabaseConfigured() && !isValidUUID(userId))) {
    throw new Error('User authentication required.');
  }

  localStorage.removeItem('locora_mock_user');
  localStorage.removeItem('locora_trips');
  localStorage.removeItem(`locora_wishlist_${userId}`);
  localStorage.removeItem(`locora_checkins_${userId}`);
  localStorage.removeItem(`locora_user_achievements_${userId}`);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('travel_checkins').delete().eq('user_id', userId);
      await supabase.from('user_achievements').delete().eq('user_id', userId);
      await supabase.from('profiles').delete().eq('id', userId);
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase delete account catch:', err);
    }
  }

  return { data: { success: true }, error: null };
};

