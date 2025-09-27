// Quick test script to verify master routes are working
const http = require('http');

function testRoute(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`${path}: ${res.statusCode} - ${data.startsWith('<!DOCTYPE') ? 'HTML (ERROR)' : 'JSON (OK)'}`);
        resolve();
      });
    });

    req.on('error', (err) => {
      console.log(`${path}: ERROR - ${err.message}`);
      resolve();
    });

    req.end();
  });
}

async function testAllRoutes() {
  console.log('Testing /api/master routes...\n');

  await testRoute('/api/master/stats');
  await testRoute('/api/master/businesses');
  await testRoute('/api/master/venues');

  console.log('\n✅ Test completed. If you see "JSON (OK)" above, the routes are working!');
  console.log('📝 If you see "HTML (ERROR)", restart the server with: cd backend && node server.js');
}

testAllRoutes();