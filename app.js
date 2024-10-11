// app.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Import API routes
const sendNotification = require('./api/sendNotification');
const emergencyHistory = require('./api/emergencyHistory');
const shareLocation = require('./api/shareLocation');
// Use API routes
app.use('/api', sendNotification);
app.use('/api', emergencyHistory);
app.use('/api', shareLocation);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
