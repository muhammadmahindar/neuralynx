import { lazy } from "react";
import type { ModuleConfig } from "@/types/module";
import { Share2 } from "lucide-react";

// Lazy load module pages
const SocialToolsPage = lazy(() => import("./pages/SocialToolsPage"));

export const socialModule: ModuleConfig = {
    id: "social",
    name: "Social",
    description: "AI-powered social media content generation tools",
    icon: Share2,
    enabled: true,
    basePath: "/dashboard",
    showInSidebar: true,
    groupInSidebar: false,
    routes: [
        {
            path: "social",
            element: SocialToolsPage,
            label: "Social",
            icon: Share2,
            showInSidebar: true,
        },
    ],
};
