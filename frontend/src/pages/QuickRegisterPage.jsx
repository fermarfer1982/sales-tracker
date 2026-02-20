import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { activityService, catalogService } from '../services';
import { useGeolocation } from '../hooks/useGeolocation';
import ClientAutocomplete from '../components/ClientAutocomplete';
import { GeoStatus, GeoAlert } from '../components/GeoStatus';
import { todayISO } from '../utils';

export default function QuickRegisterPage() {
  const navigate = useNavigate();
  const [activityTypes, setActivityTypes] = useState([]);
  const [products, setProducts] = useState([]);
  const [outcomes, setOutcomes] = useState([]);

  const [clientId, setClientId] = useState('');
  const [activityTypeId, setActivityTypeId] = useState('');
  const [productId, setProductId] = useState('');
  const [outcomeId, setOutcomeId] = useState('');
  const [activityDate, setActivityDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [nextActionNotes, setNextActionNotes] = useState('');

  const { geo, geoStatus, capture, reset } = useGeolocation();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([catalogService.list('activity-types'), catalogService.list('products'), catalogService.list('outcomes')])
      .then(([at, pr, oc]) => {
        setActivityTypes(at.data.data);
        setProducts(pr.data.data);
        setOutcomes(oc.data.data);
      });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!clientId) return setError('Selecciona un cliente');
    if (!notes || notes.length < 10) return setError('Las notas deben tener al menos 10 caracteres');
    if (!durationMinutes || Number(durationMinutes) <= 0) return setError('La duración debe ser mayor a 0');
    setLoading(true);
    try {
      const capturedGeo = await capture();
      await activityService.quick({
        clientId, activityTypeId, productId, outcomeId, activityDate, notes,
        durationMinutes: Number(durationMinutes),
        nextActionDate: nextActionDate || null,
        nextActionNotes: nextActionNotes || null,
        geo: capturedGeo,
      });
      setSuccess(true);
      setTimeout(() => navigate('/activities/my'), 1500);
    } catch (err) {
      if (err.message === 'denied' || err.message === 'unavailable' || err.message === 'timeout') {
        setError('');
      } else {
        setError(err.response?.data?.message || err.response?.data?.errors?.join(', ') || 'Error al guardar');
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return <div className="alert alert-success text-center mt-4"><strong>Actividad registrada correctamente</strong></div>;
  }

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-md-8 col-lg-6">
        <h4 className="fw-bold mb-3">Registro rápido de actividad</h4>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <GeoAlert status={geoStatus} onRetry={reset} />
        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-semibold">Fecha *</label>
                <input type="date" className="form-control" value={activityDate} onChange={e => setActivityDate(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Cliente *</label>
                <ClientAutocomplete value={clientId} onChange={(id) => setClientId(id)} />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Tipo de actividad *</label>
                <select className="form-select" value={activityTypeId} onChange={e => setActivityTypeId(e.target.value)} required>
                  <option value="">Selecciona...</option>
                  {activityTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label fw-semibold">Producto *</label>
                  <select className="form-select" value={productId} onChange={e => setProductId(e.target.value)} required>
                    <option value="">Selecciona...</option>
                    {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label fw-semibold">Resultado *</label>
                  <select className="form-select" value={outcomeId} onChange={e => setOutcomeId(e.target.value)} required>
                    <option value="">Selecciona...</option>
                    {outcomes.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Notas * (mín. 10 caracteres)</label>
                <textarea className="form-control" rows={3} value={notes} onChange={e => setNotes(e.target.value)} required />
                <div className="form-text">{notes.length} caracteres</div>
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Duración (minutos) *</label>
                <input type="number" className="form-control" min={1} value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} required />
              </div>
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label">Próxima acción</label>
                  <input type="date" className="form-control" value={nextActionDate} onChange={e => setNextActionDate(e.target.value)} />
                </div>
                <div className="col-6">
                  <label className="form-label">Notas próxima acción</label>
                  <input type="text" className="form-control" value={nextActionNotes} onChange={e => setNextActionNotes(e.target.value)} />
                </div>
              </div>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <GeoStatus status={geoStatus} />
                <small className="text-muted">Se capturará GPS al guardar</small>
              </div>
              <button type="submit" className="btn btn-primary w-100 btn-lg" disabled={loading || geoStatus === 'loading'}>
                {loading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                Guardar actividad
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
