import type {
  ModuleRegistry,
  ModuleConfig,
  SidebarModuleItem,
} from "@/types/module";
import type { RouteObject } from "react-router-dom";
import { LazyWrapper } from "@/components/routing/LazyWrapper";

class ModuleRegistryClass {
  private modules: ModuleRegistry = {};

  register(module: ModuleConfig): void {
    this.modules[module.id] = module;
  }

  unregister(moduleId: string): void {
    delete this.modules[moduleId];
  }

  getModule(moduleId: string): ModuleConfig | undefined {
    return this.modules[moduleId];
  }

  getAllModules(): ModuleConfig[] {
    return Object.values(this.modules).filter((module) => module.enabled);
  }

  getEnabledModules(): ModuleConfig[] {
    return Object.values(this.modules).filter((module) => module.enabled);
  }

  generateRoutes(): RouteObject[] {
    const routes: RouteObject[] = [];

    this.getEnabledModules().forEach((module) => {
      const moduleRoutes = this.convertModuleRoutesToRouteObjects(module);
      routes.push(...moduleRoutes);
    });

    return routes;
  }

  private convertModuleRoutesToRouteObjects(
    module: ModuleConfig
  ): RouteObject[] {
    const routes: RouteObject[] = [];

    module.routes.forEach(({ element: Element, ...route }) => {
      const routeObject: RouteObject = {
        path: route.path,
        element: (
          <LazyWrapper>
            <Element />
          </LazyWrapper>
        ),
      };

      if (route.children && route.children.length > 0) {
        routeObject.children = route.children.map(
          ({ element: Element, ...child }) => ({
            path: child.path,
            element: (
              <LazyWrapper>
                <Element />
              </LazyWrapper>
            ),
          })
        );
      }

      routes.push(routeObject);
    });

    return routes;
  }

  getSidebarItems(): SidebarModuleItem[] {
    const items: SidebarModuleItem[] = [];

    this.getEnabledModules().forEach((module) => {
      if (module.showInSidebar === false) return;

      if (module.groupInSidebar) {
        // Group routes under module title
        const moduleRoutes = module.routes
          .filter((route) => route.showInSidebar !== false)
          .map((route) => ({
            title: route.label,
            path: `${module.basePath}/${route.path}`,
            icon: route.icon,
            children: route.children
              ?.filter((child) => child.showInSidebar !== false)
              .map((child) => ({
                title: child.label,
                path: `${module.basePath}/${route.path}/${child.path}`,
                icon: child.icon,
              })),
          }));

        if (moduleRoutes.length > 0) {
          items.push({
            title: module.name,
            path: `${module.basePath}/${module.routes[0]?.path || ""}`,
            icon: module.icon,
            children: moduleRoutes,
            isModuleGroup: true,
            moduleId: module.id,
          });
        }
      } else {
        // Show routes individually
        module.routes.forEach((route) => {
          if (route.showInSidebar === false) return;

          items.push({
            title: route.label,
            path: `${module.basePath}/${route.path}`,
            icon: route.icon,
            children: route.children
              ?.filter((child) => child.showInSidebar !== false)
              .map((child) => ({
                title: child.label,
                path: `${module.basePath}/${route.path}/${child.path}`,
                icon: child.icon,
              })),
          });
        });
      }
    });

    return items;
  }
}

export const moduleRegistry = new ModuleRegistryClass();
