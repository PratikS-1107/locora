import { Country, State, City } from 'country-state-city';

const stripDiacritics = (str) =>
  str ? String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() : '';

/**
 * Adaptive administrative terminology by country code (ISO 3166-1 alpha-2)
 */
export const getAdminTerminology = (countryCode) => {
  const code = (countryCode || '').toUpperCase();
  switch (code) {
    case 'JP':
      return {
        level1: 'Prefecture',
        level2: 'City / Ward / Town',
        level1Placeholder: 'Select a prefecture...',
        level2Placeholder: 'Select a city or ward...'
      };
    case 'US':
      return {
        level1: 'State',
        level2: 'City / County / Town',
        level1Placeholder: 'Select a state...',
        level2Placeholder: 'Select a city or county...'
      };
    case 'IN':
      return {
        level1: 'State / Union Territory',
        level2: 'District / City / Town',
        level1Placeholder: 'Select a state or UT...',
        level2Placeholder: 'Select a district or town...'
      };
    case 'CA':
      return {
        level1: 'Province / Territory',
        level2: 'Municipality / City / Town',
        level1Placeholder: 'Select a province...',
        level2Placeholder: 'Select a municipality or city...'
      };
    case 'GB':
      return {
        level1: 'Country / Region',
        level2: 'City / Borough / District',
        level1Placeholder: 'Select a country or region...',
        level2Placeholder: 'Select a borough or city...'
      };
    case 'AU':
      return {
        level1: 'State / Territory',
        level2: 'City / LGA / Region',
        level1Placeholder: 'Select a state or territory...',
        level2Placeholder: 'Select a city or LGA...'
      };
    case 'FR':
      return {
        level1: 'Region',
        level2: 'Department / City / Commune',
        level1Placeholder: 'Select a region...',
        level2Placeholder: 'Select a department or commune...'
      };
    case 'DE':
      return {
        level1: 'Federal State (Bundesland)',
        level2: 'District / City (Kreis)',
        level1Placeholder: 'Select a federal state...',
        level2Placeholder: 'Select a district or city...'
      };
    case 'IT':
      return {
        level1: 'Region',
        level2: 'Province / Metropolitan City',
        level1Placeholder: 'Select a region...',
        level2Placeholder: 'Select a province or city...'
      };
    case 'ES':
      return {
        level1: 'Autonomous Community / Region',
        level2: 'Province / Municipality',
        level1Placeholder: 'Select an autonomous community...',
        level2Placeholder: 'Select a province or municipality...'
      };
    case 'AE':
      return {
        level1: 'Emirate',
        level2: 'City / Municipality',
        level1Placeholder: 'Select an emirate...',
        level2Placeholder: 'Select a city or municipality...'
      };
    case 'CH':
      return {
        level1: 'Canton',
        level2: 'District / Municipality',
        level1Placeholder: 'Select a canton...',
        level2Placeholder: 'Select a district or municipality...'
      };
    case 'BR':
    case 'MX':
      return {
        level1: 'State',
        level2: 'Municipality / City',
        level1Placeholder: 'Select a state...',
        level2Placeholder: 'Select a municipality or city...'
      };
    default:
      return {
        level1: 'State / Province / Region',
        level2: 'District / County / Municipality / Town',
        level1Placeholder: 'Select state / province / region...',
        level2Placeholder: 'Select district / town...'
      };
  }
};

/**
 * Get all worldwide countries formatted for dropdown selection
 */
export const getAllCountries = () => {
  return Country.getAllCountries().map((c) => ({
    value: c.isoCode,
    label: c.name,
    code: c.isoCode,
    name: c.name,
    latitude: c.latitude ? Number(c.latitude) : null,
    longitude: c.longitude ? Number(c.longitude) : null
  }));
};

/**
 * Get Country object by code or name
 */
export const getCountryByCodeOrName = (identifier) => {
  if (!identifier) return null;
  const raw = String(identifier).trim();
  const byCode = Country.getCountryByCode(raw.toUpperCase());
  if (byCode) return byCode;

  const target = stripDiacritics(raw);
  return Country.getAllCountries().find(
    (c) => stripDiacritics(c.name) === target || c.isoCode.toLowerCase() === target
  ) || null;
};

/**
 * Get first-level administrative regions for a country
 */
export const getStatesForCountry = (countryCode) => {
  if (!countryCode) return [];
  const rawStates = State.getStatesOfCountry(countryCode);
  if (!rawStates || rawStates.length === 0) {
    // Synthetic fallback for city-states / island nations with no registered states
    const c = Country.getCountryByCode(countryCode);
    const countryName = c ? c.name : countryCode;
    return [{
      value: countryName,
      label: countryName,
      code: countryCode,
      name: countryName,
      isSynthetic: true,
      latitude: c?.latitude ? Number(c.latitude) : null,
      longitude: c?.longitude ? Number(c.longitude) : null
    }];
  }

  return rawStates.map((s) => ({
    value: s.isoCode || s.name,
    label: s.name,
    code: s.isoCode,
    name: s.name,
    latitude: s.latitude ? Number(s.latitude) : null,
    longitude: s.longitude ? Number(s.longitude) : null
  }));
};

/**
 * Get second-level administrative regions/cities for a country and state
 */
export const getCitiesForState = (countryCode, stateCode, stateNameFallback) => {
  if (!countryCode || !stateCode) return [];

  const rawCities = City.getCitiesOfState(countryCode, stateCode);
  if (!rawCities || rawCities.length === 0) {
    // If no cities registered for this state/territory, provide the region itself as option
    const stateObj = State.getStateByCodeAndCountry(stateCode, countryCode);
    const label = stateObj?.name || stateNameFallback || 'Central / Region';
    return [{
      value: label,
      label: `${label} (Region / Locality)`,
      name: label,
      isSynthetic: true,
      latitude: stateObj?.latitude ? Number(stateObj.latitude) : null,
      longitude: stateObj?.longitude ? Number(stateObj.longitude) : null
    }];
  }

  // Deduplicate cities by name
  const seen = new Set();
  const list = [];
  for (const c of rawCities) {
    if (!seen.has(c.name)) {
      seen.add(c.name);
      list.push({
        value: c.name,
        label: c.name,
        name: c.name,
        latitude: c.latitude ? Number(c.latitude) : null,
        longitude: c.longitude ? Number(c.longitude) : null
      });
    }
  }
  return list;
};

/**
 * Format structured destination hierarchy into authoritative string
 */
export const formatStructuredDestination = (cityName, stateName, countryName) => {
  const parts = [];
  const cleanCity = (cityName || '').trim();
  const cleanState = (stateName || '').trim();
  const cleanCountry = (countryName || '').trim();

  if (cleanCity) parts.push(cleanCity);
  if (cleanState && stripDiacritics(cleanState) !== stripDiacritics(cleanCity)) {
    parts.push(cleanState);
  }
  if (
    cleanCountry &&
    stripDiacritics(cleanCountry) !== stripDiacritics(cleanState) &&
    stripDiacritics(cleanCountry) !== stripDiacritics(cleanCity)
  ) {
    parts.push(cleanCountry);
  }

  return parts.join(', ');
};

/**
 * Resolve a formatted destination string into structured geographic coordinates and metadata
 */
export const resolveFromCSC = (destinationString) => {
  if (!destinationString || typeof destinationString !== 'string') return null;
  const parts = destinationString.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  // 1. Try 3 parts: City, State, Country
  if (parts.length >= 3) {
    const cityName = parts[0];
    const stateName = parts[1];
    const countryName = parts[parts.length - 1];

    const country = getCountryByCodeOrName(countryName);
    if (country) {
      const states = State.getStatesOfCountry(country.isoCode);
      const targetState = stripDiacritics(stateName);
      let state = states.find((s) => stripDiacritics(s.name) === targetState);
      if (!state) {
        state = states.find(
          (s) =>
            stripDiacritics(s.name).includes(targetState) ||
            targetState.includes(stripDiacritics(s.name))
        );
      }

      if (state) {
        const cities = City.getCitiesOfState(country.isoCode, state.isoCode);
        const targetCity = stripDiacritics(cityName);
        let city = cities.find((c) => stripDiacritics(c.name) === targetCity);
        if (!city) {
          city = cities.find((c) => stripDiacritics(c.name).includes(targetCity));
        }

        const lat = Number(city?.latitude || state.latitude || country.latitude);
        const lng = Number(city?.longitude || state.longitude || country.longitude);

        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return {
            destination: destinationString,
            city: city?.name || cityName,
            state: state.name,
            state_code: state.isoCode,
            country: country.name,
            country_code: country.isoCode,
            latitude: lat,
            longitude: lng,
            formatted_address: destinationString,
            source: 'Authoritative Geographic Hierarchy'
          };
        }
      }
    }
  }

  // 2. Try 2 parts: City, Country
  if (parts.length === 2) {
    const [cityName, countryName] = parts;
    const country = getCountryByCodeOrName(countryName);
    if (country) {
      const states = State.getStatesOfCountry(country.isoCode);
      const targetCity = stripDiacritics(cityName);

      for (const st of states) {
        const cities = City.getCitiesOfState(country.isoCode, st.isoCode);
        let city = cities.find((c) => stripDiacritics(c.name) === targetCity);
        if (!city) {
          city = cities.find((c) => stripDiacritics(c.name).includes(targetCity));
        }

        if (city && city.latitude && city.longitude) {
          return {
            destination: destinationString,
            city: city.name,
            state: st.name,
            state_code: st.isoCode,
            country: country.name,
            country_code: country.isoCode,
            latitude: Number(city.latitude),
            longitude: Number(city.longitude),
            formatted_address: destinationString,
            source: 'Authoritative Geographic Hierarchy'
          };
        }
      }
    }
  }

  return null;
};
