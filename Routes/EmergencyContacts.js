// routes/emergencyContacts.js
const express = require('express');
const router = express.Router();

// Mock database for emergency contacts
let emergencyContacts = [
    { id: 1, name: 'John Doe', phone: '+1234567890' },
    { id: 2, name: 'Jane Smith', phone: '+0987654321' }
];

// Get emergency contacts
router.get('/emergency-contacts', (req, res) => {
    res.json({
        status: 'success',
        contacts: emergencyContacts,
    });
});

// Add a new emergency contact
router.post('/emergency-contacts', (req, res) => {
    const { name, phone } = req.body;

    // Validate incoming request
    if (!name || !phone) {
        return res.status(400).json({
            status: 'error',
            message: 'Name and phone number are required.',
        });
    }

    const newContact = { id: emergencyContacts.length + 1, name, phone };
    emergencyContacts.push(newContact);

    res.json({
        status: 'success',
        message: 'Emergency contact added successfully',
        contacts: emergencyContacts,
    });
});

module.exports = router;
