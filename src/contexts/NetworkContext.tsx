import {
  FC,
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef
} from 'react';
import { AppState, Platform } from 'react-native';
import shootAlert from '@/utils/shoot-alert';

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
  //const previousConnectionState = useRef<boolean>(true);
  const lastNotificationTime = useRef<number>(0);

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
          const newConnectionState = navigator.onLine;
          if (newConnectionState !== isConnected) {
            setIsConnected(newConnectionState);
            showNetworkNotification(newConnectionState);
          }
          return;
        }

        // Fallback to a simple fetch to a CORS-friendly endpoint
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch('https://httpbin.org/status/200', {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal
        } as RequestInit);
        clearTimeout(timeout);
        if (!mounted) return;

        const newConnectionState = res.ok;
        if (newConnectionState !== isConnected) {
          setIsConnected(newConnectionState);
          showNetworkNotification(newConnectionState);
        }
      } catch {
        if (!mounted) return;
        const newConnectionState = false;
        if (newConnectionState !== isConnected) {
          setIsConnected(newConnectionState);
          showNetworkNotification(newConnectionState);
        }
      }
    };

    const showNetworkNotification = (connected: boolean) => {
      const now = Date.now();
      // Show notification not more often than every 20 seconds
      if (now - lastNotificationTime.current > 20000) {
        if (connected) {
          shootAlert(
            'toast',
            'Connection Restored!',
            'Internet connection is back online.',
            'success'
          );
        } else {
          shootAlert(
            'toast',
            'Network Error!',
            'Please check your internet connection.',
            'error',
            true
          );
        }
        lastNotificationTime.current = now;
      }
    };

    // Initial check and then poll every 10 seconds
    checkOnline();
    interval = setInterval(checkOnline, 10000);

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
      onlineListener = () => {
        setIsConnected(true);
        showNetworkNotification(true);
      };
      offlineListener = () => {
        setIsConnected(false);
        showNetworkNotification(false);
      };
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
  }, [isConnected]);

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
