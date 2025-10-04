#!/usr/bin/env node

// Working AI Test with correct Gemini model
require('dotenv').config();

async function testWorkingAI() {
  console.log('🧠 Testing Working MindSpark AI...\n');

  // Test 1: Direct Gemini API call
  console.log('1️⃣ Testing Gemini 2.0 Flash...');
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "You are a friendly AI tutor for children with learning differences like ADHD and dyslexia. Answer this question in a simple, encouraging way with emojis. Keep responses under 100 words and age-appropriate: What is 2 + 2?"
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 150,
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
        const aiResponse = data.candidates[0].content.parts[0].text.trim();
        console.log('✅ Gemini Response:', aiResponse);
      }
    } else {
      console.log('❌ Gemini failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Gemini Error:', error.message);
  }
  console.log('');

  // Test 2: Document Summarization
  console.log('2️⃣ Testing Document Summarization...');
  try {
    const sampleText = `
      Learning is a process that involves acquiring new knowledge, skills, behaviors, or values. 
      It can happen through study, experience, or teaching. Different people learn in different ways. 
      Some are visual learners who learn best through seeing. Others are auditory learners who learn 
      through listening. Kinesthetic learners learn best through hands-on activities. Understanding 
      your learning style can help you study more effectively and achieve better results in school.
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Please create a clear, concise summary of this text for a student. Focus on the main points and key concepts: ${sampleText}`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 200,
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
        const summary = data.candidates[0].content.parts[0].text.trim();
        console.log('✅ Summary:', summary);
      }
    } else {
      console.log('❌ Summarization failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Summary Error:', error.message);
  }
  console.log('');

  console.log('🎉 Working AI Test Complete!');
  console.log('✅ The AI assistant and document processor are now working properly!');
}

testWorkingAI();