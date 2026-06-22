import React, { useState, useEffect, useRef } from 'react';
import { clientService } from '../services';
import QuickClientCreateModal from './QuickClientCreateModal';

export default function ClientAutocomplete({ value, onChange, placeholder = 'Buscar cliente...', allowCreate = false }) {
  const [query, setQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const [results, setResults] = useState([]);
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    if (!value) {
      setSelected(null);
      setQuery('');
      setSelectedLabel('');
      return undefined;
    }

    if (selected?._id === value) {
      const label = selected.legalName || '';
      setQuery(label);
      setSelectedLabel(label);
      return undefined;
    }

    clientService.get(value)
      .then((res) => {
        if (cancelled) return;
        const client = res.data?.data;
        if (!client) return;
        const label = client.legalName || '';
        setSelected(client);
        setQuery(label);
        setSelectedLabel(label);
      })
      .catch(() => {
        if (cancelled) return;
        setSelected(null);
      });

    return () => {
      cancelled = true;
    };
  }, [value]);

  function handleInput(e) {
    const q = e.target.value;
    setQuery(q);
    setSelectedLabel('');
    if (selected) { setSelected(null); onChange(null); }
    clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults([]); setShow(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await clientService.list({ search: q, limit: 1000 });
        setResults(res.data.data || []);
        setShow(true);
      } catch { setResults([]); }
    }, 300);
  }

  function handleSelect(client) {
    setSelected(client);
    setQuery(client.legalName);
    setSelectedLabel(client.legalName);
    setShow(false);
    onChange(client._id, client);
  }

  function handleCreated(client) {
    setSelected(client);
    setQuery(client.legalName);
    setSelectedLabel(client.legalName);
    setResults([]);
    setShow(false);
    setShowCreateModal(false);
    onChange(client._id, client);
  }

  return (
    <>
      <div className="position-relative">
        <input
          type="text"
          className="form-control"
          placeholder={placeholder}
          value={query || selectedLabel}
          onChange={handleInput}
          onBlur={() => setTimeout(() => setShow(false), 200)}
          autoComplete="off"
          data-testid="client-autocomplete-input"
        />
        {show && (
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
            {allowCreate && (
              <li
                className={`list-group-item list-group-item-action ${results.length === 0 ? 'text-primary fw-semibold' : 'border-top'}`}
                data-testid="client-autocomplete-create"
                onMouseDown={() => {
                  setShow(false);
                  setShowCreateModal(true);
                }}
              >
                Crear cliente nuevo{query ? `: "${query}"` : ''}
              </li>
            )}
          </ul>
        )}
      </div>

      <QuickClientCreateModal
        open={showCreateModal}
        initialName={query}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCreated}
      />
    </>
  );
}
