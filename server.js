const express = require('express');
const path = require('path');
const { runAgent } = require('./agent');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API endpoint
app.get('/api/analyze', (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const result = runAgent(date);
    res.json({ success: true, data: result });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Mental Load Monitor running at http://localhost:${PORT}`);
});