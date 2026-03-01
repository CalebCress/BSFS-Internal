import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  TrendingUp,
  Users,
  GraduationCap,
  BookOpen,
  LogOut,
  ChevronRight,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const applicationSubItems = [
  { title: "Overview", path: "/applications" },
  { title: "Forms", path: "/applications/forms" },
  { title: "Applicants", path: "/applications/applicants" },
  { title: "Interviews", path: "/applications/interviews" },
  { title: "Reviews", path: "/applications/reviews" },
];

const stockSubItems = [
  { title: "All Stocks", path: "/stocks" },
  { title: "My Theses", path: "/stocks/my-theses" },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuthActions();
  const { profile, isBoardMember, isAlumni } = useCurrentProfile();
  const pendingSignUps = useQuery(api.profiles.listPendingSignUps);

  const isInApplications = location.pathname.startsWith("/applications");
  const isInStocks = location.pathname.startsWith("/stocks");
  const [applicationsOpen, setApplicationsOpen] = useState(isInApplications);
  const [stocksOpen, setStocksOpen] = useState(isInStocks);

  useEffect(() => {
    if (isInApplications) setApplicationsOpen(true);
  }, [isInApplications]);

  useEffect(() => {
    if (isInStocks) setStocksOpen(true);
  }, [isInStocks]);

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-4">
        <h2 className="text-lg font-semibold">BSFS Internal</h2>
        {profile && (
          <p className="text-xs text-muted-foreground">
            {profile.displayName}
          </p>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Dashboard (hidden from alumni) */}
              {!isAlumni && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={location.pathname === "/"}
                    onClick={() => navigate("/")}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Applications (hidden from alumni) */}
              {!isAlumni && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isInApplications}
                    onClick={() => setApplicationsOpen(!applicationsOpen)}
                  >
                    <ClipboardList className="h-4 w-4" />
                    <span>Applications</span>
                    <ChevronRight
                      className={`ml-auto h-4 w-4 transition-transform ${
                        applicationsOpen ? "rotate-90" : ""
                      }`}
                    />
                  </SidebarMenuButton>
                  {applicationsOpen && (
                    <SidebarMenuSub>
                      {applicationSubItems.map((item) => {
                        const isSubActive =
                          item.path === "/applications"
                            ? location.pathname === "/applications"
                            : location.pathname.startsWith(item.path);
                        return (
                          <SidebarMenuSubItem key={item.path}>
                            <SidebarMenuSubButton
                              isActive={isSubActive}
                              onClick={() => navigate(item.path)}
                            >
                              <span>{item.title}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              )}

              {/* Calendar (hidden from alumni) */}
              {!isAlumni && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={location.pathname.startsWith("/calendar")}
                    onClick={() => navigate("/calendar")}
                  >
                    <CalendarDays className="h-4 w-4" />
                    <span>Calendar</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Members */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname.startsWith("/members")}
                  onClick={() => navigate("/members")}
                >
                  <Users className="h-4 w-4" />
                  <span>Members</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Stocks (hidden from alumni) */}
              {!isAlumni && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isInStocks}
                    onClick={() => setStocksOpen(!stocksOpen)}
                  >
                    <TrendingUp className="h-4 w-4" />
                    <span>Stocks</span>
                    <ChevronRight
                      className={`ml-auto h-4 w-4 transition-transform ${
                        stocksOpen ? "rotate-90" : ""
                      }`}
                    />
                  </SidebarMenuButton>
                  {stocksOpen && (
                    <SidebarMenuSub>
                      {stockSubItems.map((item) => {
                        const isSubActive =
                          item.path === "/stocks"
                            ? location.pathname === "/stocks"
                            : location.pathname.startsWith(item.path);
                        return (
                          <SidebarMenuSubItem key={item.path}>
                            <SidebarMenuSubButton
                              isActive={isSubActive}
                              onClick={() => navigate(item.path)}
                            >
                              <span>{item.title}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              )}

              {/* Alumni Network */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname.startsWith("/alumni")}
                  onClick={() => navigate("/alumni")}
                >
                  <GraduationCap className="h-4 w-4" />
                  <span>Alumni Network</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Resources (hidden from alumni) */}
              {!isAlumni && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={location.pathname.startsWith("/resources")}
                    onClick={() => navigate("/resources")}
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>Resources</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {/* Admin Section (board members only) */}
        {isBoardMember && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={location.pathname === "/admin/approvals"}
                    onClick={() => navigate("/admin/approvals")}
                  >
                    <UserCheck className="h-4 w-4" />
                    <span>Member Approvals</span>
                    {(pendingSignUps?.length ?? 0) > 0 && (
                      <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                        {pendingSignUps!.length}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={location.pathname === "/admin/members"}
                    onClick={() => navigate("/admin/members")}
                  >
                    <UsersRound className="h-4 w-4" />
                    <span>Manage Members</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => void signOut()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
