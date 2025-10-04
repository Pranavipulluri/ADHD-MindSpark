#!/usr/bin/env node

// MindSpark AI Integration Test Script
const { generateAIResponse, generateSummary, processWithLocalAI } = require('./ai-helpers');

async function testAI() {
  console.log('🧠 Testing MindSpark AI Integration...\n');

  // Test 1: Gemini API Chat
  console.log('1️⃣ Testing Gemini API Chat...');
  try {
    const chatResponse = await generateAIResponse('What is 2 + 2?');
    console.log('✅ Chat Response:', chatResponse);
  } catch (error) {
    console.log('❌ Chat Error:', error.message);
  }
  console.log('');

  // Test 2: Gemini API Summarization
  console.log('2️⃣ Testing Gemini API Summarization...');
  const sampleText = `
    Artificial Intelligence (AI) is a branch of computer science that aims to create intelligent machines 
    that can think and learn like humans. AI systems can perform tasks that typically require human intelligence, 
    such as visual perception, speech recognition, decision-making, and language translation. 
    Machine learning is a subset of AI that enables computers to learn and improve from experience without 
    being explicitly programmed. Deep learning, a subset of machine learning, uses neural networks with 
    multiple layers to analyze and learn from large amounts of data.
  `;
  
  try {
    const summary = await generateSummary(sampleText);
    console.log('✅ Summary:', summary);
  } catch (error) {
    console.log('❌ Summary Error:', error.message);
  }
  console.log('');

  // Test 3: Local Python AI (if available)
  console.log('3️⃣ Testing Local Python AI...');
  try {
    const localResult = await processWithLocalAI(sampleText, 'summarize');
    console.log('✅ Local AI Result:', localResult);
  } catch (error) {
    console.log('❌ Local AI Error:', error.message);
    console.log('💡 To enable local AI, run: ./setup-python-ai.sh');
  }
  console.log('');

  console.log('🎉 AI Integration Test Complete!');
}

// Run tests
if (require.main === module) {
  testAI().catch(console.error);
}

module.exports = { testAI };