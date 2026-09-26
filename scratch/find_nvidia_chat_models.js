import dotenv from 'dotenv';
dotenv.config();

async function findChatModels() {
  const key = process.env.NVIDIA_API_KEY;
  const res = await fetch('https://integrate.api.nvidia.com/v1/models', {
    headers: {
      'Authorization': `Bearer ${key}`
    }
  });

  if (res.ok) {
    const data = await res.json();
    const instructModels = (data?.data || []).map(m => m.id).filter(id => id.includes('instruct') || id.includes('it') || id.includes('chat'));
    console.log('Available Instruct/Chat models on NVIDIA:');
    console.log(instructModels);
  }
}

findChatModels().catch(console.error);
