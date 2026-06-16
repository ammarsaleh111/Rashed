import { useEffect } from 'react';

import { useAppContext } from '../context/AppContext.jsx';
import { getHealthStatus } from '../services/api/health.js';

export const useApiStatus = () => {
  const { apiStatus, setApiStatus } = useAppContext();

  useEffect(() => {
    let ignore = false;

    const checkHealth = async () => {
      try {
        setApiStatus('loading');
        await getHealthStatus();

        if (!ignore) {
          setApiStatus('ready');
        }
      } catch (_error) {
        if (!ignore) {
          setApiStatus('offline');
        }
      }
    };

    checkHealth();

    return () => {
      ignore = true;
    };
  }, [setApiStatus]);

  return apiStatus;
};

