//@ts-nocheck
import React, { useEffect, useState } from 'react';
import { mockProjects } from '../services/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Calendar, DollarSign, Users as UsersIcon, CheckCircle, Clock, User } from 'lucide-react';
import { useParams } from 'react-router';
import { Button } from '../components/ui/button';
import { employeeAPI, projectAPI } from '../services/api';
import { Input } from '../components/ui/input';

import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '../components/ui/command';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export const DetailProject: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [employees, setEmployees] = useState<any[]>([]);

  const [selectedTask, setSelectedTask] = useState<null>(null);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDeadline, setTaskDeadline] = useState("");
  const [taskAssignees, setTaskAssignees] = useState<number[]>([]);
  const [taskAttachments, setTaskAttachments] = useState<File[]>([]);
  const [taskPriority, setTaskPriority] = useState("MEDIUM");

  const fetchEmployees = async () => {
    try {
      const res = await employeeAPI.getActiveEmployees();
      setEmployees(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProject();
    fetchTasks();
    fetchLogs();
    fetchEmployees();
  }, [id]);
  
  const fetchProject = async () => {
    try {
      const res = await projectAPI.getProjectById(Number(id));
      setProject(res.data);
    } catch (err) {
      console.error(err);
    }
  };
  
  const fetchTasks = async () => {
    try {
      const res = await projectAPI.getProjectTasks(id);
      setTasks(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };
  
  const fetchLogs = async () => {
    try {
      const res = await projectAPI.getProjectLogs(id);
      setLogs(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'PLANNING': 'bg-slate-100 text-slate-800',
      'IN_PROGRESS': 'bg-blue-100 text-blue-800',
      'COMPLETED': 'bg-emerald-100 text-emerald-800',
      'ON_HOLD': 'bg-amber-100 text-amber-800',
    };
    return colors[status] || colors['PLANNING'];
  };

  const getTaskStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'TODO': 'bg-slate-100 text-slate-800',
      'IN_PROGRESS': 'bg-blue-100 text-blue-800',
      'COMPLETED': 'bg-emerald-100 text-emerald-800',
    };
    return colors[status] || colors['TODO'];
  };

  const handleCreateTask = async () => {
    if (!taskTitle) {
      toast.error("Title is required");
      return;
    }
    
    try {
      const formData = new FormData();
    
      formData.append("data", JSON.stringify({
        title: taskTitle,
        description: taskDescription,
        deadline: taskDeadline,
        assignees: taskAssignees,
        priority: taskPriority
      }));
    
      taskAttachments.forEach(file => {
        formData.append("attachments", file);
      });
    
      await projectAPI.createTask(project.id, formData);
    
      toast.success("Task Created Successfully");
    
      fetchTasks();
      fetchLogs();
    
      // Reset form
      setTaskTitle("");
      setTaskDescription("");
      setTaskDeadline("");
      setTaskAssignees([]);
      setTaskAttachments([]);
      setTaskPriority("MEDIUM");

      setTaskDrawerOpen(false);
    } catch (err) {
      toast.error("Failed to create task");
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-1 sm:p-2">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{project?.title || "Project"} Details</h2>
      </div>

      <Tabs defaultValue="information" className="space-y-4">
        <TabsList className="bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
          <TabsTrigger value="information" className="rounded-lg text-xs font-semibold">Project Information</TabsTrigger>
          <TabsTrigger value="tasks" className="rounded-lg text-xs font-semibold">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="logs" className="rounded-lg text-xs font-semibold">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="information">
          <Card className="rounded-2xl shadow-sm border-gray-200 dark:border-gray-800">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold">{project?.title}</CardTitle>
                <Badge className={getStatusColor(project?.status)}>{project?.status}</Badge>
              </div>
              <p className="text-sm text-gray-500">{project?.client?.name || "No Client Assigned"}</p>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-500 font-medium">Progress</span>
                  <span className="font-bold">{project?.progress || 0}%</span>
                </div>
                <Progress value={project?.progress || 0} className="h-2 rounded-full" />
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-2">
                    <Calendar className="size-4 text-gray-400" />
                    Timeline
                  </span>
                  <span className="font-semibold">
                    {formatDate(project?.startDate)} - {formatDate(project?.endDate)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card className="rounded-2xl shadow-sm border-gray-200 dark:border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <CardTitle className="text-lg font-bold">Project Tasks</CardTitle>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm"
                onClick={() => {
                  setSelectedTask(null);
                  setTaskDrawerOpen(true);
                }}
              >
                + Create Task
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-900">
                      <TableHead className="font-bold">Title</TableHead>
                      <TableHead className="font-bold">Status</TableHead>
                      <TableHead className="font-bold">Progress</TableHead>
                      <TableHead className="font-bold">Assigned To</TableHead>
                      <TableHead className="font-bold">Due Date</TableHead>
                      <TableHead className="font-bold text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks?.map((task) => (
                      <TableRow key={task.id} className="hover:bg-gray-50/80 transition-colors">
                        <TableCell className="font-semibold">{task?.title}</TableCell>
                        <TableCell>
                          <Badge className={getTaskStatusColor(task.status)}>{task.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={task.progress || 0} className="w-20 h-2 rounded-full" />
                            <span className="text-xs font-bold">{task.progress || 0}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {task.assignees?.map(a => a.employee?.firstName).join(", ") || "Unassigned"}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{formatDate(task.deadline)}</TableCell>
                        <TableCell className="text-right pr-6">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg text-xs"
                            onClick={() => {
                              setSelectedTask(task);
                              setTaskDrawerOpen(true);
                            }}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {tasks.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-12 text-center text-gray-500">
                          No tasks created for this project yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card className="rounded-2xl shadow-sm border-gray-200 dark:border-gray-800">
            <CardHeader className="border-b">
              <CardTitle className="text-lg font-bold">Project Logs</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-900">
                      <TableHead className="font-bold">Action</TableHead>
                      <TableHead className="font-bold">User</TableHead>
                      <TableHead className="font-bold">Date</TableHead>
                      <TableHead className="font-bold">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="font-semibold">{log?.title || log?.action}</TableCell>
                        <TableCell className="text-xs">{log.user?.firstName || "System"}</TableCell>
                        <TableCell className="text-xs font-mono">{formatDate(log.createdAt)}</TableCell>
                        <TableCell className="text-xs text-gray-600">{log.description || log.details}</TableCell>
                      </TableRow>
                    ))}
                    {logs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-12 text-center text-gray-500">
                          No activity logs recorded.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Task Drawer Sheet - Fixed, Fully Scrollable & Responsive */}
      <Sheet open={taskDrawerOpen} onOpenChange={setTaskDrawerOpen}>
        <SheetContent side="right" className="w-full sm:w-[540px] md:w-[600px] max-w-full p-0 flex flex-col h-full overflow-hidden rounded-l-2xl shadow-2xl border-l">
          <SheetHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-md">
            <SheetTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center justify-between">
              <span>{selectedTask ? "Task Details" : "Create Task"}</span>
            </SheetTitle>
          </SheetHeader>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {!selectedTask && (
              <>
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Task Title *
                  </label>
                  <Input
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Enter task title"
                    className="rounded-lg shadow-sm"
                  />
                </div>

                {/* Assign To */}
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Assign To
                  </label>

                  {/* Trigger Button */}
                  <div
                    onClick={() => setAssigneeOpen(!assigneeOpen)}
                    className="w-full border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm flex items-center justify-between cursor-pointer bg-white dark:bg-gray-950 shadow-sm hover:border-gray-300"
                  >
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {taskAssignees.length > 0
                        ? `${taskAssignees.length} selected`
                        : "Select employees"}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                  </div>

                  {/* Dropdown */}
                  {assigneeOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl p-2 space-y-2">
                      <Input
                        placeholder="Search employee..."
                        value={assigneeSearch}
                        onChange={(e) => setAssigneeSearch(e.target.value)}
                        className="h-8 text-xs rounded-md"
                      />
                      <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                        {employees
                          .filter(emp =>
                            `${emp.firstName} ${emp.lastName}`
                              .toLowerCase()
                              .includes(assigneeSearch.toLowerCase())
                          )
                          .map(emp => {
                            const isSelected = taskAssignees.includes(emp.id);

                            return (
                              <div
                                key={emp.id}
                                onClick={() => {
                                  if (isSelected) {
                                    setTaskAssignees(prev =>
                                      prev.filter(id => id !== emp.id)
                                    );
                                  } else {
                                    setTaskAssignees(prev => [...prev, emp.id]);
                                  }
                                }}
                                className={`px-3 py-1.5 text-xs rounded-lg cursor-pointer flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors ${
                                  isSelected ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 font-semibold" : "text-gray-700 dark:text-gray-300"
                                }`}
                              >
                                <span>
                                  {emp.firstName} {emp.lastName}
                                </span>
                                {isSelected && (
                                  <Check className="h-4 w-4 text-blue-600" />
                                )}
                              </div>
                            );
                          })}

                        {employees.length === 0 && (
                          <div className="px-3 py-2 text-xs text-gray-500">
                            No employees found
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Selected Chips */}
                  {taskAssignees.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {taskAssignees.map(id => {
                        const emp = employees.find(e => e.id === id);
                        if (!emp) return null;

                        return (
                          <div
                            key={id}
                            className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg text-xs font-medium border border-blue-200/60 dark:border-blue-900/60"
                          >
                            <span>{emp.firstName} {emp.lastName}</span>
                            <X
                              className="h-3.5 w-3.5 cursor-pointer hover:text-blue-900"
                              onClick={() =>
                                setTaskAssignees(prev =>
                                  prev.filter(empId => empId !== id)
                                )
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Priority */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Priority
                  </label>
                  <Select value={taskPriority} onValueChange={(e) => setTaskPriority(e)}>
                    <SelectTrigger className="rounded-lg shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Description
                  </label>
                  <textarea
                    className="w-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    rows={3}
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="Task details and instructions..."
                  />
                </div>

                {/* Deadline */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Deadline
                  </label>
                  <Input
                    type="date"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="rounded-lg shadow-sm"
                  />
                </div>

                {/* Attachments */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Attachments
                  </label>
                  <Input
                    type="file"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) {
                        setTaskAttachments(Array.from(e.target.files));
                      }
                    }}
                    className="rounded-lg text-xs"
                  />
                </div>
              </>
            )}

            {/* Selected Task Details View */}
            {selectedTask && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">{selectedTask.title}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                    {selectedTask.description || "No description provided."}
                  </p>
                </div>

                <div className="space-y-3 text-xs bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium">Status</span>
                    <Badge className={getTaskStatusColor(selectedTask.status)}>
                      {selectedTask.status}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium">Deadline</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{formatDate(selectedTask.deadline)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Footer Action Bar */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80 flex items-center justify-end gap-3 flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setTaskDrawerOpen(false)}
              className="rounded-xl font-medium"
            >
              Cancel
            </Button>

            {!selectedTask && (
              <Button 
                onClick={handleCreateTask}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md"
              >
                Save Task
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
};