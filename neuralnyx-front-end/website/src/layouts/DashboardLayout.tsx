import { Outlet, Link, useLocation } from "react-router-dom";
import { LogOut, Sun, Moon, Monitor, ChevronUp, User } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { moduleRegistry } from "@/modules";
import type { SidebarModuleItem } from "@/types/module";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDomain } from "@/contexts/DomainContext";

const moduleSidebarItems = moduleRegistry.getSidebarItems();

function AppSidebar() {
  const location = useLocation();
  const { domains, currentDomain, setCurrentDomain } = useDomain();
  const { setTheme, theme } = useTheme();
  const { user, signOut } = useAuth();

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    // Exact match for precise highlighting
    return location.pathname === path;
  };

  const isModuleActive = (moduleItem: SidebarModuleItem) => {
    // Check if current path matches any of the module's child routes exactly
    if (moduleItem.children) {
      return moduleItem.children.some((child: SidebarModuleItem) => {
        // Only consider it active if it's an exact match or if it has sub-paths (with trailing slash)
        return (
          location.pathname === child.path ||
          (child.path !== location.pathname &&
            location.pathname.startsWith(child.path + "/"))
        );
      });
    }
    return (
      location.pathname === moduleItem.path ||
      (moduleItem.path !== location.pathname &&
        location.pathname.startsWith(moduleItem.path + "/"))
    );
  };

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between h-auto">
              <div className="flex items-center gap-3">
                <Avatar className="size-6 rounded-sm">
                  <AvatarImage src="/api/placeholder/32/32" alt="User" />
                  <AvatarFallback className="bg-primary text-primary-foreground rounded-sm">
                    {(currentDomain?.domain ||
                      "Select Domain")[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <h2 className="font-semibold text-left">
                    {currentDomain?.domain || "Select Domain"}
                  </h2>
                </div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[58px]">
            <DropdownMenuLabel>Select Domain</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {domains.map((domain) => (
              <DropdownMenuItem
                key={domain.domain}
                onClick={() => setCurrentDomain(domain)}
              >
                <div className="flex flex-col items-start w-full">
                  <div className="flex items-center gap-2 w-full">
                    <span className="font-medium">{domain.domain}</span>
                    {currentDomain?.domain === domain?.domain && (
                      <div className="ml-auto">
                        <div className="h-2 w-2 bg-primary rounded-full" />
                      </div>
                    )}
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
            {domains.length === 0 && (
              <DropdownMenuItem disabled className="p-3">
                <span className="text-muted-foreground">
                  No domains available
                </span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {moduleSidebarItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                const moduleActive = isModuleActive(item);

                if (
                  item.isModuleGroup &&
                  item.children &&
                  item.children.length > 0
                ) {
                  // Render module group with collapsible children
                  return (
                    <SidebarMenuItem key={item.moduleId || item.path}>
                      <details className="group" open={moduleActive}>
                        <summary className="flex cursor-pointer items-center gap-2 px-2 py-2 text-sm font-medium rounded-md transition-colors text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                          {Icon && <Icon className="h-4 w-4" />}
                          <span>{item.title}</span>
                          <svg
                            className="ml-auto h-4 w-4 transition-transform group-open:rotate-90"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="m9 18 6-6-6-6"
                            />
                          </svg>
                        </summary>
                        <div className="mt-1 space-y-1 pl-2">
                          {item.children.map((child) => {
                            const ChildIcon = child.icon;
                            const childActive = isActive(child.path);

                            return (
                              <div key={child.path}>
                                <SidebarMenuButton
                                  asChild
                                  isActive={childActive}
                                  className="w-full justify-start"
                                >
                                  <Link
                                    to={child.path}
                                    className="flex items-center gap-2 px-2 py-1.5 text-sm"
                                  >
                                    {ChildIcon && (
                                      <ChildIcon className="h-4 w-4" />
                                    )}
                                    <span>{child.title}</span>
                                  </Link>
                                </SidebarMenuButton>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    </SidebarMenuItem>
                  );
                } else {
                  // Render individual item
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link to={item.path}>
                          {Icon && <Icon />}
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-fit flex w-fit">
                  <Avatar className="h-6 w-6">
                    <AvatarImage
                      src="/api/placeholder/32/32"
                      alt={user?.username || "User"}
                    />
                    <AvatarFallback>
                      {user?.username
                        ? user.username.charAt(0).toUpperCase()
                        : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start w-[160px]">
                    <span className="text-xs line-clamp-1">
                      {user?.username || "User"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {user?.email || "user@example.com"}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    to="/dashboard/profile"
                    className="flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Theme</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => setTheme("light")}
                  className="flex items-center gap-2"
                >
                  <Sun className="h-4 w-4" />
                  Light
                  {theme === "light" && (
                    <span className="ml-auto text-xs">✓</span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme("dark")}
                  className="flex items-center gap-2"
                >
                  <Moon className="h-4 w-4" />
                  Dark
                  {theme === "dark" && (
                    <span className="ml-auto text-xs">✓</span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme("system")}
                  className="flex items-center gap-2"
                >
                  <Monitor className="h-4 w-4" />
                  System
                  {theme === "system" && (
                    <span className="ml-auto text-xs">✓</span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      await signOut();
                    } catch (error) {
                      console.error("Logout failed:", error);
                    }
                  }}
                  className="flex items-center gap-2 text-red-600 focus:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export default function DashboardLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
