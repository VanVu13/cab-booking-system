require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
    console.log('=================================');
    console.log('   Pricing Service Started');
    console.log('=================================');
    console.log(`✓ Pricing Service running on port ${PORT}`);
    console.log(`✓ Health check: http://localhost:${PORT}/health`);
});
