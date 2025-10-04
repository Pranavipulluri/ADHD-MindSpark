const http = require('http');

async function testDocumentsAPI() {
  try {
    console.log('🔍 Testing documents API...');
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/documents',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer demo-token-123',
        'Content-Type': 'application/json'
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
      req.end();
    });
    
    console.log('✅ API Response received');
    console.log('📄 Documents count:', response.data?.documents?.length || 0);
    
    if (response.data?.documents?.length > 0) {
      const doc = response.data.documents.find(d => d.title === 'gbn');
      if (doc) {
        console.log('\n🎯 Found "gbn" document:');
        console.log('📝 Title:', doc.title);
        console.log('📁 File URL:', doc.file_url || 'No file');
        console.log('🧠 AI Processed:', doc.ai_processed_at ? 'Yes' : 'No');
        console.log('📊 Has AI Summary:', doc.ai_summary ? 'Yes' : 'No');
        
        if (doc.ai_summary) {
          const summary = typeof doc.ai_summary === 'string' ? JSON.parse(doc.ai_summary) : doc.ai_summary;
          console.log('\n📋 AI Summary Preview:');
          console.log('   Summary:', summary.summary?.slice(0, 100) + '...');
          console.log('   Key Points:', summary.keyPoints?.length || 0);
          console.log('   Concepts:', summary.concepts?.join(', ') || 'None');
          console.log('   Processed by:', summary.processedBy || 'Unknown');
        }
      } else {
        console.log('❌ "gbn" document not found in API response');
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testDocumentsAPI();