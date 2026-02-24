import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import logoRamiro from '../assets/logo-ramiro-arnedo.svg';

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const isActive = (path) => location.pathname.startsWith(path) ? 'nav-link active' : 'nav-link';

  return (
    <div>
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container-fluid">
          <Link className="navbar-brand fw-bold d-flex align-items-center gap-2" to="/">
            <img src={logoRamiro} alt="Logo Ramiro Arnedo" width={36} height={36} style={{ borderRadius: '50%' }} />
            <span>Sales Tracker</span>
          </Link>
          <button className="navbar-toggler" type="button" onClick={() => setMenuOpen(!menuOpen)}>
            <span className="navbar-toggler-icon" />
          </button>
          <div className={`collapse navbar-collapse ${menuOpen ? 'show' : ''}`}>
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              {(user?.role === 'sales' || user?.role === 'manager' || user?.role === 'admin') && (
                <>
                  <li className="nav-item">
                    <Link className={isActive('/activities/today')} to="/activities/today" onClick={() => setMenuOpen(false)}>
                      Hoy
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className={isActive('/activities/quick')} to="/activities/quick" onClick={() => setMenuOpen(false)}>
                      Registro rápido
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className={isActive('/activities/my')} to="/activities/my" onClick={() => setMenuOpen(false)}>
                      Mis actividades
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className={isActive('/clients')} to="/clients" onClick={() => setMenuOpen(false)}>
                      Clientes
                    </Link>
                  </li>
                </>
              )}
              {(user?.role === 'manager' || user?.role === 'admin') && (
                <li className="nav-item">
                  <Link className={isActive('/dashboard')} to="/dashboard" onClick={() => setMenuOpen(false)}>
                    Dashboard
                  </Link>
                </li>
              )}
              {user?.role === 'admin' && (
                <li className="nav-item dropdown">
                  <a className="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                    Admin
                  </a>
                  <ul className="dropdown-menu">
                    <li><Link className="dropdown-item" to="/admin/catalogs" onClick={() => setMenuOpen(false)}>Catálogos</Link></li>
                    <li><Link className="dropdown-item" to="/admin/users" onClick={() => setMenuOpen(false)}>Usuarios</Link></li>
                    <li><Link className="dropdown-item" to="/admin/audit" onClick={() => setMenuOpen(false)}>Auditoría</Link></li>
                    <li><Link className="dropdown-item" to="/admin/records" onClick={() => setMenuOpen(false)}>Registros</Link></li>
                    <li><Link className="dropdown-item" to="/admin/settings" onClick={() => setMenuOpen(false)}>Configuración</Link></li>
                  </ul>
                </li>
              )}
            </ul>
            <div className="d-flex align-items-center gap-2">
              <select
                className="form-select form-select-sm"
                value={theme}
                onChange={e => setTheme(e.target.value)}
                aria-label="Selector de tema"
                style={{ width: 130 }}
              >
                <option value="light">☀️ Claro</option>
                <option value="dark">🌙 Oscuro</option>
              </select>
              <span className="text-white-50 small d-none d-lg-inline">
                {user?.name} ({user?.role})
              </span>
              <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
                Salir
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="container-fluid py-3 px-3 px-lg-4" style={{ maxWidth: 1400 }}>
        <Outlet />
      </main>
    </div>
  );
}
