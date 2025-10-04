const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/documents/categories',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer demo-token-12345',
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', JSON.stringify(JSON.parse(data), null, 2));
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();