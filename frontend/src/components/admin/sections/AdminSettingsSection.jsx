import React, { useEffect, useState } from 'react';

const AdminSettingsSection = () => {
  const [storeName, setStoreName] = useState('RASHED INDUSTRIAL');
  const [supportEmail, setSupportEmail] = useState('ops@rashed-industrial.com');
  const [toggles, setToggles] = useState([false, true, true]);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('rashed_admin_settings');
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      setStoreName(parsed.storeName || 'RASHED INDUSTRIAL');
      setSupportEmail(parsed.supportEmail || 'ops@rashed-industrial.com');
      if (Array.isArray(parsed.toggles) && parsed.toggles.length === 3) {
        setToggles(parsed.toggles);
      }
    } catch (_error) {
      // Ignore malformed local state.
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem(
      'rashed_admin_settings',
      JSON.stringify({ storeName, supportEmail, toggles }),
    );
    setSavedMessage('Settings saved locally.');
  };

  return (
    <div className="mt-7 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-white font-display font-bold text-3xl uppercase tracking-tighter">System Configuration</h2>
          <p className="text-gray-400 text-[10px] uppercase tracking-widest mt-2">Manage app parameters and environment flags</p>
        </div>
        <button type="button" onClick={handleSave} className="bg-neon px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-[#4ade80]">
          Save Changes
        </button>
      </div>

      {savedMessage && (
        <p className="mb-4 text-[11px] uppercase tracking-[0.18em] text-neon">{savedMessage}</p>
      )}

      <div className="space-y-8">
        <section className="border border-white/5 bg-[#111] p-5 sm:p-8">
          <h3 className="text-neon font-display text-[10px] uppercase tracking-[0.2em] font-bold mb-6">General Store Information</h3>
          
          <div className="space-y-6 text-sm">
            <div>
              <label className="block text-gray-500 uppercase tracking-widest text-[10px] font-bold mb-2">Store Name</label>
              <input value={storeName} onChange={(event) => setStoreName(event.target.value)} type="text" className="w-full bg-[#1a1a1a] border border-transparent focus:border-neon text-white px-4 py-3 outline-none transition-colors" />
            </div>
            
            <div>
              <label className="block text-gray-500 uppercase tracking-widest text-[10px] font-bold mb-2">Support Email</label>
              <input value={supportEmail} onChange={(event) => setSupportEmail(event.target.value)} type="email" className="w-full bg-[#1a1a1a] border border-transparent focus:border-neon text-white px-4 py-3 outline-none transition-colors" />
            </div>
          </div>
        </section>

        <section className="border border-white/5 bg-[#111] p-5 sm:p-8">
          <h3 className="text-neon font-display text-[10px] uppercase tracking-[0.2em] font-bold mb-6">Global Variables</h3>
          
          <div className="space-y-4">
            {[
              'Maintenance Mode',
              'Accept New Customer Registrations',
              'Enable Promotions / Flash Sales'
            ].map((toggle, i) => (
              <div key={toggle} className="flex items-center justify-between gap-4">
                <span className="min-w-0 text-xs font-bold uppercase tracking-widest text-white">{toggle}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={toggles[i]}
                      onChange={(event) => {
                        setToggles((current) => current.map((value, index) => (index === i ? event.target.checked : value)));
                      }}
                    />
                  <div className="w-11 h-6 bg-[#1a1a1a] border border-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon peer-checked:border-neon"></div>
                </label>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminSettingsSection;
