import React, { useEffect, useMemo, useState } from 'react';

export default function MultiProductAutocomplete({
  products = [],
  value = [],
  onChange,
  placeholder = 'Buscar productos...',
}) {
  const [query, setQuery] = useState('');
  const [show, setShow] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);

  useEffect(() => {
    const expectedIds = (value || []).map(String);
    if (!expectedIds.length) {
      setSelectedProducts([]);
      return;
    }

    const nextSelected = expectedIds
      .map((id) => products.find((product) => String(product._id) === id))
      .filter(Boolean);

    const currentIds = selectedProducts.map((product) => String(product._id));
    const same = currentIds.length == expectedIds.length && currentIds.every((id) => expectedIds.includes(id));
    if (!same) setSelectedProducts(nextSelected);
  }, [value, products]);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];
    const selectedIds = new Set(selectedProducts.map((product) => String(product._id)));
    return products
      .filter((product) => !selectedIds.has(String(product._id)))
      .filter((product) => product.name.toLowerCase().includes(term))
      .slice(0, 20);
  }, [products, query, selectedProducts]);

  function emit(nextProducts) {
    setSelectedProducts(nextProducts);
    onChange(nextProducts.map((product) => product._id));
  }

  function handleSelect(product) {
    emit([...selectedProducts, product]);
    setQuery('');
    setShow(false);
  }

  function handleRemove(productId) {
    emit(selectedProducts.filter((product) => String(product._id) !== String(productId)));
  }

  return (
    <div className="position-relative">
      {selectedProducts.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-2">
          {selectedProducts.map((product) => (
            <span key={product._id} className="badge text-bg-light border d-inline-flex align-items-center gap-2 px-2 py-2">
              <span>{product.name}</span>
              <button
                type="button"
                className="btn-close btn-close-sm"
                aria-label={`Quitar ${product.name}`}
                onClick={() => handleRemove(product._id)}
              />
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        className="form-control"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          const nextQuery = e.target.value;
          setQuery(nextQuery);
          setShow(nextQuery.trim().length >= 2);
        }}
        onFocus={() => {
          if (query.trim().length >= 2) setShow(true);
        }}
        onBlur={() => setTimeout(() => setShow(false), 200)}
        autoComplete="off"
      />

      {show && (
        <ul className="list-group position-absolute w-100 shadow mt-1" style={{ zIndex: 1000, maxHeight: 240, overflowY: 'auto' }}>
          {filteredProducts.length === 0 && <li className="list-group-item text-muted">Sin resultados</li>}
          {filteredProducts.map((product) => (
            <li
              key={product._id}
              className="list-group-item list-group-item-action"
              onMouseDown={() => handleSelect(product)}
            >
              {product.name}
            </li>
          ))}
        </ul>
      )}

      {query && <div className="form-text">{filteredProducts.length} producto(s) encontrado(s)</div>}
    </div>
  );
}
