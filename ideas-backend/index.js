const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

app.get('/', (req, res) => {
  res.send('PhotoApp Backend - Hello World! 🚀');
});

app.get('/api/status', (req, res) => {
  res.json({ status: 'online', message: 'A szerver készen áll a munkára.' });
});

app.listen(PORT, () => {
  console.log(`Szerver fut a ${PORT} porton`);
});
