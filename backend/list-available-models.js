require('dotenv').config();
const https = require('https');

const API_KEY = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

console.log('Fetching available Gemini models...\n');

https.get(url, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.models) {
        console.log('✅ Available models:\n');
        parsed.models.forEach(model => {
          if (model.supportedGenerationMethods && model.supportedGenerationMethods.includes('generateContent')) {
            console.log(`Model: ${model.name}`);
            console.log(`  Display Name: ${model.displayName || 'N/A'}`);
            console.log(`  Methods: ${model.supportedGenerationMethods.join(', ')}`);
            console.log('');
          }
        });
      } else {
        console.log('Response:', JSON.stringify(parsed, null, 2));
      }
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
