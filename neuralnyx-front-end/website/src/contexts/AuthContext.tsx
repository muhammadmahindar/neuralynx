import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, API_ENDPOINTS } from "@/lib/api";
import type {
  User,
  AuthContextType,
  SignUpFormData,
  SignInFormData,
  AuthResponse,
  SignUpRequest,
  SignInRequest,
  RefreshTokenResponse,
} from "@/types/auth";
import { toast } from "sonner";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const storedUser = localStorage.getItem("user");

        if (token && storedUser) {
          // Check if token is expired
          const isExpired = isTokenExpired(token);

          if (isExpired) {
            // Try to refresh the token
            try {
              const { data: refreshResponse } =
                await api.post<RefreshTokenResponse>(
                  API_ENDPOINTS.AUTH.REFRESH,
                  {
                    refreshToken: localStorage.getItem("refreshToken"),
                  }
                );

              // Update tokens and user data
              localStorage.setItem("authToken", refreshResponse.accessToken);
              localStorage.setItem("idToken", refreshResponse.idToken);
              localStorage.setItem("tokenType", refreshResponse.tokenType);
              localStorage.setItem(
                "expiresIn",
                refreshResponse.expiresIn.toString()
              );
              localStorage.setItem(
                "user",
                JSON.stringify(refreshResponse.user)
              );

              setUser(refreshResponse.user);
            } catch (refreshError) {
              // Refresh failed, clear all data
              clearAuthData();
            }
          } else {
            // Token is still valid, use stored user data
            setUser(JSON.parse(storedUser));
          }
        }
      } catch (error) {
        // Any error during initialization, clear auth data
        clearAuthData();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Helper function to check if token is expired
  const isTokenExpired = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  };

  // Helper function to clear all auth data
  const clearAuthData = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("idToken");
    localStorage.removeItem("tokenType");
    localStorage.removeItem("expiresIn");
    localStorage.removeItem("user");
    localStorage.removeItem("onboardingComplete");
    localStorage.removeItem("onboardingData");
    setUser(null);
  };

  const signUp = async (data: SignUpFormData): Promise<void> => {
    try {
      setIsLoading(true);

      const signUpData: SignUpRequest = {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      };

      await api.post<AuthResponse>(API_ENDPOINTS.AUTH.SIGNUP, signUpData);

      // Show success toast
      toast.success("Account created successfully!", {
        description: "Please sign in to continue.",
      });

      // After successful signup, don't automatically sign in
      // User will need to sign in manually
      // This matches the requirement: "once sign up send to users to login"
    } catch (error: unknown) {
      console.error("Sign up error:", error);

      // Extract error message
      let errorMessage = "Failed to create account. Please try again.";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === "object" && "response" in error) {
        const apiError = error as {
          response?: { data?: { message?: string } };
        };
        errorMessage = apiError.response?.data?.message || errorMessage;
      }

      // Show error toast
      toast.error("Sign up failed", {
        description: errorMessage,
      });

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (data: SignInFormData): Promise<void> => {
    try {
      setIsLoading(true);

      const signInData: SignInRequest = {
        email: data.email,
        password: data.password,
      };

      const response = await api.post<AuthResponse>(
        API_ENDPOINTS.AUTH.LOGIN,
        signInData
      );

      // Store tokens using the actual API response structure
      localStorage.setItem("authToken", response.data.accessToken);
      localStorage.setItem("refreshToken", response.data.refreshToken);
      localStorage.setItem("idToken", response.data.idToken);
      localStorage.setItem("tokenType", response.data.tokenType);
      localStorage.setItem("expiresIn", response.data.expiresIn.toString());
      localStorage.setItem("user", JSON.stringify(response.data.user));

      // Set user
      setUser(response.data.user);

      // Show success toast
      toast.success("Welcome back!", {
        description: `Signed in as ${response.data.user.email}`,
      });
    } catch (error: unknown) {
      console.error("Sign in error:", error);

      // Extract error message
      let errorMessage = "Failed to sign in. Please check your credentials.";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === "object" && "response" in error) {
        const apiError = error as {
          response?: { data?: { message?: string } };
        };
        errorMessage = apiError.response?.data?.message || errorMessage;
      }

      // Show error toast
      toast.error("Sign in failed", {
        description: errorMessage,
      });

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = (): void => {
    // Clear all auth data
    clearAuthData();

    // Show sign out toast
    toast.success("Signed out successfully", {
      description: "You have been logged out of your account.",
    });

    // Optionally call logout endpoint
    try {
      api.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      // Ignore logout endpoint errors
      console.warn("Logout endpoint failed:", error);
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const userData = await api.get<User>(API_ENDPOINTS.AUTH.PROFILE);
      setUser(userData);
    } catch (error) {
      // If refresh fails, sign out
      signOut();
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    signUp,
    signIn,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
