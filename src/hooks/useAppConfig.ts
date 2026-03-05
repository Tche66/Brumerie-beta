// src/hooks/useAppConfig.ts
import { useState, useEffect } from 'react';
import { subscribeAppConfig, AppConfig, DEFAULT_CONFIG } from '@/services/appConfigService';

export function useAppConfig(): AppConfig {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    const unsub = subscribeAppConfig(setConfig);
    return unsub;
  }, []);

  return config;
}
