import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { activityService, catalogService } from '../services';
import ClientAutocomplete from '../components/ClientAutocomplete';
import MultiClientAutocomplete from '../components/MultiClientAutocomplete';
import MultiProductAutocomplete from '../components/MultiProductAutocomplete';
import SaleItemsEditor from '../components/SaleItemsEditor';
import { todayISO } from '../utils';

const NEXT_ACTION_OPTIONS = [
  { value: 'call', label: 'Llamada' },
  { value: 'email', label: 'Email' },
  { value: 'visit', label: 'Visita' },
  { value: 'other', label: 'Otra' },
];

export default function QuickRegisterPage() {
  const navigate = useNavigate();
  const [activityTypes, setActivityTypes] = useState([]);
  const [products, setProducts] = useState([]);
  const [outcomes, setOutcomes] = useState([]);

  const [clientId, setClientId] = useState('');
  const [activityTypeId, setActivityTypeId] = useState('');
  const [productIds, setProductIds] = useState([]);
  const [outcomeId, setOutcomeId] = useState('');
  const [saleClosed, setSaleClosed] = useState(false);
  const [saleItems, setSaleItems] = useState([]);
  const [saleIntermediaryClientIds, setSaleIntermediaryClientIds] = useState([]);
  const [saleOrderNotes, setSaleOrderNotes] = useState('');
  const [activityDate, setActivityDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [nextActionType, setNextActionType] = useState('');
  const [nextActionNotes, setNextActionNotes] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([catalogService.list('activity-types'), catalogService.list('products'), catalogService.list('outcomes')])
      .then(([at, pr, oc]) => {
        setActivityTypes(at.data.data);
        setProducts(pr.data.data);
        setOutcomes(oc.data.data);
      });

  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!clientId) return setError('Selecciona un cliente');
    if (productIds.length === 0) return setError('Selecciona al menos un producto');
    if (!notes || notes.length < 10) return setError('Las notas deben tener al menos 10 caracteres');
    if (!durationMinutes || Number(durationMinutes) <= 0) return setError('La duración debe ser mayor a 0');
    if (saleClosed && saleItems.length === 0) return setError('Debes informar al menos un producto vendido');
    if (saleClosed && saleItems.some((item) => !item.productId || !item.quantity || Number(item.quantity) <= 0 || !Number.isInteger(Number(item.quantity)) || !item.unit || item.unitPrice === '' || Number(item.unitPrice) < 0)) {
      return setError('Revisa las líneas de venta: producto, cantidad entera, unidad y precio son obligatorios');
    }
    if (nextActionDate && !nextActionType) return setError('Selecciona el tipo de próxima acción');
    setLoading(true);
    try {
      await activityService.quick({
        clientId, activityTypeId, productId: productIds[0] || '', productIds, outcomeId, activityDate, notes,
        durationMinutes: Number(durationMinutes),
        nextActionDate: nextActionDate || null,
        nextActionType: nextActionDate ? nextActionType : null,
        nextActionNotes: nextActionNotes || null,
        sale: {
          isClosed: saleClosed,
          items: saleClosed ? saleItems.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity),
            unit: item.unit,
            unitPrice: Number(item.unitPrice),
          })) : [],
          quantity: null,
          unitPrice: null,
          intermediaryClientIds: saleClosed ? saleIntermediaryClientIds : [],
          orderNotes: saleClosed ? saleOrderNotes : null,
        },
        geo: null,
      });
      setSuccess(true);
      setTimeout(() => navigate('/activities/my'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.join(', ') || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return <div className="alert alert-success text-center mt-4"><strong>Actividad registrada correctamente</strong></div>;
  }

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-md-8 col-lg-6">
        <h4 className="fw-bold mb-3">Registro rápido de actividad</h4>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-semibold">Fecha *</label>
                <input type="date" className="form-control" value={activityDate} onChange={e => setActivityDate(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Cliente *</label>
                <ClientAutocomplete value={clientId} onChange={(id) => setClientId(id)} allowCreate />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Tipo de actividad *</label>
                <select className="form-select" value={activityTypeId} onChange={e => setActivityTypeId(e.target.value)} required>
                  <option value="">Selecciona...</option>
                  {activityTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label fw-semibold">Productos *</label>
                  <MultiProductAutocomplete
                    products={products}
                    value={productIds}
                    onChange={setProductIds}
                    placeholder="Buscar productos..."
                  />
                </div>
                <div className="col-6">
                  <label className="form-label fw-semibold">Resultado *</label>
                  <select className="form-select" value={outcomeId} onChange={e => setOutcomeId(e.target.value)} required>
                    <option value="">Selecciona...</option>
                    {outcomes.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Notas * (mín. 10 caracteres)</label>
                <textarea className="form-control" rows={3} value={notes} onChange={e => setNotes(e.target.value)} required />
                <div className="form-text">{notes.length} caracteres</div>
              </div>
              <div className="form-check form-switch mb-3">
                <input
                  id="quick-register-sale-closed"
                  className="form-check-input"
                  type="checkbox"
                  checked={saleClosed}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSaleClosed(checked);
                    if (!checked) {
                      setSaleItems([]);
                      setSaleIntermediaryClientIds([]);
                      setSaleOrderNotes('');
                    }
                  }}
                />
                <label className="form-check-label fw-semibold" htmlFor="quick-register-sale-closed">
                  Se ha cerrado una venta en esta actividad
                </label>
              </div>
              {saleClosed && (
                <div className="border rounded p-3 mb-3 bg-light-subtle">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Productos vendidos *</label>
                    <SaleItemsEditor products={products} items={saleItems} onChange={setSaleItems} />
                  </div>
                  <div className="mb-2">
                    <label className="form-label fw-semibold">Cliente Directo</label>
                    <MultiClientAutocomplete
                      value={saleIntermediaryClientIds}
                      onChange={setSaleIntermediaryClientIds}
                      excludedClientId={clientId}
                    />
                    <div className="form-text">
                      Si el cliente actual es indirecto, indicar arriba los clientes directos asociados a la venta
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="form-label fw-semibold">Notas del pedido</label>
                    <textarea className="form-control" rows={2} value={saleOrderNotes} onChange={e => setSaleOrderNotes(e.target.value)} placeholder="Delegación, dirección de envío, observaciones del pedido..." />
                    <div className="form-text">Se enviará por email solo si el cliente actual es directo y no indicas Cliente Directo.</div>
                  </div>
                </div>
              )}
              <div className="mb-3">
                <label className="form-label fw-semibold">Duración (minutos) *</label>
                <input type="number" className="form-control" min={1} value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} required />
              </div>
              <div className="row g-2 mb-3">
                <div className="col-md-4">
                  <label className="form-label">Próxima acción</label>
                  <input
                    type="date"
                    className="form-control"
                    value={nextActionDate}
                    onChange={e => {
                      const value = e.target.value;
                      setNextActionDate(value);
                      if (!value) setNextActionType('');
                    }}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Tipo próxima acción</label>
                  <select
                    className="form-select"
                    value={nextActionType}
                    onChange={e => setNextActionType(e.target.value)}
                    disabled={!nextActionDate}
                  >
                    <option value="">Selecciona...</option>
                    {NEXT_ACTION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Notas próxima acción</label>
                  <input type="text" className="form-control" value={nextActionNotes} onChange={e => setNextActionNotes(e.target.value)} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary w-100 btn-lg" disabled={loading}>
                {loading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                Guardar actividad
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
