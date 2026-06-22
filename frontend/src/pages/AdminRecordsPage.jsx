import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { activityService, userService, catalogService } from '../services';
import { downloadCsv, formatDate, formatDateTime, todayISO, statusBadge } from '../utils';

export default function AdminRecordsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activities, setActivities] = useState([]);
  const [users, setUsers] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(Number(searchParams.get('page') || 1));
  const [from, setFrom] = useState(searchParams.get('from') || todayISO());
  const [to, setTo] = useState(searchParams.get('to') || todayISO());
  const [userId, setUserId] = useState(searchParams.get('userId') || '');
  const [zoneId, setZoneId] = useState(searchParams.get('zoneId') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState('');
  const limit = 25;

  useEffect(() => {
    loadUsers();
    catalogService.list('zones').then((res) => setZones(res.data.data || [])).catch(() => setZones([]));
  }, []);

  useEffect(() => {
    loadActivities();
  }, [page, from, to, userId, zoneId, status, search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (userId) params.set('userId', userId);
    if (zoneId) params.set('zoneId', zoneId);
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    if (page > 1) params.set('page', String(page));
    setSearchParams(params, { replace: true });
  }, [from, to, userId, zoneId, status, search, page, setSearchParams]);

  async function loadUsers() {
    try {
      const res = await userService.options();
      setUsers((res.data.data || []).filter(u => ['sales', 'manager', 'admin'].includes(u.role)));
    } catch {}
  }

  async function loadActivities() {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit, from, to };
      if (userId) params.userId = userId;
      if (zoneId) params.zoneId = zoneId;
      if (status) params.status = status;
      if (search) params.search = search;
      const res = await activityService.teamActivities(params);
      setActivities(res.data.data || []);
      setTotal(res.data.meta?.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron cargar los registros');
    }
    setLoading(false);
  }

  async function handleExport() {
    setLoading(true);
    setError('');
    try {
      const params = { page: 1, limit: 1000, from, to };
      if (userId) params.userId = userId;
      if (zoneId) params.zoneId = zoneId;
      if (status) params.status = status;
      if (search) params.search = search;
      const res = await activityService.teamActivities(params);
      const exportRows = (res.data.data || []).map((activity) => ({
        fecha: formatDate(activity.activityDate),
        comercial: activity.userId?.name || '',
        email_comercial: activity.userId?.email || '',
        cliente: activity.clientId?.legalName || '',
        cif_nif: activity.clientId?.taxId || '',
        ciudad: activity.clientId?.city || '',
        tipo: activity.activityTypeId?.name || '',
        producto: activity.productIds?.length ? activity.productIds.map((product) => product?.name).filter(Boolean).join(' | ') : (activity.productId?.name || ''),
        resultado: activity.outcomeId?.name || '',
        tipo_proxima_accion: activity.nextActionType || '',
        venta_cerrada: activity.sale?.isClosed ? 'si' : 'no',
        cantidad_vendida: activity.sale?.quantity || '',
        precio_venta: activity.sale?.unitPrice || '',
        importe_total: activity.sale?.totalAmount || '',
        productos_vendidos: activity.sale?.items?.length
          ? activity.sale.items.map((item) => `${item.productId?.name || ''} x ${item.quantity} ${item.unit || ''} @ ${item.unitPrice}`).join(' | ')
          : (activity.sale?.isClosed && activity.productId?.name ? `${activity.productId.name} x ${activity.sale?.quantity || ''} @ ${activity.sale?.unitPrice || ''}` : ''),
        clientes_intermediarios: activity.sale?.intermediaryClientIds?.length
          ? activity.sale.intermediaryClientIds.map((client) => client.legalName).join(' | ')
          : '',
        estado: activity.status || '',
        duracion_min: activity.durationMinutes || '',
      }));
      downloadCsv(`registros_${new Date().toISOString().slice(0, 10)}.csv`, exportRows);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo exportar el listado de registros');
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

  function mapsUrl(lat, lng) {
    if (lat == null || lng == null) return null;
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fw-bold mb-0">Revisión de registros</h4>
        <button className="btn btn-outline-secondary" onClick={handleExport} disabled={loading || activities.length === 0}>
          Exportar CSV
        </button>
      </div>
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
        <div className="col-12 col-md-2">
          <label className="form-label mb-1 small">Representante</label>
          <select className="form-select" value={zoneId} onChange={e => { setZoneId(e.target.value); setPage(1); }}>
            <option value="">Todas</option>
            {zones.map(z => (
              <option key={z._id} value={z._id}>{z.name}</option>
            ))}
          </select>
        </div>
        <div className="col-6 col-md-2">
          <label className="form-label mb-1 small">Estado</label>
          <select className="form-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Todos</option>
            <option value="draft">Borrador</option>
            <option value="in_progress">En progreso</option>
            <option value="completed">Completada</option>
          </select>
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label mb-1 small">Buscar</label>
          <input
            type="text"
            className="form-control"
            placeholder="Cliente, CIF/NIF, ciudad o comercial..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="col-12 col-md-2 d-grid">
          <button className="btn btn-outline-secondary" onClick={() => { setFrom(''); setTo(''); setUserId(''); setZoneId(''); setStatus(''); setSearch(''); setPage(1); }}>
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
                        <div className="d-flex gap-2">
                          <button className="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#recordDetailModal" onClick={() => handleViewDetails(a._id)}>
                            Ver detalle
                          </button>
                          <Link to={`/activities/${a._id}`} className="btn btn-sm btn-primary">
                            Abrir ficha
                          </Link>
                        </div>
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
                  <p className="mb-1"><strong>Productos:</strong> {selectedActivity.productIds?.length ? selectedActivity.productIds.map((product) => product?.name).filter(Boolean).join(', ') : (selectedActivity.productId?.name || '-')}</p>
                  <p className="mb-1"><strong>Resultado:</strong> {selectedActivity.outcomeId?.name || '-'}</p>
                  <p className="mb-1"><strong>Estado:</strong> {selectedActivity.status}</p>
                  <p className="mb-1"><strong>Duración:</strong> {selectedActivity.durationMinutes ? `${selectedActivity.durationMinutes} min` : '-'}</p>
                  <p className="mb-1"><strong>Venta cerrada:</strong> {selectedActivity.sale?.isClosed ? 'Sí' : 'No'}</p>
                  {selectedActivity.sale?.isClosed && (
                    <>
                      <p className="mb-1"><strong>Total cantidad vendida:</strong> {selectedActivity.sale?.quantity ?? '-'}</p>
                      <p className="mb-1"><strong>Importe total:</strong> {selectedActivity.sale?.totalAmount != null ? `${selectedActivity.sale.totalAmount.toFixed(2)} €` : '-'}</p>
                      <div className="mb-1"><strong>Productos vendidos:</strong>
                        <ul className="mb-1">
                          {(selectedActivity.sale?.items?.length ? selectedActivity.sale.items : (selectedActivity.productId && selectedActivity.sale?.quantity != null ? [{ productId: selectedActivity.productId, quantity: selectedActivity.sale.quantity, unitPrice: selectedActivity.sale.unitPrice, totalAmount: selectedActivity.sale.totalAmount }] : [])).map((item, index) => (
                            <li key={index}>{item.productId?.name || selectedActivity.productId?.name || 'Producto'} · {item.quantity} {item.unit || ''} · {item.unitPrice != null ? `${Number(item.unitPrice).toFixed(2)} €` : '-'} · {item.totalAmount != null ? `${Number(item.totalAmount).toFixed(2)} €` : '-'}</li>
                          ))}
                        </ul>
                      </div>
                      <p className="mb-1">
                        <strong>Clientes intermediarios:</strong>{' '}
                        {selectedActivity.sale?.intermediaryClientIds?.length
                          ? selectedActivity.sale.intermediaryClientIds.map((client) => client.legalName).join(', ')
                          : 'Venta directa'}
                      </p>
                    </>
                  )}
                  <p className="mb-1"><strong>Notas:</strong> {selectedActivity.notes || '-'}</p>
                  <p className="mb-1"><strong>Próxima acción:</strong> {selectedActivity.nextActionDate ? formatDate(selectedActivity.nextActionDate) : '-'}</p>
                  <p className="mb-1"><strong>Tipo próxima acción:</strong> {selectedActivity.nextActionType || '-'}</p>
                  <p className="mb-3"><strong>Notas próxima acción:</strong> {selectedActivity.nextActionNotes || '-'}</p>

                  <h6 className="fw-bold">Check-in</h6>
                  <p className="mb-1"><strong>Fecha/hora:</strong> {formatDateTime(selectedActivity.checkIn?.at)}</p>
                  <p className="mb-1"><strong>Geo:</strong> lat {selectedActivity.checkIn?.geo?.lat ?? '-'}, lng {selectedActivity.checkIn?.geo?.lng ?? '-'}, accuracy {selectedActivity.checkIn?.geo?.accuracy ?? '-'} m</p>
                  {mapsUrl(selectedActivity.checkIn?.geo?.lat, selectedActivity.checkIn?.geo?.lng) && (
                    <p className="mb-3">
                      <a
                        href={mapsUrl(selectedActivity.checkIn?.geo?.lat, selectedActivity.checkIn?.geo?.lng)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-outline-primary"
                      >
                        Ver ubicación check-in (GPS)
                      </a>
                    </p>
                  )}

                  <h6 className="fw-bold">Check-out</h6>
                  <p className="mb-1"><strong>Fecha/hora:</strong> {formatDateTime(selectedActivity.checkOut?.at)}</p>
                  <p className="mb-1"><strong>Geo:</strong> lat {selectedActivity.checkOut?.geo?.lat ?? '-'}, lng {selectedActivity.checkOut?.geo?.lng ?? '-'}, accuracy {selectedActivity.checkOut?.geo?.accuracy ?? '-'} m</p>
                  {mapsUrl(selectedActivity.checkOut?.geo?.lat, selectedActivity.checkOut?.geo?.lng) && (
                    <p className="mb-1">
                      <a
                        href={mapsUrl(selectedActivity.checkOut?.geo?.lat, selectedActivity.checkOut?.geo?.lng)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-outline-primary"
                      >
                        Ver ubicación check-out (GPS)
                      </a>
                    </p>
                  )}
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
