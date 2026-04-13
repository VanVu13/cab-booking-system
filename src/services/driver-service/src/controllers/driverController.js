const DriverLocation = require('../models/DriverLocation');
const { Op, Sequelize } = require('sequelize');

/**
 * POST /drivers/location
 * Update driver GPS location
 * Contract: { driverId, lat, lng } → { status: "location_updated" }
 */
async function updateLocation(req, res) {
    try {
        const { lat, lng, status, vehicleType } = req.body;
        const driverId = req.headers['x-user-id']; // Trust only the gateway

        // Validate required fields
        if (!driverId) {
            return res.status(401).json({ error: 'Unauthorized: Missing driver ID' });
        }

        if (lat === undefined || lng === undefined) {
            return res.status(400).json({
                error: 'Missing required fields: lat, lng'
            });
        }

        // Validate vehicleType
        const validVehicleTypes = ['SEDAN', 'SUV', 'BIKE'];
        const selectedVehicleType = vehicleType || 'SEDAN';
        if (!validVehicleTypes.includes(selectedVehicleType)) {
            return res.status(400).json({
                error: `Invalid vehicleType. Must be one of: ${validVehicleTypes.join(', ')}`
            });
        }

        // Upsert driver location
        const [driver, created] = await DriverLocation.upsert({
            driverId,
            lat,
            lng,
            status: status || 'AVAILABLE',
            vehicleType: selectedVehicleType
            // updatedAt is handled automatically by Sequelize
        });

        console.log(`✓ Driver ${driverId} location updated: (${lat}, ${lng})`);

        // Publish event for real-time tracking (Notification Service -> Customer App)
        const { publishLocationUpdated } = require('../events/producer');
        await publishLocationUpdated(driverId, lat, lng);

        return res.status(200).json({
            status: 'location_updated'
        });

    } catch (error) {
        console.error('Update location error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * GET /drivers/nearby
 * Find nearby available drivers
 * Contract: ?lat=&lng=&radius= → { drivers: [...] }
 */
async function getNearbyDrivers(req, res) {
    try {
        const { lat, lng, radius = 5000, vehicleType } = req.query;

        // Validate required fields
        if (lat === undefined || lng === undefined) {
            return res.status(400).json({
                error: 'Missing required query params: lat, lng'
            });
        }

        // Validate vehicleType if provided
        if (vehicleType) {
            const validVehicleTypes = ['SEDAN', 'SUV', 'BIKE'];
            if (!validVehicleTypes.includes(vehicleType)) {
                return res.status(400).json({
                    error: `Invalid vehicleType. Must be one of: ${validVehicleTypes.join(', ')}`
                });
            }
        }

        const pickupLat = parseFloat(lat);
        const pickupLng = parseFloat(lng);
        const radiusKm = parseFloat(radius) / 1000;

        // Find available drivers within radius using Haversine formula
        // 1 degree ≈ 111km
        const latRange = radiusKm / 111;
        const lngRange = radiusKm / (111 * Math.cos(pickupLat * Math.PI / 180));

        console.log(`[DEBUG] Finding drivers near (${pickupLat}, ${pickupLng}) radius=${radiusKm}km for vehicle=${vehicleType || 'ANY'}`);

        const whereClause = {
            status: 'AVAILABLE',
            lat: {
                [Op.between]: [pickupLat - latRange, pickupLat + latRange]
            },
            lng: {
                [Op.between]: [pickupLng - lngRange, pickupLng + lngRange]
            },
            updatedAt: {
                [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Debug: Widen to 24h to avoid stale data issues
            }
        };

        // Filter by vehicle type if specified
        if (vehicleType) {
            whereClause.vehicleType = vehicleType;
        }

        const drivers = await DriverLocation.findAll({
            where: whereClause,
            order: [['updatedAt', 'DESC']],
            limit: 20
        });

        console.log(`[DEBUG] Raw DB query returned ${drivers.length} drivers`);

        // Calculate distance for each driver
        const driversWithDistance = drivers.map(driver => {
            const driverLat = parseFloat(driver.lat);
            const driverLng = parseFloat(driver.lng);

            // Haversine distance calculation
            const R = 6371000; // Earth radius in meters
            const dLat = (driverLat - pickupLat) * Math.PI / 180;
            const dLng = (driverLng - pickupLng) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(pickupLat * Math.PI / 180) * Math.cos(driverLat * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distanceMeters = Math.round(R * c);

            return {
                driverId: driver.driverId,
                lat: driverLat,
                lng: driverLng,
                status: driver.status,
                vehicleType: driver.vehicleType,
                rating: parseFloat(driver.rating),
                distanceMeters
            };
        });

        // Sort by distance
        driversWithDistance.sort((a, b) => a.distanceMeters - b.distanceMeters);

        console.log(`✓ Found ${driversWithDistance.length} nearby drivers`);

        return res.status(200).json({
            drivers: driversWithDistance
        });

    } catch (error) {
        console.error('Get nearby drivers error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * PATCH /drivers/status
 * Update driver status (ONLINE/OFFLINE)
 */
async function updateStatus(req, res) {
    try {
        const driverId = req.headers['x-user-id'] || req.body.driver_id;

        const isOnline = req.body.isOnline ?? (req.body.status === 'ONLINE');

        if (!driverId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const status = isOnline ? 'AVAILABLE' : 'OFFLINE';

        // Update status in Redis/DB
        // For now, we update the DriverLocation table if it exists
        const [updatedRows] = await DriverLocation.update(
            { status },
            { where: { driverId } }
        );

        if (updatedRows === 0) {
            // Need to create entry if not exists? 
            // Usually location update creates it. 
            // Let's assume driver must have location set to be online?
            // Or we just upsert with null lat/lng? (Dangerous)

            // Better: If no row, create with dummy 0,0? No.
            // Just warn if not found.
            // Actually `upsert` in updateLocation is better.

            // Let's try upserting with existing values if possible, or just update.
            // If checking in/out, user might typically have location.

            // Simplest valid approach:
            // Since we use upsert in updateLocation, the record might usually exist.
            // If it doesn't exist, we can create it provided we have lat/lng?
            // But here we only have status.

            // Let's stick to update for now. If 0 rows, maybe they haven't sent location yet.
            // In that case, we can try to findOrCreate.

            const [driver, created] = await DriverLocation.findOrCreate({
                where: { driverId },
                defaults: {
                    driverId,
                    lat: 0,
                    lng: 0,
                    status,
                    vehicleType: 'SEDAN' // Default
                }
            });

            if (!created) {
                driver.status = status;
                await driver.save();
            }
        }

        console.log(`✓ Driver ${driverId} status updated: ${status}`);

        return res.status(200).json({
            status: 'status_updated',
            isOnline: status === 'AVAILABLE'
        });

    } catch (error) {
        console.error('Update status error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * GET /drivers/:id/location
 * Get specific driver location
 */
async function getDriverLocation(req, res) {
    try {
        const { id } = req.params;
        const driver = await DriverLocation.findOne({ where: { driverId: id } });

        if (!driver) {
            return res.status(404).json({ error: 'Driver location not found' });
        }

        return res.status(200).json({
            driverId: driver.driverId,
            lat: parseFloat(driver.lat),
            lng: parseFloat(driver.lng),
            updatedAt: driver.updatedAt
        });
    } catch (error) {
        return res.status(500).json({ error: 'Internal error' });
    }
}

module.exports = { updateLocation, getNearbyDrivers, getDriverLocation, updateStatus };
