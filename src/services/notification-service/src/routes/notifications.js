const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// All routes are prefixed with /notifications by the Gateway, 
// BUT in the service itself we mount them relative to root or prefix.
// The app.js config usually mounts at root.

router.get('/', notificationController.getNotifications);
router.get('/:id', notificationController.getNotificationById);
router.patch('/:id/read', notificationController.markAsRead);

router.post('/test-send', async (req, res) => {
    const { user_id, message } = req.body;
    if (!user_id || !message) return res.status(400).json({ error: 'Missing user_id or message' });

    // Mock successful send
    try {
        const Notification = require('../models/Notification');
        await Notification.create({
            notificationId: 'test-' + Date.now(),
            recipientId: user_id,
            title: 'Test Notification',
            body: message,
            type: 'SYSTEM',
            status: 'SENT'
        });
    } catch (e) {
        console.error('Test notification save error', e);
    }

    return res.status(200).json({
        user_id,
        message,
        status: 'Notification sent successfully'
    });
});

module.exports = router;
