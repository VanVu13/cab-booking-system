# Hướng dẫn Test API (API Testing Guide)

Tài liệu này cung cấp các payload mẫu và cách test input cho các chức năng của các service trong hệ thống Cab Booking (cụ thể là **Booking Service** và **Auth Service**). 

Bạn có thể sử dụng các công cụ như **Postman**, **Insomnia**, hoặc **cURL** để thực hiện các request này.

---

## 1. Booking Service (Dịch vụ Đặt xe)

Các API của Booking Service thường yêu cầu header `x-user-id` (Id của user đang thực hiện request) vì API Gateway sẽ pass thông tin này xuống sau khi verify token.
*(Lưu ý: Thay đổi port `3000` hoặc port tương ứng của Booking Service nếu bạn chạy trực tiếp không qua Gateway)*

### 1.1 Tạo Booking Mới (Create Booking)
- **Method:** `POST`
- **Endpoint:** `/bookings`
- **Headers:** 
  - `Content-Type: application/json`
  - `x-user-id: <user_id_cua_ban>`
- **Body (Valid - Hợp lệ):**
```json
{
    "pickup": {
        "lat": 10.762622,
        "lng": 106.660172,
        "address": "Đại học Khoa học Tự nhiên"
    },
    "drop": {
        "lat": 10.776889,
        "lng": 106.700806,
        "address": "Chợ Bến Thành"
    },
    "vehicleType": "SEDAN", 
    "paymentMethod": "CASH"
}
```
*Ghi chú input (vehicleType chỉ chấp nhận: `SEDAN`, `SUV`, `BIKE`).*

- **Body (Invalid - Gây lỗi thiếu lat/lng):**
```json
{
    "pickup": {
        "address": "Đại học Khoa học Tự nhiên"
    },
    "drop": {
        "lat": 10.776889,
        "lng": 106.700806
    }
}
```

### 1.2 Lấy danh sách Bookings của User
- **Method:** `GET`
- **Endpoint:** `/bookings`
- **Headers:** 
  - `x-user-id: <user_id_cua_ban>`
- *Hành vi: Trả về danh sách (tối đa 50) các chuyến đi được sắp xếp theo thời gian mới nhất.*

### 1.3 Xem chi tiết Booking (Get Booking By ID)
- **Method:** `GET`
- **Endpoint:** `/bookings/:id` (Thay `:id` bằng bookingId thực tế)
- **Headers:** 
  - `x-user-id: <user_id_cua_ban_hoac_driver_id>`
- *Hành vi: Chỉ chủ sở hữu (userId), tài xế được gán (driverId/provisionalDriverId) hoặc `SYSTEM_TRACKING` mới được xem.*

### 1.4 Hủy chuyến (Cancel Booking)
- **Method:** `DELETE`
- **Endpoint:** `/bookings/:id`
- **Headers:** 
  - `x-user-id: <user_id_cua_ban>`
- *Hành vi: Chi cho phép hủy nếu booking đang ở trạng thái: `SEARCHING_DRIVER`, `PROPOSED`, hoặc `DRIVER_ASSIGNED`.*

---

## 2. Auth Service (Dịch vụ Xác thực)

*(Lưu ý: Thay thế port bằng port của Auth Service đang chạy, ví dụ `3001`).*

### 2.1 Đăng ký Hành khách (Register Passenger)
- **Method:** `POST`
- **Endpoint:** `/auth/register`
- **Body (JSON):**
```json
{
    "email": "customer1@example.com",
    "password": "Password123!",
    "role": "PASSENGER",
    "name": "Nguyen Van A"
}
```

### 2.2 Đăng ký Tài xế (Register Driver)
- **Method:** `POST`
- **Endpoint:** `/auth/register`
- **Body (JSON):**
```json
{
    "email": "driver1@example.com",
    "password": "Password123!",
    "role": "DRIVER",
    "name": "Tran Van B",
    "phone": "0901234567",
    "licenseNumber": "B2-123456",
    "vehicleType": "SEDAN",
    "vehiclePlate": "51G-123.45",
    "vehicleModel": "Toyota Vios",
    "vehicleColor": "Trắng"
}
```
*Ghi chú: Đăng ký Driver sẽ bắt buộc cần thêm các trường `phone`, `licenseNumber`, `vehicle...`. Trạng thái khi tạo xong sẽ là `PENDING_APPROVAL`.*

### 2.3 Đăng nhập (Login)
- **Method:** `POST`
- **Endpoint:** `/auth/login`
- **Body (JSON):**
```json
{
    "email": "customer1@example.com",
    "password": "Password123!"
}
```
*Ghi chú: Sẽ trả về `accessToken` và `refreshToken`. Nếu tài khoản Driver chưa được duyệt (status `PENDING_APPROVAL`), server sẽ trả về mã lỗi 403.*

### 2.4 Refresh Token
- **Method:** `POST`
- **Endpoint:** `/auth/refresh`
- **Body (JSON):**
```json
{
    "refreshToken": "<nhập_refresh_token_tu_api_login>"
}
```

### 2.5 Đăng xuất (Logout)
- **Method:** `POST`
- **Endpoint:** `/auth/logout`
- **Body (JSON):**
```json
{
    "refreshToken": "<nhập_refresh_token_tu_api_login>"
}
```

---

## 3. Admin Endpoints (Thuộc Auth Service)

Các API này dành cho Admin để kiểm soát hệ thống.

### 3.1 Xem danh sách Tài xế (List Drivers)
- **Method:** `GET`
- **Endpoint:** `/auth/admin/drivers?status=PENDING_APPROVAL&page=1&limit=20`
- **Query Parameters:**
  - `status`: Lọc theo trạng thái (`ACTIVE`, `BLOCKED`, `PENDING_APPROVAL`, `REJECTED`, `SUSPENDED`).
  - `page`: Trang (mặc định 1).
  - `limit`: Số items/trang (mặc định 20).

### 3.2 Cập nhật Trạng thái Tài xế (Update Driver Status)
- **Method:** `PATCH`
- **Endpoint:** `/auth/admin/drivers/:id/status` (Thay `:id` bằng id của Tài xế)
- **Body (JSON):**
```json
{
    "status": "ACTIVE",
    "reason": "Đã kiểm tra chứng minh và bằng lái hợp lệ."
}
```
*Ghi chú: Các trạng thái hợp lệ gồm `ACTIVE`, `BLOCKED`, `REJECTED`, `SUSPENDED`.*
