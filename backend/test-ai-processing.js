const http = require('http');

// Test the AI document processing
const testContent = `
Introduction to Machine Learning

Machine learning is a subset of artificial intelligence that focuses on developing algorithms that can learn and make decisions from data without being explicitly programmed for every task. 

Key Concepts:
1. Supervised Learning: Uses labeled data to train models
2. Unsupervised Learning: Finds patterns in data without labels  
3. Neural Networks: Computing systems inspired by biological neural networks
4. Deep Learning: Machine learning using deep neural networks

Applications:
- Image recognition and computer vision
- Natural language processing
- Recommendation systems
- Autonomous vehicles

The field has grown rapidly due to increases in computing power and availability of large datasets.
`;

const postData = JSON.stringify({
  content: testContent,
  filename: 'ml-intro.txt',
  title: 'Introduction to Machine Learning',
  save_to_library: false
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/ai/process-document',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer demo-token-12345',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('=== AI PROCESSING TEST RESULTS ===');
      console.log('Success:', response.success);
      console.log('Processed By:', response.processed?.processedBy || 'Unknown');
      console.log('\nSummary:');
      console.log(response.processed?.summary || 'No summary');
      console.log('\nKey Points:');
      if (response.processed?.keyPoints) {
        response.processed.keyPoints.forEach((point, i) => {
          console.log(`${i + 1}. ${point}`);
        });
      }
      console.log('\nConcepts:');
      console.log(response.processed?.concepts || 'No concepts');
      console.log('\nAnalysis:');
      console.log('Reading Level:', response.processed?.analysis?.readingLevel || 'Unknown');
      console.log('Word Count:', response.processed?.analysis?.wordCount || 'Unknown');
      console.log('=====================================');
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();