import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import i18n from './i18n';
import Layout from './components/Layout/Layout';
// Home is eager: the hero is the LCP element and must not wait for a chunk.
import Home from './components/Home/Home';

const SpecialPuja    = lazy(() => import('./components/SpecialPuja/SpecialPuja'));
const WhatsAppUpdates = lazy(() => import('./components/WhatsAppUpdatesSection/WhatsAppUpdatesSection'));
const Faqs           = lazy(() => import('./components/Faqs/Faqs'));
const Footer         = lazy(() => import('./components/Footer/Footer'));
const About          = lazy(() => import('./components/About/About'));
const Contact        = lazy(() => import('./components/Contact/Contact'));
const PujaList       = lazy(() => import('./components/PujaList/PujaList'));
const PujaDetail     = lazy(() => import('./components/PujaDetail/PujaDetail'));
const Chadhava       = lazy(() => import('./components/Chadhava/Chadhava'));
const ChadhavaDetail = lazy(() => import('./components/Chadhava/ChadhavaDetail'));
const Profile        = lazy(() => import('./components/Profile/Profile'));
const LoginPage      = lazy(() => import('./components/LoginPage/LoginPage'));
const BillingPage    = lazy(() => import('./components/BillingPage/BillingPage'));
const MyBookings     = lazy(() => import('./components/MyBooking/MyBooking'));
const BookingDetailsModal = lazy(() => import('./components/BookingDetailsModal/BookingDetailsModal'));
const WhatsAppFAB    = lazy(() => import('./components/WhatsAppFAB/WhatsAppFAB'));
const PolicyPage     = lazy(() => import('./components/PolicyPage/PolicyPage'));
const PrasadamCard   = lazy(() => import('./components/Prasadam/PrasadamCard'));
const PrasadamPage   = lazy(() => import('./components/Prasadam/PrasadamPage'));
const ExitIntentPopup = lazy(() => import('./components/ExitIntentPopup/ExitIntentPopup'));

export const LANGUAGE_LANDING_PATHS = {
  en: '/en',
  hi: '/hi',
  // `/tu` is the established public Telugu URL. `/te` remains accepted as a
  // legacy alias so old links do not break.
  te: '/tu',
};

export const LANGUAGE_BY_LANDING_PATH = Object.fromEntries(
  Object.entries(LANGUAGE_LANDING_PATHS).map(([language, path]) => [path, language])
);
LANGUAGE_BY_LANDING_PATH['/te'] = 'te';

// Placeholder for below-the-fold home sections while their chunk loads.
const SectionSkeleton = () => <div aria-hidden="true" style={{ minHeight: 320 }} />;

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <div style={{ width: 36, height: 36, border: '3px solid #f3e8d8', borderTopColor: '#c2410c', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

function LanguageLandingRouteSync() {
  const location = useLocation();
  const navigate = useNavigate();
  const languageFromPath = LANGUAGE_BY_LANDING_PATH[location.pathname];
  const isHomePath = location.pathname === '/' || Boolean(languageFromPath);

  // Direct marketing URLs are the source of truth for the initial homepage language.
  useEffect(() => {
    if (languageFromPath && i18n.language !== languageFromPath) {
      i18n.changeLanguage(languageFromPath);
    }
  }, [languageFromPath]);

  // On the homepage, reflect a selector change in the URL while preserving campaigns/query strings.
  useEffect(() => {
    const syncLanguageUrl = (language) => {
      if (!isHomePath) return;
      const targetPath = LANGUAGE_LANDING_PATHS[language];
      if (!targetPath || location.pathname === targetPath) return;
      navigate({ pathname: targetPath, search: location.search, hash: location.hash });
    };

    i18n.on('languageChanged', syncLanguageUrl);
    return () => i18n.off('languageChanged', syncLanguageUrl);
  }, [isHomePath, location.hash, location.pathname, location.search, navigate]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <LanguageLandingRouteSync />
      <Suspense fallback={null}>
        <WhatsAppFAB />
        <ExitIntentPopup />
      </Suspense>
      <Routes>
        <Route path="/login" element={
          <Suspense fallback={<PageLoader />}>
            <LoginPage />
          </Suspense>
        } />

        <Route path="/" element={
          <Layout>
            <Home />
            <Suspense fallback={<SectionSkeleton />}>
              <SpecialPuja />
            </Suspense>
            <Suspense fallback={null}>
              <PrasadamCard source="home" />
            </Suspense>
            <Suspense fallback={<SectionSkeleton />}>
              <WhatsAppUpdates />
            </Suspense>
            <Suspense fallback={<SectionSkeleton />}>
              <Faqs />
            </Suspense>
            <Suspense fallback={<SectionSkeleton />}>
              <Footer />
            </Suspense>
          </Layout>
        } />

        {/* Localized landing URLs render the same home content; the route is
            also the source of truth for the selected language. */}
        {['/en', '/hi', '/tu', '/te'].map((path) => (
          <Route key={path} path={path} element={
            <Layout>
              <Home />
              <Suspense fallback={<SectionSkeleton />}><SpecialPuja /></Suspense>
              <Suspense fallback={null}><PrasadamCard source="home" /></Suspense>
              <Suspense fallback={<SectionSkeleton />}><WhatsAppUpdates /></Suspense>
              <Suspense fallback={<SectionSkeleton />}><Faqs /></Suspense>
              <Suspense fallback={<SectionSkeleton />}><Footer /></Suspense>
            </Layout>
          } />
        ))}

        <Route path="/about" element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <About />
            </Suspense>
          </Layout>
        } />

        <Route path="/contact" element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Contact />
            </Suspense>
          </Layout>
        } />

        <Route path="/privacy-policy" element={<Layout><Suspense fallback={<PageLoader />}><PolicyPage policy="privacy" /></Suspense></Layout>} />
        <Route path="/cancellation-refund-policy" element={<Layout><Suspense fallback={<PageLoader />}><PolicyPage policy="refund" /></Suspense></Layout>} />
        <Route path="/terms-of-service" element={<Layout><Suspense fallback={<PageLoader />}><PolicyPage policy="terms" /></Suspense></Layout>} />

        <Route path="/Profile" element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Profile />
            </Suspense>
          </Layout>
        } />

        <Route path="/puja" element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <PujaList />
            </Suspense>
          </Layout>
        } />

        <Route path="/prasadam" element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <PrasadamPage />
            </Suspense>
          </Layout>
        } />

        <Route path="/chadhava" element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Chadhava />
            </Suspense>
          </Layout>
        } />

        <Route path="/chadhava/:id" element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <ChadhavaDetail />
            </Suspense>
          </Layout>
        } />

        <Route path="/puja/:id" element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <PujaDetail />
            </Suspense>
          </Layout>
        } />

        <Route path="/billing" element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <BillingPage />
            </Suspense>
          </Layout>
        } />

        <Route path="/my-bookings" element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <MyBookings />
            </Suspense>
          </Layout>
        } />

        <Route path="/booking/:id" element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <BookingDetailsModal />
            </Suspense>
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
