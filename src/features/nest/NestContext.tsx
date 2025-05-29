import React, { createContext, useContext, useState } from 'react';

interface NestContextType {
  currentNest: string | null;
  setCurrentNest: (nest: string) => void;
}

const NestContext = createContext<NestContextType | undefined>(undefined);

export const NestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentNest, setCurrentNest] = useState<string | null>(null);

  return (
    <NestContext.Provider value={{ currentNest, setCurrentNest }}>
      {children}
    </NestContext.Provider>
  );
};

export const useNest = () => {
  const context = useContext(NestContext);
  if (context === undefined) {
    throw new Error('useNest must be used within a NestProvider');
  }
  return context;
}; 