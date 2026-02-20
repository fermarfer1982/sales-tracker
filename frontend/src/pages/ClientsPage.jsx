import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clientService } from '../services';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const limit = 20;

  useEffect(() => { load(); }, [page, search]);

  async function load() {
    setLoading(true);
    try {
      const res = await clientService.list({ search, page, limit });
      setClients(res.data.data);
      setTotal(res.data.meta?.total || 0);
    } catch {}
    setLoading(false);
  }

  const pages = Math.ceil(total / limit);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fw-bold mb-0">Clientes</h4>
        <Link to="/clients/new" className="btn btn-primary">+ Nuevo cliente</Link>
      </div>
      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Buscar por nombre, CIF/NIF o ciudad..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>
      {loading ? (
        <div className="text-center py-4"><div className="spinner-border text-primary" /></div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover table-sm align-middle">
              <thead className="table-light">
                <tr>
                  <th>Razón social</th><th>CIF/NIF</th><th>Ciudad</th><th>Provincia</th>
                  <th>Zona</th><th>Segmento</th><th>GPS</th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-muted py-3">No hay clientes</td></tr>
                )}
                {clients.map(c => (
                  <tr key={c._id}>
                    <td><Link to={`/clients/${c._id}`} className="text-decoration-none fw-semibold">{c.legalName}</Link></td>
                    <td><code>{c.taxId}</code></td>
                    <td>{c.city}</td>
                    <td>{c.province}</td>
                    <td>{c.zoneId?.name || '-'}</td>
                    <td>{c.segmentId?.name || '-'}</td>
                    <td>{c.geo ? <span className="text-success">✓</span> : <span className="text-muted">-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="d-flex justify-content-between align-items-center mt-2">
            <small className="text-muted">{total} cliente(s)</small>
            <div className="d-flex gap-1">
              <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Ant</button>
              <span className="btn btn-sm btn-light disabled">{page}/{pages || 1}</span>
              <button className="btn btn-sm btn-outline-secondary" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Sig</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
