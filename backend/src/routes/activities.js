'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  checkIn,
  checkOut,
  quickCreate,
  scheduleCreate,
  scheduleUpdate,
  updateActivity: updateActivitySchema,
} = require('../validators/activity');
const ctrl = require('../controllers/activityController');

router.use(authenticate);
router.post('/checkin', validate(checkIn), ctrl.checkIn);
router.post('/quick', validate(quickCreate), ctrl.quickCreate);
router.post('/schedule', validate(scheduleCreate), ctrl.scheduleCreate);
router.put('/schedule/:id', validate(scheduleUpdate), ctrl.scheduleUpdate);
router.delete('/schedule/:id', authorize('admin'), ctrl.scheduleDelete);
router.get('/my', ctrl.myActivities);
router.get('/calendar', ctrl.calendar);
router.get('/team', authorize('manager', 'admin'), ctrl.teamActivities);
router.get('/:id', ctrl.getActivity);
router.post('/:id/checkout', validate(checkOut), ctrl.checkOut);
router.put('/:id', validate(updateActivitySchema), ctrl.updateActivity);
router.delete('/:id', ctrl.deleteActivity);

module.exports = router;
