const http = require('http');

async function checkEndpoints() {
  try {
    console.log('🔍 Checking available endpoints...');
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api',
      method: 'GET'
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
    
    console.log('✅ Available endpoints:');
    console.log(JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('❌ Error checking endpoints:', error.message);
  }
}

checkEndpoints();