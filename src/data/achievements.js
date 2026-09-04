// ==============================================================================
// LOCORA TRAVEL ACHIEVEMENTS CATALOGUE & VERIFIED DESTINATIONS
// 130 Curated, Verifiable Travel Achievements Across 5 Regions
// ==============================================================================

export const SUPPORTED_COUNTRIES = [
  { country: 'Global', countryCode: 'GLOBAL', flag: '🌍' },
  { country: 'India', countryCode: 'IN', flag: '🇮🇳' },
  { country: 'United States', countryCode: 'US', flag: '🇺🇸' },
  { country: 'Japan', countryCode: 'JP', flag: '🇯🇵' },
  { country: 'France', countryCode: 'FR', flag: '🇫🇷' }
];

// Verified GPS destination targets with target-specific geofence radii (km)
// POIs: 0.15 - 0.35 km | Districts/Parks: 0.4 - 0.8 km | Municipalities: 15 - 35 km
export const VERIFIED_TARGETS = [
  // --- INDIA ---
  { id: 'poi-in-hawa-mahal', name: 'Hawa Mahal', placeId: 'ChIJz2xYq_INAW_HAWA', city: 'Jaipur', country: 'India', countryCode: 'IN', lat: 26.9239, lng: 75.8267, radiusKm: 0.25, tier: 'poi', category: 'Culture' },
  { id: 'poi-in-amber-fort', name: 'Amber Fort', placeId: 'ChIJz2xYq_INAW_AMBER', city: 'Jaipur', country: 'India', countryCode: 'IN', lat: 26.9855, lng: 75.8513, radiusKm: 0.40, tier: 'district', category: 'History' },
  { id: 'city-in-jaipur', name: 'Jaipur (Pink City)', city: 'Jaipur', country: 'India', countryCode: 'IN', lat: 26.9124, lng: 75.7873, radiusKm: 30, tier: 'city', category: 'Culture' },
  
  { id: 'poi-in-taj-mahal', name: 'Taj Mahal', placeId: 'ChIJ688VfG9ldDkR31m62T1V0b8', city: 'Agra', country: 'India', countryCode: 'IN', lat: 27.1751, lng: 78.0421, radiusKm: 0.30, tier: 'poi', category: 'History' },
  { id: 'city-in-agra', name: 'Agra City', city: 'Agra', country: 'India', countryCode: 'IN', lat: 27.1767, lng: 78.0081, radiusKm: 25, tier: 'city', category: 'History' },

  { id: 'poi-in-red-fort', name: 'Red Fort (Lal Qila)', placeId: 'ChIJ3-d49QkFDTkRO4k1z8yv1aA', city: 'Delhi', country: 'India', countryCode: 'IN', lat: 28.6562, lng: 77.2410, radiusKm: 0.35, tier: 'poi', category: 'History' },
  { id: 'poi-in-qutub-minar', name: 'Qutub Minar', placeId: 'ChIJF03U7gIGDTkR11G62T1V0b8', city: 'Delhi', country: 'India', countryCode: 'IN', lat: 28.5245, lng: 77.1855, radiusKm: 0.30, tier: 'poi', category: 'History' },
  { id: 'city-in-delhi', name: 'National Capital Territory of Delhi', city: 'Delhi', country: 'India', countryCode: 'IN', lat: 28.6139, lng: 77.2090, radiusKm: 35, tier: 'city', category: 'History' },

  { id: 'poi-in-lake-pichola', name: 'Lake Pichola & City Palace', placeId: 'ChIJX1234_UDAIPUR', city: 'Udaipur', country: 'India', countryCode: 'IN', lat: 24.5764, lng: 73.6835, radiusKm: 0.50, tier: 'district', category: 'Culture' },
  { id: 'city-in-udaipur', name: 'Udaipur (City of Lakes)', city: 'Udaipur', country: 'India', countryCode: 'IN', lat: 24.5854, lng: 73.7125, radiusKm: 25, tier: 'city', category: 'Culture' },

  { id: 'poi-in-mehrangarh', name: 'Mehrangarh Fort', placeId: 'ChIJMehrangarh_JODHPUR', city: 'Jodhpur', country: 'India', countryCode: 'IN', lat: 26.2978, lng: 73.0186, radiusKm: 0.35, tier: 'poi', category: 'History' },
  { id: 'city-in-jodhpur', name: 'Jodhpur (Blue City)', city: 'Jodhpur', country: 'India', countryCode: 'IN', lat: 26.2389, lng: 73.0243, radiusKm: 25, tier: 'city', category: 'History' },

  { id: 'poi-in-fontainhas', name: 'Fontainhas Latin Quarter', placeId: 'ChIJn3uP8bravzsRM3r6XbW2D3E', city: 'Panaji', country: 'India', countryCode: 'IN', lat: 15.4989, lng: 73.8315, radiusKm: 0.40, tier: 'district', category: 'Hidden Gems' },
  { id: 'poi-in-bom-jesus', name: 'Basilica of Bom Jesus', placeId: 'ChIJbU5qgZ_cvzsRLG9t6qMvjVE', city: 'Panaji', country: 'India', countryCode: 'IN', lat: 15.5009, lng: 73.9116, radiusKm: 0.25, tier: 'poi', category: 'History' },
  { id: 'city-in-goa', name: 'Goa Coast & Panaji', city: 'Panaji', country: 'India', countryCode: 'IN', lat: 15.4909, lng: 73.8278, radiusKm: 30, tier: 'city', category: 'Hidden Gems' },

  { id: 'poi-in-fort-kochi', name: 'Fort Kochi Chinese Fishing Nets', placeId: 'ChIJKochi_NETS', city: 'Kochi', country: 'India', countryCode: 'IN', lat: 9.9674, lng: 76.2429, radiusKm: 0.35, tier: 'poi', category: 'Culture' },
  { id: 'city-in-kochi', name: 'Kochi & Backwaters', city: 'Kochi', country: 'India', countryCode: 'IN', lat: 9.9312, lng: 76.2673, radiusKm: 30, tier: 'city', category: 'Nature' },

  { id: 'poi-in-dashashwamedh', name: 'Dashashwamedh Ghat', placeId: 'ChIJVaranasi_GHAT', city: 'Varanasi', country: 'India', countryCode: 'IN', lat: 25.3076, lng: 83.0104, radiusKm: 0.30, tier: 'poi', category: 'Culture' },
  { id: 'city-in-varanasi', name: 'Varanasi Ancient City', city: 'Varanasi', country: 'India', countryCode: 'IN', lat: 25.3176, lng: 82.9739, radiusKm: 25, tier: 'city', category: 'Culture' },

  { id: 'poi-in-gateway-india', name: 'Gateway of India', placeId: 'ChIJMumbai_GATEWAY', city: 'Mumbai', country: 'India', countryCode: 'IN', lat: 18.9220, lng: 72.8347, radiusKm: 0.25, tier: 'poi', category: 'Cities' },
  { id: 'city-in-mumbai', name: 'Mumbai Metropolis', city: 'Mumbai', country: 'India', countryCode: 'IN', lat: 19.0760, lng: 72.8777, radiusKm: 35, tier: 'city', category: 'Cities' },

  { id: 'poi-in-golden-temple', name: 'Sri Harmandir Sahib (Golden Temple)', placeId: 'ChIJAmritsar_TEMPLE', city: 'Amritsar', country: 'India', countryCode: 'IN', lat: 31.6200, lng: 74.8765, radiusKm: 0.30, tier: 'poi', category: 'Culture' },
  { id: 'city-in-amritsar', name: 'Amritsar City', city: 'Amritsar', country: 'India', countryCode: 'IN', lat: 31.6340, lng: 74.8723, radiusKm: 25, tier: 'city', category: 'Culture' },

  { id: 'poi-in-solang-valley', name: 'Solang Valley & Rohtang', placeId: 'ChIJManali_SOLANG', city: 'Manali', country: 'India', countryCode: 'IN', lat: 32.3166, lng: 77.1578, radiusKm: 0.80, tier: 'district', category: 'Nature' },
  { id: 'city-in-manali', name: 'Manali Valley', city: 'Manali', country: 'India', countryCode: 'IN', lat: 32.2432, lng: 77.1892, radiusKm: 25, tier: 'city', category: 'Nature' },

  { id: 'poi-in-triveni-ghat', name: 'Triveni Ghat & Laxman Jhula', placeId: 'ChIJRishikesh_GHAT', city: 'Rishikesh', country: 'India', countryCode: 'IN', lat: 30.1065, lng: 78.2985, radiusKm: 0.40, tier: 'district', category: 'Adventure' },
  { id: 'city-in-rishikesh', name: 'Rishikesh Foothills', city: 'Rishikesh', country: 'India', countryCode: 'IN', lat: 30.0869, lng: 78.2676, radiusKm: 20, tier: 'city', category: 'Adventure' },

  // --- JAPAN ---
  { id: 'poi-jp-fushimi', name: 'Fushimi Inari Taisha', placeId: 'ChIJz2xYq_INAWARK4q3f2vY_3A', city: 'Kyoto', country: 'Japan', countryCode: 'JP', lat: 34.9671, lng: 135.7727, radiusKm: 0.35, tier: 'poi', category: 'Culture' },
  { id: 'poi-jp-kinkakuji', name: 'Kinkaku-ji (Golden Pavilion)', placeId: 'ChIJb6e9-hINAWARsC-rQO0pW3k', city: 'Kyoto', country: 'Japan', countryCode: 'JP', lat: 35.0394, lng: 135.7292, radiusKm: 0.25, tier: 'poi', category: 'Culture' },
  { id: 'poi-jp-arashiyama', name: 'Arashiyama Bamboo Grove', placeId: 'ChIJz2rYjF4MAWARyT9QdJ86aVo', city: 'Kyoto', country: 'Japan', countryCode: 'JP', lat: 35.0169, lng: 135.6713, radiusKm: 0.45, tier: 'district', category: 'Nature' },
  { id: 'city-jp-kyoto', name: 'Kyoto Ancient Capital', city: 'Kyoto', country: 'Japan', countryCode: 'JP', lat: 35.0116, lng: 135.7681, radiusKm: 25, tier: 'city', category: 'Culture' },

  { id: 'poi-jp-shibuya', name: 'Shibuya Scramble Crossing', placeId: 'ChIJTokyo_SHIBUYA', city: 'Tokyo', country: 'Japan', countryCode: 'JP', lat: 35.6595, lng: 139.7004, radiusKm: 0.25, tier: 'poi', category: 'Cities' },
  { id: 'poi-jp-sensoji', name: 'Senso-ji Temple', placeId: 'ChIJTokyo_SENSOJI', city: 'Tokyo', country: 'Japan', countryCode: 'JP', lat: 35.7148, lng: 139.7967, radiusKm: 0.30, tier: 'poi', category: 'Culture' },
  { id: 'city-jp-tokyo', name: 'Tokyo Metropolis', city: 'Tokyo', country: 'Japan', countryCode: 'JP', lat: 35.6762, lng: 139.6503, radiusKm: 35, tier: 'city', category: 'Cities' },

  { id: 'poi-jp-dotonbori', name: 'Dotonbori Glico Sign', placeId: 'ChIJOsaka_DOTONBORI', city: 'Osaka', country: 'Japan', countryCode: 'JP', lat: 34.6687, lng: 135.5013, radiusKm: 0.30, tier: 'poi', category: 'Food' },
  { id: 'poi-jp-osaka-castle', name: 'Osaka Castle', placeId: 'ChIJOsaka_CASTLE', city: 'Osaka', country: 'Japan', countryCode: 'JP', lat: 34.6873, lng: 135.5262, radiusKm: 0.40, tier: 'district', category: 'History' },
  { id: 'city-jp-osaka', name: 'Osaka City', city: 'Osaka', country: 'Japan', countryCode: 'JP', lat: 34.6937, lng: 135.5023, radiusKm: 25, tier: 'city', category: 'Food' },

  { id: 'poi-jp-todaiji', name: 'Todai-ji & Nara Deer Park', placeId: 'ChIJNara_TODAIJI', city: 'Nara', country: 'Japan', countryCode: 'JP', lat: 34.6851, lng: 135.8048, radiusKm: 0.50, tier: 'district', category: 'Culture' },
  { id: 'city-jp-nara', name: 'Nara Historical City', city: 'Nara', country: 'Japan', countryCode: 'JP', lat: 34.6851, lng: 135.8048, radiusKm: 20, tier: 'city', category: 'Culture' },

  { id: 'poi-jp-odori-park', name: 'Odori Park & TV Tower', placeId: 'ChIJSapporo_ODORI', city: 'Sapporo', country: 'Japan', countryCode: 'JP', lat: 43.0598, lng: 141.3533, radiusKm: 0.40, tier: 'district', category: 'Nature' },
  { id: 'city-jp-sapporo', name: 'Sapporo & Hokkaido', city: 'Sapporo', country: 'Japan', countryCode: 'JP', lat: 43.0618, lng: 141.3545, radiusKm: 30, tier: 'city', category: 'Nature' },

  { id: 'poi-jp-lake-ashi', name: 'Lake Ashi & Mount Fuji Viewpoint', placeId: 'ChIJHakone_ASHI', city: 'Hakone', country: 'Japan', countryCode: 'JP', lat: 35.2046, lng: 139.0267, radiusKm: 0.60, tier: 'district', category: 'Nature' },
  { id: 'city-jp-fuji', name: 'Mount Fuji & Hakone', city: 'Hakone', country: 'Japan', countryCode: 'JP', lat: 35.2323, lng: 139.1069, radiusKm: 25, tier: 'city', category: 'Nature' },

  { id: 'poi-jp-peace-dome', name: 'Hiroshima Peace Memorial (Atomic Bomb Dome)', placeId: 'ChIJHiroshima_DOME', city: 'Hiroshima', country: 'Japan', countryCode: 'JP', lat: 34.3955, lng: 132.4536, radiusKm: 0.30, tier: 'poi', category: 'History' },
  { id: 'city-jp-hiroshima', name: 'Hiroshima City', city: 'Hiroshima', country: 'Japan', countryCode: 'JP', lat: 34.3853, lng: 132.4553, radiusKm: 25, tier: 'city', category: 'History' },

  { id: 'poi-jp-kenrokuen', name: 'Kenroku-en Garden', placeId: 'ChIJKanazawa_GARDEN', city: 'Kanazawa', country: 'Japan', countryCode: 'JP', lat: 36.5621, lng: 136.6626, radiusKm: 0.35, tier: 'district', category: 'Culture' },
  { id: 'city-jp-kanazawa', name: 'Kanazawa Castle Town', city: 'Kanazawa', country: 'Japan', countryCode: 'JP', lat: 36.5613, lng: 136.6562, radiusKm: 20, tier: 'city', category: 'Culture' },

  { id: 'poi-jp-nakasu-yatai', name: 'Nakasu Yatai Food Stalls', placeId: 'ChIJFukuoka_YATAI', city: 'Fukuoka', country: 'Japan', countryCode: 'JP', lat: 33.5904, lng: 130.4068, radiusKm: 0.30, tier: 'poi', category: 'Food' },
  { id: 'city-jp-fukuoka', name: 'Fukuoka City', city: 'Fukuoka', country: 'Japan', countryCode: 'JP', lat: 33.5904, lng: 130.4017, radiusKm: 25, tier: 'city', category: 'Food' },

  { id: 'poi-jp-sanmachi', name: 'Sanmachi Suji Historic Merchant Houses', placeId: 'ChIJTakayama_OLD', city: 'Takayama', country: 'Japan', countryCode: 'JP', lat: 36.1408, lng: 137.2588, radiusKm: 0.35, tier: 'district', category: 'Hidden Gems' },
  { id: 'city-jp-takayama', name: 'Takayama Hida Village', city: 'Takayama', country: 'Japan', countryCode: 'JP', lat: 36.1461, lng: 137.2522, radiusKm: 20, tier: 'city', category: 'Hidden Gems' },

  // --- USA ---
  { id: 'poi-us-central-park', name: 'Central Park', placeId: 'ChIJNYC_CENTRAL_PARK', city: 'New York', country: 'United States', countryCode: 'US', lat: 40.7829, lng: -73.9654, radiusKm: 0.75, tier: 'district', category: 'Nature' },
  { id: 'poi-us-times-square', name: 'Times Square & Broadway', placeId: 'ChIJNYC_TIMES_SQ', city: 'New York', country: 'United States', countryCode: 'US', lat: 40.7580, lng: -73.9855, radiusKm: 0.25, tier: 'poi', category: 'Cities' },
  { id: 'city-us-nyc', name: 'New York City', city: 'New York', country: 'United States', countryCode: 'US', lat: 40.7128, lng: -74.0060, radiusKm: 30, tier: 'city', category: 'Cities' },

  { id: 'poi-us-golden-gate', name: 'Golden Gate Bridge', placeId: 'ChIJSF_GOLDEN_GATE', city: 'San Francisco', country: 'United States', countryCode: 'US', lat: 37.8199, lng: -122.4783, radiusKm: 0.40, tier: 'poi', category: 'Exploration' },
  { id: 'city-us-sf', name: 'San Francisco', city: 'San Francisco', country: 'United States', countryCode: 'US', lat: 37.7749, lng: -122.4194, radiusKm: 25, tier: 'city', category: 'Exploration' },

  { id: 'poi-us-el-capitan', name: 'El Capitan & Yosemite Valley', placeId: 'ChIJYosemite_EL_CAP', city: 'Yosemite', country: 'United States', countryCode: 'US', lat: 37.7340, lng: -119.6377, radiusKm: 0.80, tier: 'district', category: 'Nature' },
  { id: 'city-us-yosemite', name: 'Yosemite National Park', city: 'Yosemite', country: 'United States', countryCode: 'US', lat: 37.8651, lng: -119.5383, radiusKm: 40, tier: 'city', category: 'Nature' },

  { id: 'poi-us-hollywood-sign', name: 'Hollywood Walk of Fame & Sign', placeId: 'ChIJLA_HOLLYWOOD', city: 'Los Angeles', country: 'United States', countryCode: 'US', lat: 34.1016, lng: -118.3268, radiusKm: 0.35, tier: 'poi', category: 'Culture' },
  { id: 'city-us-la', name: 'Los Angeles', city: 'Los Angeles', country: 'United States', countryCode: 'US', lat: 34.0522, lng: -118.2437, radiusKm: 35, tier: 'city', category: 'Culture' },

  { id: 'poi-us-millennium-park', name: 'Millennium Park (Cloud Gate)', placeId: 'ChIJChicago_BEAN', city: 'Chicago', country: 'United States', countryCode: 'US', lat: 41.8826, lng: -87.6226, radiusKm: 0.30, tier: 'poi', category: 'Cities' },
  { id: 'city-us-chicago', name: 'Chicago Loop', city: 'Chicago', country: 'United States', countryCode: 'US', lat: 41.8781, lng: -87.6298, radiusKm: 30, tier: 'city', category: 'Cities' },

  { id: 'poi-us-bellagio-fountains', name: 'Bellagio Fountains on the Strip', placeId: 'ChIJVegas_BELLAGIO', city: 'Las Vegas', country: 'United States', countryCode: 'US', lat: 36.1126, lng: -115.1767, radiusKm: 0.30, tier: 'poi', category: 'Entertainment' },
  { id: 'city-us-vegas', name: 'Las Vegas', city: 'Las Vegas', country: 'United States', countryCode: 'US', lat: 36.1699, lng: -115.1398, radiusKm: 25, tier: 'city', category: 'Entertainment' },

  { id: 'poi-us-south-rim', name: 'Grand Canyon South Rim', placeId: 'ChIJCanyon_RIM', city: 'Grand Canyon', country: 'United States', countryCode: 'US', lat: 36.0544, lng: -112.1401, radiusKm: 0.80, tier: 'district', category: 'Nature' },
  { id: 'city-us-canyon', name: 'Grand Canyon Region', city: 'Grand Canyon', country: 'United States', countryCode: 'US', lat: 36.0544, lng: -112.1401, radiusKm: 45, tier: 'city', category: 'Nature' },

  { id: 'poi-us-pike-place', name: 'Pike Place Market', placeId: 'ChIJSeattle_PIKE', city: 'Seattle', country: 'United States', countryCode: 'US', lat: 47.6097, lng: -122.3422, radiusKm: 0.25, tier: 'poi', category: 'Food' },
  { id: 'city-us-seattle', name: 'Seattle', city: 'Seattle', country: 'United States', countryCode: 'US', lat: 47.6062, lng: -122.3321, radiusKm: 25, tier: 'city', category: 'Food' },

  { id: 'poi-us-french-quarter', name: 'French Quarter & Bourbon St', placeId: 'ChIJNOLA_FRENCH_QTR', city: 'New Orleans', country: 'United States', countryCode: 'US', lat: 29.9584, lng: -90.0644, radiusKm: 0.40, tier: 'district', category: 'Culture' },
  { id: 'city-us-neworleans', name: 'New Orleans', city: 'New Orleans', country: 'United States', countryCode: 'US', lat: 29.9511, lng: -90.0715, radiusKm: 20, tier: 'city', category: 'Culture' },

  { id: 'poi-us-south-congress', name: 'South Congress Avenue', placeId: 'ChIJAustin_SOCO', city: 'Austin', country: 'United States', countryCode: 'US', lat: 30.2505, lng: -97.7497, radiusKm: 0.40, tier: 'district', category: 'Culture' },
  { id: 'city-us-austin', name: 'Austin', city: 'Austin', country: 'United States', countryCode: 'US', lat: 30.2672, lng: -97.7431, radiusKm: 25, tier: 'city', category: 'Culture' },

  // --- FRANCE ---
  { id: 'poi-fr-eiffel-tower', name: 'Eiffel Tower & Champ de Mars', placeId: 'ChIJParis_EIFFEL', city: 'Paris', country: 'France', countryCode: 'FR', lat: 48.8584, lng: 2.2945, radiusKm: 0.30, tier: 'poi', category: 'Culture' },
  { id: 'poi-fr-louvre', name: 'Louvre Museum & Pyramid', placeId: 'ChIJParis_LOUVRE', city: 'Paris', country: 'France', countryCode: 'FR', lat: 48.8606, lng: 2.3376, radiusKm: 0.35, tier: 'poi', category: 'Culture' },
  { id: 'city-fr-paris', name: 'Paris (City of Lights)', city: 'Paris', country: 'France', countryCode: 'FR', lat: 48.8566, lng: 2.3522, radiusKm: 25, tier: 'city', category: 'Culture' },

  { id: 'poi-fr-promenade-anglais', name: 'Promenade des Anglais', placeId: 'ChIJNice_PROMENADE', city: 'Nice', country: 'France', countryCode: 'FR', lat: 43.6952, lng: 7.2653, radiusKm: 0.40, tier: 'district', category: 'Nature' },
  { id: 'city-fr-nice', name: 'Nice & French Riviera', city: 'Nice', country: 'France', countryCode: 'FR', lat: 43.7102, lng: 7.2620, radiusKm: 25, tier: 'city', category: 'Nature' },

  { id: 'poi-fr-vieux-lyon', name: 'Vieux Lyon & Traboules', placeId: 'ChIJLyon_VIEUX', city: 'Lyon', country: 'France', countryCode: 'FR', lat: 45.7628, lng: 4.8271, radiusKm: 0.35, tier: 'district', category: 'Food' },
  { id: 'city-fr-lyon', name: 'Lyon (Gastronomy Capital)', city: 'Lyon', country: 'France', countryCode: 'FR', lat: 45.7640, lng: 4.8357, radiusKm: 25, tier: 'city', category: 'Food' },

  { id: 'poi-fr-place-bourse', name: 'Place de la Bourse & Miroir d’Eau', placeId: 'ChIJBordeaux_BOURSE', city: 'Bordeaux', country: 'France', countryCode: 'FR', lat: 44.8417, lng: -0.5694, radiusKm: 0.25, tier: 'poi', category: 'Food' },
  { id: 'city-fr-bordeaux', name: 'Bordeaux Historic City', city: 'Bordeaux', country: 'France', countryCode: 'FR', lat: 44.8378, lng: -0.5792, radiusKm: 25, tier: 'city', category: 'Food' },

  { id: 'poi-fr-vieux-port', name: 'Vieux-Port & Notre-Dame de la Garde', placeId: 'ChIJMarseille_PORT', city: 'Marseille', country: 'France', countryCode: 'FR', lat: 43.2952, lng: 5.3744, radiusKm: 0.40, tier: 'district', category: 'Nature' },
  { id: 'city-fr-marseille', name: 'Marseille & Calanques', city: 'Marseille', country: 'France', countryCode: 'FR', lat: 43.2965, lng: 5.3698, radiusKm: 25, tier: 'city', category: 'Nature' },

  { id: 'poi-fr-petite-france', name: 'Petite France & Cathedral', placeId: 'ChIJStrasbourg_PETITE', city: 'Strasbourg', country: 'France', countryCode: 'FR', lat: 48.5807, lng: 7.7424, radiusKm: 0.35, tier: 'district', category: 'History' },
  { id: 'city-fr-strasbourg', name: 'Strasbourg & Alsace', city: 'Strasbourg', country: 'France', countryCode: 'FR', lat: 48.5734, lng: 7.7521, radiusKm: 20, tier: 'city', category: 'History' },

  { id: 'poi-fr-aiguille-midi', name: 'Aiguille du Midi & Mer de Glace', placeId: 'ChIJChamonix_MIDI', city: 'Chamonix', country: 'France', countryCode: 'FR', lat: 45.8790, lng: 6.8875, radiusKm: 0.60, tier: 'district', category: 'Adventure' },
  { id: 'city-fr-chamonix', name: 'Chamonix Mont-Blanc', city: 'Chamonix', country: 'France', countryCode: 'FR', lat: 45.9237, lng: 6.8694, radiusKm: 20, tier: 'city', category: 'Adventure' },

  { id: 'poi-fr-cours-mirabeau', name: 'Cours Mirabeau & Lavender Squares', placeId: 'ChIJAix_MIRABEAU', city: 'Aix-en-Provence', country: 'France', countryCode: 'FR', lat: 43.5263, lng: 5.4497, radiusKm: 0.35, tier: 'district', category: 'Nature' },
  { id: 'city-fr-provence', name: 'Aix-en-Provence & Valensole', city: 'Aix-en-Provence', country: 'France', countryCode: 'FR', lat: 43.5297, lng: 5.4474, radiusKm: 25, tier: 'city', category: 'Nature' },

  { id: 'poi-fr-mont-abbey', name: 'Mont Saint-Michel Abbey Fortress', placeId: 'ChIJMichel_ABBEY', city: 'Mont Saint-Michel', country: 'France', countryCode: 'FR', lat: 48.6360, lng: -1.5115, radiusKm: 0.35, tier: 'poi', category: 'History' },
  { id: 'city-fr-michel', name: 'Mont Saint-Michel Bay', city: 'Mont Saint-Michel', country: 'France', countryCode: 'FR', lat: 48.6360, lng: -1.5115, radiusKm: 15, tier: 'city', category: 'History' },

  { id: 'poi-fr-chambord', name: 'Château de Chambord', placeId: 'ChIJLoire_CHAMBORD', city: 'Tours', country: 'France', countryCode: 'FR', lat: 47.6161, lng: 1.5172, radiusKm: 0.45, tier: 'district', category: 'History' },
  { id: 'city-fr-loire', name: 'Loire Valley Castles & Tours', city: 'Tours', country: 'France', countryCode: 'FR', lat: 47.3941, lng: 0.6848, radiusKm: 30, tier: 'city', category: 'History' }
];

export const ACHIEVEMENTS_COLLECTION = [
  // ============================================================================
  // GLOBAL ACHIEVEMENTS (26)
  // ============================================================================
  {
    id: 'global-first-journey',
    country: 'Global',
    countryCode: 'GLOBAL',
    name: 'First Passport Stamp',
    description: 'Verify a physical visit to your very first travel destination.',
    category: 'Exploration',
    rarity: 'Common',
    icon: '🧭',
    requirement: { type: 'checkin_count', value: 1 }
  },
  {
    id: 'global-frequent-wanderer',
    country: 'Global',
    countryCode: 'GLOBAL',
    name: 'Frequent Wanderer',
    description: 'Verify visits to 5 unique travel destinations worldwide.',
    category: 'Exploration',
    rarity: 'Uncommon',
    icon: '✈️',
    requirement: { type: 'unique_places_count', value: 5 }
  },
  {
    id: 'global-world-nomad',
    country: 'Global',
    countryCode: 'GLOBAL',
    name: 'World Nomad',
    description: 'Verify visits across 10 unique travel destinations.',
    category: 'Exploration',
    rarity: 'Rare',
    icon: '🌍',
    requirement: { type: 'unique_places_count', value: 10 }
  },
  {
    id: 'global-globetrotter-legend',
    country: 'Global',
    countryCode: 'GLOBAL',
    name: 'Globetrotter Legend',
    description: 'Verify visits across 20 unique destinations across the globe.',
    category: 'Exploration',
    rarity: 'Legendary',
    icon: '🌐',
    requirement: { type: 'unique_places_count', value: 20 }
  },
  {
    id: 'global-border-hopper-2',
    country: 'Global',
    countryCode: 'GLOBAL',
    name: 'Dual Citizen of the World',
    description: 'Verify visits in 2 different countries.',
    category: 'Exploration',
    rarity: 'Uncommon',
    icon: '🗺️',
    requirement: { type: 'country_count', value: 2 }
  },
  {
    id: 'global-border-hopper-3',
    country: 'Global',
    countryCode: 'GLOBAL',
    name: 'Border Hopper',
    description: 'Verify visits in 3 different countries.',
    category: 'Exploration',
    rarity: 'Rare',
    icon: '🛂',
    requirement: { type: 'country_count', value: 3 }
  },
  {
    id: 'global-four-corners',
    country: 'Global',
    countryCode: 'GLOBAL',
    name: 'Four Corners Traveler',
    description: 'Verify visits across 4 different countries.',
    category: 'Exploration',
    rarity: 'Epic',
    icon: '🧭',
    requirement: { type: 'country_count', value: 4 }
  },
  {
    id: 'global-culture-enthusiast',
    country: 'Global',
    countryCode: 'GLOBAL',
    name: 'Culture Enthusiast',
    description: 'Verify visits to 3 cultural or heritage destinations.',
    category: 'Culture',
    rarity: 'Common',
    icon: '🎭',
    requirement: { type: 'place_category_count', category: 'Culture', value: 3 }
  },
  {
    id: 'global-culture-connoisseur',
    country: 'Global',
    countryCode: 'GLOBAL',
    name: 'Culture Connoisseur',
    description: 'Verify visits to 8 cultural or heritage destinations.',
    category: 'Culture',
    rarity: 'Rare',
    icon: '🏛️',
    requirement: { type: 'place_category_count', category: 'Culture', value: 8 }
  },
  {
    id: 'global-foodie-taste',
    country: 'Global',
    countryCode: 'GLOBAL',
    name: 'Taste of the World',
    description: 'Verify check-ins at 3 culinary or food destinations.',
    category: 'Food',
    rarity: 'Common',
    icon: '🍜',
    requirement: { type: 'place_category_count', category: 'Food', value: 3 }
  },
  {
    id: 'global-master-gourmet',
    country: 'Global',
    countryCode: 'GLOBAL',
    name: 'Master Gourmet',
    description: 'Verify check-ins at 8 culinary or food hotspots.',
    category: 'Food',
    rarity: 'Epic',
    icon: '🥘',
    requirement: { type: 'place_category_count', category: 'Food', value: 8 }
  },
  {
    id: 'global-nature-seeker',
    country: 'Global',
    countryCode: 'GLOBAL',
    name: 'Nature Seeker',
    description: 'Verify visits to 3 national parks, lakes, or nature trails.',
    category: 'Nature',
    rarity: 'Common',
    icon: '🌲',
    requirement: { type: 'place_category_count', category: 'Nature', value: 3 }
  },
  {
    id: 'global-earth-whisperer',
    country: 'Global',
    countryCode: 'GLOBAL',
    name: 'Earth Whisperer',
    description: 'Verify visits to 7 scenic nature or mountain destinations.',
    category: 'Nature',
    rarity: 'Rare',
    icon: '🏞️',
    requirement: { type: 'place_category_count', category: 'Nature', value: 7 }
  },
  {
    id: 'global-history-hunter',
    country: 'Global',
    countryCode: 'GLOBAL',
    name: 'History Hunter',
    description: 'Verify visits to 5 historic landmarks or UNESCO sites.',
    category: 'History',
    rarity: 'Rare',
    icon: '🏺',
    requirement: { type: 'place_category_count', category: 'History', value: 5 }
  },
  {
    id: 'global-hidden-gem-seeker',
    country: 'Global',
    countryCode: 'GLOBAL',
    name: 'Hidden Gem Seeker',
    description: 'Discover and check in at 3 secret or offbeat destinations.',
    category: 'Hidden Gems',
    rarity: 'Rare',
    icon: '💎',
    requirement: { type: 'place_category_count', category: 'Hidden Gems', value: 3 }
  },
  {
    id: 'global-urban-crawler',
    country: 'Global',
    countryCode: 'GLOBAL',
    name: 'Metropolitan Pulse',
    description: 'Verify check-ins in 5 vibrant city centers.',
    category: 'Cities',
    rarity: 'Uncommon',
    icon: '🏙️',
    requirement: { type: 'city_count', value: 5 }
  },
  {
    id: 'global-city-collector',
    country: 'Global',
    countryCode: 'GLOBAL',
    name: 'City Collector',
    description: 'Verify check-ins across 10 distinct cities.',
    category: 'Cities',
    rarity: 'Epic',
    icon: '🌆',
    requirement: { type: 'city_count', value: 10 }
  },
  {
    id: 'global-trip-architect',
    country: 'Global',
    countryCode: 'GLOBAL',
    name: 'Itinerary Architect',
    description: 'Organize an itinerary with 10+ real activities.',
    category: 'Milestones',
    rarity: 'Common',
    icon: '📝',
    requirement: { type: 'activity_count', value: 10 }
  },
  {
    id: 'global-master-planner',
    country: 'Global',
    countryCode: 'GLOBAL',
    name: 'Master Planner',
    description: 'Organize 25+ activities across your journeys.',
    category: 'Milestones',
    rarity: 'Rare',
    icon: '📋',
    requirement: { type: 'activity_count', value: 25 }
  },
  {
    id: 'global-first-completed-trip',
    country: 'Global',
    countryCode: 'GLOBAL',
    name: 'Journey Accomplished',
    description: 'Complete your first itinerary on Locora.',
    category: 'Milestones',
    rarity: 'Common',
    icon: '🏁',
    requirement: { type: 'trip_completed_count', value: 1 }
  },
  {
    id: 'global-journey-master',
    country: 'Global',
    countryCode: 'GLOBAL',
    name: 'Journey Master',
    description: 'Complete 3 full itineraries on Locora.',
    category: 'Milestones',
    rarity: 'Rare',
    icon: '🏆',
    requirement: { type: 'trip_completed_count', value: 3 }
  },
  {
    id: 'global-community-contributor',
    country: 'Global',
    countryCode: 'GLOBAL',
    name: 'Community Voyager',
    description: 'Copy and personalize a public itinerary from the Community.',
    category: 'Community',
    rarity: 'Common',
    icon: '🤝',
    requirement: { type: 'community_trip_copied', value: 1 }
  },
  {
    id: 'global-community-publisher',
    country: 'Global',
    countryCode: 'GLOBAL',
    name: 'Travel Storyteller',
    description: 'Make one of your personal itineraries public for fellow travelers.',
    category: 'Community',
    rarity: 'Uncommon',
    icon: '📢',
    requirement: { type: 'community_trip_published', value: 1 }
  },
  {
    id: 'global-secret-early-bird',
    country: 'Global',
    countryCode: 'GLOBAL',
    name: 'First Light',
    description: 'Verify a visit during magical sunrise hours (5:00 AM - 8:00 AM).',
    category: 'Secret',
    rarity: 'Epic',
    icon: '🌅',
    secret: true,
    secretHint: 'Some journeys begin before the world awakens.',
    requirement: { type: 'time_based_visit', timeWindow: 'sunrise' }
  },
  {
    id: 'global-secret-night-owl',
    country: 'Global',
    countryCode: 'GLOBAL',
    name: 'Night Wanderer',
    description: 'Verify a visit during nighttime hours (8:00 PM - 4:00 AM).',
    category: 'Secret',
    rarity: 'Rare',
    icon: '🌙',
    secret: true,
    secretHint: 'The city reveals another soul under the stars.',
    requirement: { type: 'time_based_visit', timeWindow: 'night' }
  },
  {
    id: 'global-secret-centurion',
    country: 'Global',
    countryCode: 'GLOBAL',
    name: 'Centurion Explorer',
    description: 'Unlock 25 total achievements on your traveler passport.',
    category: 'Secret',
    rarity: 'Legendary',
    icon: '👑',
    secret: true,
    secretHint: 'Mastery is forged one milestone at a time.',
    requirement: { type: 'total_unlocked_count', value: 25 }
  },

  // ============================================================================
  // INDIA ACHIEVEMENTS (26)
  // ============================================================================
  {
    id: 'india-first-steps',
    country: 'India',
    countryCode: 'IN',
    name: 'First Steps in Bharat',
    description: 'Verify your first travel check-in anywhere in India.',
    category: 'Exploration',
    rarity: 'Common',
    icon: '🇮🇳',
    requirement: { type: 'country_visit_count', countryCode: 'IN', value: 1 }
  },
  {
    id: 'india-explorer-3',
    country: 'India',
    countryCode: 'IN',
    name: 'Indian Wanderer',
    description: 'Verify visits to 3 distinct cities in India.',
    category: 'Exploration',
    rarity: 'Uncommon',
    icon: '🪔',
    requirement: { type: 'city_visit_count', countryCode: 'IN', value: 3 }
  },
  {
    id: 'india-explorer-5',
    country: 'India',
    countryCode: 'IN',
    name: 'Incredible India Explorer',
    description: 'Verify visits to 5 distinct cities across India.',
    category: 'Exploration',
    rarity: 'Rare',
    icon: '🐘',
    requirement: { type: 'city_visit_count', countryCode: 'IN', value: 5 }
  },
  {
    id: 'india-pink-city-wanderer',
    country: 'India',
    countryCode: 'IN',
    name: 'Pink City Wanderer',
    description: 'Verify a visit to Jaipur (Hawa Mahal, Amber Fort, or Johari Bazaar).',
    category: 'Culture',
    rarity: 'Common',
    icon: '🌸',
    requirement: { type: 'destination_visit', city: 'Jaipur' }
  },
  {
    id: 'india-delhi-pulse',
    country: 'India',
    countryCode: 'IN',
    name: 'Dilli Ka Dil',
    description: 'Verify a visit to Delhi (Red Fort, Qutub Minar, or Connaught Place).',
    category: 'History',
    rarity: 'Common',
    icon: '🏛️',
    requirement: { type: 'destination_visit', city: 'Delhi' }
  },
  {
    id: 'india-taj-monument',
    country: 'India',
    countryCode: 'IN',
    name: 'Monument of Eternal Love',
    description: 'Verify a visit to Agra (Taj Mahal or Agra Fort).',
    category: 'History',
    rarity: 'Uncommon',
    icon: '🤍',
    requirement: { type: 'destination_visit', city: 'Agra' }
  },
  {
    id: 'india-golden-triangle',
    country: 'India',
    countryCode: 'IN',
    name: 'Golden Triangle Conqueror',
    description: 'Verify visits to all three vertices: Delhi, Agra, and Jaipur.',
    category: 'History',
    rarity: 'Epic',
    icon: '🕌',
    requirement: { type: 'destination_set', destinations: ['Delhi', 'Agra', 'Jaipur'] }
  },
  {
    id: 'india-city-of-lakes',
    country: 'India',
    countryCode: 'IN',
    name: 'City of Lakes',
    description: 'Verify a visit to Udaipur (Lake Pichola or City Palace).',
    category: 'Culture',
    rarity: 'Rare',
    icon: '🏰',
    requirement: { type: 'destination_visit', city: 'Udaipur' }
  },
  {
    id: 'india-blue-city-sentinel',
    country: 'India',
    countryCode: 'IN',
    name: 'Blue City Sentinel',
    description: 'Verify a visit to Jodhpur (Mehrangarh Fort or Blue Haveli lanes).',
    category: 'History',
    rarity: 'Rare',
    icon: '💙',
    requirement: { type: 'destination_visit', city: 'Jodhpur' }
  },
  {
    id: 'india-rajasthan-royalty',
    country: 'India',
    countryCode: 'IN',
    name: 'Rajputana Heritage Master',
    description: 'Verify visits to Jaipur, Udaipur, and Jodhpur.',
    category: 'History',
    rarity: 'Legendary',
    icon: '👑',
    requirement: { type: 'destination_set', destinations: ['Jaipur', 'Udaipur', 'Jodhpur'] }
  },
  {
    id: 'india-coastal-soul-goa',
    country: 'India',
    countryCode: 'IN',
    name: 'Goan Coastal Soul',
    description: 'Verify a visit to Panaji or Old Goa (Fontainhas or Bom Jesus).',
    category: 'Hidden Gems',
    rarity: 'Common',
    icon: '🏖️',
    requirement: { type: 'destination_visit', city: 'Panaji' }
  },
  {
    id: 'india-gods-own-explorer',
    country: 'India',
    countryCode: 'IN',
    name: "God's Own Explorer",
    description: 'Verify a visit to Kochi & the serene Kerala backwaters.',
    category: 'Nature',
    rarity: 'Rare',
    icon: '⛵',
    requirement: { type: 'destination_visit', city: 'Kochi' }
  },
  {
    id: 'india-varanasi-ghats',
    country: 'India',
    countryCode: 'IN',
    name: 'Timeless Varanasi',
    description: 'Verify a visit to the ancient sacred ghats of Varanasi.',
    category: 'Culture',
    rarity: 'Rare',
    icon: '🪔',
    requirement: { type: 'destination_visit', city: 'Varanasi' }
  },
  {
    id: 'india-maximum-city',
    country: 'India',
    countryCode: 'IN',
    name: 'Maximum City Voyager',
    description: 'Verify a visit to Mumbai (Gateway of India or Marine Drive).',
    category: 'Cities',
    rarity: 'Common',
    icon: '🏙️',
    requirement: { type: 'destination_visit', city: 'Mumbai' }
  },
  {
    id: 'india-golden-temple',
    country: 'India',
    countryCode: 'IN',
    name: 'Sacred Light of Amritsar',
    description: 'Verify a visit to the Golden Temple in Amritsar.',
    category: 'Culture',
    rarity: 'Rare',
    icon: '✨',
    requirement: { type: 'destination_visit', city: 'Amritsar' }
  },
  {
    id: 'india-himalayan-calling',
    country: 'India',
    countryCode: 'IN',
    name: 'Himalayan Calling',
    description: 'Verify a visit to Manali or Solang mountain trails.',
    category: 'Nature',
    rarity: 'Rare',
    icon: '🏔️',
    requirement: { type: 'destination_visit', city: 'Manali' }
  },
  {
    id: 'india-ganges-spirit',
    country: 'India',
    countryCode: 'IN',
    name: 'Ganges Yoga & Rapids',
    description: 'Verify a visit to Rishikesh at the Himalayan foothills.',
    category: 'Adventure',
    rarity: 'Uncommon',
    icon: '🧘',
    requirement: { type: 'destination_visit', city: 'Rishikesh' }
  },
  {
    id: 'india-heritage-seeker',
    country: 'India',
    countryCode: 'IN',
    name: 'Desi Heritage Seeker',
    description: 'Verify 3 visits to historical landmarks in India.',
    category: 'History',
    rarity: 'Uncommon',
    icon: '🏺',
    requirement: { type: 'country_category_count', countryCode: 'IN', category: 'History', value: 3 }
  },
  {
    id: 'india-unesco-conqueror',
    country: 'India',
    countryCode: 'IN',
    name: 'UNESCO Monument Conqueror',
    description: 'Verify 6 visits to historical or heritage landmarks in India.',
    category: 'History',
    rarity: 'Legendary',
    icon: '📜',
    requirement: { type: 'country_category_count', countryCode: 'IN', category: 'History', value: 6 }
  },
  {
    id: 'india-food-trail',
    country: 'India',
    countryCode: 'IN',
    name: 'Masala Trail Master',
    description: 'Verify 3 check-ins in India featuring authentic culinary experiences.',
    category: 'Food',
    rarity: 'Uncommon',
    icon: '🍲',
    requirement: { type: 'country_category_count', countryCode: 'IN', category: 'Food', value: 3 }
  },
  {
    id: 'india-nature-wanderer',
    country: 'India',
    countryCode: 'IN',
    name: 'Monsoon & Valley Wanderer',
    description: 'Verify 3 nature or scenic destination visits in India.',
    category: 'Nature',
    rarity: 'Rare',
    icon: '🌿',
    requirement: { type: 'country_category_count', countryCode: 'IN', category: 'Nature', value: 3 }
  },
  {
    id: 'india-culture-guardian',
    country: 'India',
    countryCode: 'IN',
    name: 'Cultural Guardian',
    description: 'Verify 4 cultural landmark visits across India.',
    category: 'Culture',
    rarity: 'Rare',
    icon: '🦚',
    requirement: { type: 'country_category_count', countryCode: 'IN', category: 'Culture', value: 4 }
  },
  {
    id: 'india-grand-voyager',
    country: 'India',
    countryCode: 'IN',
    name: 'Grand Indian Voyager',
    description: 'Verify 8 total destination check-ins across India.',
    category: 'Exploration',
    rarity: 'Epic',
    icon: '🎖️',
    requirement: { type: 'country_visit_count', countryCode: 'IN', value: 8 }
  },
  {
    id: 'india-secret-bazaar',
    country: 'India',
    countryCode: 'IN',
    name: 'Bazaar Insider',
    description: 'Verify a visit to an artisan bazaar or old quarter during morning hours.',
    category: 'Secret',
    rarity: 'Rare',
    icon: '🛍️',
    secret: true,
    secretHint: 'Find the vibrant scents of spices before the noon sun.',
    requirement: { type: 'time_based_visit', countryCode: 'IN', timeWindow: 'sunrise' }
  },
  {
    id: 'india-secret-ghat-aarti',
    country: 'India',
    countryCode: 'IN',
    name: 'Ghat Aarti Reverence',
    description: 'Verify a visit to Varanasi or Rishikesh during evening twilight hours.',
    category: 'Secret',
    rarity: 'Epic',
    icon: '🔥',
    secret: true,
    secretHint: 'When floating lamps ignite the sacred river at dusk.',
    requirement: { type: 'time_based_visit', countryCode: 'IN', timeWindow: 'night' }
  },
  {
    id: 'india-secret-pan-india',
    country: 'India',
    countryCode: 'IN',
    name: 'Samrat of the Subcontinent',
    description: 'Verify visits covering North, West, and South India destinations.',
    category: 'Secret',
    rarity: 'Legendary',
    icon: '🔱',
    secret: true,
    secretHint: 'From the snowy peaks to tropical ocean breezes.',
    requirement: { type: 'destination_set', destinations: ['Delhi', 'Panaji', 'Kochi'] }
  },

  // ============================================================================
  // UNITED STATES ACHIEVEMENTS (26)
  // ============================================================================
  {
    id: 'usa-first-steps',
    country: 'United States',
    countryCode: 'US',
    name: 'First Steps in the USA',
    description: 'Verify your first check-in in the United States.',
    category: 'Exploration',
    rarity: 'Common',
    icon: '🇺🇸',
    requirement: { type: 'country_visit_count', countryCode: 'US', value: 1 }
  },
  {
    id: 'usa-cities-3',
    country: 'United States',
    countryCode: 'US',
    name: 'Coast to Coast Seeker',
    description: 'Verify check-ins across 3 distinct US cities.',
    category: 'Exploration',
    rarity: 'Uncommon',
    icon: '🚗',
    requirement: { type: 'city_visit_count', countryCode: 'US', value: 3 }
  },
  {
    id: 'usa-cities-5',
    country: 'United States',
    countryCode: 'US',
    name: 'Great American Roadtripper',
    description: 'Verify check-ins across 5 distinct US cities.',
    category: 'Exploration',
    rarity: 'Epic',
    icon: '🛣️',
    requirement: { type: 'city_visit_count', countryCode: 'US', value: 5 }
  },
  {
    id: 'usa-big-apple',
    country: 'United States',
    countryCode: 'US',
    name: 'Big Apple Explorer',
    description: 'Verify a visit to New York City (Central Park, Midtown, or Brooklyn).',
    category: 'Cities',
    rarity: 'Common',
    icon: '🗽',
    requirement: { type: 'destination_visit', city: 'New York' }
  },
  {
    id: 'usa-golden-gate',
    country: 'United States',
    countryCode: 'US',
    name: 'Golden Gate Wanderer',
    description: 'Verify a visit to San Francisco (Fisherman’s Wharf or Presidio).',
    category: 'Exploration',
    rarity: 'Common',
    icon: '🌉',
    requirement: { type: 'destination_visit', city: 'San Francisco' }
  },
  {
    id: 'usa-la-dreamer',
    country: 'United States',
    countryCode: 'US',
    name: 'City of Angels & Film',
    description: 'Verify a visit to Los Angeles & Hollywood.',
    category: 'Culture',
    rarity: 'Common',
    icon: '🎬',
    requirement: { type: 'destination_visit', city: 'Los Angeles' }
  },
  {
    id: 'usa-california-dreaming',
    country: 'United States',
    countryCode: 'US',
    name: 'California Dreaming',
    description: 'Verify visits to both San Francisco and Los Angeles.',
    category: 'Exploration',
    rarity: 'Rare',
    icon: '🌴',
    requirement: { type: 'destination_set', destinations: ['San Francisco', 'Los Angeles'] }
  },
  {
    id: 'usa-yosemite-granite',
    country: 'United States',
    countryCode: 'US',
    name: 'Yosemite Granite Climber',
    description: 'Verify a visit to Yosemite National Park (El Capitan or Valley).',
    category: 'Nature',
    rarity: 'Rare',
    icon: '🏞️',
    requirement: { type: 'destination_visit', city: 'Yosemite' }
  },
  {
    id: 'usa-grand-canyon',
    country: 'United States',
    countryCode: 'US',
    name: 'Canyon Horizon Pioneer',
    description: 'Verify a visit to the Grand Canyon Rim.',
    category: 'Nature',
    rarity: 'Rare',
    icon: '🦅',
    requirement: { type: 'destination_visit', city: 'Grand Canyon' }
  },
  {
    id: 'usa-windy-city',
    country: 'United States',
    countryCode: 'US',
    name: 'Windy City Skyline',
    description: 'Verify a visit to Chicago (Millennium Park or Loop Architecture).',
    category: 'Cities',
    rarity: 'Uncommon',
    icon: '🏙️',
    requirement: { type: 'destination_visit', city: 'Chicago' }
  },
  {
    id: 'usa-vegas-lights',
    country: 'United States',
    countryCode: 'US',
    name: 'Neon Strip Illuminator',
    description: 'Verify a visit to the Las Vegas Strip.',
    category: 'Entertainment',
    rarity: 'Uncommon',
    icon: '🎰',
    requirement: { type: 'destination_visit', city: 'Las Vegas' }
  },
  {
    id: 'usa-seattle-sound',
    country: 'United States',
    countryCode: 'US',
    name: 'Emerald City & Coffee',
    description: 'Verify a visit to Seattle (Pike Place Market or Puget Sound).',
    category: 'Food',
    rarity: 'Uncommon',
    icon: '☕',
    requirement: { type: 'destination_visit', city: 'Seattle' }
  },
  {
    id: 'usa-french-quarter',
    country: 'United States',
    countryCode: 'US',
    name: 'Crescent City Jazz',
    description: 'Verify a visit to New Orleans (French Quarter or Bourbon Street).',
    category: 'Culture',
    rarity: 'Rare',
    icon: '🎷',
    requirement: { type: 'destination_visit', city: 'New Orleans' }
  },
  {
    id: 'usa-austin-vibes',
    country: 'United States',
    countryCode: 'US',
    name: 'Live Music Capital',
    description: 'Verify a visit to Austin (South Congress or Zilker Park).',
    category: 'Culture',
    rarity: 'Uncommon',
    icon: '🎸',
    requirement: { type: 'destination_visit', city: 'Austin' }
  },
  {
    id: 'usa-park-ranger',
    country: 'United States',
    countryCode: 'US',
    name: 'National Park Ranger',
    description: 'Verify visits to 2 legendary US National Parks.',
    category: 'Nature',
    rarity: 'Epic',
    icon: '🌲',
    requirement: { type: 'country_category_count', countryCode: 'US', category: 'Nature', value: 2 }
  },
  {
    id: 'usa-foodie-trail',
    country: 'United States',
    countryCode: 'US',
    name: 'American Diner & Michelin',
    description: 'Verify 3 culinary visits in US cities.',
    category: 'Food',
    rarity: 'Uncommon',
    icon: '🍔',
    requirement: { type: 'country_category_count', countryCode: 'US', category: 'Food', value: 3 }
  },
  {
    id: 'usa-culture-connoisseur',
    country: 'United States',
    countryCode: 'US',
    name: 'American Cultural Fabric',
    description: 'Verify 3 cultural or arts destinations in the USA.',
    category: 'Culture',
    rarity: 'Rare',
    icon: '🎨',
    requirement: { type: 'country_category_count', countryCode: 'US', category: 'Culture', value: 3 }
  },
  {
    id: 'usa-city-slicker',
    country: 'United States',
    countryCode: 'US',
    name: 'Skyscraper Enthusiast',
    description: 'Verify 3 visits in major US metropolitan hubs.',
    category: 'Cities',
    rarity: 'Rare',
    icon: '🏢',
    requirement: { type: 'country_category_count', countryCode: 'US', category: 'Cities', value: 3 }
  },
  {
    id: 'usa-master-explorer',
    country: 'United States',
    countryCode: 'US',
    name: 'Transcontinental Champion',
    description: 'Verify 8 total destination check-ins across the USA.',
    category: 'Exploration',
    rarity: 'Legendary',
    icon: '🦅',
    requirement: { type: 'country_visit_count', countryCode: 'US', value: 8 }
  },
  {
    id: 'usa-route-66-legacy',
    country: 'United States',
    countryCode: 'US',
    name: 'Route 66 Pioneer',
    description: 'Verify visits connecting Chicago and the West Coast.',
    category: 'Exploration',
    rarity: 'Epic',
    icon: '⛽',
    requirement: { type: 'destination_set', destinations: ['Chicago', 'Los Angeles'] }
  },
  {
    id: 'usa-tri-state-urban',
    country: 'United States',
    countryCode: 'US',
    name: 'Atlantic & Pacific Hubs',
    description: 'Verify check-ins in both New York and San Francisco.',
    category: 'Cities',
    rarity: 'Rare',
    icon: '🛩️',
    requirement: { type: 'destination_set', destinations: ['New York', 'San Francisco'] }
  },
  {
    id: 'usa-nature-trio',
    country: 'United States',
    countryCode: 'US',
    name: 'Wild West Naturalist',
    description: 'Verify check-ins at Yosemite and Grand Canyon.',
    category: 'Nature',
    rarity: 'Epic',
    icon: '🏕️',
    requirement: { type: 'destination_set', destinations: ['Yosemite', 'Grand Canyon'] }
  },
  {
    id: 'usa-pacific-northwest',
    country: 'United States',
    countryCode: 'US',
    name: 'Pacific Northwest Voyager',
    description: 'Verify check-ins across Seattle and San Francisco.',
    category: 'Exploration',
    rarity: 'Rare',
    icon: '🌲',
    requirement: { type: 'destination_set', destinations: ['Seattle', 'San Francisco'] }
  },
  {
    id: 'usa-secret-broadway-lights',
    country: 'United States',
    countryCode: 'US',
    name: 'Times Square After Hours',
    description: 'Verify a visit to New York City during nighttime hours.',
    category: 'Secret',
    rarity: 'Rare',
    icon: '🎭',
    secret: true,
    secretHint: 'Where the billboards illuminate the midnight sky.',
    requirement: { type: 'time_based_visit', countryCode: 'US', city: 'New York', timeWindow: 'night' }
  },
  {
    id: 'usa-secret-sunrise-bridge',
    country: 'United States',
    countryCode: 'US',
    name: 'Fog & Golden Dawn',
    description: 'Verify a visit to San Francisco at sunrise.',
    category: 'Secret',
    rarity: 'Epic',
    icon: '🌁',
    secret: true,
    secretHint: 'When the Pacific mist parts over the red suspension cables.',
    requirement: { type: 'time_based_visit', countryCode: 'US', city: 'San Francisco', timeWindow: 'sunrise' }
  },
  {
    id: 'usa-secret-statesman',
    country: 'United States',
    countryCode: 'US',
    name: 'Liberty Statesman',
    description: 'Verify visits across 4 major US cultural capitals.',
    category: 'Secret',
    rarity: 'Legendary',
    icon: '⭐',
    secret: true,
    secretHint: 'From the Atlantic harbor to the desert neon and jazz rivers.',
    requirement: { type: 'destination_set', destinations: ['New York', 'Los Angeles', 'New Orleans', 'Chicago'] }
  },

  // ============================================================================
  // JAPAN ACHIEVEMENTS (26)
  // ============================================================================
  {
    id: 'japan-first-steps',
    country: 'Japan',
    countryCode: 'JP',
    name: 'First Steps in Nippon',
    description: 'Verify your first travel check-in in Japan.',
    category: 'Exploration',
    rarity: 'Common',
    icon: '🇯🇵',
    requirement: { type: 'country_visit_count', countryCode: 'JP', value: 1 }
  },
  {
    id: 'japan-cities-3',
    country: 'Japan',
    countryCode: 'JP',
    name: 'Japan Wanderer',
    description: 'Verify check-ins across 3 distinct Japanese cities.',
    category: 'Exploration',
    rarity: 'Uncommon',
    icon: '⛩️',
    requirement: { type: 'city_visit_count', countryCode: 'JP', value: 3 }
  },
  {
    id: 'japan-cities-5',
    country: 'Japan',
    countryCode: 'JP',
    name: 'Japan Explorer',
    description: 'Verify check-ins across 5 distinct Japanese cities.',
    category: 'Exploration',
    rarity: 'Rare',
    icon: '🏯',
    requirement: { type: 'city_visit_count', countryCode: 'JP', value: 5 }
  },
  {
    id: 'japan-kyoto-zen',
    country: 'Japan',
    countryCode: 'JP',
    name: 'Kyoto Zen Master',
    description: 'Verify a visit to Kyoto (Fushimi Inari, Kinkaku-ji, or Arashiyama).',
    category: 'Culture',
    rarity: 'Common',
    icon: '🌸',
    requirement: { type: 'destination_visit', city: 'Kyoto' }
  },
  {
    id: 'japan-tokyo-pulse',
    country: 'Japan',
    countryCode: 'JP',
    name: 'Tokyo Metropolis Navigator',
    description: 'Verify a visit to Tokyo (Shinjuku, Shibuya, or Asakusa).',
    category: 'Cities',
    rarity: 'Common',
    icon: '🗼',
    requirement: { type: 'destination_visit', city: 'Tokyo' }
  },
  {
    id: 'japan-osaka-kuidaore',
    country: 'Japan',
    countryCode: 'JP',
    name: 'Kuidaore in Dotonbori',
    description: 'Verify a visit to Osaka (Takoyaki stalls & Osaka Castle).',
    category: 'Food',
    rarity: 'Common',
    icon: '🍢',
    requirement: { type: 'destination_visit', city: 'Osaka' }
  },
  {
    id: 'japan-tokaido-duo',
    country: 'Japan',
    countryCode: 'JP',
    name: 'Tokaido Express',
    description: 'Verify check-ins in both Tokyo and Kyoto.',
    category: 'Exploration',
    rarity: 'Rare',
    icon: '🚅',
    requirement: { type: 'destination_set', destinations: ['Tokyo', 'Kyoto'] }
  },
  {
    id: 'japan-kansai-trinity',
    country: 'Japan',
    countryCode: 'JP',
    name: 'Kansai Trinity',
    description: 'Verify check-ins across Kyoto, Osaka, and Nara.',
    category: 'Culture',
    rarity: 'Epic',
    icon: '🎴',
    requirement: { type: 'destination_set', destinations: ['Kyoto', 'Osaka', 'Nara'] }
  },
  {
    id: 'japan-nara-bow',
    country: 'Japan',
    countryCode: 'JP',
    name: 'Nara Sacred Deer Friend',
    description: 'Verify a visit to Nara (Todai-ji or Deer Park).',
    category: 'Culture',
    rarity: 'Uncommon',
    icon: '🦌',
    requirement: { type: 'destination_visit', city: 'Nara' }
  },
  {
    id: 'japan-fuji-view',
    country: 'Japan',
    countryCode: 'JP',
    name: 'Sacred Peak Gazer',
    description: 'Verify a visit to Hakone & Mount Fuji viewpoints.',
    category: 'Nature',
    rarity: 'Rare',
    icon: '🗻',
    requirement: { type: 'destination_visit', city: 'Hakone' }
  },
  {
    id: 'japan-sapporo-snow',
    country: 'Japan',
    countryCode: 'JP',
    name: 'Hokkaido Snow & Ramen Trail',
    description: 'Verify a visit to Sapporo & Northern Hokkaido.',
    category: 'Nature',
    rarity: 'Rare',
    icon: '❄️',
    requirement: { type: 'destination_visit', city: 'Sapporo' }
  },
  {
    id: 'japan-hiroshima-peace',
    country: 'Japan',
    countryCode: 'JP',
    name: 'Hiroshima Lantern of Peace',
    description: 'Verify a visit to Hiroshima Peace Memorial & Miyajima.',
    category: 'History',
    rarity: 'Rare',
    icon: '🕊️',
    requirement: { type: 'destination_visit', city: 'Hiroshima' }
  },
  {
    id: 'japan-kanazawa-craft',
    country: 'Japan',
    countryCode: 'JP',
    name: 'Little Kyoto on the Sea',
    description: 'Verify a visit to Kanazawa (Kenrokuen Garden or Geisha districts).',
    category: 'Culture',
    rarity: 'Rare',
    icon: '🍵',
    requirement: { type: 'destination_visit', city: 'Kanazawa' }
  },
  {
    id: 'japan-fukuoka-yatai',
    country: 'Japan',
    countryCode: 'JP',
    name: 'Hakata Ramen Scholar',
    description: 'Verify a visit to Fukuoka & Nakasu Yatai food stalls.',
    category: 'Food',
    rarity: 'Uncommon',
    icon: '🍜',
    requirement: { type: 'destination_visit', city: 'Fukuoka' }
  },
  {
    id: 'japan-takayama-alpine',
    country: 'Japan',
    countryCode: 'JP',
    name: 'Hida Alpine Woodcrafter',
    description: 'Verify a visit to Takayama (Sanmachi Suji historic quarters).',
    category: 'Hidden Gems',
    rarity: 'Rare',
    icon: '🏮',
    requirement: { type: 'destination_visit', city: 'Takayama' }
  },
  {
    id: 'japan-shinto-buddhist-heritage',
    country: 'Japan',
    countryCode: 'JP',
    name: 'Temple & Shrine Scholar',
    description: 'Verify 3 visits to spiritual and temple destinations in Japan.',
    category: 'Culture',
    rarity: 'Uncommon',
    icon: '⛩️',
    requirement: { type: 'country_category_count', countryCode: 'JP', category: 'Culture', value: 3 }
  },
  {
    id: 'japan-gastronomy-master',
    country: 'Japan',
    countryCode: 'JP',
    name: 'Washoku Gourmet',
    description: 'Verify 3 culinary destination check-ins in Japan.',
    category: 'Food',
    rarity: 'Rare',
    icon: '🍣',
    requirement: { type: 'country_category_count', countryCode: 'JP', category: 'Food', value: 3 }
  },
  {
    id: 'japan-onsen-nature',
    country: 'Japan',
    countryCode: 'JP',
    name: 'Onsen & Nature Trail',
    description: 'Verify 3 visits to scenic mountain or hot spring destinations in Japan.',
    category: 'Nature',
    rarity: 'Rare',
    icon: '♨️',
    requirement: { type: 'country_category_count', countryCode: 'JP', category: 'Nature', value: 3 }
  },
  {
    id: 'japan-samurai-castle-legacy',
    country: 'Japan',
    countryCode: 'JP',
    name: 'Castles of the Shogun',
    description: 'Verify 3 historic castle or memorial visits in Japan.',
    category: 'History',
    rarity: 'Rare',
    icon: '⚔️',
    requirement: { type: 'country_category_count', countryCode: 'JP', category: 'History', value: 3 }
  },
  {
    id: 'japan-deep-countryside',
    country: 'Japan',
    countryCode: 'JP',
    name: 'Deep Countryside Discovery',
    description: 'Verify check-ins at offbeat alpine or historic artisan towns.',
    category: 'Hidden Gems',
    rarity: 'Epic',
    icon: '🎋',
    requirement: { type: 'country_category_count', countryCode: 'JP', category: 'Hidden Gems', value: 1 }
  },
  {
    id: 'japan-grand-shinkansen',
    country: 'Japan',
    countryCode: 'JP',
    name: 'Grand Shinkansen Pioneer',
    description: 'Verify 8 total destination check-ins across Japan.',
    category: 'Exploration',
    rarity: 'Legendary',
    icon: '🚅',
    requirement: { type: 'country_visit_count', countryCode: 'JP', value: 8 }
  },
  {
    id: 'japan-north-south-span',
    country: 'Japan',
    countryCode: 'JP',
    name: 'Archipelago Conqueror',
    description: 'Verify check-ins bridging northern Hokkaido and southern Kyushu.',
    category: 'Exploration',
    rarity: 'Epic',
    icon: '🗾',
    requirement: { type: 'destination_set', destinations: ['Sapporo', 'Fukuoka'] }
  },
  {
    id: 'japan-secret-torii-dawn',
    country: 'Japan',
    countryCode: 'JP',
    name: 'Vermilion Torii at Dawn',
    description: 'Verify a visit to Kyoto during peaceful morning sunrise hours.',
    category: 'Secret',
    rarity: 'Epic',
    icon: '🌅',
    secret: true,
    secretHint: 'Ascend the mountain path when the thousands of vermilion gates whisper in morning silence.',
    requirement: { type: 'time_based_visit', countryCode: 'JP', city: 'Kyoto', timeWindow: 'sunrise' }
  },
  {
    id: 'japan-secret-shinjuku-neon',
    country: 'Japan',
    countryCode: 'JP',
    name: 'Alleyway Izakaya Crawler',
    description: 'Verify a visit to Tokyo during bustling night hours.',
    category: 'Secret',
    rarity: 'Rare',
    icon: '🏮',
    secret: true,
    secretHint: 'Follow the red lanterns tucked in the narrow alleyways after dark.',
    requirement: { type: 'time_based_visit', countryCode: 'JP', city: 'Tokyo', timeWindow: 'night' }
  },
  {
    id: 'japan-secret-zen-garden',
    country: 'Japan',
    countryCode: 'JP',
    name: 'Master of Wabi-Sabi',
    description: 'Verify visits to Kyoto, Kanazawa, and Nara.',
    category: 'Secret',
    rarity: 'Legendary',
    icon: '🪴',
    secret: true,
    secretHint: 'Where moss gardens, gold leaf, and sacred deer embody timeless beauty.',
    requirement: { type: 'destination_set', destinations: ['Kyoto', 'Kanazawa', 'Nara'] }
  },
  {
    id: 'japan-secret-four-corners',
    country: 'Japan',
    countryCode: 'JP',
    name: 'The Four Prefectures',
    description: 'Verify visits to Tokyo, Kyoto, Osaka, and Sapporo.',
    category: 'Secret',
    rarity: 'Legendary',
    icon: '👑',
    secret: true,
    secretHint: 'Connecting the neon capital, the imperial court, the kitchen of Japan, and the northern snow.',
    requirement: { type: 'destination_set', destinations: ['Tokyo', 'Kyoto', 'Osaka', 'Sapporo'] }
  },

  // ============================================================================
  // FRANCE ACHIEVEMENTS (26)
  // ============================================================================
  {
    id: 'france-first-steps',
    country: 'France',
    countryCode: 'FR',
    name: 'Premiers Pas en France',
    description: 'Verify your first destination check-in in France.',
    category: 'Exploration',
    rarity: 'Common',
    icon: '🇫🇷',
    requirement: { type: 'country_visit_count', countryCode: 'FR', value: 1 }
  },
  {
    id: 'france-cities-3',
    country: 'France',
    countryCode: 'FR',
    name: 'Flâneur des Régions',
    description: 'Verify check-ins across 3 distinct French cities.',
    category: 'Exploration',
    rarity: 'Uncommon',
    icon: '🥖',
    requirement: { type: 'city_visit_count', countryCode: 'FR', value: 3 }
  },
  {
    id: 'france-cities-5',
    country: 'France',
    countryCode: 'FR',
    name: 'Grand Tour de France',
    description: 'Verify check-ins across 5 distinct French cities.',
    category: 'Exploration',
    rarity: 'Rare',
    icon: '🚴',
    requirement: { type: 'city_visit_count', countryCode: 'FR', value: 5 }
  },
  {
    id: 'france-city-of-lights',
    country: 'France',
    countryCode: 'FR',
    name: 'City of Lights',
    description: 'Verify a visit to Paris (Eiffel Tower, Louvre, or Montmartre).',
    category: 'Culture',
    rarity: 'Common',
    icon: '🗼',
    requirement: { type: 'destination_visit', city: 'Paris' }
  },
  {
    id: 'france-riviera-sun',
    country: 'France',
    countryCode: 'FR',
    name: 'Côte d’Azur Sunshine',
    description: 'Verify a visit to Nice & the French Riviera coastline.',
    category: 'Nature',
    rarity: 'Common',
    icon: '🏖️',
    requirement: { type: 'destination_visit', city: 'Nice' }
  },
  {
    id: 'france-lyon-bouchon',
    country: 'France',
    countryCode: 'FR',
    name: 'Capital of Gastronomy',
    description: 'Verify a visit to Lyon & traditional bouchon bistros.',
    category: 'Food',
    rarity: 'Uncommon',
    icon: '🍷',
    requirement: { type: 'destination_visit', city: 'Lyon' }
  },
  {
    id: 'france-bordeaux-vineyards',
    country: 'France',
    countryCode: 'FR',
    name: 'Grand Cru Sommelier',
    description: 'Verify a visit to Bordeaux historic vineyards.',
    category: 'Food',
    rarity: 'Rare',
    icon: '🍇',
    requirement: { type: 'destination_visit', city: 'Bordeaux' }
  },
  {
    id: 'france-marseille-port',
    country: 'France',
    countryCode: 'FR',
    name: 'Mediterranean Port & Calanques',
    description: 'Verify a visit to Marseille & Old Port.',
    category: 'Nature',
    rarity: 'Uncommon',
    icon: '⛵',
    requirement: { type: 'destination_visit', city: 'Marseille' }
  },
  {
    id: 'france-strasbourg-timber',
    country: 'France',
    countryCode: 'FR',
    name: 'Alsatian Half-Timber Fairy Tale',
    description: 'Verify a visit to Strasbourg & Petite France.',
    category: 'History',
    rarity: 'Rare',
    icon: '🏰',
    requirement: { type: 'destination_visit', city: 'Strasbourg' }
  },
  {
    id: 'france-chamonix-alpine',
    country: 'France',
    countryCode: 'FR',
    name: 'Roof of the Alps',
    description: 'Verify a visit to Chamonix Mont-Blanc glaciers.',
    category: 'Adventure',
    rarity: 'Rare',
    icon: '🏔️',
    requirement: { type: 'destination_visit', city: 'Chamonix' }
  },
  {
    id: 'france-provence-lavender',
    country: 'France',
    countryCode: 'FR',
    name: 'Lavender & Sunflowers',
    description: 'Verify a visit to Aix-en-Provence & sun-drenched stone villages.',
    category: 'Nature',
    rarity: 'Rare',
    icon: '💜',
    requirement: { type: 'destination_visit', city: 'Aix-en-Provence' }
  },
  {
    id: 'france-mont-saint-michel',
    country: 'France',
    countryCode: 'FR',
    name: 'Abbey in the Sea',
    description: 'Verify a visit to the tidal abbey of Mont Saint-Michel.',
    category: 'History',
    rarity: 'Epic',
    icon: '🌊',
    requirement: { type: 'destination_visit', city: 'Mont Saint-Michel' }
  },
  {
    id: 'france-loire-chateaux',
    country: 'France',
    countryCode: 'FR',
    name: 'Valley of Kings & Châteaux',
    description: 'Verify a visit to the Loire Valley (Château de Chambord/Tours).',
    category: 'History',
    rarity: 'Rare',
    icon: '👑',
    requirement: { type: 'destination_visit', city: 'Tours' }
  },
  {
    id: 'france-north-south-duo',
    country: 'France',
    countryCode: 'FR',
    name: 'Paris to the Mediterranean',
    description: 'Verify visits connecting Paris and Nice.',
    category: 'Exploration',
    rarity: 'Rare',
    icon: '🚅',
    requirement: { type: 'destination_set', destinations: ['Paris', 'Nice'] }
  },
  {
    id: 'france-culinary-duo',
    country: 'France',
    countryCode: 'FR',
    name: 'French Epicurean Duo',
    description: 'Verify visits to culinary capitals Lyon and Bordeaux.',
    category: 'Food',
    rarity: 'Epic',
    icon: '🧀',
    requirement: { type: 'destination_set', destinations: ['Lyon', 'Bordeaux'] }
  },
  {
    id: 'france-south-trio',
    country: 'France',
    countryCode: 'FR',
    name: 'Provençal & Riviera Trio',
    description: 'Verify check-ins across Nice, Marseille, and Aix-en-Provence.',
    category: 'Nature',
    rarity: 'Epic',
    icon: '🌻',
    requirement: { type: 'destination_set', destinations: ['Nice', 'Marseille', 'Aix-en-Provence'] }
  },
  {
    id: 'france-arts-culture',
    country: 'France',
    countryCode: 'FR',
    name: 'Louvre & Beaux-Arts Scholar',
    description: 'Verify 3 cultural or arts destinations in France.',
    category: 'Culture',
    rarity: 'Uncommon',
    icon: '🎨',
    requirement: { type: 'country_category_count', countryCode: 'FR', category: 'Culture', value: 3 }
  },
  {
    id: 'france-terroir-master',
    country: 'France',
    countryCode: 'FR',
    name: 'Terroir & Vineyard Master',
    description: 'Verify 3 culinary and vineyard destination check-ins in France.',
    category: 'Food',
    rarity: 'Rare',
    icon: '🍾',
    requirement: { type: 'country_category_count', countryCode: 'FR', category: 'Food', value: 3 }
  },
  {
    id: 'france-chateaux-history',
    country: 'France',
    countryCode: 'FR',
    name: 'Gothic & Renaissance Historian',
    description: 'Verify 3 historic monument visits across France.',
    category: 'History',
    rarity: 'Rare',
    icon: '🏺',
    requirement: { type: 'country_category_count', countryCode: 'FR', category: 'History', value: 3 }
  },
  {
    id: 'france-alps-mediterranean',
    country: 'France',
    countryCode: 'FR',
    name: 'From Glaciers to Coastline',
    description: 'Verify check-ins in both the Alps (Chamonix) and the Mediterranean (Nice).',
    category: 'Nature',
    rarity: 'Epic',
    icon: '⛰️',
    requirement: { type: 'destination_set', destinations: ['Chamonix', 'Nice'] }
  },
  {
    id: 'france-grand-voyager',
    country: 'France',
    countryCode: 'FR',
    name: 'Chevalier de France',
    description: 'Verify 8 total destination check-ins across France.',
    category: 'Exploration',
    rarity: 'Legendary',
    icon: '⚜️',
    requirement: { type: 'country_visit_count', countryCode: 'FR', value: 8 }
  },
  {
    id: 'france-heritage-trio',
    country: 'France',
    countryCode: 'FR',
    name: 'Monuments of the Monarchy',
    description: 'Verify visits to Paris, Mont Saint-Michel, and Tours.',
    category: 'History',
    rarity: 'Legendary',
    icon: '🏰',
    requirement: { type: 'destination_set', destinations: ['Paris', 'Mont Saint-Michel', 'Tours'] }
  },
  {
    id: 'france-secret-eiffel-dawn',
    country: 'France',
    countryCode: 'FR',
    name: 'Trocadéro Sunrise',
    description: 'Verify a visit to Paris during peaceful morning sunrise hours.',
    category: 'Secret',
    rarity: 'Epic',
    icon: '🌅',
    secret: true,
    secretHint: 'Watch the golden light bathe the Seine before the boulevards awake.',
    requirement: { type: 'time_based_visit', countryCode: 'FR', city: 'Paris', timeWindow: 'sunrise' }
  },
  {
    id: 'france-secret-seine-midnight',
    country: 'France',
    countryCode: 'FR',
    name: 'Midnight on the Seine',
    description: 'Verify a visit to Paris during late night hours.',
    category: 'Secret',
    rarity: 'Rare',
    icon: '🌙',
    secret: true,
    secretHint: 'Where the streetlamps shimmer over cobblestone bridges at midnight.',
    requirement: { type: 'time_based_visit', countryCode: 'FR', city: 'Paris', timeWindow: 'night' }
  },
  {
    id: 'france-secret-four-corners',
    country: 'France',
    countryCode: 'FR',
    name: 'L’Hexagone Master',
    description: 'Verify visits spanning Paris, Lyon, Bordeaux, and Nice.',
    category: 'Secret',
    rarity: 'Legendary',
    icon: '👑',
    secret: true,
    secretHint: 'Embrace the full geometry of French culture, wine, food, and sea.',
    requirement: { type: 'destination_set', destinations: ['Paris', 'Lyon', 'Bordeaux', 'Nice'] }
  },
  {
    id: 'france-secret-mont-blanc-glory',
    country: 'France',
    countryCode: 'FR',
    name: 'Glacial Altitude Master',
    description: 'Verify a morning visit to Chamonix Mont-Blanc.',
    category: 'Secret',
    rarity: 'Legendary',
    icon: '❄️',
    secret: true,
    secretHint: 'Breathe crisp alpine air when the highest peaks turn rose-gold.',
    requirement: { type: 'time_based_visit', countryCode: 'FR', city: 'Chamonix', timeWindow: 'sunrise' }
  }
];
