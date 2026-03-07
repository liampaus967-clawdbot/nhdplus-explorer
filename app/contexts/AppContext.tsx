"use client";

import { ReactNode } from 'react';
import { MapProvider } from './MapContext';
import { RouteProvider } from './RouteContext';
import { PersonaModeProvider } from './PersonaModeContext';
import { WeatherProvider } from './WeatherContext';
import { LakeProvider } from './LakeContext';
import { GaugeProvider } from './GaugeContext';

interface AppProviderProps {
  children: ReactNode;
}

/**
 * AppProvider combines all context providers in the correct order.
 * The order matters because some providers depend on others:
 * - MapProvider must be first (provides map instance)
 * - RouteProvider depends on MapProvider
 * - WeatherProvider depends on MapProvider
 * - LakeProvider depends on MapProvider
 * - GaugeProvider depends on MapProvider
 * - PersonaModeProvider depends on MapProvider
 */
export function AppProvider({ children }: AppProviderProps) {
  return (
    <MapProvider>
      <RouteProvider>
        <LakeProvider>
          <GaugeProvider>
            <WeatherProvider>
              <PersonaModeProvider>
                {children}
              </PersonaModeProvider>
            </WeatherProvider>
          </GaugeProvider>
        </LakeProvider>
      </RouteProvider>
    </MapProvider>
  );
}
