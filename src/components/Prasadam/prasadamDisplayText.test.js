/**
 * Prasadam text on screen is localized, while `name` stays English because it
 * is sent to Razorpay as the payment description.
 */
import { withDisplayText } from './PrasadamCard';

// react-router-dom v7 is ESM-only for this Jest; only <Link> is imported.
jest.mock('react-router-dom', () => ({ Link: () => null }), { virtual: true });

const product = {
  name: 'Temple Prasadam',
  description: 'Blessed prasadam from our temple pujas, delivered to your doorstep.',
  price: 250,
  isActive: true,
};

test.each([
  ['hi', 'मंदिर प्रसाद', /[ऀ-ॿ]/],
  ['te', 'ఆలయ ప్రసాదం', /[ఀ-౿]/],
])('%s: display text is translated, name stays English', (language, name, script) => {
  const shown = withDisplayText(product, language);
  expect(shown.displayName).toBe(name);
  expect(shown.displayDescription).toMatch(script);
  expect(shown.name).toBe('Temple Prasadam');
  expect(shown.price).toBe(250);
});

test('English is unchanged', () => {
  const shown = withDisplayText(product, 'en');
  expect(shown.displayName).toBe('Temple Prasadam');
  expect(shown.displayDescription).toBe(product.description);
});

test('stored CMS translations win over the local dictionary', () => {
  const shown = withDisplayText({ ...product, translations: { hi: { name: 'पावन मंदिर प्रसाद' } } }, 'hi');
  expect(shown.displayName).toBe('पावन मंदिर प्रसाद');
  expect(shown.name).toBe('Temple Prasadam');
});

test('a renamed product without a translation falls back to English', () => {
  const shown = withDisplayText({ ...product, name: 'Laddu Prasadam' }, 'hi');
  expect(shown.displayName).toBe('Laddu Prasadam');
});
