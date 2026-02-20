import React, { useState, useEffect, useRef } from 'react';
import { clientService } from '../services';

export default function ClientAutocomplete({ value, onChange, placeholder = 'Buscar cliente...' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!value) { setSelected(null); setQuery(''); }
  }, [value]);

  function handleInput(e) {
    const q = e.target.value;
    setQuery(q);
    if (selected) { setSelected(null); onChange(null); }
    clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults([]); setShow(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await clientService.list({ search: q, limit: 10 });
        setResults(res.data.data || []);
        setShow(true);
      } catch { setResults([]); }
    }, 300);
  }

  function handleSelect(client) {
    setSelected(client);
    setQuery(client.legalName);
    setShow(false);
    onChange(client._id, client);
  }

  return (
    <div className="position-relative">
      <input
        type="text"
        className="form-control"
        placeholder={placeholder}
        value={query}
        onChange={handleInput}
        onBlur={() => setTimeout(() => setShow(false), 200)}
        autoComplete="off"
      />
      {show && results.length > 0 && (
        <ul className="list-group position-absolute w-100 shadow" style={{ zIndex: 1000, maxHeight: 240, overflowY: 'auto' }}>
          {results.map(c => (
            <li
              key={c._id}
              className="list-group-item list-group-item-action"
              onMouseDown={() => handleSelect(c)}
            >
              <strong>{c.legalName}</strong>
              <span className="text-muted ms-2 small">{c.taxId}</span>
              <span className="text-muted ms-2 small">{c.city}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
