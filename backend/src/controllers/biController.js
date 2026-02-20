'use strict';

const Activity = require('../models/Activity');
const Client = require('../models/Client');
const User = require('../models/User');
const { ActivityType, Product, Outcome, Zone, Segment } = require('../models/Catalog');
const { apiResponse, apiError } = require('../utils/response');

async function factActivities(req, res) {
  try {
    const { from, to } = req.query;
    const filter = { deletedAt: null, status: 'completed' };
    if (from || to) {
      filter.activityDate = {};
      if (from) filter.activityDate.$gte = new Date(from);
      if (to) filter.activityDate.$lte = new Date(to + 'T23:59:59');
    }
    const activities = await Activity.find(filter)
      .select('-checkIn -checkOut -__v')
      .populate('userId', 'name email role zoneId')
      .populate('clientId', 'legalName taxId province city zoneId segmentId')
      .populate('activityTypeId', 'name')
      .populate('productId', 'name')
      .populate('outcomeId', 'name');
    return apiResponse(res, 200, activities);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function dimClients(req, res) {
  try {
    const clients = await Client.find({ deletedAt: null })
      .populate('zoneId', 'name').populate('segmentId', 'name').populate('createdBy', 'name email');
    return apiResponse(res, 200, clients);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function dimUsers(req, res) {
  try {
    const users = await User.find({}).select('-passwordHash')
      .populate('zoneId', 'name').populate('managerUserId', 'name email');
    return apiResponse(res, 200, users);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function dimCatalogs(req, res) {
  try {
    const [activityTypes, products, outcomes, zones, segments] = await Promise.all([
      ActivityType.find({}),
      Product.find({}),
      Outcome.find({}),
      Zone.find({}),
      Segment.find({}),
    ]);
    return apiResponse(res, 200, { activityTypes, products, outcomes, zones, segments });
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

module.exports = { factActivities, dimClients, dimUsers, dimCatalogs };
