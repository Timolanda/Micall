// api/sendNotification.js
const express = require('express');
const router = express.Router();

// Mock database to hold responder data (this should be replaced with actual DB logic)
const responders = [
    { id: 1, name: 'Responder 1', location: { lat: 10, long: 20 } },
    { id: 2, name: 'Responder 2', location: { lat: 15, long: 25 } },
    // Add more responders as needed
];

// Function to calculate distance between two geographic points using the Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};

// Send Notification API
router.post('/send-notification', (req, res) => {
    const { emergencyType, userLocation, userId, responderRange } = req.body;

    // Validate input
    if (!userLocation || !userLocation.lat || !userLocation.long || !responderRange) {
        return res.status(400).json({ status: 'Error', message: 'Invalid input' });
    }

    // Logic to find nearby responders based on userLocation and responderRange
    const nearbyResponders = responders.filter(responder => {
        const distance = calculateDistance(userLocation.lat, userLocation.long, responder.location.lat, responder.location.long);
        return distance <= responderRange; // Filter by the specified range
    });

    // Simulate sending notifications (this would be replaced with actual notification logic)
    // E.g., integrate with a notification service (like Firebase Cloud Messaging)
    nearbyResponders.forEach(responder => {
        console.log(`Sending notification to ${responder.name}: Emergency Type - ${emergencyType}`);
    });

    res.json({
        status: 'Success',
        message: 'Notifications sent to responders',
        responderCount: nearbyResponders.length
    });
});

module.exports = router;
