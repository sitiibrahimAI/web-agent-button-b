const express = require('express');
const cors = require('cors');
const https = require('https');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '..', 'server', '.env');
console.log('Loading .env file from:', envPath);
require('dotenv').config({ path: envPath });

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.get('/api/token', (req, res) => {
  console.log('Fetching token from Bland AI...');
  console.log('BLAND_AGENT_ID:', process.env.BLAND_AGENT_ID);
  console.log('BLAND_AUTH_KEY:', process.env.BLAND_AUTH_KEY ? 'Set' : 'Not set');

  if (!process.env.BLAND_AGENT_ID || !process.env.BLAND_AUTH_KEY) {
    console.error('Missing environment variables: BLAND_AGENT_ID or BLAND_AUTH_KEY');
    return res.status(500).json({ 
      error: 'Server configuration error', 
      details: 'Missing required environment variables'
    });
  }

  const options = {
    hostname: 'web.bland.ai',
    port: 443,
    path: `/v1/agents/${process.env.BLAND_AGENT_ID}/authorize`,
    method: 'POST',
    headers: {
      'Authorization': process.env.BLAND_AUTH_KEY
    }
  };

  const request = https.request(options, (response) => {
    let data = '';

    response.on('data', (chunk) => {
      data += chunk;
    });

    response.on('end', () => {
      console.log('Response status code:', response.statusCode);
      console.log('Response data:', data);
      
      if (response.statusCode === 200) {
        console.log('Token received successfully');
        const responseData = JSON.parse(data);
        res.json({
          ...responseData,
          agentId: process.env.BLAND_AGENT_ID
        });
      } else {
        console.error('Error fetching token:', data);
        res.status(response.statusCode).json({ 
          error: 'Failed to fetch token', 
          details: data
        });
      }
    });
  });

  request.on('error', (error) => {
    console.error('Error fetching token:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch token', 
      details: error.message 
    });
  });

  request.end();
});

const PORT = process.env.PORT || 3003;

// Only start the server if this file is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app; // Export the app for testing