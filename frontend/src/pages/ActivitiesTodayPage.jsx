import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { activityService, catalogService } from '../services';
import { useGeolocation } from '../hooks/useGeolocation';
import ClientAutocomplete from '../components/ClientAutocomplete';
import { GeoStatus, GeoAlert } from '../components/GeoStatus';
import { formatDateTime, todayISO } from '../utils';

const STEPS = { IDLE: 'idle', CHECKIN_FORM: 'checkin_form', IN_PROGRESS: 'in_progress', DONE: 'done' };

export default function ActivitiesTodayPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEPS.IDLE);
  const [activityTypes, setActivityTypes] = useState([]);
  const [products, setProducts] = useState([]);
  const [outcomes, setOutcomes] = useState([]);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [todayActivities, setTodayActivities] = useState([]);
  const [agenda, setAgenda] = useState(null);

  const [clientId, setClientId] = useState('');
  const [activityTypeId, setActivityTypeId] = useState('');
  const [productId, setProductId] = useState('');
  const [outcomeId, setOutcomeId] = useState('');
  const [notes, setNotes] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [nextActionNotes, setNextActionNotes] = useState('');

  const { geoStatus, capture, reset } = useGeolocation();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCatalogs();
    loadAgendaAndToday();
  }, []);

  async function loadCatalogs() {
    const [at, pr, oc] = await Promise.all([
      catalogService.list('activity-types'),
      catalogService.list('products'),
      catalogService.list('outcomes'),
    ]);
    setActivityTypes(at.data.data);
    setProducts(pr.data.data);
    setOutcomes(oc.data.data);
  }

  async function loadAgendaAndToday() {
    const today = todayISO();
    const [activitiesRes, agendaRes] = await Promise.all([
      activityService.myActivities({ from: today, to: today, limit: 100 }),
      activityService.myAgenda({ date: today }),
    ]);
    setTodayActivities(activitiesRes.data.data);
    setAgenda(agendaRes.data.data);
  }

  function openCheckInForm(prefill = {}) {
    setError('');
    setClientId(prefill.clientId || '');
    setActivityTypeId(prefill.activityTypeId || '');
    setStep(STEPS.CHECKIN_FORM);
  }

  function startFromFollowUp(activity) {
    openCheckInForm({
      clientId: activity?.clientId?._id || '',
      activityTypeId: activity?.activityTypeId?._id || '',
    });
  }

  function resumeInProgress(activity) {
    setError('');
    setCurrentActivity(activity);
    setStep(STEPS.IN_PROGRESS);
  }

  async function handleStartVisit() {
    setError('');
    if (!clientId) return setError('Selecciona un cliente');
    if (!activityTypeId) return setError('Selecciona el tipo de actividad');
    setLoading(true);
    try {
      const capturedGeo = await capture();
      const res = await activityService.checkIn({
        clientId,
        activityTypeId,
        activityDate: todayISO(),
        geo: capturedGeo,
      });
      setCurrentActivity(res.data.data);
      setStep(STEPS.IN_PROGRESS);
      await loadAgendaAndToday();
    } catch (err) {
      if (err.message === 'denied' || err.message === 'unavailable' || err.message === 'timeout') {
        setError('');
      } else {
        setError(err.response?.data?.message || 'Error al iniciar visita');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckout() {
    setError('');
    if (!productId) return setError('Selecciona un producto');
    if (!outcomeId) return setError('Selecciona el resultado');
    if (!notes || notes.length < 10) return setError('Las notas deben tener al menos 10 caracteres');
    setLoading(true);
    try {
      const capturedGeo = await capture();
      await activityService.checkOut(currentActivity._id, {
        productId,
        outcomeId,
        notes,
        nextActionDate: nextActionDate || null,
        nextActionNotes: nextActionNotes || null,
        geo: capturedGeo,
      });
      setStep(STEPS.DONE);
      await loadAgendaAndToday();
      setTimeout(() => {
        setStep(STEPS.IDLE);
        setClientId('');
        setActivityTypeId('');
        setProductId('');
        setOutcomeId('');
        setNotes('');
        setNextActionDate('');
        setNextActionNotes('');
        setCurrentActivity(null);
        reset();
      }, 2000);
    } catch (err) {
      if (err.message === 'denied' || err.message === 'unavailable' || err.message === 'timeout') {
        setError('');
      } else {
        setError(err.response?.data?.message || 'Error al finalizar visita');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-xl-10">
        <h4 className="fw-bold mb-3">Agenda comercial de hoy</h4>

        {step === STEPS.DONE && (
          <div className="alert alert-success text-center">
            <strong>Visita registrada correctamente</strong>
          </div>
        )}

        {step === STEPS.IDLE && (
          <>
            <div className="card mb-3 border-primary-subtle">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                  <h5 className="mb-0">Agenda inteligente</h5>
                  <div className="d-flex gap-2">
                    <span className="badge text-bg-light">Hoy: {agenda?.summary?.totalToday || 0}</span>
                    <span className="badge text-bg-success">Completadas: {agenda?.summary?.completedToday || 0}</span>
                    <span className="badge text-bg-warning">Pendientes: {agenda?.summary?.pendingToday || 0}</span>
                  </div>
                </div>

                {agenda?.inProgressActivity ? (
                  <div className="alert alert-warning d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <div className="fw-semibold">Tienes una visita en curso</div>
                      <div className="small text-muted">
                        {agenda.inProgressActivity.clientId?.legalName} · Iniciada {formatDateTime(agenda.inProgressActivity.checkIn?.at)}
                      </div>
                    </div>
                    <button className="btn btn-sm btn-dark" onClick={() => resumeInProgress(agenda.inProgressActivity)}>
                      Reanudar
                    </button>
                  </div>
                ) : (
                  <p className="text-muted mb-3">No hay visitas en curso. Puedes empezar por pendientes de seguimiento o crear una nueva visita.</p>
                )}

                <div className="mb-3">
                  <h6 className="fw-semibold">Seguimientos previstos para hoy</h6>
                  {agenda?.followUpsDueToday?.length ? (
                    <div className="list-group">
                      {agenda.followUpsDueToday.slice(0, 5).map((item) => (
                        <div key={item._id} className="list-group-item d-flex justify-content-between align-items-start gap-2">
                          <div>
                            <div className="fw-semibold">{item.clientId?.legalName}</div>
                            <div className="small text-muted">
                              {item.activityTypeId?.name || 'Actividad'} · Programado {formatDateTime(item.nextActionDate)}
                            </div>
                            {item.nextActionNotes && <div className="small mt-1">{item.nextActionNotes}</div>}
                          </div>
                          <button className="btn btn-sm btn-outline-primary" onClick={() => startFromFollowUp(item)}>
                            Iniciar visita
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted mb-0">No tienes seguimientos pendientes para hoy.</p>
                  )}
                </div>

                <div className="d-flex gap-2 flex-wrap">
                  <button className="btn btn-primary" onClick={() => openCheckInForm()}>
                    📍 Nueva visita
                  </button>
                  <button className="btn btn-outline-secondary" onClick={() => navigate('/activities/quick')}>
                    ⚡ Registro rápido
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {step === STEPS.CHECKIN_FORM && (
          <div className="card">
            <div className="card-header fw-bold">Iniciar visita</div>
            <div className="card-body">
              {error && <div className="alert alert-danger py-2">{error}</div>}
              <GeoAlert status={geoStatus} onRetry={() => { reset(); }} />
              <div className="mb-3">
                <label className="form-label fw-semibold">Cliente *</label>
                <ClientAutocomplete value={clientId} onChange={(id) => setClientId(id)} />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Tipo de actividad *</label>
                <select className="form-select" value={activityTypeId} onChange={e => setActivityTypeId(e.target.value)}>
                  <option value="">Selecciona...</option>
                  {activityTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
              <div className="d-flex gap-2 mt-3">
                <button className="btn btn-outline-secondary flex-fill" onClick={() => setStep(STEPS.IDLE)}>Volver</button>
                <button className="btn btn-primary flex-fill btn-lg-mobile" onClick={handleStartVisit} disabled={loading || geoStatus === 'loading'}>
                  {loading ? <span className="spinner-border spinner-border-sm me-2" /> : '📍 '}
                  Iniciar visita
                </button>
              </div>
              <div className="mt-2 text-center">
                <GeoStatus status={geoStatus} />
              </div>
            </div>
          </div>
        )}

        {step === STEPS.IN_PROGRESS && (
          <div className="card border-warning">
            <div className="card-header bg-warning fw-bold">Visita en curso</div>
            <div className="card-body">
              {error && <div className="alert alert-danger py-2">{error}</div>}
              <GeoAlert status={geoStatus} onRetry={() => { reset(); }} />
              <p className="text-muted small">Iniciada: {formatDateTime(currentActivity?.checkIn?.at)}</p>
              <div className="mb-3">
                <label className="form-label fw-semibold">Producto *</label>
                <select className="form-select" value={productId} onChange={e => setProductId(e.target.value)}>
                  <option value="">Selecciona...</option>
                  {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Resultado *</label>
                <select className="form-select" value={outcomeId} onChange={e => setOutcomeId(e.target.value)}>
                  <option value="">Selecciona...</option>
                  {outcomes.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Notas * (mín. 10 caracteres)</label>
                <textarea className="form-control" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Describe el resultado de la visita..." />
                <div className="form-text">{notes.length} / mín. 10 caracteres</div>
              </div>
              <div className="mb-3">
                <label className="form-label">Próxima acción (opcional)</label>
                <input type="date" className="form-control" value={nextActionDate} onChange={e => setNextActionDate(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label">Notas próxima acción</label>
                <input type="text" className="form-control" value={nextActionNotes} onChange={e => setNextActionNotes(e.target.value)} />
              </div>
              <button className="btn btn-success w-100 btn-lg-mobile" onClick={handleCheckout} disabled={loading || geoStatus === 'loading'}>
                {loading ? <span className="spinner-border spinner-border-sm me-2" /> : '✓ '}
                Finalizar visita
              </button>
              <div className="mt-2 text-center">
                <GeoStatus status={geoStatus} />
              </div>
              <p className="text-muted small mt-2 text-center">La geolocalización es obligatoria para finalizar la visita.</p>
            </div>
          </div>
        )}

        {todayActivities.length > 0 && step === STEPS.IDLE && (
          <div className="mt-4">
            <h6 className="fw-bold">Actividad registrada hoy</h6>
            {todayActivities.slice(0, 8).map(a => (
              <div key={a._id} className="card mb-2">
                <div className="card-body py-2">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-semibold">{a.clientId?.legalName || 'Cliente'}</span>
                    <span className={`badge ${a.status === 'completed' ? 'bg-success' : a.status === 'in_progress' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                      {a.status}
                    </span>
                  </div>
                  <div className="text-muted small">{a.activityTypeId?.name} · {a.durationMinutes ? `${a.durationMinutes} min` : ''}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
