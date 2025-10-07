// functions/api.js
const serverless = require('serverless-http'); // Vous devrez peut-être installer ce package
const express = require('express');
const app = express();

// Vos routes Express habituelles
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Netlify Function!' });
});
// Assurez-vous d'avoir une route catch-all si nécessaire

module.exports.handler = serverless(app);