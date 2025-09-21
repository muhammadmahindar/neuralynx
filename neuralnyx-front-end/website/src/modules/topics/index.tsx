import { lazy } from "react";
import type { ModuleConfig } from "@/types/module";
import { Tag } from "lucide-react";

// Lazy load module pages
const TopicsPage = lazy(() => import("./pages/TopicsPage"));

export const topicsModule: ModuleConfig = {
  id: "topics",
  name: "Topics",
  description: "Topic management system",
  icon: Tag,
  enabled: true,
  basePath: "/dashboard",
  showInSidebar: true,
  groupInSidebar: false,
  routes: [
    {
      path: "topics",
      element: TopicsPage,
      label: "Topics",
      icon: Tag,
      showInSidebar: true,
    },
  ],
};
