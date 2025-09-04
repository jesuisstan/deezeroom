import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { colorScheme } from 'nativewind';

import { themes } from '@/utils/color-theme';

interface ThemeProviderProps {
  children: React.ReactNode;
}

type ThemeContextType = {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {}
});

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
  const THEME_STORAGE_KEY = 'app:themePreference';

  console.log('ThemeProvider - currentTheme:', currentTheme);

  const toggleTheme = () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setCurrentTheme(newTheme);
    colorScheme.set(newTheme);
    // Persist selection for next app launches
    AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme).catch(() => {});
  };

  // Web: set the dark mode strategy to class, so we can manually control the dark mode
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    // @ts-ignore - web shim from rn-css-interop
    (StyleSheet as any).setFlag?.('darkMode', 'class');
  }, []);

  // Load saved theme on mount (all platforms)
  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') {
          setCurrentTheme(saved);
          colorScheme.set(saved);
        }
      } catch {
        // ignore read errors and keep default
      }
    };
    loadSavedTheme();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, toggleTheme }}>
      <StatusBar style={currentTheme === 'light' ? 'light' : 'dark'} />
      <View style={themes[currentTheme]} className="flex-1">
        {children}
      </View>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
