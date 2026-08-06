import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getMeContext } from '../data/api';
import { storeToday } from '../lib/format';

interface StoreState {
  storeId?: string;
  storeName: string;
  timezone: string;
  operatorName: string;
  role?: string;
  canEnablePromotion: boolean;
  today: string;
}

const fallbackTimezone = process.env.EXPO_PUBLIC_STORE_TIMEZONE ?? 'America/Fortaleza';
const fallback: StoreState = {
  storeId: process.env.EXPO_PUBLIC_STORE_ID,
  storeName: 'Loja ativa', operatorName: 'Operador', timezone: fallbackTimezone,
  canEnablePromotion: process.env.EXPO_PUBLIC_CAN_ENABLE_PROMOTION === 'true',
  today: storeToday(fallbackTimezone),
};

const StoreContext = createContext<StoreState>(fallback);

export function StoreProvider({ children }: React.PropsWithChildren) {
  const [state, setState] = useState(fallback);
  useEffect(() => {
    let active = true;
    getMeContext().then((context) => {
      const memberships = context.companies.flatMap((company) => company.stores.map((store) => ({ ...store, role: company.role })));
      const store = memberships.find((item) => item.id === process.env.EXPO_PUBLIC_STORE_ID) ?? memberships[0];
      if (!active || !store) return;
      setState({
        storeId: store.id, storeName: store.name, timezone: store.timezone,
        operatorName: context.user.displayName, role: store.role,
        canEnablePromotion: process.env.EXPO_PUBLIC_CAN_ENABLE_PROMOTION === 'true'
          || store.role === 'COMPANY_ADMIN' || store.role === 'STORE_MANAGER',
        today: storeToday(store.timezone),
      });
    }).catch(() => { /* O contexto local mantém o aplicativo utilizável offline. */ });
    return () => { active = false; };
  }, []);
  return <StoreContext.Provider value={useMemo(() => state, [state])}>{children}</StoreContext.Provider>;
}

export function useStore() { return useContext(StoreContext); }
