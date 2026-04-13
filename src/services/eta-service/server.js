const express = require('express');
const etaRoutes = require('./src/routes/eta');

const app = express();
const PORT = process.env.PORT || 3012;

app.use(express.json());

// Health check
app.get('/health', (req, res) => res.status(200).json({ status: 'OK', service: 'eta-service' }));

// ETA Routes
app.use('/eta', etaRoutes);

app.listen(PORT, () => {
    console.log(`✓ ETA Service running on port ${PORT}`);
});
