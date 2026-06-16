import { Navigate, Route, Routes } from 'react-router-dom';

import MainLayout from '../components/layout/MainLayout.jsx';
import { useAppContext } from '../context/AppContext.jsx';
import AdminDashboardPage from '../pages/AdminDashboardPage.jsx';
import CartPage from '../pages/CartPage.jsx';
import HomePage from '../pages/HomePage.jsx';
import ProductDetailPage from '../pages/ProductDetailPage.jsx';
import ShopPage from '../pages/ShopPage.jsx';
import AuthPage from '../pages/AuthPage.jsx';
import UserDashboardPage from '../pages/UserDashboardPage.jsx';
import StaticInfoPage from '../pages/StaticInfoPage.jsx';
import ContactPage from '../pages/ContactPage.jsx';
import CheckoutPage from '../pages/CheckoutPage.jsx';

const normalizeRole = (role) => String(role || '').trim().toLowerCase();

const SessionLoading = () => (
  <section className="mx-auto flex min-h-[65vh] w-full max-w-5xl items-center justify-center px-6 py-20 text-center">
    <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">Restoring your session...</p>
  </section>
);

const HomeEntryRoute = () => {
  const { authToken, authUser } = useAppContext();
  const role = normalizeRole(authUser?.role);

  if (authToken && !authUser) {
    return <SessionLoading />;
  }

  if (role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <HomePage />;
};

const CustomerDashboardRoute = () => {
  const { authToken, authUser } = useAppContext();
  const role = normalizeRole(authUser?.role);

  if (!authToken) {
    return <Navigate to="/auth" replace />;
  }

  if (authToken && !authUser) {
    return <SessionLoading />;
  }

  if (role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <UserDashboardPage />;
};

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/admin" element={<AdminDashboardPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/reset-password" element={<AuthPage initialMode="reset" />} />
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomeEntryRoute />} />
        <Route path="/dashboard" element={<CustomerDashboardRoute />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/products/:slug" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/help" element={<StaticInfoPage variant="help" />} />
        <Route path="/terms" element={<StaticInfoPage variant="terms" />} />
        <Route path="/privacy" element={<StaticInfoPage variant="privacy" />} />
        <Route path="/profile" element={<Navigate to="/dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRouter;
