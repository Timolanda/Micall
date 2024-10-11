// routes/emergencyHistory.js
const express = require('express');
const router = express.Router();

// Mock database for user's emergency history
const emergencyHistory = {
    'user123': [
        { emergencyType: 'Medical', timestamp: '2023-09-01', status: 'Resolved' },
        { emergencyType: 'Fuel', timestamp: '2023-09-10', status: 'Pending' }
    ]
};

// Fetch Emergency History API
router.get('/emergency-history', (req, res) => {
    const { userId } = req.query;

    // Validate incoming request
    if (!userId) {
        return res.status(400).json({
            status: 'error',
            message: 'User ID is required.',
        });
    }

    const history = emergencyHistory[userId] || [];

    res.json({
        status: 'success',
        history,
    });
});

module.exports = router;
