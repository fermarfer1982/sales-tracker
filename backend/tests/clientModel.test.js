'use strict';

const Client = require('../src/models/Client');

describe('Client model indexes', () => {
  test('taxId has a single unique partial index for active clients', () => {
    const indexes = Client.schema.indexes();
    const taxIdIndexes = indexes.filter(([fields]) => Object.prototype.hasOwnProperty.call(fields, 'taxId'));

    expect(taxIdIndexes).toHaveLength(1);
    expect(taxIdIndexes[0][0]).toEqual({ taxId: 1 });
    expect(taxIdIndexes[0][1]).toEqual(
      expect.objectContaining({
        unique: true,
        partialFilterExpression: { deletedAt: null },
      })
    );
  });
});
