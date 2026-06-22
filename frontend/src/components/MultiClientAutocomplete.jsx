import React, { useEffect, useRef, useState } from 'react';
import { clientService } from '../services';

export default function MultiClientAutocomplete({
  value = [],
  onChange,
  excludedClientId = null,
  placeholder = 'Buscar cliente directo...',
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [show, setShow] = useState(false);
  const [selectedClients, setSelectedClients] = useState([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    const selectedIds = selectedClients.map((client) => String(client._id));
    const expectedIds = (value || []).map(String);
    const hasSameIds = selectedIds.length === expectedIds.length
      && selectedIds.every((id) => expectedIds.includes(id));

    if (!expectedIds.length) {
      setSelectedClients([]);
      return;
    }
    if (hasSameIds) return;

    let cancelled = false;
    Promise.all(expectedIds.map((id) => clientService.get(id).then((res) => res.data?.data).catch(() => null)))
      .then((clients) => {
        if (cancelled) return;
        setSelectedClients(clients.filter(Boolean));
      });

    return () => {
      cancelled = true;
    };
  }, [value]);

  function emit(nextClients) {
    setSelectedClients(nextClients);
    onChange(nextClients.map((client) => client._id));
  }

  function handleInput(event) {
    const nextQuery = event.target.value;
    setQuery(nextQuery);
    clearTimeout(debounceRef.current);

    if (nextQuery.trim().length < 2) {
      setResults([]);
      setShow(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await clientService.list({ search: nextQuery.trim(), limit: 1000 });
        const selectedIds = new Set(selectedClients.map((client) => String(client._id)));
        const items = (res.data?.data || []).filter((client) => {
          const clientId = String(client._id);
          return clientId !== String(excludedClientId || '') && !selectedIds.has(clientId);
        });
        setResults(items);
        setShow(true);
      } catch {
        setResults([]);
        setShow(false);
      }
    }, 250);
  }

  function handleSelect(client) {
    const nextClients = [...selectedClients, client];
    emit(nextClients);
    setQuery('');
    setResults([]);
    setShow(false);
  }

  function handleRemove(clientId) {
    emit(selectedClients.filter((client) => String(client._id) !== String(clientId)));
  }

  return (
    <div className="position-relative">
      {selectedClients.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-2">
          {selectedClients.map((client) => (
            <span key={client._id} className="badge text-bg-light border d-inline-flex align-items-center gap-2 px-2 py-2">
              <span>{client.legalName}</span>
              <button
                type="button"
                className="btn-close btn-close-sm"
                aria-label={`Quitar ${client.legalName}`}
                onClick={() => handleRemove(client._id)}
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
        onChange={handleInput}
        onBlur={() => setTimeout(() => setShow(false), 200)}
        autoComplete="off"
      />

      {show && (
        <ul className="list-group position-absolute w-100 shadow" style={{ zIndex: 1000, maxHeight: 240, overflowY: 'auto' }}>
          {results.length === 0 && <li className="list-group-item text-muted">Sin resultados</li>}
          {results.map((client) => (
            <li
              key={client._id}
              className="list-group-item list-group-item-action"
              onMouseDown={() => handleSelect(client)}
            >
              <strong>{client.legalName}</strong>
              <span className="text-muted ms-2 small">{client.taxId}</span>
              <span className="text-muted ms-2 small">{client.city}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
