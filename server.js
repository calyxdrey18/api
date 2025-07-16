const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
// This line still works perfectly. It will find and serve index.html from the public folder.
app.use(express.static(path.join(__dirname, '../public')));

const DREADED_API_URL = 'https://api.dreaded.site/api/chatgpt';

app.post('/api/calyxai', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required.' });
    }
    console.log(`Forwarding prompt to external API: "${prompt}"`);
    const externalApiResponse = await axios.post(DREADED_API_URL, { prompt });
    res.json(externalApiResponse.data);
  } catch (error) {
    console.error('Error in /api/chat endpoint:', error.message);
    res.status(500).json({ message: 'An error occurred while communicating with the external API.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running and listening on port ${PORT}`);
});

