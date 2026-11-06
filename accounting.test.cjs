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

const normalizeStart = html.indexOf('function normalizeDigits');
const customerStart = html.indexOf('function voiceCustomer');
assert.ok(normalizeStart >= 0 && customerStart > normalizeStart, 'voice number parser must exist');
const numberFns = new Function(html.slice(normalizeStart, customerStart) + '; return {normalizeDigits, spokenNumber};')();

test('Persian spoken millions are parsed correctly', () => {
  assert.equal(numberFns.spokenNumber('بیست میلیون تومان'), 20000000);
  assert.equal(numberFns.spokenNumber('یک میلیون و دویست هزار'), 1200000);
  assert.equal(numberFns.spokenNumber('20 میلیون'), 20000000);
});
test('Persian fractional weights are parsed correctly', () => {
  assert.equal(numberFns.spokenNumber('دو و نیم'), 2.5);
  assert.equal(numberFns.spokenNumber('۱٫۵'), 1.5);
});
test('Android APK includes native Persian speech bridge and microphone permission', () => {
  const java = fs.readFileSync('app/src/main/java/ir/zarnigar/app/MainActivity.java', 'utf8');
  const manifest = fs.readFileSync('app/src/main/AndroidManifest.xml', 'utf8');
  assert.match(java, /SpeechRecognizer/);
  assert.match(java, /fa-IR/);
  assert.match(java, /addJavascriptInterface/);
  assert.match(manifest, /android.permission.RECORD_AUDIO/);
});

const typeStart = html.indexOf('function detectVoiceType');
const voiceCustomerStart = html.indexOf('function voiceCustomer');
assert.ok(typeStart >= 0 && voiceCustomerStart > typeStart, 'voice operation detector must exist');
const detectVoiceType = new Function(html.slice(typeStart, voiceCustomerStart) + '; return detectVoiceType;')();

test('customer saying they bought gold is recorded as a shop sale', () => {
  assert.equal(detectVoiceType('حسین سمیعی 2 گرم طلا خرید'), 'sale');
});
test('customer saying they sold gold is recorded as a shop purchase', () => {
  assert.equal(detectVoiceType('حسین سمیعی 2 گرم طلا فروخت'), 'purchase');
});
test('shop buying gold from a named customer is a purchase', () => {
  assert.equal(detectVoiceType('خرید 2 گرم از حسین سمیعی'), 'purchase');
});
test('shop selling gold to a named customer is a sale', () => {
  assert.equal(detectVoiceType('2 گرم طلا به حسین سمیعی فروختیم'), 'sale');
});
test('gold trade can be transferred to the form without a cash amount', () => {
  assert.match(html, /if\(\['receive','pay'\]\.includes\(type\)&&amount\+extras<=0\)/);
});

test('exact customer purchase sentence with per-gram price is classified as shop sale', () => {
  assert.equal(detectVoiceType('حسین سمیعی ۲ گرم طلا خرید به هر گرم ۲۵۵۰۰۰۰۰ تومان'), 'sale');
  assert.equal(detectVoiceType('حسین سمیعی 2 گرم طلا خرید به هر گرم 25500000 تومان'), 'sale');
});
test('directional purchase phrase is classified as shop purchase', () => {
  assert.equal(detectVoiceType('خرید ۲ گرم طلا از حسین سمیعی'), 'purchase');
});


const voiceFnsStart = html.indexOf('function normalizeDigits');
const voiceFnsEnd = html.indexOf('function voiceCustomer');
const voiceFns = new Function(html.slice(voiceFnsStart, voiceFnsEnd) + '; return {normalizeDigits, spokenNumber, detectVoiceType, parseVoicePrice};')();

test('per-gram voice price is multiplied by gold weight', () => {
  const phrase = 'حسین سمیعی ۲ گرم طلا خرید به هر گرم ۲۵۵۰۰۰۰۰ تومان';
  const gramsMatch = phrase.match(/(.{1,55}?)\\s*گرم/);
  const grams = gramsMatch ? voiceFns.spokenNumber(gramsMatch[1].split(' ').slice(-5).join(' ')) : 0;
  const price = voiceFns.parseVoicePrice(phrase, grams);
  assert.equal(voiceFns.detectVoiceType(phrase), 'sale');
  assert.equal(grams, 2);
  assert.equal(price.pricePerGram, 25500000);
  assert.equal(price.amount, 51000000);
});

test('spoken and numeric forms of the same per-gram price calculate the same total', () => {
  const spoken = voiceFns.parseVoicePrice('۲ گرم طلا خرید به هر گرم بیست و پنج میلیون و پانصد هزار تومان', 2);
  const numeric = voiceFns.parseVoicePrice('۲ گرم طلا خرید به هر گرم ۲۵۵۰۰۰۰۰ تومان', 2);
  assert.equal(spoken.amount, 51000000);
  assert.equal(numeric.amount, 51000000);
});
