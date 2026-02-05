# Auth Service

Authentication microservice for the cab booking system, implementing JWT-based authentication according to CONTRACT.md specifications.

## Features

- User registration with role-based access (USER, DRIVER, ADMIN)
- User login with password verification
- JWT access/refresh token management
- PostgreSQL database with Sequelize ORM
- Express.js REST API
- Docker support

## Tech Stack

- **Runtime**: Node.js 18
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Sequelize
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt

## API Endpoints

All endpoints follow the CONTRACT.md specification:

### POST /auth/register
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "USER"  // Optional: USER, DRIVER, or ADMIN
}
```

**Response (201):**
```json
{
  "user_id": "uuid",
  "access_token": "jwt_token",
  "refresh_token": "jwt_token"
}
```

### POST /auth/login
Login with existing credentials.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "user_id": "uuid",
  "access_token": "jwt_token",
  "refresh_token": "jwt_token"
}
```

### POST /auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refresh_token": "jwt_token"
}
```

**Response (200):**
```json
{
  "access_token": "new_jwt_token"
}
```

### GET /health
Health check endpoint.

**Response (200):**
```json
{
  "status": "ok",
  "service": "auth-service",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Quick Start with Docker Compose (Recommended)

Cách nhanh nhất để chạy Auth Service độc lập:

```bash
# 1. Start service với docker-compose
docker-compose up -d

# 2. Xem logs
docker-compose logs -f auth-service

# 3. Test health check
curl http://localhost:3001/health

# 4. Dừng service
docker-compose down
```

Service sẽ tự động:
- ✅ Start PostgreSQL database
- ✅ Tạo database `cab_auth`
- ✅ Sync database models
- ✅ Start Auth Service trên port 3001

## Setup Local (Without Docker)

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Create database:
```sql
CREATE DATABASE cab_auth;
```

4. Run database migrations:
```bash
npm run migrate
```

5. Start the service:
```bash
# Development with auto-reload
npm run dev

# Production
npm start
```

The service will run on port 3001 by default.

## Docker Commands

### Build và chạy bằng Docker Compose
```bash
# Start tất cả services (postgres + auth-service)
docker-compose up -d

# Xem logs realtime
docker-compose logs -f auth-service

# Restart service
docker-compose restart auth-service

# Stop tất cả
docker-compose down

# Stop và xóa volumes (xóa database data)
docker-compose down -v
```

### Build và chạy riêng với Docker
```bash
# Build image
docker build -t auth-service .

# Chạy container (cần PostgreSQL đang chạy)
docker run -p 3001:3001 --env-file .env auth-service
```

## Database Schema

### users_auth table
- `id` (UUID, primary key)
- `email` (VARCHAR, unique, not null)
- `password_hash` (VARCHAR, not null)
- `role` (ENUM: USER, DRIVER, ADMIN)
- `status` (ENUM: ACTIVE, BLOCKED)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Testing API

You can test the API endpoints using curl or any HTTP client:

```bash
# Register a new user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","role":"USER"}'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Refresh token (thay YOUR_REFRESH_TOKEN bằng token từ login)
curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"YOUR_REFRESH_TOKEN"}'

# Health check
curl http://localhost:3001/health
```

## Environment Variables

Khi chạy với docker-compose, các biến môi trường đã được cấu hình sẵn. Nếu chạy local, xem `.env.example`:

- `PORT` - Server port (default: 3001)
- `DB_HOST` - PostgreSQL host
- `DB_PORT` - PostgreSQL port
- `DB_USERNAME` - Database username
- `DB_PASSWORD` - Database password
- `DB_DATABASE` - Database name
- `JWT_SECRET` - Secret key for JWT signing
- `JWT_ACCESS_EXPIRY` - Access token expiration (default: 15m)
- `JWT_REFRESH_EXPIRY` - Refresh token expiration (default: 7d)

## Project Structure

```
src/
├── config/
│   └── database.js         # Sequelize configuration
├── controllers/
│   └── authController.js   # Authentication logic
├── middleware/
│   └── auth.js            # JWT authentication middleware
├── migrations/
│   └── run.js             # Database migrations
├── models/
│   └── User.js            # User model
├── routes/
│   └── auth.js            # Auth routes
├── utils/
│   ├── jwt.js             # JWT utilities
│   └── password.js        # Password hashing utilities
├── app.js                 # Express app setup
└── server.js              # Server entry point
```

## Security

- Passwords are hashed using bcrypt with 10 salt rounds
- JWT tokens are signed with a secret key
- Access tokens expire after 15 minutes
- Refresh tokens expire after 7 days
- Email validation and input sanitization
- CORS enabled with configurable origin

## Error Handling

The service returns appropriate HTTP status codes:

- `200` - Success
- `201` - Resource created
- `400` - Bad request / Validation error
- `401` - Unauthorized / Invalid credentials
- `403` - Forbidden / Account blocked
- `404` - Not found
- `409` - Conflict / Email already exists
- `500` - Internal server error

## Troubleshooting

### Service không start được
```bash
# Xem logs chi tiết
docker-compose logs auth-service

# Kiểm tra PostgreSQL đã sẵn sàng chưa
docker-compose logs postgres
```

### Database connection failed
- Đảm bảo PostgreSQL đã start: `docker-compose ps`
- Kiểm tra credentials trong docker-compose.yml
- Đợi vài giây để PostgreSQL khởi động hoàn toàn

### Port 3001 đã được sử dụng
```bash
# Tìm process đang dùng port 3001
# Windows:
netstat -ano | findstr :3001

# Hoặc đổi port trong docker-compose.yml:
ports:
  - "3002:3001"  # Map port 3002 thay vì 3001
```

## License

ISC
