'use strict';

const { ActivityType, Product, Outcome, Zone, Segment } = require('../models/Catalog');
const { apiResponse, apiError } = require('../utils/response');

const catalogMap = {
  'activity-types': ActivityType,
  products: Product,
  outcomes: Outcome,
  zones: Zone,
  segments: Segment,
};

function getModel(type) {
  return catalogMap[type] || null;
}

async function listCatalog(req, res) {
  const Model = getModel(req.params.type);
  if (!Model) return apiError(res, 404, 'Catálogo no encontrado');
  try {
    const { showAll } = req.query;
    const filter = showAll === 'true' ? {} : { isActive: true };
    const items = await Model.find(filter).sort({ name: 1 });
    return apiResponse(res, 200, items);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function createCatalogItem(req, res) {
  const Model = getModel(req.params.type);
  if (!Model) return apiError(res, 404, 'Catálogo no encontrado');
  try {
    const { name } = req.body;
    if (!name) return apiError(res, 422, 'El nombre es requerido');
    const item = await Model.create({ name });
    return apiResponse(res, 201, item);
  } catch (err) {
    if (err.code === 11000) return apiError(res, 409, 'Ya existe un elemento con ese nombre');
    return apiError(res, 500, err.message);
  }
}

async function updateCatalogItem(req, res) {
  const Model = getModel(req.params.type);
  if (!Model) return apiError(res, 404, 'Catálogo no encontrado');
  try {
    const item = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return apiError(res, 404, 'Elemento no encontrado');
    return apiResponse(res, 200, item);
  } catch (err) {
    if (err.code === 11000) return apiError(res, 409, 'Ya existe un elemento con ese nombre');
    return apiError(res, 500, err.message);
  }
}

module.exports = { listCatalog, createCatalogItem, updateCatalogItem };
