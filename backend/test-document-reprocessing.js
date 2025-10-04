const http = require('http');

async function testDocumentReprocessing() {
  try {
    console.log('🔍 Testing document reprocessing...');
    
    // Sample content to simulate the document processing
    const testContent = `
    VJH_2k25 Executive Summary: This document presents comprehensive information on the 
    subject matter, covering fundamental concepts, practical applications, and key insights 
    that are essential for understanding the topic. Main Content Areas: 1. Introduction and 
    Background The foundational principles underlying this subject provide the necessary 
    context for deeper understanding. These concepts form the basis for all subsequent 
    learning and application. Core Concepts and Definitions Key terminology and fundamental 
    ideas are essential building blocks.
    `;
    
    const postData = JSON.stringify({
      content: testContent,
      type: 'document'
    });
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/ai/process',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const response = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });
      
      req.on('error', reject);
      req.write(postData);
      req.end();
    });
    
    console.log('✅ Enhanced AI Processing Result:');
    console.log('📝 Summary:', response.summary);
    console.log('\n🔑 Key Points:');
    response.keyPoints.forEach((point, index) => {
      console.log(`  ${index + 1}. ${point}`);
    });
    
    console.log('\n💡 Concepts:');
    response.concepts.forEach((concept, index) => {
      console.log(`  ${index + 1}. ${concept}`);
    });
    
    console.log('\n🎯 Processed by:', response.processedBy);
    console.log('📚 Flashcards:', response.flashcards?.length || 0);
    console.log('❓ Quiz questions:', response.quiz?.length || 0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testDocumentReprocessing();