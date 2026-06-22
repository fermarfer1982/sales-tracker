import React from 'react';
import ProductSelect from './ProductSelect';

function normalizeQuantityToThousands(value) {
  return Number(value) / 1000;
}

export default function SaleItemsEditor({ products, items, onChange }) {
  const safeItems = Array.isArray(items) ? items : [];

  function updateItem(index, patch) {
    onChange(safeItems.map((item, currentIndex) => currentIndex === index ? { ...item, ...patch } : item));
  }

  function addItem() {
    onChange([...safeItems, { productId: '', quantity: '', unit: '', unitPrice: '' }]);
  }

  function removeItem(index) {
    onChange(safeItems.filter((_, currentIndex) => currentIndex !== index));
  }

  const totalAmount = safeItems.reduce((sum, item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return sum;
    return sum + (normalizeQuantityToThousands(quantity) * unitPrice);
  }, 0);

  return (
    <div className="d-grid gap-3">
      {safeItems.map((item, index) => (
        <div key={index} className="border rounded p-3 bg-white">
          <div className="row g-2 align-items-end">
            <div className="col-12">
              <label className="form-label fw-semibold">Producto vendido *</label>
              <ProductSelect
                products={products}
                value={item.productId}
                onChange={(value) => updateItem(index, { productId: value })}
                selectId={`sale-item-product-${index}`}
              />
              <div className="form-text text-break">
                {(products.find((product) => product._id === item.productId)?.name) || 'Selecciona un producto para ver el nombre completo'}
              </div>
            </div>
            <div className="col-6 col-lg-2">
              <label className="form-label fw-semibold">Cantidad introducida *</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="form-control"
                value={item.quantity}
                onChange={(e) => updateItem(index, { quantity: e.target.value.replace(/[^0-9]/g, '') })}
              />
              <div className="form-text">Solo números enteros. Se convierte automáticamente a millares al guardar</div>
            </div>
            <div className="col-6 col-lg-2">
              <label className="form-label fw-semibold">Unidad *</label>
              <select
                className="form-select"
                value={item.unit || ''}
                onChange={(e) => updateItem(index, { unit: e.target.value })}
              >
                <option value="">Selecciona...</option>
                <option value="SE">SE</option>
                <option value="PI">PI</option>
                <option value="GR">GR</option>
              </select>
            </div>
            <div className="col-6 col-lg-2">
              <label className="form-label fw-semibold">Precio *</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="form-control"
                value={item.unitPrice}
                onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
              />
            </div>
            <div className="col-12 col-lg-2 d-grid">
              <button type="button" className="btn btn-outline-danger" onClick={() => removeItem(index)}>
                Quitar
              </button>
            </div>
          </div>
          <div className="form-text mt-2">
            Cantidad normalizada: {Number(item.quantity) > 0 ? `${normalizeQuantityToThousands(item.quantity).toFixed(3)}` : '-'} {item.unit ? `· ${item.unit}` : ''}
          </div>
          <div className="form-text">
            Importe línea: {Number(item.quantity) > 0 && Number(item.unitPrice) >= 0 ? `${(normalizeQuantityToThousands(Number(item.quantity)) * Number(item.unitPrice)).toFixed(2)} €` : '-'} {item.unit ? `· ${item.unit}` : ''}
          </div>
        </div>
      ))}
      <div className="d-flex justify-content-between align-items-center">
        <button type="button" className="btn btn-outline-primary" onClick={addItem}>+ Añadir producto</button>
        <div className="fw-semibold">Total venta: {totalAmount.toFixed(2)} €</div>
      </div>
    </div>
  );
}
