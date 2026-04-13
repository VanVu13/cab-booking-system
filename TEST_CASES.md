# 🎯 MỤC TIÊU: TEST CASES CAB BOOKING SYSTEM

Hệ thống được thiết kế dựa trên microservices (Auth, Booking, Driver, Pricing, ETA) thông qua API Gateway tại port 3000. Dưới đây là 20 test cases đầy đủ tương ứng với các level yêu cầu. Tất cả params sử dụng Host: `http://localhost:3000`.

---

## 🔥 LEVEL 1 – BASIC FLOW (Test 1 → 10)

### 🔹 Test Case 1: Register thành công
* Context: Đăng ký một tài khoản customer mới.
* Endpoint: `/auth/register`
* Method: `POST`
* Headers: `Content-Type: application/json`

**📥 Input (Request)**
```json
{
  "email": "customer1@test.com",
  "password": "password123",
  "role": "PASSENGER"
}
```

**📤 Expected Output (Response)**
* Status code: `201 Created`
* JSON response:
```json
{
  "userId": "uuid-here",
  "role": "PASSENGER",
  "status": "ACTIVE",
  "message": "User registered successfully. Please login to continue."
}
```

---

### 🔹 Test Case 2: Login trả JWT hợp lệ
* Context: Đăng nhập với tài khoản vừa tạo để lấy Token.
* Endpoint: `/auth/login`
* Method: `POST`
* Headers: `Content-Type: application/json`

**📥 Input (Request)**
```json
{
  "email": "customer1@test.com",
  "password": "password123"
}
```

**📤 Expected Output (Response)**
* Status code: `200 OK`
* JSON response:
```json
{
  "user": {
    "id": "uuid-here",
    "email": "customer1@test.com",
    "name": null,
    "role": "PASSENGER"
  },
  "accessToken": "eyJhb...",
  "refreshToken": "eyJ..."
}
```
*(Token decode ra sẽ có chứa `sub: user_id` và `exp`)*

---

### 🔹 Test Case 3: Create Booking hợp lệ
* Context: Book cuốc xe hợp lệ, có sinh ra price và ETA.
* Endpoint: `/bookings`
* Method: `POST`
* Headers: `Content-Type: application/json`, `Authorization: Bearer {{Token}}`

**📥 Input (Request)**
```json
{
  "pickup": { "lat": 10.762622, "lng": 106.660172 },
  "drop": { "lat": 10.776889, "lng": 106.700806 },
  "vehicleType": "SEDAN",
  "paymentMethod": "CASH"
}
```

**📤 Expected Output (Response)**
* Status code: `201 Created`
* JSON response:
```json
{
  "bookingId": "uuid-here",
  "rideId": "uuid-here",
  "status": "SEARCHING_DRIVER",
  "pickup": { "lat": 10.762622, "lng": 106.660172 },
  "drop": { "lat": 10.776889, "lng": 106.700806 },
  "vehicleType": "SEDAN",
  "paymentMethod": "CASH",
  "estimatedPrice": 85000,
  "currency": "VND",
  "pickupEtaSeconds": 300,
  "tripEtaSeconds": 1500
}
```

---

### 🔹 Test Case 4: Get Bookings
* Context: Lấy danh sách chuyến đi của người dùng.
* Endpoint: `/bookings`
* Method: `GET`
* Headers: `Authorization: Bearer {{Token}}`

**📥 Input (Request)**
(Không có body)

**📤 Expected Output (Response)**
* Status code: `200 OK`
* JSON response:
```json
{
  "bookings": [
    {
      "bookingId": "uuid-here",
      "status": "SEARCHING_DRIVER",
      "pickup": { "lat": 10.762622, "lng": 106.660172 },
      "drop": { "lat": 10.776889, "lng": 106.700806 },
      "vehicleType": "SEDAN",
      "paymentMethod": "CASH",
      "estimatedPrice": 85000,
      "driverId": null,
      "createdAt": "2024-03-31T09:00:00Z"
    }
  ]
}
```

---

### 🔹 Test Case 5: Driver ONLINE
* Context: Bật trạng thái Online cho Tài xế để đón khách.
* Endpoint: `/drivers/status`
* Method: `PATCH`
* Headers: `Content-Type: application/json`, `Authorization: Bearer {{Driver_Token}}`

**📥 Input (Request)**
```json
{
  "status": "ONLINE"
}
```

**📤 Expected Output (Response)**
* Status code: `200 OK`
* JSON response:
```json
{
  "status": "status_updated",
  "isOnline": true
}
```

---

### 🔹 Test Case 6: Status ban đầu = REQUESTED (SEARCHING_DRIVER)
* Context: Cập nhật gọi Get Booking ID để đảm bảo status ban đầu không bị skip ngang.
* Endpoint: `/bookings/{{bookingId}}`
* Method: `GET`
* Headers: `Authorization: Bearer {{Token}}`

**📥 Input (Request)**
(Không có body)

**📤 Expected Output (Response)**
* Status code: `200 OK`
* JSON response:
```json
{
  "bookingId": "uuid-here",
  "rideId": "uuid-here",
  "status": "SEARCHING_DRIVER",
  ...
  "createdAt": "2024-03-31T09:00:00Z"
}
```

---

### 🔹 Test Case 7: ETA > 0
* Context: Kiểm tra Estimated Time of Arrival được build tự động hợp lý.
* Endpoint: Nhìn từ output GET /bookings/:id. Đã có pickupEtaSeconds > 0 và tripEtaSeconds.
* Expected: Status 200, `pickupEtaSeconds` > 0.
*(Kết hợp trong Test 3 hoặc Test 6)*

---

### 🔹 Test Case 8: Pricing hợp lệ
* Context: Kiểm tra giá tiền và Surge được tính chuẩn >1.
* Endpoint: Từ output Booking Create
* Expected: `estimatedPrice` > 0 và `surgeMultiplier` >= 1.0.

---

### 🔹 Test Case 9: Notification
* Context: Event đã được publish tới hệ thống queue để gửi Notice (publishRideCreated chạy background không ảnh hưởng performance response) -> Server không crash.
* Expected: HTTP 201 Created (Đã test thành công từ Test case 3).

---

### 🔹 Test Case 10: Logout
* Context: Customer huỷ active session để chống token attack.
* Endpoint: `/auth/logout`
* Method: `POST`
* Headers: `Content-Type: application/json`, `Authorization: Bearer {{Token}}`

**📥 Input (Request)**
```json
{
  "refreshToken": "{{RefreshToken}}"
}
```

**📤 Expected Output (Response)**
* Status code: `200 OK`
* JSON response:
```json
{
  "message": "Logged out successfully"
}
```

---

## 🔥 LEVEL 2 – VALIDATION & EDGE CASES (Test 11 → 20)

### 🔹 Test Case 11: Thiếu pickup → 400
* Context: Fake gửi thiếu object toạ độ Pickup.
* Endpoint: `/bookings`
* Method: `POST`
* Headers: `Content-Type: application/json`, `Authorization: Bearer {{Token}}`

**📥 Input (Request)**
```json
{
  "drop": { "lat": 10.776889, "lng": 106.700806 },
  "vehicleType": "SEDAN"
}
```

**📤 Expected Output (Response)**
* Status code: `400 Bad Request`
* JSON response:
```json
{
  "error": "Missing required fields: pickup, drop"
}
```

---

### 🔹 Test Case 12: Sai kiểu lat/lng → 422
* Context: Truyền String vào số toạ độ.
* Endpoint: `/bookings`
* Method: `POST`
* Headers: `Content-Type: application/json`, `Authorization: Bearer {{Token}}`

**📥 Input (Request)**
```json
{
  "pickup": { "lat": "abc", "lng": 106.660172 },
  "drop": { "lat": 10.776889, "lng": 106.700806 }
}
```

**📤 Expected Output (Response)**
* Status code: `422 Unprocessable Entity`
* JSON response:
```json
{
  "error": "Invalid data type: lat and lng must be valid finite numbers"
}
```

---

### 🔹 Test Case 13: Driver offline
* Context: Gửi request cập nhật qua OFFLINE -> hệ thống không tiếp nhận cuốc.
* Endpoint: `/drivers/status`
* Method: `PATCH`
* Headers: `Content-Type: application/json`, `Authorization: Bearer {{Driver_Token}}`

**📥 Input (Request)**
```json
{
  "status": "OFFLINE"
}
```

**📤 Expected Output (Response)**
* Status code: `200 OK`
* JSON response:
```json
{
  "status": "status_updated",
  "isOnline": false
}
```

---

### 🔹 Test Case 14: Payment invalid
* Context: Gửi phương thức thanh toán sai -> Trả lỗi. Hệ thống validate paymentMethod (CASH, CARD, WALLET).
* Endpoint: `/bookings`
* Method: `POST`
* Headers: `Content-Type: application/json`, `Authorization: Bearer {{Token}}`

**📥 Input (Request)**
```json
{
  "pickup": { "lat": 10.762622, "lng": 106.660172 },
  "drop": { "lat": 10.776889, "lng": 106.700806 },
  "paymentMethod": "CRYPTO"
}
```

**📤 Expected Output (Response)**
* Status code: `400 Bad Request`
* JSON response:
```json
{
  "error": "Invalid paymentMethod. Must be one of: CASH, CARD, WALLET"
}
```

---

### 🔹 Test Case 15: distance = 0
* Context: Đặt chuyến tại cùng 1 vị trí -> Server xử lý eta = 0.
* Endpoint: `/bookings`
* Method: `POST`
* Headers: `Content-Type: application/json`, `Authorization: Bearer {{Token}}`

**📥 Input (Request)**
```json
{
  "pickup": { "lat": 10.762622, "lng": 106.660172 },
  "drop": { "lat": 10.762622, "lng": 106.660172 }
}
```

**📤 Expected Output (Response)**
* Status code: `201 Created`
* JSON response: (Không bị crash, giá rẻ hoặc surge default)

---

### 🔹 Test Case 16: demand_index = 0
* Context: Tính surge multiplier trong trường hợp demand index ko có -> surge >= 1.0 (Không chia cho 0).
* API Booking trả về thành công có `surgeMultiplier`.

---

### 🔹 Test Case 17: Fraud thiếu field
* Context: Request spam API với payload rác.
* Endpoint: `/bookings`
* Method: `POST`
* Body: `{ "data": "spam" }`
* Expected: `400 Bad Request`.

---

### 🔹 Test Case 18: Token hết hạn
* Context: Giả lập gọi API tạo cuốc với Token hết hạn, Invalid JWT signature.
* Endpoint: `/bookings`
* Method: `POST`
* Headers: `Authorization: Bearer JWT_INVALID_EXPIRED`

**📥 Input (Request)**
(Gửi body booking bình thường)

**📤 Expected Output (Response)**
* Status code: `401 Unauthorized` hoặc `403` do API gateway chặn ở auth middleware.

---

### 🔹 Test Case 19: Duplicate booking (Idempotency)
* Context: Request trùng lặp do timeout từ client.
* Endpoint: `/bookings`
* Method: `POST`
* Headers: `Content-Type: application/json`, `Authorization: Bearer {{Token}}`, `idempotency-key: 1234abcd-idem-potency`

**📥 Input (Request)**
Gửi nguyên Request này 2 lần. Lần đầu tạo Data. Lần thứ 2 phát hiện Cache.

**📤 Expected Output (Response lần 2)**
* Status code: `200 OK`
* JSON response:
```json
{
  "bookingId": "uuid-here",
  "status": "SEARCHING_DRIVER",
  "alreadyProcessed": true,
  ...
}
```

---

### 🔹 Test Case 20: Payload quá lớn (413)
* Context: Inject dữ liệu json text rất dài nhằm DDOS Server API.
* Endpoint: `/bookings`
* Method: `POST`
* Headers: `Content-Type: application/json`

**📥 Input (Request)**
```json
{
  "pickup": { "lat": 10.762622, "lng": 106.660172 },
  "drop": { "lat": 10.776889, "lng": 106.700806 },
  "notes": "........(hàng triệu kí tự > 100KB)"
}
```

**📤 Expected Output (Response)**
* Status code: `413 Payload Too Large`
* JSON response:
```json
{
  "error": "Payload too large"
}
```
