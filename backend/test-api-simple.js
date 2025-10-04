const http = require('http');

async function testAPI() {
  return new Promise((resolve, reject) => {
    console.log('🧪 Testing API endpoints...');
    
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
    
    const req = http.request(options, (res) => {
      console.log('📄 Status:', res.statusCode);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            console.log('✅ Documents API working!');
            console.log('📊 Documents count:', parsed.data?.documents?.length || 0);
            resolve(true);
          } catch (e) {
            console.log('❌ JSON parse error:', e.message);
            resolve(false);
          }
        } else {
          console.log('❌ API Error:', res.statusCode, data);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Connection error:', error.message);
      resolve(false);
    });
    
    req.end();
  });
}

testAPI();