import React, { createContext, useContext, useState, useEffect } from "react";
import { api, API_ENDPOINTS } from "@/lib/api";
import type { Domain, DomainsResponse } from "@/types/onboarding";

interface DomainContextType {
  domains: Domain[];
  currentDomain: Domain | null;
  setCurrentDomain: (domain: Domain | null) => void;
  refreshDomains: () => Promise<void>;
  isLoading: boolean;
}

const DomainContext = createContext<DomainContextType | undefined>(undefined);

export function DomainProvider({ children }: { children: React.ReactNode }) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [currentDomain, setCurrentDomain] = useState<Domain | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshDomains = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<DomainsResponse>(
        API_ENDPOINTS.DOMAINS.LIST
      );
      const domainsData = response.data || [];
      setDomains(domainsData);
      const localCurrentDomain = localStorage.getItem("currentDomain");
      if (localCurrentDomain) {
        setCurrentDomain(JSON.parse(localCurrentDomain));
      } else {
        setCurrentDomain(domainsData[0]);
      }
    } catch (error) {
      console.error("Error fetching domains:", error);
      setDomains([]);
    } finally {
      setIsLoading(false);
    }
  };

  const addDomain = async (domain: string) => {
    const response = await api.post(API_ENDPOINTS.DOMAINS.CREATE, { domain: domain });
    setDomains([...domains, response.data.domain]);
  };

  // Load domains on mount
  useEffect(() => {
    refreshDomains();
  }, []);

  const value = {
    domains,
    currentDomain,
    setCurrentDomain: (domain: Domain | null) => {
      setCurrentDomain(domain);
      localStorage.setItem("currentDomain", JSON.stringify(domain));
    },
    refreshDomains,
    isLoading,
    addDomain,
  };

  return (
    <DomainContext.Provider value={value}>{children}</DomainContext.Provider>
  );
}

export function useDomain() {
  const context = useContext(DomainContext);
  if (context === undefined) {
    throw new Error("useDomain must be used within a DomainProvider");
  }
  return context;
}
