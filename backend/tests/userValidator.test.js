'use strict';

const { createUser, updateUser } = require('../src/validators/user');

describe('user validator', () => {
  test('createUser accepts .local email', () => {
    const { error } = createUser.validate({
      name: 'Comercial Tres',
      email: 'comercial3@empresa.local',
      password: 'Admin123!',
      role: 'sales',
      zoneId: '',
      managerUserId: '',
    });

    expect(error).toBeUndefined();
  });

  test('updateUser accepts .local email', () => {
    const { error } = updateUser.validate({ email: 'jefe2@empresa.local' });

    expect(error).toBeUndefined();
  });

  test('createUser rejects malformed email', () => {
    const { error } = createUser.validate({
      name: 'Comercial Malo',
      email: 'comercial3@empresa',
      password: 'Admin123!',
      role: 'sales',
    });

    expect(error).toBeDefined();
  });
});
