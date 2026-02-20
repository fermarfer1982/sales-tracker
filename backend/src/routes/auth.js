'use strict';

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { login, me, logout } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { login: loginSchema } = require('../validators/auth');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Demasiados intentos, intenta en 15 minutos' },
});

router.post('/login', loginLimiter, validate(loginSchema), login);
router.get('/me', authenticate, me);
router.post('/logout', authenticate, logout);

module.exports = router;
