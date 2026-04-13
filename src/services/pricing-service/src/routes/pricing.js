const express = require('express');
const router = express.Router();
const {
    getEstimate,
    postEstimate,
    getVehicleTypes,
    postEstimates
} = require('../controllers/pricingController');

router.get('/estimate', getEstimate);
router.post('/estimate', postEstimate);
router.get('/vehicle-types', getVehicleTypes);
router.post('/estimates', postEstimates);

router.post('/test-estimate', (req, res) => {
    const { distance_km, demand_index } = req.body;
    if (distance_km === undefined) return res.status(400).json({ error: 'Missing distance_km' });

    const baseFare = 15000;
    const perKmRate = 12000;
    const surge = demand_index || 1.0;
    const price = Math.round((baseFare + (distance_km * perKmRate)) * surge);

    return res.status(200).json({
        distance_km,
        demand_index: surge,
        price,
        currency: 'VND'
    });
});

module.exports = router;
