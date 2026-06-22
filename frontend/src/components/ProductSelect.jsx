import React, { useEffect, useMemo, useState } from 'react';

export default function ProductSelect({
  products,
  value,
  onChange,
  required = false,
  selectId,
  label = 'Buscar producto...',
}) {
  const [query, setQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!value) {
      setSelectedLabel('');
      setQuery('');
      return;
    }

    const selected = products.find((product) => product._id === value);
    if (!selected) return;
    setSelectedLabel(selected.name);
    setQuery(selected.name);
  }, [value, products]);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];
    return products
      .filter((product) => product.name.toLowerCase().includes(term))
      .slice(0, 20);
  }, [products, query]);

  function handleInput(e) {
    const nextQuery = e.target.value;
    setQuery(nextQuery);
    setSelectedLabel('');
    if (value) onChange('');
    setShow(nextQuery.trim().length >= 2);
  }

  function handleSelect(product) {
    setQuery(product.name);
    setSelectedLabel(product.name);
    setShow(false);
    onChange(product._id);
  }

  return (
    <div className="position-relative">
      <input
        id={selectId}
        type="text"
        className="form-control"
        placeholder={label}
        value={query || selectedLabel}
        onChange={handleInput}
        onFocus={() => {
          if ((query || selectedLabel).trim().length >= 2) setShow(true);
        }}
        onBlur={() => setTimeout(() => setShow(false), 200)}
        autoComplete="off"
        required={required && !value}
        data-testid="product-autocomplete-input"
      />
      {show && (
        <ul
          className="list-group position-absolute w-100 shadow mt-1"
          style={{ zIndex: 1000, maxHeight: 280, overflowY: 'auto' }}
        >
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <li
                key={product._id}
                className="list-group-item list-group-item-action"
                onMouseDown={() => handleSelect(product)}
              title={product.name}
              style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
              >
                {product.name}
              </li>
            ))
          ) : (
            <li className="list-group-item text-muted">Sin resultados</li>
          )}
        </ul>
      )}
      {query && (
        <div className="form-text">
          {filteredProducts.length} producto(s) encontrado(s)
        </div>
      )}
    </div>
  );
}
