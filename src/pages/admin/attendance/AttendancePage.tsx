import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecordAttendanceTab } from "./RecordAttendanceTab";
import { AttendanceStatsTab } from "./AttendanceStatsTab";

export function AttendancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
        <p className="text-muted-foreground mt-1">
          Record attendance for events and view member statistics.
        </p>
      </div>

      <Tabs defaultValue="record">
        <TabsList>
          <TabsTrigger value="record">Record Attendance</TabsTrigger>
          <TabsTrigger value="stats">Member Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="record">
          <RecordAttendanceTab />
        </TabsContent>

        <TabsContent value="stats">
          <AttendanceStatsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
