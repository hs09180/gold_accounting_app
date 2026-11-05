const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const match = html.match(/function deltas\(type,grams,amount\)\{[^\n]+/);
assert.ok(match, 'production deltas() function must exist in index.html');
const deltas = new Function(match[0] + '; return deltas;')();

test('sale: customer owes toman and is owed gold', () => {
  assert.deepEqual(deltas('sale', 2.5, 125000000), { cashDelta: -125000000, goldDelta: 2.5 });
});
test('purchase: shop owes toman and customer owes gold', () => {
  assert.deepEqual(deltas('purchase', 1.25, 60000000), { cashDelta: 60000000, goldDelta: -1.25 });
});
test('cash receipt reduces the customer cash debt', () => {
  assert.deepEqual(deltas('receive', 0, 20000000), { cashDelta: 20000000, goldDelta: 0 });
});
test('cash payment decreases the customer cash balance', () => {
  assert.deepEqual(deltas('pay', 0, 7000000), { cashDelta: -7000000, goldDelta: 0 });
});
test('gold received from customer reduces gold payable', () => {
  assert.deepEqual(deltas('gold_in', 0.75, 0), { cashDelta: 0, goldDelta: -0.75 });
});
test('gold delivered to customer increases gold payable', () => {
  assert.deepEqual(deltas('gold_out', 0.4, 0), { cashDelta: 0, goldDelta: 0.4 });
});
