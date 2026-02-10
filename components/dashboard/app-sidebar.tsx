"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  AlertTriangle,
  Bot,
  LogOut,
  ChevronsUpDown,
  Inbox,
  Truck,
  BarChart3,
  ScrollText,
  UserCheck,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { canSeeNavItem, ROLE_LABELS, type UserRole } from "@/lib/roles";

const allNavItems = [
  { key: "dashboard", title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { key: "projects", title: "Projects", url: "/dashboard/projects", icon: FolderKanban },
  { key: "escalations", title: "Escalations", url: "/dashboard/escalations", icon: AlertTriangle },
  { key: "agents", title: "Agents", url: "/dashboard/agents", icon: Bot },
  { key: "decisions", title: "Decisions", url: "/dashboard/decisions", icon: Inbox },
  { key: "delivery", title: "Delivery", url: "/dashboard/delivery", icon: Truck },
  { key: "metrics", title: "Metrics", url: "/dashboard/metrics", icon: BarChart3 },
  { key: "activity-log", title: "Activity Log", url: "/dashboard/activity-log", icon: ScrollText },
  { key: "user-approvals", title: "User Approvals", url: "/dashboard/user-approvals", icon: UserCheck },
];

interface UserInfo {
  displayName: string;
  role: UserRole;
  username: string;
}

export function AppSidebar() {
  const pathname = usePathname();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    // Read user info from JWT cookie (decoded client-side from a lightweight API)
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setUserInfo(data.user);
      })
      .catch(() => {});
  }, []);

  const role: UserRole = userInfo?.role || "FOUNDER";
  const displayName = userInfo?.displayName || "Admin";
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const visibleNavItems = allNavItems.filter((item) => canSeeNavItem(role, item.key));

  const isActive = (url: string) => {
    if (url === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(url);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <span className="font-bold text-lg">M</span>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold font-serif">
                    Merchously
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    Dashboard
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-muted">
                    <span className="text-sm font-semibold">{initials}</span>
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{displayName}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {ROLE_LABELS[role] || role}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <form action="/api/auth/logout" method="POST" className="w-full">
                    <button type="submit" className="flex w-full items-center gap-2">
                      <LogOut className="size-4" />
                      <span>Logout</span>
                    </button>
                  </form>
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
