const axios = require('axios');

const ETA_SERVICE_URL = process.env.ETA_SERVICE_URL || 'http://localhost:3008';
const PRICING_SERVICE_URL = process.env.PRICING_SERVICE_URL || 'http://localhost:3003';
const MAX_CANDIDATES = parseInt(process.env.MAX_CANDIDATES_TO_ENRICH || '5');

/**
 * Get ETA for a driver to reach pickup location
 */
async function getDriverETA(driverId, driverLocation, pickupLocation) {
    try {
        const response = await axios.post(`${ETA_SERVICE_URL}/eta/pickup`, {
            driverLocation,
            pickup: pickupLocation
        }, { timeout: 2000 });

        return {
            driverId,
            etaSeconds: response.data.pickupEtaSeconds || 300,
            distanceMeters: response.data.distanceMeters
        };
    } catch (error) {
        console.error(`[TOOL-ETA] Failed for driver ${driverId}:`, error.message);
        return null;
    }
}

/**
 * Get estimated price multiplier for a driver
 * (Simplified: currently pricing might be same for all drivers, but 
 * high-level agent should check if there's any surge specific to driver area)
 */
async function getDriverPricing(driverId, pickupLocation, vehicleType) {
    try {
        const response = await axios.post(`${PRICING_SERVICE_URL}/pricing/estimate`, {
            pickup: pickupLocation,
            drop: pickupLocation, // Mock drop as same as pickup to get base/surge info
            vehicleType
        }, { timeout: 2000 });

        return {
            driverId,
            priceMultiplier: response.data.surgeMultiplier || 1.0,
            estimatedPrice: response.data.estimatedPrice
        };
    } catch (error) {
        console.error(`[TOOL-PRICING] Failed for driver ${driverId}:`, error.message);
        return null;
    }
}

/**
 * Enrich a list of drivers with real-world tool data (ETA, Price)
 * Calls tools in parallel for speed.
 */
async function enrichDriversWithTools(drivers, pickupLocation, vehicleType) {
    if (!drivers || drivers.length === 0) return [];

    // Only enrich top N to save resources/time
    const candidates = drivers.slice(0, MAX_CANDIDATES);
    console.log(`[AGENT-TOOLS] Enriching data for top ${candidates.length} candidates...`);

    const enrichmentPromises = candidates.map(async (driver) => {
        const driverLoc = { lat: driver.lat, lng: driver.lng };
        
        // Call both tools in parallel for each driver
        const [etaData, pricingData] = await Promise.all([
            getDriverETA(driver.driverId, driverLoc, pickupLocation),
            getDriverPricing(driver.driverId, pickupLocation, vehicleType)
        ]);

        return {
            ...driver,
            etaSeconds: etaData ? etaData.etaSeconds : (driver.etaSeconds || 300),
            priceMultiplier: pricingData ? pricingData.priceMultiplier : (driver.priceMultiplier || 1.0)
        };
    });

    const enrichedCandidates = await Promise.all(enrichmentPromises);
    
    // Merge back with the rest of the list (those not enriched get default/mock values)
    const rest = drivers.slice(MAX_CANDIDATES).map(d => ({
        ...d,
        etaSeconds: d.etaSeconds || 600,
        priceMultiplier: d.priceMultiplier || 1.0
    }));

    return [...enrichedCandidates, ...rest];
}

module.exports = {
    enrichDriversWithTools,
    getDriverETA,
    getDriverPricing
};
