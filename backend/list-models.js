require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    console.log('Fetching available models...\n');
    const models = await genAI.listModels();
    
    console.log('✓ Available models:');
    models.forEach(model => {
      console.log(`- ${model.name}`);
      console.log(`  Display Name: ${model.displayName}`);
      console.log(`  Supported Methods: ${model.supportedGenerationMethods.join(', ')}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('✗ Error listing models:', error.message);
  }
}

listModels();
