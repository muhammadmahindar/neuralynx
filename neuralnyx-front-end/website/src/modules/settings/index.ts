import { lazy } from "react";
import type { ModuleConfig } from "@/types/module";
import { Settings } from "lucide-react";

// Lazy load module pages
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

export const settingsModule: ModuleConfig = {
  id: "settings",
  name: "Settings",
  description: "Manage your account and domain settings",
  icon: Settings,
  enabled: true,
  basePath: "/dashboard",
  showInSidebar: true,
  groupInSidebar: false,
  routes: [
    {
      path: "settings",
      element: SettingsPage,
      label: "Settings",
      icon: Settings,
      showInSidebar: true,
    },
  ],
};
