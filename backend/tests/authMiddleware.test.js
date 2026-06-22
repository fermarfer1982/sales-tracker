'use strict';

const express = require('express');
const request = require('supertest');

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('../src/models/User', () => ({
  findById: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const { authenticate, authorize } = require('../src/middleware/auth');

function buildApp({ roles } = {}) {
  const app = express();
  app.get('/protected', authenticate, authorize(...(roles || [])), (req, res) => {
    res.json({ ok: true, userId: String(req.user._id), role: req.user.role });
  });
  return app;
}

describe('auth middleware smoke', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rechaza cuando falta token', async () => {
    const app = buildApp({ roles: ['manager'] });
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
  });

  test('rechaza cuando el usuario autenticado no tiene el rol requerido', async () => {
    jwt.verify.mockReturnValue({ id: 'user-1' });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: 'user-1',
        role: 'sales',
        isActive: true,
      }),
    });

    const app = buildApp({ roles: ['manager'] });
    const res = await request(app).get('/protected').set('Authorization', 'Bearer token');

    expect(res.status).toBe(403);
  });

  test('permite acceso cuando el usuario tiene el rol requerido', async () => {
    jwt.verify.mockReturnValue({ id: 'user-2' });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: 'user-2',
        role: 'manager',
        isActive: true,
      }),
    });

    const app = buildApp({ roles: ['manager', 'admin'] });
    const res = await request(app).get('/protected').set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.role).toBe('manager');
  });
});
