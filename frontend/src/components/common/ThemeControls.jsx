import { useAppContext } from '../../context/AppContext.jsx';

const SunIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M12 3V5.5M12 18.5V21M3 12H5.5M18.5 12H21M5.64 5.64L7.4 7.4M16.6 16.6L18.36 18.36M16.6 7.4L18.36 5.64M5.64 18.36L7.4 16.6"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.8"
    />
  </svg>
);

const MoonIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
    <path
      d="M20.6 15.1A8.7 8.7 0 119 3.4a7 7 0 1011.6 11.7z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

const ThemeControls = () => {
  const { themeMode, toggleTheme } = useAppContext();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="storefront-icon-button rounded-full"
      aria-label={themeMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      title={themeMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {themeMode === 'light' ? <MoonIcon /> : <SunIcon />}
    </button>
  );
};

export default ThemeControls;
