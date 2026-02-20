import React, { useState, useEffect } from 'react';
import { activityService } from '../services';
import { formatDate, formatDateTime, statusBadge, todayISO } from '../utils';

export default function MyActivitiesPage() {
  const [activities, setActivities] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const limit = 20;

  useEffect(() => { load(); }, [page, from, to]);

  async function load() {
    setLoading(true);
    try {
      const params = { page, limit };
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await activityService.myActivities(params);
      setActivities(res.data.data);
      setTotal(res.data.meta?.total || 0);
    } catch {}
    setLoading(false);
  }

  const pages = Math.ceil(total / limit);

  return (
    <div>
      <h4 className="fw-bold mb-3">Mis actividades</h4>
      <div className="row g-2 mb-3">
        <div className="col-auto">
          <input type="date" className="form-control" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} placeholder="Desde" />
        </div>
        <div className="col-auto">
          <input type="date" className="form-control" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} placeholder="Hasta" />
        </div>
        <div className="col-auto">
          <button className="btn btn-outline-secondary" onClick={() => { setFrom(''); setTo(''); setPage(1); }}>Limpiar</button>
        </div>
      </div>
      {loading ? (
        <div className="text-center py-4"><div className="spinner-border text-primary" /></div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover table-sm align-middle">
              <thead className="table-light">
                <tr>
                  <th>Fecha</th><th>Cliente</th><th>Tipo</th><th>Producto</th><th>Resultado</th><th>Duración</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {activities.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-muted py-3">No hay actividades</td></tr>
                )}
                {activities.map(a => {
                  const { label, cls } = statusBadge(a.status);
                  return (
                    <tr key={a._id}>
                      <td>{formatDate(a.activityDate)}</td>
                      <td>{a.clientId?.legalName || '-'}</td>
                      <td>{a.activityTypeId?.name || '-'}</td>
                      <td>{a.productId?.name || '-'}</td>
                      <td>{a.outcomeId?.name || '-'}</td>
                      <td>{a.durationMinutes ? `${a.durationMinutes} min` : '-'}</td>
                      <td><span className={`badge ${cls}`}>{label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="d-flex justify-content-between align-items-center mt-2">
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
