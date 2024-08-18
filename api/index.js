const express = require('express');
const cors = require('cors');
const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../server/.env') });

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
    return res.status(500).json({ 
      error: 'Failed to fetch token', 
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
      if (response.statusCode === 200) {
        console.log('Token received successfully');
        res.json(JSON.parse(data));
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
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});