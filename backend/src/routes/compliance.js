'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/complianceController');

router.use(authenticate);
router.get('/today', ctrl.getToday);
router.get('/range', ctrl.getRange);
router.get('/kpis', ctrl.getKpis);

module.exports = router;
