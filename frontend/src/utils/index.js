export function statusBadge(status) {
  const map = {
    green: { label: 'Verde', cls: 'badge-green' },
    yellow: { label: 'Amarillo', cls: 'badge-yellow' },
    red: { label: 'Rojo', cls: 'badge-red' },
    draft: { label: 'Borrador', cls: 'bg-secondary text-white' },
    in_progress: { label: 'En progreso', cls: 'bg-warning text-dark' },
    completed: { label: 'Completada', cls: 'bg-success text-white' },
  };
  return map[status] || { label: status, cls: 'bg-secondary text-white' };
}

export function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}
