#!/usr/bin/env node

// Direct Gemini API Test
require('dotenv').config();

async function testGeminiDirect() {
  console.log('🔑 Testing Gemini API Key directly...');
  console.log('API Key:', process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.substring(0, 10)}...` : 'NOT FOUND');
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "Hello, can you say hi back?"
          }]
        }]
      })
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.text();
    console.log('Response Body:', data);
    
    if (response.ok) {
      console.log('✅ Gemini API is working!');
    } else {
      console.log('❌ Gemini API failed');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testGeminiDirect();