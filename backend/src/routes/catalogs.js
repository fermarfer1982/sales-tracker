'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/catalogController');

router.use(authenticate);
router.get('/:type', ctrl.listCatalog);
router.post('/:type', authorize('admin'), ctrl.createCatalogItem);
router.put('/:type/:id', authorize('admin'), ctrl.updateCatalogItem);

module.exports = router;
