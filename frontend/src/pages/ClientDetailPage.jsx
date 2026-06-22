import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { catalogService, clientService } from '../services';
import { useAuth } from '../context/AuthContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { GeoStatus } from '../components/GeoStatus';

function mapsUrl(lat, lng) {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [client, setClient] = useState(null);
  const [zones, setZones] = useState([]);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [legalName, setLegalName] = useState('');
  const [clientType, setClientType] = useState('direct');
  const [taxId, setTaxId] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [segmentId, setSegmentId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [locations, setLocations] = useState([]);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const { geoStatus, capture } = useGeolocation();

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const [clientRes, zonesRes, segmentsRes] = await Promise.all([
        clientService.get(id),
        catalogService.list('zones'),
        catalogService.list('segments'),
      ]);

      const clientData = clientRes.data.data;
      const allZones = zonesRes.data.data || [];
      const availableZones = user?.role === 'sales' && user?.zoneId
        ? allZones.filter((zone) => zone._id === user.zoneId)
        : allZones;

      setClient(clientData);
      setZones(availableZones);
      setSegments(segmentsRes.data.data || []);

      setLegalName(clientData.legalName || '');
      setClientType(clientData.clientType || 'direct');
      setTaxId(clientData.taxId || '');
      setProvince(clientData.province || '');
      setCity(clientData.city || '');
      setZoneId(clientData.zoneId?._id || clientData.zoneId || '');
      setSegmentId(clientData.segmentId?._id || clientData.segmentId || '');
      setPhone(clientData.phone || '');
      setEmail(clientData.email || '');
      setNotes(clientData.notes || '');
      const existingLocations = clientData.locations?.length
        ? clientData.locations
        : (clientData.geo ? [{ ...clientData.geo, label: 'finca1' }] : []);
      setLocations(existingLocations.map((location, index) => ({
        _id: location._id,
        label: location.label ?? `finca${index + 1}`,
        lat: location.lat,
        lng: location.lng,
        accuracyMeters: location.accuracyMeters ?? null,
        capturedAt: location.capturedAt || null,
      }))); 
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar la ficha del cliente');
    }
    setLoading(false);
  }

  async function handleDelete() {
    const confirmed = window.confirm('Se va a borrar este cliente de los listados y búsquedas. El histórico de actividades se conservará. ¿Quieres continuar?');
    if (!confirmed) return;

    setDeleting(true);
    setError('');
    setSuccess('');
    try {
      await clientService.delete(id);
      navigate('/clients');
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo borrar el cliente');
    }
    setDeleting(false);
  }

  function updateLocation(index, patch) {
    setLocations((current) => current.map((location, currentIndex) => currentIndex === index ? { ...location, ...patch } : location));
  }

  function removeLocation(index) {
    setLocations((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function addCurrentLocation() {
    setError('');
    setSuccess('');
    setCapturingLocation(true);
    try {
      const captured = await capture();
      const label = `finca${locations.length + 1}`;
      const response = await clientService.setLocation(id, {
        label,
        lat: captured.lat,
        lng: captured.lng,
        accuracyMeters: captured.accuracyMeters ?? null,
        capturedAt: captured.capturedAt || new Date().toISOString(),
      });
      const updated = response.data.data;
      setClient(updated);
      setLocations((updated.locations?.length ? updated.locations : (updated.geo ? [{ ...updated.geo, label: 'finca1' }] : [])).map((location, index) => ({
        ...location,
        label: location.label ?? `finca${index + 1}`,
      })));
      setSuccess('Finca guardada correctamente');
    } catch {
      setError('No se pudo capturar o guardar la ubicación actual');
    }
    setCapturingLocation(false);
  }


  async function saveLocations() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await clientService.update(id, {
        locations: locations.map((location, index) => ({
          ...location,
          label: (location.label ?? '').trim() || `finca${index + 1}`,
        })),
      });
      const updated = response.data.data;
      setClient(updated);
      setLocations((updated.locations?.length ? updated.locations : (updated.geo ? [{ ...updated.geo, label: 'finca1' }] : [])).map((location, index) => ({
        ...location,
        label: location.label ?? `finca${index + 1}`,
      })));
      setSuccess('Fincas actualizadas correctamente');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.join(', ') || 'No se pudieron guardar las fincas');
    }
    setSaving(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        clientType,
        legalName,
        taxId: taxId || null,
        province,
        city,
        zoneId,
        segmentId,
        phone: phone || null,
        email: email || null,
        notes: notes || null,
        locations: locations.map((location, index) => ({
          ...location,
          label: (location.label ?? '').trim() || `finca${index + 1}`,
        })),
      };
      const response = await clientService.update(id, payload);
      const updated = response.data.data;
      setClient(updated);
      setZoneId(updated.zoneId?._id || updated.zoneId || zoneId);
      setSegmentId(updated.segmentId?._id || updated.segmentId || segmentId);
      setLocations((updated.locations?.length ? updated.locations : (updated.geo ? [{ ...updated.geo, label: 'finca1' }] : [])).map((location, index) => ({ ...location, label: location.label ?? `finca${index + 1}` }))); 
      setClientType(updated.clientType || clientType);
      setTaxId(updated.taxId || '');
      setSuccess('Cliente actualizado correctamente');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.join(', ') || 'No se pudo actualizar el cliente');
    }
    setSaving(false);
  }


  if (loading) {
    return <div className="text-center py-4"><div className="spinner-border text-primary" /></div>;
  }

  if (!client) {
    return (
      <div>
        <div className="alert alert-danger py-2">{error || 'Cliente no encontrado'}</div>
        <button className="btn btn-outline-secondary" onClick={() => navigate('/clients')}>Volver a clientes</button>
      </div>
    );
  }

  return (
    <div className="row g-3">
      <div className="col-12 col-xl-8">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h4 className="fw-bold mb-1">Ficha de cliente</h4>
            <div className="text-muted small">Consulta y edita la información del cliente seleccionado.</div>
          </div>
          <div className="d-flex gap-2">
            {user?.role !== 'sales' && (
              <button type="button" className="btn btn-outline-danger" onClick={handleDelete} disabled={deleting || saving}>
                {deleting ? 'Borrando...' : 'Borrar cliente'}
              </button>
            )}
            <Link to="/clients" className="btn btn-outline-secondary">Volver a clientes</Link>
          </div>
        </div>

        {error && <div className="alert alert-danger py-2">{error}</div>}
        {success && <div className="alert alert-success py-2">{success}</div>}

        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row g-2 mb-3">
                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold">Tipo de cliente *</label>
                  <select className="form-select" value={clientType} onChange={(e) => setClientType(e.target.value)} required>
                    <option value="direct">Directo</option>
                    <option value="indirect">Indirecto</option>
                  </select>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold">Razón social *</label>
                  <input type="text" className="form-control" value={legalName} onChange={(e) => setLegalName(e.target.value)} required />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold">CIF/NIF {clientType === 'direct' ? '*' : '(opcional)'}</label>
                  <input type="text" className="form-control" value={taxId} onChange={(e) => setTaxId(e.target.value)} required={clientType === 'direct'} />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold">Teléfono {clientType === 'indirect' ? '*' : ''}</label>
                  <input type="text" className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} required={clientType === 'indirect'} />
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold">Provincia *</label>
                  <input type="text" className="form-control" value={province} onChange={(e) => setProvince(e.target.value)} required />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold">Ciudad *</label>
                  <input type="text" className="form-control" value={city} onChange={(e) => setCity(e.target.value)} required />
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold">Representante *</label>
                  <select className="form-select" value={zoneId} onChange={(e) => setZoneId(e.target.value)} required disabled={user?.role === 'sales'}>
                    <option value="">Selecciona...</option>
                    {zones.map((zone) => <option key={zone._id} value={zone._id}>{zone.name}</option>)}
                  </select>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold">Segmento *</label>
                  <select className="form-select" value={segmentId} onChange={(e) => setSegmentId(e.target.value)} required>
                    <option value="">Selecciona...</option>
                    {segments.map((segment) => <option key={segment._id} value={segment._id}>{segment.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Email</label>
                <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Notas</label>
                <textarea className="form-control" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              <div className="d-flex gap-2">
                <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/clients')}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="col-12 col-xl-4">
        <div className="card">
          <div className="card-header fw-bold">Fincas y metadatos</div>
          <div className="card-body small">
            <p className="mb-2"><strong>ID:</strong> <code>{client._id}</code></p>
            <p className="mb-2"><strong>Tipo:</strong> {clientType === 'indirect' ? 'Indirecto' : 'Directo'}</p>
            <p className="mb-3"><strong>Creado por:</strong> {client.createdBy?.name || '-'}{client.createdBy?.email ? ` (${client.createdBy.email})` : ''}</p>

            <div className="d-flex justify-content-between align-items-center mb-2">
              <strong>Ubicaciones del cliente</strong>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={addCurrentLocation} disabled={capturingLocation || saving}>
                {capturingLocation ? 'Capturando...' : '+ Añadir ubicación actual'}
              </button>
            </div>
            <GeoStatus status={geoStatus} />
            {locations.length === 0 && <div className="text-muted mb-2">No hay fincas guardadas.</div>}
            <div className="d-grid gap-2 mt-2">
              {locations.length > 0 && (
                <button type="button" className="btn btn-sm btn-primary" onClick={saveLocations} disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar fincas'}
                </button>
              )}
              {locations.map((location, index) => {
                const link = mapsUrl(location.lat, location.lng);
                return (
                  <div key={location._id || index} className="border rounded p-2">
                    <label className="form-label mb-1">Etiqueta</label>
                    <input
                      type="text"
                      className="form-control form-control-sm mb-2"
                      value={location.label ?? ''}
                      placeholder={`finca${index + 1}`}
                      onChange={(e) => updateLocation(index, { label: e.target.value })}
                    />
                    <p className="mb-1"><strong>Latitud:</strong> {location.lat ?? '-'}</p>
                    <p className="mb-1"><strong>Longitud:</strong> {location.lng ?? '-'}</p>
                    <p className="mb-2"><strong>Precisión:</strong> {location.accuracyMeters != null ? `${Math.round(location.accuracyMeters)} m` : '-'}</p>
                    <div className="d-flex gap-2">
                      {link && <a href={link} target="_blank" rel="noreferrer" className="btn btn-outline-primary btn-sm">Mapa</a>}
                      <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => removeLocation(index)} disabled={saving}>Borrar</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
