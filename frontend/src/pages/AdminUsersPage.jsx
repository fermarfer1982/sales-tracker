import React, { useState, useEffect } from 'react';
import { userService, catalogService } from '../services';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [zones, setZones] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'sales', zoneId: '', managerUserId: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
    catalogService.list('zones').then(r => setZones(r.data.data));
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await userService.list();
      setUsers(res.data.data);
    } catch {}
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await userService.create(form);
      setShowForm(false);
      setForm({ name: '', email: '', password: '', role: 'sales', zoneId: '', managerUserId: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.join(', ') || 'Error al crear usuario');
    }
  }

  async function toggleActive(user) {
    try {
      if (user.isActive) await userService.deactivate(user._id);
      else await userService.activate(user._id);
      load();
    } catch {}
  }

  async function changeRole(userId, role) {
    try {
      await userService.setRole(userId, role);
      load();
    } catch {}
  }

  const managers = users.filter(u => u.role === 'manager');

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fw-bold mb-0">Usuarios</h4>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nuevo usuario'}
        </button>
      </div>
      {showForm && (
        <div className="card mb-3">
          <div className="card-body">
            {error && <div className="alert alert-danger py-2">{error}</div>}
            <form className="row g-2" onSubmit={handleCreate}>
              <div className="col-md-4">
                <input type="text" className="form-control" placeholder="Nombre completo" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="col-md-4">
                <input type="email" className="form-control" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="col-md-4">
                <input type="password" className="form-control" placeholder="Contraseña (mín. 8)" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={8} />
              </div>
              <div className="col-md-3">
                <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="sales">sales</option>
                  <option value="manager">manager</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div className="col-md-3">
                <select className="form-select" value={form.zoneId} onChange={e => setForm({ ...form, zoneId: e.target.value })}>
                  <option value="">Sin zona</option>
                  {zones.map(z => <option key={z._id} value={z._id}>{z.name}</option>)}
                </select>
              </div>
              {form.role === 'sales' && (
                <div className="col-md-3">
                  <select className="form-select" value={form.managerUserId} onChange={e => setForm({ ...form, managerUserId: e.target.value })}>
                    <option value="">Sin manager</option>
                    {managers.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                  </select>
                </div>
              )}
              <div className="col-md-3">
                <button type="submit" className="btn btn-success w-100">Crear usuario</button>
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
              <tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Zona</th><th>Manager</th><th>Activo</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td className="fw-semibold">{u.name}</td>
                  <td className="text-muted small">{u.email}</td>
                  <td>
                    <select className="form-select form-select-sm" value={u.role} onChange={e => changeRole(u._id, e.target.value)} style={{ width: 100 }}>
                      <option value="sales">sales</option>
                      <option value="manager">manager</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td>{u.zoneId?.name || '-'}</td>
                  <td>{u.managerUserId?.name || '-'}</td>
                  <td>
                    <span className={`badge ${u.isActive ? 'bg-success' : 'bg-secondary'}`}>
                      {u.isActive ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`btn btn-sm ${u.isActive ? 'btn-outline-danger' : 'btn-outline-success'}`}
                      onClick={() => toggleActive(u)}
                    >
                      {u.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
