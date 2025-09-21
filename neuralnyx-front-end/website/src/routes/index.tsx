import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { LazyWrapper } from "@/components/routing/LazyWrapper";
import { initializeModules, moduleRegistry } from "@/modules";
import { ProtectedRoute } from "@/components/auth";

// Initialize modules
initializeModules();

// Lazy load components
const DashboardLayout = lazy(() => import("@/layouts/DashboardLayout"));

// Generate module routes
const moduleRoutes = moduleRegistry.generateRoutes();
// Route configuration
export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: "/dashboard",
    element: (
      <LazyWrapper>
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      </LazyWrapper>
    ),
    children: moduleRoutes,
  },
  // Catch all route for 404
  {
    path: "*",
    element: (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
            404
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Page not found
          </p>
        </div>
      </div>
    ),
  },
]);
