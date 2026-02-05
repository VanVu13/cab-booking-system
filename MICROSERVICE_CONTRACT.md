## Hợp đồng hệ thống micro-service

Tài liệu này mô tả **hợp đồng (contract)** giữa các micro-service trong hệ thống đặt xe, bao gồm:
- **Biên giới trách nhiệm từng service**
- **Loại database sử dụng**
- **API chính (REST)**
- **Sự kiện & message qua RabbitMQ**

> Lưu ý: Đây là tài liệu contract ở mức logic. Tên field/endpoint có thể được tinh chỉnh khi triển khai thực tế, nhưng **hình dạng dữ liệu và luồng giao tiếp nên được tuân thủ**.

---

## Tổng quan kiến trúc

- **Client**: Mobile/Web App
- **API Gateway / BFF (tuỳ chọn)**: Điều phối request tới các service bên dưới.
- **Micro-services chính**:
  - Auth Service
  - User Service
  - Pricing Service
  - ETA Service
  - Driver Service
  - Review Service
  - AI Matching Service
  - Booking Service
  - Ride Service
  - Payment Service
  - Notification Service

- **Database**:
  - **PostgreSQL**: Auth, User, Pricing, ETA, Driver, Review, AI Matching, Payment
  - **MongoDB**: Booking, Ride, Notification

- **Message broker**: RabbitMQ
  - Service giao tiếp qua RabbitMQ:
    - Booking Service
    - AI Matching Service
    - Ride Service
    - Payment Service
    - Notification Service

---

## Phân rã service & database

### Auth Service (PostgreSQL - DB: `cab_auth`)
- **Trách nhiệm**:
  - Đăng ký, đăng nhập, refresh token.
  - Quản lý access token / refresh token.
  - Xác thực và phân quyền cơ bản (role: PASSENGER, DRIVER, ADMIN).
- **Bảng chính (PostgreSQL)**:
  - `users_auth`:
    - `id` (UUID)
    - `email`
    - `password_hash`
    - `role` (`PASSENGER`, `DRIVER`, `ADMIN`)
    - `status` (`ACTIVE`, `BLOCKED`)
    - `created_at`, `updated_at`

### User Service (PostgreSQL - DB: `cab_user`)
- **Trách nhiệm**:
  - Thông tin hồ sơ user & driver.
  - Địa chỉ yêu thích, phương thức thanh toán mặc định (tham chiếu tới Payment).
- **Bảng chính (PostgreSQL)**:
  - `users_profile`
  - `drivers_profile`

### Pricing Service (PostgreSQL - DB: `cab_pricing`)
- **Trách nhiệm**:
  - Tính giá chuyến đi dựa trên khoảng cách, thời gian, loại xe, surge pricing.
- **Bảng chính (PostgreSQL)**:
  - `pricing_rules`
  - `surge_rules`

### ETA Service (PostgreSQL - DB: `cab_eta`)
- **Trách nhiệm**:
  - Tính toán thời gian ước lượng đón khách và hoàn thành chuyến đi.
- **Bảng chính (PostgreSQL)**:
  - `traffic_snapshots` (tùy chọn)

### Driver Service (PostgreSQL - DB: `cab_driver`)
- **Trách nhiệm**:
  - Cập nhật vị trí driver theo thời gian thực.
  - Tra cứu driver gần điểm đón.
- **Bảng chính (PostgreSQL)**:
  - `drivers_location`

### Review Service (PostgreSQL - DB: `cab_review`)
- **Trách nhiệm**:
  - Quản lý đánh giá, rating cho driver sau mỗi chuyến đi.
- **Bảng chính (PostgreSQL)**:
  - `reviews`

### AI Matching Service (PostgreSQL - DB: `cab_matching`)
- **Trách nhiệm**:
  - Gợi ý/ghép driver phù hợp cho ride (dựa trên vị trí, rating, lịch sử).
  - Chỉ giao tiếp qua event (consume `ride.created`, produce `ride.assigned`).
- **Bảng chính (PostgreSQL)**:
  - `driver_matching_score`

### Booking Service (MongoDB - DB: `cab_booking`)
- **Trách nhiệm**:
  - Tạo và quản lý **booking** (request đặt xe).
  - Phát event `ride.created` sau khi tạo booking thành công.
- **Collection chính (MongoDB)**:
  - `bookings`:
    - `_id`
    - `userId`
    - `pickup` (lat, lng)
    - `drop` (lat, lng)
    - `vehicleType`
    - `status` (`SEARCHING_DRIVER`, `MATCHED`, `CANCELLED`, ...)

### Ride Service (MongoDB - DB: `cab_ride`)
- **Trách nhiệm**:
  - Quản lý **chuyến đi thực tế** sau khi AI Matching gán driver.
  - Consume `ride.assigned`, thực hiện start/complete ride qua REST.
  - Trạng thái chuyến đi: `CREATED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.
- **Collection chính (MongoDB)**:
  - `rides`

### Payment Service (PostgreSQL - DB: `cab_payment`)
- **Trách nhiệm**:
  - Quản lý thanh toán cho chuyến đi.
  - Consume `ride.completed`, giao tiếp với cổng thanh toán bên ngoài.
- **Bảng chính (PostgreSQL)**:
  - `payments`
  - `payment_methods`

### Notification Service (MongoDB - DB: `cab_notification`)
- **Trách nhiệm**:
  - Gửi push notification / email / SMS.
  - Consume các event: `ride.assigned`, `ride.started`, `ride.completed`, `payment.completed`, `payment.failed`.
- **Collection chính (MongoDB)**:
  - `notifications`

---

## Hợp đồng API (REST) giữa các service

### Auth Service
- **POST** `/auth/register`
  - Request:
    - `email`, `password`, `role`
  - Response:
    - `userId`, `accessToken`, `refreshToken`

- **POST** `/auth/login`
  - Request:
    - `email`, `password`
  - Response:
    - `userId`, `role`, `accessToken`, `refreshToken`

- **POST** `/auth/refresh`
  - Request:
    - `refreshToken`
  - Response:
    - `accessToken` (mới)

### User Service
- **GET** `/users/profile`
  - Header:
    - `Authorization: Bearer <token>`
  - Response:
    - `userId`, `name`, `email`, `role` (PASSENGER | DRIVER), `phone`

- **PATCH** `/users/profile`
  - Header:
    - `Authorization: Bearer <token>`
  - Request:
    - `name`, `phone`
  - Response:
    - `status` (updated)

### Pricing Service
- **GET** `/pricing/estimate`
  - Query:
    - `pickupLat`, `pickupLng`, `dropLat`, `dropLng`, `vehicleType` (SEDAN | SUV)
  - Response:
    - `estimatedPrice`, `currency`, `surgeMultiplier`, `breakdown` (base, distance, time)

- **POST** `/pricing/estimate`
  - Request:
    - `pickup` (lat, lng), `drop` (lat, lng), `vehicleType`
  - Response:
    - `estimatedPrice`, `currency`, `surgeMultiplier`

### ETA Service
- **POST** `/eta/estimate`
  - Request:
    - `pickup` (lat, lng), `drop` (lat, lng)
  - Response:
    - `pickupEtaSeconds`, `tripEtaSeconds`

### Driver Service
- **POST** `/drivers/location`
  - Header:
    - `Authorization: Bearer <driver_token>`
  - Request:
    - `driverId`, `lat`, `lng`
  - Response:
    - `status` (location_updated)

- **GET** `/drivers/nearby`
  - Query:
    - `lat`, `lng`, `radius`
  - Response:
    - `drivers` (array: driverId, lat, lng, status)

### Review Service
- **POST** `/reviews`
  - Header:
    - `Authorization: Bearer <token>`
  - Request:
    - `rideId`, `rating`, `comment`
  - Response:
    - `status` (review_submitted)

- **GET** `/reviews/driver/{driverId}`
  - Response:
    - `averageRating`, `reviews` (array)

### AI Matching Service
- **Không có REST API public**: Chỉ giao tiếp qua event (consume `ride.created`, produce `ride.assigned`).

### Booking Service
- **POST** `/bookings`
  - Header:
    - `Authorization: Bearer <token>`
  - Request:
    - `userId`, `pickup` (lat, lng), `drop` (lat, lng), `vehicleType`
  - Hành vi:
    - Lưu document vào MongoDB `bookings`.
    - Phát message RabbitMQ `ride.created`.
  - Response:
    - `bookingId`, `status` (SEARCHING_DRIVER)

- **GET** `/bookings/{id}`
  - Header:
    - `Authorization: Bearer <token>`
  - Response:
    - `bookingId`, `status`, `pickup`, `drop`

### Ride Service
- **POST** `/rides/{id}/start`
  - Header:
    - `Authorization: Bearer <driver_token>`
  - Request: (body rỗng)
  - Response:
    - `status` (ride_started)
  - Hành vi:
    - Phát message `ride.started`.

- **POST** `/rides/{id}/complete`
  - Header:
    - `Authorization: Bearer <driver_token>`
  - Request:
    - `distanceMeters`, `durationSeconds`
  - Response:
    - `status` (ride_completed)
  - Hành vi:
    - Phát message `ride.completed` cho Payment Service.

### Payment Service
- **POST** `/payments/charge`
  - Request:
    - `rideId`, `amount`, `paymentMethod` (WALLET | CARD)
  - Response:
    - `status` (processing)
  - Hành vi:
    - Consume `ride.completed` để kích hoạt thanh toán.
    - Gọi cổng thanh toán bên ngoài.
    - Gửi event `payment.completed` hoặc `payment.failed`.

---

## Hợp đồng message RabbitMQ

### Exchange & Queue (đề xuất)
- **Exchange**: `ride.topic`
  - Routing key:
    - `ride.created`
    - `ride.assigned`
    - `ride.started`
    - `ride.completed`

- **Exchange**: `payment.topic`
  - Routing key:
    - `payment.completed`
    - `payment.failed`

---

### Message: `ride.created`
- **Producer**: Booking Service
- **Consumer**: AI Matching Service
- **Payload (JSON)**:
  - `rideId` (string)
  - `userId` (string)
  - `pickup` (object: lat, lng)
  - `drop` (object: lat, lng)
  - `vehicleType` (string)
  - `timestamp` (ISO8601)

### Message: `ride.assigned`
- **Producer**: AI Matching Service
- **Consumer**: Ride Service, Notification Service
- **Payload**:
  - `rideId`, `driverId`, `userId`, `timestamp`

### Message: `ride.started`
- **Producer**: Ride Service
- **Consumer**: Notification Service

### Message: `ride.completed`
- **Producer**: Ride Service
- **Consumer**: Payment Service, Notification Service
- **Payload**:
  - `rideId`, `finalPrice`, `distanceMeters`, `durationSeconds`, `completedAt`

### Message: `payment.completed`
- **Producer**: Payment Service
- **Consumer**: Notification Service
- **Payload**:
  - `paymentId`, `rideId`, `amount`, `status` (SUCCEEDED)

### Message: `payment.failed`
- **Producer**: Payment Service
- **Consumer**: Notification Service
- **Payload**:
  - `paymentId`, `rideId`, `amount`, `status` (FAILED), `reason`

---

## Luồng nghiệp vụ chính

```
1. Client → POST /bookings (Booking Service)
2. Booking Service → phát ride.created
3. AI Matching Service (consume ride.created) → tìm driver → phát ride.assigned
4. Ride Service (consume ride.assigned) + Notification (thông báo tài xế)
5. Driver → POST /rides/{id}/start (Ride Service)
6. Driver → POST /rides/{id}/complete (Ride Service)
7. Ride Service → phát ride.completed
8. Payment Service (consume ride.completed) → xử lý thanh toán → phát payment.completed hoặc payment.failed
9. Notification Service → gửi hoá đơn / báo lỗi
```

---

## Hợp đồng với Notification Service

- **Input**: consume từ các event:
  - `ride.assigned` → gửi thông báo "Đã tìm được tài xế".
  - `ride.started` → thông báo tài xế đã bắt đầu chuyến đi.
  - `ride.completed` → cập nhật trạng thái hoàn thành.
  - `payment.completed` → gửi hoá đơn / biên lai.
  - `payment.failed` → báo lỗi thanh toán.

- **Collection `notifications` (MongoDB)**:
  - `userId`
  - `type` (`BOOKING`, `RIDE`, `PAYMENT`, ...)
  - `title`, `body`
  - `data` (JSON)
  - `status` (`SENT`, `FAILED`)
  - `createdAt`, `sentAt`

---

## Ghi chú triển khai

- **Idempotency**:
  - Các consumer (Ride, Payment, Notification) cần xử lý **idempotent** theo `eventId` hoặc `messageId`.
- **Versioning**:
  - Nếu thay đổi cấu trúc payload message, nên sử dụng field `schemaVersion` để tránh breaking change.
- **Observability**:
  - Log `correlationId` xuyên suốt qua các service để trace một booking/ride/payment end-to-end.
- **Quy ước đặt tên**: Sử dụng **camelCase** cho các field trong JSON (userId, bookingId, pickup, drop, v.v.).
