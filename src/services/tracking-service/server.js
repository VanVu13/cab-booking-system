const express = require('express');
const http = require('http');
const initRouteService = require('./routeService');

const app = express();
const server = http.createServer(app);

app.use(express.json());

const PORT = process.env.PORT || 3011;

// REST Endpoints
app.get('/health', (req, res) => res.status(200).json({ status: 'OK' }));

// Khởi tạo Socket.IO service qua server hỗn hợp
const io = initRouteService(server, app);

server.listen(PORT, () => {
    console.log(`✓ Tracking Service (Hybrid) running on port ${PORT}`);
});
