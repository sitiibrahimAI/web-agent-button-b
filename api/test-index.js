const http = require('http');
const path = require('path');

// Load environment variables before requiring the app
const envPath = path.join(__dirname, '..', 'server', '.env');
console.log('Loading .env file from:', envPath);
require('dotenv').config({ path: envPath });

const app = require('./index');

const PORT = process.env.PORT || 3003;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Test server is running on http://localhost:${PORT}`);

  // Make a request to the /api/token endpoint
  http.get(`http://localhost:${PORT}/api/token`, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('Response status code:', res.statusCode);
      console.log('Response headers:', JSON.stringify(res.headers, null, 2));
      
      try {
        const parsedData = JSON.parse(data);
        console.log('Response body:', JSON.stringify(parsedData, null, 2));
        
        if (parsedData.token && parsedData.agentId) {
          console.log('Test successful: Received token and agent ID');
        } else {
          console.error('Test failed: Missing token or agent ID in response');
        }
      } catch (error) {
        console.error('Error parsing response data:', error);
        console.log('Raw response body:', data);
      }

      // Close the server after receiving the response
      server.close(() => {
        console.log('Test server closed');
        process.exit(0);
      });
    });
  }).on('error', (err) => {
    console.error('Error making request:', err.message);
    server.close(() => {
      console.log('Test server closed due to error');
      process.exit(1);
    });
  });
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please choose a different port or close the application using this port.`);
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Received SIGINT. Closing server gracefully.');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});