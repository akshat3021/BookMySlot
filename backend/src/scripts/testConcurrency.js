const http = require('http');

const args = process.argv.slice(2);
if (args.length < 3) {
  console.log('Usage: node src/scripts/testConcurrency.js <token> <service_uuid> <slot_uuid>');
  process.exit(1);
}

const [token, serviceId, slotId] = args;

const makeRequest = (name) => {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      service_id: serviceId,
      slot_id: slotId,
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/bookings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`[Request ${name}] Status Code: ${res.statusCode}`);
        console.log(`[Request ${name}] Response:`, data);
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (err) => {
      console.error(`[Request ${name}] Error:`, err.message);
      resolve({ status: 500, error: err.message });
    });

    req.write(postData);
    req.end();
  });
};

const runTest = async () => {
  console.log('Firing simultaneous booking requests for slot:', slotId);
  // Send 3 requests at the exact same millisecond
  await Promise.all([
    makeRequest('A'),
    makeRequest('B'),
    makeRequest('C'),
  ]);
  console.log('Test execution completed.');
};

runTest();
