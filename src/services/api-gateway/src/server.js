require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

const http = require('http');
const server = http.createServer(app);

// Handle WebSocket upgrades
server.on('upgrade', (req, socket, head) => {
    const url = req.url || '';
    console.log(`[GATEWAY WS] Upgrade request: ${url}`);

    if (url.includes('tracking-socket') && app.proxies?.trackingSocket) {
        console.log('[GATEWAY WS] Proxying to Tracking Service');
        app.proxies.trackingSocket.upgrade(req, socket, head);
    } else if ((url.includes('socket.io') || url.includes('notification')) && app.proxies?.notificationSocket) {
        console.log('[GATEWAY WS] Proxying to Notification Service');
        app.proxies.notificationSocket.upgrade(req, socket, head);
    } else {
        console.warn(`[GATEWAY WS] No proxy found for URL: ${url}`);
        socket.destroy();
    }
});

server.listen(PORT, () => {
    console.log(`✓ API Gateway listening on port ${PORT}`);
});
