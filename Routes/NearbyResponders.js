// routes/nearbyResponders.js
const express = require('express');
const router = express.Router();

// Mock database of responders (replace with real database)
const responders = [
    { id: 1, name: 'Responder 1', location: { lat: 10, lng: 20 } },
    { id: 2, name: 'Responder 2', location: { lat: 12, lng: 22 } },
    { id: 3, name: 'Responder 3', location: { lat: 15, lng: 25 } },
];

// Calculate distance between two points using the Haversine formula
const getDistance = (loc1, loc2) => {
    const toRadians = (degree) => (degree * Math.PI) / 180;
    const R = 6371; // Radius of Earth in kilometers
    const latDiff = toRadians(loc2.lat - loc1.lat);
    const lngDiff = toRadians(loc2.lng - loc1.lng);
    const a =
        Math.sin(latDiff / 2) * Math.sin(latDiff / 2) +
        Math.cos(toRadians(loc1.lat)) *
            Math.cos(toRadians(loc2.lat)) *
            Math.sin(lngDiff / 2) *
            Math.sin(lngDiff / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
};

// API to fetch nearby responders
router.post('/nearby-responders', (req, res) => {
    const { userLocation, range } = req.body;

    // Validate incoming request
    if (!userLocation || !range) {
        return res.status(400).json({
            status: 'error',
            message: 'User location and range are required.',
        });
    }

    // Find nearby responders within the specified range
    const nearbyResponders = responders.filter((responder) => {
        const distance = getDistance(userLocation, responder.location);
        return distance <= range;
    });

    res.json({
        status: 'success',
        responders: nearbyResponders,
    });
});

module.exports = router;
