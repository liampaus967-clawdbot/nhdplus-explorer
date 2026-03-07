"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { PersonaMode } from '../types';
import { useMapContext } from './MapContext';

// Custom larger crosshair cursor (32x32 SVG)
const CROSSHAIR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <line x1="16" y1="0" x2="16" y2="12" stroke="white" stroke-width="2"/>
  <line x1="16" y1="20" x2="16" y2="32" stroke="white" stroke-width="2"/>
  <line x1="0" y1="16" x2="12" y2="16" stroke="white" stroke-width="2"/>
  <line x1="20" y1="16" x2="32" y2="16" stroke="white" stroke-width="2"/>
  <line x1="16" y1="0" x2="16" y2="12" stroke="black" stroke-width="1"/>
  <line x1="16" y1="20" x2="16" y2="32" stroke="black" stroke-width="1"/>
  <line x1="0" y1="16" x2="12" y2="16" stroke="black" stroke-width="1"/>
  <line x1="20" y1="16" x2="32" y2="16" stroke="black" stroke-width="1"/>
  <circle cx="16" cy="16" r="2" fill="white" stroke="black" stroke-width="1"/>
</svg>`;

const CROSSHAIR_DATA_URI = `url("data:image/svg+xml,${encodeURIComponent(CROSSHAIR_SVG)}") 16 16, crosshair`;

interface PersonaModeContextValue {
  mode: PersonaMode;
  setMode: (mode: PersonaMode) => void;
}

const PersonaModeContext = createContext<PersonaModeContextValue | null>(null);

export function usePersonaModeContext() {
  const context = useContext(PersonaModeContext);
  if (!context) {
    throw new Error('usePersonaModeContext must be used within a PersonaModeProvider');
  }
  return context;
}

interface PersonaModeProviderProps {
  children: ReactNode;
  onModeChange?: (oldMode: PersonaMode, newMode: PersonaMode) => void;
}

export function PersonaModeProvider({ children, onModeChange }: PersonaModeProviderProps) {
  const { map, styleVersion } = useMapContext();
  const [mode, setModeState] = useState<PersonaMode>("home");

  // Set mode with callback
  const setMode = useCallback((newMode: PersonaMode) => {
    const oldMode = mode;
    setModeState(newMode);
    onModeChange?.(oldMode, newMode);
  }, [mode, onModeChange]);

  // Update cursor based on persona mode (also re-apply after style changes)
  useEffect(() => {
    if (!map.current) return;
    
    const canvas = map.current.getCanvas();
    
    if (mode === "home") {
      // Home mode: grab cursor, grabbing when mouse down
      canvas.style.cursor = "grab";
      
      const onMouseDown = () => { canvas.style.cursor = "grabbing"; };
      const onMouseUp = () => { canvas.style.cursor = "grab"; };
      
      canvas.addEventListener("mousedown", onMouseDown);
      canvas.addEventListener("mouseup", onMouseUp);
      canvas.addEventListener("mouseleave", onMouseUp);
      
      return () => {
        canvas.removeEventListener("mousedown", onMouseDown);
        canvas.removeEventListener("mouseup", onMouseUp);
        canvas.removeEventListener("mouseleave", onMouseUp);
        // Reset cursor when leaving home mode
        canvas.style.cursor = "";
      };
    } else {
      // Other modes: larger crosshair for selecting points
      canvas.style.cursor = CROSSHAIR_DATA_URI;
    }
  }, [mode, styleVersion, map]);

  const value: PersonaModeContextValue = {
    mode,
    setMode,
  };

  return (
    <PersonaModeContext.Provider value={value}>
      {children}
    </PersonaModeContext.Provider>
  );
}
