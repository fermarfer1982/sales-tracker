import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService, userService, catalogService } from '../services';
import { downloadCsv, todayISO, formatDate } from '../utils';

function StatusBadge({ status }) {
  const map = { green: ['bg-success', 'Verde'], yellow: ['bg-warning text-dark', 'Amarillo'], red: ['bg-danger', 'Rojo'] };
  const [cls, label] = map[status] || ['bg-secondary', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export default function AdminDashboardPage() {
  const [kpis, setKpis] = useState(null);
  const [commercialStatus, setCommercialStatus] = useState([]);
  const [missingUsers, setMissingUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    load();
  }, [from, to, selectedUserId, selectedZoneId]);

  async function loadFilters() {
    try {
      const [usersRes, zonesRes] = await Promise.all([
        userService.options(),
        catalogService.list('zones'),
      ]);
      setUsers((usersRes.data.data || []).filter(u => u.role === 'sales' && u.isActive));
      setZones(zonesRes.data.data || []);
    } catch {
      setUsers([]);
      setZones([]);
    }
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = { from, to };
      if (selectedUserId) params.userId = selectedUserId;
      if (selectedZoneId) params.zoneId = selectedZoneId;

      const [kpisRes, statusRes, missingRes] = await Promise.all([
        dashboardService.kpis(params),
        dashboardService.commercialStatus({ date: to, userId: selectedUserId || undefined, zoneId: selectedZoneId || undefined }),
        dashboardService.missing({ date: to, userId: selectedUserId || undefined, zoneId: selectedZoneId || undefined }),
      ]);
      const statusData = statusRes.data.data || [];
      setKpis(kpisRes.data.data);
      setCommercialStatus(statusData);
      setMissingUsers(missingRes.data.data || []);

      if (users.length === 0 && statusData.length > 0) {
        const fallbackUsers = statusData.map(s => ({
          _id: s.user?._id,
          name: s.user?.name,
          role: 'sales',
          isActive: true,
        })).filter(u => u._id && u.name);
        setUsers(fallbackUsers);
      }
    } catch {
      setError('No se pudo cargar el dashboard');
    }
    setLoading(false);
  }

  function recordsUrl(extraParams = {}) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (selectedZoneId) params.set('zoneId', selectedZoneId);
    Object.entries(extraParams).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return `/admin/records?${params.toString()}`;
  }

  function resetFilters() {
    setSelectedUserId('');
    setSelectedZoneId('');
    setFrom(todayISO());
    setTo(todayISO());
  }

  function handleExportStatus() {
    const rows = commercialStatus.map((item) => ({
      comercial: item.user?.name || '',
      email: item.user?.email || '',
      estado: item.status || '',
      actividades: item.activityCount || 0,
      fecha: formatDate(to),
    }));
    downloadCsv(`dashboard_estado_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  function handleExportMissing() {
    const rows = missingUsers.map((item) => ({
      comercial: item.name || '',
      email: item.email || '',
      fecha: formatDate(to),
      estado: 'red',
    }));
    downloadCsv(`dashboard_faltantes_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h4 className="fw-bold mb-0">Dashboard de cumplimiento</h4>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={handleExportStatus} disabled={commercialStatus.length === 0}>
            Exportar estado
          </button>
          <button className="btn btn-outline-secondary btn-sm" onClick={handleExportMissing} disabled={missingUsers.length === 0}>
            Exportar faltantes
          </button>
          <Link to="/admin/records" className="btn btn-outline-primary btn-sm">
            Ver registros
          </Link>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body py-3">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-3">
              <label className="form-label mb-1 small">Desde</label>
              <input type="date" className="form-control form-control-sm" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label mb-1 small">Hasta</label>
              <input type="date" className="form-control form-control-sm" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label mb-1 small">Comercial</label>
              <select className="form-select form-select-sm" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
                <option value="">Todos</option>
                {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
              </select>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label mb-1 small">Representante</label>
              <select className="form-select form-select-sm" value={selectedZoneId} onChange={e => setSelectedZoneId(e.target.value)}>
                <option value="">Todas</option>
                {zones.map(z => <option key={z._id} value={z._id}>{z.name}</option>)}
              </select>
            </div>
            <div className="col-12 d-flex justify-content-end">
              <button className="btn btn-sm btn-outline-secondary" onClick={resetFilters}>
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}
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

      <div className="card mb-4">
        <div className="card-header fw-bold">Comerciales sin actividad completada ({formatDate(to)})</div>
        <div className="card-body">
          {missingUsers.length === 0 ? (
            <div className="text-muted">No hay comerciales en rojo para este filtro.</div>
          ) : (
            <div className="d-flex flex-wrap gap-2">
              {missingUsers.map((user) => (
                <Link key={user._id} to={recordsUrl({ userId: user._id })} className="btn btn-sm btn-outline-danger">
                  {user.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <h6 className="fw-bold">Estado por comercial ({formatDate(to)})</h6>
      <div className="table-responsive">
        <table className="table table-sm align-middle">
          <thead className="table-light">
            <tr><th>Comercial</th><th>Email</th><th>Estado</th><th>Actividades</th><th></th></tr>
          </thead>
          <tbody>
            {commercialStatus.length === 0 && (
              <tr><td colSpan={5} className="text-center text-muted py-3">No hay datos</td></tr>
            )}
            {commercialStatus.map(s => (
              <tr key={s.user._id}>
                <td className="fw-semibold">{s.user.name}</td>
                <td className="text-muted small">{s.user.email}</td>
                <td><StatusBadge status={s.status} /></td>
                <td>
                  <Link to={recordsUrl({ userId: s.user._id })} className="btn btn-sm btn-link text-decoration-none px-0">
                    {s.activityCount}
                  </Link>
                </td>
                <td>
                  <Link to={recordsUrl({ userId: s.user._id })} className="btn btn-sm btn-outline-primary">
                    Ver registros
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
