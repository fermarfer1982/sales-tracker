import React, { useEffect, useState } from 'react';
import { activityService, userService } from '../services';
import { formatDate, formatDateTime, todayISO, statusBadge } from '../utils';

export default function AdminRecordsPage() {
  const [activities, setActivities] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState('');
  const limit = 25;

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    loadActivities();
  }, [page, from, to, userId]);

  async function loadUsers() {
    try {
      const res = await userService.list();
      setUsers((res.data.data || []).filter(u => ['sales', 'manager', 'admin'].includes(u.role)));
    } catch {}
  }

  async function loadActivities() {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit, from, to };
      if (userId) params.userId = userId;
      const res = await activityService.teamActivities(params);
      setActivities(res.data.data || []);
      setTotal(res.data.meta?.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron cargar los registros');
    }
    setLoading(false);
  }

  async function handleViewDetails(activityId) {
    setDetailsLoading(true);
    setSelectedActivity(null);
    try {
      const res = await activityService.get(activityId);
      setSelectedActivity(res.data.data);
    } catch {
      setSelectedActivity({ _id: activityId, error: 'No se pudo cargar el detalle del registro' });
    }
    setDetailsLoading(false);
  }

  const pages = Math.ceil(total / limit) || 1;

  return (
    <div>
      <h4 className="fw-bold mb-3">Revisión de registros</h4>
      <div className="row g-2 mb-3 align-items-end">
        <div className="col-6 col-md-3">
          <label className="form-label mb-1 small">Desde</label>
          <input type="date" className="form-control" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label mb-1 small">Hasta</label>
          <input type="date" className="form-control" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} />
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label mb-1 small">Usuario</label>
          <select className="form-select" value={userId} onChange={e => { setUserId(e.target.value); setPage(1); }}>
            <option value="">Todos</option>
            {users.map(u => (
              <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
            ))}
          </select>
        </div>
        <div className="col-12 col-md-2 d-grid">
          <button className="btn btn-outline-secondary" onClick={() => { setFrom(''); setTo(''); setUserId(''); setPage(1); }}>
            Limpiar
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      {loading ? (
        <div className="text-center py-4"><div className="spinner-border text-primary" /></div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Fecha</th>
                  <th>Comercial</th>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Duración</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {activities.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-muted py-3">No hay registros para estos filtros</td></tr>
                )}
                {activities.map(a => {
                  const badge = statusBadge(a.status);
                  return (
                    <tr key={a._id}>
                      <td className="small text-nowrap">{formatDate(a.activityDate)}</td>
                      <td className="small">{a.userId?.name || '-'}</td>
                      <td className="small">{a.clientId?.legalName || '-'}</td>
                      <td className="small">{a.activityTypeId?.name || '-'}</td>
                      <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                      <td className="small">{a.durationMinutes ? `${a.durationMinutes} min` : '-'}</td>
                      <td>
                        <button className="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#recordDetailModal" onClick={() => handleViewDetails(a._id)}>
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">{total} registro(s)</small>
            <div className="d-flex gap-1">
              <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Ant</button>
              <span className="btn btn-sm btn-light disabled">{page}/{pages}</span>
              <button className="btn btn-sm btn-outline-secondary" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Sig</button>
            </div>
          </div>
        </>
      )}

      <div className="modal fade" id="recordDetailModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Detalle completo del registro</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Cerrar" />
            </div>
            <div className="modal-body">
              {detailsLoading && <div className="text-center py-3"><div className="spinner-border text-primary" /></div>}
              {!detailsLoading && selectedActivity?.error && <div className="alert alert-danger py-2">{selectedActivity.error}</div>}
              {!detailsLoading && selectedActivity && !selectedActivity.error && (
                <div className="small">
                  <p className="mb-1"><strong>ID:</strong> <code>{selectedActivity._id}</code></p>
                  <p className="mb-1"><strong>Usuario:</strong> {selectedActivity.userId?.name} ({selectedActivity.userId?.email})</p>
                  <p className="mb-1"><strong>Cliente:</strong> {selectedActivity.clientId?.legalName} · {selectedActivity.clientId?.taxId}</p>
                  <p className="mb-1"><strong>Ubicación cliente:</strong> {selectedActivity.clientId?.city || '-'} {selectedActivity.clientId?.province || ''}</p>
                  <p className="mb-1"><strong>Fecha actividad:</strong> {formatDate(selectedActivity.activityDate)}</p>
                  <p className="mb-1"><strong>Tipo:</strong> {selectedActivity.activityTypeId?.name || '-'}</p>
                  <p className="mb-1"><strong>Producto:</strong> {selectedActivity.productId?.name || '-'}</p>
                  <p className="mb-1"><strong>Resultado:</strong> {selectedActivity.outcomeId?.name || '-'}</p>
                  <p className="mb-1"><strong>Estado:</strong> {selectedActivity.status}</p>
                  <p className="mb-1"><strong>Duración:</strong> {selectedActivity.durationMinutes ? `${selectedActivity.durationMinutes} min` : '-'}</p>
                  <p className="mb-1"><strong>Notas:</strong> {selectedActivity.notes || '-'}</p>
                  <p className="mb-1"><strong>Próxima acción:</strong> {selectedActivity.nextActionDate ? formatDate(selectedActivity.nextActionDate) : '-'}</p>
                  <p className="mb-3"><strong>Notas próxima acción:</strong> {selectedActivity.nextActionNotes || '-'}</p>

                  <h6 className="fw-bold">Check-in</h6>
                  <p className="mb-1"><strong>Fecha/hora:</strong> {formatDateTime(selectedActivity.checkIn?.at)}</p>
                  <p className="mb-3"><strong>Geo:</strong> lat {selectedActivity.checkIn?.geo?.lat ?? '-'}, lng {selectedActivity.checkIn?.geo?.lng ?? '-'}, accuracy {selectedActivity.checkIn?.geo?.accuracy ?? '-'} m</p>

                  <h6 className="fw-bold">Check-out</h6>
                  <p className="mb-1"><strong>Fecha/hora:</strong> {formatDateTime(selectedActivity.checkOut?.at)}</p>
                  <p className="mb-1"><strong>Geo:</strong> lat {selectedActivity.checkOut?.geo?.lat ?? '-'}, lng {selectedActivity.checkOut?.geo?.lng ?? '-'}, accuracy {selectedActivity.checkOut?.geo?.accuracy ?? '-'} m</p>
                  <p className="mb-0"><strong>Geofence:</strong> distancia {selectedActivity.checkOut?.distanceToClientMeters != null ? `${Math.round(selectedActivity.checkOut.distanceToClientMeters)} m` : '-'} · dentro de zona {selectedActivity.checkOut?.withinExpectedArea == null ? '-' : (selectedActivity.checkOut.withinExpectedArea ? 'Sí' : 'No')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
