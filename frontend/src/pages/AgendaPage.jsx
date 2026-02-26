import React, { useEffect, useMemo, useState } from 'react';
import { activityService, catalogService } from '../services';
import { todayISO, formatDate } from '../utils';
import ClientAutocomplete from '../components/ClientAutocomplete';
import { useAuth } from '../context/AuthContext';

export default function AgendaPage() {
  const { user } = useAuth();

  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [selectedUserId, setSelectedUserId] = useState('');

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

  const [calendarData, setCalendarData] = useState({ visits: [], alerts: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    catalogService.list('activity-types').then(res => setActivityTypes(res.data.data || [])).catch(() => setActivityTypes([]));

    if (user?.role === 'admin' || user?.role === 'manager') {
      activityService.agendaUsers()
        .then(res => setSalesUsers(res.data.data || []))
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
      await activityService.schedule({ clientId, activityTypeId, activityDate, notes: notes || null });
      setClientId('');
      setActivityTypeId('');
      setActivityDate(todayISO());
      setNotes('');
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
    setEditActivityDate(new Date(visit.activityDate).toISOString().split('T')[0]);
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
      const key = new Date(v.activityDate).toISOString().split('T')[0];
      if (!map[key]) map[key] = [];
      map[key].push(v);
    });
    return map;
  }, [calendarData]);

  const dates = useMemo(() => {
    const result = [];
    const start = new Date(from);
    const end = new Date(to);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) result.push(new Date(d));
    return result;
  }, [from, to]);

  return (
    <div>
      <h4 className="fw-bold mb-3">Agenda de visitas</h4>

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
                <label className="form-label mb-1">Comercial</label>
                <select className="form-select" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
                  <option value="">Todos</option>
                  {salesUsers.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              </div>
            )}
            <div className="col-12 col-md-auto">
              <button className="btn btn-outline-secondary" onClick={() => { setFrom(todayISO()); setTo(todayISO()); setSelectedUserId(''); }}>
                Hoy
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header fw-bold">Agendar futura visita</div>
        <div className="card-body">
          <form onSubmit={handleSchedule}>
            <div className="row g-2 mb-2">
              <div className="col-12 col-md-6">
                <label className="form-label mb-1">Cliente *</label>
                <ClientAutocomplete value={clientId} onChange={(id) => setClientId(id)} placeholder="Buscar cliente..." />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label mb-1">Tipo *</label>
                <select className="form-select" value={activityTypeId} onChange={e => setActivityTypeId(e.target.value)} required>
                  <option value="">Selecciona...</option>
                  {activityTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label mb-1">Fecha visita *</label>
                <input type="date" className="form-control" value={activityDate} onChange={e => setActivityDate(e.target.value)} required />
              </div>
            </div>
            <div className="mb-2">
              <label className="form-label mb-1">Notas visita</label>
              <textarea className="form-control" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving || !clientId || !activityTypeId}>
              {saving ? 'Guardando...' : 'Agendar visita'}
            </button>
          </form>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header fw-bold">Avisos de agenda</div>
        <div className="card-body">
          {(calendarData.alerts || []).length === 0
            ? <div className="text-muted">Sin avisos por ahora.</div>
            : <ul className="mb-0">{calendarData.alerts.map((a, idx) => <li key={`${a.activityId}-${idx}`}>{a.title} ({formatDate(a.date)})</li>)}</ul>}
        </div>
      </div>

      <div className="card">
        <div className="card-header fw-bold">Calendario de visitas agendadas</div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-3"><div className="spinner-border text-primary" /></div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead className="table-light">
                  <tr><th>Fecha</th><th>Visitas</th></tr>
                </thead>
                <tbody>
                  {dates.map(d => {
                    const key = d.toISOString().split('T')[0];
                    const items = groupedVisits[key] || [];
                    return (
                      <tr key={key}>
                        <td className="text-nowrap">{formatDate(d)}</td>
                        <td>
                          {items.length === 0 ? <span className="text-muted">-</span> : items.map(v => (
                            <div key={v._id} className="mb-2 p-2 border rounded">
                              <div className="small"><strong>{v.clientId?.legalName || 'Cliente'}</strong> · {v.activityTypeId?.name || 'Actividad'}</div>
                              <div className="small text-muted">{v.userId?.name || ''}</div>
                              <div className="d-flex gap-2 mt-1">
                                <button className="btn btn-sm btn-outline-primary" onClick={() => openEdit(v)}>Editar</button>
                                {user?.role === 'admin' && (
                                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteSchedule(v._id)}>
                                    Borrar
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

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
