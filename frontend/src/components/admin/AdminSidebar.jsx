import { useNavigate } from 'react-router-dom';

import { useAppContext } from '../../context/AppContext.jsx';

const primaryLinks = [
  'Dashboard',
  'Inventory',
  'Orders',
  'Messages',
  'Customers',
  'Analytics',
  'Settings',
];

const SidebarIcon = ({ active = false }) => (
  <span
    className={`grid h-4 w-4 place-items-center rounded-sm border text-[8px] ${
      active
        ? 'border-[#7DFF63] bg-[#7DFF63] text-[#101010]'
        : 'border-white/15 bg-white/[0.04] text-white/55'
    }`}
  />
);

const AdminSidebar = ({ activeSection, onSectionChange, isOpen, onClose }) => {
  const navigate = useNavigate();
  const { logout } = useAppContext();

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/55 transition md:hidden ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-[min(272px,calc(100vw-2rem))] flex-col overflow-y-auto border-r border-white/10 bg-black px-5 py-6 transition duration-300 sm:px-6 md:sticky md:z-0 md:w-[272px] md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <p className="font-display text-[2rem] font-bold uppercase leading-none tracking-[-0.06em] text-[#7DFF63]">
            Admin Portal
          </p>
          <p className="mt-3 text-[10px] uppercase tracking-[0.32em] text-zinc-500">
            Rashed Industrial
          </p>
        </div>

        <nav className="mt-12 space-y-2">
          {primaryLinks.map((item) => {
            const isActive = item === activeSection;

            return (
              <button
                key={item}
                type="button"
                onClick={() => {
                  onSectionChange(item);
                  onClose();
                }}
                className={`flex w-full items-center gap-3 border-l-2 px-4 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-in-out ${
                  isActive
                    ? 'border-[#7DFF63] bg-zinc-900 text-[#7DFF63]'
                    : 'border-transparent text-zinc-400 hover:bg-zinc-900/60 hover:text-white'
                }`}
              >
                <SidebarIcon active={isActive} />
                {item}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto">
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="flex w-full items-center justify-center gap-2 bg-[#7DFF63] px-4 py-4 text-[11px] font-bold uppercase tracking-[0.24em] text-[#101010] shadow-[0_0_24px_rgba(125,255,99,0.24)] transition-all duration-300 ease-in-out hover:brightness-110"
          >
            View Live Store
            <span aria-hidden="true">[]</span>
          </button>

          <div className="mt-8 space-y-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            <button type="button" onClick={() => navigate('/help')} className="flex items-center gap-3 transition-all duration-300 ease-in-out hover:text-white">
              <span className="text-zinc-400">?</span>
              Help
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/auth', { replace: true });
              }}
              className="flex items-center gap-3 transition-all duration-300 ease-in-out hover:text-white"
            >
              <span className="text-zinc-400">-&gt;</span>
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
