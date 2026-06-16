import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useAppContext } from '../context/AppContext.jsx';

const getPostAuthRoute = (role) =>
  String(role || '').trim().toLowerCase() === 'admin' ? '/admin' : '/dashboard';

const AuthPage = ({ initialMode = 'login' }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { authUser, authLoading, login, register } = useAppContext();
  const isResetMode = initialMode === 'reset';
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'register' ? 'register' : 'login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [stayAuthenticated, setStayAuthenticated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  useEffect(() => {
    if (authUser) {
      navigate(getPostAuthRoute(authUser.role), { replace: true });
    }
  }, [authUser, navigate]);

  useEffect(() => {
    if (isResetMode) {
      return;
    }

    const tabFromQuery = searchParams.get('tab');
    if (tabFromQuery === 'login' || tabFromQuery === 'register') {
      setActiveTab(tabFromQuery);
    }
  }, [isResetMode, searchParams]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    if (activeTab === 'register') {
      const registration = await register({ firstName, lastName, email, password });
      if (!registration.success) {
        setErrorMessage(registration.message);
        return;
      }
      navigate(getPostAuthRoute(registration?.data?.user?.role), { replace: true });
      return;
    }

    const loginResult = await login({ email, password, stayAuthenticated });
    if (!loginResult.success) {
      setErrorMessage(loginResult.message);
      return;
    }
    navigate(getPostAuthRoute(loginResult?.data?.user?.role), { replace: true });
  };

  const handleResetSubmit = (event) => {
    event.preventDefault();
    setResetMessage('If an account exists, a password reset link has been queued.');
  };

  const inputClass = 'theme-input w-full px-4 py-4 font-light';

  return (
    <div className="auth-page flex min-h-screen flex-col overflow-x-hidden bg-black font-body text-white selection:bg-neon selection:text-black md:flex-row">
      <div className="auth-visual relative flex min-h-[42vh] w-full flex-col justify-between overflow-hidden border-r border-dark-border bg-[#0a0a0a] p-6 sm:min-h-[50vh] sm:p-8 md:min-h-screen md:w-1/2 md:p-12 lg:p-16">
        <div className="absolute inset-0 z-0 opacity-40 mix-blend-luminosity bg-cover bg-center" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop")' }} />
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-black/80 via-transparent to-black" />

        <div className="relative z-10">
          <h1 className="text-neon font-display font-bold tracking-tighter text-2xl">RASHED</h1>
        </div>

        <div className="relative z-10 mt-auto">
          <h2 className="mb-6 font-display text-[clamp(3.4rem,16vw,6rem)] font-black uppercase leading-[0.85] tracking-tighter md:text-7xl lg:text-8xl">
            <span className="text-white block">Welcome</span>
            <span className="text-neon block">To Rashed</span>
          </h2>
          <p className="mb-8 max-w-md text-base font-light leading-relaxed text-gray-400 sm:mb-12 md:text-xl">
            Sign in to shop new arrivals, track orders, and save your favorites.
          </p>
          <div className="text-xs tracking-[0.2em] text-gray-600 uppercase">Apparel / Footwear / Essentials</div>
        </div>
      </div>

      <div className="auth-panel relative flex min-h-screen w-full items-center justify-center bg-[#0f0f0f] p-5 sm:p-8 md:w-1/2 md:p-12">
      
        <div className="w-full max-w-md relative z-10">
          {isResetMode ? (
            <div>
              <div className="mb-12 border-b border-dark-border pb-4">
                <p className="text-[10px] font-bold tracking-[0.22em] text-neon uppercase">Password Recovery</p>
                <h2 className="mt-3 text-3xl font-display font-black uppercase tracking-tighter text-white">Reset Access</h2>
                <p className="mt-4 text-sm leading-6 text-gray-400">
                  Enter your email and we&apos;ll send a reset link.
                </p>
              </div>

              <form onSubmit={handleResetSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold tracking-widest text-gray-400 uppercase">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@rashed.com"
                    className={inputClass}
                    required
                  />
                </div>

                {resetMessage && <p className="text-[11px] tracking-widest uppercase text-neon">{resetMessage}</p>}

                <button type="submit" className="w-full bg-neon text-black font-display font-bold text-sm tracking-widest uppercase py-4 mt-6 hover:bg-[#4ade80] transition-colors">
                  Send Reset Link
                </button>

                <Link to="/auth" className="block text-center text-[10px] uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-colors">
                  Back to Login
                </Link>
              </form>
            </div>
          ) : (
            <>
              <div className="mb-10 flex flex-wrap gap-x-8 gap-y-3 border-b border-dark-border sm:mb-12">
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className={`pb-4 font-display text-lg font-medium transition-colors sm:text-xl ${activeTab === 'login' ? 'text-white border-b-2 border-neon' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className={`pb-4 font-display text-lg font-medium transition-colors sm:text-xl ${activeTab === 'register' ? 'text-white border-b-2 border-neon' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {activeTab === 'register' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold tracking-widest text-gray-400 uppercase">First Name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                        placeholder="Rashed"
                        className={inputClass}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold tracking-widest text-gray-400 uppercase">Last Name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(event) => setLastName(event.target.value)}
                        placeholder="Customer"
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-xs font-bold tracking-widest text-gray-400 uppercase">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@rashed.com"
                    className={inputClass}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold tracking-widest text-gray-400 uppercase">Password</label>
                    {activeTab === 'login' && (
                      <Link to="/auth/reset-password" className="text-[10px] uppercase tracking-wider text-gray-500 hover:text-neon transition-colors">
                        Forgot Password?
                      </Link>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••"
                      className={`${inputClass} pr-12`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        {showPassword ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L8 8.5" />
                        ) : (
                          <>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                {activeTab === 'login' && (
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center w-4 h-4 rounded border border-gray-600 bg-transparent group-hover:border-neon transition-colors">
                      <input
                        type="checkbox"
                        checked={stayAuthenticated}
                        onChange={(event) => setStayAuthenticated(event.target.checked)}
                        className="sr-only"
                      />
                      {stayAuthenticated && <div className="w-2 h-2 bg-neon rounded-sm" />}
                    </div>
                    <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                      Keep me signed in
                    </span>
                  </label>
                )}

                {errorMessage && <p className="text-[11px] tracking-widest uppercase text-red-400">{errorMessage}</p>}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-neon text-black font-display font-bold text-sm tracking-widest uppercase py-4 mt-6 hover:bg-[#4ade80] transition-colors"
                >
                  {authLoading ? 'Processing...' : activeTab === 'register' ? 'Create Account' : 'Sign In'}
                </button>
              </form>

              <div className="flex items-center gap-4 my-10">
                <div className="h-px bg-dark-border flex-1" />
                <span className="text-[10px] text-gray-500 tracking-[0.2em] uppercase">Other Options</span>
                <div className="h-px bg-dark-border flex-1" />
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link to="/help?topic=oauth" className="flex-1 flex items-center justify-center gap-3 bg-[#1a1a1a] hover:bg-[#222] transition-colors py-4 text-xs font-bold tracking-widest text-white uppercase border border-dark-border">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </Link>
                <Link to="/help?topic=oauth" className="flex-1 flex items-center justify-center gap-3 bg-[#1a1a1a] hover:bg-[#222] transition-colors py-4 text-xs font-bold tracking-widest text-white uppercase border border-dark-border">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.26-.82 3.59-.83 1.58.07 2.87.68 3.65 1.76-3.21 1.87-2.8 5.86.3 7.03-.78 1.83-1.63 3.29-2.62 4.21z" />
                    <path d="M12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  Apple
                </Link>
              </div>

              <p className="mt-12 text-center text-[9px] leading-relaxed text-gray-500 uppercase tracking-widest max-w-xs mx-auto">
                By continuing, you agree to our{' '}
                <Link to="/terms" className="border-b border-gray-600 hover:text-white hover:border-white transition-colors">
                  Terms
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="border-b border-gray-600 hover:text-white hover:border-white transition-colors">
                  Privacy Policy
                </Link>.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
