import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { SignInForm, SignUpForm } from "./";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/layouts/AuthLayout";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const navigate = useNavigate();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Show auth component if not authenticated
  if (!isAuthenticated) {
    return (
      <AuthLayout
        title={authMode === "signin" ? "Welcome Back" : "Create Account"}
        description={
          authMode === "signin"
            ? "Enter your credentials to sign in to your account"
            : "Enter your information to create your account"
        }
      >
        {authMode === "signin" ? (
          <SignInForm
            onSuccess={() => navigate("/dashboard")}
            onSwitchToSignUp={() => setAuthMode("signup")}
          />
        ) : (
          <SignUpForm
            onSuccess={() => setAuthMode("signin")}
            onSwitchToSignIn={() => setAuthMode("signin")}
          />
        )}
      </AuthLayout>
    );
  }

  // Render protected content
  return <>{children}</>;
};
