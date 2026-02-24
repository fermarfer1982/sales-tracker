import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services';
import { useTheme } from '../context/ThemeContext';
import logoRamiro from '../assets/logo-ramiro-arnedo.svg';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authService.login(email, password);
      login(res.data.data.token, res.data.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="card shadow-sm p-4" style={{ width: '100%', maxWidth: 400 }}>
        <div className="d-flex justify-content-end mb-3">
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
        </div>
        <div className="text-center mb-4">
          <img src={logoRamiro} alt="Logo Ramiro Arnedo" width={88} height={88} className="mb-2" style={{ borderRadius: '50%' }} />
          <h2 className="fw-bold text-primary">Sales Tracker</h2>
          <p className="text-muted">Accede con tu cuenta</p>
        </div>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-semibold">Email</label>
            <input
              type="email"
              className="form-control form-control-lg"
              placeholder="usuario@empresa.local"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label className="form-label fw-semibold">Contraseña</label>
            <input
              type="password"
              className="form-control form-control-lg"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-lg w-100" disabled={loading}>
            {loading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
