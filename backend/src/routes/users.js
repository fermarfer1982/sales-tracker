'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createUser: createUserSchema, updateUser: updateUserSchema } = require('../validators/user');
const ctrl = require('../controllers/userController');

router.use(authenticate);
router.get('/options', authorize('manager', 'admin'), ctrl.listVisibleSalesUsers);
router.use(authorize('admin'));
router.post('/import-preview', ctrl.previewUserImport);
router.post('/import', ctrl.importUsers);
router.get('/', ctrl.listUsers);
router.post('/', validate(createUserSchema), ctrl.createUser);
router.put('/:id', validate(updateUserSchema), ctrl.updateUser);
router.delete('/:id', ctrl.deleteUser);
router.patch('/:id/activate', ctrl.activateUser);
router.patch('/:id/deactivate', ctrl.deactivateUser);
router.patch('/:id/role', ctrl.setRole);
router.patch('/:id/manager', ctrl.setManager);

module.exports = router;
