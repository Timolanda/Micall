// routes/emergencyAlerts.js
const express = require('express');
const router = express.Router();

// Mock database or logic for storing emergency alerts
let emergencyAlerts = [];

// Emergency Alert API
router.post('/send-emergency-alert', (req, res) => {
    const { emergencyType, message, location, recording } = req.body;

    // Validate incoming request
    if (!emergencyType || !message || !location) {
        return res.status(400).json({
            status: 'error',
            message: 'Emergency type, message, and location are required.',
        });
    }

    // Store the emergency alert in memory (you should replace this with actual database logic)
    const newAlert = {
        id: emergencyAlerts.length + 1,
        emergencyType,
        message,
        location,
        recording,
        createdAt: new Date(),
    };
    emergencyAlerts.push(newAlert);

    // Simulate notifying nearby responders (replace with actual notification logic)
    const respondersNotified = Math.floor(Math.random() * 10); // For demo purposes

    res.json({
        status: 'success',
        message: 'Emergency alert sent successfully',
        respondersNotified,
        alert: newAlert,
    });
});

module.exports = router;
