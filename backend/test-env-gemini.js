// Test if environment variables are loaded
require('dotenv').config();

console.log('🔑 Environment Variables Check:');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? `Set (length: ${process.env.GEMINI_API_KEY.length})` : 'Not set');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? `Set (length: ${process.env.OPENAI_API_KEY.length})` : 'Not set');
console.log('HUGGINGFACE_API_KEY:', process.env.HUGGINGFACE_API_KEY ? `Set (length: ${process.env.HUGGINGFACE_API_KEY.length})` : 'Not set');

// Test Gemini API directly
async function testGeminiAPI() {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    
    if (!process.env.GEMINI_API_KEY) {
      console.log('❌ No Gemini API key found');
      return;
    }
    
    console.log('\n🧪 Testing Gemini API...');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = "Analyze this text and provide a summary: 'This is a test document about artificial intelligence and machine learning applications.'";
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Gemini API working!');
    console.log('📄 Response:', text.slice(0, 200) + '...');
    
  } catch (error) {
    console.error('❌ Gemini API error:', error.message);
  }
}

testGeminiAPI();