'use strict';

const Client = require('../models/Client');
const Activity = require('../models/Activity');
const { validateClientTaxId, normalizeTaxId } = require('../utils/taxId');
const { apiResponse, apiError } = require('../utils/response');
const { audit } = require('../utils/audit');
const { applyClientZoneFilterForUser, hasZoneAccessToClient, hasSalesZone, isSales } = require('../utils/zoneAccess');
const { parseCsvText } = require('../utils/csv');
const { Zone, Segment } = require('../models/Catalog');

function normalizeClientType(value) {
  return value === 'indirect' ? 'indirect' : 'direct';
}

function normalizeClientLocations(locations, currentLocations = []) {
  const source = Array.isArray(locations) ? locations : [];
  return source
    .filter((location) => location && location.lat != null && location.lng != null)
    .map((location, index) => ({
      _id: location._id || undefined,
      label: (location.label ?? `finca${index + 1}`).trim() || `finca${index + 1}`,
      lat: Number(location.lat),
      lng: Number(location.lng),
      accuracyMeters: location.accuracyMeters != null ? Number(location.accuracyMeters) : null,
      capturedAt: location.capturedAt || currentLocations[index]?.capturedAt || new Date(),
    }));
}

function firstLocationAsGeo(locations) {
  const first = Array.isArray(locations) ? locations[0] : null;
  if (!first) return null;
  return {
    lat: first.lat,
    lng: first.lng,
    accuracyMeters: first.accuracyMeters ?? null,
    capturedAt: first.capturedAt || new Date(),
  };
}

async function createClient(req, res) {
  try {
    const data = req.body;
    data.clientType = normalizeClientType(data.clientType);
    data.taxId = normalizeTaxId(data.taxId || '');
    if (!data.taxId) data.taxId = null;
    data.locations = normalizeClientLocations(data.locations || (data.geo ? [{ ...data.geo, label: 'finca1' }] : []));
    if (!data.geo && data.locations.length > 0) data.geo = firstLocationAsGeo(data.locations);
    if (data.clientType === 'direct' && !data.taxId) {
      return apiError(res, 422, 'El CIF/NIF es obligatorio para clientes directos');
    }
    if (data.clientType === 'indirect' && !data.phone) {
      return apiError(res, 422, 'El teléfono es obligatorio para clientes indirectos');
    }
    if (data.taxId && !validateClientTaxId(data.taxId)) {
      return apiError(res, 422, 'Identificación fiscal inválida');
    }
    const existing = data.taxId ? await Client.findOne({ taxId: data.taxId, deletedAt: null }) : null;
    if (existing) return apiError(res, 409, `Ya existe un cliente con el CIF/NIF ${data.taxId}`);
    if (isSales(req.user)) {
      if (!hasSalesZone(req.user)) return apiError(res, 422, 'Tu usuario comercial no tiene zona asignada');
      data.zoneId = req.user.zoneId;
    }
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
    const { search = '', page = 1, limit = 20, zoneId, segmentId, hasGeo } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const filter = applyClientZoneFilterForUser(req.user, { deletedAt: null });
    if (zoneId) filter.zoneId = zoneId;
    if (segmentId) filter.segmentId = segmentId;
    if (hasGeo === 'true') filter.geo = { $ne: null };
    if (hasGeo === 'false') filter.geo = null;
    if (search) {
      filter.$or = [
        { legalName: { $regex: search, $options: 'i' } },
        { taxId: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
      ];
    }
    const [clients, total] = await Promise.all([
      Client.find(filter).sort({ zoneId: 1, legalName: 1 }).skip(skip).limit(parseInt(limit, 10))
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
    const client = await Client.findOne(applyClientZoneFilterForUser(req.user, { _id: req.params.id, deletedAt: null }))
      .populate('zoneId', 'name').populate('segmentId', 'name').populate('createdBy', 'name email');
    if (!client) return apiError(res, 404, 'Cliente no encontrado');
    return apiResponse(res, 200, client);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function updateClient(req, res) {
  try {
    const client = await Client.findOne(applyClientZoneFilterForUser(req.user, { _id: req.params.id, deletedAt: null }));
    if (!client) return apiError(res, 404, 'Cliente no encontrado');
    if (!hasZoneAccessToClient(req.user, client)) {
      return apiError(res, 403, 'No autorizado para interactuar con clientes fuera de tu zona');
    }
    if (isSales(req.user)) {
      req.body.zoneId = req.user.zoneId;
    }
    const nextClientType = normalizeClientType(req.body.clientType || client.clientType || 'direct');
    req.body.clientType = nextClientType;
    if (Object.prototype.hasOwnProperty.call(req.body, 'taxId')) {
      req.body.taxId = normalizeTaxId(req.body.taxId || '');
      if (!req.body.taxId) req.body.taxId = null;
    }
    const nextTaxId = Object.prototype.hasOwnProperty.call(req.body, 'taxId') ? req.body.taxId : client.taxId;
    const nextPhone = Object.prototype.hasOwnProperty.call(req.body, 'phone') ? req.body.phone : client.phone;
    if (nextClientType === 'direct' && !nextTaxId) {
      return apiError(res, 422, 'El CIF/NIF es obligatorio para clientes directos');
    }
    if (nextClientType === 'indirect' && !nextPhone) {
      return apiError(res, 422, 'El teléfono es obligatorio para clientes indirectos');
    }
    if (nextTaxId && !validateClientTaxId(nextTaxId)) {
      return apiError(res, 422, 'Identificación fiscal inválida');
    }
    if (nextTaxId) {
      const duplicated = await Client.findOne({
        taxId: nextTaxId,
        deletedAt: null,
        _id: { $ne: client._id },
      }).select('_id');
      if (duplicated) return apiError(res, 409, `Ya existe un cliente con la identificación fiscal ${nextTaxId}`);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'locations')) {
      req.body.locations = normalizeClientLocations(req.body.locations, client.locations || []);
      req.body.geo = firstLocationAsGeo(req.body.locations);
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
    const filter = applyClientZoneFilterForUser(req.user, { deletedAt: null });
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
    const client = await Client.findOne(applyClientZoneFilterForUser(req.user, { _id: req.params.id, deletedAt: null }));
    if (!client) return apiError(res, 404, 'Cliente no encontrado');
    const { label, lat, lng, accuracyMeters, capturedAt } = req.body;
    const nextLocation = {
      label: label || `finca${(client.locations || []).length + 1}`,
      lat,
      lng,
      accuracyMeters: accuracyMeters || null,
      capturedAt: capturedAt || new Date(),
    };
    client.locations = [...(client.locations || []), nextLocation];
    client.geo = firstLocationAsGeo(client.locations);
    await client.save();
    await audit({ entityName: 'Client', entityId: String(client._id), action: 'SET_LOCATION', userId: req.user._id, after: client.geo });
    return apiResponse(res, 200, client);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function parseClientImportRows(csvText, user) {
  const rows = parseCsvText(csvText);
  const zones = await Zone.find({}).select('_id name');
  const segments = await Segment.find({}).select('_id name');
  const zoneByName = new Map(zones.map((zone) => [zone.name.toLowerCase(), zone]));
  const segmentByName = new Map(segments.map((segment) => [segment.name.toLowerCase(), segment]));

  const parsed = [];
  for (const row of rows) {
    const errors = [];
    const legalName = (row.razon_social || row.legalname || '').trim();
    const clientType = normalizeClientType((row.tipo_cliente || row.client_type || row.tipo || 'direct').trim().toLowerCase());
    const taxId = normalizeTaxId(row.cif_nif || row.taxid || '');
    const province = (row.provincia || row.province || '').trim();
    const city = (row.ciudad || row.city || '').trim();
    const zoneName = (row.representante || row.zona || row.zone || '').trim();
    const segmentName = (row.segmento || row.segment || '').trim();
    const phone = (row.telefono || row.phone || '').trim();
    const email = (row.email || '').trim().toLowerCase();
    const notes = (row.notas || row.notes || '').trim();

    if (!legalName) errors.push('Razón social requerida');
    if (clientType === 'direct' && !taxId) errors.push('Identificación fiscal requerida para cliente directo');
    if (clientType === 'indirect' && !phone) errors.push('Teléfono requerido para cliente indirecto');
    if (taxId && !validateClientTaxId(taxId)) errors.push(`Identificación fiscal inválida: ${taxId}`);
    if (!province) errors.push('Provincia requerida');
    if (!city) errors.push('Ciudad requerida');
    if (!segmentName) errors.push('Segmento requerido');

    const zone = user.role === 'sales'
      ? (user.zoneId ? { _id: user.zoneId } : null)
      : zoneByName.get(zoneName.toLowerCase());
    const segment = segmentByName.get(segmentName.toLowerCase());

    if (user.role !== 'sales' && zoneName && !zone) errors.push(`Representante no encontrado: ${zoneName}`);
    if (user.role !== 'sales' && !zoneName) errors.push('Representante requerido');
    if (user.role === 'sales' && !user.zoneId) errors.push('El usuario sales no tiene representante asignado');
    if (!segment) errors.push(`Segmento no encontrado: ${segmentName}`);

    const existing = taxId ? await Client.findOne({ taxId, deletedAt: null }).select('_id') : null;
    if (existing) errors.push(`Cliente duplicado por identificación fiscal: ${taxId}`);

    parsed.push({
      row: row.__row,
      valid: errors.length === 0,
      errors,
      data: {
        legalName,
        clientType,
        taxId: taxId || null,
        province,
        city,
        zoneId: zone ? zone._id : null,
        segmentId: segment ? segment._id : null,
        phone: phone || null,
        email: email || null,
        notes: notes || null,
      },
    });
  }
  return parsed;
}

async function previewClientImport(req, res) {
  try {
    const parsed = await parseClientImportRows(req.body.csvText, req.user);
    return apiResponse(res, 200, {
      total: parsed.length,
      valid: parsed.filter((item) => item.valid).length,
      invalid: parsed.filter((item) => !item.valid).length,
      rows: parsed,
    });
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function importClients(req, res) {
  try {
    const parsed = await parseClientImportRows(req.body.csvText, req.user);
    const validRows = parsed.filter((item) => item.valid);
    const invalidRows = parsed.filter((item) => !item.valid);
    if (validRows.length === 0) {
      return apiError(
        res,
        422,
        'No hay filas válidas para importar',
        invalidRows.map((item) => `Fila ${item.row}: ${item.errors.join(', ')}`)
      );
    }

    const created = [];
    for (const item of validRows) {
      const client = await Client.create({ ...item.data, createdBy: req.user._id });
      created.push(client);
    }
    await audit({
      entityName: 'Client',
      entityId: 'bulk-import',
      action: 'IMPORT',
      userId: req.user._id,
      after: {
        totalCreated: created.length,
        totalSkipped: invalidRows.length,
      },
    });
    return apiResponse(res, 201, {
      totalRows: parsed.length,
      totalCreated: created.length,
      totalSkipped: invalidRows.length,
      skippedRows: invalidRows.map((item) => ({
        row: item.row,
        errors: item.errors,
        data: item.data,
      })),
    });
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function deleteClient(req, res) {
  try {
    if (req.user.role === 'sales') {
      return apiError(res, 403, 'Los comerciales no pueden borrar clientes');
    }
    const client = await Client.findOne(applyClientZoneFilterForUser(req.user, { _id: req.params.id, deletedAt: null }));
    if (!client) return apiError(res, 404, 'Cliente no encontrado');
    if (!hasZoneAccessToClient(req.user, client)) {
      return apiError(res, 403, 'No autorizado para borrar clientes fuera de tu zona');
    }
    const before = client.toObject();
    client.deletedAt = new Date();
    await client.save();
    await audit({ entityName: 'Client', entityId: String(client._id), action: 'DELETE', userId: req.user._id, before });
    return apiResponse(res, 200, { message: 'Cliente eliminado' });
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

module.exports = { createClient, listClients, getClient, updateClient, suggestClients, setClientLocation, previewClientImport, importClients, deleteClient };
