const http = require('http');
const fs = require('fs');
const path = require('path');

// Create a simple test file
const testFilePath = path.join(__dirname, 'test.txt');
fs.writeFileSync(testFilePath, 'This is a test file for upload with important content about testing and validation.');

// Simulate a multipart form data upload
const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
const formData = [
  `--${boundary}`,
  'Content-Disposition: form-data; name="title"',
  '',
  'Test Document Upload',
  `--${boundary}`,
  'Content-Disposition: form-data; name="file"; filename="test.txt"',
  'Content-Type: text/plain',
  '',
  'This is a test file for upload with important content about testing and validation.',
  `--${boundary}--`,
  ''
].join('\r\n');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/documents',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer demo-token-123',
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': Buffer.byteLength(formData)
  }
};

console.log('🧪 Testing document upload...');

const req = http.request(options, (res) => {
  console.log(`📄 Status: ${res.statusCode}`);
  console.log('📋 Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📊 Response:', data);
    try {
      const parsed = JSON.parse(data);
      console.log('✅ Parsed response:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('⚠️  Could not parse as JSON:', e.message);
    }
    // Clean up test file
    fs.unlinkSync(testFilePath);
  });
});

req.on('error', (e) => {
  console.error(`❌ Request error: ${e.message}`);
  // Clean up test file
  if (fs.existsSync(testFilePath)) {
    fs.unlinkSync(testFilePath);
  }
});

req.write(formData);
req.end();