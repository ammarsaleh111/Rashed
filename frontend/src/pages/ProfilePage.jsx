import { Link } from 'react-router-dom';

import { useAppContext } from '../context/AppContext.jsx';

const ProfilePage = () => {
  const { authUser, logout, refreshProfile, authLoading } = useAppContext();

  if (!authUser) {
    return (
      <section className="mx-auto flex min-h-[65vh] w-full max-w-5xl flex-col items-center justify-center px-2 py-16 text-center sm:px-6 sm:py-20">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neon">Profile Access</p>
        <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight text-white sm:text-5xl">
          Sign In Required
        </h1>
        <p className="mt-5 max-w-xl text-sm text-white/70">
          Authenticate to view account identity, loyalty tier, and profile details synced from the API.
        </p>
        <Link
          to="/auth"
          className="mt-8 bg-neon px-8 py-3 text-xs font-bold uppercase tracking-[0.22em] text-black transition hover:bg-[#78ff5e]"
        >
          Go To Login
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-2 py-8 sm:px-6 sm:py-14">
      <div className="border border-white/10 bg-[#101010] p-5 sm:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neon">Account Profile</p>
        <h1 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl">
          {authUser.firstName} {authUser.lastName}
        </h1>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="border border-white/10 bg-black/40 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/55">Email</p>
            <p className="mt-2 text-sm text-white">{authUser.email}</p>
          </div>

          <div className="border border-white/10 bg-black/40 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/55">Role</p>
            <p className="mt-2 text-sm uppercase text-white">{authUser.role}</p>
          </div>

          <div className="border border-white/10 bg-black/40 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/55">Tier Status</p>
            <p className="mt-2 text-sm text-white">{authUser.tierStatus || 'Member'}</p>
          </div>

          <div className="border border-white/10 bg-black/40 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/55">Reward Points</p>
            <p className="mt-2 text-sm text-white">{authUser.rewardPoints ?? 0}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={refreshProfile}
            disabled={authLoading}
            className="bg-white/10 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/20 disabled:opacity-50"
          >
            Refresh Profile
          </button>

          <button
            type="button"
            onClick={logout}
            className="bg-neon px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-[#78ff5e]"
          >
            Logout
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProfilePage;
