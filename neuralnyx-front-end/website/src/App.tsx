import { RouterProvider } from "react-router-dom";
import { router } from "@/routes";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { OnboardingWrapper } from "./components/OnboardingWrapper";
import { AuthProvider } from "./contexts/AuthContext";
import { DomainProvider } from "./contexts/DomainContext";
import { Toaster } from "@/components/ui/sonner";
import { StoreProvider } from "./contexts/StoreContext";

function App() {
  return (
    <AuthProvider>
      <DomainProvider>
        <StoreProvider>
        <ThemeProvider defaultTheme="system" storageKey="dashboard-theme">
          <OnboardingWrapper>
            <RouterProvider router={router} />
          </OnboardingWrapper>
          <Toaster />
          </ThemeProvider>
        </StoreProvider>
      </DomainProvider>
    </AuthProvider>
  );
}

export default App;
