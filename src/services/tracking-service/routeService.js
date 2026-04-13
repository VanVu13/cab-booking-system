/**
 * Route Service - Backend (Node.js + Socket.IO)
 * Responsibility: Realtime tracking and route broadcasting via Socket.IO
 * ETA calculations are delegated to the dedicated ETA Service
 */

const socketio = require('socket.io');
const { initRabbitMQ } = require('./rabbitmq');
const { getRideDetails, getDriverLocation, getETARoute } = require('./internalClient');

function initRouteService(server, app) {
    const io = socketio(server, {
        cors: { origin: "*" },
        path: '/tracking-socket/'
    });

    // driverId -> rideId mapping to avoid frequent DB lookups
    const activeDriverRides = new Map();
    // rideId -> lastCalculationTime (ms) to throttle route calls
    const lastRouteCalculation = new Map();
    const ROUTE_THROTTLE_MS = 15000; // Recalculate every 15s max while moving

    /**
     * Calculate route based on current state and broadcast to specific room
     * Uses ETA Service for route/distance/duration calculations
     */
    async function calculateAndEmitRoute(rideId, isForced = false, overrideStatus = null) {
        const now = Date.now();
        const lastRun = lastRouteCalculation.get(rideId) || 0;

        if (!isForced && (now - lastRun < ROUTE_THROTTLE_MS)) {
            return; // Skip throttled call
        }

        console.log(`[Tracking] Recalculating route for ride: ${rideId} (Forced: ${isForced}, Override: ${overrideStatus})`);
        const ride = await getRideDetails(rideId);
        if (!ride) return;

        const driverId = ride.driverId;
        const currentStatus = overrideStatus || ride.status;

        // Update mapping if driver exists
        if (driverId) {
            activeDriverRides.set(driverId, rideId);
        }

        let startLoc = null;
        let targetLoc = null;
        let isHeadingToDrop = false;

        // Logic to determine start and end points for route
        if (['IN_PROGRESS', 'STARTED', 'COMPLETED'].includes(currentStatus)) {
            // In progress: Driver -> Drop
            isHeadingToDrop = true;
            const driverLoc = driverId ? await getDriverLocation(driverId) : null;
            startLoc = driverLoc ? { lat: driverLoc.lat, lng: driverLoc.lng } : ride.pickup;
            targetLoc = ride.drop;
        } else if (driverId) {
            // Driver assigned but not started: Driver -> Pickup
            const driverLoc = await getDriverLocation(driverId);
            startLoc = driverLoc ? { lat: driverLoc.lat, lng: driverLoc.lng } : ride.pickup;
            targetLoc = ride.pickup;
        } else {
            // No driver yet: Pickup -> Drop (preview)
            startLoc = ride.pickup;
            targetLoc = ride.drop;
        }

        if (startLoc && targetLoc) {
            console.log(`[Tracking] Route target for ${rideId}: ${isHeadingToDrop ? 'DROP' : 'PICKUP/ESTIMATE'} (${startLoc.lat},${startLoc.lng} -> ${targetLoc.lat},${targetLoc.lng})`);

            if (!startLoc.lat || !startLoc.lng || !targetLoc.lat || !targetLoc.lng) {
                console.error(`[Tracking] Invalid coordinates for ride ${rideId}:`, { startLoc, targetLoc });
                return;
            }

            // Delegate to ETA Service for route + ETA calculation
            const routeData = await getETARoute(
                { lat: startLoc.lat, lng: startLoc.lng },
                { lat: targetLoc.lat, lng: targetLoc.lng }
            );

            // Update timestamp
            lastRouteCalculation.set(rideId, Date.now());

            io.to(rideId).emit('ride:route_info', {
                route: routeData.points,
                distanceMeters: routeData.distance,
                durationSeconds: routeData.duration,
                driverId,
                pickup: ride.pickup,
                drop: ride.drop,
                status: currentStatus,
                driverLocation: driverId ? startLoc : null
            });
            console.log(`[Tracking] Emitted route_info + ETA for ${rideId} (Dist: ${routeData.distance}m, Time: ${routeData.duration}s)`);
        }
    }

    // Initialize RabbitMQ Consumer
    initRabbitMQ(async (data) => {
        const { routingKey } = data;

        if (routingKey === 'driver.location_updated') {
            const { driverId, lat, lng } = data;
            const rideId = activeDriverRides.get(driverId);

            if (rideId) {
                // 1. Broadcast raw location for smooth car movement
                io.to(rideId).emit('driver:location_update', {
                    rideId, driverId, lat, lng, timestamp: new Date()
                });

                // 2. Potentially recalculate route/ETA (Throttled)
                await calculateAndEmitRoute(rideId, false);
            }
        } else if (routingKey.startsWith('ride.')) {
            const rideId = String(data.rideId || data.bookingId || data.id);
            let eventStatus = data.status || (routingKey.split('.')[1] || '').toUpperCase();

            // Normalize STARTED -> IN_PROGRESS for consistent route logic
            if (eventStatus === 'STARTED') eventStatus = 'IN_PROGRESS';

            console.log(`[Tracking] Received event ${routingKey} for ${rideId} (Status: ${eventStatus})`);

            // Clear throttle so route recalculates immediately on status change
            lastRouteCalculation.delete(rideId);

            // Always force recalculate and emit on status changes
            await calculateAndEmitRoute(rideId, true, eventStatus);

            // Cleanup on completion
            if (['COMPLETED', 'CANCELLED'].includes(eventStatus)) {
                const ride = await getRideDetails(rideId);
                if (ride && ride.driverId) {
                    activeDriverRides.delete(ride.driverId);
                    lastRouteCalculation.delete(rideId);
                }
            }
        }
    });

    io.on('connection', (socket) => {
        socket.on('ride:join_tracking', async (data) => {
            const { rideId } = data;
            if (!rideId) return;

            // Join room for this specific ride
            socket.join(rideId);
            console.log(`[Tracking] Socket ${socket.id} joined tracking room for ride: ${rideId}`);

            // Initial calculation (Forced)
            await calculateAndEmitRoute(rideId, true);
        });

        socket.on('disconnect', () => {
            // Socket.IO handles room leave automatically
        });
    });

    return io;
}

module.exports = initRouteService;
