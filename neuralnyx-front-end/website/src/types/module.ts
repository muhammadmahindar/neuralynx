import type { ComponentType } from "react";

export interface ModuleRoute {
  path: string;
  element: ComponentType;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  showInSidebar?: boolean;
  children?: ModuleRoute[];
}

export interface ModuleConfig {
  id: string;
  name: string;
  description: string;
  icon?: ComponentType<{ className?: string }>;
  routes: ModuleRoute[];
  basePath: string;
  enabled: boolean;
  showInSidebar?: boolean;
  groupInSidebar?: boolean;
}

export interface ModuleRegistry {
  [moduleId: string]: ModuleConfig;
}

export interface SidebarModuleItem {
  title: string;
  path: string;
  icon?: ComponentType<{ className?: string }>;
  children?: SidebarModuleItem[];
  isModuleGroup?: boolean;
  moduleId?: string;
}
