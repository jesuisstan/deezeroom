import {
  FC,
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode
} from 'react';
import { AppState } from 'react-native';

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
        // Quick connectivity probe; 204 on success.
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch('https://clients3.google.com/generate_204', {
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

    console.log('Network status:', isConnected ? 'online' : 'offline');

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
      appStateSub.remove();
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
