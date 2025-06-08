const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// Получение пользователя по username
router.get('/:username', auth.optional, userController.getUserByUsername);

// Подписка/отписка на пользователя
router.post('/:username/follow', auth.required, userController.toggleFollow);

module.exports = router; 