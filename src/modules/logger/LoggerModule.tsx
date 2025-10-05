import {
  createRef,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle
} from 'react';
import { Platform } from 'react-native';

import Constants from 'expo-constants';
import { usePathname } from 'expo-router';

import { useUser } from '@/providers/UserProvider';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = {
  platform: string;
  deviceName?: string;
  appVersion: string;
  buildVersion?: string;
  timestamp: string;
  userId?: string;
  userDisplayName?: string;
};

export type LogEntry = {
  level: LogLevel;
  message: string;
  data?: any;
  context: LogContext;
  source?: string; // Component or file where the log came from
};

export type LoggerRef = {
  debug: (message: string, data?: any, source?: string) => void;
  info: (message: string, data?: any, source?: string) => void;
  warn: (message: string, data?: any, source?: string) => void;
  error: (message: string, data?: any, source?: string) => void;
  getCurrentPath: () => string;
};

type LoggerModuleProps = {
  enableConsole?: boolean;
  logLevel?: LogLevel;
};

// Singleton ref for static API
const loggerRef = createRef<LoggerRef>();

export const LoggerModule = forwardRef<LoggerRef, LoggerModuleProps>(
  ({ enableConsole = true, logLevel = 'debug' }, ref) => {
    const { user, profile } = useUser();
    const pathname = usePathname();

    // Format timestamp with timezone
    const formatTimestamp = useCallback((date: Date): string => {
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
        hour12: false
      };

      return new Intl.DateTimeFormat('en-US', options).format(date);
    }, []);

    // Get logging context information
    const getLogContext = useCallback((): LogContext => {
      const now = new Date();
      return {
        platform: Platform.OS,
        deviceName: Constants.deviceName,
        appVersion: Constants.expoConfig?.version || '1.0.0',
        buildVersion:
          Constants.expoConfig?.runtimeVersion || Constants.nativeBuildVersion,
        timestamp: formatTimestamp(now),
        userId: user?.uid,
        userDisplayName: user?.displayName || profile?.displayName
      };
    }, [user, profile, formatTimestamp]);

    // Check if log level should be logged
    const shouldLog = useCallback(
      (level: LogLevel): boolean => {
        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(logLevel);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex >= currentLevelIndex;
      },
      [logLevel]
    );

    // TODO: Add server logging when backend API is ready
    // const sendToRemote = async (entry: LogEntry) => { ... }

    // Main logging function
    const log = useCallback(
      (level: LogLevel, message: string, data?: any, source?: string) => {
        if (!shouldLog(level)) return;

        const entry: LogEntry = {
          level,
          message,
          data,
          context: getLogContext(),
          source
        };

        // Console output
        if (enableConsole) {
          const appVersion = entry.context.appVersion;
          const timestamp = entry.context.timestamp;
          const platform = entry.context.platform;
          const deviceInfo = entry.context.deviceName
            ? ` [${entry.context.deviceName}]`
            : '';
          const sourceInfo = source ? ` [${source}]` : '';
          const userInfo = entry.context.userId
            ? ` [User: ${entry.context.userId}${entry.context.userDisplayName ? ` (${entry.context.userDisplayName})` : ''}]`
            : '';

          const levelEmoji = {
            debug: '🐛 ',
            info: 'ℹ️ ',
            warn: '⚠️ ',
            error: '❌ '
          }[level];

          const logMessage = `${levelEmoji} [${timestamp}] [v ${appVersion}] [${platform}]${deviceInfo}${sourceInfo}${userInfo} ${message}`;

          switch (level) {
            case 'debug':
              console.log(logMessage, data || '');
              break;
            case 'info':
              console.info(logMessage, data || '');
              break;
            case 'warn':
              console.warn(logMessage, data || '');
              break;
            case 'error':
              console.error(logMessage, data || '');
              break;
          }
        }

        // TODO: Server logging will be added later
        // sendToRemote(entry);
      },
      [enableConsole, getLogContext, shouldLog]
    );

    // Methods for different log levels
    const debug = useCallback(
      (message: string, data?: any, source?: string) =>
        log('debug', message, data, source),
      [log]
    );

    const info = useCallback(
      (message: string, data?: any, source?: string) =>
        log('info', message, data, source),
      [log]
    );

    const warn = useCallback(
      (message: string, data?: any, source?: string) =>
        log('warn', message, data, source),
      [log]
    );

    const error = useCallback(
      (message: string, data?: any, source?: string) =>
        log('error', message, data, source),
      [log]
    );

    const getCurrentPath = useCallback(() => {
      return pathname || 'unknown';
    }, [pathname]);

    useImperativeHandle(
      ref,
      () => ({
        debug,
        info,
        warn,
        error,
        getCurrentPath
      }),
      [debug, info, warn, error, getCurrentPath]
    );

    // Export through singleton ref
    useEffect(() => {
      loggerRef.current = {
        debug,
        info,
        warn,
        error,
        getCurrentPath
      } as LoggerRef;

      return () => {
        loggerRef.current = null as unknown as LoggerRef;
      };
    }, [debug, info, warn, error, getCurrentPath]);

    // Component doesn't render UI
    return null;
  }
);

LoggerModule.displayName = 'LoggerModule';

// Static API for convenient usage
export const Logger = {
  debug: (message: string, data?: any, source?: string) =>
    loggerRef.current?.debug(message, data, source),

  info: (message: string, data?: any, source?: string) =>
    loggerRef.current?.info(message, data, source),

  warn: (message: string, data?: any, source?: string) =>
    loggerRef.current?.warn(message, data, source),

  error: (message: string, data?: any, source?: string) =>
    loggerRef.current?.error(message, data, source),

  // Convenient methods for specific cases
  api: {
    request: (endpoint: string, method: string, data?: any) =>
      loggerRef.current?.info(
        `API Request: ${method} ${endpoint}`,
        data,
        'API'
      ),

    response: (endpoint: string, status: number, data?: any) =>
      loggerRef.current?.info(
        `API Response: ${status} ${endpoint}`,
        data,
        'API'
      ),

    error: (endpoint: string, error: any) =>
      loggerRef.current?.error(`API Error: ${endpoint}`, error, 'API')
  },

  user: {
    login: () => loggerRef.current?.info(`User logged in`, {}, 'Auth'),

    logout: () => loggerRef.current?.info(`User logged out`, {}, 'Auth'),

    action: (action: string, data?: any) =>
      loggerRef.current?.info(`User action: ${action}`, data, 'User')
  },

  navigation: {
    back: (source?: string) => {
      const currentPath = loggerRef.current?.getCurrentPath?.() || 'unknown';
      const message = `Navigate back from ${currentPath}`;

      loggerRef.current?.info(message, null, source || 'Navigation');
    },

    to: (destination: string, source?: string) => {
      const currentPath = loggerRef.current?.getCurrentPath?.() || 'unknown';
      const message = `Navigate to ${destination} from ${currentPath}`;

      loggerRef.current?.info(message, null, source || 'Navigation');
    }
  }
};

export default LoggerModule;
