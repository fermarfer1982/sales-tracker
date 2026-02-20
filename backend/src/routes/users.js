'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createUser: createUserSchema, updateUser: updateUserSchema } = require('../validators/user');
const ctrl = require('../controllers/userController');

router.use(authenticate, authorize('admin'));
router.get('/', ctrl.listUsers);
router.post('/', validate(createUserSchema), ctrl.createUser);
router.put('/:id', validate(updateUserSchema), ctrl.updateUser);
router.patch('/:id/activate', ctrl.activateUser);
router.patch('/:id/deactivate', ctrl.deactivateUser);
router.patch('/:id/role', ctrl.setRole);
router.patch('/:id/manager', ctrl.setManager);

module.exports = router;
