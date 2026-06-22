import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { activityService, catalogService } from '../services';
import MultiClientAutocomplete from '../components/MultiClientAutocomplete';
import SaleItemsEditor from '../components/SaleItemsEditor';
import MultiProductAutocomplete from '../components/MultiProductAutocomplete';
import { formatDate, formatDateTime, statusBadge } from '../utils';

const NEXT_ACTION_OPTIONS = [
  { value: 'call', label: 'Llamada' },
  { value: 'email', label: 'Email' },
  { value: 'visit', label: 'Visita' },
  { value: 'other', label: 'Otra' },
];

function mapsUrl(lat, lng) {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export default function ActivityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activity, setActivity] = useState(null);
  const [products, setProducts] = useState([]);
  const [outcomes, setOutcomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [form, setForm] = useState({
    productIds: [],
    outcomeId: '',
    notes: '',
    nextActionDate: '',
    nextActionType: '',
    nextActionNotes: '',
    saleClosed: false,
    saleItems: [],
    saleIntermediaryClientIds: [],
    saleOrderNotes: '',
  });

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    catalogService.list('products').then((res) => setProducts(res.data.data || [])).catch(() => setProducts([]));
    catalogService.list('outcomes').then((res) => setOutcomes(res.data.data || [])).catch(() => setOutcomes([]));
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await activityService.get(id);
      const nextActivity = res.data.data;
      setActivity(nextActivity);
      setForm({
        productIds: (nextActivity.productIds?.length ? nextActivity.productIds : (nextActivity.productId ? [nextActivity.productId] : [])).map((product) => product?._id || product || ''),
        outcomeId: nextActivity.outcomeId?._id || nextActivity.outcomeId || '',
        notes: nextActivity.notes || '',
        nextActionDate: nextActivity.nextActionDate ? String(nextActivity.nextActionDate).slice(0, 10) : '',
        nextActionType: nextActivity.nextActionType || '',
        nextActionNotes: nextActivity.nextActionNotes || '',
        saleClosed: Boolean(nextActivity.sale?.isClosed),
        saleItems: (nextActivity.sale?.items?.length ? nextActivity.sale.items : (nextActivity.sale?.isClosed && nextActivity.productId ? [{ productId: nextActivity.productId?._id || nextActivity.productId, quantity: nextActivity.sale?.quantity != null ? String(nextActivity.sale.quantity) : '', unit: nextActivity.sale?.items?.[0]?.unit || '', unitPrice: nextActivity.sale?.unitPrice != null ? String(nextActivity.sale.unitPrice) : '' }] : [])).map((item) => ({ productId: item.productId?._id || item.productId || '', quantity: item.quantity != null ? String(item.quantity) : '', unit: item.unit || '', unitPrice: item.unitPrice != null ? String(item.unitPrice) : '' })),
        saleIntermediaryClientIds: (nextActivity.sale?.intermediaryClientIds || []).map((client) => client._id || client),
        saleOrderNotes: nextActivity.sale?.orderNotes || '',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar el detalle del registro');
    }
    setLoading(false);
  }

  async function handleSave() {
    setError('');
    setSaveMessage('');
    if (!form.productIds || form.productIds.length === 0) return setError('Selecciona al menos un producto');
    if (!form.outcomeId) return setError('Selecciona un resultado');
    if (!form.notes || form.notes.trim().length < 10) return setError('Las notas deben tener al menos 10 caracteres');
    if (form.saleClosed && form.saleItems.length === 0) return setError('Debes informar al menos un producto vendido');
    if (form.saleClosed && form.saleItems.some((item) => !item.productId || !item.quantity || Number(item.quantity) <= 0 || !item.unit || item.unitPrice === '' || Number(item.unitPrice) < 0)) return setError('Revisa las líneas de venta: producto, cantidad, unidad y precio son obligatorios');
    if (form.nextActionDate && !form.nextActionType) return setError('Selecciona el tipo de próxima acción');

    setSaving(true);
    try {
      await activityService.update(id, {
        productId: form.productIds[0] || '',
        productIds: form.productIds,
        outcomeId: form.outcomeId,
        notes: form.notes,
        nextActionDate: form.nextActionDate || null,
        nextActionType: form.nextActionDate ? form.nextActionType : null,
        nextActionNotes: form.nextActionNotes || null,
        sale: {
          isClosed: form.saleClosed,
          items: form.saleClosed ? form.saleItems.map((item) => ({ productId: item.productId, quantity: Number(item.quantity), unit: item.unit, unitPrice: Number(item.unitPrice) })) : [],
          quantity: null,
          unitPrice: null,
          intermediaryClientIds: form.saleClosed ? form.saleIntermediaryClientIds : [],
          orderNotes: form.saleClosed ? form.saleOrderNotes : null,
        },
      });
      await load();
      setEditing(false);
      setSaveMessage('Registro actualizado');
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar el registro');
    } finally {
      setSaving(false);
    }
  }

  const badge = statusBadge(activity?.status);
  const checkInMap = useMemo(() => mapsUrl(activity?.checkIn?.geo?.lat, activity?.checkIn?.geo?.lng), [activity?.checkIn?.geo?.lat, activity?.checkIn?.geo?.lng]);
  const checkOutMap = useMemo(() => mapsUrl(activity?.checkOut?.geo?.lat, activity?.checkOut?.geo?.lng), [activity?.checkOut?.geo?.lat, activity?.checkOut?.geo?.lng]);
  const canEdit = ['sales', 'manager', 'admin'].includes(user?.role) && activity?.status === 'completed';

  if (loading) {
    return <div className="text-center py-4"><div className="spinner-border text-primary" /></div>;
  }

  if (!activity) {
    return (
      <div>
        <div className="alert alert-danger py-2">{error || 'Registro no encontrado'}</div>
        <button className="btn btn-outline-secondary" onClick={() => navigate('/activities/my')}>Volver a mis actividades</button>
      </div>
    );
  }

  return (
    <div className="row g-3">
      <div className="col-12 col-xl-8">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h4 className="fw-bold mb-1">Detalle del registro</h4>
            <div className="text-muted small">Consulta todos los datos operativos, incluidos GPS y geofence.</div>
          </div>
          <div className="d-flex gap-2">
            {canEdit && !editing && (
              <button className="btn btn-primary" onClick={() => setEditing(true)}>
                Editar registro
              </button>
            )}
            <Link to={user?.role === 'admin' ? '/admin/records' : '/activities/my'} className="btn btn-outline-secondary">
              Volver
            </Link>
          </div>
        </div>

        {saveMessage && <div className="alert alert-success py-2">{saveMessage}</div>}
        {error && <div className="alert alert-danger py-2">{error}</div>}

        <div className="card mb-3">
          <div className="card-body small">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
              <span className={`badge ${badge.cls}`}>{badge.label}</span>
              <span className="fw-semibold">{activity.clientId?.legalName || 'Cliente'}</span>
            </div>
            <p className="mb-1"><strong>ID registro:</strong> <code>{activity._id}</code></p>
            <p className="mb-1"><strong>Fecha actividad:</strong> {formatDate(activity.activityDate)}</p>
            <p className="mb-1"><strong>Tipo:</strong> {activity.activityTypeId?.name || '-'}</p>
            <p className="mb-1"><strong>Productos:</strong> {activity.productIds?.length ? activity.productIds.map((product) => product?.name).filter(Boolean).join(', ') : (activity.productId?.name || '-')}</p>
            <p className="mb-1"><strong>Resultado:</strong> {activity.outcomeId?.name || '-'}</p>
            <p className="mb-1"><strong>Duración:</strong> {activity.durationMinutes ? `${activity.durationMinutes} min` : '-'}</p>
            <p className="mb-1"><strong>Cliente:</strong> <Link to={`/clients/${activity.clientId?._id}`}>{activity.clientId?.legalName || '-'}</Link></p>
            <p className="mb-1"><strong>CIF/NIF:</strong> {activity.clientId?.taxId || '-'}</p>
            <p className="mb-1"><strong>Ciudad:</strong> {activity.clientId?.city || '-'} {activity.clientId?.province ? `· ${activity.clientId.province}` : ''}</p>
            <p className="mb-1"><strong>Venta cerrada:</strong> {activity.sale?.isClosed ? 'Sí' : 'No'}</p>
            {activity.sale?.isClosed && (
              <>
                <p className="mb-1"><strong>Total cantidad vendida:</strong> {activity.sale?.quantity ?? '-'}</p>
                <p className="mb-1"><strong>Importe total:</strong> {activity.sale?.totalAmount != null ? `${activity.sale.totalAmount.toFixed(2)} €` : '-'}</p>
                <div className="mb-1">
                  <strong>Productos vendidos:</strong>
                  <ul className="mb-1">
                    {(activity.sale?.items?.length ? activity.sale.items : (activity.productId && activity.sale?.quantity != null ? [{ productId: activity.productId, quantity: activity.sale.quantity, unitPrice: activity.sale.unitPrice, totalAmount: activity.sale.totalAmount }] : [])).map((item, index) => (
                      <li key={index}>{item.productId?.name || activity.productId?.name || 'Producto'} · {item.quantity} {item.unit || ''} · {item.unitPrice != null ? `${Number(item.unitPrice).toFixed(2)} €` : '-'} · {item.totalAmount != null ? `${Number(item.totalAmount).toFixed(2)} €` : '-'}</li>
                    ))}
                  </ul>
                </div>
                <p className="mb-1">
                  <strong>Cliente Directo:</strong>{' '}
                  {activity.sale?.intermediaryClientIds?.length
                    ? activity.sale.intermediaryClientIds.map((client) => client.legalName).join(', ')
                    : 'Venta directa'}
                </p>
                <p className="mb-1"><strong>Notas del pedido:</strong> {activity.sale?.orderNotes || '-'}</p>
                {activity.sale?.orderEmail?.status && activity.sale.orderEmail.status !== 'none' && (
                  <p className="mb-1"><strong>Email pedido:</strong> {activity.sale.orderEmail.status === 'sent' ? `Enviado a ${activity.sale.orderEmail.recipientEmail}` : `No enviado: ${activity.sale.orderEmail.error || '-'}`}</p>
                )}
              </>
            )}
            <p className="mb-1"><strong>Notas:</strong> {activity.notes || '-'}</p>
            <p className="mb-1"><strong>Próxima acción:</strong> {activity.nextActionDate ? formatDate(activity.nextActionDate) : '-'}</p>
            <p className="mb-1"><strong>Tipo próxima acción:</strong> {NEXT_ACTION_OPTIONS.find((option) => option.value === activity.nextActionType)?.label || '-'}</p>
            <p className="mb-0"><strong>Notas próxima acción:</strong> {activity.nextActionNotes || '-'}</p>
          </div>
        </div>

        {editing && (
          <div className="card mb-3 border-primary">
            <div className="card-header fw-bold">Editar registro</div>
            <div className="card-body">
              <div className="row g-2 mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Productos *</label>
                  <MultiProductAutocomplete
                    products={products}
                    value={form.productIds}
                    onChange={(ids) => setForm((current) => ({ ...current, productIds: ids }))}
                    placeholder="Buscar productos..."
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Resultado *</label>
                  <select
                    className="form-select"
                    value={form.outcomeId}
                    onChange={(e) => setForm((current) => ({ ...current, outcomeId: e.target.value }))}
                  >
                    <option value="">Selecciona...</option>
                    {outcomes.map((outcome) => <option key={outcome._id} value={outcome._id}>{outcome.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Notas *</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
                />
              </div>
              <div className="row g-2 mb-3">
                <div className="col-md-4">
                  <label className="form-label">Próxima acción</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.nextActionDate}
                    onChange={(e) => setForm((current) => ({
                      ...current,
                      nextActionDate: e.target.value,
                      nextActionType: e.target.value ? current.nextActionType : '',
                    }))}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Tipo próxima acción</label>
                  <select
                    className="form-select"
                    value={form.nextActionType}
                    onChange={(e) => setForm((current) => ({ ...current, nextActionType: e.target.value }))}
                    disabled={!form.nextActionDate}
                  >
                    <option value="">Selecciona...</option>
                    {NEXT_ACTION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Notas próxima acción</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.nextActionNotes}
                    onChange={(e) => setForm((current) => ({ ...current, nextActionNotes: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-check form-switch mb-3">
                <input
                  id="activity-detail-sale-closed"
                  className="form-check-input"
                  type="checkbox"
                  checked={form.saleClosed}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setForm((current) => ({
                      ...current,
                      saleClosed: checked,
                      saleItems: checked ? current.saleItems : [],
                      saleIntermediaryClientIds: checked ? current.saleIntermediaryClientIds : [],
                      saleOrderNotes: checked ? current.saleOrderNotes : '',
                    }));
                  }}
                />
                <label className="form-check-label fw-semibold" htmlFor="activity-detail-sale-closed">
                  Se ha cerrado una venta en este registro
                </label>
              </div>
              {form.saleClosed && (
                <div className="border rounded p-3 mb-3 bg-light-subtle">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Productos vendidos *</label>
                    <SaleItemsEditor products={products} items={form.saleItems} onChange={(items) => setForm((current) => ({ ...current, saleItems: items }))} />
                  </div>
                  <div className="mb-2">
                    <label className="form-label fw-semibold">Cliente Directo</label>
                    <MultiClientAutocomplete
                      value={form.saleIntermediaryClientIds}
                      onChange={(ids) => setForm((current) => ({ ...current, saleIntermediaryClientIds: ids }))}
                      excludedClientId={activity.clientId?._id || activity.clientId}
                    />
                    <div className="form-text">Si el cliente actual es indirecto, indicar arriba los clientes directos asociados a la venta</div>
                  </div>
                  <div className="mb-2">
                    <label className="form-label fw-semibold">Notas del pedido</label>
                    <textarea className="form-control" rows={2} value={form.saleOrderNotes} onChange={(e) => setForm((current) => ({ ...current, saleOrderNotes: e.target.value }))} placeholder="Delegación, dirección de envío, observaciones del pedido..." />
                    <div className="form-text">Se enviará por email solo si el cliente actual es directo y no indicas Cliente Directo.</div>
                  </div>
                </div>
              )}
              <div className="d-flex gap-2">
                <button className="btn btn-outline-secondary" onClick={() => { setEditing(false); load(); }} disabled={saving}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="card mb-3">
          <div className="card-header fw-bold">Check-in</div>
          <div className="card-body small">
            <p className="mb-1"><strong>Fecha/hora:</strong> {formatDateTime(activity.checkIn?.at)}</p>
            <p className="mb-1"><strong>Latitud:</strong> {activity.checkIn?.geo?.lat ?? '-'}</p>
            <p className="mb-1"><strong>Longitud:</strong> {activity.checkIn?.geo?.lng ?? '-'}</p>
            <p className="mb-3"><strong>Precisión:</strong> {activity.checkIn?.geo?.accuracy ?? activity.checkIn?.geo?.accuracyMeters ?? '-'}{activity.checkIn?.geo?.accuracy || activity.checkIn?.geo?.accuracyMeters ? ' m' : ''}</p>
            {checkInMap && (
              <a href={checkInMap} target="_blank" rel="noreferrer" className="btn btn-outline-primary btn-sm">
                Abrir GPS de check-in
              </a>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header fw-bold">Check-out</div>
          <div className="card-body small">
            <p className="mb-1"><strong>Fecha/hora:</strong> {formatDateTime(activity.checkOut?.at)}</p>
            <p className="mb-1"><strong>Latitud:</strong> {activity.checkOut?.geo?.lat ?? '-'}</p>
            <p className="mb-1"><strong>Longitud:</strong> {activity.checkOut?.geo?.lng ?? '-'}</p>
            <p className="mb-1"><strong>Precisión:</strong> {activity.checkOut?.geo?.accuracy ?? activity.checkOut?.geo?.accuracyMeters ?? '-'}{activity.checkOut?.geo?.accuracy || activity.checkOut?.geo?.accuracyMeters ? ' m' : ''}</p>
            <p className="mb-3"><strong>Geofence:</strong> {activity.checkOut?.distanceToClientMeters != null ? `${Math.round(activity.checkOut.distanceToClientMeters)} m` : '-'} · {activity.checkOut?.withinExpectedArea == null ? '-' : (activity.checkOut.withinExpectedArea ? 'Dentro de zona' : 'Fuera de zona')}</p>
            {checkOutMap && (
              <a href={checkOutMap} target="_blank" rel="noreferrer" className="btn btn-outline-primary btn-sm">
                Abrir GPS de check-out
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
