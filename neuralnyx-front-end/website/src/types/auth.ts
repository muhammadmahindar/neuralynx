// Authentication types
export interface User {
  email: string;
  sub: string;
  username: string;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
  idToken: string;
  refreshToken: string;
  tokenType: string;
}

export interface AuthResponse {
  data: {
    accessToken: string;
    expiresIn: number;
    idToken: string;
    refreshToken: string;
    tokenType: string;
    user: User;
  };
}

// Sign up form data
export interface SignUpFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

// Sign in form data
export interface SignInFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

// Auth context type
export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signUp: (data: SignUpFormData) => Promise<void>;
  signIn: (data: SignInFormData) => Promise<void>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
}

// API request types
export interface SignUpRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  data: {
    accessToken: string;
    expiresIn: number;
    idToken: string;
    tokenType: string;
    user: User;
  };
}
