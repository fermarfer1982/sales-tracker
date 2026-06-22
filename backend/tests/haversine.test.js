'use strict';

const { haversineDistance } = require('../src/utils/haversine');

describe('haversineDistance', () => {
  test('misma ubicación -> 0 metros', () => {
    expect(haversineDistance(40.416775, -3.703790, 40.416775, -3.703790)).toBe(0);
  });

  test('Madrid - Barcelona aprox 504 km', () => {
    const dist = haversineDistance(40.416775, -3.703790, 41.385064, 2.173403);
    expect(dist).toBeGreaterThan(500000);
    expect(dist).toBeLessThan(520000);
  });

  test('misma latitud diferente longitud', () => {
    const dist = haversineDistance(40.0, 0.0, 40.0, 0.001);
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(200);
  });
});
