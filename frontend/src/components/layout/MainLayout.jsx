import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';

import { useAppContext } from '../../context/AppContext.jsx';
import ThemeControls from '../common/ThemeControls.jsx';
import CartSidebar from '../shop/CartSidebar.jsx';

const links = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop' },
  { to: '/contact', label: 'Contact' },
];

const MenuIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
    <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
  </svg>
);

const CloseIcon = () => (
  <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
    <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
  </svg>
);

const UserIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
    <path
      d="M12 13.5A4.25 4.25 0 1012 5a4.25 4.25 0 000 8.5zM5 20a7 7 0 0114 0"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.8"
    />
  </svg>
);

const CartIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
    <path
      d="M3.5 5H5l1.7 8.1a1 1 0 001 .8h7.9a1 1 0 001-.76L18.2 7H7.1"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
    <circle cx="9" cy="18.5" r="1.2" fill="currentColor" />
    <circle cx="16.5" cy="18.5" r="1.2" fill="currentColor" />
  </svg>
);

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser, logout, themeMode } = useAppContext();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showGuestAuthPrompt, setShowGuestAuthPrompt] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const profileDisplayName = useMemo(
    () => String(authUser?.firstName || '').trim(),
    [authUser?.firstName],
  );

  const dashboardRoute =
    String(authUser?.role || '').trim().toLowerCase() === 'admin' ? '/admin' : '/dashboard';

  const isHomePage = location.pathname === '/';
  const isLightMode = themeMode === 'light';

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setShowGuestAuthPrompt(false);
  }, [location.pathname]);

  const mobileMenuSurfaceClass = isLightMode
    ? 'border-black/10 bg-white/95 text-neutral-900'
    : 'border-white/10 bg-black/95 text-white';

  const mobileSecondaryTextClass = isLightMode ? 'text-neutral-500' : 'text-zinc-400';
  const mobileItemClass = isLightMode
    ? 'border-black/10 bg-white/60 text-neutral-900 hover:bg-white'
    : 'border-white/10 bg-zinc-900/55 text-white hover:border-[#39FF14] hover:text-[#39FF14]';

  return (
    <div className="min-h-screen overflow-x-hidden text-white">
      <header className="sticky top-0 z-40 px-2 pt-2 sm:px-3 sm:pt-3 md:px-6 md:pt-4">
        <div className="storefront-header-shell mx-auto max-w-[1700px] px-3 py-3 md:px-5">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 md:gap-4">
            <div className="flex min-w-0 items-center gap-3 sm:min-w-[130px]">
              <Link to="/" className="storefront-brand-wordmark">
                Rashed Sport
              </Link>
            </div>

            <nav className="hidden items-center justify-center gap-2 md:flex">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `storefront-nav-link ${isActive ? 'storefront-nav-link-active' : ''}`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="storefront-icon-button md:hidden"
                aria-label="Open cart"
                onClick={() => setIsCartOpen(true)}
              >
                <CartIcon />
              </button>

              <button
                type="button"
                className="storefront-icon-button md:hidden"
                aria-label="Open menu"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <MenuIcon />
              </button>

              <div className="hidden items-center gap-3 text-white/85 md:flex">
                <ThemeControls />

                {!authUser ? (
                  <div className="relative">
                    <button
                      type="button"
                      className="storefront-account-button"
                      aria-label="Open account access options"
                      onClick={() => setShowGuestAuthPrompt((current) => !current)}
                    >
                      <UserIcon />
                      Account
                    </button>

                    {showGuestAuthPrompt && (
                      <div className="storefront-dropdown absolute right-0 top-full z-40 mt-3 w-60 p-3">
                        <p className="mb-3 text-[9px] uppercase tracking-[0.2em] text-white/45">Access</p>
                        <Link
                          to="/auth?tab=login"
                          onClick={() => setShowGuestAuthPrompt(false)}
                          className="mb-2 block rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition-all duration-300 ease-in-out hover:border-[#39FF14] hover:text-[#39FF14]"
                        >
                          Login
                        </Link>
                        <Link
                          to="/auth?tab=register"
                          onClick={() => setShowGuestAuthPrompt(false)}
                          className="block rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition-all duration-300 ease-in-out hover:border-[#39FF14] hover:text-[#39FF14]"
                        >
                          Register
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="group relative">
                    <button
                      type="button"
                      className="storefront-account-button"
                      aria-label="Open profile menu"
                    >
                      <UserIcon />
                      <span>{profileDisplayName || 'Account'}</span>
                    </button>

                    <div className="storefront-dropdown pointer-events-none absolute right-0 top-full z-40 mt-3 w-60 p-3 opacity-0 transition duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                      <Link
                        to={dashboardRoute}
                        className="mb-2 block rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition-all duration-300 ease-in-out hover:border-[#39FF14] hover:text-[#39FF14]"
                      >
                        Dashboard
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          navigate('/auth', { replace: true });
                        }}
                        className="w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition-all duration-300 ease-in-out hover:border-[#39FF14] hover:text-[#39FF14]"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className="storefront-icon-button"
                  aria-label="Open cart"
                  onClick={() => setIsCartOpen(true)}
                >
                  <CartIcon />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-[60] md:hidden transition-all duration-300 ease-in-out ${
          isMobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <button
          type="button"
          aria-label="Close menu backdrop"
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />

        <aside
          className={`absolute right-0 top-0 flex h-full w-full max-w-sm transform flex-col overflow-y-auto border-l p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 ease-in-out sm:p-6 ${mobileMenuSurfaceClass} ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-5">
            <p className={`text-xs font-bold uppercase tracking-[0.22em] ${mobileSecondaryTextClass}`}>Menu</p>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="storefront-icon-button"
              aria-label="Close mobile menu"
            >
              <CloseIcon />
            </button>
          </div>

          <nav className="mt-8 flex flex-col gap-3">
            {links.map((link) => (
              <NavLink
                key={`mobile-${link.to}`}
                to={link.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-xl border px-4 py-4 text-lg font-bold uppercase tracking-tight transition-all duration-300 ease-in-out ${mobileItemClass} ${
                    isActive ? 'border-[#39FF14] text-[#39FF14]' : ''
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-8 border-t border-white/10 pt-6">
            <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${mobileSecondaryTextClass}`}>Theme</p>
            <div className="mt-3">
              <ThemeControls />
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${mobileSecondaryTextClass}`}>Account</p>
            <div className="mt-3 space-y-3">
              {!authUser ? (
                <>
                  <Link
                    to="/auth?tab=login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block border px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] transition-all duration-300 ease-in-out ${mobileItemClass}`}
                  >
                    Login
                  </Link>
                  <Link
                    to="/auth?tab=register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block border px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] transition-all duration-300 ease-in-out ${mobileItemClass}`}
                  >
                    Register
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to={dashboardRoute}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block border px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] transition-all duration-300 ease-in-out ${mobileItemClass}`}
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      logout();
                      navigate('/auth', { replace: true });
                    }}
                    className={`w-full border px-4 py-3 text-left text-sm font-bold uppercase tracking-[0.16em] transition-all duration-300 ease-in-out ${mobileItemClass}`}
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>

      <main className={`text-white ${isHomePage ? 'w-full' : 'mx-auto w-full max-w-[1560px] px-2 py-4 sm:px-4 sm:py-7 md:px-8 md:py-10'}`}>
        {isHomePage ? (
          <Outlet />
        ) : (
          <div className="storefront-shell p-3 sm:p-6 md:p-8">
            <Outlet />
          </div>
        )}
      </main>

      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
};

export default MainLayout;
