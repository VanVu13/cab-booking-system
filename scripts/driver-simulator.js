/**
 * DRIVER SIMULATOR
 * GIẢ LẬP TÀI XẾ TEST HỆ THỐNG REAL-TIME
 * 
 * Cách chạy: node scripts/driver-simulator.js
 * Yêu cầu: npm install socket.io-client (đã có ở root)
 */

const { io } = require('socket.io-client');
const axios = require('axios');
/**
 * OFFSET GPS theo mét (giả lập driver gần / xa hơn)
 */
function offsetLocation(lat, lng, meters) {
    const earthRadius = 6378137;

    const dLat = meters / earthRadius;
    const dLng = meters / (earthRadius * Math.cos(Math.PI * lat / 180));

    return {
        lat: lat + (dLat * 180 / Math.PI),
        lng: lng + (dLng * 180 / Math.PI)
    };
}
// CONFIGURATION
const DRIVER_ID = process.env.DRIVER_ID || 'driver-fake-001';
// Cho phép truyền tọa độ qua biến môi trường, mặc định là Quận 10 HCM
const BASE_LAT = parseFloat(process.env.LAT) || 10.716716;   // Vị trí tài xế thật của bạn
const BASE_LNG = parseFloat(process.env.LNG) || 106.703124;

const OFFSET_METERS = parseFloat(process.env.OFFSET) || 300; // Xa hơn 300m

const offset = offsetLocation(BASE_LAT, BASE_LNG, OFFSET_METERS);

const DEFAULT_LAT = offset.lat;
const DEFAULT_LNG = offset.lng;
const VEHICLE_TYPE = process.env.VEHICLE_TYPE || 'SEDAN';

// Driver App kết nối thẳng tới driver-service (port 3004) qua Socket.IO
const DRIVER_SERVICE_URL = process.env.DRIVER_URL || 'http://localhost:3004';
const RIDE_SERVICE_URL = process.env.RIDE_URL || 'http://localhost:3007';
const REPORT_INTERVAL_MS = 2000;  // 2s reporting when idle
const MOVE_INTERVAL_MS = 500;    // 0.5s reporting when moving

// Trạng thái hiện tại
let currentLocation = { lat: DEFAULT_LAT, lng: DEFAULT_LNG };
let currentRide = null;
let socket = null;
let isMoving = false;

/**
 * Kết nối Socket.IO tới Driver Service
 */
function connect() {
    console.log(`\n🚀 [SIMULATOR] Kết nối tới Driver Service: ${DRIVER_SERVICE_URL}`);

    socket = io(DRIVER_SERVICE_URL, {
        path: '/ws',
        query: { token: DRIVER_ID, driverId: DRIVER_ID },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 5000,
    });

    socket.on('connect', () => {
        console.log('✅ [SIMULATOR] Đã kết nối Socket.IO! ID:', socket.id);

        // Chuyển trạng thái sang ONLINE
        sendMessage('driver:status_change', { status: 'AVAILABLE', driverId: DRIVER_ID });
        console.log(`📡 [SIMULATOR] Tài xế ${DRIVER_ID} đang ONLINE tại (${currentLocation.lat}, ${currentLocation.lng})`);
        console.log(`💡 Mẹo: Hãy chọn điểm đón trên App trong vòng 5km quanh vị trí này để tìm thấy xe.`);

        // Bắt đầu báo vị trí định kỳ
        startReporting();
    });

    socket.on('ride:new_request', async (payload) => {
        console.log(`📩 [SIMULATOR] Nhận sự kiện: ride:new_request`);
        handleRideRequest(payload);
    });

    socket.on('ride:cancelled', (payload) => {
        console.warn(`🛑 [SIMULATOR] Chuyến đi ${payload.rideId} đã bị hủy!`);
        resetSimulator();
    });

    socket.on('connection:ack', (data) => {
        console.log(`[SIMULATOR] ACK: ${JSON.stringify(data)}`);
    });

    socket.on('connect_error', (err) => {
        console.error('❌ [SIMULATOR] Lỗi Socket.IO:', err.message);
    });

    socket.on('disconnect', (reason) => {
        console.warn('⚠️ [SIMULATOR] Mất kết nối Socket.IO:', reason);
    });
}

// Map để lưu các timers để có thể clear khi cần
const timers = {
    request: null,
};

/**
 * Xử lý khi có yêu cầu đặt xe mới
 */
async function handleRideRequest(payload) {
    const { rideId, userId, pickup, drop } = payload; // Added: Extract userId

    // Chỉ nhận chuyến nếu đang rảnh
    if (currentRide || isMoving) {
        console.log(`⚠️ [SIMULATOR] Đã có chuyến ${currentRide?.rideId}, bỏ qua yêu cầu mới: ${rideId}`);
        return;
    }

    currentRide = payload;

    console.log(`\n🔔 [SIMULATOR] CÓ CHUYẾN MỚI! ID: ${rideId} (Khách: ${userId})`);
    console.log(`📍 Đón tại: ${pickup.address || pickup.lat + ',' + pickup.lng}`);
    console.log(`📍 Trả tại: ${drop.address || drop.lat + ',' + drop.lng}`);

    // Đợi 2.5s giả vờ suy nghĩ rồi nhận chuyến (Thêm 0.5s để Ride Service kịp lưu DB)
    if (timers.request) clearTimeout(timers.request);
    timers.request = setTimeout(() => {
        console.log(`✍️ [SIMULATOR] Chấp nhận chuyến ${rideId} (Khách: ${userId})...`);

        // Gửi lệnh ACCEPTED tới Driver Service qua WebSocket
        sendMessage('driver:ride_response', {
            rideId,
            action: 'ACCEPTED',
            userId
        });

        // Bắt đầu di chuyển tới điểm đón
        const lockedRideId = rideId;
        simulateMovement(pickup, () => {
            console.log(`\n🏁 [SIMULATOR] Đã đến điểm đón cho chuyến: ${lockedRideId}!`);
            announceArrival(lockedRideId, () => {
                // Đợi 2s khách lên xe rồi bắt đầu trip
                setTimeout(() => startRide(lockedRideId, drop), 2000);
            });
        });
    }, 2500);
}

/**
 * Gọi API báo đã đến điểm đón (Arrived)
 */
async function announceArrival(rideId, callback) {
    try {
        console.log(`📤 [SIMULATOR] Đang báo 'Đã đến nơi'...`);
        await axios.post(`${RIDE_SERVICE_URL}/${rideId}/arrive`, {}, {
            headers: { 'x-user-id': DRIVER_ID }
        });
        console.log('✅ [SIMULATOR] Đã báo trạng thái ARRIVED');
        if (callback) callback();
    } catch (err) {
        console.error('❌ [SIMULATOR] Lỗi báo Arrived:', err.response?.data || err.message);
        if (callback) callback(); // Proceed anyway
    }
}

/**
 * Gọi API bắt đầu chuyến đi
 */
async function startRide(rideId, dropLocation, retryCount = 0) {
    try {
        console.log(`📤 [SIMULATOR] Đang gọi API Start Ride (lần ${retryCount + 1})...`);
        await axios.post(`${RIDE_SERVICE_URL}/${rideId}/start`, {}, {
            headers: { 'x-user-id': DRIVER_ID }
        });
        console.log('✅ [SIMULATOR] Chuyến đi chính thức BẮT ĐẦU!');

        // Di chuyển tới điểm trả
        simulateMovement(dropLocation, () => {
            console.log('\n🏁 [SIMULATOR] Đã đến điểm trả!');
            completeRide(rideId);
        });
    } catch (err) {
        console.error('❌ [SIMULATOR] Lỗi gọi API Start:', err.response?.data || err.message);

        if (retryCount < 3) {
            console.log('🔄 [SIMULATOR] Thử lại sau 2s...');
            setTimeout(() => startRide(rideId, dropLocation, retryCount + 1), 2000);
        } else {
            console.error('🛑 [SIMULATOR] Đã thử lại quá nhiều lần. Hủy giả lập cho chuyến này.');
            resetSimulator();
        }
    }
}

/**
 * Gọi API hoàn thành chuyến đi
 */
async function completeRide(rideId) {
    try {
        console.log('📤 [SIMULATOR] Đang gọi API Complete Ride...');
        await axios.post(`${RIDE_SERVICE_URL}/${rideId}/complete`, {
            distanceMeters: 2500,
            durationSeconds: 600
        }, {
            headers: { 'x-user-id': DRIVER_ID }
        });
        console.log('🏆 [SIMULATOR] CHUYẾN ĐI HOÀN TẤT! 🎉');
        resetSimulator();
    } catch (err) {
        console.error('❌ [SIMULATOR] Lỗi gọi API Complete:', err.response?.data || err.message);
    }
}

const OSRM_URL = 'http://router.project-osrm.org/base/v1/driving';
const SPEED_KMH = 40; // Tốc độ di chuyển giả lập (km/h)
const SPEED_MULTIPLIER = 3; // Gấp 3 lần để test nhanh đỡ phải chờ

/**
 * Tính khoảng cách giữa 2 điểm GPS (mét) - Công thức Haversine
 */
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
        Math.cos(p1) * Math.cos(p2) *
        Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Lấy lộ trình thực tế từ OSRM
 */
async function getOSRMRoute(start, end) {
    try {
        const url = `http://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
        const res = await axios.get(url);
        if (res.data.routes && res.data.routes.length > 0) {
            const coords = res.data.routes[0].geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
            console.log(`[OSRM] Đã lấy lộ trình: ${coords.length} điểm, ${(res.data.routes[0].distance / 1000).toFixed(2)} km`);
            return coords;
        }
        return [start, end];
    } catch (err) {
        console.error('❌ [OSRM] Lỗi lấy lộ trình:', err.message);
        return [start, end]; // Fallback to direct line if OSRM fails
    }
}

/**
 * Giả lập di chuyển mượt mà bám theo đường (Distance-based)
 */
async function simulateMovement(target, onArrived) {
    if (isMoving) return;
    isMoving = true;

    const startPoint = { ...currentLocation };
    const route = await getOSRMRoute(startPoint, target);

    // Tính tổng quãng đường và mảng khoảng cách tích lũy
    let totalRouteDistance = 0;
    const segments = []; // { start, end, dist, cumulativeDist }

    for (let i = 0; i < route.length - 1; i++) {
        const d = getDistance(route[i].lat, route[i].lng, route[i + 1].lat, route[i + 1].lng);
        segments.push({
            start: route[i],
            end: route[i + 1],
            dist: d,
            cumulative: totalRouteDistance
        });
        totalRouteDistance += d;
    }

    const speedMPS = (SPEED_KMH * 1000 / 3600) * SPEED_MULTIPLIER;
    const reportIntervalSeconds = MOVE_INTERVAL_MS / 1000;
    const stepDistance = speedMPS * reportIntervalSeconds;

    let traveledDistance = 0;
    console.log(`\n🚗 [SIMULATOR] Bắt đầu di chuyển bám đường (${(totalRouteDistance / 1000).toFixed(2)} km, v=${SPEED_KMH * SPEED_MULTIPLIER} km/h)`);

    const moveInterval = setInterval(() => {
        traveledDistance += stepDistance;

        if (traveledDistance >= totalRouteDistance) {
            currentLocation = { ...target };
            traveledDistance = totalRouteDistance;
        } else {
            // Tìm segment hiện tại
            const segment = segments.find(s => traveledDistance >= s.cumulative && traveledDistance <= (s.cumulative + s.dist))
                || segments[segments.length - 1];

            const distInSegment = traveledDistance - segment.cumulative;
            const ratio = distInSegment / segment.dist;

            // Nội suy trong segment
            currentLocation.lat = segment.start.lat + (segment.end.lat - segment.start.lat) * ratio;
            currentLocation.lng = segment.start.lng + (segment.end.lng - segment.start.lng) * ratio;
        }

        // Báo cáo vị trí
        sendMessage('driver:location_update', {
            rideId: currentRide?.rideId,
            lat: currentLocation.lat,
            lng: currentLocation.lng,
            heading: 0,
            speed: SPEED_KMH * SPEED_MULTIPLIER,
            vehicleType: VEHICLE_TYPE
        });

        const percent = Math.min(100, Math.round((traveledDistance / totalRouteDistance) * 100));
        process.stdout.write(`\r🚗 [SIMULATOR] Đã đi: ${percent}% (${(traveledDistance / 1000).toFixed(2)}/${(totalRouteDistance / 1000).toFixed(2)} km)`);

        if (traveledDistance >= totalRouteDistance) {
            clearInterval(moveInterval);
            process.stdout.write('\n');
            isMoving = false;
            onArrived();
        }
    }, MOVE_INTERVAL_MS);
}

/**
 * Báo vị trí định kỳ (Keep-alive trong Database)
 */
function startReporting() {
    setInterval(() => {
        if (!isMoving) { // Nếu không đang trong chuyến thì báo vị trí tĩnh
            sendMessage('driver:location_update', {
                lat: currentLocation.lat,
                lng: currentLocation.lng,
                vehicleType: VEHICLE_TYPE
            });
        }
    }, REPORT_INTERVAL_MS);
}

function sendMessage(event, payload) {
    if (socket && socket.connected) {
        socket.emit(event, payload);
    } else {
        console.warn(`[SIMULATOR] Socket not connected, cannot send: ${event}`);
    }
}

function resetSimulator() {
    if (timers.request) clearTimeout(timers.request);
    currentRide = null;
    isMoving = false;
    // Chỉnh trạng thái về Available sau khi xong chuyến
    sendMessage('driver:status_change', { status: 'AVAILABLE' });
    console.log('\n😴 [SIMULATOR] Đang chờ chuyến đi tiếp theo...');
}

// KHỞI CHẠY
connect();
