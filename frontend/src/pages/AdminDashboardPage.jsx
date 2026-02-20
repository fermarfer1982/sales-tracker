import React, { useState, useEffect } from 'react';
import { dashboardService, complianceService } from '../services';
import { todayISO, formatDate } from '../utils';

function StatusBadge({ status }) {
  const map = { green: ['bg-success', 'Verde'], yellow: ['bg-warning text-dark', 'Amarillo'], red: ['bg-danger', 'Rojo'] };
  const [cls, label] = map[status] || ['bg-secondary', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export default function AdminDashboardPage() {
  const [kpis, setKpis] = useState(null);
  const [commercialStatus, setCommercialStatus] = useState([]);
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, [from, to]);

  async function load() {
    setLoading(true);
    try {
      const [kpisRes, statusRes] = await Promise.all([
        dashboardService.kpis({ from, to }),
        dashboardService.commercialStatus({ date: to }),
      ]);
      setKpis(kpisRes.data.data);
      setCommercialStatus(statusRes.data.data);
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
      <div className="table-responsive">
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
    </div>
  );
}
