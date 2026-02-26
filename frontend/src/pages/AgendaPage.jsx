import React, { useEffect, useMemo, useState } from 'react';
import { activityService, catalogService } from '../services';
import { todayISO, formatDate } from '../utils';
import ClientAutocomplete from '../components/ClientAutocomplete';

function firstDayOfMonthISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
}

function lastDayOfMonthISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
}

export default function AgendaPage() {
  const [from, setFrom] = useState(firstDayOfMonthISO());
  const [to, setTo] = useState(lastDayOfMonthISO());
  const [activityTypes, setActivityTypes] = useState([]);

  const [clientId, setClientId] = useState('');
  const [activityTypeId, setActivityTypeId] = useState('');
  const [activityDate, setActivityDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [nextActionNotes, setNextActionNotes] = useState('');

  const [calendarData, setCalendarData] = useState({ visits: [], nextActions: [], alerts: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    catalogService.list('activity-types').then(res => setActivityTypes(res.data.data || [])).catch(() => setActivityTypes([]));
  }, []);

  useEffect(() => {
    loadCalendar();
  }, [from, to]);

  async function loadCalendar() {
    setLoading(true);
    setError('');
    try {
      const res = await activityService.calendar({ from, to });
      setCalendarData(res.data.data || { visits: [], nextActions: [], alerts: [] });
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
      await activityService.schedule({
        clientId,
        activityTypeId,
        activityDate,
        notes: notes || null,
        nextActionDate: nextActionDate || null,
        nextActionNotes: nextActionNotes || null,
      });
      setClientId('');
      setActivityTypeId('');
      setActivityDate(todayISO());
      setNotes('');
      setNextActionDate('');
      setNextActionNotes('');
      await loadCalendar();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo agendar la visita');
    }
    setSaving(false);
  }

  const visitsByDate = useMemo(() => {
    const map = {};
    (calendarData.visits || []).forEach(v => {
      const key = new Date(v.activityDate).toISOString().split('T')[0];
      map[key] = map[key] || { visits: [], actions: [] };
      map[key].visits.push(v);
    });
    (calendarData.nextActions || []).forEach(a => {
      if (!a.nextActionDate) return;
      const key = new Date(a.nextActionDate).toISOString().split('T')[0];
      map[key] = map[key] || { visits: [], actions: [] };
      map[key].actions.push(a);
    });
    return map;
  }, [calendarData]);

  const dates = useMemo(() => {
    const result = [];
    const start = new Date(from);
    const end = new Date(to);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      result.push(new Date(d));
    }
    return result;
  }, [from, to]);

  return (
    <div>
      <h4 className="fw-bold mb-3">Agenda de visitas y próximas acciones</h4>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="card mb-3">
        <div className="card-header fw-bold">Agendar futura visita</div>
        <div className="card-body">
          <form onSubmit={handleSchedule}>
            <div className="row g-2 mb-2">
              <div className="col-12 col-md-6">
                <label className="form-label mb-1">Cliente *</label>
                <ClientAutocomplete value={clientId} onChange={id => setClientId(id)} placeholder="Buscar cliente..." />
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

            <div className="row g-2 mb-2">
              <div className="col-12 col-md-4">
                <label className="form-label mb-1">Próxima acción</label>
                <input type="date" className="form-control" value={nextActionDate} onChange={e => setNextActionDate(e.target.value)} />
              </div>
              <div className="col-12 col-md-8">
                <label className="form-label mb-1">Notas próxima acción</label>
                <input type="text" className="form-control" value={nextActionNotes} onChange={e => setNextActionNotes(e.target.value)} />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving || !clientId || !activityTypeId}>
              {saving ? 'Guardando...' : 'Agendar visita'}
            </button>
          </form>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header fw-bold">Alertas de agenda</div>
        <div className="card-body">
          {(calendarData.alerts || []).length === 0 ? (
            <div className="text-muted">Sin alertas por ahora.</div>
          ) : (
            <ul className="mb-0">
              {calendarData.alerts.map((a, idx) => (
                <li key={`${a.activityId}-${idx}`}>{a.title} ({formatDate(a.date)})</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header d-flex flex-wrap justify-content-between gap-2 align-items-end">
          <div className="fw-bold">Calendario</div>
          <div className="d-flex gap-2">
            <input type="date" className="form-control form-control-sm" value={from} onChange={e => setFrom(e.target.value)} />
            <input type="date" className="form-control form-control-sm" value={to} onChange={e => setTo(e.target.value)} />
          </div>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-3"><div className="spinner-border text-primary" /></div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead className="table-light">
                  <tr><th>Fecha</th><th>Visitas agendadas</th><th>Próximas acciones</th></tr>
                </thead>
                <tbody>
                  {dates.map(d => {
                    const key = d.toISOString().split('T')[0];
                    const bucket = visitsByDate[key] || { visits: [], actions: [] };
                    return (
                      <tr key={key}>
                        <td className="text-nowrap">{formatDate(d)}</td>
                        <td>
                          {bucket.visits.length === 0 ? <span className="text-muted">-</span> : bucket.visits.map(v => (
                            <div key={v._id} className="small">• {v.clientId?.legalName || 'Cliente'} ({v.activityTypeId?.name || 'Actividad'})</div>
                          ))}
                        </td>
                        <td>
                          {bucket.actions.length === 0 ? <span className="text-muted">-</span> : bucket.actions.map(a => (
                            <div key={`na-${a._id}`} className="small">• {a.clientId?.legalName || 'Cliente'}{a.nextActionNotes ? `: ${a.nextActionNotes}` : ''}</div>
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
    </div>
  );
}
