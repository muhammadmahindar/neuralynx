import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDomain } from "@/contexts/DomainContext";
import OnboardingForm from "@/modules/onboarding/components/onboarding-form";

interface OnboardingWrapperProps {
  children: React.ReactNode;
}

export function OnboardingWrapper({ children }: OnboardingWrapperProps) {
  const { user } = useAuth();
  const { domains, isLoading: domainsLoading } = useDomain();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

  useEffect(() => {
    if (user && !domainsLoading) {
      const hasDomains = domains && domains.length > 0;
      setIsOnboardingComplete(hasDomains);

      // Update localStorage to reflect current state
      if (hasDomains) {
        localStorage.setItem("onboardingComplete", "true");
      } else {
        localStorage.removeItem("onboardingComplete");
        localStorage.removeItem("onboardingData");
      }
    }
  }, [user, domains, domainsLoading]);

  if (domainsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is not authenticated, show children (login page)
  if (!user) {
    return <>{children}</>;
  }

  // If onboarding is not complete, show onboarding
  if (!isOnboardingComplete) {
    return <OnboardingForm />;
  }

  // If onboarding is complete, show dashboard
  return <>{children}</>;
}
