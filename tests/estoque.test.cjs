// Execute após compilar src/domain/estoque.ts para .test-build/domain/estoque.js
const assert = require('node:assert/strict');
const test = require('node:test');
const { calcularNovoSaldo, quantidadeValida } = require('../.test-build/estoque.js');

test('entrada aumenta o estoque', () => assert.equal(calcularNovoSaldo(5, 1, 'entrada'), 6));
test('saida diminui o estoque', () => assert.equal(calcularNovoSaldo(5, 1, 'saida'), 4));
test('nao aceita saldo negativo', () => assert.throws(() => calcularNovoSaldo(0, 1, 'saida')));
test('rejeita quantidade fracionaria', () => assert.equal(quantidadeValida(1.5), false));
test('rejeita saldo acima do limite', () => assert.throws(() => calcularNovoSaldo(100000, 1, 'entrada')));
