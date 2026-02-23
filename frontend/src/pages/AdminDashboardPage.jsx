import React, { useState, useEffect } from 'react';
import { dashboardService, activityService, userService } from '../services';
import { todayISO, formatDate, formatDateTime } from '../utils';

function StatusBadge({ status }) {
  const map = { green: ['bg-success', 'Verde'], yellow: ['bg-warning text-dark', 'Amarillo'], red: ['bg-danger', 'Rojo'] };
  const [cls, label] = map[status] || ['bg-secondary', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

function GeoVerificationBadge({ activity }) {
  const checkOutGeo = activity?.checkOut?.geo;
  const accuracy = Number(checkOutGeo?.accuracyMeters);
  const withinExpectedArea = activity?.checkOut?.withinExpectedArea;
  const isExact = Number.isFinite(accuracy) && accuracy <= 30 && withinExpectedArea === true;

  if (!activity?.checkOut) return <span className="badge bg-secondary">Sin checkout</span>;
  if (isExact) return <span className="badge bg-success">Exacta ✓</span>;
  return <span className="badge bg-danger">No exacta</span>;
}

function formatCoords(geo) {
  if (!geo || typeof geo.lat !== 'number' || typeof geo.lng !== 'number') return '-';
  return `${geo.lat.toFixed(6)}, ${geo.lng.toFixed(6)}`;
}

export default function AdminDashboardPage() {
  const [kpis, setKpis] = useState(null);
  const [commercialStatus, setCommercialStatus] = useState([]);
  const [teamActivities, setTeamActivities] = useState([]);
  const [commercials, setCommercials] = useState([]);
  const [teamTotal, setTeamTotal] = useState(0);
  const [teamPage, setTeamPage] = useState(1);
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [selectedCommercial, setSelectedCommercial] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const teamLimit = 20;

  useEffect(() => {
    loadDashboard();
  }, [from, to]);

  useEffect(() => {
    loadCommercials();
  }, []);

  useEffect(() => {
    loadTeamActivities();
  }, [from, to, selectedCommercial, teamPage]);

  async function loadDashboard() {
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

  async function loadCommercials() {
    try {
      const res = await userService.list();
      const salesUsers = (res.data.data || []).filter(u => u.role === 'sales' && u.isActive !== false);
      setCommercials(salesUsers);
    } catch {}
  }

  async function loadTeamActivities() {
    setLoadingTeam(true);
    try {
      const params = { from, to, page: teamPage, limit: teamLimit };
      if (selectedCommercial) params.userId = selectedCommercial;
      const res = await activityService.teamActivities(params);
      setTeamActivities(res.data.data || []);
      setTeamTotal(res.data.meta?.total || 0);
    } catch {}
    setLoadingTeam(false);
  }

  const teamPages = Math.ceil(teamTotal / teamLimit);

  return (
    <div>
      <h4 className="fw-bold mb-3">Dashboard de cumplimiento</h4>
      <div className="row g-2 mb-3">
        <div className="col-auto">
          <label className="form-label mb-0 small">Desde</label>
          <input type="date" className="form-control form-control-sm" value={from} onChange={e => { setFrom(e.target.value); setTeamPage(1); }} />
        </div>
        <div className="col-auto">
          <label className="form-label mb-0 small">Hasta</label>
          <input type="date" className="form-control form-control-sm" value={to} onChange={e => { setTo(e.target.value); setTeamPage(1); }} />
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

      <div className="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-2">
        <div>
          <h6 className="fw-bold mb-0">Registros de comerciales y geolocalización</h6>
          <small className="text-muted">Exacta = checkout dentro del área esperada y precisión GPS ≤ 30 m</small>
        </div>
        <div style={{ minWidth: 280 }}>
          <label className="form-label small mb-1">Filtrar comercial</label>
          <select
            className="form-select form-select-sm"
            value={selectedCommercial}
            onChange={e => { setSelectedCommercial(e.target.value); setTeamPage(1); }}
          >
            <option value="">Todos los comerciales</option>
            {commercials.map(c => <option key={c._id} value={c._id}>{c.name} ({c.email})</option>)}
          </select>
        </div>
      </div>

      {loadingTeam ? (
        <div className="text-center py-3"><div className="spinner-border text-primary" /></div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover table-sm align-middle">
              <thead className="table-light">
                <tr>
                  <th>Fecha</th>
                  <th>Comercial</th>
                  <th>Cliente</th>
                  <th>Check-in (coords / precisión)</th>
                  <th>Check-out (coords / precisión)</th>
                  <th>Distancia al cliente</th>
                  <th>Verificación GPS</th>
                </tr>
              </thead>
              <tbody>
                {teamActivities.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-muted py-3">No hay registros para ese filtro</td></tr>
                )}
                {teamActivities.map(a => {
                  const checkInGeo = a?.checkIn?.geo;
                  const checkOutGeo = a?.checkOut?.geo;
                  const distance = a?.checkOut?.distanceToClientMeters;
                  return (
                    <tr key={a._id}>
                      <td>
                        <div>{formatDateTime(a.activityDate)}</div>
                        <small className="text-muted">Estado: {a.status}</small>
                      </td>
                      <td>
                        <div className="fw-semibold">{a?.userId?.name || '-'}</div>
                        <small className="text-muted">{a?.userId?.email || '-'}</small>
                      </td>
                      <td>{a?.clientId?.legalName || '-'}</td>
                      <td>
                        <div>{formatCoords(checkInGeo)}</div>
                        <small className="text-muted">
                          {Number.isFinite(Number(checkInGeo?.accuracyMeters)) ? `±${Math.round(checkInGeo.accuracyMeters)} m` : '-'}
                        </small>
                      </td>
                      <td>
                        <div>{formatCoords(checkOutGeo)}</div>
                        <small className="text-muted">
                          {Number.isFinite(Number(checkOutGeo?.accuracyMeters)) ? `±${Math.round(checkOutGeo.accuracyMeters)} m` : '-'}
                        </small>
                      </td>
                      <td>{Number.isFinite(Number(distance)) ? `${Math.round(distance)} m` : '-'}</td>
                      <td><GeoVerificationBadge activity={a} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="d-flex justify-content-between align-items-center mt-2">
            <small className="text-muted">{teamTotal} registro(s)</small>
            <div className="d-flex gap-1">
              <button className="btn btn-sm btn-outline-secondary" disabled={teamPage <= 1} onClick={() => setTeamPage(p => p - 1)}>Ant</button>
              <span className="btn btn-sm btn-light disabled">{teamPage}/{teamPages || 1}</span>
              <button className="btn btn-sm btn-outline-secondary" disabled={teamPage >= teamPages} onClick={() => setTeamPage(p => p + 1)}>Sig</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
