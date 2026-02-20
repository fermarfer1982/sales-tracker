import React, { useState, useEffect } from 'react';
import { catalogService } from '../services';

const CATALOG_TYPES = [
  { key: 'activity-types', label: 'Tipos de actividad' },
  { key: 'products', label: 'Productos' },
  { key: 'outcomes', label: 'Resultados' },
  { key: 'zones', label: 'Zonas' },
  { key: 'segments', label: 'Segmentos' },
];

export default function AdminCatalogsPage() {
  const [activeType, setActiveType] = useState('activity-types');
  const [items, setItems] = useState([]);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); setNewName(''); setEditId(null); setError(''); }, [activeType]);

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
          {loading ? (
            <div className="text-center"><div className="spinner-border spinner-border-sm" /></div>
          ) : (
            <table className="table table-sm align-middle">
              <thead className="table-light">
                <tr><th>Nombre</th><th>Activo</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {items.map(item => (
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
                        <button className="btn btn-sm btn-outline-primary" onClick={() => { setEditId(item._id); setEditName(item.name); }}>
                          Editar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
