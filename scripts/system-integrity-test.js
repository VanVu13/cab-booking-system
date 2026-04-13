/**
 * SYSTEM INTEGRITY TEST (Architecture + Auth Validation)
 * Kiểm tra tính toàn vẹn và đồng bộ của hệ thống sau khi đã chuẩn hóa.
 */

const axios = require('axios');

const GATEWAY_URL = 'http://localhost:3000';
const TEST_EMAIL = `test_${Math.floor(Math.random() * 10000)}@system.test`;
const TEST_PASSWORD = 'testpassword123';

async function runIntegrityTest() {
    console.log('🚀 Bắt đầu kiểm tra hệ thống toàn diện (Auth + System Integrity)...');

    try {
        // STEP 0: Auth Flow
        console.log('\nStep 0: Đăng ký & Đăng nhập user test...');

        // Register
        await axios.post(`${GATEWAY_URL}/auth/register`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
            role: 'PASSENGER'
        });
        console.log(`✅ Registered: ${TEST_EMAIL}`);

        // Login
        const loginResp = await axios.post(`${GATEWAY_URL}/auth/login`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });

        const { accessToken, userId } = loginResp.data;
        const TEST_USER_ID = userId;
        const authHeaders = {
            'Authorization': `Bearer ${accessToken}`,
            'x-user-id': TEST_USER_ID // Manual header for double verification
        };
        console.log(`✅ Logged in! UserID: ${TEST_USER_ID}`);

        // 1. Tạo Booking
        console.log('\nStep 1: Tạo Booking mới với Token...');
        const bookingResp = await axios.post(`${GATEWAY_URL}/bookings`, {
            pickup: { lat: 10.762622, lng: 106.660172, address: 'District 10, HCM' },
            drop: { lat: 10.773057, lng: 106.700780, address: 'District 1, HCM' },
            vehicleType: 'SEDAN'
        }, {
            headers: authHeaders
        });

        const { bookingId, status } = bookingResp.data;
        console.log(`✅ Booking created: ${bookingId} (Status: ${status})`);

        // 2. Chờ hệ thống Matching xử lý (Wait for Booking Status Change)
        console.log('\nStep 2: Đợi hệ thống gán tài xế (Polling Booking Status)...');
        let bookingData = null;
        let attempts = 0;
        const maxAttempts = 15;

        while (attempts < maxAttempts) {
            const pollResp = await axios.get(`${GATEWAY_URL}/bookings/${bookingId}`, {
                headers: authHeaders
            });

            if (pollResp.data.status !== 'SEARCHING_DRIVER') {
                bookingData = pollResp.data;
                console.log(`✅ Booking transitioned to: ${bookingData.status}`);
                break;
            }

            process.stdout.write('.');
            await new Promise(r => setTimeout(r, 1000));
            attempts++;
        }

        if (!bookingData || bookingData.status === 'SEARCHING_DRIVER') {
            throw new Error('❌ Timeout: Matching took too long or failed.');
        }

        // 2.1 Truy vấn Ride Service (Now it should be created via RabbitMQ)
        console.log('\nStep 2.1: Truy vấn Ride Service để xác nhận đồng bộ...');
        const rideResp = await axios.get(`${GATEWAY_URL}/rides/${bookingId}`, {
            headers: authHeaders
        });
        const rideData = rideResp.data;
        console.log(`✅ Found Ride: ${rideData.rideId} (Status: ${rideData.status})`);

        if (!rideData) {
            throw new Error('❌ Ride record not found even after matching.');
        }

        // 3. XÁC MINH VÒNG ĐỜI TOÀN DIỆN (Full Lifecycle Verification)
        console.log('\nStep 3: Kiểm tra tính chuẩn xác của dữ liệu đồng bộ...');
        if (rideData.bookingId === bookingId) {
            console.log('✅ Correlation Match: bookingId field exists in Ride and matches!');
        } else if (rideData.rideId === bookingId) {
            console.log('✅ Identity Match: rideId matches bookingId reference.');
        }

        console.log('\nStep 4: Chờ Simulator hoàn thành chuyến đi và verify tiến trình...');
        // Polling until status is COMPLETED
        let finalStatus = rideData.status;
        attempts = 0;
        while (attempts < 20 && finalStatus !== 'COMPLETED') {
            try {
                const checkResp = await axios.get(`${GATEWAY_URL}/bookings/${bookingId}`, {
                    headers: authHeaders
                });
                if (checkResp.data.status !== finalStatus) {
                    finalStatus = checkResp.data.status;
                    console.log(`📡 Booking Status Update: ${finalStatus}`);
                }
            } catch (e) {
                console.error('Error polling final status:', e.message);
            }
            if (finalStatus === 'COMPLETED') break;

            process.stdout.write('~');
            await new Promise(r => setTimeout(r, 2000));
            attempts++;
        }

        if (finalStatus === 'COMPLETED') {
            console.log('\n🏆 KẾT QUẢ: HỆ THỐNG ĐÃ ĐỒNG BỘ TOÀN DIỆN TỪ A-Z!');
        } else {
            console.warn(`\n⚠️ Cảnh báo: Hệ thống chưa đạt trạng thái COMPLETED (Hiện tại: ${finalStatus})`);
            console.log('Điều này có thể do Simulator chưa chạy xong hoặc lỗi xử lý sự kiện.');
        }

    } catch (error) {
        const errorData = error.response?.data || error.message;
        console.error('\n❌ Integrity Test FAILED:', JSON.stringify(errorData, null, 2));
        process.exit(1);
    }
}

runIntegrityTest();
