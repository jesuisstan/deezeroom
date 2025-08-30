import {
  FC,
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode
} from 'react';
import { AppState, Platform } from 'react-native';

type TNetworkContextState = {
  isConnected: boolean;
};

type TNetworkProviderProps = {
  children: ReactNode;
};

const NetworkContext = createContext<TNetworkContextState | undefined>(
  undefined
);

export const NetworkProvider: FC<TNetworkProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    let interval: ReturnType<typeof setInterval> | undefined;

    const checkOnline = async () => {
      if (!mounted) return;
      try {
        // Use a CORS-friendly endpoint or check navigator.onLine (web only)
        if (
          Platform.OS === 'web' &&
          typeof navigator !== 'undefined' &&
          'onLine' in navigator
        ) {
          setIsConnected(navigator.onLine);
          return;
        }

        // Fallback to a simple fetch to a CORS-friendly endpoint
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch('https://httpbin.org/status/200', {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal
        } as RequestInit);
        clearTimeout(timeout);
        if (!mounted) return;
        setIsConnected(res.ok);
      } catch {
        if (!mounted) return;
        setIsConnected(false);
      }
    };

    // Initial check and then poll every 5s
    checkOnline();
    interval = setInterval(checkOnline, 5000);

    // Re-check when app comes to foreground
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkOnline();
    });

    // Listen for online/offline events on web only
    let onlineListener: (() => void) | undefined;
    let offlineListener: (() => void) | undefined;
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      typeof window.addEventListener === 'function'
    ) {
      onlineListener = () => setIsConnected(true);
      offlineListener = () => setIsConnected(false);
      window.addEventListener('online', onlineListener);
      window.addEventListener('offline', offlineListener);
    }

    console.log('Network status:', isConnected ? 'online' : 'offline');

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
      appStateSub.remove();
      if (
        Platform.OS === 'web' &&
        typeof window !== 'undefined' &&
        typeof window.removeEventListener === 'function'
      ) {
        if (onlineListener)
          window.removeEventListener('online', onlineListener);
        if (offlineListener)
          window.removeEventListener('offline', offlineListener);
      }
    };
  }, []);

  return (
    <NetworkContext.Provider value={{ isConnected }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = (): TNetworkContextState => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};
