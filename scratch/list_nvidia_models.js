import dotenv from 'dotenv';
dotenv.config();

async function listNvidiaModels() {
  const key = process.env.NVIDIA_API_KEY;
  const res = await fetch('https://integrate.api.nvidia.com/v1/models', {
    headers: {
      'Authorization': `Bearer ${key}`
    }
  });

  console.log(`List models HTTP ${res.status}`);
  if (res.ok) {
    const data = await res.json();
    console.log('Available models count:', data?.data?.length);
    const modelIds = (data?.data || []).map(m => m.id);
    console.log('Sample model IDs:', modelIds.slice(0, 20));
  } else {
    console.log(await res.text());
  }
}

listNvidiaModels().catch(console.error);
