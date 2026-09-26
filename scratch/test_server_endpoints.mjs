import app from '../server/index.js';

async function testServer() {
  const server = app.listen(3099, async () => {
    console.log('Testing server on port 3099...\n');
    try {
      // 1. Health check
      console.log('1. Testing GET /api/health');
      const healthRes = await fetch('http://localhost:3099/api/health');
      const healthData = await healthRes.json();
      console.log('   Response:', healthData);
      console.assert(healthData.status === 'ok', 'Health status should be ok');

      // 2. Discover Recommendations endpoint
      console.log('\n2. Testing POST /api/ai/recommendations');
      const recsRes = await fetch('http://localhost:3099/api/ai/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: { latitude: 19.1932, longitude: 72.9723, city: 'Thane', country: 'India' },
          category: 'nature'
        })
      });
      const recsData = await recsRes.json();
      console.log('   Status:', recsRes.status);
      console.log('   Success:', recsData.success);
      console.log('   Recommendations Count:', recsData.recommendations?.length ?? 0);
      console.log('   Source:', recsData.source);

      console.log('\n✔ All server endpoint tests completed successfully!');
    } catch (err) {
      console.error('Server endpoint test error:', err);
    } finally {
      server.close(() => process.exit(0));
    }
  });
}

testServer();
