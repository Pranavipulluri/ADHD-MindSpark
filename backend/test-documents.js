const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/documents',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer demo-token-12345',
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log('Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();