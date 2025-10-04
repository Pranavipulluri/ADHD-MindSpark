const http = require('http');

async function testEnhancedAI() {
  try {
    console.log('🧪 Testing enhanced AI processing...');
    
    const testContent = `
    Attention Deficit Hyperactivity Disorder (ADHD) is a neurodevelopmental disorder that affects millions of people worldwide. 
    It is characterized by persistent patterns of inattention, hyperactivity, and impulsivity that interfere with functioning or development.
    
    The three main types of ADHD are:
    1. Predominantly Inattentive Presentation (formerly called ADD)
    2. Predominantly Hyperactive-Impulsive Presentation  
    3. Combined Presentation (most common)
    
    Symptoms of inattention include difficulty sustaining attention, making careless mistakes, trouble organizing tasks, 
    forgetfulness in daily activities, and being easily distracted. Hyperactivity symptoms include fidgeting, difficulty 
    remaining seated, excessive talking, and restlessness. Impulsivity manifests as difficulty waiting turns, interrupting 
    others, and making hasty decisions without considering consequences.
    
    ADHD affects approximately 5% of children and 2.5% of adults globally. It often persists into adulthood and can 
    significantly impact academic performance, work productivity, and relationships. Treatment typically involves a 
    combination of medication, behavioral therapy, and lifestyle modifications. Common medications include stimulants 
    like methylphenidate and amphetamines, as well as non-stimulants like atomoxetine.
    
    Research shows that ADHD has strong genetic components, with heritability estimates around 70-80%. Environmental 
    factors such as prenatal exposure to toxins, premature birth, and early childhood adversity may also contribute 
    to its development. Brain imaging studies reveal differences in structure and function, particularly in areas 
    responsible for executive function and attention regulation.
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
    
    console.log('✅ AI Processing Response:');
    console.log('Summary:', response.summary);
    console.log('\nKey Points:');
    response.keyPoints.forEach((point, index) => {
      console.log(`  ${index + 1}. ${point}`);
    });
    
    console.log('\nConcepts:');
    response.concepts.forEach((concept, index) => {
      console.log(`  ${index + 1}. ${concept}`);
    });
    
    console.log('\nProcessed by:', response.processedBy);
    console.log('\nFlashcards count:', response.flashcards?.length || 0);
    console.log('Quiz questions count:', response.quiz?.length || 0);
    
  } catch (error) {
    console.error('❌ Error testing AI processing:', error.message);
  }
}

testEnhancedAI();