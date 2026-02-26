'use strict';

const { scheduleCreate } = require('../src/validators/activity');

describe('scheduleCreate validator', () => {
  test('acepta payload válido', () => {
    const { error } = scheduleCreate.validate({
      clientId: '65a123456789012345678901',
      activityTypeId: '65a123456789012345678902',
      activityDate: new Date().toISOString(),
      notes: 'Visita de seguimiento',
      nextActionDate: new Date(Date.now() + 86400000).toISOString(),
      nextActionNotes: 'Llamar para confirmar pedido',
    });
    expect(error).toBeUndefined();
  });

  test('falla si no viene clientId', () => {
    const { error } = scheduleCreate.validate({
      activityTypeId: '65a123456789012345678902',
      activityDate: new Date().toISOString(),
    });
    expect(error).toBeDefined();
  });
});
