const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// All routes here assume middleware has already set x-user-id and x-user-role
router.get('/profile', userController.getProfile);
router.patch('/profile', userController.updateProfile);

module.exports = router;
