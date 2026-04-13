const express = require('express');
const router = express.Router();
const { calculateETA, calculatePickupETA } = require('../etaCalculator');

/**
 * POST /eta/estimate
 * Calculate ETA and distance between pickup and drop points
 * Used by booking-service and api-gateway
 */
router.post('/estimate', async (req, res) => {
    try {
        const { pickup, drop } = req.body;

        if (!pickup || !drop || !pickup.lat || !pickup.lng || !drop.lat || !drop.lng) {
            return res.status(400).json({
                error: 'Invalid coordinates. Required: pickup.lat, pickup.lng, drop.lat, drop.lng'
            });
        }

        const result = await calculateETA(pickup, drop);

        return res.json({
            distanceMeters: result.distanceMeters,
            durationSeconds: result.durationSeconds,
            pickupEtaSeconds: result.pickupEtaSeconds,
            trafficMultiplier: result.trafficMultiplier,
            source: result.source
        });
    } catch (error) {
        console.error('[ETA] /estimate error:', error.message);
        res.status(500).json({ error: 'Failed to calculate ETA estimate' });
    }
});

/**
 * POST /eta/route
 * Calculate full route info including polyline points
 * Used by tracking-service for route visualization
 */
router.post('/route', async (req, res) => {
    try {
        const { start, end } = req.body;

        if (!start || !end || !start.lat || !start.lng || !end.lat || !end.lng) {
            return res.status(400).json({
                error: 'Invalid coordinates. Required: start.lat, start.lng, end.lat, end.lng'
            });
        }

        const result = await calculateETA(start, end);

        return res.json({
            distanceMeters: result.distanceMeters,
            durationSeconds: result.durationSeconds,
            points: result.points,
            trafficMultiplier: result.trafficMultiplier,
            source: result.source
        });
    } catch (error) {
        console.error('[ETA] /route error:', error.message);
        res.status(500).json({ error: 'Failed to calculate route' });
    }
});

/**
 * POST /eta/pickup
 * Calculate ETA for driver to reach pickup point
 * Used by tracking-service and matching-service
 */
router.post('/pickup', async (req, res) => {
    try {
        const { driverLocation, pickup } = req.body;

        if (!driverLocation || !pickup ||
            !driverLocation.lat || !driverLocation.lng ||
            !pickup.lat || !pickup.lng) {
            return res.status(400).json({
                error: 'Invalid coordinates. Required: driverLocation.{lat,lng}, pickup.{lat,lng}'
            });
        }

        const result = await calculatePickupETA(driverLocation, pickup);

        return res.json({
            pickupEtaSeconds: result.durationSeconds,
            distanceMeters: result.distanceMeters,
            points: result.points,
            trafficMultiplier: result.trafficMultiplier,
            source: result.source
        });
    } catch (error) {
        console.error('[ETA] /pickup error:', error.message);
        res.status(500).json({ error: 'Failed to calculate pickup ETA' });
    }
});

/**
 * POST /eta/test-estimate
 * Test endpoint for teacher
 */
router.post('/test-estimate', (req, res) => {
    const { distance_km, traffic_level } = req.body;
    if (distance_km === undefined) return res.status(400).json({ error: 'Missing distance_km' });

    const distanceMeters = distance_km * 1000;
    const avgSpeedMPS = 30 * 1000 / 3600;
    const traffic = traffic_level || 1.0;
    const duration = Math.round((distanceMeters / avgSpeedMPS) * traffic);

    return res.status(200).json({
        distance_km,
        traffic_level: traffic,
        eta_seconds: duration,
        eta_minutes: Math.round(duration / 60)
    });
});

module.exports = router;
