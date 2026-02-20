'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createClient: createSchema, updateClient: updateSchema, setLocation: setLocationSchema } = require('../validators/client');
const ctrl = require('../controllers/clientController');

router.use(authenticate);
router.get('/suggest', ctrl.suggestClients);
router.get('/', ctrl.listClients);
router.post('/', validate(createSchema), ctrl.createClient);
router.get('/:id', ctrl.getClient);
router.put('/:id', validate(updateSchema), ctrl.updateClient);
router.patch('/:id/set-location', validate(setLocationSchema), ctrl.setClientLocation);

module.exports = router;
