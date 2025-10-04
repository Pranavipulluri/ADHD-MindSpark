#!/usr/bin/env node

// Test available Gemini models
require('dotenv').config();

async function listGeminiModels() {
  console.log('📋 Listing available Gemini models...');
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log('Response Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Available Models:');
      data.models?.forEach(model => {
        console.log(`- ${model.name} (${model.displayName})`);
        console.log(`  Supported methods: ${model.supportedGenerationMethods?.join(', ')}`);
      });
    } else {
      const errorData = await response.text();
      console.log('Error:', errorData);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listGeminiModels();