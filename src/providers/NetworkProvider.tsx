/**
 * NetworkProvider
 *
 * Purpose:
 * - Provides a global network connectivity context powered by Expo Network (useNetworkState).
 * - Emits user-facing notifications (via shootAlert) on connectivity loss and restoration.
 * - Normalizes connection type to one of: "WIFI" | "CELLULAR" | "UNKNOWN" | "NONE".
 * - Works on Android, iOS, and Web.
 *
 * Exports:
 * - NetworkProvider: React provider that should wrap the app once at the root.
 * - useNetwork: Hook to read current connectivity (isOnline, type, etc.) when a component needs it.
 *
 * Usage:
 * 1) Wrap the app once (already done in src/app/_layout.tsx):
 *    <NetworkProvider>
 *      <App />
 *    </NetworkProvider>
 *
 * 2) Read network state only where needed:
 *    import { useNetwork } from '@/providers/NetworkProvider';
 *    const { isOnline, type } = useNetwork();
 *    // Example: disable actions if offline.
 *
 * Notes:
 * - Global toasts for going offline/online are handled here; individual screens usually don't need to re-implement them.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef
} from 'react';
import { Platform } from 'react-native';

import { NetworkState, NetworkStateType, useNetworkState } from 'expo-network';

import shootAlert from '@/utils/shoot-alert';

type ConnectionType = 'WIFI' | 'CELLULAR' | 'UNKNOWN' | 'NONE';

type NetworkContextValue = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  isOnline: boolean; // derived convenience flag
  type: ConnectionType;
  rawState: NetworkState | null;
};

const initialContext: NetworkContextValue = {
  isConnected: null,
  isInternetReachable: null,
  isOnline: false,
  type: 'UNKNOWN',
  rawState: null
};

const NetworkContext = createContext<NetworkContextValue>(initialContext);

interface NetworkProviderProps {
  children: React.ReactNode;
}

const mapType = (type: NetworkStateType | undefined): ConnectionType => {
  switch (type) {
    case NetworkStateType.WIFI:
      return 'WIFI';
    case NetworkStateType.CELLULAR:
      return 'CELLULAR';
    case NetworkStateType.NONE:
      return 'NONE';
    default:
      return 'UNKNOWN';
  }
};

export const NetworkProvider = ({ children }: NetworkProviderProps) => {
  const state = useNetworkState();

  const currentType: ConnectionType = mapType(state?.type);

  const isOnline = useMemo(() => {
    const connected = state?.isConnected ?? false;
    // If reachability is known, require it; otherwise rely on isConnected
    const reachable = state?.isInternetReachable;
    return (
      connected &&
      (reachable === null || reachable === undefined ? true : !!reachable)
    );
  }, [state?.isConnected, state?.isInternetReachable]);

  const previousOnlineRef = useRef<boolean | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      // Skip notifications on the very first render to avoid noisy startup toasts
      initializedRef.current = true;
      previousOnlineRef.current = isOnline;
      return;
    }

    const prev = previousOnlineRef.current;
    if (prev !== isOnline) {
      if (isOnline) {
        shootAlert('toast', 'Online', 'Connection restored', 'success');
      } else {
        // Inform about being offline; on web we still use shootAlert which falls back to alert/console
        const typeLabel =
          currentType === 'UNKNOWN' && Platform.OS === 'web'
            ? 'UNKNOWN (web)'
            : currentType;
        shootAlert(
          'toast',
          'Offline',
          `No internet connection (${typeLabel})`,
          'error'
        );
      }
      previousOnlineRef.current = isOnline;
    }
  }, [isOnline, currentType]);

  const value = useMemo<NetworkContextValue>(() => {
    return {
      isConnected: state?.isConnected ?? null,
      isInternetReachable: state?.isInternetReachable ?? null,
      isOnline,
      type: currentType,
      rawState: state ?? null
    };
  }, [state, isOnline, currentType]);

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
