import React, { useState, useEffect } from 'react';
import { settingsService } from '../services';

const SETTINGS_META = [
  { key: 'reportCutoffHour', label: 'Hora de corte (0-23)', type: 'number', min: 0, max: 23 },
  { key: 'reportCutoffMinute', label: 'Minuto de corte (0-59)', type: 'number', min: 0, max: 59 },
  { key: 'timezone', label: 'Zona horaria', type: 'text' },
  { key: 'geofenceRadiusMeters', label: 'Radio geofence (metros)', type: 'number', min: 50 },
  { key: 'adminAlertEmail', label: 'Email de alerta admin', type: 'email' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await settingsService.get();
      setSettings(res.data.data);
    } catch {}
    setLoading(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSaved(false);
    try {
      await settingsService.update(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar');
    }
  }

  function handleChange(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-md-8 col-lg-6">
        <h4 className="fw-bold mb-3">Configuración del sistema</h4>
        {saved && <div className="alert alert-success py-2">Configuración guardada</div>}
        {error && <div className="alert alert-danger py-2">{error}</div>}
        {loading ? (
          <div className="text-center py-3"><div className="spinner-border text-primary" /></div>
        ) : (
          <div className="card">
            <div className="card-body">
              <form onSubmit={handleSave}>
                {SETTINGS_META.map(s => (
                  <div key={s.key} className="mb-3">
                    <label className="form-label fw-semibold">{s.label}</label>
                    <input
                      type={s.type}
                      className="form-control"
                      value={settings[s.key] ?? ''}
                      min={s.min}
                      max={s.max}
                      onChange={e => handleChange(s.key, s.type === 'number' ? Number(e.target.value) : e.target.value)}
                    />
                  </div>
                ))}
                <button type="submit" className="btn btn-primary w-100">Guardar configuración</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
