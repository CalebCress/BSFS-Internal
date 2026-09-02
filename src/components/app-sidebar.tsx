import { useState, useEffect } from "react";
import {
  ClipboardList,
  CalendarDays,
  TrendingUp,
  Users,
  GraduationCap,
  BookOpen,
  Briefcase,
  LogOut,
  ChevronRight,
  UserCheck,
  UsersRound,
  ClipboardCheck,
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

const careerSubItems = [
  { title: "CV Review", path: "/careers/cv-review" },
  { title: "Reviews To Do", path: "/careers/review-queue", cvReviewerOnly: true },
  { title: "Internship Tracker", path: "/careers/internship-tracker" },
];

const resourceSubItems = [
  { title: "Market & Corporate", path: "/resources/market-corporate" },
  { title: "Workshops", path: "/resources/workshops" },
  { title: "Regional Reports", path: "/resources/regional-reports" },
  { title: "Special Reports", path: "/resources/special-reports" },
  { title: "Interview Prep", path: "/resources/interview-prep" },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuthActions();
  const { profile, hasAdminAccess, canRecordAttendance, isCvReviewer, isAlumni } = useCurrentProfile();
  const pendingSignUps = useQuery(api.profiles.listPendingSignUps);

  const isInApplications = location.pathname.startsWith("/applications");
  const isInStocks = location.pathname.startsWith("/stocks");
  const isInResources = location.pathname.startsWith("/resources");
  const isInCareers = location.pathname.startsWith("/careers");
  const [applicationsOpen, setApplicationsOpen] = useState(isInApplications);
  const [stocksOpen, setStocksOpen] = useState(isInStocks);
  const [resourcesOpen, setResourcesOpen] = useState(isInResources);
  const [careersOpen, setCareersOpen] = useState(isInCareers);

  useEffect(() => {
    if (isInApplications) setApplicationsOpen(true);
  }, [isInApplications]);

  useEffect(() => {
    if (isInStocks) setStocksOpen(true);
  }, [isInStocks]);

  useEffect(() => {
    if (isInResources) setResourcesOpen(true);
  }, [isInResources]);

  useEffect(() => {
    if (isInCareers) setCareersOpen(true);
  }, [isInCareers]);

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-4 border-l-4 border-l-bsfs-blue">
        <h2 className="text-lg font-semibold text-bsfs-blue">BSFS Internal</h2>
        {profile && (
          <button
            type="button"
            onClick={() => navigate(`/members/${profile.userId}`)}
            className="text-left text-xs text-muted-foreground hover:text-bsfs-blue hover:underline"
          >
            {profile.displayName}
          </button>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
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
                  <span>Alumni</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Resources */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isInResources}
                  onClick={() => setResourcesOpen(!resourcesOpen)}
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Resources</span>
                  <ChevronRight
                    className={`ml-auto h-4 w-4 transition-transform ${
                      resourcesOpen ? "rotate-90" : ""
                    }`}
                  />
                </SidebarMenuButton>
                {resourcesOpen && (
                  <SidebarMenuSub>
                    {resourceSubItems.map((item) => (
                      <SidebarMenuSubItem key={item.path}>
                        <SidebarMenuSubButton
                          isActive={location.pathname === item.path}
                          onClick={() => navigate(item.path)}
                        >
                          <span>{item.title}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* Careers (hidden from alumni) */}
              {!isAlumni && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isInCareers}
                    onClick={() => setCareersOpen(!careersOpen)}
                  >
                    <Briefcase className="h-4 w-4" />
                    <span>Careers</span>
                    <ChevronRight
                      className={`ml-auto h-4 w-4 transition-transform ${
                        careersOpen ? "rotate-90" : ""
                      }`}
                    />
                  </SidebarMenuButton>
                  {careersOpen && (
                    <SidebarMenuSub>
                      {careerSubItems
                        .filter((item) => !item.cvReviewerOnly || isCvReviewer)
                        .map((item) => (
                          <SidebarMenuSubItem key={item.path}>
                            <SidebarMenuSubButton
                              isActive={location.pathname === item.path}
                              onClick={() => navigate(item.path)}
                            >
                              <span>{item.title}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {/* Admin Section */}
        {(hasAdminAccess || canRecordAttendance) && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {hasAdminAccess && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={location.pathname === "/admin/approvals"}
                        onClick={() => navigate("/admin/approvals")}
                      >
                        <UserCheck className="h-4 w-4" />
                        <span>Member Approvals</span>
                        {(pendingSignUps?.length ?? 0) > 0 && (
                          <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-bsfs-red px-1.5 text-[10px] font-semibold text-white">
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
                  </>
                )}
                {canRecordAttendance && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={location.pathname === "/admin/attendance"}
                      onClick={() => navigate("/admin/attendance")}
                    >
                      <ClipboardCheck className="h-4 w-4" />
                      <span>Attendance</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
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
