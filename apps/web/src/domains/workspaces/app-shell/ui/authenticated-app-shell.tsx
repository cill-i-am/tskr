import { WorkspaceRecoveryNotice } from "@/domains/workspaces/active-workspace/ui/workspace-recovery-notice"
import { WorkspaceSwitcher } from "@/domains/workspaces/active-workspace/ui/workspace-switcher"
import { useWorkspaceBootstrap } from "@/domains/workspaces/bootstrap/ui/use-workspace-bootstrap"
import { Link, useRouterState } from "@tanstack/react-router"
import { LayoutDashboardIcon, Settings2Icon } from "lucide-react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { Separator } from "@workspace/ui/components/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"

const AuthenticatedAppShell = ({ children }: { children: React.ReactNode }) => {
  const { activeWorkspace, recoveryState } = useWorkspaceBootstrap()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isSettingsRoute = pathname.startsWith("/app/settings")

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader className="gap-1 px-2 py-3">
          <p className="text-xs tracking-[0.18em] text-sidebar-foreground/70 uppercase">
            TSKR
          </p>
          <WorkspaceSwitcher />
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigate</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={pathname === "/app"}
                    render={<Link to="/app" />}
                    tooltip="Overview"
                  >
                    <LayoutDashboardIcon />
                    <span>Overview</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isSettingsRoute}
                    render={<Link to="/app/settings" />}
                    tooltip="Settings"
                  >
                    <Settings2Icon />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="px-2 py-3 text-xs text-sidebar-foreground/70">
          Product shell scaffold for workspace routes.
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="gap-3 px-4 py-3 md:px-6 flex items-center justify-between border-b">
          <div className="gap-3 min-w-0 flex items-center">
            <SidebarTrigger />
            <Separator className="h-4" orientation="vertical" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink render={<Link to="/app" />}>
                    Workspaces
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {activeWorkspace?.name ?? "Workspace"}
                  </BreadcrumbPage>
                </BreadcrumbItem>
                {isSettingsRoute ? (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Settings</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                ) : null}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <main className="gap-4 p-4 md:p-6 flex flex-col">
          <WorkspaceRecoveryNotice
            activeWorkspaceName={activeWorkspace?.name ?? null}
            recoveryState={recoveryState}
          />
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export { AuthenticatedAppShell }
