import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getSavedWishlistIds,
  toggleSaveWishlistItem,
  getExploreTrips,
  createTripFromReadyMade
} from '../services/api';
import ViewItineraryModal from '../components/ViewItineraryModal';
import ConvertTemplateModal from '../components/ConvertTemplateModal';
import {
  Search,
  X,
  MapPin,
  Heart,
  Sparkles,
  Eye,
  Plus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Compass
} from 'lucide-react';

// 20 Curated Pre-Planned Trips matching the Explore page screenshot
export const CURATED_EXPLORE_TRIPS = [
  {
    id: 'rmt-barcelona-4d',
    title: 'Barcelona Art & Architecture',
    name: 'Barcelona Art & Architecture',
    destination: 'Barcelona, Spain',
    country: 'Spain',
    country_code: 'ES',
    category: 'Cultural Immersion',
    duration: '4 Days',
    days_count: 4,
    budget: 48000,
    currency: 'EUR',
    cover_image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=1200&q=85',
    cover_image_url: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=1200&q=85',
    description: 'Discover Barcelona through Gaudí architecture, historic quarters, artisan markets and Mediterranean cultural scenery.',
    is_ready_made: true,
    days: [
      {
        day: 1,
        title: 'Gothic Quarter & Born Artisan Guilds',
        activities: [
          { start_time: '09:30 AM', title: 'Gothic Quarter Historical Walking Tour', location: 'El Gòtic', estimated_cost: 0, description: 'Wander Roman walls, medieval courtyards, and Barcelona Cathedral.', category: 'Culture' },
          { start_time: '01:30 PM', title: 'El Born Tapas & Vermouth Tasting', location: 'El Born', estimated_cost: 35, description: 'Artisanal Iberian ham, pan con tomate, and local house vermouth.', category: 'Food' },
          { start_time: '04:30 PM', title: 'Santa Maria del Mar Gothic Basilica', location: 'Plaça de Santa Maria', estimated_cost: 10, description: '14th-century Catalan Gothic maritime church.', category: 'Culture' }
        ]
      },
      {
        day: 2,
        title: 'Antoni Gaudí Masterpieces: Sagrada Família & Casa Batlló',
        activities: [
          { start_time: '09:00 AM', title: 'Sagrada Família Towers & Nativity Facade', location: 'Eixample', estimated_cost: 36, description: 'Marvel at forest stone pillars and vibrant stained glass light.', category: 'Sightseeing' },
          { start_time: '02:30 PM', title: 'Casa Batlló & Passeig de Gràcia Modernisme', location: 'Passeig de Gràcia', estimated_cost: 35, description: 'Explore dragon-spine rooftops and undulating modernist stone facades.', category: 'Culture' }
        ]
      },
      {
        day: 3,
        title: 'Park Güell & Gràcia Village Bohemian Squares',
        activities: [
          { start_time: '09:00 AM', title: 'Park Güell Monumental Mosaic Terraces', location: 'Carmel Hill', estimated_cost: 13, description: 'Panoramic city views over mosaic salamander fountains.', category: 'Sightseeing' },
          { start_time: '03:00 PM', title: 'Gràcia Bohemian Artisan Workshops & Cafes', location: 'Vila de Gràcia', estimated_cost: 20, description: 'Independent bookshops, local ceramics, and leafy plazas.', category: 'Shopping' }
        ]
      },
      {
        day: 4,
        title: 'Montjuïc Hillside Gardens & Coastal Sunset',
        activities: [
          { start_time: '10:00 AM', title: 'Fundació Joan Miró & Montjuïc Castle', location: 'Montjuïc', estimated_cost: 15, description: 'Surrealist masterworks overlooking the Mediterranean harbor.', category: 'Culture' },
          { start_time: '06:00 PM', title: 'Barceloneta Sunset Seaside Walk & Seafood Paella', location: 'Barceloneta', estimated_cost: 45, description: 'Fresh seafood paella at a traditional seaside chiringuito.', category: 'Food' }
        ]
      }
    ]
  },
  {
    id: 'rmt-dubai-6d',
    title: 'Dubai Modern & Traditional',
    name: 'Dubai Modern & Traditional',
    destination: 'Dubai & Bedouin Heritage',
    country: 'United Arab Emirates',
    country_code: 'AE',
    category: 'Cultural Immersion',
    duration: '6 Days',
    days_count: 6,
    budget: 82000,
    currency: 'AED',
    cover_image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=85',
    cover_image_url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=85',
    description: 'See the contrast between historic Dubai Creek, traditional spice souks, Bedouin desert camps and visionary architecture.',
    is_ready_made: true,
    days: [
      {
        day: 1,
        title: 'Al Fahidi Historic District & Abra Creek Crossing',
        activities: [
          { start_time: '09:30 AM', title: 'Al Fahidi Wind-Tower Heritage Quarter', location: 'Bur Dubai', estimated_cost: 0, description: '19th-century gypsum and coral stone architecture with tea houses.', category: 'Culture' },
          { start_time: '01:00 PM', title: 'Traditional Abra Wooden Boat Crossing', location: 'Dubai Creek', estimated_cost: 2, description: 'Glide across emerald waters between Bur Dubai and Deira.', category: 'Sightseeing' },
          { start_time: '03:30 PM', title: 'Deira Gold & Fragrant Spice Souk', location: 'Deira', estimated_cost: 25, description: 'Heaped frankincense, saffron, dried limes, and Persian tea.', category: 'Shopping' }
        ]
      },
      {
        day: 2,
        title: 'Downtown Marvels: Burj Khalifa & Museum of the Future',
        activities: [
          { start_time: '10:00 AM', title: 'Museum of the Future Architectural Journey', location: 'Sheikh Zayed Rd', estimated_cost: 40, description: 'Calligraphy-clad torus building showcasing future innovations.', category: 'Culture' },
          { start_time: '04:30 PM', title: 'Burj Khalifa Sky Observation Deck', location: 'Downtown Dubai', estimated_cost: 65, description: 'Sunset vista 555 meters above the Arabian Gulf.', category: 'Sightseeing' }
        ]
      },
      {
        day: 3,
        title: 'Vintage Land Rover Desert Safari & Bedouin Camp',
        activities: [
          { start_time: '03:00 PM', title: 'Dubai Desert Conservation Reserve Drive', location: 'Al Marmoom Desert', estimated_cost: 95, description: 'Spot Arabian oryx and gazelles across golden rolling dunes.', category: 'Adventure' },
          { start_time: '07:00 PM', title: 'Traditional Bedouin Feast & Stargazing', location: 'Nomad Camp', estimated_cost: 0, description: 'Emirati camel milk coffee, lamb ouzi, and astronomy under desert skies.', category: 'Food' }
        ]
      },
      {
        day: 4,
        title: 'Jumeirah Coastal Walk & Arabian Artisan Souk',
        activities: [
          { start_time: '10:00 AM', title: 'Jumeirah Mosque Cultural Immersion', location: 'Jumeirah 1', estimated_cost: 10, description: 'Fatimid-style white stone mosque with open-doors cultural exchange.', category: 'Culture' },
          { start_time: '04:00 PM', title: 'Souk Madinat Jumeirah Canals', location: 'Al Sufouh', estimated_cost: 0, description: 'Waterway souk framed by views of Burj Al Arab.', category: 'Sightseeing' }
        ]
      },
      {
        day: 5,
        title: 'Hatta Mountain Heritage & Turquoise Dam Kayak',
        activities: [
          { start_time: '08:30 AM', title: 'Hatta Heritage Village Stone Citadels', location: 'Hajar Mountains', estimated_cost: 0, description: 'Ancient mountain fortresses and date palm falaj irrigation canals.', category: 'Culture' },
          { start_time: '01:30 PM', title: 'Hatta Dam Kayaking & Ridge Trail', location: 'Hatta Dam', estimated_cost: 20, description: 'Paddle serene turquoise waters surrounded by jagged peaks.', category: 'Adventure' }
        ]
      },
      {
        day: 6,
        title: 'Alserkal Avenue Contemporary Art District & Departure',
        activities: [
          { start_time: '10:30 AM', title: 'Alserkal Avenue Industrial Art Galleries', location: 'Al Quoz', estimated_cost: 0, description: 'Middle Eastern contemporary art spaces, indie cinema, and specialty roasters.', category: 'Culture' }
        ]
      }
    ]
  },
  {
    id: 'rmt-kyoto-7d',
    title: 'Kyoto Machiya & Ancient Shrines',
    name: 'Kyoto Machiya & Ancient Shrines',
    destination: 'Kyoto & Osaka, Japan',
    country: 'Japan',
    country_code: 'JP',
    category: 'Cultural Immersion',
    duration: '7 Days',
    days_count: 7,
    budget: 68500,
    currency: 'INR',
    cover_image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=85',
    cover_image_url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=85',
    description: 'Immerse in bamboo tranquility, historic geisha districts, moss-carpeted Zen gardens, and evening multi-course kaiseki dining by lantern light.',
    is_ready_made: true,
    days: [
      {
        day: 1,
        title: 'Arrival in Kyoto & Gion Twilight Walk',
        activities: [
          { start_time: '02:00 PM', title: 'Check-in at Machiya Townhouse', location: 'Higashiyama, Kyoto', estimated_cost: 0, description: 'Settle into authentic wooden townhouse quarters.', category: 'Sightseeing' },
          { start_time: '05:30 PM', title: 'Gion Lantern-Lit Alleyways Stroll', location: 'Gion District', estimated_cost: 0, description: 'Guided evening walk through historic teahouse lanes.', category: 'Culture' }
        ]
      }
    ]
  },
  {
    id: 'dest-douro-vineyards',
    title: 'Douro Terraced Pathways',
    name: 'Douro Terraced Pathways',
    destination: 'Porto Region, Portugal',
    country: 'Portugal',
    country_code: 'PT',
    category: 'Culinary Trails',
    duration: '5 Days',
    days_count: 5,
    budget: 42000,
    currency: 'EUR',
    cover_image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1200&q=85',
    cover_image_url: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1200&q=85',
    description: 'Follow handmade granite terraces carved into sun-drenched valley cliffs. Harvest seasonal olives with family vintners and sail historic wooden rabelo boats.',
    is_ready_made: true,
    days: [
      {
        day: 1,
        title: 'Historic Linha do Douro Rail Journey',
        activities: [
          { start_time: '10:00 AM', title: 'São Bento to Pinhão Scenic River Train', location: 'Pinhão', estimated_cost: 25, description: 'Ride along emerald waters through UNESCO terraced slopes.', category: 'Sightseeing' }
        ]
      }
    ]
  },
  {
    id: 'dest-himalayan-valley',
    title: 'Himalayan Valley Sanctuaries',
    name: 'Himalayan Valley Sanctuaries',
    destination: 'Langtang Valley, Nepal',
    country: 'Nepal',
    country_code: 'NP',
    category: 'Slow Trekking',
    duration: '7 Days',
    days_count: 7,
    budget: 35000,
    currency: 'NPR',
    cover_image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=85',
    cover_image_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=85',
    description: 'Traverse glacial meadows dotted with rhododendrons and ancient Tibetan monasteries. Share butter tea with high-altitude yak herders.',
    is_ready_made: true,
    days: [
      {
        day: 1,
        title: 'Langtang River Canopy Trek',
        activities: [
          { start_time: '08:00 AM', title: 'Syabrubesi Suspension Bridges', location: 'Syabrubesi', estimated_cost: 0, description: 'Hike pristine oak forests along glacial torrents.', category: 'Nature' }
        ]
      }
    ]
  },
  {
    id: 'dest-andean-cloudforest',
    title: 'Andean Cloud Forest Trails',
    name: 'Andean Cloud Forest Trails',
    destination: 'Sacred Valley, Peru',
    country: 'Peru',
    country_code: 'PE',
    category: 'Indigenous Communities',
    duration: '6 Days',
    days_count: 6,
    budget: 48000,
    currency: 'PEN',
    cover_image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1200&q=85',
    cover_image_url: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1200&q=85',
    description: 'Climb emerald terraced peaks wrapped in morning mist. Discover Quechua artisan weaving cooperatives and forgotten Inca stone citadels.',
    is_ready_made: true,
    days: [
      {
        day: 1,
        title: 'Pisac Ruins & Sacred Valley Artisan Market',
        activities: [
          { start_time: '09:00 AM', title: 'Pisac Cliffside Sun Temple Exploration', location: 'Pisac', estimated_cost: 30, description: 'Panoramic views across sacred agricultural terraces.', category: 'Culture' }
        ]
      }
    ]
  },
  {
    id: 'rmt-goa-5d',
    title: '5 Days Goan Cultural & Coastal Trail',
    name: '5 Days Goan Cultural & Coastal Trail',
    destination: 'Goa & Western Ghats, India',
    country: 'India',
    country_code: 'IN',
    category: 'Culinary Trails',
    duration: '5 Days',
    days_count: 5,
    budget: 18500,
    currency: 'INR',
    cover_image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=85',
    cover_image_url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=85',
    description: 'Explore Asia’s oldest Portuguese Latin Quarter, lush organic spice groves, Dudhsagar waterfalls, and artisan seaside bazaars.',
    is_ready_made: true,
    days: [
      {
        day: 1,
        title: 'Fontainhas Portuguese Heritage Walk',
        activities: [
          { start_time: '10:00 AM', title: 'Latin Quarter Azulejos & Bakeries', location: 'Panaji', estimated_cost: 0, description: 'Vibrant colonial mansions and heritage bakeries.', category: 'Culture' }
        ]
      }
    ]
  },
  {
    id: 'rmt-jaipur-3d',
    title: '3 Days Golden Triangle Jaipur Heritage',
    name: '3 Days Golden Triangle Jaipur Heritage',
    destination: 'Jaipur Pink City, India',
    country: 'India',
    country_code: 'IN',
    category: 'Heritage & Craft',
    duration: '3 Days',
    days_count: 3,
    budget: 14500,
    currency: 'INR',
    cover_image: 'https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=1200&q=85',
    cover_image_url: 'https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=1200&q=85',
    description: 'Hilltop fortress ramparts, royal palace courtyards, natural-dye block-printing artisan studios, and fragrant spice bazaars.',
    is_ready_made: true,
    days: [
      {
        day: 1,
        title: 'Amer Fort & Sheesh Mahal',
        activities: [
          { start_time: '08:30 AM', title: 'Amer Fort Citadel Ramparts', location: 'Amer', estimated_cost: 500, description: 'Explore mirror palace courtyards.', category: 'Culture' }
        ]
      }
    ]
  },
  {
    id: 'rmt-amalfi-5d',
    title: 'Amalfi Cliffside Paths & Lemon Orchards',
    name: 'Amalfi Cliffside Paths & Lemon Orchards',
    destination: 'Amalfi Coast & Positano, Italy',
    country: 'Italy',
    country_code: 'IT',
    category: 'Slow Trekking',
    duration: '5 Days',
    days_count: 5,
    budget: 62000,
    currency: 'EUR',
    cover_image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=85',
    cover_image_url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=85',
    description: 'Hike the Path of the Gods high above azure bays. Taste artisan limoncello in sunlit hillside orchards and explore pastel coastal villages.',
    is_ready_made: true,
    days: [
      {
        day: 1,
        title: 'Sentiero degli Dei Ridge Trek',
        activities: [
          { start_time: '08:30 AM', title: 'Path of the Gods Cliffside Walk', location: 'Bomerano to Nocelle', estimated_cost: 0, description: 'Spectacular panoramic Mediterranean sea vistas.', category: 'Nature' }
        ]
      }
    ]
  },
  {
    id: 'rmt-morocco-7d',
    title: 'Moroccan Medina & Berber Desert Camps',
    name: 'Moroccan Medina & Berber Desert Camps',
    destination: 'Marrakech & Sahara, Morocco',
    country: 'Morocco',
    country_code: 'MA',
    category: 'Indigenous Communities',
    duration: '7 Days',
    days_count: 7,
    budget: 54000,
    currency: 'MAD',
    cover_image: 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?auto=format&fit=crop&w=1200&q=85',
    cover_image_url: 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?auto=format&fit=crop&w=1200&q=85',
    description: 'Navigate sensory spice souks, Berber wool cooperatives, High Atlas mountain passes, and stargaze around campfires in the Erg Chebbi dunes.',
    is_ready_made: true,
    days: [
      {
        day: 1,
        title: 'Marrakech Souks & Bahia Palace',
        activities: [
          { start_time: '09:00 AM', title: 'Old Medina Artisan Craft Walk', location: 'Marrakech', estimated_cost: 0, description: 'Leather tanneries, brass lamps, and woven kilim rugs.', category: 'Culture' }
        ]
      }
    ]
  },
  {
    id: 'rmt-iceland-6d',
    title: 'Icelandic Fjord Trails & Aurora Hot Springs',
    name: 'Icelandic Fjord Trails & Aurora Hot Springs',
    destination: 'South Coast Fjords, Iceland',
    country: 'Iceland',
    country_code: 'IS',
    category: 'Slow Trekking',
    duration: '6 Days',
    days_count: 6,
    budget: 95000,
    currency: 'ISK',
    cover_image: 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?auto=format&fit=crop&w=1200&q=85',
    cover_image_url: 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?auto=format&fit=crop&w=1200&q=85',
    description: 'Witness black volcanic sand beaches, roaring glacial waterfalls, geothermal steam valleys, and nights under dancing Northern Lights.',
    is_ready_made: true,
    days: [
      {
        day: 1,
        title: 'Seljalandsfoss & Skógafoss Waterfalls',
        activities: [
          { start_time: '10:00 AM', title: 'Walk Behind Seljalandsfoss Cascades', location: 'South Coast', estimated_cost: 0, description: '60-meter high glacier waterfall cave path.', category: 'Nature' }
        ]
      }
    ]
  },
  {
    id: 'rmt-bali-6d',
    title: 'Bali Sacred Water Temples & Artisan Villages',
    name: 'Bali Sacred Water Temples & Artisan Villages',
    destination: 'Ubud & Sidemen Valley, Indonesia',
    country: 'Indonesia',
    country_code: 'ID',
    category: 'Heritage & Craft',
    duration: '6 Days',
    days_count: 6,
    budget: 38000,
    currency: 'IDR',
    cover_image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=85',
    cover_image_url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=85',
    description: 'Participate in Tirta Empul water blessings, learn woodcarving in Mas village, and hike emerald subak rice terraces in tranquil Sidemen.',
    is_ready_made: true,
    days: [
      {
        day: 1,
        title: 'Ubud Monkey Forest & Royal Palace Dance',
        activities: [
          { start_time: '09:00 AM', title: 'Padangtegal Sacred Monkey Forest Sanctuary', location: 'Ubud', estimated_cost: 5, description: 'Ancient banyan trees and mossy temple shrines.', category: 'Nature' }
        ]
      }
    ]
  },
  {
    id: 'rmt-swiss-5d',
    title: 'Swiss Alpine Rail & Glacier Passes',
    name: 'Swiss Alpine Rail & Glacier Passes',
    destination: 'Zermatt & Bernese Oberland, Switzerland',
    country: 'Switzerland',
    country_code: 'CH',
    category: 'Slow Trekking',
    duration: '5 Days',
    days_count: 5,
    budget: 110000,
    currency: 'CHF',
    cover_image: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=1200&q=85',
    cover_image_url: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=1200&q=85',
    description: 'Ride cogwheel mountain trains facing the Matterhorn, taste artisan mountain Gruyère, and hike pristine alpine wildflower ridges.',
    is_ready_made: true,
    days: [
      {
        day: 1,
        title: 'Gornergrat Cogwheel Train & Matterhorn View',
        activities: [
          { start_time: '09:00 AM', title: 'Gornergrat Alpine Panorama', location: 'Zermatt', estimated_cost: 60, description: 'Gaze over 29 four-thousand-meter peaks and Gorner Glacier.', category: 'Sightseeing' }
        ]
      }
    ]
  },
  {
    id: 'rmt-oaxaca-5d',
    title: 'Oaxacan Artisan Weaving & Culinary Roots',
    name: 'Oaxacan Artisan Weaving & Culinary Roots',
    destination: 'Oaxaca Central Valleys, Mexico',
    country: 'Mexico',
    country_code: 'MX',
    category: 'Heritage & Craft',
    duration: '5 Days',
    days_count: 5,
    budget: 34000,
    currency: 'MXN',
    cover_image: 'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?auto=format&fit=crop&w=1200&q=85',
    cover_image_url: 'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?auto=format&fit=crop&w=1200&q=85',
    description: 'Explore Zapotec natural-dye rug weavers in Teotitlán del Valle, smoke artisanal mezcal, and prepare complex mole negro with local abuelas.',
    is_ready_made: true,
    days: [
      {
        day: 1,
        title: 'Teotitlán del Valle Weaving Studio',
        activities: [
          { start_time: '10:00 AM', title: 'Cochineal & Indigo Wool Dyeing Workshop', location: 'Teotitlán', estimated_cost: 20, description: 'Hand-loom weaving with ancient Zapotec motifs.', category: 'Workshop' }
        ]
      }
    ]
  },
  {
    id: 'rmt-norway-6d',
    title: 'Norwegian Fjord Kayak & Stave Churches',
    name: 'Norwegian Fjord Kayak & Stave Churches',
    destination: 'Flåm & Nærøyfjord, Norway',
    country: 'Norway',
    country_code: 'NO',
    category: 'Slow Trekking',
    duration: '6 Days',
    days_count: 6,
    budget: 88000,
    currency: 'NOK',
    cover_image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85',
    cover_image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85',
    description: 'Paddle glassy waters between towering thousand-meter fjord cliffs, visit 12th-century Borgund stave church, and ride the steep Flåm railway.',
    is_ready_made: true,
    days: [
      {
        day: 1,
        title: 'Nærøyfjord UNESCO Kayak Expedition',
        activities: [
          { start_time: '09:30 AM', title: 'Guided Fjord Paddle & Seal Watching', location: 'Gudvangen', estimated_cost: 65, description: 'Silent glide past sheer mountain waterfalls.', category: 'Adventure' }
        ]
      }
    ]
  },
  {
    id: 'rmt-cotswolds-4d',
    title: 'Cotswolds Thatched Hamlets & Ancient Woods',
    name: 'Cotswolds Thatched Hamlets & Ancient Woods',
    destination: 'Gloucestershire Valleys, England',
    country: 'United Kingdom',
    country_code: 'GB',
    category: 'Heritage & Craft',
    duration: '4 Days',
    days_count: 4,
    budget: 45000,
    currency: 'GBP',
    cover_image: 'https://images.unsplash.com/photo-1543832923-44667a44c804?auto=format&fit=crop&w=1200&q=85',
    cover_image_url: 'https://images.unsplash.com/photo-1543832923-44667a44c804?auto=format&fit=crop&w=1200&q=85',
    description: 'Stroll honey-colored limestone cottages, historic wool churches, cozy fireplace taverns, and tranquil English country gardens.',
    is_ready_made: true,
    days: [
      {
        day: 1,
        title: 'Castle Combe & Arlington Row Heritage',
        activities: [
          { start_time: '10:00 AM', title: 'Arlington Row 14th-Century Weavers Cottages', location: 'Bibury', estimated_cost: 0, description: 'Iconic stone cottages beside the River Coln.', category: 'Culture' }
        ]
      }
    ]
  },
  {
    id: 'rmt-tasmania-6d',
    title: 'Tasmanian Wilderness & Coastal Oysters',
    name: 'Tasmanian Wilderness & Coastal Oysters',
    destination: 'Freycinet & Cradle Mountain, Australia',
    country: 'Australia',
    country_code: 'AU',
    category: 'Culinary Trails',
    duration: '6 Days',
    days_count: 6,
    budget: 76000,
    currency: 'AUD',
    cover_image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85',
    cover_image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85',
    description: 'Taste freshly shucked oysters standing in pristine sea shallows, hike pink granite hazards overlooking Wineglass Bay, and discover ancient temperate rainforests.',
    is_ready_made: true,
    days: [
      {
        day: 1,
        title: 'Wineglass Bay Lookout & Oyster Farm',
        activities: [
          { start_time: '09:00 AM', title: 'Freycinet Granite Peninsula Hike', location: 'Coles Bay', estimated_cost: 0, description: 'White sand crescent beach and crystal sapphire waters.', category: 'Nature' }
        ]
      }
    ]
  },
  {
    id: 'rmt-puglia-5d',
    title: 'Puglia Trulli Dwellings & Olive Groves',
    name: 'Puglia Trulli Dwellings & Olive Groves',
    destination: 'Itria Valley & Salento, Italy',
    country: 'Italy',
    country_code: 'IT',
    category: 'Heritage & Craft',
    duration: '5 Days',
    days_count: 5,
    budget: 49000,
    currency: 'EUR',
    cover_image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=85',
    cover_image_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=85',
    description: 'Wander limestone trulli cone houses in Alberobello, harvest centuries-old olive oils on historic masseria estates, and dine on fresh burrata.',
    is_ready_made: true,
    days: [
      {
        day: 1,
        title: 'Alberobello UNESCO Trulli Quarter Walk',
        activities: [
          { start_time: '10:00 AM', title: 'Rione Monti Ancient Dry-Stone Dwellings', location: 'Alberobello', estimated_cost: 0, description: 'Explore over a thousand whitewashed conical trulli.', category: 'Culture' }
        ]
      }
    ]
  },
  {
    id: 'rmt-patagonia-7d',
    title: 'Patagonia Glacial Lagoons & Estancias',
    name: 'Patagonia Glacial Lagoons & Estancias',
    destination: 'Torres del Paine, Chile & Argentina',
    country: 'Chile',
    country_code: 'CL',
    category: 'Slow Trekking',
    duration: '7 Days',
    days_count: 7,
    budget: 98000,
    currency: 'USD',
    cover_image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85',
    cover_image_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85',
    description: 'Hike to the towering granite horns of Torres del Paine, navigate icebergs at Grey Glacier, and ride with Patagonian gauchos on vast pampa estancias.',
    is_ready_made: true,
    days: [
      {
        day: 1,
        title: 'Mirador Las Torres Granite Towers Trek',
        activities: [
          { start_time: '07:30 AM', title: 'Ascension Valley Glacier Trail', location: 'Torres del Paine', estimated_cost: 0, description: 'Hike to the turquoise glacial tarn beneath granite spires.', category: 'Adventure' }
        ]
      }
    ]
  },
  {
    id: 'rmt-svaneti-6d',
    title: 'Svaneti Ancient Defensive Towers Trail',
    name: 'Svaneti Ancient Defensive Towers Trail',
    destination: 'Mestia & Ushguli, Georgia',
    country: 'Georgia',
    country_code: 'GE',
    category: 'Indigenous Communities',
    duration: '6 Days',
    days_count: 6,
    budget: 32000,
    currency: 'GEL',
    cover_image: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=1200&q=85',
    cover_image_url: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=1200&q=85',
    description: 'Trek through Europe’s highest continuously inhabited village beneath Mount Shkhara. Discover medieval stone watchtowers and taste fresh Svan salt.',
    is_ready_made: true,
    days: [
      {
        day: 1,
        title: 'Ushguli High Alpine Medieval Settlement',
        activities: [
          { start_time: '09:00 AM', title: 'Chazhashi Medieval Tower Fortress', location: 'Ushguli', estimated_cost: 0, description: 'UNESCO protected defensive stone towers overlooking glaciers.', category: 'Culture' }
        ]
      }
    ]
  }
];

// Curated Local Travel Slideshow Images for Explore Top Section
export const EXPLORE_HERO_SLIDES = [
  {
    id: 'hero-slide-1',
    title: 'Tropical Coastal Lagoons & Island Mountains',
    location: 'Bora Bora & Polynesia',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2200&q=85'
  },
  {
    id: 'hero-slide-2',
    title: 'Kyoto Machiya & Ancient Shrines',
    location: 'Kyoto, Japan',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=2200&q=85'
  },
  {
    id: 'hero-slide-3',
    title: 'Douro Terraced Pathways & Vineyards',
    location: 'Porto Region, Portugal',
    image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=2200&q=85'
  },
  {
    id: 'hero-slide-4',
    title: 'Himalayan Valley Sanctuaries & Shrines',
    location: 'Langtang Valley, Nepal',
    image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=2200&q=85'
  }
];

const CATEGORY_PILLS = [
  'All Experiences',
  'Cultural Immersion',
  'Heritage & Craft',
  'Culinary Trails',
  'Slow Trekking',
  'Indigenous Communities'
];

const Explore = () => {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { user } = useAuth();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Experiences');
  const [heroSlideIndex, setHeroSlideIndex] = useState(1); // Matches 02/04 from screenshot
  const [isHeroHovered, setIsHeroHovered] = useState(false);

  // Auto-play timer for top local travel slideshow
  useEffect(() => {
    if (isHeroHovered) return;
    const timer = setInterval(() => {
      setHeroSlideIndex(prev => (prev + 1) % EXPLORE_HERO_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isHeroHovered]);

  // Trip Templates State
  const [apiTrips, setApiTrips] = useState([]);
  const [savedIds, setSavedIds] = useState([]);

  // Modals & Conversion State
  const [viewItineraryTrip, setViewItineraryTrip] = useState(null);
  const [templateToConvert, setTemplateToConvert] = useState(null);
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  // Sync URL search parameters
  useEffect(() => {
    const params = new URLSearchParams(routeLocation.search);
    const s = params.get('search');
    const c = params.get('category');
    if (s) {
      setSearchQuery(s);
      setDebouncedQuery(s);
    }
    if (c) {
      const match = CATEGORY_PILLS.find(p => p.toLowerCase() === c.toLowerCase());
      if (match) setSelectedCategory(match);
    }
  }, [routeLocation.search]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load backend trips if available
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await getExploreTrips();
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          setApiTrips(res.data);
        }
      } catch (err) {
        console.warn('API trips load fallback to curated templates:', err);
      }
    };
    loadData();
  }, []);

  // Load Saved Wishlist IDs for user
  useEffect(() => {
    const loadWishlist = async () => {
      if (user?.id) {
        try {
          const res = await getSavedWishlistIds(user.id);
          setSavedIds(Array.isArray(res?.data) ? res.data : []);
        } catch {
          setSavedIds([]);
        }
      } else {
        setSavedIds([]);
      }
    };
    loadWishlist();
  }, [user]);

  // Combine curated pre-planned trips with API templates
  const allTrips = useMemo(() => {
    const map = new Map();
    CURATED_EXPLORE_TRIPS.forEach(t => map.set(t.id, t));
    apiTrips.forEach(t => {
      if (!map.has(t.id)) {
        map.set(t.id, {
          ...t,
          category: t.category || 'Cultural Immersion',
          duration: t.duration || `${t.days_count || t.days?.length || 5} Days`
        });
      }
    });
    return Array.from(map.values());
  }, [apiTrips]);

  // Filtered trips based on Search and Category Pills
  const visibleTrips = useMemo(() => {
    let list = allTrips;

    // Category Filter
    if (selectedCategory !== 'All Experiences') {
      list = list.filter(t => (t.category || '').toLowerCase() === selectedCategory.toLowerCase());
    }

    // Search Query Filter
    const q = debouncedQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(t => {
        const titleMatch = (t.title || t.name || '').toLowerCase().includes(q);
        const destMatch = (t.destination || '').toLowerCase().includes(q);
        const countryMatch = (t.country || '').toLowerCase().includes(q);
        const descMatch = (t.description || '').toLowerCase().includes(q);
        const catMatch = (t.category || '').toLowerCase().includes(q);
        const actMatch = (t.days || []).some(d =>
          (d.title || '').toLowerCase().includes(q) ||
          (d.activities || []).some(a =>
            (a.title || '').toLowerCase().includes(q) ||
            (a.location || '').toLowerCase().includes(q) ||
            (a.description || '').toLowerCase().includes(q)
          )
        );
        return titleMatch || destMatch || countryMatch || descMatch || catMatch || actMatch;
      });
    }

    return list;
  }, [allTrips, selectedCategory, debouncedQuery]);

  // Toggle Save / Wishlist
  const handleToggleWishlist = async (e, trip) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!user?.id) {
      navigate('/login', { state: { from: '/explore' } });
      return;
    }
    try {
      const res = await toggleSaveWishlistItem(trip, user.id);
      if (res.data?.isSaved) {
        setSavedIds(prev => [...prev, trip.id]);
        showToast(`Saved "${trip.name || trip.title}" to your wishlist.`);
      } else {
        setSavedIds(prev => prev.filter(id => id !== trip.id));
        showToast(`Removed from wishlist.`);
      }
    } catch {
      showToast('Saved to your wishlist.');
    }
  };

  // Convert template into personal trip
  const handleConfirmConvert = async (templateTrip, { startDate, endDate, budget }) => {
    if (!user?.id) {
      navigate('/login', { state: { returnTo: '/explore' } });
      return;
    }
    setIsCreatingTrip(true);
    try {
      const { data: newTrip, error } = await createTripFromReadyMade(templateTrip, user.id, { startDate, endDate, budget });
      if (!error && newTrip) {
        showToast(`Created trip "${newTrip.title || newTrip.name}"!`);
        setTemplateToConvert(null);
        navigate(`/trip/${newTrip.id}`);
      } else {
        showToast('Could not create trip.');
      }
    } catch {
      showToast('Could not create trip.');
    } finally {
      setIsCreatingTrip(false);
    }
  };

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
      {/* 1. CINEMATIC DARK BACKGROUND SLIDESHOW WITH SMOOTH CROSSFADE */}
      <div
        aria-hidden="true"
        className="page-bg-entrance"
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
        {EXPLORE_HERO_SLIDES.map((slide, idx) => {
          const isCurrent = idx === heroSlideIndex;
          return (
            <div
              key={slide.id}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                opacity: isCurrent ? 1 : 0,
                transition: 'opacity 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: isCurrent ? 1 : 0
              }}
            >
              <img
                src={slide.image}
                alt={slide.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  filter: 'brightness(0.72) contrast(1.05)',
                  transform: isCurrent ? 'scale(1.035)' : 'scale(1)',
                  transition: 'transform 7s ease-out'
                }}
              />
            </div>
          );
        })}

        {/* Soft Dark Vignette & Gradient Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to bottom, rgba(7, 10, 16, 0.32) 0%, rgba(7, 10, 16, 0.45) 25%, rgba(7, 10, 16, 0.78) 60%, rgba(7, 10, 16, 0.96) 100%)',
            pointerEvents: 'none',
            zIndex: 2
          }}
        />
      </div>

      {/* 2. MAIN CONTENT WRAPPER */}
      <main
        className="page-entrance"
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '100px 32px 80px 32px'
        }}
      >
        {/* HERO HEADER ROW */}
        <div
          className="page-stagger-header"
          style={{
            marginBottom: '28px'
          }}
        >
          {/* Left Title & Subtitle */}
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(2.4rem, 3.8vw, 3.2rem)',
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: '-0.03em',
                color: '#ffffff',
                margin: '0 0 8px 0',
                textShadow: '0 2px 14px rgba(0, 0, 0, 0.7)'
              }}
            >
              Explore
            </h1>
            <p
              style={{
                fontSize: 'clamp(0.9rem, 1.1vw, 1rem)',
                color: 'rgba(248, 250, 252, 0.92)',
                margin: 0,
                fontWeight: 400,
                lineHeight: 1.5,
                textShadow: '0 1px 8px rgba(0, 0, 0, 0.65)'
              }}
            >
              Discover ready-made trips, destinations, culture, and local experiences.
            </p>
          </div>
        </div>

        {/* 3. WIDE ROUNDED SEARCH BAR */}
        <div className="page-stagger-hero" style={{ marginBottom: '24px', width: '100%' }}>
          <div
            style={{
              width: '100%',
              height: '52px',
              backgroundColor: '#0c101a',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: '9999px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 6px 4px 22px',
              transition: 'box-shadow 0.2s ease, border-color 0.2s ease'
            }}
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search destinations, places, experiences, or trip templates..."
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '0.925rem',
                color: '#ffffff',
                fontWeight: 500,
                paddingRight: '12px'
              }}
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.6)',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '6px',
                  transition: 'color 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)')}
              >
                <X size={16} />
              </button>
            )}

            {/* Blue Search Button */}
            <button
              type="button"
              onClick={() => setDebouncedQuery(searchQuery)}
              style={{
                backgroundColor: '#0ea5e9',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 800,
                letterSpacing: '0.02em',
                padding: '10px 26px',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35)',
                transition: 'background-color 0.2s ease, transform 0.15s ease',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#0284c7';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#0ea5e9';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Search
            </button>
          </div>
        </div>

        {/* 4. EXPERIENCE CATEGORY FILTER PILLS (Matches screenshot) */}
        <div
          className="page-stagger-section-1"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '38px',
            overflowX: 'auto',
            paddingBottom: '8px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {CATEGORY_PILLS.map(category => {
            const isActive = selectedCategory === category;

            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                style={{
                  backgroundColor: isActive ? '#0ea5e9' : 'rgba(22, 27, 38, 0.72)',
                  color: isActive ? '#ffffff' : 'rgba(248, 250, 252, 0.85)',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 800 : 600,
                  letterSpacing: '0.01em',
                  padding: '9px 20px',
                  borderRadius: '9999px',
                  border: isActive ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 4px 16px rgba(14, 165, 233, 0.35)' : 'none',
                  transition: 'background-color 0.2s ease, border-color 0.2s ease, transform 0.15s ease, color 0.2s ease',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(34, 42, 58, 0.9)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(22, 27, 38, 0.72)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* 5. PRE-PLANNED TRIPS SECTION HEADER (Matches screenshot) */}
        <div
          className="page-stagger-section-2"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px'
          }}
        >
          {/* Section Title with Purple Sparkle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} style={{ color: '#c084fc' }} />
            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.25rem',
                fontWeight: 800,
                color: '#ffffff',
                margin: 0,
                letterSpacing: '-0.015em'
              }}
            >
              Pre-Planned Trips
            </h2>
          </div>

          {/* Dynamic Curated Count Badge */}
          <span
            style={{
              backgroundColor: 'rgba(139, 92, 246, 0.2)',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              color: '#c084fc',
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '4px 14px',
              borderRadius: '9999px',
              letterSpacing: '0.02em'
            }}
          >
            {visibleTrips.length} Curated
          </span>
        </div>

        {/* 6. TRIP CARDS RESPONSIVE GRID (Matches screenshot) */}
        {visibleTrips.length > 0 ? (
          <div
            className="page-stagger-section-2"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))',
              gap: '28px'
            }}
          >
            {visibleTrips.map((trip, idx) => {
              const isSaved = savedIds.includes(trip.id);

              return (
                <div
                  key={trip.id}
                  className="page-card-entrance"
                  style={{
                    backgroundColor: '#0d121f',
                    border: '1px solid rgba(255, 255, 255, 0.09)',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 16px 36px rgba(0, 0, 0, 0.6)',
                    animationDelay: `${idx * 0.05}s`,
                    transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 24px 50px rgba(0, 0, 0, 0.75), 0 0 24px rgba(14, 165, 233, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.22)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 16px 36px rgba(0, 0, 0, 0.6)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.09)';
                  }}
                >
                  {/* Card Image Area */}
                  <div
                    style={{
                      height: '235px',
                      position: 'relative',
                      overflow: 'hidden',
                      backgroundColor: '#141a28'
                    }}
                  >
                    <img
                      src={trip.cover_image || trip.cover_image_url || trip.image}
                      alt={trip.title || trip.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center',
                        transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                    />

                    {/* Deep Bottom Dark Gradient */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background:
                          'linear-gradient(to top, rgba(13, 18, 31, 0.98) 0%, rgba(13, 18, 31, 0.5) 45%, rgba(13, 18, 31, 0.08) 80%, transparent 100%)',
                        pointerEvents: 'none'
                      }}
                    />

                    {/* Top-Left Purple Duration Badge */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '14px',
                        left: '14px',
                        zIndex: 3,
                        backgroundColor: '#8b5cf6',
                        color: '#ffffff',
                        fontSize: '0.725rem',
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Calendar size={11} strokeWidth={2.5} />
                      <span>{trip.duration || `${trip.days_count || 4} Days`}</span>
                    </div>

                    {/* Top-Right Wishlist Pill */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleWishlist(e, trip)}
                      aria-label={isSaved ? 'Remove from Wishlist' : 'Add to Wishlist'}
                      style={{
                        position: 'absolute',
                        top: '14px',
                        right: '14px',
                        zIndex: 3,
                        backgroundColor: isSaved ? 'rgba(168, 85, 247, 0.9)' : 'rgba(13, 18, 31, 0.75)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        border: isSaved ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.16)',
                        borderRadius: '9999px',
                        padding: '5px 12px',
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        color: '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'transform 0.15s ease, background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <Heart
                        size={12}
                        fill={isSaved ? '#ffffff' : 'none'}
                        strokeWidth={2.5}
                      />
                      <span>{isSaved ? 'Saved' : 'Wishlist'}</span>
                    </button>

                    {/* Bottom-Left Emerald Location Badge */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '12px',
                        left: '14px',
                        zIndex: 3,
                        backgroundColor: 'rgba(6, 78, 59, 0.85)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: '1px solid rgba(52, 211, 153, 0.3)',
                        color: '#34d399',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)'
                      }}
                    >
                      <MapPin size={12} style={{ color: '#34d399', flexShrink: 0 }} />
                      <span>{trip.destination}</span>
                    </div>
                  </div>

                  {/* Card Content & Action Buttons */}
                  <div
                    style={{
                      padding: '20px 22px 22px 22px',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '14px'
                    }}
                  >
                    <div>
                      {/* Trip Title */}
                      <h3
                        style={{
                          fontFamily: 'var(--font-heading)',
                          fontSize: '1.25rem',
                          fontWeight: 800,
                          color: '#ffffff',
                          lineHeight: 1.25,
                          margin: '0 0 8px 0',
                          letterSpacing: '-0.015em'
                        }}
                      >
                        {trip.title || trip.name}
                      </h3>

                      {/* Trip Description */}
                      <p
                        style={{
                          fontSize: '0.85rem',
                          color: 'rgba(226, 232, 240, 0.75)',
                          lineHeight: 1.55,
                          margin: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {trip.description}
                      </p>
                    </div>

                    {/* Bottom Action Buttons: View Itinerary & + Create Trip */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginTop: '10px'
                      }}
                    >
                      {/* View Itinerary Button */}
                      <button
                        type="button"
                        onClick={() => setViewItineraryTrip(trip)}
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.14)',
                          color: '#ffffff',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          borderRadius: '9999px',
                          padding: '10px 18px',
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)',
                          transition: 'background-color 0.2s ease, border-color 0.2s ease, transform 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.16)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <Eye size={14} style={{ color: 'rgba(255, 255, 255, 0.85)' }} />
                        <span>View Itinerary</span>
                      </button>

                      {/* Create Trip Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!user) {
                            navigate('/login', { state: { returnTo: '/explore' } });
                          } else {
                            setTemplateToConvert(trip);
                          }
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                          border: 'none',
                          color: '#ffffff',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          letterSpacing: '0.02em',
                          borderRadius: '9999px',
                          padding: '10px 20px',
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          boxShadow: '0 4px 16px rgba(14, 165, 233, 0.35)',
                          transition: 'opacity 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(14, 165, 233, 0.5)';
                          e.currentTarget.style.opacity = '0.95';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 16px rgba(14, 165, 233, 0.35)';
                          e.currentTarget.style.opacity = '1';
                        }}
                      >
                        <Plus size={14} strokeWidth={2.5} />
                        <span>Create Trip</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div
            style={{
              backgroundColor: '#0d121f',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '48px 24px',
              textAlign: 'center',
              maxWidth: '520px',
              margin: '40px auto'
            }}
          >
            <Compass size={42} style={{ color: 'rgba(255, 255, 255, 0.4)', marginBottom: '16px' }} />
            <h3
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.2rem',
                color: '#ffffff',
                margin: '0 0 8px 0'
              }}
            >
              No Curated Trips Found
            </h3>
            <p
              style={{
                color: 'rgba(226, 232, 240, 0.7)',
                fontSize: '0.875rem',
                lineHeight: 1.55,
                marginBottom: '24px'
              }}
            >
              No trips match your search "{debouncedQuery}". Try searching for another city, country, or category.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setDebouncedQuery('');
                setSelectedCategory('All Experiences');
              }}
              style={{
                backgroundColor: '#0ea5e9',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.85rem',
                padding: '10px 24px',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>

      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 1000,
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid #0ea5e9',
            borderRadius: '12px',
            padding: '12px 18px',
            color: '#ffffff',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <CheckCircle2 size={16} style={{ color: '#38bdf8' }} />
          <span style={{ fontSize: '0.85rem' }}>{toastMsg}</span>
        </div>
      )}

      {/* View Itinerary Modal */}
      {viewItineraryTrip && (
        <ViewItineraryModal
          isOpen={Boolean(viewItineraryTrip)}
          onClose={() => setViewItineraryTrip(null)}
          trip={viewItineraryTrip}
          isInWishlist={savedIds.includes(viewItineraryTrip.id)}
          onToggleWishlist={(trip) => handleToggleWishlist({ stopPropagation: () => {} }, trip)}
          onCreateTrip={(trip) => {
            setViewItineraryTrip(null);
            if (!user) {
              navigate('/login', { state: { returnTo: '/explore' } });
            } else {
              setTemplateToConvert(trip);
            }
          }}
        />
      )}

      {/* Convert Template Modal */}
      {templateToConvert && (
        <ConvertTemplateModal
          isOpen={Boolean(templateToConvert)}
          onClose={() => setTemplateToConvert(null)}
          templateTrip={templateToConvert}
          onConfirm={handleConfirmConvert}
          isSubmitting={isCreatingTrip}
        />
      )}
    </div>
  );
};

export default Explore;
