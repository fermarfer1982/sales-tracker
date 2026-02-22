'use strict';

const { login } = require('../src/validators/auth');

describe('auth login validator', () => {
  test('accepts internal .local email addresses', () => {
    const { error } = login.validate({
      email: 'admin@empresa.local',
      password: 'Admin123!',
    });

    expect(error).toBeUndefined();
  });

  test('rejects malformed email addresses', () => {
    const { error } = login.validate({
      email: 'admin@empresa',
      password: 'Admin123!',
    });

    expect(error).toBeDefined();
  });
});
