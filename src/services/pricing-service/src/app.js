require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pricingRoutes = require('./routes/pricing');

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', service: 'pricing-service' });
});

app.use('/pricing', pricingRoutes);
app.use('/', pricingRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

module.exports = app;
