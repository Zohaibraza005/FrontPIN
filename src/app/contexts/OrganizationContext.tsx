import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { organizationAPI } from '../services/api';
import { useAuth } from './AuthContext';

interface OrganizationContextType {
  organizationTitle: string;
  setOrganizationTitle: (title: string) => void;
  updateOrganizationTitle: (title: string) => void;
  revertOrganizationTitle: () => void;
  fetchOrganizationProfile: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [savedTitle, setSavedTitle] = useState<string>(() => {
    return localStorage.getItem('organizationTitle') || '';
  });
  const [organizationTitle, setOrganizationTitle] = useState<string>(() => {
    return localStorage.getItem('organizationTitle') || '';
  });

  const savedTitleRef = useRef(savedTitle);
  savedTitleRef.current = savedTitle;

  const fetchOrganizationProfile = useCallback(async () => {
    try {
      const res = await organizationAPI.getProfile();
      if (res && res.name !== undefined) {
        const title = res.name || '';
        setSavedTitle(title);
        setOrganizationTitle(title);
        if (title) {
          localStorage.setItem('organizationTitle', title);
        } else {
          localStorage.removeItem('organizationTitle');
        }
      }
    } catch (err) {
      console.warn('Failed to load organization profile:', err);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrganizationProfile();
    } else {
      setSavedTitle('');
      setOrganizationTitle('');
      localStorage.removeItem('organizationTitle');
    }
  }, [isAuthenticated, fetchOrganizationProfile]);

  // Permanently save the new title (persisted to state & localStorage)
  const updateOrganizationTitle = (newTitle: string) => {
    const titleVal = (newTitle || '').trim();
    setSavedTitle(titleVal);
    setOrganizationTitle(titleVal);
    if (titleVal) {
      localStorage.setItem('organizationTitle', titleVal);
    } else {
      localStorage.removeItem('organizationTitle');
    }
  };

  // Revert back to persisted saved title (e.g. Cancel button clicked)
  const revertOrganizationTitle = () => {
    setOrganizationTitle(savedTitleRef.current);
  };

  return (
    <OrganizationContext.Provider
      value={{
        organizationTitle,
        setOrganizationTitle,
        updateOrganizationTitle,
        revertOrganizationTitle,
        fetchOrganizationProfile,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};
