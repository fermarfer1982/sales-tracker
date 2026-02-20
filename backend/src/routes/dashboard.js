'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/dashboardController');

router.use(authenticate, authorize('manager', 'admin'));
router.get('/kpis', ctrl.getKpis);
router.get('/missing', ctrl.getMissing);
router.get('/commercial-status', ctrl.getCommercialStatus);

module.exports = router;
