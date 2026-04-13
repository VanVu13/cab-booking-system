/**
 * k6 Load Test for Cab Booking System
 * Tests booking creation endpoint under load
 * 
 * Run: k6 run --env TOKEN=<jwt_token> scripts/k6-booking-load.js
 * Or:  k6 run --env TOKEN=<jwt_token> --env BASE_URL=http://localhost:3000 scripts/k6-booking-load.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const bookingCreated = new Counter('bookings_created');
const bookingFailed = new Counter('bookings_failed');
const bookingErrorRate = new Rate('booking_error_rate');
const bookingDuration = new Trend('booking_duration', true);

export const options = {
    scenarios: {
        // Scenario 1: Ramp up to 1000 RPS
        booking_load: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '10s', target: 20 },
                { duration: '20s', target: 50 },
                { duration: '20s', target: 100 },
                { duration: '10s', target: 0 },
            ],
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<300'],    // P95 latency < 300ms
        http_req_failed: ['rate<0.01'],      // Error rate < 1%
        booking_error_rate: ['rate<0.05'],   // Business error < 5%
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.TOKEN || '';

export default function () {
    // Random coordinates around HCM City
    const pickup = {
        lat: 10.762 + Math.random() * 0.02 - 0.01,
        lng: 106.660 + Math.random() * 0.02 - 0.01,
        address: `Test Pickup ${__VU}-${__ITER}`
    };
    const drop = {
        lat: 10.780 + Math.random() * 0.02 - 0.01,
        lng: 106.695 + Math.random() * 0.02 - 0.01,
        address: `Test Drop ${__VU}-${__ITER}`
    };

    const vehicleTypes = ['SEDAN', 'SUV', 'BIKE'];
    const paymentMethods = ['CASH', 'CARD', 'WALLET'];

    const payload = JSON.stringify({
        pickup,
        drop,
        vehicleType: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)],
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        distance_km: 2 + Math.random() * 10
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN}`,
            'Idempotency-Key': `k6-${__VU}-${__ITER}-${Date.now()}`
        }
    };

    const startTime = new Date();
    const res = http.post(`${BASE_URL}/bookings`, payload, params);
    const duration = new Date() - startTime;

    bookingDuration.add(duration);

    const success = check(res, {
        'status is 201': (r) => r.status === 201,
        'has bookingId': (r) => {
            try { return JSON.parse(r.body).bookingId !== undefined; } catch { return false; }
        },
        'latency < 300ms': (r) => r.timings.duration < 300,
    });

    if (success) {
        bookingCreated.add(1);
        bookingErrorRate.add(0);
    } else {
        bookingFailed.add(1);
        bookingErrorRate.add(1);
    }

    sleep(0.1); // 100ms between requests per VU
}

export function handleSummary(data) {
    const summary = {
        timestamp: new Date().toISOString(),
        totalRequests: data.metrics.http_reqs?.values?.count || 0,
        p95Latency: data.metrics.http_req_duration?.values?.['p(95)'] || 0,
        p99Latency: data.metrics.http_req_duration?.values?.['p(99)'] || 0,
        avgLatency: data.metrics.http_req_duration?.values?.avg || 0,
        errorRate: data.metrics.http_req_failed?.values?.rate || 0,
        bookingsCreated: data.metrics.bookings_created?.values?.count || 0,
        bookingsFailed: data.metrics.bookings_failed?.values?.count || 0,
    };

    console.log('\n========== BOOKING LOAD TEST SUMMARY ==========');
    console.log(JSON.stringify(summary, null, 2));
    console.log('================================================\n');

    return {
        stdout: JSON.stringify(summary, null, 2),
    };
}
