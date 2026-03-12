/**
 * Store de Tema usando Zustand
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeStore {
  isDarkMode: boolean;
  toggleTheme: () => Promise<void>;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  isDarkMode: true,

  toggleTheme: async () => {
    const newValue = !get().isDarkMode;
    await AsyncStorage.setItem('dark_mode', JSON.stringify(newValue));
    set({ isDarkMode: newValue });
  },

  loadTheme: async () => {
    const stored = await AsyncStorage.getItem('dark_mode');
    if (stored !== null) {
      set({ isDarkMode: JSON.parse(stored) });
    }
  },
}));

// Cores do tema
export const darkTheme = {
  background: '#0d1117',
  surface: '#161d2e',
  card: '#1a2133',
  primary: '#4f83f8',
  secondary: '#34d399',
  accent: '#f87171',
  text: '#e6edf3',
  textSecondary: '#8b949e',
  border: '#252f44',
  success: '#34d399',
  error: '#f87171',
  warning: '#f59e0b',
  info: '#38bdf8',
  buyColor: '#34d399',
  sellColor: '#f87171',
  chartGreen: '#34d399',
  chartRed: '#f87171',
};

export const lightTheme = {
  background: '#f0f2f5',
  surface: '#ffffff',
  card: '#ffffff',
  primary: '#4f83f8',
  secondary: '#10b981',
  accent: '#ef4444',
  text: '#111827',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#38bdf8',
  buyColor: '#10b981',
  sellColor: '#ef4444',
  chartGreen: '#10b981',
  chartRed: '#ef4444',
};

export const getTheme = (isDarkMode: boolean) => isDarkMode ? darkTheme : lightTheme;
