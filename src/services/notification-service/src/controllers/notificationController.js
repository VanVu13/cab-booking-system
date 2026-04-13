const Notification = require('../models/Notification');

// GET /notifications?userId=...
async function getNotifications(req, res) {
    try {
        const { userId, role } = req.query; // Simple query params for now

        if (!userId) {
            return res.status(400).json({ error: 'Missing userId query parameter' });
        }

        const notifications = await Notification.find({ recipientId: userId })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({
            count: notifications.length,
            notifications
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// GET /notifications/:id
async function getNotificationById(req, res) {
    try {
        const notification = await Notification.findOne({ notificationId: req.params.id });
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        res.json(notification);
    } catch (error) {
        console.error('Error fetching notification:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// PATCH /notifications/:id/read
async function markAsRead(req, res) {
    try {
        const notification = await Notification.findOneAndUpdate(
            { notificationId: req.params.id },
            { readAt: new Date(), status: 'READ' },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json(notification);
    } catch (error) {
        console.error('Error updating notification:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    getNotifications,
    getNotificationById,
    markAsRead
};
