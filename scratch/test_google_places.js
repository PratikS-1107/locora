import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;

console.log('Testing Google Places API key exists:', Boolean(apiKey));

async function testPlacesAPINew(input) {
  console.log(`\n--- Testing Places API (New) for: "${input}" ---`);
  try {
    const url = 'https://places.googleapis.com/v1/places:autocomplete';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types'
      },
      body: JSON.stringify({
        input,
        includedPrimaryTypes: ['locality', 'administrative_area_level_1', 'administrative_area_level_2', 'country', 'natural_feature', 'tourist_attraction']
      })
    });

    console.log('Places API (New) Status:', response.status, response.statusText);
    const data = await response.json();
    if (!response.ok) {
      console.log('Error payload:', JSON.stringify(data, null, 2));
    } else {
      console.log('Suggestions count:', data.suggestions?.length || 0);
      if (data.suggestions && data.suggestions.length > 0) {
        console.log('First 3 predictions:', data.suggestions.slice(0, 3).map(s => ({
          place_id: s.placePrediction?.placeId,
          text: s.placePrediction?.text?.text,
          main: s.placePrediction?.structuredFormat?.mainText?.text,
          secondary: s.placePrediction?.structuredFormat?.secondaryText?.text,
          types: s.placePrediction?.types
        })));
      }
    }
  } catch (err) {
    console.error('Places API (New) exception:', err);
  }
}

async function testPlacesAPINewGeneral(input) {
  console.log(`\n--- Testing Places API (New) without types restriction for: "${input}" ---`);
  try {
    const url = 'https://places.googleapis.com/v1/places:autocomplete';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types'
      },
      body: JSON.stringify({ input })
    });

    console.log('Places API (New General) Status:', response.status, response.statusText);
    const data = await response.json();
    if (!response.ok) {
      console.log('Error payload:', JSON.stringify(data, null, 2));
    } else {
      console.log('Suggestions count:', data.suggestions?.length || 0);
      if (data.suggestions && data.suggestions.length > 0) {
        console.log('First 3 predictions:', data.suggestions.slice(0, 3).map(s => ({
          place_id: s.placePrediction?.placeId,
          text: s.placePrediction?.text?.text,
          main: s.placePrediction?.structuredFormat?.mainText?.text,
          secondary: s.placePrediction?.structuredFormat?.secondaryText?.text,
          types: s.placePrediction?.types
        })));
      }
    }
  } catch (err) {
    console.error('Places API (New General) exception:', err);
  }
}

async function testLegacyPlacesAPI(input) {
  console.log(`\n--- Testing Legacy Places API for: "${input}" ---`);
  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}`;
    const response = await fetch(url);
    console.log('Legacy API Status:', response.status, response.statusText);
    const data = await response.json();
    console.log('Legacy API data status:', data.status);
    if (data.status === 'OK') {
      console.log('Predictions count:', data.predictions?.length || 0);
      if (data.predictions && data.predictions.length > 0) {
        console.log('First 3 predictions:', data.predictions.slice(0, 3).map(p => ({
          place_id: p.place_id,
          description: p.description,
          main: p.structured_formatting?.main_text,
          secondary: p.structured_formatting?.secondary_text,
          types: p.types
        })));
      }
    } else {
      console.log('Legacy data:', data);
    }
  } catch (err) {
    console.error('Legacy Places API exception:', err);
  }
}

async function run() {
  await testPlacesAPINew('Mumbai');
  await testPlacesAPINewGeneral('Mumbai');
  await testPlacesAPINewGeneral('Udaipur');
  await testPlacesAPINewGeneral('Manali');
  await testPlacesAPINewGeneral('London');
  await testLegacyPlacesAPI('Mumbai');
}

run();
