#!/usr/bin/env node

// Simple AI Test - Test without external APIs first
const { generateAIResponse, generateSummary } = require('./ai-helpers');

async function testSimpleAI() {
  console.log('🧠 Testing MindSpark AI (Local Fallbacks)...\n');

  // Test 1: Chat with fallback responses
  console.log('1️⃣ Testing Chat Fallbacks...');
  try {
    const mathResponse = await generateAIResponse('What is 2 + 2?');
    console.log('✅ Math Response:', mathResponse);
    
    const scienceResponse = await generateAIResponse('Why is the sky blue?');
    console.log('✅ Science Response:', scienceResponse);
    
    const greetingResponse = await generateAIResponse('Hello!');
    console.log('✅ Greeting Response:', greetingResponse);
  } catch (error) {
    console.log('❌ Chat Error:', error.message);
  }
  console.log('');

  // Test 2: Document summarization with fallback
  console.log('2️⃣ Testing Document Summarization...');
  const sampleText = `
    Learning is a process that involves acquiring new knowledge, skills, behaviors, or values. 
    It can happen through study, experience, or teaching. Different people learn in different ways. 
    Some are visual learners who learn best through seeing. Others are auditory learners who learn 
    through listening. Kinesthetic learners learn best through hands-on activities. Understanding 
    your learning style can help you study more effectively and achieve better results in school.
  `;
  
  try {
    const summary = await generateSummary(sampleText);
    console.log('✅ Summary:', summary);
  } catch (error) {
    console.log('❌ Summary Error:', error.message);
  }
  console.log('');

  console.log('🎉 Simple AI Test Complete!');
  console.log('💡 The AI assistant will work with local fallbacks even without API keys.');
}

// Run tests
if (require.main === module) {
  testSimpleAI().catch(console.error);
}

module.exports = { testSimpleAI };