//@ts-nocheck
import React, { useEffect, useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { 
  LayoutGrid, 
  List, 
  Plus, 
  Filter, 
  Search, 
  ChevronsUpDown, 
  Check, 
  X,
  CheckSquare,
  Clock,
  User,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Calendar,
  Paperclip,
  MessageSquare,
  Sparkles,
  UserPlus,
  AlertCircle,
  FolderKanban,
  CheckCircle2,
  Hourglass
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE_URL, API_URL, projectAPI, taskAPI } from "../services/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogFooter,
  AlertDialogDescription 
} from "../components/ui/alert-dialog";
import {   
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger, 
} from "../components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { ScrollArea } from "../components/ui/scroll-area";

interface Remark {
  id: string;
  title: string | null;
  content: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: {
    id: number;
    firstName: string;
    lastName: string;
    role: string;
    profileImage?: string;
  };
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    mimeType?: string;
  }>;
}

const formatDate = (dateString: string) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

interface Task {
  id: string;
  title: string;
  projectId: string;
  assignedTo: string;
  status: "TODO" | "IN_PROGRESS" | "COMPLETED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: string;
  description: string;
}

const PRIORITY_CONFIG: Record<string, { badge: string; label: string }> = {
  low: { badge: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800", label: "Low" },
  medium: { badge: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800", label: "Medium" },
  high: { badge: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800", label: "High" },
  urgent: { badge: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800", label: "Urgent" },
};

const STATUS_CONFIG: Record<string, { badge: string; dot: string; label: string }> = {
  TODO: { badge: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-800", dot: "bg-slate-400", label: "To Do" },
  IN_PROGRESS: { badge: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800", dot: "bg-blue-500", label: "In Progress" },
  COMPLETED: { badge: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800", dot: "bg-emerald-500", label: "Completed" },
};

const TaskCard: React.FC<{
  task: any;
  onDrop: (taskId: string, status: string) => void;
  onAction: (type: string, task: any) => void;
  onManageAssignees: (task: any) => void;
  user: any;
}> = ({ task, onDrop, onAction, onManageAssignees, user }) => {
  const [{ isDragging }, drag, preview] = useDrag({
    type: "TASK",
    item: { id: task.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const priorityKey = (task.priority || "medium").toLowerCase();
  const priorityCfg = PRIORITY_CONFIG[priorityKey] || PRIORITY_CONFIG.medium;

  return (
    <div
      ref={(node) => drag(preview(node))}
      onClick={() => onAction("view", task)}
      className={`bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200/80 dark:border-gray-800 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? "opacity-30 scale-95" : ""
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex-1 line-clamp-2">
          {task.title}
        </h4>
        <Badge className={`text-[10px] font-semibold uppercase px-2 py-0.5 border ${priorityCfg.badge}`}>
          {priorityCfg.label}
        </Badge>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3.5 line-clamp-2 leading-relaxed">
        {task.description || "No description provided."}
      </p>

      {/* Assignees + Add button */}
      <TooltipProvider>
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          {task.assignees?.slice(0, 3).map((a) => (
            <Tooltip key={a.employee.id}>
              <TooltipTrigger asChild>
                {a.employee.profileImage ? (
                  <img
                    src={`${API_URL}${a.employee.profileImage}`}
                    width={26}
                    height={26}
                    className="rounded-full border-2 border-white dark:border-gray-900 shadow-sm object-cover"
                    alt=""
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shadow-sm border border-white dark:border-gray-900">
                    {a.employee.firstName?.charAt(0)}{a.employee.lastName?.charAt(0)}
                  </div>
                )}
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                {a.employee.firstName} {a.employee.lastName}
              </TooltipContent>
            </Tooltip>
          ))}

          {task.assignees?.length > 3 && (
            <div className="text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
              +{task.assignees.length - 3}
            </div>
          )}

          {user?.role !== "USER" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onManageAssignees(task);
              }}
              className="w-6 h-6 rounded-full border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-400 transition-colors"
              title="Manage assignees"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </TooltipProvider>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-900">
        <span className="flex items-center gap-1 font-mono text-[11px]">
          <Clock className="w-3 h-3 text-gray-400" />
          {formatDate(task.deadline)}
        </span>

        {user?.role !== "USER" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 z-50">
              <DropdownMenuItem onSelect={() => onAction("view", task)} className="cursor-pointer gap-2">
                <Eye className="w-4 h-4 text-gray-500" />
                <span>View Task</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAction("edit", task)} className="cursor-pointer gap-2">
                <Pencil className="w-4 h-4 text-blue-600" />
                <span>Edit Task</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-rose-600 focus:text-rose-600 cursor-pointer gap-2"
                onSelect={() => onAction("delete", task)}
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Task</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};

const KanbanColumn: React.FC<{
  title: string;
  status: string;
  tasks: Task[];
  onDrop: (taskId: string, status: string) => void;
  onAction: (type: string, task: Task) => void;
  onManageAssignees: (task: Task) => void;
  user: any;
}> = ({ title, status, tasks, onDrop, onAction, onManageAssignees, user }) => {
  const [{ isOver }, drop] = useDrop({
    accept: "TASK",
    drop: (item: { id: string }) => onDrop(item.id, status),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.TODO;

  return (
    <div
      ref={drop}
      className={`flex-1 min-w-[300px] bg-gray-50/70 dark:bg-gray-900/40 rounded-2xl p-4 border border-gray-200/80 dark:border-gray-800/80 flex flex-col transition-all ${
        isOver ? "ring-2 ring-blue-500 bg-blue-50/30 dark:bg-blue-950/20 border-blue-300" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-4 sticky top-0 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-md z-10 py-1 px-1 rounded-lg">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${statusCfg.dot}`} />
          <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300">
            {title}
          </h3>
        </div>
        <Badge variant="secondary" className="text-xs font-bold px-2.5 py-0.5 rounded-full">
          {tasks?.length || 0}
        </Badge>
      </div>

      <div className="space-y-3 min-h-[350px] flex-1">
        {tasks?.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onDrop={onDrop}
            onAction={onAction}
            onManageAssignees={onManageAssignees}
            user={user}
          />
        ))}
        {(!tasks || tasks.length === 0) && (
          <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <span>No tasks in {title}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const Tasks: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role;

  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProject, setFilterProject] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");

  // New Task Dialog
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDeadline, setTaskDeadline] = useState("");
  const [taskPriority, setTaskPriority] = useState("MEDIUM");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [taskAssignees, setTaskAssignees] = useState<number[]>([]);
  const [taskAttachments, setTaskAttachments] = useState<File[]>([]);

  // Drawer (View / Edit mode)
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editAssignees, setEditAssignees] = useState<number[]>([]);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");

  // Assignee Manage Sheet
  const [assigneeSheetOpen, setAssigneeSheetOpen] = useState(false);
  const [activeTaskForAssignee, setActiveTaskForAssignee] = useState<any | null>(null);
  const [selectedAssignees, setSelectedAssignees] = useState<number[]>([]);

  // Delete Confirmation
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);

  // Remarks
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [editingRemark, setEditingRemark] = useState<Remark | null>(null);
  const [remarkFormOpen, setRemarkFormOpen] = useState(false);
  const [remarkTitle, setRemarkTitle] = useState("");
  const [remarkContent, setRemarkContent] = useState("");
  const [remarkAttachments, setRemarkAttachments] = useState<File[]>([]);
  const [remarkLoading, setRemarkLoading] = useState(false);
  const [deleteRemarkId, setDeleteRemarkId] = useState<string | null>(null);

  // Load remarks when task is selected
  useEffect(() => {
    if (selectedTask && drawerOpen) {
      const loadRemarks = async () => {
        try {
          const res = await taskAPI.getRemarks(selectedTask.id);
          setRemarks(res.data || []);
        } catch (err) {
          toast.error("Failed to load remarks");
        }
      };
      loadRemarks();
    }
  }, [selectedTask, drawerOpen]);

  const filteredTasks = tasks?.filter((task) => {
    if (searchQuery && !task?.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterProject !== "all" && task?.project?.id !== Number(filterProject)) return false;
    if (filterPriority !== "all" && task.priority?.toLowerCase() !== filterPriority) return false;
    if (filterAssignee !== "all" && !task.assignees?.some((a) => a.employee.id === Number(filterAssignee))) return false;
    return true;
  });

  const todoTasks = filteredTasks?.filter((t) => t?.status === "TODO");
  const inProgressTasks = filteredTasks?.filter((t) => t?.status === "IN_PROGRESS");
  const doneTasks = filteredTasks?.filter((t) => t?.status === "COMPLETED");

  const fetchTasks = async () => {
    try {
      const res = await taskAPI.getTasks();
      setTasks(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAssignable = async () => {
    try {
      const res = await taskAPI.getAssignableEmployees();
      setEmployees(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await projectAPI.getProjects();
      setProjects(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchAssignable();
    fetchProjects();
  }, []);

  const handleOpenAssigneeSheet = (task: any) => {
    setActiveTaskForAssignee(task);
    const existingIds = task.assignees?.map((a) => a.employee.id) || [];
    setSelectedAssignees(existingIds);
    setAssigneeSheetOpen(true);
  };

  const handleDrop = async (taskId: number, newStatus: string) => {
    const oldTasks = [...tasks];
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, status: newStatus as any }
          : task
      )
    );

    try {
      await taskAPI.updateTaskStatus(taskId, newStatus);
      toast.success("Task status updated!");
    } catch (err) {
      setTasks(oldTasks);
      toast.error("Failed to update status");
    }
  };

  const handleCreateTask = async () => {
    if (!taskTitle) {
      toast.error("Title is required");
      return;
    }
    if (role !== "USER" && taskAssignees.length === 0) {
      toast.error("Assignee is required");
      return;
    }
    if (!taskDeadline) {
      toast.error("Deadline is required");
      return;
    }

    try {
      const formData = new FormData();
      formData.append(
        "data",
        JSON.stringify({
          title: taskTitle,
          description: taskDescription,
          deadline: taskDeadline,
          priority: taskPriority.toUpperCase(),
          projectId: selectedProjectId,
          organizationId: user?.organizationId,
          assignees: role === "USER" ? [user.id] : taskAssignees,
        })
      );

      taskAttachments.forEach((file) => {
        formData.append("attachments", file);
      });

      const res = await taskAPI.createTask(formData);
      setTasks((prev) => [res.data, ...prev]);
      toast.success("Task created successfully");

      setNewTaskOpen(false);
      setTaskTitle("");
      setTaskDescription("");
      setTaskDeadline("");
      setTaskPriority("MEDIUM");
      setSelectedProjectId(null);
      setTaskAssignees([]);
      setTaskAttachments([]);
    } catch (err) {
      toast.error("Failed to create task");
    }
  };

  const handleAction = (type: string, task: any) => {
    if (type === "delete") {
      setDeleteTaskId(task.id);
      return;
    }

    setSelectedTask(task);
    setMode(type as any);

    if (type === "edit") {
      const selectedIds = task.assignees?.map((a) => a.employee.id) || [];
      setEditAssignees(selectedIds);
    }

    setDrawerOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTaskId) return;

    try {
      await taskAPI.deleteTask(deleteTaskId);
      setTasks((prev) => prev.filter((task) => task.id !== deleteTaskId));
      toast.success("Task deleted successfully");
    } catch (err) {
      toast.error("Failed to delete task");
    } finally {
      setDeleteTaskId(null);
    }
  };

  const handleDeleteRemark = async () => {
    if (!deleteRemarkId || !selectedTask) return;
    try {
      await taskAPI.deleteRemark(selectedTask.id, deleteRemarkId);
      setRemarks((prev) => prev.filter((r) => r.id !== deleteRemarkId));
      toast.success("Remark deleted");
    } catch (err) {
      toast.error("Failed to delete remark");
    } finally {
      setDeleteRemarkId(null);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6 max-w-[1600px] mx-auto p-1 sm:p-2 pb-12">

        {/* Simple Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Task Management</h2>
            <p className="text-gray-500 text-sm">
              Organize, assign, track, and complete team tasks seamlessly.
            </p>
          </div>

          {/* Create New Task Dialog Trigger */}
          <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-sm">
                <Plus className="mr-2 size-4" />
                New Task
              </Button>
            </DialogTrigger>

              <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 rounded-2xl overflow-hidden shadow-2xl">
                <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0 bg-gray-50/80 dark:bg-gray-900/80">
                  <DialogTitle className="text-xl font-bold">Create New Task</DialogTitle>
                </DialogHeader>

                <ScrollArea className="flex-1 px-6 py-4 overflow-y-auto max-h-[calc(85vh-140px)]">
                  <div className="space-y-4 py-2">
                    {/* Title */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Task Title *</Label>
                      <Input
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder="Enter task title"
                        className="rounded-lg shadow-sm"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Description</Label>
                      <Textarea
                        value={taskDescription}
                        onChange={(e) => setTaskDescription(e.target.value)}
                        placeholder="Task description and details..."
                        rows={3}
                        className="rounded-lg shadow-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Project (optional) */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Project (Optional)</Label>
                        <Select
                          value={selectedProjectId?.toString()}
                          onValueChange={(val) => setSelectedProjectId(Number(val))}
                        >
                          <SelectTrigger className="rounded-lg shadow-sm">
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                          <SelectContent>
                            {projects?.map((project) => (
                              <SelectItem
                                key={project.id}
                                value={project.id.toString()}
                              >
                                {project?.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Assign To */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Assign To</Label>

                        {role === "USER" ? (
                          <div className="border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900 text-sm font-semibold">
                            {user?.firstName} {user?.lastName}
                          </div>
                        ) : (
                          <Select
                            onValueChange={(val) => setTaskAssignees([Number(val)])}
                          >
                            <SelectTrigger className="rounded-lg shadow-sm">
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                            <SelectContent>
                              {employees?.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id.toString()}>
                                  {emp.firstName} {emp.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {/* Priority */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Priority</Label>
                        <Select
                          value={taskPriority}
                          onValueChange={(val) => setTaskPriority(val)}
                        >
                          <SelectTrigger className="rounded-lg shadow-sm">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Due Date */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Due Date *</Label>
                        <Input
                          type="date"
                          value={taskDeadline}
                          onChange={(e) => setTaskDeadline(e.target.value)}
                          className="rounded-lg shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Attachments</Label>
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

                      {/* Preview Selected Files */}
                      {taskAttachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {taskAttachments.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded-lg"
                            >
                              <span className="truncate">{file.name}</span>
                              <X
                                className="h-4 w-4 cursor-pointer hover:text-rose-600"
                                onClick={() =>
                                  setTaskAttachments(prev =>
                                    prev.filter((_, i) => i !== index)
                                  )
                                }
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>

                {/* Buttons Footer */}
                <div className="px-6 py-4 border-t flex gap-2 justify-end bg-gray-50/80 dark:bg-gray-900/80 flex-shrink-0">
                  <Button
                    variant="outline"
                    onClick={() => setNewTaskOpen(false)}
                    className="rounded-xl font-medium"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTask} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md">
                    Create Task
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
        </div>

        {/* Toolbar: Filters & Search */}
        <Card className="shadow-lg border-gray-200/80 dark:border-gray-800 rounded-2xl">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                {/* Search */}
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border-gray-200 dark:border-gray-800 shadow-sm"
                  />
                </div>

                {/* Filter Project */}
                <SearchableSelect
                  className="w-full sm:w-48 bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border-gray-200 dark:border-gray-800 shadow-sm"
                  placeholder="All Projects"
                  searchPlaceholder="Search project..."
                  value={filterProject}
                  onValueChange={setFilterProject}
                  options={[
                    { value: "all", label: "All Projects" },
                    ...(projects?.map((project) => ({
                      value: project.id.toString(),
                      label: project?.title || "",
                    })) || []),
                  ]}
                />

                {/* Filter Priority */}
                <SearchableSelect
                  className="w-full sm:w-40 bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border-gray-200 dark:border-gray-800 shadow-sm"
                  placeholder="Priority"
                  searchPlaceholder="Search priority..."
                  value={filterPriority}
                  onValueChange={setFilterPriority}
                  options={[
                    { value: "all", label: "All Priority" },
                    { value: "high", label: "High" },
                    { value: "medium", label: "Medium" },
                    { value: "low", label: "Low" },
                  ]}
                />

                {/* Filter Assignee */}
                <SearchableSelect
                  className="w-full sm:w-48 bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border-gray-200 dark:border-gray-800 shadow-sm"
                  placeholder="Assignee"
                  searchPlaceholder="Search assignee..."
                  value={filterAssignee}
                  onValueChange={setFilterAssignee}
                  options={[
                    { value: "all", label: "All Assignees" },
                    ...(employees?.map((emp) => ({
                      value: emp.id.toString(),
                      label: `${emp.firstName} ${emp.lastName || ""}`.trim(),
                    })) || []),
                  ]}
                />
              </div>

            </div>
          </CardContent>
        </Card>

        {/* View Segment Tabs */}
        <Tabs defaultValue="kanban" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-xs bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
            <TabsTrigger value="kanban" className="rounded-lg text-xs font-semibold gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5" />
              Kanban View
            </TabsTrigger>
            <TabsTrigger value="table" className="rounded-lg text-xs font-semibold gap-1.5">
              <List className="w-3.5 h-3.5" />
              Table View
            </TabsTrigger>
          </TabsList>

          {/* ── KANBAN VIEW ────────────────────────────────────────────── */}
          <TabsContent value="kanban" className="mt-0 space-y-0">
            <div className="flex gap-4 overflow-x-auto pb-4 pt-2">
              <KanbanColumn
                title="To Do"
                status="TODO"
                tasks={todoTasks}
                onDrop={handleDrop}
                onAction={handleAction}
                onManageAssignees={handleOpenAssigneeSheet}
                user={user}
              />
              <KanbanColumn
                title="In Progress"
                status="IN_PROGRESS"
                tasks={inProgressTasks}
                onDrop={handleDrop}
                onAction={handleAction}
                onManageAssignees={handleOpenAssigneeSheet}
                user={user}
              />
              <KanbanColumn
                title="Completed"
                status="COMPLETED"
                tasks={doneTasks}
                onDrop={handleDrop}
                onAction={handleAction}
                onManageAssignees={handleOpenAssigneeSheet}
                user={user}
              />
            </div>
          </TabsContent>

          {/* ── TABLE VIEW ─────────────────────────────────────────────── */}
          <TabsContent value="table" className="mt-0 pt-2">
            <Card className="shadow-lg border-gray-200/80 dark:border-gray-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50/80 dark:bg-gray-900">
                    <TableRow>
                      <TableHead className="font-bold text-gray-700 dark:text-gray-300">Task</TableHead>
                      <TableHead className="font-bold text-gray-700 dark:text-gray-300">Project</TableHead>
                      <TableHead className="font-bold text-gray-700 dark:text-gray-300">Assigned To</TableHead>
                      <TableHead className="font-bold text-gray-700 dark:text-gray-300">Priority</TableHead>
                      <TableHead className="font-bold text-gray-700 dark:text-gray-300">Due Date</TableHead>
                      <TableHead className="font-bold text-gray-700 dark:text-gray-300">Status</TableHead>
                      <TableHead className="font-bold text-gray-700 dark:text-gray-300 text-right pr-6">Action Section</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks?.map((task) => {
                      const priorityKey = (task.priority || "medium").toLowerCase();
                      const priorityCfg = PRIORITY_CONFIG[priorityKey] || PRIORITY_CONFIG.medium;
                      const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.TODO;

                      return (
                        <TableRow key={task.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/40 transition-colors">
                          <TableCell className="font-bold text-gray-900 dark:text-gray-100">
                            <div className="flex flex-col">
                              <span>{task?.title}</span>
                              {task?.description && (
                                <span className="text-[11px] text-gray-400 font-normal line-clamp-1 max-w-xs">
                                  {task.description}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {task?.project?.title || "—"}
                          </TableCell>

                          <TableCell className="text-xs font-medium">
                            {task.assignees?.map((e) => `${e.employee.firstName} ${e.employee.lastName || ''}`).join(", ") || "Unassigned"}
                          </TableCell>

                          <TableCell>
                            <Badge className={`px-2 py-0.5 border text-[11px] font-semibold ${priorityCfg.badge}`}>
                              {priorityCfg.label}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                            {formatDate(task.deadline)}
                          </TableCell>

                          <TableCell>
                            <Badge className={`px-2.5 py-0.5 border text-[11px] font-semibold ${statusCfg.badge}`}>
                              {statusCfg.label}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Direct View */}
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5 text-xs gap-1 hover:bg-gray-100 rounded-lg shadow-sm"
                                onClick={() => handleAction("view", task)}
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5 text-gray-500" />
                                <span>View</span>
                              </Button>

                              {user?.role !== 'USER' && (
                                <>
                                  {/* Direct Edit */}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2.5 text-xs gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg shadow-sm"
                                    onClick={() => handleAction("edit", task)}
                                    title="Edit Task"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                  </Button>

                                  {/* Direct Delete */}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2.5 text-xs gap-1 text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg shadow-sm"
                                    onClick={() => handleAction("delete", task)}
                                    title="Delete Task"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete</span>
                                  </Button>
                                </>
                              )}


                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {filteredTasks?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-12 text-center text-gray-500">
                          No tasks found matching the filter criteria.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── TASK DETAIL / EDIT SHEET DRAWER ───────────────────────── */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="right" className="w-full sm:w-[560px] md:w-[640px] max-w-full p-0 flex flex-col h-full overflow-hidden rounded-l-2xl shadow-2xl border-l">
            <SheetHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0 bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
              <SheetTitle className="text-xl font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-400" />
                <span>{mode === "view" ? "Task Details" : "Edit Task"}</span>
              </SheetTitle>
            </SheetHeader>

            {selectedTask && (
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

                {/* 🔹 VIEW MODE */}
                {mode === "view" && (
                  <>
                    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4">
                      <div>
                        <h3 className="font-extrabold text-lg text-gray-900 dark:text-gray-100">
                          {selectedTask?.title}
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                          {selectedTask?.description || "No description provided."}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-gray-200 dark:border-gray-800">
                        <div>
                          <span className="text-gray-400 font-medium block">Status</span>
                          <Badge className="mt-0.5">{selectedTask?.status}</Badge>
                        </div>

                        <div>
                          <span className="text-gray-400 font-medium block">Priority</span>
                          <Badge variant="outline" className="mt-0.5 font-semibold">{selectedTask?.priority}</Badge>
                        </div>

                        <div>
                          <span className="text-gray-400 font-medium block">Deadline</span>
                          <span className="font-bold text-gray-800 dark:text-gray-200 text-sm font-mono mt-0.5 block">
                            {formatDate(selectedTask?.deadline)}
                          </span>
                        </div>

                        <div>
                          <span className="text-gray-400 font-medium block">Assigned To</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block">
                            {selectedTask?.assignees?.map(a => `${a.employee?.firstName} ${a.employee?.lastName || ''}`).join(", ") || "Unassigned"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* REMARKS & ACTIVITY TIMELINE */}
                    <div className="border-t pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-blue-600" />
                          <span>Remarks & Activity</span>
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1.5 rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50"
                          onClick={() => {
                            setEditingRemark(null);
                            setRemarkTitle("");
                            setRemarkContent("");
                            setRemarkAttachments([]);
                            setRemarkFormOpen(true);
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Remark
                        </Button>
                      </div>

                      {/* Timeline */}
                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                        {remarks.length === 0 ? (
                          <div className="text-center text-xs text-gray-400 py-8 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed">
                            No remarks or comments added yet.
                          </div>
                        ) : (
                          remarks
                            .slice()
                            .sort(
                              (a, b) =>
                                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                            )
                            .map((remark) => {
                              const isOwn =
                                remark.createdBy.id === user?.id ||
                                user?.role === "ADMIN" ||
                                user?.role === "SUPERVISOR";

                              return (
                                <div
                                  key={remark.id}
                                  className="flex gap-3 pb-4 border-b border-gray-100 dark:border-gray-800 last:border-none"
                                >
                                  {/* Avatar */}
                                  <div className="flex-shrink-0">
                                    {remark.createdBy.profileImage ? (
                                      <img
                                        src={`${API_URL}${remark.createdBy.profileImage}`}
                                        alt=""
                                        className="w-8 h-8 rounded-full object-cover border"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                                        {remark.createdBy.firstName?.[0]}
                                        {remark.createdBy.lastName?.[0]}
                                      </div>
                                    )}
                                  </div>

                                  {/* Content */}
                                  <div className="flex-1 text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-gray-900 dark:text-gray-100">
                                        {remark.createdBy.firstName} {remark.createdBy.lastName}
                                      </span>
                                      <span className="text-[10px] text-gray-400 font-mono">
                                        {formatDate(remark.createdAt)}
                                      </span>
                                    </div>

                                    {remark.title && (
                                      <p className="font-bold text-gray-800 dark:text-gray-200 mt-1">{remark.title}</p>
                                    )}

                                    <p className="text-gray-600 dark:text-gray-300 mt-1 leading-relaxed whitespace-pre-wrap">
                                      {remark.content}
                                    </p>

                                    {/* Attachments */}
                                    {remark.attachments?.length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                        {remark.attachments.map((att) => (
                                          <a
                                            key={att.id}
                                            href={`${API_URL}${att.url}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[11px] bg-gray-100 dark:bg-gray-800 text-blue-600 px-2 py-0.5 rounded-md hover:underline flex items-center gap-1 border"
                                          >
                                            <Paperclip className="w-3 h-3" />
                                            <span>{att.name}</span>
                                          </a>
                                        ))}
                                      </div>
                                    )}

                                    {/* Actions */}
                                    {isOwn && (
                                      <div className="mt-2 flex gap-3 text-[11px]">
                                        <button
                                          className="text-blue-600 hover:underline font-semibold"
                                          onClick={() => {
                                            setEditingRemark(remark);
                                            setRemarkTitle(remark.title || "");
                                            setRemarkContent(remark.content);
                                            setRemarkAttachments([]);
                                            setRemarkFormOpen(true);
                                          }}
                                        >
                                          Edit
                                        </button>
                                        <button
                                          className="text-rose-600 hover:underline font-semibold"
                                          onClick={() => setDeleteRemarkId(remark.id)}
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* 🔹 EDIT MODE */}
                {mode === "edit" && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Task Title *</Label>
                      <Input
                        value={selectedTask?.title}
                        onChange={(e) =>
                          setSelectedTask({
                            ...selectedTask,
                            title: e.target.value
                          })
                        }
                        className="rounded-lg shadow-sm"
                      />
                    </div>

                    <div className="space-y-1.5 relative">
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Assign To</Label>

                      <div
                        onClick={() => setAssigneeOpen(!assigneeOpen)}
                        className="w-full border rounded-lg px-3 py-2 text-sm flex items-center justify-between cursor-pointer bg-white dark:bg-gray-950 shadow-sm"
                      >
                        <span className="text-gray-700 dark:text-gray-300 font-medium text-xs">
                          {editAssignees.length > 0
                            ? `${editAssignees.length} employee(s) selected`
                            : "Select employees"}
                        </span>
                        <ChevronsUpDown className="h-4 w-4 opacity-50" />
                      </div>

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
                              ?.filter(emp =>
                                `${emp.firstName} ${emp.lastName}`
                                  .toLowerCase()
                                  .includes(assigneeSearch.toLowerCase())
                              )
                              .map(emp => {
                                const isSelected = editAssignees.includes(emp.id);
                                return (
                                  <div
                                    key={emp.id}
                                    onClick={() => {
                                      if (isSelected) {
                                        setEditAssignees(prev => prev.filter(id => id !== emp.id));
                                      } else {
                                        setEditAssignees(prev => [...prev, emp.id]);
                                      }
                                    }}
                                    className={`px-3 py-1.5 text-xs rounded-lg cursor-pointer flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors ${
                                      isSelected ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 font-semibold" : "text-gray-700 dark:text-gray-300"
                                    }`}
                                  >
                                    <span>{emp.firstName} {emp.lastName}</span>
                                    {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Selected Chips */}
                      {editAssignees.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {editAssignees.map(id => {
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
                                    setEditAssignees(prev => prev.filter(empId => empId !== id))
                                  }
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Description</Label>
                      <Textarea
                        rows={3}
                        value={selectedTask?.description}
                        onChange={(e) =>
                          setSelectedTask({
                            ...selectedTask,
                            description: e.target.value
                          })
                        }
                        className="rounded-lg shadow-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Priority</Label>
                        <Select
                          value={selectedTask?.priority}
                          onValueChange={(val) =>
                            setSelectedTask({
                              ...selectedTask,
                              priority: val
                            })
                          }
                        >
                          <SelectTrigger className="rounded-lg shadow-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Deadline</Label>
                        <Input
                          type="date"
                          value={selectedTask?.deadline?.split("T")[0]}
                          onChange={(e) =>
                            setSelectedTask({
                              ...selectedTask,
                              deadline: e.target.value
                            })
                          }
                          className="rounded-lg shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer Buttons */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80 flex items-center justify-end gap-3 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => setDrawerOpen(false)}
                className="rounded-xl font-medium"
              >
                Close
              </Button>

              {mode === "edit" && (
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md"
                  onClick={async () => {
                    await taskAPI.updateTask(selectedTask.id, {
                      ...selectedTask,
                      assignees: editAssignees
                    });
                    toast.success("Task updated successfully");
                    setDrawerOpen(false);
                    fetchTasks();
                  }}
                >
                  Save Changes
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Add / Edit Remark Dialog */}
        <Dialog open={remarkFormOpen} onOpenChange={setRemarkFormOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-2xl p-6 shadow-2xl">
            <DialogHeader className="border-b pb-3">
              <DialogTitle className="text-xl font-bold">
                {editingRemark ? "Edit Remark" : "Add New Remark"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300">Subject (optional)</Label>
                <Input
                  value={remarkTitle}
                  onChange={(e) => setRemarkTitle(e.target.value)}
                  placeholder="Short summary or title"
                  className="rounded-lg shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300">Remark / Comment *</Label>
                <Textarea
                  value={remarkContent}
                  onChange={(e) => setRemarkContent(e.target.value)}
                  placeholder="Write your remark or progress update here..."
                  rows={4}
                  className="rounded-lg shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300">Attachments (optional)</Label>
                <Input
                  type="file"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      setRemarkAttachments(Array.from(e.target.files));
                    }
                  }}
                  className="rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t mt-4">
                <Button variant="outline" onClick={() => setRemarkFormOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md"
                  disabled={remarkLoading || !remarkContent.trim()}
                  onClick={async () => {
                    if (!selectedTask) return;
                    setRemarkLoading(true);

                    try {
                      const formData = new FormData();
                      formData.append(
                        "data",
                        JSON.stringify({
                          title: remarkTitle.trim() || null,
                          content: remarkContent.trim(),
                        })
                      );
                      remarkAttachments.forEach((file) => {
                        formData.append("attachments", file);
                      });

                      let updatedRemarks: Remark[];

                      if (editingRemark) {
                        const res = await taskAPI.updateRemark(
                          selectedTask.id,
                          editingRemark.id,
                          {
                            title: remarkTitle.trim() || undefined,
                            content: remarkContent.trim(),
                          }
                        );
                        updatedRemarks = remarks.map((r) =>
                          r.id === editingRemark.id ? res.data : r
                        );
                        toast.success("Remark updated");
                      } else {
                        const res = await taskAPI.createRemark(
                          selectedTask.id,
                          formData
                        );
                        updatedRemarks = [res.data, ...remarks];
                        toast.success("Remark added");
                      }

                      setRemarks(updatedRemarks);
                      setRemarkFormOpen(false);
                      setEditingRemark(null);
                      setRemarkTitle("");
                      setRemarkContent("");
                      setRemarkAttachments([]);
                    } catch (err) {
                      toast.error(
                        editingRemark
                          ? "Failed to update remark"
                          : "Failed to add remark"
                      );
                    } finally {
                      setRemarkLoading(false);
                    }
                  }}
                >
                  {remarkLoading ? "Saving..." : editingRemark ? "Update" : "Submit"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Task Alert Dialog */}
        <AlertDialog open={!!deleteTaskId} onOpenChange={() => setDeleteTaskId(null)}>
          <AlertDialogContent className="rounded-2xl shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold text-rose-600">
                Delete Task?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this task? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl"
                onClick={handleConfirmDelete}
              >
                Delete Task
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Remark Alert Dialog */}
        <AlertDialog open={!!deleteRemarkId} onOpenChange={() => setDeleteRemarkId(null)}>
          <AlertDialogContent className="rounded-2xl shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold text-rose-600">
                Delete Remark?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this remark?
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl"
                onClick={handleDeleteRemark}
              >
                Delete Remark
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Manage Assignees Sheet */}
        <Sheet open={assigneeSheetOpen} onOpenChange={setAssigneeSheetOpen}>
          <SheetContent side="right" className="w-full sm:w-[500px] max-w-full p-6 rounded-l-2xl shadow-2xl flex flex-col h-full">
            <SheetHeader className="border-b pb-3 flex-shrink-0">
              <SheetTitle className="text-xl font-bold">Manage Task Assignees</SheetTitle>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              <p className="text-xs text-gray-500">
                Select employees to assign to task <span className="font-semibold text-gray-800 dark:text-gray-200">{activeTaskForAssignee?.title}</span>.
              </p>

              <div className="space-y-2">
                {employees.map((emp) => {
                  const isSelected = selectedAssignees.includes(emp.id);

                  return (
                    <div
                      key={emp.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedAssignees((prev) => prev.filter((id) => id !== emp.id));
                        } else {
                          setSelectedAssignees((prev) => [...prev, emp.id]);
                        }
                      }}
                      className={`p-3 rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer flex items-center justify-between transition-colors ${
                        isSelected ? "bg-blue-50/80 border-blue-300 dark:bg-blue-950/40 dark:border-blue-800 font-semibold" : "hover:bg-gray-50 dark:hover:bg-gray-900"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                          {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0)}
                        </div>
                        <span className="text-sm font-medium">{emp.firstName} {emp.lastName}</span>
                      </div>

                      {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end gap-3 flex-shrink-0">
              <Button variant="outline" onClick={() => setAssigneeSheetOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md"
                onClick={async () => {
                  if (!activeTaskForAssignee) return;
                  try {
                    await taskAPI.updateTaskAssignees(activeTaskForAssignee.id, selectedAssignees);
                    toast.success("Assignees updated");
                    setAssigneeSheetOpen(false);
                    fetchTasks();
                  } catch (err) {
                    toast.error("Failed to update assignees");
                  }
                }}
              >
                Save Assignees
              </Button>
            </div>
          </SheetContent>
        </Sheet>

      </div>
    </DndProvider>
  );
};
