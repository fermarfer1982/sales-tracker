import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clientService, catalogService } from '../services';
import { downloadCsv } from '../utils';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [zones, setZones] = useState([]);
  const [segments, setSegments] = useState([]);
  const [zoneId, setZoneId] = useState('');
  const [segmentId, setSegmentId] = useState('');
  const [hasGeo, setHasGeo] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [importCsvText, setImportCsvText] = useState('');
  const [importPreview, setImportPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const limit = 20;

  useEffect(() => {
    catalogService.list('zones').then((res) => setZones(res.data.data || [])).catch(() => setZones([]));
    catalogService.list('segments').then((res) => setSegments(res.data.data || [])).catch(() => setSegments([]));
  }, []);

  useEffect(() => { load(); }, [page, search, zoneId, segmentId, hasGeo]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await clientService.list({ search, page, limit, zoneId, segmentId, hasGeo });
      setClients(res.data.data);
      setTotal(res.data.meta?.total || 0);
    } catch {
      setError('No se pudieron cargar los clientes');
    }
    setLoading(false);
  }

  async function handleExport() {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await clientService.list({ search, page: 1, limit: 1000, zoneId, segmentId, hasGeo });
      const exportRows = (res.data.data || []).map((client) => ({
        razon_social: client.legalName || '',
        cif_nif: client.taxId || '',
        ciudad: client.city || '',
        provincia: client.province || '',
        representante: client.zoneId?.name || '',
        segmento: client.segmentId?.name || '',
        tiene_gps: client.geo ? 'Si' : 'No',
        telefono: client.phone || '',
        email: client.email || '',
      }));
      downloadCsv(`clientes_${new Date().toISOString().slice(0, 10)}.csv`, exportRows);
    } catch {
      setError('No se pudo exportar el listado de clientes');
    }
    setLoading(false);
  }

  function handleTemplateExport() {
    downloadCsv('plantilla_clientes.csv', [
      {
        razon_social: 'Cliente Demo Norte',
        cif_nif: 'B12345678',
        provincia: 'Navarra',
        ciudad: 'Pamplona',
        representante: 'Norte',
        segmento: 'Farmacia',
        telefono: '600000000',
        email: 'cliente@demo.com',
        notas: 'Importado por CSV',
      },
    ]);
  }

  async function handleImportFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setImportCsvText(text);
    setImportPreview(null);
    setError('');
    setSuccess('');
    event.target.value = '';
  }

  async function handlePreviewImport() {
    setError('');
    setSuccess('');
    if (!importCsvText.trim()) {
      setError('Pega un CSV o selecciona un fichero antes de previsualizar');
      return;
    }

    setImporting(true);
    try {
      const response = await clientService.importPreview(importCsvText);
      setImportPreview(response.data.data);
      setSuccess('Vista previa generada');
    } catch (err) {
      setImportPreview(null);
      setError(err.response?.data?.message || err.response?.data?.errors?.join(', ') || 'No se pudo generar la vista previa');
    }
    setImporting(false);
  }

  async function handleImport() {
    setError('');
    setSuccess('');
    if (!importCsvText.trim()) {
      setError('Pega un CSV o selecciona un fichero antes de importar');
      return;
    }

    setImporting(true);
    try {
      const response = await clientService.importCsv(importCsvText);
      const payload = response.data.data || {};
      const created = payload.totalCreated || 0;
      const skipped = payload.totalSkipped || 0;
      setSuccess(
        skipped > 0
          ? `Importación completada: ${created} cliente(s) creados y ${skipped} fila(s) inválida(s) omitida(s)`
          : `Importación completada: ${created} cliente(s) creados`
      );
      if (skipped > 0) {
        setImportPreview((current) => current ? {
          ...current,
          rows: current.rows.map((row) => {
            const skippedRow = (payload.skippedRows || []).find((item) => item.row === row.row);
            return skippedRow ? { ...row, valid: false, errors: skippedRow.errors } : row;
          }),
        } : current);
      }
      setImportCsvText('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.join(', ') || 'No se pudo importar el CSV');
    }
    setImporting(false);
  }

  const pages = Math.ceil(total / limit);

  const groupedClients = clients.reduce((acc, client) => {
    const zoneName = client.zoneId?.name || 'Sin representante';
    if (!acc[zoneName]) acc[zoneName] = [];
    acc[zoneName].push(client);
    return acc;
  }, {});

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fw-bold mb-0">Clientes</h4>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={handleExport} disabled={loading || clients.length === 0}>
            Exportar CSV
          </button>
          <Link to="/clients/new" className="btn btn-primary">+ Nuevo cliente</Link>
        </div>
      </div>
      <div className="mb-3">
        <div className="row g-2 align-items-end">
          <div className="col-12 col-md-4">
            <label className="form-label mb-1">Buscar</label>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por nombre, CIF/NIF o ciudad..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label mb-1">Representante</label>
            <select className="form-select" value={zoneId} onChange={e => { setZoneId(e.target.value); setPage(1); }}>
              <option value="">Todas</option>
              {zones.map((zone) => <option key={zone._id} value={zone._id}>{zone.name}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label mb-1">Segmento</label>
            <select className="form-select" value={segmentId} onChange={e => { setSegmentId(e.target.value); setPage(1); }}>
              <option value="">Todos</option>
              {segments.map((segment) => <option key={segment._id} value={segment._id}>{segment.name}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-1">
            <label className="form-label mb-1">GPS</label>
            <select className="form-select" value={hasGeo} onChange={e => { setHasGeo(e.target.value); setPage(1); }}>
              <option value="">Todos</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>
          <div className="col-6 col-md-1 d-grid">
            <button className="btn btn-outline-secondary" onClick={() => { setSearch(''); setZoneId(''); setSegmentId(''); setHasGeo(''); setPage(1); }}>
              Limpiar
            </button>
          </div>
        </div>
      </div>
      <div className="card mb-3">
        <div className="card-header fw-bold">Importar clientes por CSV</div>
        <div className="card-body">
          <div className="d-flex flex-wrap gap-2 mb-2">
            <label className="btn btn-outline-secondary btn-sm mb-0">
              Cargar fichero
              <input type="file" accept=".csv,text/csv" className="d-none" onChange={handleImportFileChange} />
            </label>
            <button className="btn btn-outline-secondary btn-sm" onClick={handleTemplateExport}>
              Descargar plantilla
            </button>
            <button className="btn btn-outline-primary btn-sm" onClick={handlePreviewImport} disabled={importing}>
              Vista previa
            </button>
            <button
              className="btn btn-success btn-sm"
              onClick={handleImport}
              disabled={importing || !importPreview || importPreview.valid === 0 || importPreview.total === 0}
            >
              Importar válidos
            </button>
          </div>

          <textarea
            className="form-control"
            rows={6}
            placeholder="Pega aquí el CSV con cabeceras: razon_social,cif_nif,provincia,ciudad,representante,segmento,telefono,email,notas"
            value={importCsvText}
            onChange={(e) => {
              setImportCsvText(e.target.value);
              setImportPreview(null);
            }}
          />

          <div className="small text-muted mt-2">
            Para usuarios sales, el representante del CSV se ignora y se usa el asignado al usuario autenticado.
          </div>

          {importPreview && (
            <div className="mt-3">
              <div className="d-flex flex-wrap gap-3 small mb-2">
                <span>Total: <strong>{importPreview.total}</strong></span>
                <span>Válidas: <strong className="text-success">{importPreview.valid}</strong></span>
                <span>Inválidas: <strong className="text-danger">{importPreview.invalid}</strong></span>
              </div>
              {importPreview.invalid > 0 && (
                <div className="alert alert-warning py-2 small">
                  Se importarán solo las filas válidas. Las inválidas se omitirán.
                </div>
              )}

              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead className="table-light">
                    <tr><th>Fila</th><th>Razón social</th><th>CIF/NIF</th><th>Ciudad</th><th>Estado</th><th>Errores</th></tr>
                  </thead>
                  <tbody>
                    {importPreview.rows.map((row) => (
                      <tr key={row.row}>
                        <td>{row.row}</td>
                        <td>{row.data.legalName || '-'}</td>
                        <td>{row.data.taxId || '-'}</td>
                        <td>{row.data.city || '-'}</td>
                        <td>
                          <span className={`badge ${row.valid ? 'bg-success' : 'bg-danger'}`}>
                            {row.valid ? 'Válida' : 'Inválida'}
                          </span>
                        </td>
                        <td className="small text-muted">{row.errors.length > 0 ? row.errors.join(', ') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {success && <div className="alert alert-success py-2">{success}</div>}
      {loading ? (
        <div className="text-center py-4"><div className="spinner-border text-primary" /></div>
      ) : (
        <>
          {clients.length === 0 ? (
            <div className="text-center text-muted py-3">No hay clientes</div>
          ) : (
            Object.entries(groupedClients).map(([zoneName, zoneClients]) => (
              <div key={zoneName} className="mb-4">
                <h6 className="fw-bold mb-2">Representante: {zoneName}</h6>
                <div className="table-responsive">
                  <table className="table table-hover table-sm align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Razón social</th><th>CIF/NIF</th><th>Ciudad</th><th>Provincia</th>
                        <th>Segmento</th><th>GPS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {zoneClients.map(c => (
                        <tr key={c._id}>
                          <td><Link to={`/clients/${c._id}`} className="text-decoration-none fw-semibold">{c.legalName}</Link></td>
                          <td><code>{c.taxId}</code></td>
                          <td>{c.city}</td>
                          <td>{c.province}</td>
                          <td>{c.segmentId?.name || '-'}</td>
                          <td>{c.geo ? <span className="text-success">✓</span> : <span className="text-muted">-</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
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
