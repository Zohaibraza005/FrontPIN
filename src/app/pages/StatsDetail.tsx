import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { dashboardAPI } from "../services/api";
import { useNavigate, useParams, useSearchParams } from "react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Button } from "../components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../components/ui/sheet"; // Shadcn Sheet
import { ArrowLeft, Eye, Clock, Coffee, PlayCircle } from "lucide-react";
import { format } from "date-fns"; // ya moment bhi chalega
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";


export const StatsDetails: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Sheet state
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const location = searchParams.get("location") || "ALL";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await dashboardAPI.getStatsDetails(category, date, location);
        setData(response.list || []);
      } catch (err) {
        console.error("Stats details load error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (category) {
      fetchData();
    }
  }, [category, date, location]);

  const getTitle = (cat?: string) => {
    if (!cat) return "Details";
    return cat
      .split("-")
      .map((word) => word.charAt(0)?.toUpperCase() + word.slice(1))
      .join(" ");
  };

  
  const isTaskCategory = category?.includes('task');
  const isProjectCategory = category?.includes('project');
  const isAttendanceCategory = !isTaskCategory && !isProjectCategory; // default to attendance/employees

  const handleViewClick = (employee: any) => {
    setSelectedEmployee(employee);
    setSheetOpen(true);
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return "—";
    return format(new Date(isoString), "hh:mm a");
  };

  const calculateDuration = (start: string, end: string | null) => {
    if (!end) return "Ongoing";
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.floor(diff / 1000 / 60);
    return mins > 0 ? `${mins} min` : "<1 min";
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{getTitle(category)}</h1>
          <p className="text-gray-600">
            Detailed view for {date} ({location === "ALL" ? "All Locations" : `Location ID: ${location}`})
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>List View</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-gray-500">Loading...</p>
          ) : data.length === 0 ? (
            <p className="text-center text-gray-500">No records found</p>
          ) : (
            <div className="rounded-md border">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name / Title</TableHead>
                    <TableHead>Status</TableHead>
                    {isTaskCategory && (
                      <>
                        <TableHead>Priority</TableHead>
                        <TableHead>Deadline</TableHead>
                      </>
                    )}
                    {isProjectCategory && (
                      <>
                        <TableHead>Progress</TableHead>
                        
                      </>
                    )}
                    {isAttendanceCategory && (
                      <>
                        <TableHead>Clock In</TableHead>
                        <TableHead>Clock Out</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name || item.title || "N/A"}</TableCell>
                      <TableCell>{item.status || "N/A"}</TableCell>
                      {isTaskCategory && (
                        <>
                          <TableCell>{item.priority || "N/A"}</TableCell>
                          <TableCell>{item.deadline ? new Date(item.deadline).toLocaleDateString() : "N/A"}</TableCell>
                        </>
                      )}
                      {isProjectCategory && (
                        <>
                          <TableCell>{item.progress}</TableCell>
                          
                        </>
                      )}
                      {isAttendanceCategory && (
                        <>
                          <TableCell>{item.clockIn ? item.clockIn  : "N/A"}</TableCell>
                          <TableCell>{item.clockOut ? item.clockOut : "N/A"}</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Details Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedEmployee?.name || "Employee Details"}</SheetTitle>
            <SheetDescription>
              Attendance & Activity Timeline • {date}
            </SheetDescription>
          </SheetHeader>

          {selectedEmployee && (
            <div className="mt-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 px-3">
                <div>
                  <p className="text-sm text-muted-foreground">Clock In</p>
                  <p className="font-medium">{selectedEmployee.clockIn || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Clock Out</p>
                  <p className="font-medium">{selectedEmployee.clockOut || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">{selectedEmployee.status}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Late</p>
                  <p className="font-medium">{selectedEmployee.late || "On time"}</p>
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="px-3">
                <h3 className="text-lg font-semibold mb-3">Activity Timeline</h3>

                {selectedEmployee.activities?.length > 0 ? (
                  <div className="space-y-4 ">
                    {selectedEmployee.activities.map((act: any, index: number) => (
                      <div
                        key={act.id}
                        className="border-l-4 border-l-blue-500 pl-4 py-2 bg-gray-50 rounded-r-md"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {act.type === "task" ? (
                              <PlayCircle className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Coffee className="h-5 w-5 text-amber-600" />
                            )}
                            <span className="font-medium capitalize">{act.type}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatTime(act.startTime)} — {formatTime(act.endTime)}
                          </span>
                        </div>

                        <div className="mt-1 text-sm">
                          Duration: {calculateDuration(act.startTime, act.endTime)}
                          {act.taskId && (
                            <span className="ml-2 text-blue-600">
                              (Task ID: {act.taskId})
                            </span>
                          )}
                        </div>

                        {act.idleDetected && (
                          <Badge variant="outline" className="mt-1 bg-yellow-50">
                            Idle Detected
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    No activities recorded today
                  </p>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};