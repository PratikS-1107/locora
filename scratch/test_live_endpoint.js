async function testEndpoint() {
  try {
    const res = await fetch('http://localhost:3001/api/chat/discovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hi' })
    });
    console.log('HTTP Status from localhost:3001/api/chat/discovery:', res.status);
    const data = await res.json();
    console.log('Response:', data);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

testEndpoint();
