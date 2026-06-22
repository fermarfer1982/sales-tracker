import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { activityService, catalogService, settingsService } from '../services';
import { useGeolocation } from '../hooks/useGeolocation';
import ClientAutocomplete from '../components/ClientAutocomplete';
import MultiClientAutocomplete from '../components/MultiClientAutocomplete';
import MultiProductAutocomplete from '../components/MultiProductAutocomplete';
import SaleItemsEditor from '../components/SaleItemsEditor';
import { GeoStatus, GeoAlert } from '../components/GeoStatus';
import { formatDate, formatDateTime, statusBadge, todayISO } from '../utils';

const STEPS = { IDLE: 'idle', CHECKIN_FORM: 'checkin_form', IN_PROGRESS: 'in_progress', CHECKOUT_FORM: 'checkout_form', DONE: 'done' };
const NEXT_ACTION_OPTIONS = [
  { value: 'call', label: 'Llamada' },
  { value: 'email', label: 'Email' },
  { value: 'visit', label: 'Visita' },
  { value: 'other', label: 'Otra' },
];

const START_VISIT_ACTIVITY_NAMES = new Set(['visita', 'feria', 'ensayo', 'comida']);

export default function ActivitiesTodayPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEPS.IDLE);
  const [activityTypes, setActivityTypes] = useState([]);
  const [products, setProducts] = useState([]);
  const [outcomes, setOutcomes] = useState([]);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [todayActivities, setTodayActivities] = useState([]);
  const [agenda, setAgenda] = useState({ summary: null, todayActivities: [], inProgressActivity: null, followUpsDueToday: [] });

  const [clientId, setClientId] = useState('');
  const [activityTypeId, setActivityTypeId] = useState('');
  const [productIds, setProductIds] = useState([]);
  const [outcomeId, setOutcomeId] = useState('');
  const [saleClosed, setSaleClosed] = useState(false);
  const [saleItems, setSaleItems] = useState([]);
  const [saleIntermediaryClientIds, setSaleIntermediaryClientIds] = useState([]);
  const [saleOrderNotes, setSaleOrderNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [nextActionType, setNextActionType] = useState('');
  const [nextActionNotes, setNextActionNotes] = useState('');

  const { geo, geoStatus, capture, reset } = useGeolocation();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requiredAccuracy, setRequiredAccuracy] = useState(30);

  useEffect(() => {
    loadCatalogs();
    loadTodayActivities();
    loadSettings();
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

  const startVisitActivityTypes = activityTypes.filter((type) => START_VISIT_ACTIVITY_NAMES.has(String(type.name || '').trim().toLowerCase()));

  async function loadSettings() {
    try {
      const res = await settingsService.get();
      const maxGps = Number(res.data?.data?.maxGpsAccuracyMeters);
      if (Number.isFinite(maxGps) && maxGps > 0) setRequiredAccuracy(maxGps);
    } catch {}
  }

  function openInProgressVisit(activity) {
    setCurrentActivity(activity);
    setStep(STEPS.IN_PROGRESS);
    setError('');
  }

  async function loadTodayActivities() {
    const today = todayISO();
    const [activitiesRes, agendaRes] = await Promise.all([
      activityService.myActivities({ from: today, to: today }),
      activityService.myAgenda({ date: today }),
    ]);
    setTodayActivities(activitiesRes.data.data || []);
    setAgenda(agendaRes.data.data || { summary: null, todayActivities: [], inProgressActivity: null, followUpsDueToday: [] });
  }

  async function handleStartVisit() {
    setError('');
    if (!clientId) return setError('Selecciona un cliente');
    if (!activityTypeId) return setError('Selecciona el tipo de actividad');
    setLoading(true);
    try {
      const capturedGeo = await capture({ desiredAccuracyMeters: requiredAccuracy, timeoutMs: 25000 });
      const res = await activityService.checkIn({
        clientId,
        activityTypeId,
        activityDate: todayISO(),
        geo: capturedGeo,
      });
      setCurrentActivity(res.data.data);
      setStep(STEPS.IN_PROGRESS);
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
    if (productIds.length === 0) return setError('Selecciona al menos un producto');
    if (!outcomeId) return setError('Selecciona el resultado');
    if (!notes || notes.length < 10) return setError('Las notas deben tener al menos 10 caracteres');
    if (saleClosed && saleItems.length === 0) return setError('Debes informar al menos un producto vendido');
    if (saleClosed && saleItems.some((item) => !item.productId || !item.quantity || Number(item.quantity) <= 0 || !Number.isInteger(Number(item.quantity)) || !item.unit || item.unitPrice === '' || Number(item.unitPrice) < 0)) {
      return setError('Revisa las líneas de venta: producto, cantidad entera, unidad y precio son obligatorios');
    }
    if (nextActionDate && !nextActionType) return setError('Selecciona el tipo de próxima acción');
    setLoading(true);
    try {
      const capturedGeo = await capture({ desiredAccuracyMeters: requiredAccuracy, timeoutMs: 25000 });
      await activityService.checkOut(currentActivity._id, {
        productId: productIds[0] || '', productIds, outcomeId, notes, nextActionDate: nextActionDate || null, nextActionType: nextActionDate ? nextActionType : null, nextActionNotes: nextActionNotes || null,
        sale: {
          isClosed: saleClosed,
          items: saleClosed ? saleItems.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity),
            unit: item.unit,
            unitPrice: Number(item.unitPrice),
          })) : [],
          quantity: null,
          unitPrice: null,
          intermediaryClientIds: saleClosed ? saleIntermediaryClientIds : [],
          orderNotes: saleClosed ? saleOrderNotes : null,
        },
        geo: capturedGeo,
      });
      setStep(STEPS.DONE);
      await loadTodayActivities();
      setTimeout(() => {
        setStep(STEPS.IDLE);
        setClientId(''); setActivityTypeId(''); setProductIds([]); setOutcomeId(''); setNotes('');
        setSaleClosed(false); setSaleItems([]); setSaleIntermediaryClientIds([]);
        setNextActionDate(''); setNextActionType(''); setNextActionNotes('');
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
      <div className="col-12 col-md-8 col-lg-6">
        <h4 className="fw-bold mb-3">Actividades de hoy</h4>

        {agenda.summary && (
          <div className="row g-2 mb-3">
            <div className="col-6 col-md-3">
              <div className="card h-100">
                <div className="card-body py-3 text-center">
                  <div className="fs-4 fw-bold text-primary">{agenda.summary.totalToday}</div>
                  <div className="small text-muted">Registros de hoy</div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card h-100">
                <div className="card-body py-3 text-center">
                  <div className="fs-4 fw-bold text-success">{agenda.summary.completedToday}</div>
                  <div className="small text-muted">Completadas</div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card h-100">
                <div className="card-body py-3 text-center">
                  <div className="fs-4 fw-bold text-warning">{agenda.summary.pendingToday}</div>
                  <div className="small text-muted">Pendientes</div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card h-100">
                <div className="card-body py-3 text-center">
                  <div className="fs-4 fw-bold text-secondary">{agenda.summary.followUpsDueToday}</div>
                  <div className="small text-muted">Seguimientos hoy</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {agenda.inProgressActivity && step === STEPS.IDLE && (
          <div className="alert alert-warning d-flex justify-content-between align-items-start gap-3">
            <div>
              <div className="fw-semibold">Tienes una visita en curso</div>
              <div className="small">
                {agenda.inProgressActivity.clientId?.legalName || 'Cliente'} · {agenda.inProgressActivity.activityTypeId?.name || 'Actividad'} · iniciada {formatDateTime(agenda.inProgressActivity.checkIn?.at)}
              </div>
            </div>
            <button className="btn btn-sm btn-warning" onClick={() => openInProgressVisit(agenda.inProgressActivity)}>Continuar</button>
          </div>
        )}

        {step === STEPS.DONE && (
          <div className="alert alert-success text-center">
            <strong>Visita registrada correctamente</strong>
          </div>
        )}

        {step === STEPS.IDLE && (
          <>
            <div className="card mb-3 card-action" onClick={() => setStep(STEPS.CHECKIN_FORM)}>
              <div className="card-body text-center py-4">
                <div style={{ fontSize: 48 }}>📍</div>
                <h5 className="mt-2 fw-bold">Iniciar visita</h5>
                <p className="text-muted mb-0">Registra el inicio de una visita a cliente</p>
              </div>
            </div>
            <div className="card card-action" onClick={() => navigate('/activities/quick')}>
              <div className="card-body text-center py-4">
                <div style={{ fontSize: 48 }}>⚡</div>
                <h5 className="mt-2 fw-bold">Registro rápido</h5>
                <p className="text-muted mb-0">Llamadas, emails y actividades sin check-in/out</p>
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
                <ClientAutocomplete value={clientId} onChange={(id) => setClientId(id)} allowCreate />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Tipo de actividad *</label>
                <select className="form-select" value={activityTypeId} onChange={e => setActivityTypeId(e.target.value)}>
                  <option value="">Selecciona...</option>
                  {startVisitActivityTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
              <div className="d-flex gap-2 mt-3">
                <button className="btn btn-outline-secondary flex-fill" onClick={() => setStep(STEPS.IDLE)}>Cancelar</button>
                <button className="btn btn-primary flex-fill btn-lg-mobile" onClick={handleStartVisit} disabled={loading || geoStatus === 'loading'}>
                  {loading ? <span className="spinner-border spinner-border-sm me-2" /> : '📍 '}
                  Iniciar visita
                </button>
              </div>
              <div className="mt-2 text-center">
                <GeoStatus status={geoStatus} />
                <small className="text-muted">Objetivo de precisión: ±{requiredAccuracy} m {geo?.accuracyMeters ? `(actual ±${Math.round(geo.accuracyMeters)} m)` : ''}</small>
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
                <label className="form-label fw-semibold">Productos *</label>
                <MultiProductAutocomplete
                  products={products}
                  value={productIds}
                  onChange={setProductIds}
                  placeholder="Buscar productos..."
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Resultado *</label>
                <select className="form-select" value={outcomeId} onChange={e => setOutcomeId(e.target.value)}>
                  <option value="">Selecciona...</option>
                  {outcomes.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
                </select>
              </div>
              <div className="form-check form-switch mb-3">
                <input
                  id="visit-sale-closed"
                  className="form-check-input"
                  type="checkbox"
                  checked={saleClosed}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSaleClosed(checked);
                    if (!checked) {
                      setSaleItems([]);
                      setSaleIntermediaryClientIds([]);
                      setSaleOrderNotes('');
                    }
                  }}
                />
                <label className="form-check-label fw-semibold" htmlFor="visit-sale-closed">
                  Se ha cerrado una venta en esta visita
                </label>
              </div>
              {saleClosed && (
                <div className="border rounded p-3 mb-3 bg-light-subtle">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Productos vendidos *</label>
                    <SaleItemsEditor products={products} items={saleItems} onChange={setSaleItems} />
                  </div>
                  <div className="mb-2">
                    <label className="form-label fw-semibold">Cliente Directo</label>
                    <MultiClientAutocomplete
                      value={saleIntermediaryClientIds}
                      onChange={setSaleIntermediaryClientIds}
                      excludedClientId={currentActivity?.clientId?._id || currentActivity?.clientId}
                    />
                    <div className="form-text">
                      Si el cliente actual es indirecto, indicar arriba los clientes directos asociados a la venta
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="form-label fw-semibold">Notas del pedido</label>
                    <textarea className="form-control" rows={2} value={saleOrderNotes} onChange={e => setSaleOrderNotes(e.target.value)} placeholder="Delegación, dirección de envío, observaciones del pedido..." />
                    <div className="form-text">Se enviará por email solo si el cliente actual es directo y no indicas Cliente Directo.</div>
                  </div>
                </div>
              )}
              <div className="mb-3">
                <label className="form-label fw-semibold">Notas * (mín. 10 caracteres)</label>
                <textarea className="form-control" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Describe el resultado de la visita..." />
                <div className="form-text">{notes.length} / mín. 10 caracteres</div>
              </div>
              <div className="mb-3">
                <label className="form-label">Próxima acción (opcional)</label>
                <input
                  type="date"
                  className="form-control"
                  value={nextActionDate}
                  onChange={e => {
                    const value = e.target.value;
                    setNextActionDate(value);
                    if (!value) setNextActionType('');
                  }}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Tipo de próxima acción</label>
                <select
                  className="form-select"
                  value={nextActionType}
                  onChange={e => setNextActionType(e.target.value)}
                  disabled={!nextActionDate}
                >
                  <option value="">Selecciona...</option>
                  {NEXT_ACTION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
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
                <small className="text-muted">Objetivo de precisión: ±{requiredAccuracy} m {geo?.accuracyMeters ? `(actual ±${Math.round(geo.accuracyMeters)} m)` : ''}</small>
              </div>
              <p className="text-muted small mt-2 text-center">La geolocalización es obligatoria para finalizar la visita.</p>
            </div>
          </div>
        )}

        {todayActivities.length > 0 && step === STEPS.IDLE && (
          <div className="mt-4">
            <h6 className="fw-bold">Actividades registradas hoy</h6>
            {todayActivities.map(a => (
              <div key={a._id} className="card mb-2">
                <div className="card-body py-2">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-semibold">{a.clientId?.legalName || 'Cliente'}</span>
                    <span className={`badge ${a.status === 'completed' ? 'bg-success' : a.status === 'in_progress' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                      {a.status}
                    </span>
                  </div>
                  <div className="text-muted small">{a.activityTypeId?.name} · {a.durationMinutes ? `${a.durationMinutes} min` : ''}</div>
                  {a.status === 'in_progress' && <button className="btn btn-sm btn-outline-warning mt-2" onClick={() => openInProgressVisit(a)}>Continuar visita</button>}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === STEPS.IDLE && (
          <>
            <div className="card mt-3 mb-3">
              <div className="card-header fw-bold">Seguimientos pendientes para hoy</div>
              <div className="card-body">
                {agenda.followUpsDueToday?.length ? (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead className="table-light">
                        <tr><th>Cliente</th><th>Tipo</th><th>Fecha objetivo</th><th>Resultado previo</th></tr>
                      </thead>
                      <tbody>
                        {agenda.followUpsDueToday.map((item) => (
                          <tr key={item._id}>
                            <td>{item.clientId?.legalName || '-'}</td>
                            <td>{item.activityTypeId?.name || '-'}</td>
                            <td>{formatDate(item.nextActionDate)}</td>
                            <td>{item.outcomeId?.name || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-muted">No tienes seguimientos pendientes hoy.</div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header fw-bold">Resumen operativo de hoy</div>
              <div className="card-body">
                {todayActivities.length === 0 ? (
                  <div className="text-muted">Todavia no hay actividades registradas hoy.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead className="table-light">
                        <tr><th>Cliente</th><th>Tipo</th><th>Estado</th><th>Resultado</th><th>Duracion</th></tr>
                      </thead>
                      <tbody>
                        {todayActivities.map((activity) => {
                          const badge = statusBadge(activity.status);
                          return (
                            <tr key={activity._id}>
                              <td>{activity.clientId?.legalName || '-'}</td>
                              <td>{activity.activityTypeId?.name || '-'}</td>
                              <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                              <td>{activity.outcomeId?.name || '-'}</td>
                              <td>{activity.durationMinutes ? `${activity.durationMinutes} min` : '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
