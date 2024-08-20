const express = require('express');
const cors = require('cors');
const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const app = express();

app.use(cors({
  origin: [process.env.CORS_ORIGIN, 'http://localhost:3000', 'https://ai-assistant-button.netlify.app'],
  credentials: true
}));

// Root route
app.get('/', (req, res) => {
  res.send('API is running');
});

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

// 404 handler
app.use((req, res, next) => {
  res.status(404).send("Sorry, that route doesn't exist.");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

module.exports = app;