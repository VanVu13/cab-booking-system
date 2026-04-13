/**
 * Haversine formula to calculate distance between two points on Earth
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

// Pricing configuration - từ ENV (có thể thay đổi không cần sửa code)
const PRICING_CONFIG = {
    SEDAN: {
        base: parseInt(process.env.SEDAN_BASE_PRICE) || 15000,
        perKm: parseInt(process.env.SEDAN_PRICE_PER_KM) || 10000,
        perMin: parseInt(process.env.SEDAN_PRICE_PER_MIN) || 500
    },
    SUV: {
        base: parseInt(process.env.SUV_BASE_PRICE) || 20000,
        perKm: parseInt(process.env.SUV_PRICE_PER_KM) || 15000,
        perMin: parseInt(process.env.SUV_PRICE_PER_MIN) || 700
    },
    BIKE: {
        base: parseInt(process.env.BIKE_BASE_PRICE) || 8000,
        perKm: parseInt(process.env.BIKE_PRICE_PER_KM) || 4000,
        perMin: parseInt(process.env.BIKE_PRICE_PER_MIN) || 300
    }
};

const DEFAULT_SPEED_KMH = parseInt(process.env.DEFAULT_SPEED_KMH) || 30;

/**
 * Calculate price estimate for a ride
 */
function calculatePrice(pickup, drop, vehicleType = 'SEDAN', surgeMultiplier = 1.0) {
    const config = PRICING_CONFIG[vehicleType] || PRICING_CONFIG.SEDAN;

    const distanceKm = calculateDistance(pickup.lat, pickup.lng, drop.lat, drop.lng);
    const estimatedMinutes = (distanceKm / DEFAULT_SPEED_KMH) * 60;

    const basePrice = config.base;
    const distancePrice = Math.round(distanceKm * config.perKm);
    const timePrice = Math.round(estimatedMinutes * config.perMin);

    const subtotal = basePrice + distancePrice + timePrice;
    const total = Math.round(subtotal * surgeMultiplier);

    return {
        estimatedPrice: total,
        currency: 'VND',
        surgeMultiplier: surgeMultiplier,
        breakdown: { base: basePrice, distance: distancePrice, time: timePrice },
        details: {
            distanceKm: Math.round(distanceKm * 100) / 100,
            estimatedMinutes: Math.round(estimatedMinutes),
            vehicleType: vehicleType
        }
    };
}

function getSurgeMultiplier(location) {
    const hour = new Date().getHours();
    // Peak hours: 17:00 - 19:59 => 1.3x
    if (hour >= 17 && hour <= 19) return 1.3;
    // Normal hours => 1.0x
    return 1.0;
}

module.exports = { calculateDistance, calculatePrice, getSurgeMultiplier, PRICING_CONFIG };
