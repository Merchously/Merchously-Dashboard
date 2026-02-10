"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href?: string }[] = [];

  if (segments[0] === "dashboard") {
    crumbs.push({ label: "Dashboard", href: "/dashboard" });

    if (segments[1] === "projects") {
      crumbs.push({ label: "Projects", href: "/dashboard/projects" });
      if (segments[2]) {
        crumbs.push({ label: "Project Detail" });
      }
    } else if (segments[1] === "escalations") {
      crumbs.push({ label: "Escalations", href: "/dashboard/escalations" });
      if (segments[2]) {
        crumbs.push({ label: "Escalation Detail" });
      }
    } else if (segments[1] === "agents") {
      crumbs.push({ label: "Agents" });
    } else if (segments[1] === "client") {
      crumbs.push({ label: "Client Detail" });
    }
  }

  return crumbs;
}

export function BreadcrumbHeader() {
  const pathname = usePathname();
  const crumbs = getBreadcrumbs(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <span key={i} className="contents">
                {i > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {isLast || !crumb.href ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={crumb.href}>
                      {crumb.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
