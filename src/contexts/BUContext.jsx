import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import BusinessUnitsService from '../services/BusinessUnits.js';
import { getStoredRole } from '../lib/session.js';

const BUContext = createContext({
  activeBuId: '',
  setActiveBuId: () => {},
  allBus: [],
  activeBu: null,
});

export const BUProvider = ({ children }) => {
  const role = getStoredRole();
  const isAdmin = role === 'COMPANY_ADMIN' || role === 'SUPER_ADMIN';

  const [allBus, setAllBus]               = useState([]);
  const [activeBuId, setActiveBuIdState]  = useState(() => localStorage.getItem('activeBuId') || '');

  useEffect(() => {
    if (!isAdmin) return;
    BusinessUnitsService.getAll()
      .then((res) => {
        if (!res?.success) return;
        const bus = res.data || [];
        setAllBus(bus);
        // Default to first BU if nothing is stored yet
        const stored = localStorage.getItem('activeBuId');
        if (!stored && bus.length > 0) {
          const first = String(bus[0]._id);
          localStorage.setItem('activeBuId', first);
          setActiveBuIdState(first);
        }
      })
      .catch(() => {});
  }, [isAdmin]);

  const setActiveBuId = useCallback((id) => {
    localStorage.setItem('activeBuId', id);
    setActiveBuIdState(id);
  }, []);

  const activeBu = allBus.find((b) => String(b._id) === activeBuId) || null;

  return (
    <BUContext.Provider value={{ activeBuId, setActiveBuId, allBus, activeBu }}>
      {children}
    </BUContext.Provider>
  );
};

export const useBU = () => useContext(BUContext);
