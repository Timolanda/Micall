// routes/shareLocation.js
const express = require('express');
const router = express.Router();

// Mock emergency contacts (replace with actual data)
const emergencyContacts = [
    { id: 1, name: 'Contact 1', phone: '+1234567890' },
    { id: 2, name: 'Contact 2', phone: '+0987654321' },
    // Add more contacts as needed
];

// API to share location with emergency contacts
router.post('/share-location', (req, res) => {
    const { userId, userLocation } = req.body;

    // Validate input
    if (!userId || !userLocation || !userLocation.lat || !userLocation.long) {
        return res.status(400).json({
            status: 'Error',
            message: 'Invalid input. Please provide userId and userLocation with lat and long.'
        });
    }

    // Logic to notify contacts with user's location
    emergencyContacts.forEach(contact => {
        console.log(`Notifying ${contact.name} at ${contact.phone}: Location - ${userLocation.lat}, ${userLocation.long}`);
    });

    res.json({
        status: 'Success',
        message: 'Location shared with emergency contacts',
        contactsNotified: emergencyContacts.length,
    });
});

module.exports = router;
