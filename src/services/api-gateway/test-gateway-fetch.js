const jwt = require('jsonwebtoken');
const token = jwt.sign({ userId: 1, role: 'PASSENGER', type: 'access' }, 'supersecret');
fetch('http://localhost:3000/pricing/vehicle-types', {
    headers: { Authorization: 'Bearer ' + token }
})
    .then(async r => {
        const text = await r.text();
        console.log('STATUS:', r.status);
        console.log('RESPONSE:', text.substring(0, 200));
    })
    .catch(e => console.log('ERROR:', e.message));
