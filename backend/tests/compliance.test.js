'use strict';

function complianceStatus(activities) {
  if (activities.some(a => a.status === 'completed')) return 'green';
  if (activities.length > 0) return 'yellow';
  return 'red';
}

describe('complianceStatus', () => {
  test('sin actividades -> rojo', () => {
    expect(complianceStatus([])).toBe('red');
  });

  test('solo drafts -> amarillo', () => {
    expect(complianceStatus([{ status: 'draft' }, { status: 'in_progress' }])).toBe('yellow');
  });

  test('al menos una completed -> verde', () => {
    expect(complianceStatus([{ status: 'draft' }, { status: 'completed' }])).toBe('green');
  });

  test('todas completed -> verde', () => {
    expect(complianceStatus([{ status: 'completed' }, { status: 'completed' }])).toBe('green');
  });
});
