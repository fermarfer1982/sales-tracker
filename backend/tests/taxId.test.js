'use strict';

const { validateSpanishTaxId, validateForeignTaxId, validateClientTaxId, normalizeTaxId } = require('../src/utils/taxId');

describe('validateSpanishTaxId', () => {
  // NIF válidos
  test('NIF válido - 12345678Z', () => expect(validateSpanishTaxId('12345678Z')).toBe(true));
  test('NIF válido con espacios', () => expect(validateSpanishTaxId(' 12345678Z ')).toBe(true));
  // NIF inválidos
  test('NIF inválido - letra incorrecta', () => expect(validateSpanishTaxId('12345678A')).toBe(false));
  test('NIF vacío', () => expect(validateSpanishTaxId('')).toBe(false));
  test('NIF null', () => expect(validateSpanishTaxId(null)).toBe(false));
  // NIE válido
  test('NIE válido X1234567L', () => expect(validateSpanishTaxId('X1234567L')).toBe(true));
  // CIF válido
  test('CIF válido B12345674', () => expect(validateSpanishTaxId('B12345674')).toBe(true));
  test('CIF inválido B12345675', () => expect(validateSpanishTaxId('B12345675')).toBe(false));
});

describe('normalizeTaxId', () => {
  test('elimina espacios y guiones y hace uppercase', () => {
    expect(normalizeTaxId('b-123 456 74')).toBe('B12345674');
  });
  test('null devuelve string vacío', () => expect(normalizeTaxId(null)).toBe(''));
});

describe('validateForeignTaxId', () => {
  test('acepta VAT extranjero alfanumérico', () => expect(validateForeignTaxId('FR12345678901')).toBe(true));
  test('acepta identificador con punto o barra', () => expect(validateForeignTaxId('CHE-123.456.789')).toBe(true));
  test('rechaza identificadores demasiado cortos', () => expect(validateForeignTaxId('A1')).toBe(false));
  test('rechaza caracteres no permitidos', () => expect(validateForeignTaxId('ABCD_1234')).toBe(false));
});

describe('validateClientTaxId', () => {
  test('mantiene validación estricta para NIF español', () => expect(validateClientTaxId('12345678Z')).toBe(true));
  test('rechaza NIF español incorrecto', () => expect(validateClientTaxId('12345678A')).toBe(false));
  test('acepta identificador fiscal extranjero', () => expect(validateClientTaxId('FR12345678901')).toBe(true));
});
