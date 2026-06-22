'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/biController');

router.use(authenticate, authorize('admin', 'manager'));
router.get('/fact-activities', ctrl.factActivities);
router.get('/dim-clients', ctrl.dimClients);
router.get('/dim-users', ctrl.dimUsers);
router.get('/dim-catalogs', ctrl.dimCatalogs);

module.exports = router;
