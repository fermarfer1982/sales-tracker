import React from 'react';

export function GeoStatus({ status }) {
  const map = {
    idle: { cls: 'text-secondary', icon: '⊙', label: 'GPS inactivo' },
    loading: { cls: 'geo-loading', icon: '⟳', label: 'Capturando GPS...' },
    ok: { cls: 'geo-ok', icon: '✓', label: 'GPS capturado' },
    denied: { cls: 'geo-error', icon: '✕', label: 'GPS denegado' },
    unavailable: { cls: 'geo-error', icon: '✕', label: 'GPS no disponible' },
    timeout: { cls: 'geo-error', icon: '✕', label: 'Timeout GPS' },
  };
  const { cls, icon, label } = map[status] || map.idle;
  return (
    <span className={`${cls} small fw-semibold`}>
      {icon} {label}
    </span>
  );
}

export function GeoAlert({ status, onRetry }) {
  if (status === 'ok' || status === 'idle' || status === 'loading') return null;
  const messages = {
    denied: 'Has denegado el acceso a la ubicación. Activa el GPS en la configuración del navegador.',
    unavailable: 'La geolocalización no está disponible en este dispositivo/navegador.',
    timeout: 'Timeout al capturar la ubicación. Inténtalo de nuevo.',
  };
  return (
    <div className="alert alert-danger d-flex justify-content-between align-items-center mt-2">
      <span>{messages[status] || 'Error de geolocalización'}</span>
      {onRetry && (
        <button className="btn btn-sm btn-danger ms-3" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}
