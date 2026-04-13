const { calculatePrice, getSurgeMultiplier } = require('../services/pricingCalculator');

async function getEstimate(req, res) {
    try {
        const { pickupLat, pickupLng, dropLat, dropLng, vehicleType } = req.query;

        if (pickupLat === undefined || pickupLng === undefined || dropLat === undefined || dropLng === undefined) {
            return res.status(400).json({
                error: 'Missing required query params: pickupLat, pickupLng, dropLat, dropLng'
            });
        }

        // Validate vehicleType if provided
        const validVehicleTypes = ['SEDAN', 'SUV', 'BIKE'];
        const selectedVehicleType = vehicleType || 'SEDAN';
        if (!validVehicleTypes.includes(selectedVehicleType)) {
            return res.status(400).json({
                error: `Invalid vehicleType. Must be one of: ${validVehicleTypes.join(', ')}`
            });
        }

        const pickup = { lat: parseFloat(pickupLat), lng: parseFloat(pickupLng) };
        const drop = { lat: parseFloat(dropLat), lng: parseFloat(dropLng) };

        if (isNaN(pickup.lat) || isNaN(pickup.lng) || isNaN(drop.lat) || isNaN(drop.lng)) {
            return res.status(400).json({ error: 'Invalid coordinates' });
        }

        const surgeMultiplier = getSurgeMultiplier(pickup);
        const estimate = calculatePrice(pickup, drop, selectedVehicleType, surgeMultiplier);

        return res.status(200).json(estimate);
    } catch (error) {
        console.error('GET /pricing/estimate error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function postEstimate(req, res) {
    try {
        const { pickup, drop, vehicleType } = req.body;

        if (!pickup || !drop) {
            return res.status(400).json({ error: 'Missing required fields: pickup, drop' });
        }

        if (pickup.lat === undefined || pickup.lng === undefined || drop.lat === undefined || drop.lng === undefined) {
            return res.status(400).json({ error: 'pickup and drop must have lat and lng' });
        }

        // Validate vehicleType
        const validVehicleTypes = ['SEDAN', 'SUV', 'BIKE'];
        const selectedVehicleType = vehicleType || 'SEDAN';
        if (!validVehicleTypes.includes(selectedVehicleType)) {
            return res.status(400).json({
                error: `Invalid vehicleType. Must be one of: ${validVehicleTypes.join(', ')}`
            });
        }

        const surgeMultiplier = getSurgeMultiplier(pickup);
        const estimate = calculatePrice(pickup, drop, selectedVehicleType, surgeMultiplier);

        return res.status(200).json({
            estimatedPrice: estimate.estimatedPrice,
            currency: estimate.currency,
            surgeMultiplier: estimate.surgeMultiplier,
            distance: estimate.details.distanceKm,
            duration: `${estimate.details.estimatedMinutes} phút`
        });
    } catch (error) {
        console.error('POST /pricing/estimate error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function getVehicleTypes(req, res) {
    try {
        const { PRICING_CONFIG } = require('../services/pricingCalculator');
        const types = Object.keys(PRICING_CONFIG).map(key => ({
            id: key,
            name: key === 'SEDAN' ? 'Cab 4 chỗ' : key === 'SUV' ? 'Cab 7 chỗ' : 'Cab Bike',
            description: key === 'BIKE' ? 'Tiết kiệm • Ứng dụng đón nhanh' : 'Gần bạn nhất • Ghế ngồi thoải mái',
            icon: key === 'BIKE' ? 'BIKE' : 'CAR'
        }));
        return res.status(200).json(types);
    } catch (error) {
        console.error('GET /pricing/vehicle-types error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function postEstimates(req, res) {
    try {
        const { pickup, drop } = req.body;

        if (!pickup || !drop) {
            return res.status(400).json({ error: 'Missing required fields: pickup, drop' });
        }

        const { calculatePrice, getSurgeMultiplier, PRICING_CONFIG } = require('../services/pricingCalculator');
        const surgeMultiplier = getSurgeMultiplier(pickup);

        const axios = require('axios');
        const OSRM_URL = 'http://router.project-osrm.org/route/v1/driving';

        // Lấy route chung cho tất cả các loại xe (vì quãng đường là như nhau)
        let route = [];
        try {
            const osrmRes = await axios.get(`${OSRM_URL}/${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}?overview=full&geometries=geojson`);
            if (osrmRes.data.routes && osrmRes.data.routes.length > 0) {
                route = osrmRes.data.routes[0].geometry.coordinates.map(coord => ({
                    lat: coord[1],
                    lng: coord[0]
                }));
            }
        } catch (err) {
            console.error('OSRM Routing Error in pricing-service:', err.message);
        }

        const estimates = Object.keys(PRICING_CONFIG).map(vehicleType => {
            const estimate = calculatePrice(pickup, drop, vehicleType, surgeMultiplier);
            return {
                vehicleType,
                estimatedPrice: estimate.estimatedPrice,
                currency: estimate.currency,
                distance: estimate.details.distanceKm,
                duration: `${estimate.details.estimatedMinutes} phút`
            };
        });

        return res.status(200).json({ estimates, route });
    } catch (error) {
        console.error('POST /pricing/estimates error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = { getEstimate, postEstimate, getVehicleTypes, postEstimates };
