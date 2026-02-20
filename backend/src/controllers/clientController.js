'use strict';

const Client = require('../models/Client');
const { validateSpanishTaxId, normalizeTaxId } = require('../utils/taxId');
const { apiResponse, apiError } = require('../utils/response');
const { audit } = require('../utils/audit');

async function createClient(req, res) {
  try {
    const data = req.body;
    data.taxId = normalizeTaxId(data.taxId);
    if (!validateSpanishTaxId(data.taxId)) {
      return apiError(res, 422, 'CIF/NIF inválido');
    }
    const existing = await Client.findOne({ taxId: data.taxId, deletedAt: null });
    if (existing) return apiError(res, 409, `Ya existe un cliente con el CIF/NIF ${data.taxId}`);
    const client = await Client.create({ ...data, createdBy: req.user._id });
    await audit({ entityName: 'Client', entityId: String(client._id), action: 'CREATE', userId: req.user._id, after: client.toObject() });
    return apiResponse(res, 201, client);
  } catch (err) {
    if (err.code === 11000) return apiError(res, 409, 'CIF/NIF duplicado');
    return apiError(res, 500, err.message);
  }
}

async function listClients(req, res) {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const filter = { deletedAt: null };
    if (search) {
      filter.$or = [
        { legalName: { $regex: search, $options: 'i' } },
        { taxId: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
      ];
    }
    const [clients, total] = await Promise.all([
      Client.find(filter).sort({ legalName: 1 }).skip(skip).limit(parseInt(limit, 10))
        .populate('zoneId', 'name').populate('segmentId', 'name').populate('createdBy', 'name email'),
      Client.countDocuments(filter),
    ]);
    return apiResponse(res, 200, clients, { total, page: parseInt(page, 10), limit: parseInt(limit, 10), pages: Math.ceil(total / parseInt(limit, 10)) });
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function getClient(req, res) {
  try {
    const client = await Client.findOne({ _id: req.params.id, deletedAt: null })
      .populate('zoneId', 'name').populate('segmentId', 'name').populate('createdBy', 'name email');
    if (!client) return apiError(res, 404, 'Cliente no encontrado');
    return apiResponse(res, 200, client);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function updateClient(req, res) {
  try {
    const client = await Client.findOne({ _id: req.params.id, deletedAt: null });
    if (!client) return apiError(res, 404, 'Cliente no encontrado');
    if (req.user.role === 'sales' && String(client.createdBy) !== String(req.user._id)) {
      return apiError(res, 403, 'Solo puedes editar clientes que hayas creado tú');
    }
    const before = client.toObject();
    Object.assign(client, req.body);
    await client.save();
    await audit({ entityName: 'Client', entityId: String(client._id), action: 'UPDATE', userId: req.user._id, before, after: client.toObject() });
    return apiResponse(res, 200, client);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function suggestClients(req, res) {
  try {
    const { name = '', taxId = '' } = req.query;
    const filter = { deletedAt: null };
    if (!name && !taxId) return apiResponse(res, 200, []);
    const orClauses = [];
    if (name) orClauses.push({ legalName: { $regex: name, $options: 'i' } });
    if (taxId) {
      const normalized = normalizeTaxId(taxId);
      if (normalized) orClauses.push({ taxId: normalized });
    }
    filter.$or = orClauses;
    const clients = await Client.find(filter).limit(10).select('legalName taxId city province zoneId segmentId');
    return apiResponse(res, 200, clients);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function setClientLocation(req, res) {
  try {
    const client = await Client.findOne({ _id: req.params.id, deletedAt: null });
    if (!client) return apiError(res, 404, 'Cliente no encontrado');
    const { lat, lng, accuracyMeters, capturedAt } = req.body;
    client.geo = { lat, lng, accuracyMeters: accuracyMeters || null, capturedAt: capturedAt || new Date() };
    await client.save();
    await audit({ entityName: 'Client', entityId: String(client._id), action: 'SET_LOCATION', userId: req.user._id, after: client.geo });
    return apiResponse(res, 200, client);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

module.exports = { createClient, listClients, getClient, updateClient, suggestClients, setClientLocation };
