import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App.jsx';
import { AppProvider } from './context/AppContext.jsx';
import './index.css';

const initialThemeMode =
  String(localStorage.getItem('rashed_theme_mode') || 'light').toLowerCase() === 'dark'
    ? 'dark'
    : 'light';

document.documentElement.classList.remove('light-mode', 'dark-mode');
document.documentElement.classList.add(initialThemeMode === 'dark' ? 'dark-mode' : 'light-mode');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

