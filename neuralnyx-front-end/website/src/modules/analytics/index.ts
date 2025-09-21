import { lazy } from "react";
import type { ModuleConfig } from "@/types/module";
import { BarChart3, FileBarChart } from "lucide-react";

// Lazy load module pages
const AnalyticsOverview = lazy(() => import("./pages/AnalyticsOverview"));
const AnalyticsReports = lazy(() => import("./pages/AnalyticsReports"));

export const analyticsModule: ModuleConfig = {
  id: "analytics",
  name: "Analytics",
  description: "Comprehensive analytics and reporting tools",
  icon: BarChart3,
  enabled: true,
  basePath: "/dashboard",
  showInSidebar: true,
  groupInSidebar: true,
  routes: [
    {
      path: "analytics",
      element: AnalyticsOverview,
      label: "Overview",
      icon: BarChart3,
      showInSidebar: true,
    },
    {
      path: "analytics/reports",
      element: AnalyticsReports,
      label: "Reports",
      icon: FileBarChart,
      showInSidebar: true,
    },
  ],
};
