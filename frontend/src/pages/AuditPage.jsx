import React, { useState, useEffect } from 'react';
import { auditService } from '../services';
import { formatDateTime } from '../utils';

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const limit = 50;

  useEffect(() => { load(); }, [page, entity, from, to]);

  async function load() {
    setLoading(true);
    try {
      const params = { page, limit };
      if (entity) params.entity = entity;
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await auditService.list(params);
      setLogs(res.data.data);
      setTotal(res.data.meta?.total || 0);
    } catch {}
    setLoading(false);
  }

  const pages = Math.ceil(total / limit);

  return (
    <div>
      <h4 className="fw-bold mb-3">Auditoría</h4>
      <div className="row g-2 mb-3">
        <div className="col-auto">
          <select className="form-select form-select-sm" value={entity} onChange={e => { setEntity(e.target.value); setPage(1); }}>
            <option value="">Todas las entidades</option>
            {['Auth', 'User', 'Client', 'Activity', 'AppSetting'].map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div className="col-auto">
          <input type="date" className="form-control form-control-sm" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} />
        </div>
        <div className="col-auto">
          <input type="date" className="form-control form-control-sm" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} />
        </div>
      </div>
      {loading ? (
        <div className="text-center py-3"><div className="spinner-border text-primary" /></div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead className="table-light">
                <tr><th>Fecha</th><th>Entidad</th><th>ID</th><th>Acción</th><th>Usuario</th></tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-muted py-3">No hay registros</td></tr>
                )}
                {logs.map(l => (
                  <tr key={l._id}>
                    <td className="text-nowrap small">{formatDateTime(l.at)}</td>
                    <td><span className="badge bg-secondary">{l.entityName}</span></td>
                    <td><code className="small">{l.entityId?.substring(0, 12)}...</code></td>
                    <td><span className="badge bg-info text-dark">{l.action}</span></td>
                    <td className="small">{l.userId?.name || l.userId?.email || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">{total} registro(s)</small>
            <div className="d-flex gap-1">
              <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Ant</button>
              <span className="btn btn-sm btn-light disabled">{page}/{pages || 1}</span>
              <button className="btn btn-sm btn-outline-secondary" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Sig</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
