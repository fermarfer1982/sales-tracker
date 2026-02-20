'use strict';

function validateSpanishTaxId(taxId) {
  if (!taxId || typeof taxId !== 'string') return false;
  const normalized = taxId.replace(/[\s\-]/g, '').toUpperCase();

  const NIFLetters = 'TRWAGMYFPDXBNJZSQVHLCKE';
  const CIFControl = 'JABCDEFGHI';

  // NIF (personas físicas): 8 dígitos + letra
  const nifRegex = /^(\d{8})([A-Z])$/;
  // NIE (extranjeros): X/Y/Z + 7 dígitos + letra
  const nieRegex = /^([XYZ])(\d{7})([A-Z])$/;
  // CIF (personas jurídicas): letra + 7 dígitos + letra/dígito
  const cifRegex = /^([ABCDEFGHJKLMNPQRSUVW])(\d{7})([0-9A-J])$/;

  if (nifRegex.test(normalized)) {
    const [, num, letter] = normalized.match(nifRegex);
    return NIFLetters[parseInt(num, 10) % 23] === letter;
  }

  if (nieRegex.test(normalized)) {
    const [, prefix, num, letter] = normalized.match(nieRegex);
    const prefixMap = { X: '0', Y: '1', Z: '2' };
    const fullNum = prefixMap[prefix] + num;
    return NIFLetters[parseInt(fullNum, 10) % 23] === letter;
  }

  if (cifRegex.test(normalized)) {
    const [, letter, digits, control] = normalized.match(cifRegex);
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      const d = parseInt(digits[i], 10);
      if ((i + 1) % 2 === 0) {
        sum += d;
      } else {
        const doubled = d * 2;
        sum += doubled > 9 ? doubled - 9 : doubled;
      }
    }
    const remainder = sum % 10;
    const expected = remainder === 0 ? 0 : 10 - remainder;
    const expectedLetter = CIFControl[expected];
    const expectedDigit = String(expected);
    // Some letter types require letter control, others accept digit
    const lettersRequiringLetterControl = 'PQSW';
    const lettersRequiringDigitControl = 'ABEH';
    if (lettersRequiringLetterControl.includes(letter)) {
      return control === expectedLetter;
    } else if (lettersRequiringDigitControl.includes(letter)) {
      return control === expectedDigit;
    } else {
      return control === expectedLetter || control === expectedDigit;
    }
  }

  return false;
}

function normalizeTaxId(taxId) {
  if (!taxId) return '';
  return taxId.replace(/[\s\-]/g, '').toUpperCase();
}

module.exports = { validateSpanishTaxId, normalizeTaxId };
