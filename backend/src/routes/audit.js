'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/auditController');

router.use(authenticate, authorize('admin'));
router.get('/', ctrl.listAudit);

module.exports = router;
