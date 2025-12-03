const express = require('express');
const router = express.Router();
const { register, login, getCurrentUser, logout } = require('./controller');

//HTTP Routes
router.post('/register', register);
router.post('/login', login);
router.get('/me', getCurrentUser);
router.post('/logout', logout);

module.exports = router;