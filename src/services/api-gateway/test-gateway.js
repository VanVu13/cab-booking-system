const jwt = require('jsonwebtoken');
const axios = require('axios');
const token = jwt.sign({ userId: 1, role: 'PASSENGER', type: 'access' }, 'supersecret');
axios.get('http://localhost:3000/pricing/vehicle-types', {
    headers: { Authorization: 'Bearer ' + token }
})
    .then(r => console.log('SUCCESS:', r.status, JSON.stringify(r.data).substring(0, 50)))
    .catch(e => console.log('ERROR:', e.message, e.response?.data));
