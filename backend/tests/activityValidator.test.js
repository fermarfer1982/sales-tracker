'use strict';

const { checkOut, quickCreate, updateActivity } = require('../src/validators/activity');

describe('activity sale validator', () => {
  const baseGeo = {
    lat: 36.7,
    lng: -2.8,
    accuracyMeters: 12,
    capturedAt: new Date().toISOString(),
    status: 'ok',
  };

  test('acepta un checkout con venta cerrada válida', () => {
    const { error } = checkOut.validate({
      productId: '65a123456789012345678901',
      productIds: ['65a123456789012345678901', '65a123456789012345678907'],
      outcomeId: '65a123456789012345678902',
      notes: 'Se cierra la venta y se deja trazabilidad completa.',
      geo: baseGeo,
      sale: {
        isClosed: true,
        items: [
          { productId: '65a123456789012345678905', quantity: 120, unit: 'SE', unitPrice: 3.45 },
          { productId: '65a123456789012345678906', quantity: 40, unit: 'GR', unitPrice: 1.2 },
        ],
        intermediaryClientIds: ['65a123456789012345678903'],
      },
    });

    expect(error).toBeUndefined();
  });

  test('exige tipo cuando hay próxima acción', () => {
    const { error } = checkOut.validate({
      productId: '65a123456789012345678901',
      productIds: ['65a123456789012345678901'],
      outcomeId: '65a123456789012345678902',
      notes: 'Seguimiento acordado con fecha futura pero sin tipo definido.',
      nextActionDate: new Date().toISOString(),
      geo: baseGeo,
    });

    expect(error).toBeDefined();
  });

  test('acepta próxima visita cuando se indica el tipo', () => {
    const { error } = quickCreate.validate({
      clientId: '65a123456789012345678901',
      activityTypeId: '65a123456789012345678902',
      productId: '65a123456789012345678903',
      productIds: ['65a123456789012345678903', '65a123456789012345678905'],
      outcomeId: '65a123456789012345678904',
      activityDate: new Date().toISOString(),
      notes: 'Actividad válida con una próxima visita correctamente informada.',
      durationMinutes: 25,
      nextActionDate: new Date().toISOString(),
      nextActionType: 'visit',
      nextActionNotes: 'Volver a visitar al cliente para cerrar detalles.',
      geo: baseGeo,
    });

    expect(error).toBeUndefined();
  });

  test('falla si la venta cerrada no trae cantidad', () => {
    const { error } = quickCreate.validate({
      clientId: '65a123456789012345678901',
      activityTypeId: '65a123456789012345678902',
      productId: '65a123456789012345678903',
      productIds: ['65a123456789012345678903'],
      outcomeId: '65a123456789012345678904',
      activityDate: new Date().toISOString(),
      notes: 'Actividad con venta sin cantidad suficiente para validar.',
      durationMinutes: 25,
      geo: baseGeo,
      sale: {
        isClosed: true,
        unitPrice: 2.1,
      },
    });

    expect(error).toBeDefined();
  });

  test('acepta desactivar venta en una edición', () => {
    const { error } = updateActivity.validate({
      sale: {
        isClosed: false,
      },
    });

    expect(error).toBeUndefined();
  });
});
