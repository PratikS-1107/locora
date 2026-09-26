import { serverGeocodeDestination } from '../server/index.js';

async function testGeocode() {
  const r1 = await serverGeocodeDestination('Thane');
  console.log('Geocode "Thane":', r1);
  const r2 = await serverGeocodeDestination('thane recommend me');
  console.log('Geocode "thane recommend me":', r2);
}

testGeocode().catch(console.error);
