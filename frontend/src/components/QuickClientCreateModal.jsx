import React, { useEffect, useRef, useState } from 'react';
import { clientService, catalogService } from '../services';
import { useAuth } from '../context/AuthContext';

export default function QuickClientCreateModal({ open, initialName = '', onClose, onCreated }) {
  const { user } = useAuth();
  const [zones, setZones] = useState([]);
  const [segments, setSegments] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

  const debounceRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    setLegalName(initialName || '');
    setClientType('direct');
    setTaxId('');
    setProvince('');
    setCity('');
    setZoneId(user?.role === 'sales' && user?.zoneId ? user.zoneId : '');
    setSegmentId('');
    setPhone('');
    setEmail('');
    setNotes('');
    setSuggestions([]);
    setError('');

    setLoadingMeta(true);
    Promise.all([catalogService.list('zones'), catalogService.list('segments')])
      .then(([zonesRes, segmentsRes]) => {
        const zoneList = zonesRes.data.data || [];
        const filteredZones = user?.role === 'sales' && user?.zoneId
          ? zoneList.filter((zone) => zone._id === user.zoneId)
          : zoneList;
        setZones(filteredZones);
        setSegments(segmentsRes.data.data || []);
      })
      .catch(() => {
        setZones([]);
        setSegments([]);
      })
      .finally(() => setLoadingMeta(false));
  }, [open, initialName, user?.role, user?.zoneId]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!open) return;
    if (legalName.trim().length < 3 && taxId.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await clientService.suggest({
          name: legalName.trim().length >= 3 ? legalName.trim() : '',
          taxId: taxId.trim().length >= 3 ? taxId.trim() : '',
        });
        setSuggestions(response.data.data || []);
      } catch {
        setSuggestions([]);
      }
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [open, legalName, taxId]);

  async function handleSubmit(e) {
    e?.preventDefault?.();
    setError('');
    setSaving(true);
    try {
      const response = await clientService.create({
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
      });
      const createdClient = response.data.data;
      onCreated?.(createdClient);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.join(', ') || 'No se pudo crear el cliente');
    }
    setSaving(false);
  }

  if (!open) return null;

  return (
    <div
      className="modal d-block"
      tabIndex="-1"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      data-testid="quick-client-modal"
    >
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <div>
              <h5 className="modal-title mb-1">Crear cliente nuevo</h5>
              <div className="small text-muted">Alta rápida sin salir del flujo actual.</div>
            </div>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            {error && <div className="alert alert-danger py-2">{error}</div>}
            {suggestions.length > 0 && (
              <div className="alert alert-warning py-2">
                <strong>Posibles duplicados detectados</strong>
                <ul className="mb-0 mt-1">
                  {suggestions.map((item) => (
                    <li key={item._id}>{item.legalName} - <code>{item.taxId}</code> - {item.city}</li>
                  ))}
                </ul>
              </div>
            )}

            {loadingMeta ? (
              <div className="text-center py-3"><div className="spinner-border text-primary" /></div>
            ) : (
              <>
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
                    <input
                      type="text"
                      className="form-control"
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                      required
                      data-testid="quick-client-legal-name"
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold">CIF/NIF {clientType === 'direct' ? '*' : '(opcional)'}</label>
                    <input
                      type="text"
                      className="form-control"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      required={clientType === 'direct'}
                      placeholder="B12345674"
                      data-testid="quick-client-tax-id"
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold">Teléfono {clientType === 'indirect' ? '*' : ''}</label>
                    <input
                      type="text"
                      className="form-control"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required={clientType === 'indirect'}
                      data-testid="quick-client-phone"
                    />
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold">Provincia *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      required
                      data-testid="quick-client-province"
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold">Ciudad *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                      data-testid="quick-client-city"
                    />
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold">Representante *</label>
                    <select
                      className="form-select"
                      value={zoneId}
                      onChange={(e) => setZoneId(e.target.value)}
                      required
                      disabled={user?.role === 'sales'}
                      data-testid="quick-client-zone"
                    >
                      <option value="">Selecciona...</option>
                      {zones.map((zone) => <option key={zone._id} value={zone._id}>{zone.name}</option>)}
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold">Segmento *</label>
                    <select
                      className="form-select"
                      value={segmentId}
                      onChange={(e) => setSegmentId(e.target.value)}
                      required
                      data-testid="quick-client-segment"
                    >
                      <option value="">Selecciona...</option>
                      {segments.map((segment) => <option key={segment._id} value={segment._id}>{segment.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="quick-client-email"
                  />
                </div>

                <div>
                  <label className="form-label fw-semibold">Notas</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Opcional"
                    data-testid="quick-client-notes"
                  />
                </div>
              </>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={saving || loadingMeta}
              data-testid="quick-client-submit"
            >
              {saving ? 'Guardando...' : 'Crear y seleccionar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
