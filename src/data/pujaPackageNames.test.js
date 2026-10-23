/**
 * Package names are sent to the booking API (snapshot, admin list, notifications)
 * and must stay English in every language; Hindi/Telugu labels are display-only.
 */
import i18n from '../i18n';
import axiosInstance from '../lib/instance';
import { clearPujaResponseCache, fetchPujaById } from './pujaList';

jest.mock('../lib/instance', () => ({ __esModule: true, default: { get: jest.fn() } }));

const PKG_ID = '64b000000000000000000001';
const record = {
  _id: '64a000000000000000000001',
  name: 'Test Puja',
  section: 'occasion',
  packageDetails: [{ _id: PKG_ID, name: 'Individual Puja', persons: 1, price: 851 }],
  addOns: [],
  translations: { hi: { packageDetails: { [PKG_ID]: { name: 'व्यक्तिगत पूजा' } } } },
};

beforeEach(() => {
  clearPujaResponseCache();
  axiosInstance.get.mockImplementation((url) => Promise.resolve(
    url === '/chadhava' ? { data: { items: [] } } : { data: { pooja: record } }
  ));
});

afterAll(() => i18n.changeLanguage('en'));

test('Hindi page keeps the English package name for booking and exposes the Hindi label separately', async () => {
  await i18n.changeLanguage('hi');
  const puja = await fetchPujaById(record._id);
  expect(puja.packageDetails[0]).toMatchObject({ id: PKG_ID, name: 'Individual Puja', price: '₹851' });
  expect(puja.packageDisplayNames[PKG_ID]).toBe('व्यक्तिगत पूजा');
});

test('English page is unchanged', async () => {
  await i18n.changeLanguage('en');
  const puja = await fetchPujaById(record._id);
  expect(puja.packageDetails[0].name).toBe('Individual Puja');
  expect(puja.packageDisplayNames[PKG_ID]).toBe('Individual Puja');
});
