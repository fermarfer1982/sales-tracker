import React, { useEffect, useMemo, useState } from 'react';
import { activityService, catalogService, userService } from '../services';
import { todayISO, formatDate, toLocalDateInputValue, parseDateInputAsLocal } from '../utils';
import ClientAutocomplete from '../components/ClientAutocomplete';
import { useAuth } from '../context/AuthContext';

function addDaysIso(baseIso, days) {
  const date = new Date(`${baseIso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const NEXT_ACTION_TYPE_LABELS = {
  call: 'Llamada',
  email: 'Email',
  visit: 'Visita',
  other: 'Otra',
};

export default function AgendaPage() {
  const { user } = useAuth();

  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(() => addDaysIso(todayISO(), 30));
  const [selectedUserId, setSelectedUserId] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');

  const [activityTypes, setActivityTypes] = useState([]);
  const [salesUsers, setSalesUsers] = useState([]);

  const [clientId, setClientId] = useState('');
  const [activityTypeId, setActivityTypeId] = useState('');
  const [activityDate, setActivityDate] = useState(todayISO());
  const [notes, setNotes] = useState('');

  const [editing, setEditing] = useState(null);
  const [editClientId, setEditClientId] = useState('');
  const [editActivityTypeId, setEditActivityTypeId] = useState('');
  const [editActivityDate, setEditActivityDate] = useState(todayISO());
  const [editNotes, setEditNotes] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [activeAlertFilter, setActiveAlertFilter] = useState('all');
  const [editingFollowUp, setEditingFollowUp] = useState(null);
  const [editFollowUpDate, setEditFollowUpDate] = useState(todayISO());
  const [editFollowUpType, setEditFollowUpType] = useState('');
  const [editFollowUpNotes, setEditFollowUpNotes] = useState('');

  const [calendarData, setCalendarData] = useState({ visits: [], alerts: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    catalogService.list('activity-types').then(res => setActivityTypes(res.data.data || [])).catch(() => setActivityTypes([]));

    if (user?.role === 'admin' || user?.role === 'manager') {
      userService.options()
        .then(res => setSalesUsers((res.data.data || []).filter(u => u.role === 'sales' && u.isActive)))
        .catch(() => setSalesUsers([]));
    }
  }, [user?.role]);

  useEffect(() => {
    loadCalendar();
  }, [from, to, selectedUserId]);

  async function loadCalendar() {
    setLoading(true);
    setError('');
    try {
      const params = { from, to };
      if ((user?.role === 'admin' || user?.role === 'manager') && selectedUserId) {
        params.userId = selectedUserId;
      }
      const res = await activityService.calendar(params);
      setCalendarData(res.data.data || { visits: [], alerts: [] });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar la agenda');
    }
    setLoading(false);
  }

  async function handleSchedule(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { clientId, activityTypeId, activityDate, notes: notes || null };
      if (user?.role === 'admin' || user?.role === 'manager') payload.userId = assignedUserId;
      await activityService.schedule(payload);
      setClientId('');
      setActivityTypeId('');
      setActivityDate(todayISO());
      setNotes('');
      setAssignedUserId('');
      setShowComposer(false);
      await loadCalendar();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo agendar la visita');
    }
    setSaving(false);
  }

  function openEdit(visit) {
    setEditing(visit);
    setEditClientId(visit.clientId?._id || '');
    setEditActivityTypeId(visit.activityTypeId?._id || '');
    setEditActivityDate(toLocalDateInputValue(visit.activityDate));
    setEditNotes(visit.notes || '');
  }

  async function handleUpdateSchedule(e) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      await activityService.updateSchedule(editing._id, {
        clientId: editClientId,
        activityTypeId: editActivityTypeId,
        activityDate: editActivityDate,
        notes: editNotes || null,
      });
      setEditing(null);
      await loadCalendar();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo actualizar la visita agendada');
    }
    setSaving(false);
  }

  function openFollowUpEdit(alert) {
    setEditingFollowUp(alert);
    setEditFollowUpDate(toLocalDateInputValue(alert.nextActionDate || alert.date || new Date()));
    setEditFollowUpType(alert.nextActionType || '');
    setEditFollowUpNotes(alert.nextActionNotes || '');
  }

  async function handleUpdateFollowUp(e) {
    e.preventDefault();
    if (!editingFollowUp) return;
    setSaving(true);
    setError('');
    try {
      await activityService.updateFollowUp(editingFollowUp.activityId, {
        nextActionDate: editFollowUpDate,
        nextActionType: editFollowUpType,
        nextActionNotes: editFollowUpNotes || null,
      });
      setEditingFollowUp(null);
      await loadCalendar();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo actualizar el seguimiento');
    }
    setSaving(false);
  }

  async function handleCompleteFollowUp(alert) {
    if (!window.confirm('¿Marcar este seguimiento como completado?')) return;
    setSaving(true);
    setError('');
    try {
      await activityService.completeFollowUp(alert.activityId);
      await loadCalendar();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo completar el seguimiento');
    }
    setSaving(false);
  }

  async function handleDeleteSchedule(id) {
    if (!window.confirm('¿Seguro que quieres eliminar este registro agendado?')) return;
    setSaving(true);
    setError('');
    try {
      await activityService.deleteSchedule(id);
      await loadCalendar();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo eliminar el registro agendado');
    }
    setSaving(false);
  }

  const groupedVisits = useMemo(() => {
    const map = {};
    (calendarData.visits || []).forEach(v => {
      const key = toLocalDateInputValue(v.activityDate);
      if (!map[key]) map[key] = [];
      map[key].push(v);
    });
    return map;
  }, [calendarData]);

  const dates = useMemo(() => {
    const result = [];
    const start = parseDateInputAsLocal(from);
    const end = parseDateInputAsLocal(to);
    if (!start || !end) return result;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) result.push(new Date(d));
    return result;
  }, [from, to]);

  const alertStats = useMemo(() => {
    const base = {
      all: { label: 'Todos', count: 0, cls: 'btn-outline-secondary' },
      overdue_followup: { label: 'Vencidos', count: 0, cls: 'btn-outline-danger' },
      due_followup: { label: 'Seguimientos', count: 0, cls: 'btn-outline-warning' },
      in_progress: { label: 'En curso', count: 0, cls: 'btn-outline-primary' },
      scheduled: { label: 'Agendados', count: 0, cls: 'btn-outline-dark' },
    };

    (calendarData.alerts || []).forEach((alert) => {
      base.all.count += 1;
      if (base[alert.kind]) base[alert.kind].count += 1;
    });

    return base;
  }, [calendarData.alerts]);

  const filteredAlerts = useMemo(() => {
    if (activeAlertFilter === 'all') return calendarData.alerts || [];
    return (calendarData.alerts || []).filter((alert) => alert.kind === activeAlertFilter);
  }, [calendarData.alerts, activeAlertFilter]);

  const visibleGroupedVisits = useMemo(() => {
    if (activeAlertFilter === 'all') return groupedVisits;
    const allowedKinds = new Set(
      filteredAlerts
        .filter((alert) => alert.kind === 'scheduled' || alert.kind === 'in_progress')
        .map((alert) => String(alert.activityId || alert._id))
    );

    const filteredMap = {};
    Object.entries(groupedVisits).forEach(([dateKey, visits]) => {
      const matchingVisits = visits.filter((visit) => allowedKinds.has(String(visit._id)));
      if (matchingVisits.length > 0) filteredMap[dateKey] = matchingVisits;
    });
    return filteredMap;
  }, [groupedVisits, filteredAlerts, activeAlertFilter]);

  function getAlertTitle(alert) {
    if (alert.title) return alert.title;
    const clientName = alert.clientId?.legalName || 'Cliente';
    return alert.kind === 'in_progress'
      ? `Actividad en progreso: ${clientName}`
      : alert.kind === 'overdue_followup'
        ? `Seguimiento vencido: ${clientName}`
        : alert.kind === 'due_followup'
          ? `Seguimiento pendiente: ${clientName}`
      : `Visita agendada: ${clientName}`;
  }

  function getAlertDate(alert) {
    return alert.date || alert.nextActionDate || alert.activityDate;
  }

  function getAlertTone(kind) {
    if (kind === 'overdue_followup') return 'danger';
    if (kind === 'due_followup') return 'warning';
    if (kind === 'in_progress') return 'primary';
    return 'secondary';
  }

  function getVisitTone(status) {
    if (status === 'completed') return 'success';
    if (status === 'in_progress') return 'warning';
    return 'secondary';
  }

  const emptyVisitsMessage = activeAlertFilter === 'all'
    ? 'No hay visitas en este rango'
    : 'No hay visitas asociadas al filtro de alertas seleccionado';

  return (
    <div>
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-3">
        <div>
          <h4 className="fw-bold mb-1">Agenda de visitas</h4>
          <div className="text-muted small">
            Planifica, detecta seguimientos críticos y actúa sobre la agenda operativa del equipo.
          </div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={() => { setFrom(todayISO()); setTo(todayISO()); setSelectedUserId(''); setActiveAlertFilter('all'); }}>
            Hoy
          </button>
          <button className="btn btn-outline-secondary" onClick={() => { setFrom(todayISO()); setTo(addDaysIso(todayISO(), 30)); setSelectedUserId(''); setActiveAlertFilter('due_followup'); }}>
            Próx. 30 días
          </button>
          <button className="btn btn-primary" onClick={() => setShowComposer((current) => !current)}>
            {showComposer ? 'Cerrar nueva visita' : 'Nueva visita'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="card mb-3">
        <div className="card-header fw-bold">Filtros de agenda</div>
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-3">
              <label className="form-label mb-1">Desde</label>
              <input type="date" className="form-control" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label mb-1">Hasta</label>
              <input type="date" className="form-control" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <div className="col-12 col-md-4">
                <label className="form-label mb-1">Ver agenda de</label>
                <select className="form-select" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
                  <option value="">Todos</option>
                  {salesUsers.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              </div>
            )}
            <div className="col-12 col-md-2">
              <label className="form-label mb-1">Alertas</label>
              <select className="form-select" value={activeAlertFilter} onChange={e => setActiveAlertFilter(e.target.value)}>
                <option value="all">Todas</option>
                <option value="overdue_followup">Vencidos</option>
                <option value="due_followup">Seguimientos</option>
                <option value="in_progress">En curso</option>
                <option value="scheduled">Agendados</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        {Object.entries(alertStats).map(([key, item]) => (
          <div className="col-6 col-lg-3 col-xl" key={key}>
            <button
              type="button"
              className={`btn w-100 text-start ${activeAlertFilter === key ? item.cls.replace('outline-', '') : item.cls}`}
              onClick={() => setActiveAlertFilter(key)}
            >
              <div className="small text-uppercase opacity-75">{item.label}</div>
              <div className="fs-4 fw-bold">{item.count}</div>
            </button>
          </div>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-4">
          <div className="card mb-3">
            <div className="card-header fw-bold d-flex justify-content-between align-items-center">
              <span>Acciones y alertas</span>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowComposer((current) => !current)}>
                {showComposer ? 'Ocultar formulario' : 'Mostrar formulario'}
              </button>
            </div>
            <div className="card-body">
              <div className="d-flex flex-wrap gap-2 mb-3">
                {Object.entries(alertStats).map(([key, item]) => (
                  <button
                    key={key}
                    type="button"
                    className={`btn btn-sm ${activeAlertFilter === key ? item.cls.replace('outline-', '') : item.cls}`}
                    onClick={() => setActiveAlertFilter(key)}
                  >
                    {item.label}: {item.count}
                  </button>
                ))}
              </div>

              {filteredAlerts.length === 0 ? (
                <div className="text-muted small">Sin alertas para este filtro.</div>
              ) : (
                <div className="d-grid gap-2">
                  {filteredAlerts.map((alert, idx) => (
                    <div key={`${alert.activityId || alert._id}-${idx}`} className={`border rounded p-3 bg-${getAlertTone(alert.kind)} bg-opacity-10 border-${getAlertTone(alert.kind)} border-opacity-25`}>
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <div>
                          <div className={`badge text-bg-${getAlertTone(alert.kind)} mb-2`}>
                            {alert.kind === 'overdue_followup'
                              ? 'Vencido'
                              : alert.kind === 'due_followup'
                                ? 'Seguimiento'
                                : alert.kind === 'in_progress'
                                  ? 'En curso'
                                  : 'Agendado'}
                          </div>
                          <div className="fw-semibold">{getAlertTitle(alert)}</div>
                          <div className="small text-muted">
                            {alert.userId?.name ? `${alert.userId.name} · ` : ''}{formatDate(getAlertDate(alert))}
                          </div>
                          {alert.kind === 'scheduled' || alert.kind === 'in_progress' ? (
                            <div className="small mt-2">
                              {alert.activityTypeId?.name && (
                                <div><strong>Actividad:</strong> {alert.activityTypeId.name}</div>
                              )}
                              {alert.clientId?.taxId && (
                                <div><strong>CIF/NIF:</strong> {alert.clientId.taxId}</div>
                              )}
                              {alert.clientId?.city && (
                                <div><strong>Ciudad:</strong> {alert.clientId.city}</div>
                              )}
                              {alert.notes && (
                                <div><strong>Notas:</strong> {alert.notes}</div>
                              )}
                            </div>
                          ) : null}
                          {(alert.nextActionType || alert.nextActionNotes) && (
                            <div className="small mt-2">
                              {alert.nextActionType && (
                                <div><strong>Tipo:</strong> {NEXT_ACTION_TYPE_LABELS[alert.nextActionType] || alert.nextActionType}</div>
                              )}
                              {alert.nextActionNotes && (
                                <div><strong>Notas:</strong> {alert.nextActionNotes}</div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="d-flex flex-column gap-2">
                          {alert.kind === 'in_progress' && (
                            <button className="btn btn-sm btn-outline-primary" onClick={() => window.location.assign('/activities/today')}>
                              Continuar
                            </button>
                          )}
                          {alert.kind === 'scheduled' && (
                            <>
                              <button className="btn btn-sm btn-outline-primary" onClick={() => openEdit({
                                _id: alert.activityId,
                                clientId: alert.clientId,
                                activityTypeId: alert.activityTypeId,
                                activityDate: alert.activityDate,
                                notes: alert.notes,
                              })}>Editar</button>
                              <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteSchedule(alert.activityId)} disabled={saving}>
                                Borrar
                              </button>
                            </>
                          )}
                          {(alert.kind === 'due_followup' || alert.kind === 'overdue_followup') && (
                            <>
                              <button className="btn btn-sm btn-outline-primary" onClick={() => openFollowUpEdit(alert)}>Editar</button>
                              <button className="btn btn-sm btn-outline-success" onClick={() => handleCompleteFollowUp(alert)} disabled={saving}>
                                Completar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {showComposer && (
            <div className="card mb-3">
              <div className="card-header fw-bold">Agendar futura visita</div>
              <div className="card-body">
                <form onSubmit={handleSchedule}>
                  <div className="row g-2 mb-2">
                    <div className="col-12">
                      <label className="form-label mb-1">Cliente *</label>
                      <ClientAutocomplete value={clientId} onChange={(id) => setClientId(id)} placeholder="Buscar cliente..." allowCreate />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label mb-1">Tipo *</label>
                      <select className="form-select" value={activityTypeId} onChange={e => setActivityTypeId(e.target.value)} required>
                        <option value="">Selecciona...</option>
                        {activityTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label mb-1">Fecha visita *</label>
                      <input type="date" className="form-control" value={activityDate} onChange={e => setActivityDate(e.target.value)} required />
                    </div>
                  </div>
                  {(user?.role === 'admin' || user?.role === 'manager') && (
                    <div className="mb-2">
                      <label className="form-label mb-1">Asignar visita a *</label>
                      <select className="form-select" value={assignedUserId} onChange={e => setAssignedUserId(e.target.value)} required>
                        <option value="">Selecciona un comercial...</option>
                        {salesUsers.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                      </select>
                      <div className="small text-muted mt-1">
                        El filtro superior solo cambia la agenda que ves. Aquí defines quién ejecutará la visita.
                      </div>
                    </div>
                  )}
                  <div className="mb-3">
                    <label className="form-label mb-1">Notas visita</label>
                    <textarea className="form-control" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Contexto comercial, objetivo o recordatorio operativo..." />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={saving || !clientId || !activityTypeId || ((user?.role === 'admin' || user?.role === 'manager') && !assignedUserId)}
                  >
                    {saving ? 'Guardando...' : 'Agendar visita'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        <div className="col-12 col-xl-8">
          <div className="card">
            <div className="card-header fw-bold d-flex justify-content-between align-items-center">
              <span>Visitas planificadas</span>
              <span className="small text-muted">{dates.length} día(s) en rango</span>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-3"><div className="spinner-border text-primary" /></div>
              ) : (
                <div className="d-grid gap-3">
                  {dates.map(d => {
                    const key = toLocalDateInputValue(d);
                    const items = visibleGroupedVisits[key] || [];
                    return (
                      <div key={key} className="border rounded-3 overflow-hidden">
                        <div className="bg-light border-bottom px-3 py-2 d-flex justify-content-between align-items-center">
                          <div className="fw-semibold">{formatDate(d)}</div>
                          <div className="small text-muted">{items.length} visita(s)</div>
                        </div>
                        <div className="p-3">
                          {items.length === 0 ? (
                            <div className="text-muted small">{emptyVisitsMessage}</div>
                          ) : (
                            <div className="d-grid gap-2">
                              {items.map(v => (
                                <div key={v._id} className={`border rounded p-3 bg-${getVisitTone(v.status)} bg-opacity-10 border-${getVisitTone(v.status)} border-opacity-25`}>
                                  <div className="d-flex flex-column flex-lg-row justify-content-between gap-2">
                                    <div>
                                      <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                                        <span className={`badge text-bg-${getVisitTone(v.status)}`}>
                                          {v.status === 'completed' ? 'Completada' : v.status === 'in_progress' ? 'En curso' : 'Borrador'}
                                        </span>
                                        <span className="fw-semibold">{v.clientId?.legalName || 'Cliente'}</span>
                                      </div>
                                      <div className="small text-muted">
                                        {v.activityTypeId?.name || 'Actividad'}{v.userId?.name ? ` · ${v.userId.name}` : ''}
                                      </div>
                                      {v.notes && <div className="small mt-2">{v.notes}</div>}
                                    </div>
                                    <div className="d-flex flex-wrap gap-2">
                                      {v.status === 'draft' && (
                                        <>
                                          <button className="btn btn-sm btn-outline-primary" onClick={() => openEdit(v)}>Editar</button>
                                          {(user?.role === 'admin' || user?.role === 'manager') && (
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteSchedule(v._id)}>
                                              Borrar
                                            </button>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {editingFollowUp && (
        <div className="modal d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Editar seguimiento</h5>
                <button type="button" className="btn-close" onClick={() => setEditingFollowUp(null)} />
              </div>
              <form onSubmit={handleUpdateFollowUp}>
                <div className="modal-body">
                  <div className="mb-2">
                    <label className="form-label">Próxima fecha *</label>
                    <input type="date" className="form-control" value={editFollowUpDate} onChange={e => setEditFollowUpDate(e.target.value)} required />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Tipo *</label>
                    <select className="form-select" value={editFollowUpType} onChange={e => setEditFollowUpType(e.target.value)} required>
                      <option value="">Selecciona...</option>
                      {Object.entries(NEXT_ACTION_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Notas</label>
                    <textarea className="form-control" rows={2} value={editFollowUpNotes} onChange={e => setEditFollowUpNotes(e.target.value)} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setEditingFollowUp(null)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving || !editFollowUpDate || !editFollowUpType}>Guardar cambios</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="modal d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Editar visita agendada</h5>
                <button type="button" className="btn-close" onClick={() => setEditing(null)} />
              </div>
              <form onSubmit={handleUpdateSchedule}>
                <div className="modal-body">
                  <div className="mb-2">
                    <label className="form-label">Cliente *</label>
                    <ClientAutocomplete value={editClientId} onChange={(id) => setEditClientId(id)} placeholder="Buscar cliente..." />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Tipo *</label>
                    <select className="form-select" value={editActivityTypeId} onChange={e => setEditActivityTypeId(e.target.value)} required>
                      <option value="">Selecciona...</option>
                      {activityTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Fecha visita *</label>
                    <input type="date" className="form-control" value={editActivityDate} onChange={e => setEditActivityDate(e.target.value)} required />
                  </div>
                  <div>
                    <label className="form-label">Notas</label>
                    <textarea className="form-control" rows={2} value={editNotes} onChange={e => setEditNotes(e.target.value)} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setEditing(null)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving || !editClientId || !editActivityTypeId}>
                    Guardar cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
