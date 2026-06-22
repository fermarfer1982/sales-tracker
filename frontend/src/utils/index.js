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
  return toLocalDateInputValue(new Date());
}

export function toLocalDateInputValue(value) {
  if (!value) return '';
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateInputAsLocal(value) {
  if (!value) return null;
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function escapeCsvCell(value) {
  if (value == null) return '';
  const stringValue = String(value);
  if (/[",\n;]/.test(stringValue)) return `"${stringValue.replace(/"/g, '""')}"`;
  return stringValue;
}

export function downloadCsv(filename, rows) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(';'),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(';')),
  ];
  const csvContent = '\uFEFF' + lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
