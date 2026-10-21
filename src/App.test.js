// react-scripts/Jest 26 cannot resolve react-router-dom v7's package exports.
// App routing is integration-tested in the browser; this test only verifies the
// root module can be loaded in the unit-test runtime.
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => children,
  Routes: ({ children }) => children,
  Route: () => null,
  useLocation: () => ({ pathname: '/', search: '', hash: '' }),
  useNavigate: () => jest.fn(),
}), { virtual: true });

import App from './App';

test('exports the application root', () => {
  expect(typeof App).toBe('function');
});
