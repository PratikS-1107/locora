# 🌍 Locora

### Intelligent Local Discovery & Experience Platform

Include this tagline:

> Don't just visit a destination. Experience it.

Then introduce Locora as a modern intelligent travel platform built for HackCelestial 3.0.

Clearly explain the core differentiator:

Locora is not simply an itinerary planner. Its main focus is intelligent local and cultural experience discovery.

Explain that Locora can use contextual information such as:
- current location
- available free time
- itinerary context
- remaining budget
- travel interests/preferences

to help travelers discover realistic experiences that fit their current situation.

Do NOT overclaim. Only describe functionality that actually exists in the repository.

==================================================
## ✨ WHY LOCORA?
==================================================

Travel plans don't always go exactly as expected.

You might have:

- ⏱️ A few hours before check-in
- 🗓️ Free time between planned activities
- 💰 A limited remaining budget
- 📍 An unfamiliar location
- 🎭 A desire for authentic local or cultural experiences

Locora turns those gaps into opportunities.

### 🧠 Context-Aware Discovery

```text
┌──────────────────────┐
│   Current Location   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│    Available Time    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Itinerary Context   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Remaining Budget   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│     Interests        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│    Gemini AI Layer   │
│   Recommendation     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Relevant Experiences │
└──────────────────────┘
```
Explain the product philosophy:

Traditional travel platforms often answer:
"What are the best places to visit?"

Locora aims to answer:
"What can I realistically experience right now?"

Make this one of the strongest parts of the README.

==================================================
## 🚀 CORE FEATURES
==================================================

Document the application's actual major modules.

Use clean subsections and emojis.

Include, where actually supported by the implementation:

### 🏠 Home

Explain:
- landing experience
- featured destinations
- trending/preplanned travel content
- product introduction
- itinerary preview
- authentication entry points

Do not claim static or fake content is real-time if it is not.

### 🗺️ Explore

Explain:
- destination discovery
- search
- categories/filters where implemented
- real destination information
- location information
- Google Maps integration where actually implemented
- destination imagery

Emphasize that Explore is intended for discovering destinations and experiences.

### 🤖 Discover

Explain that Discover is the core intelligent recommendation experience.

Describe supported contextual inputs such as:
- current location
- free time
- budget
- itinerary context
- interests
- cultural/local preferences

Explain that the system is designed to return experiences appropriate to the traveler's situation rather than simply returning generic destination lists.

Mention Gemini/AI only if the repository confirms its actual use.

### 🧳 My Trips

Explain the current trip-management functionality.

Use these sections where applicable:
- Upcoming
- Wishlist
- Completed
- Current/Active if actually implemented

Mention supported functionality such as:
- creating trips
- editing trip information
- viewing itineraries
- managing activities
- trip visibility
- saving trips
- copied trips

Do not claim functionality that does not exist.

### 📅 Itinerary Builder

Explain actual functionality such as:
- day-by-day itinerary
- itinerary days
- activities
- activity timeline
- scheduling
- activity reordering
- drag-and-drop if actually implemented
- duration
- estimated costs
- budget overview
- calendar functionality if actually implemented

IMPORTANT:
Use the repository's real data model.

If the actual implementation uses:

trips
itinerary_days
activities

document those names.

Do NOT document:
itinerary_items
trip_stops

unless those entities actually exist and are actively used.

### 🌎 Community

Explain:
- public trip discovery
- viewing public trips
- copying community trips
- saving trips to wishlist
- ownership separation when copying

Explain that copying a trip creates a new personal trip rather than modifying the original community trip, but only if this behavior is confirmed in the implementation.

### 🏆 Travel Achievements

Document the actual achievement functionality.

Mention:
- travel achievements
- country-specific progress
- global achievements
- travel milestones
- location-based check-ins
- dynamic achievement evaluation

Only describe GPS/location functionality that actually exists.

Do not claim background tracking if the implementation only performs browser geolocation/check-ins.

### 👤 Profile

Document actual profile functionality such as:
- profile information
- avatar
- travel progress
- countries
- achievements
- milestones
- account management
- account deletion/Danger Zone

Do not invent profile database fields.

### ⚙️ Settings

Document actual settings.

Where supported, include:
- language
- currency
- distance units
- location privacy
- travel reminders
- Web Push preferences

Mention supported currencies only if confirmed by the code:

INR ₹
USD $
EUR €
GBP £
JPY ¥

==================================================
## 🧭 NAVIGATION ARCHITECTURE
==================================================

Explain the navigation structure accurately.

Describe:
- Home's top navigation/header
- inner-page sidebar
- New Trip CTA
- primary navigation
- Profile placement
- Settings placement
- Settings modal

Explain that the application maintains a consistent navigation hierarchy across views.

Do not claim navigation behavior that is not implemented.

==================================================
## 🏗️ APPLICATION ARCHITECTURE
==================================================

Create a clean architecture diagram.

Use a structure similar to:
```text

┌──────────────────────────────┐
│          Locora UI           │
│        React + Vite          │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│        Application API       │
│      Express / Vercel       │
└───────┬──────────┬───────────┘
        │          │
        ▼          ▼
┌─────────────┐  ┌──────────────┐
│  Supabase   │  │ Google APIs  │
│             │  │              │
│ Auth        │  │ Places       │
│ PostgreSQL  │  │ Maps         │
│ Storage     │  │ OAuth        │
└─────────────┘  └──────┬───────┘
                        │
                        ▼
                 ┌─────────────┐
                 │   Gemini AI │
                 │             │
                 │ Discovery & │
                 │ Recommend.  │
                 └─────────────┘

```

IMPORTANT:
Adjust this diagram to match the actual repository.
Do not list Google APIs, Gemini, Express, Supabase Storage, etc. unless actually used.

==================================================
## 🛠️ TECH STACK
==================================================

Create a professional table.

Determine the actual stack from the repository.

Possible technologies include:

Frontend:
- React
- Vite
- JavaScript

Backend:
- Node.js
- Express
- Vercel Serverless Functions

Database/Auth:
- Supabase
- PostgreSQL
- Supabase Auth
- Row Level Security
- Supabase Storage

AI:
- Google Gemini

Location:
- Google Places
- Google Maps
- Browser Geolocation API

Deployment:
- Vercel
- GitHub

ONLY include technologies that are actually present in the project.

==================================================
## 🗄️ DATA MODEL
==================================================

Create a concise data model section.

Show the actual high-level relationships.

For example:
```text
User
 │
 ├── Profile
 │
 ├── Trips
 │    │
 │    ├── Itinerary Days
 │    │      │
 │    │      └── Activities
 │    │
 │    └── Trip Metadata
 │
 ├── Saved Trips
 │
 ├── Travel Check-ins
 │
 └── Achievements

```

Only include entities that actually exist.

Document the trip source concept if implemented:

personal
template
community

Explain their purposes accurately.

Do not invent database columns.

If listing columns, inspect the actual SQL/schema first and only document verified columns.

==================================================
## 🔐 AUTHENTICATION & SECURITY
==================================================

Create a polished security section.

Mention actual mechanisms such as:

- Supabase Auth
- Google OAuth
- secure session handling
- Row Level Security
- user-owned data protection
- server-side secret handling
- API key protection
- AI response validation

Include a conceptual access model:

```text

Public Trips
    ↓
Publicly discoverable

Personal Trips
    ↓
Owner access

Private Itineraries
    ↓
Owner access

User Profile
    ↓
Profile owner access

```

Only make claims that match the actual RLS policies.

Clearly state:

- frontend uses public Supabase credentials where appropriate
- service-role/private secrets must remain server-side
- Gemini API keys must not be exposed to the frontend
- `.env` files must not be committed

==================================================
## 🌐 REAL-WORLD DATA
==================================================

Explain Locora's approach to real destination information.

Emphasize that the application should not fabricate:

- prices
- ratings
- locations
- images
- reviews
- map links

Explain the pricing states used by the application where applicable:

Free
Price varies
Price unavailable
Verified amount

Do not claim every piece of data is universally verified unless the implementation actually guarantees that.

Mention external data providers only if confirmed.

==================================================
## 📸 MEDIA & STORAGE
==================================================

If the repository confirms the use of Supabase Storage, document it.

Explain:
- destination/trip imagery
- user-uploaded images
- storage buckets
- public/read behavior where appropriate
- image handling

Do not expose credentials.

==================================================
## 🚀 DEPLOYMENT
==================================================

Document the production deployment accurately.

If the production URL is confirmed, include:

https://locora-kappa.vercel.app

Explain the relationship between:
- React/Vite frontend
- backend API
- Vercel deployment
- Supabase services

Do not claim deployment architecture that does not exist.

==================================================
## ⚙️ LOCAL DEVELOPMENT
==================================================

Provide clear copy-paste setup instructions.

Include:

```bash
git clone <YOUR_REPOSITORY_URL>
cd locora
npm install
npm run dev
```

# 👥 Team Locora

## Meet the Team

| # | Team Member | Role | GitHub |
|---|---|---|---|
| 1 | **Pratik Satpute** | Full Stack Developer | [@YOUR_GITHUB_ID](https://github.com/PratikS-1107) |
| 2 | **Aastha Vyas** | UI/UX Designer | [@GITHUB_ID](https://github.com/aasthavyas704-hub) |
| 3 | **Samruddhi Shewale** | Developer | [@GITHUB_ID](https://github.com/samruddhishewale-2314) |
| 4 | **Arnav Sawant** | Developer | [@GITHUB_ID](https://github.com/GITHUB_ID) |
| 5 | **Pushkraj Shirke** | Developer | [@GITHUB_ID](https://github.com/GITHUB_ID) |

---
