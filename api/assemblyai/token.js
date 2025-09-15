const { AssemblyAI } = require('assemblyai');

async function generateToken() {
  const apiKey = 'c7498f05ecfe46d39c00ee121d6f7073';
  
  if (!apiKey) {
    throw new Error('Assembly AI API key not found');
  }

  const client = new AssemblyAI({ apiKey });
  
  // Generate temporary token valid for 1 hour
  const token = await client.streaming.createTemporaryToken({
    expires_in_seconds: 3600
  });
  
  return token;
}

// For Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateToken };
}
