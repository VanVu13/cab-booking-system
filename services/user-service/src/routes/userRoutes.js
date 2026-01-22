const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
// const authMiddleware = require('../middleware/authMiddleware'); // Tạm comment

// Public routes
router.post('/', userController.createUser);
router.get('/auth/:authId', userController.getUserByAuthId);

// Tạm bỏ authentication để test
router.get('/:id', userController.getUserById); // Bỏ authMiddleware.authenticate
router.put('/:id', userController.updateUser); // Bỏ authMiddleware.authenticate
router.delete('/:id', userController.deleteUser); // Bỏ authMiddleware.authenticate
router.get('/', userController.searchUsers); // Bỏ authMiddleware.authenticate
router.patch('/:id/wallet', userController.updateWallet); // Bỏ authMiddleware.authenticate

module.exports = router;