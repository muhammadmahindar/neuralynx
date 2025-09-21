import { lazy } from "react";
import type { ModuleConfig } from "@/types/module";
import { Clipboard } from "lucide-react";

// Lazy load module pages
const ContentList = lazy(() => import("./pages/ContentList"));
const ContentDetails = lazy(() => import("./pages/ContentDetails"));

export const contentModule: ModuleConfig = {
  id: "content",
  name: "Content",
  description: "Content management system",
  icon: Clipboard,
  enabled: true,
  basePath: "/dashboard",
  showInSidebar: true,
  groupInSidebar: false,
  routes: [
    {
      path: "content",
      element: ContentList,
      label: "Content",
      icon: Clipboard,
      showInSidebar: true,
    },
    {
      path: "content/:id",
      element: ContentDetails,
      label: "Content Details",
      icon: Clipboard,
      showInSidebar: false,
    },
  ],
};
