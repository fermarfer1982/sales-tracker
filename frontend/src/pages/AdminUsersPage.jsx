import React, { useEffect, useMemo, useState } from 'react';
import { userService, catalogService } from '../services';
import { downloadCsv } from '../utils';

const emptyForm = { name: '', email: '', password: '', role: 'sales', zoneId: '', managerUserId: '', canViewAllSales: false, orderEmail: '' };

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [zones, setZones] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [editForm, setEditForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [importPreview, setImportPreview] = useState(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    load();
    catalogService.list('zones')
      .then((response) => setZones(response.data.data || []))
      .catch(() => setZones([]));
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await userService.list();
      setUsers(res.data.data || []);
    } catch {
      setError('No se pudieron cargar los usuarios');
    }
    setLoading(false);
  }

  function resetMessages() {
    setError('');
    setSuccess('');
  }

  function resetImportState() {
    setImportPreview(null);
  }

  function normalizePayload(form) {
    return {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      zoneId: form.role === 'admin' ? '' : form.zoneId || '',
      managerUserId: form.role === 'sales' ? (form.managerUserId || '') : '',
      canViewAllSales: form.role === 'manager' ? Boolean(form.canViewAllSales) : false,
      orderEmail: form.orderEmail?.trim().toLowerCase() || null,
      ...(form.password ? { password: form.password } : {}),
    };
  }

  function beginEdit(user) {
    resetMessages();
    setEditingId(user._id);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'sales',
      zoneId: user.zoneId?._id || '',
      managerUserId: user.managerUserId?._id || '',
      canViewAllSales: Boolean(user.canViewAllSales),
      orderEmail: user.orderEmail || '',
      isActive: Boolean(user.isActive),
    });
  }

  function cancelEdit() {
    setEditingId('');
    setEditForm(emptyForm);
  }

  async function handleCreate(e) {
    e.preventDefault();
    resetMessages();
    resetImportState();
    setSaving(true);
    try {
      await userService.create(normalizePayload(createForm));
      setCreateForm(emptyForm);
      setShowCreateForm(false);
      setSuccess('Usuario creado correctamente');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.join(', ') || 'Error al crear usuario');
    }
    setSaving(false);
  }

  async function handleUpdate(userId) {
    resetMessages();
    resetImportState();
    setSaving(true);
    try {
      await userService.update(userId, {
        ...normalizePayload(editForm),
        isActive: Boolean(editForm.isActive),
      });
      setSuccess('Usuario actualizado correctamente');
      cancelEdit();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.join(', ') || 'Error al actualizar usuario');
    }
    setSaving(false);
  }

  async function handleDelete(user) {
    resetMessages();
    resetImportState();
    if (!window.confirm(`¿Seguro que quieres borrar a ${user.name}? Esta accion no se puede deshacer.`)) return;
    setSaving(true);
    try {
      await userService.delete(user._id);
      setSuccess('Usuario eliminado correctamente');
      if (editingId === user._id) cancelEdit();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al borrar usuario');
    }
    setSaving(false);
  }

  async function toggleActive(user) {
    resetMessages();
    resetImportState();
    setSaving(true);
    try {
      if (user.isActive) await userService.deactivate(user._id);
      else await userService.activate(user._id);
      setSuccess(`Usuario ${user.isActive ? 'desactivado' : 'activado'} correctamente`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cambiar el estado del usuario');
    }
    setSaving(false);
  }

  const managers = users.filter((u) => u.role === 'manager');
  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch = !normalizedSearch
        || user.name?.toLowerCase().includes(normalizedSearch)
        || user.email?.toLowerCase().includes(normalizedSearch);
      const matchesRole = !roleFilter || user.role === roleFilter;
      const matchesStatus = !statusFilter
        || (statusFilter === 'active' && user.isActive)
        || (statusFilter === 'inactive' && !user.isActive);
      const matchesZone = !zoneFilter || user.zoneId?._id === zoneFilter;

      return matchesSearch && matchesRole && matchesStatus && matchesZone;
    });
  }, [users, search, roleFilter, statusFilter, zoneFilter]);

  function resetFilters() {
    setSearch('');
    setRoleFilter('');
    setStatusFilter('');
    setZoneFilter('');
  }

  function handleExport() {
    const exportRows = filteredUsers.map((user) => ({
      nombre: user.name || '',
      email: user.email || '',
      rol: user.role || '',
      representante: user.zoneId?.name || '',
      manager: user.managerUserId?.name || '',
      alcance: user.role === 'manager' ? (user.canViewAllSales ? 'Toda la red' : 'Solo equipo') : '',
      email_pedidos: user.orderEmail || '',
      activo: user.isActive ? 'Si' : 'No',
    }));
    downloadCsv(`usuarios_${new Date().toISOString().slice(0, 10)}.csv`, exportRows);
  }

  function handleTemplateExport() {
    downloadCsv('plantilla_usuarios.csv', [
      {
        nombre: 'Laura Manager',
        email: 'laura.manager@empresa.com',
        password: 'ClaveSegura123',
        rol: 'manager',
        representante: 'Norte',
        manager_email: '',
        ver_toda_la_red: 'si',
        email_pedidos: 'pedidos.norte@empresa.com; administracion@empresa.com',
        activo: 'si',
      },
      {
        nombre: 'Carlos Comercial',
        email: 'carlos.comercial@empresa.com',
        password: 'ClaveSegura123',
        rol: 'sales',
        representante: 'Norte',
        manager_email: 'laura.manager@empresa.com',
        ver_toda_la_red: 'no',
        email_pedidos: 'pedidos.norte@empresa.com; administracion@empresa.com',
        activo: 'si',
      },
    ]);
  }

  async function handleImportFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setImportCsvText(text);
    resetMessages();
    resetImportState();
    event.target.value = '';
  }

  async function handlePreviewImport() {
    resetMessages();
    if (!importCsvText.trim()) {
      setError('Pega un CSV o selecciona un fichero antes de previsualizar');
      return;
    }

    setImporting(true);
    try {
      const response = await userService.importPreview(importCsvText);
      setImportPreview(response.data.data);
      setSuccess('Vista previa generada');
    } catch (err) {
      setImportPreview(null);
      setError(err.response?.data?.message || err.response?.data?.errors?.join(', ') || 'No se pudo generar la vista previa');
    }
    setImporting(false);
  }

  async function handleImport() {
    resetMessages();
    if (!importCsvText.trim()) {
      setError('Pega un CSV o selecciona un fichero antes de importar');
      return;
    }

    setImporting(true);
    try {
      const response = await userService.importCsv(importCsvText);
      setSuccess(`Importación completada: ${response.data.data?.totalCreated || 0} usuario(s) creados`);
      setImportCsvText('');
      setImportPreview(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.join(', ') || 'No se pudo importar el CSV');
    }
    setImporting(false);
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fw-bold mb-0">Usuarios</h4>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={handleExport} disabled={filteredUsers.length === 0}>
            Exportar CSV
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { resetMessages(); setShowCreateForm(!showCreateForm); }}>
            {showCreateForm ? 'Cerrar formulario' : '+ Nuevo usuario'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}
      {success && <div className="alert alert-success py-2">{success}</div>}

      <div className="card mb-3">
        <div className="card-header fw-bold">Buscar y filtrar</div>
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-4">
              <label className="form-label mb-1">Buscar</label>
              <input
                type="text"
                className="form-control"
                placeholder="Nombre o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label mb-1">Rol</label>
              <select className="form-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="">Todos</option>
                <option value="sales">sales</option>
                <option value="manager">manager</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label mb-1">Estado</label>
              <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label mb-1">Representante</label>
              <select className="form-select" value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}>
                <option value="">Todas</option>
                {zones.map((zone) => <option key={zone._id} value={zone._id}>{zone.name}</option>)}
              </select>
            </div>
            <div className="col-12 col-md-2">
              <button className="btn btn-outline-secondary w-100" onClick={resetFilters}>
                Limpiar filtros
              </button>
            </div>
          </div>
          <div className="small text-muted mt-2">
            Mostrando {filteredUsers.length} de {users.length} usuario(s)
          </div>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header fw-bold">Importar usuarios por CSV</div>
        <div className="card-body">
          <div className="d-flex flex-wrap gap-2 mb-2">
            <label className="btn btn-outline-secondary btn-sm mb-0">
              Cargar fichero
              <input type="file" accept=".csv,text/csv" className="d-none" onChange={handleImportFileChange} />
            </label>
            <button className="btn btn-outline-secondary btn-sm" onClick={handleTemplateExport}>
              Descargar plantilla
            </button>
            <button className="btn btn-outline-primary btn-sm" onClick={handlePreviewImport} disabled={importing} data-testid="users-import-preview">
              Vista previa
            </button>
            <button
              className="btn btn-success btn-sm"
              onClick={handleImport}
              disabled={importing || !importPreview || importPreview.invalid > 0 || importPreview.total === 0}
              data-testid="users-import-confirm"
            >
              Importar válidos
            </button>
          </div>

          <textarea
            className="form-control"
            rows={6}
            data-testid="users-import-textarea"
            placeholder="Pega aquí el CSV con cabeceras: nombre,email,password,rol,representante,manager_email,ver_toda_la_red,email_pedidos,activo. En email_pedidos puedes usar varios separados por ;"
            value={importCsvText}
            onChange={(e) => {
              setImportCsvText(e.target.value);
              setImportPreview(null);
            }}
          />

          <div className="small text-muted mt-2">
            Roles válidos: sales, manager, admin. La columna manager_email solo aplica a usuarios sales.
          </div>

          {importPreview && (
            <div className="mt-3">
              <div className="d-flex flex-wrap gap-3 small mb-2">
                <span data-testid="users-import-total">Total: <strong>{importPreview.total}</strong></span>
                <span data-testid="users-import-valid">Válidas: <strong className="text-success">{importPreview.valid}</strong></span>
                <span data-testid="users-import-invalid">Inválidas: <strong className="text-danger">{importPreview.invalid}</strong></span>
              </div>

              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead className="table-light">
                    <tr><th>Fila</th><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Errores</th></tr>
                  </thead>
                  <tbody>
                    {importPreview.rows.map((row) => (
                      <tr key={row.row}>
                        <td>{row.row}</td>
                        <td>{row.data.name || '-'}</td>
                        <td>{row.data.email || '-'}</td>
                        <td>{row.data.role || '-'}</td>
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

      {showCreateForm && (
        <div className="card mb-3">
          <div className="card-header fw-bold">Crear usuario</div>
          <div className="card-body">
            <form className="row g-2" onSubmit={handleCreate}>
              <div className="col-md-4">
                <input type="text" className="form-control" placeholder="Nombre completo" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} required />
              </div>
              <div className="col-md-4">
                <input type="email" className="form-control" placeholder="Email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} required />
              </div>
              <div className="col-md-4">
                <input type="password" className="form-control" placeholder="Contraseña (mín. 8)" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} required minLength={8} />
              </div>
              <div className="col-md-3">
                <select className="form-select" value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value, zoneId: e.target.value === 'admin' ? '' : createForm.zoneId, managerUserId: e.target.value === 'sales' ? createForm.managerUserId : '', canViewAllSales: e.target.value === 'manager' ? createForm.canViewAllSales : false })}>
                  <option value="sales">sales</option>
                  <option value="manager">manager</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div className="col-md-3">
                <select className="form-select" value={createForm.zoneId} onChange={(e) => setCreateForm({ ...createForm, zoneId: e.target.value })} disabled={createForm.role === 'admin'}>
                  <option value="">Sin representante</option>
                  {zones.map((zone) => <option key={zone._id} value={zone._id}>{zone.name}</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <select className="form-select" value={createForm.managerUserId} onChange={(e) => setCreateForm({ ...createForm, managerUserId: e.target.value })} disabled={createForm.role !== 'sales'}>
                  <option value="">Sin manager</option>
                  {managers.map((manager) => <option key={manager._id} value={manager._id}>{manager.name}</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <textarea className="form-control" rows={1} placeholder="Emails pedidos separados por coma o ;" value={createForm.orderEmail} onChange={(e) => setCreateForm({ ...createForm, orderEmail: e.target.value })} />
              </div>
              <div className="col-md-3 d-flex align-items-center">
                <div className="form-check mt-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="create-can-view-all-sales"
                    checked={Boolean(createForm.canViewAllSales)}
                    onChange={(e) => setCreateForm({ ...createForm, canViewAllSales: e.target.checked })}
                    disabled={createForm.role !== 'manager'}
                  />
                  <label className="form-check-label" htmlFor="create-can-view-all-sales">
                    Ver toda la red comercial
                  </label>
                </div>
              </div>
              <div className="col-md-3">
                <button type="submit" className="btn btn-success w-100" disabled={saving}>Crear usuario</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-3"><div className="spinner-border text-primary" /></div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle">
            <thead className="table-light">
              <tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Representante</th><th>Manager</th><th>Alcance</th><th>Emails pedidos</th><th>Contraseña</th><th>Activo</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center text-muted py-3">No hay usuarios con esos filtros</td>
                </tr>
              )}
              {filteredUsers.map((user) => {
                const isEditing = editingId === user._id;
                const current = isEditing ? editForm : null;

                return (
                  <tr key={user._id} data-testid={`user-row-${user._id}`}>
                    <td className="fw-semibold">
                      {isEditing ? (
                        <input type="text" className="form-control form-control-sm" value={current.name} onChange={(e) => setEditForm({ ...current, name: e.target.value })} />
                      ) : user.name}
                    </td>
                    <td className="text-muted small">
                      {isEditing ? (
                        <input type="email" className="form-control form-control-sm" value={current.email} onChange={(e) => setEditForm({ ...current, email: e.target.value })} />
                      ) : user.email}
                    </td>
                    <td>
                      {isEditing ? (
                        <select className="form-select form-select-sm" value={current.role} onChange={(e) => setEditForm({ ...current, role: e.target.value, zoneId: e.target.value === 'admin' ? '' : current.zoneId, managerUserId: e.target.value === 'sales' ? current.managerUserId : '', canViewAllSales: e.target.value === 'manager' ? current.canViewAllSales : false })}>
                          <option value="sales">sales</option>
                          <option value="manager">manager</option>
                          <option value="admin">admin</option>
                        </select>
                      ) : (
                        <span className="badge bg-light text-dark border">{user.role}</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select className="form-select form-select-sm" value={current.zoneId} onChange={(e) => setEditForm({ ...current, zoneId: e.target.value })} disabled={current.role === 'admin'}>
                          <option value="">Sin representante</option>
                          {zones.map((zone) => <option key={zone._id} value={zone._id}>{zone.name}</option>)}
                        </select>
                      ) : (user.zoneId?.name || '-')}
                    </td>
                    <td>
                      {isEditing ? (
                        <select className="form-select form-select-sm" value={current.managerUserId} onChange={(e) => setEditForm({ ...current, managerUserId: e.target.value })} disabled={current.role !== 'sales'}>
                          <option value="">Sin manager</option>
                          {managers.filter((manager) => manager._id !== user._id).map((manager) => (
                            <option key={manager._id} value={manager._id}>{manager.name}</option>
                          ))}
                        </select>
                      ) : (user.managerUserId?.name || '-')}
                    </td>
                    <td>
                      {isEditing ? (
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={Boolean(current.canViewAllSales)}
                            onChange={(e) => setEditForm({ ...current, canViewAllSales: e.target.checked })}
                            disabled={current.role !== 'manager'}
                          />
                          <label className="form-check-label small">Toda la red</label>
                        </div>
                      ) : (
                        user.role === 'manager'
                          ? (user.canViewAllSales ? 'Toda la red' : 'Solo equipo')
                          : '-'
                      )}
                    </td>
                    <td style={{ minWidth: 220 }}>
                      {isEditing ? (
                        <textarea className="form-control form-control-sm" rows={2} value={current.orderEmail} onChange={(e) => setEditForm({ ...current, orderEmail: e.target.value })} placeholder="pedidos@empresa.com; administracion@empresa.com" />
                      ) : (user.orderEmail || '-')}
                    </td>
                    <td style={{ minWidth: 180 }}>
                      {isEditing ? (
                        <input type="password" className="form-control form-control-sm" value={current.password} onChange={(e) => setEditForm({ ...current, password: e.target.value })} placeholder="Nueva contraseña" minLength={8} />
                      ) : (
                        <span className="text-muted small">Sin cambio</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <div className="form-check form-switch">
                          <input className="form-check-input" type="checkbox" checked={current.isActive} onChange={(e) => setEditForm({ ...current, isActive: e.target.checked })} />
                        </div>
                      ) : (
                        <span className={`badge ${user.isActive ? 'bg-success' : 'bg-secondary'}`}>
                          {user.isActive ? 'Sí' : 'No'}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="d-flex flex-wrap gap-2">
                        {isEditing ? (
                          <>
                            <button className="btn btn-sm btn-primary" onClick={() => handleUpdate(user._id)} disabled={saving} data-testid={`user-save-${user._id}`}>Guardar</button>
                            <button className="btn btn-sm btn-outline-secondary" onClick={cancelEdit} disabled={saving}>Cancelar</button>
                          </>
                        ) : (
                          <>
                            <button className="btn btn-sm btn-outline-primary" onClick={() => beginEdit(user)} disabled={saving} data-testid={`user-edit-${user._id}`}>Editar</button>
                            <button className={`btn btn-sm ${user.isActive ? 'btn-outline-warning' : 'btn-outline-success'}`} onClick={() => toggleActive(user)} disabled={saving}>
                              {user.isActive ? 'Desactivar' : 'Activar'}
                            </button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(user)} disabled={saving}>Borrar</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
