import React, { useState, useEffect } from 'react';
import { catalogService } from '../services';

const CATALOG_TYPES = [
  { key: 'activity-types', label: 'Tipos de actividad' },
  { key: 'products', label: 'Productos' },
  { key: 'outcomes', label: 'Resultados' },
  { key: 'zones', label: 'Representantes' },
  { key: 'segments', label: 'Segmentos' },
];

export default function AdminCatalogsPage() {
  const [activeType, setActiveType] = useState('activity-types');
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); setNewName(''); setEditId(null); setError(''); setSearch(''); }, [activeType]);

  const filteredItems = items.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase()));

  async function load() {
    setLoading(true);
    try {
      const res = await catalogService.list(activeType, { showAll: 'true' });
      setItems(res.data.data);
    } catch {}
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await catalogService.create(activeType, { name: newName });
      setNewName('');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear');
    }
  }

  async function handleUpdate(id) {
    setError('');
    try {
      await catalogService.update(activeType, id, { name: editName });
      setEditId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar');
    }
  }

  async function toggleActive(item) {
    try {
      await catalogService.update(activeType, item._id, { isActive: !item.isActive });
      load();
    } catch {}
  }

  async function handleDelete(item) {
    if (!window.confirm(`¿Seguro que quieres borrar "${item.name}"?`)) return;
    setError('');
    try {
      await catalogService.delete(activeType, item._id);
      if (editId === item._id) setEditId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al borrar');
    }
  }

  return (
    <div>
      <h4 className="fw-bold mb-3">Gestión de catálogos</h4>
      <div className="d-flex flex-wrap gap-2 mb-3">
        {CATALOG_TYPES.map(ct => (
          <button
            key={ct.key}
            className={`btn btn-sm ${activeType === ct.key ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setActiveType(ct.key)}
          >
            {ct.label}
          </button>
        ))}
      </div>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="card">
        <div className="card-body">
          <form className="d-flex gap-2 mb-3" onSubmit={handleCreate}>
            <input
              type="text"
              className="form-control"
              placeholder="Nombre nuevo elemento..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary text-nowrap">+ Añadir</button>
          </form>
          <div className="mb-3">
            <input
              type="text"
              className="form-control"
              placeholder={`Buscar en ${CATALOG_TYPES.find((item) => item.key === activeType)?.label?.toLowerCase() || 'catálogo'}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && <div className="form-text">{filteredItems.length} resultado(s)</div>}
          </div>
          {loading ? (
            <div className="text-center"><div className="spinner-border spinner-border-sm" /></div>
          ) : (
            <table className="table table-sm align-middle">
              <thead className="table-light">
                <tr><th>Nombre</th><th>Activo</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr key={item._id}>
                    <td>
                      {editId === item._id ? (
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                        />
                      ) : (
                        <span className={!item.isActive ? 'text-muted text-decoration-line-through' : ''}>{item.name}</span>
                      )}
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${item.isActive ? 'btn-success' : 'btn-outline-secondary'}`}
                        onClick={() => toggleActive(item)}
                      >
                        {item.isActive ? 'Sí' : 'No'}
                      </button>
                    </td>
                    <td>
                      {editId === item._id ? (
                        <>
                          <button className="btn btn-sm btn-success me-1" onClick={() => handleUpdate(item._id)}>Guardar</button>
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => setEditId(null)}>Cancelar</button>
                        </>
                      ) : (
                        <div className="d-flex gap-1">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => { setEditId(item._id); setEditName(item.name); }}>
                            Editar
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(item)}>
                            Borrar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!filteredItems.length && (
                  <tr>
                    <td colSpan={3} className="text-center text-muted py-3">No hay elementos para ese filtro</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
