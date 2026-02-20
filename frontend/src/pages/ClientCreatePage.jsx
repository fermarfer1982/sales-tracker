import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientService, catalogService } from '../services';
import { useGeolocation } from '../hooks/useGeolocation';
import { GeoStatus } from '../components/GeoStatus';

export default function ClientCreatePage() {
  const navigate = useNavigate();
  const [zones, setZones] = useState([]);
  const [segments, setSegments] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  const [legalName, setLegalName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [segmentId, setSegmentId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [saveGeo, setSaveGeo] = useState(false);

  const { geo, geoStatus, capture } = useGeolocation();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    Promise.all([catalogService.list('zones'), catalogService.list('segments')])
      .then(([z, s]) => { setZones(z.data.data); setSegments(s.data.data); });
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (legalName.length < 3 && taxId.length < 3) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await clientService.suggest({ name: legalName.length >= 3 ? legalName : '', taxId: taxId.length >= 3 ? taxId : '' });
        setSuggestions(res.data.data || []);
      } catch { setSuggestions([]); }
    }, 500);
  }, [legalName, taxId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let geoData = null;
      if (saveGeo) {
        try { geoData = await capture(); } catch {}
      }
      await clientService.create({ legalName, taxId, province, city, zoneId, segmentId, phone: phone || null, email: email || null, notes: notes || null, geo: geoData });
      navigate('/clients');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.join(', ') || 'Error al crear cliente');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-md-8 col-lg-6">
        <h4 className="fw-bold mb-3">Nuevo cliente</h4>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        {suggestions.length > 0 && (
          <div className="alert alert-warning">
            <strong>Posibles duplicados:</strong>
            <ul className="mb-0 mt-1">
              {suggestions.map(s => <li key={s._id}>{s.legalName} - <code>{s.taxId}</code> - {s.city}</li>)}
            </ul>
          </div>
        )}
        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row g-2 mb-3">
                <div className="col-12">
                  <label className="form-label fw-semibold">Razón social *</label>
                  <input type="text" className="form-control" value={legalName} onChange={e => setLegalName(e.target.value)} required />
                </div>
                <div className="col-12">
                  <label className="form-label fw-semibold">CIF/NIF *</label>
                  <input type="text" className="form-control" value={taxId} onChange={e => setTaxId(e.target.value)} required placeholder="B12345674" />
                </div>
              </div>
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label fw-semibold">Provincia *</label>
                  <input type="text" className="form-control" value={province} onChange={e => setProvince(e.target.value)} required />
                </div>
                <div className="col-6">
                  <label className="form-label fw-semibold">Ciudad *</label>
                  <input type="text" className="form-control" value={city} onChange={e => setCity(e.target.value)} required />
                </div>
              </div>
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label fw-semibold">Zona *</label>
                  <select className="form-select" value={zoneId} onChange={e => setZoneId(e.target.value)} required>
                    <option value="">Selecciona...</option>
                    {zones.map(z => <option key={z._id} value={z._id}>{z.name}</option>)}
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label fw-semibold">Segmento *</label>
                  <select className="form-select" value={segmentId} onChange={e => setSegmentId(e.target.value)} required>
                    <option value="">Selecciona...</option>
                    {segments.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label">Teléfono</label>
                  <input type="text" className="form-control" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <div className="col-6">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Notas</label>
                <textarea className="form-control" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              <div className="mb-3 form-check">
                <input type="checkbox" className="form-check-input" id="saveGeo" checked={saveGeo} onChange={e => setSaveGeo(e.target.checked)} />
                <label className="form-check-label" htmlFor="saveGeo">
                  Guardar mi ubicación actual como ubicación del cliente
                </label>
                {saveGeo && <div className="mt-1"><GeoStatus status={geoStatus} /></div>}
              </div>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-outline-secondary flex-fill" onClick={() => navigate('/clients')}>Cancelar</button>
                <button type="submit" className="btn btn-primary flex-fill" disabled={loading}>
                  {loading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                  Guardar cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
