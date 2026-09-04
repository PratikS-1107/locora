# LOCORA — Intelligent Local Discovery & Experience Platform

Locora is a modern travel web application built for HackCelestial 3.0.

Locora is NOT just an itinerary planner. Its central differentiator is intelligent local and cultural experience discovery — recommending realistic experiences that fit into a traveler's available free time, current location, itinerary, and remaining budget.

---

## 🌟 Key Application Modules

1. **Home (`/`)**: Landing page showcasing featured destinations, product philosophy, interactive itinerary preview, and seamless authentication entry points.
2. **My Trips (`/my-trips`)**: Manage personal itineraries categorized into **Upcoming**, **Wishlist**, and **Completed**. Supports trip public/private visibility toggles.
3. **Itinerary Builder (`/itinerary-builder/:id`)**: Day-by-day itinerary management with interactive calendar view, drag-and-drop/reordering activity timeline, and dynamic Budget Overview graphs.
4. **Discover (`/discover`)**: Context-aware AI recommendation engine evaluating destination, free time windows, budget limits, and cultural preferences.
5. **Explore (`/explore`)**: Search and browse global travel destinations with filter tags and category sorting.
6. **Community (`/community`)**: Social discovery hub for public itineraries created by fellow travelers. Features **View Trip**, **Copy Trip** (cloning metadata & activities with new ownership), and **Save to Wishlist**.
7. **Profile (`/profile`)**: Travel identity showcase featuring gamified achievements (country-specific & global badge collections), country progress bars, travel milestones, editable profile metadata, and a secure **Danger Zone** with explicit account deletion.
8. **Settings (Modal Overlay)**: Application preferences modal accessible from any page to configure language, currency (INR ₹, USD $, EUR €, GBP £, JPY ¥), distance units, location privacy, and Web Push travel reminders.

---

## 🧭 Navigation Architecture

Locora maintains strict visual navigation hierarchy across all views:

- **Home Page**: Top horizontal header with logo, primary navigation links (`Home`, `My Trips`, `Discover`, `Explore`, `Community`), user avatar & name, and `Settings`.
- **Inner Pages**: Fixed left sidebar with brand logo, `+ New Trip` call-to-action, primary navigation items, and fixed bottom section:
  - **Profile** (strictly positioned above Settings)
  - **Settings** (always at the very bottom, opening as a modal overlay)

---

## ⚙️ Environment Variables & Setup

Create a `.env` file in the root directory:

```env
# Supabase Configuration (Public Anonymous Keys)
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

> **Security Note**: Never expose Supabase service-role keys or private secret credentials in frontend environment variables. All client operations use public keys enforced by Supabase Row Level Security (RLS).

---

## 🗄️ Database Schema & RLS Policies

The application integrates with Supabase PostgreSQL tables:

- `profiles` (`id`, `full_name`, `avatar_url`, `bio`, `created_at`)
- `trips` (`id`, `user_id`, `name`, `description`, `cover_image`, `start_date`, `end_date`, `budget`, `is_public`, `created_at`)
- `itinerary_items` (`id`, `trip_id`, `day_number`, `title`, `start_time`, `duration_minutes`, `cost`, `location`, `category`)
- `saved_trips` (`id`, `user_id`, `trip_id`, `saved_at`)

### Row Level Security (RLS) Rules:
- **Public Trips**: Viewable by anyone (`is_public = true`).
- **Private Trips & Itineraries**: Restricted to the owner (`auth.uid() = user_id`).
- **Profiles**: Publicly readable display names/avatars; editable only by profile owner (`auth.uid() = id`).

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Run Vite development server
npm run dev

# Production Build
npm run build
```

---

## 🛡️ Security & Privacy Assurance

- **Zero Passwords Saved in DB**: All credential management handled via Supabase Auth.
- **Strict Return-To Persistence**: Unauthenticated actions preserve the user's return path upon login.
- **Client-Side Data Protection**: AI recommendation outputs are strictly parsed and schema-validated before rendering.
