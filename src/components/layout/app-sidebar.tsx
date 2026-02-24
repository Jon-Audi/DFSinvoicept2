
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarRail, // Added SidebarRail import
} from "@/components/ui/sidebar";
import { Icon, type IconName } from "@/components/icons";
import { NAV_ITEMS } from "@/lib/constants";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarRail /> {/* Added SidebarRail component */}
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors">
            <Icon name="PanelsTopLeft" className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold text-base group-data-[collapsible=icon]:hidden font-headline tracking-tight">
            DFS Invoicing
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {NAV_ITEMS.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href)}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <Icon name={item.icon as IconName} />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenuButton asChild tooltip="Settings">
          <Link href="/settings">
            <Icon name="Settings" />
            <span>Settings</span>
          </Link>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
