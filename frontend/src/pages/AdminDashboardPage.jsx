import React, { useState, useEffect } from 'react';
import { dashboardService, activityService } from '../services';
import { todayISO, formatDate, formatDateTime } from '../utils';
import { useAuth } from '../context/AuthContext';

function StatusBadge({ status }) {
  const map = { green: ['bg-success', 'Verde'], yellow: ['bg-warning text-dark', 'Amarillo'], red: ['bg-danger', 'Rojo'] };
  const [cls, label] = map[status] || ['bg-secondary', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

function GpsCell({ geo }) {
  if (!geo || geo.status !== 'ok' || typeof geo.lat !== 'number' || typeof geo.lng !== 'number') {
    return <span className="text-muted">Sin GPS válido</span>;
  }

  const mapsUrl = `https://www.google.com/maps?q=${geo.lat},${geo.lng}`;

  return (
    <div className="small">
      <div className="fw-semibold">{geo.lat.toFixed(6)}, {geo.lng.toFixed(6)}</div>
      <div className="text-muted">Precisión: {geo.accuracyMeters ?? '-'} m</div>
      <a href={mapsUrl} target="_blank" rel="noreferrer">Ver en mapa</a>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState(null);
  const [commercialStatus, setCommercialStatus] = useState([]);
  const [teamActivities, setTeamActivities] = useState([]);
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, [from, to]);

  async function load() {
    setLoading(true);
    try {
      const [kpisRes, statusRes, activitiesRes] = await Promise.all([
        dashboardService.kpis({ from, to }),
        dashboardService.commercialStatus({ date: to }),
        activityService.teamActivities({ from, to, limit: 100 }),
      ]);
      setKpis(kpisRes.data.data);
      setCommercialStatus(statusRes.data.data);
      setTeamActivities(activitiesRes.data.data);
    } catch {}
    setLoading(false);
  }

  return (
    <div>
      <h4 className="fw-bold mb-3">Dashboard de cumplimiento</h4>
      <div className="row g-2 mb-3">
        <div className="col-auto">
          <label className="form-label mb-0 small">Desde</label>
          <input type="date" className="form-control form-control-sm" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="col-auto">
          <label className="form-label mb-0 small">Hasta</label>
          <input type="date" className="form-control form-control-sm" value={to} onChange={e => setTo(e.target.value)} />
        </div>
      </div>

      {loading && <div className="text-center py-3"><div className="spinner-border text-primary" /></div>}

      {kpis && !loading && (
        <div className="row g-3 mb-4">
          {[
            { label: 'Actividades totales', value: kpis.totalActivities },
            { label: 'Completadas', value: kpis.completedActivities },
            { label: '% completado', value: `${kpis.completionRate}%` },
            { label: 'Duración total (min)', value: kpis.totalDurationMinutes },
            { label: 'Clientes nuevos', value: kpis.newClients },
          ].map(k => (
            <div key={k.label} className="col-6 col-md-4 col-lg-2">
              <div className="card text-center h-100">
                <div className="card-body py-3">
                  <div className="fs-3 fw-bold text-primary">{k.value}</div>
                  <div className="small text-muted">{k.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h6 className="fw-bold">Estado por comercial ({formatDate(to)})</h6>
      <div className="table-responsive mb-4">
        <table className="table table-sm align-middle">
          <thead className="table-light">
            <tr><th>Comercial</th><th>Email</th><th>Estado</th><th>Actividades</th></tr>
          </thead>
          <tbody>
            {commercialStatus.length === 0 && (
              <tr><td colSpan={4} className="text-center text-muted py-3">No hay datos</td></tr>
            )}
            {commercialStatus.map(s => (
              <tr key={s.user._id}>
                <td className="fw-semibold">{s.user.name}</td>
                <td className="text-muted small">{s.user.email}</td>
                <td><StatusBadge status={s.status} /></td>
                <td>{s.activityCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="fw-bold mb-0">Registros de actividad y GPS ({formatDate(from)} - {formatDate(to)})</h6>
        {user?.role === 'admin' && <span className="badge bg-primary">Vista admin</span>}
      </div>
      <div className="table-responsive">
        <table className="table table-sm align-middle">
          <thead className="table-light">
            <tr>
              <th>Fecha</th>
              <th>Comercial</th>
              <th>Cliente</th>
              <th>Check-in GPS</th>
              <th>Check-out GPS</th>
              <th>Distancia cliente</th>
            </tr>
          </thead>
          <tbody>
            {teamActivities.length === 0 && (
              <tr><td colSpan={6} className="text-center text-muted py-3">No hay registros en el rango seleccionado</td></tr>
            )}
            {teamActivities.map(activity => (
              <tr key={activity._id}>
                <td>
                  <div className="small fw-semibold">{formatDate(activity.activityDate)}</div>
                  <div className="text-muted small">{formatDateTime(activity.createdAt)}</div>
                </td>
                <td>
                  <div className="fw-semibold">{activity.userId?.name || '-'}</div>
                  <div className="text-muted small">{activity.userId?.email || '-'}</div>
                </td>
                <td>
                  <div className="fw-semibold">{activity.clientId?.legalName || '-'}</div>
                  <div className="text-muted small">{activity.clientId?.city || '-'}</div>
                </td>
                <td><GpsCell geo={activity.checkIn?.geo} /></td>
                <td><GpsCell geo={activity.checkOut?.geo} /></td>
                <td>
                  {typeof activity.checkOut?.distanceToClientMeters === 'number'
                    ? `${Math.round(activity.checkOut.distanceToClientMeters)} m`
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
