'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/settingsController');

router.use(authenticate, authorize('admin'));
router.get('/', ctrl.getSettings);
router.put('/', ctrl.updateSettings);

module.exports = router;
