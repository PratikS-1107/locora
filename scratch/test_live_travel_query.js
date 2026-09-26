async function testTravelQuery() {
  try {
    const res = await fetch('http://localhost:3001/api/chat/discovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Find cultural places in Mumbai for 2 hours with ₹1000 budget.',
        location: { latitude: 18.922, longitude: 72.834, city: 'Mumbai' }
      })
    });
    console.log('Travel Query HTTP Status:', res.status);
    const data = await res.json();
    console.log('Reply:', data.reply);
    console.log('Recommendations count:', data.recommendations?.length);
    console.log('Conversation State:', data.conversationState);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testTravelQuery();
