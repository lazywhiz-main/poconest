import React, { createContext, useContext } from 'react';

export interface Theme {
  colors: {
    primary: string;
    background: string;
    text: string;
    border: string;
    overlay: string;
  };
}

const defaultTheme: Theme = {
  colors: {
    primary: '#007AFF',
    background: '#FFFFFF',
    text: '#000000',
    border: '#EEEEEE',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
};

interface ThemeContextType {
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextType>({ theme: defaultTheme });

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeContext.Provider value={{ theme: defaultTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext); 