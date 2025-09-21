import { useAuth as useAuthContext } from '@/contexts/AuthContext';

// Re-export the useAuth hook from context for convenience
export { useAuth } from '@/contexts/AuthContext';

// Additional auth-related hooks can be added here
export const useAuthActions = () => {
  const { signUp, signIn, signOut, refreshUser } = useAuthContext();
  
  return {
    signUp,
    signIn,
    signOut,
    refreshUser,
  };
};

export const useAuthState = () => {
  const { user, isAuthenticated, isLoading } = useAuthContext();
  
  return {
    user,
    isAuthenticated,
    isLoading,
  };
};
