import axios, { type AxiosInstance, type AxiosResponse } from "axios";
import type { TopicsResponse, TopicResponse } from "@/types/content";

// Get the API base URL from environment variables
const API_BASE_URL =
  import.meta.env.VITE_PUBLIC_API_URL || "http://localhost:3000";

// Create axios instance with default configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000000, // 10 seconds timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// Common API response types
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Generic error type
export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

// API endpoints configuration
export const API_ENDPOINTS = {
  GENERATE: "/keywords",
  GENERATE_CONTENT: "/bedrock-agent",
  // Topics endpoints
  TOPICS: {
    LIST: "/topics",
    CREATE: "/topics",
    DELETE: (topic: string) => `/topics/${topic}`,
    UPDATE: (domain: string, id: string) => `/topics/${domain}/${id}`,
    DELETE_BY_DOMAIN: (domain: string, id: string) => `/topics/${domain}/${id}`,
  },

  // Auth endpoints
  AUTH: {
    LOGIN: "/auth/login",
    SIGNUP: "/auth/signup",
    REFRESH: "/auth/refresh",
    LOGOUT: "/auth/logout",
    PROFILE: "/auth/profile",
  },

  // User endpoints
  USERS: {
    BASE: "/users",
    PROFILE: "/users/profile",
    UPDATE_PROFILE: "/users/profile",
  },

  // Onboarding endpoints
  ONBOARDING: {
    SUBMIT: "/onboarding",
    GET_STATUS: "/onboarding/status",
    GENERATE_SUMMARY: "/onboarding/generate-summary",
    GENERATE_INSIGHTS: "/onboarding/generate-insights",
    GENERATE_TOPICS: "/onboarding/generate-topics",
  },

  // Domains endpoints
  DOMAINS: {
    LIST: "/domains",
    CREATE: "/domains",
    DELETE: (domain: string) => `/domains/${domain}`,
  },

  // Content endpoints
  CONTENT: {
    BASE: "/content",
    LIST: "/content/list",
    GENERATE: "/content/generate",
    ANALYZE: "/content/analyze",
    OPTIMIZE: "/content/optimize",
  },

  // Analytics endpoints
  ANALYTICS: {
    OVERVIEW: "/analytics/overview",
    REPORTS: "/analytics/reports",
  },
} as const;

// Token management utilities
const TOKEN_KEY = "authToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const ID_TOKEN_KEY = "idToken";
const TOKEN_TYPE_KEY = "tokenType";
const EXPIRES_IN_KEY = "expiresIn";

const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

const setTokens = (
  accessToken: string,
  refreshToken?: string,
  idToken?: string,
  tokenType?: string,
  expiresIn?: number
): void => {
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  if (idToken) {
    localStorage.setItem(ID_TOKEN_KEY, idToken);
  }
  if (tokenType) {
    localStorage.setItem(TOKEN_TYPE_KEY, tokenType);
  }
  if (expiresIn) {
    localStorage.setItem(EXPIRES_IN_KEY, expiresIn.toString());
  }
};

const clearTokens = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ID_TOKEN_KEY);
  localStorage.removeItem(TOKEN_TYPE_KEY);
  localStorage.removeItem(EXPIRES_IN_KEY);
};

// Check if token is expired
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch {
    return true; // If we can't parse the token, consider it expired
  }
};

// Refresh token function
const refreshAuthToken = async (): Promise<string | null> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken,
    });

    const { accessToken, idToken, tokenType, expiresIn, user } = response.data;

    // Update tokens (note: refresh token is not returned in the response)
    setTokens(accessToken, refreshToken, idToken, tokenType, expiresIn);

    // Update user data if provided
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }

    return accessToken;
  } catch {
    // If refresh fails, clear all tokens and user data
    clearTokens();
    localStorage.removeItem("user");
    return null;
  }
};

// Request interceptor to add auth token and handle token refresh
apiClient.interceptors.request.use(
  async (config) => {
    let token = getToken();

    // Check if token exists and is not expired
    if (token && isTokenExpired(token)) {
      // Try to refresh the token
      const newToken = await refreshAuthToken();
      token = newToken;
    }

    // Add token to request if available
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors with token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAuthToken();
        if (newToken) {
          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        clearTokens();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    // Handle other common errors
    if (error.response?.status === 403) {
      console.error("Access denied");
    }

    if (error.response?.status >= 500) {
      console.error("Server error occurred");
    }

    return Promise.reject(error);
  }
);

// Simplified API client with common methods
export const api = {
  // Generic CRUD operations
  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    const response = await apiClient.get<T>(endpoint, { params });
    return response.data;
  },

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await apiClient.post<T>(endpoint, data);
    return response.data;
  },

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await apiClient.put<T>(endpoint, data);
    return response.data;
  },

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await apiClient.patch<T>(endpoint, data);
    return response.data;
  },

  async delete<T>(endpoint: string): Promise<T> {
    const response = await apiClient.delete<T>(endpoint);
    return response.data;
  },

  // File upload
  async uploadFile<T>(
    endpoint: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<T>(endpoint, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(progress);
        }
      },
    });

    return response.data;
  },

  // Paginated requests
  async getPaginated<T>(
    endpoint: string,
    page: number = 1,
    limit: number = 10,
    params?: Record<string, unknown>
  ): Promise<PaginatedResponse<T>> {
    const response = await apiClient.get<PaginatedResponse<T>>(endpoint, {
      params: { page, limit, ...params },
    });
    return response.data;
  },

  // Topics specific API functions
  topics: {
    // Get topics by domain
    async getByDomain(): Promise<TopicsResponse> {
      return api.get<TopicsResponse>(API_ENDPOINTS.TOPICS.LIST);
    },

    // Update a topic
    async update(
      domain: string,
      id: string,
      value: string
    ): Promise<TopicResponse> {
      return api.put<TopicResponse>(API_ENDPOINTS.TOPICS.UPDATE(domain, id), {
        value,
      });
    },

    // Delete a topic
    async delete(domain: string, id: string): Promise<ApiResponse> {
      return api.delete<ApiResponse>(
        API_ENDPOINTS.TOPICS.DELETE_BY_DOMAIN(domain, id)
      );
    },

    // Create a new topic
    async create(domain: string, value: string): Promise<TopicResponse> {
      return api.post<TopicResponse>(API_ENDPOINTS.TOPICS.CREATE, {
        id: new Date().getTime().toString(),
        domain,
        value,
      });
    },
  },
};

// Export the axios instance for custom configurations
export { apiClient };

// Export the base URL for reference
export { API_BASE_URL };
