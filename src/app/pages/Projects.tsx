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
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { SearchableSelect } from "../components/ui/SearchableSelect";
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
  Plus,
  Search,
  Calendar,
  X,
  Edit2,
  Check,
  Trash2,
  MoreVertical,
  Eye,
  Pencil,
  Kanban as KanbanIcon,
  LayoutGrid,
  Table as TableIcon,
  FolderKanban,
  User,
  Clock,
  DollarSign,
  Briefcase,
  Layers,
  ArrowUpRight,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { ScrollArea } from "../components/ui/scroll-area";

import { projectAPI } from "../services/api";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Link, useNavigate } from "react-router";

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

interface Project {
  id: number;
  title: string;
  description?: string;
  status: "PLANNING" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  progress: number;
  startDate: string;
  endDate: string;
  client?: { name: string; id?: number };
  budget?: number;
}

const STATUS_CONFIG: Record<string, { badge: string; border: string; dot: string; label: string }> = {
  PLANNING: {
    label: "Planning",
    badge: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-800",
    border: "border-t-slate-400",
    dot: "bg-slate-400"
  },
  IN_PROGRESS: {
    label: "In Progress",
    badge: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
    border: "border-t-blue-500",
    dot: "bg-blue-500"
  },
  ON_HOLD: {
    label: "On Hold",
    badge: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
    border: "border-t-amber-500",
    dot: "bg-amber-500"
  },
  COMPLETED: {
    label: "Completed",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    border: "border-t-emerald-500",
    dot: "bg-emerald-500"
  },
  CANCELLED: {
    label: "Cancelled",
    badge: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
    border: "border-t-rose-500",
    dot: "bg-rose-500"
  },
};

const ProjectCard: React.FC<{
  project: Project;
  onDrop: (projectId: number, newStatus: string) => void;
  onAction: (type: string, project: Project) => void;
}> = ({ project, onDrop, onAction }) => {
  const [{ isDragging }, drag] = useDrag({
    type: "PROJECT",
    item: { id: project.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.PLANNING;

  return (
    <div
      ref={drag}
      className={`bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200/80 dark:border-gray-800 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all ${
        statusCfg.border
      } border-t-4 ${isDragging ? "opacity-30 scale-95" : ""}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
          {project.title}
        </h4>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 -mr-1">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 z-50">
            <DropdownMenuItem onSelect={() => onAction("view", project)} className="cursor-pointer gap-2">
              <Eye className="w-4 h-4 text-gray-500" />
              <span>View Details</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onAction("edit", project)} className="cursor-pointer gap-2">
              <Pencil className="w-4 h-4 text-blue-600" />
              <span>Edit Project</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-rose-600 focus:text-rose-600 cursor-pointer gap-2"
              onSelect={() => onAction("delete", project)}
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Project</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3.5 line-clamp-2 leading-relaxed">
        {project.description || "No description provided"}
      </p>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <User className="w-3.5 h-3.5" /> Client
          </span>
          <span className="font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[120px]">
            {project.client?.name || "—"}
          </span>
        </div>

        <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <Clock className="w-3.5 h-3.5" /> Timeline
          </span>
          <span className="font-mono text-[11px]">
            {formatDate(project.startDate)} – {formatDate(project.endDate)}
          </span>
        </div>

        <div className="pt-1">
          <div className="flex justify-between text-[11px] text-gray-500 mb-1 font-medium">
            <span>Progress</span>
            <span className="font-bold text-gray-800 dark:text-gray-200">{Math.round(project.progress || 0)}%</span>
          </div>
          <Progress value={project.progress || 0} className="h-1.5 rounded-full" />
        </div>
      </div>
    </div>
  );
};

const KanbanColumn: React.FC<{
  title: string;
  status: string;
  projects: Project[];
  onDrop: (projectId: number, status: string) => void;
  onAction: (type: string, project: Project) => void;
}> = ({ title, status, projects, onDrop, onAction }) => {
  const [{ isOver }, drop] = useDrop({
    accept: "PROJECT",
    drop: (item: { id: number }) => onDrop(item.id, status),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.PLANNING;

  return (
    <div
      ref={drop}
      className={`w-full bg-gray-50/70 dark:bg-gray-900/40 rounded-2xl p-3.5 border border-gray-200/80 dark:border-gray-800/80 flex flex-col transition-all ${
        isOver ? "ring-2 ring-blue-500 bg-blue-50/30 dark:bg-blue-950/20 border-blue-300" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3.5 sticky top-0 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-md z-10 py-1 px-1 rounded-lg">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${statusCfg.dot}`} />
          <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300">
            {title}
          </h3>
        </div>
        <Badge variant="secondary" className="text-xs font-bold px-2 py-0.5 rounded-full">
          {projects.length}
        </Badge>
      </div>

      <div className="space-y-3 min-h-[300px] flex-1">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onDrop={onDrop}
            onAction={onAction}
          />
        ))}
        {projects.length === 0 && (
          <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <span>No projects in {title}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const Projects: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState<"kanban" | "grid" | "table">(
    "kanban"
  );

  // New Project Form
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [clientType, setClientType] = useState<"existing" | "new">("existing");
  const [selectedClient, setSelectedClient] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [clientZip, setClientZip] = useState("");
  const [clientState, setClientState] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectStartDate, setProjectStartDate] = useState("");
  const [projectEndDate, setProjectEndDate] = useState("");
  const [projectBudget, setProjectBudget] = useState<number>(0);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Edit Project Dialog State
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<any>("PLANNING");
  const [editProgress, setEditProgress] = useState<number>(0);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editBudget, setEditBudget] = useState<number>(0);

  // Delete confirmation
  const [deleteProjectId, setDeleteProjectId] = useState<number | null>(null);

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = searchQuery
      ? project.title.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const matchesStatus =
      filterStatus === "all" || project.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const planning = filteredProjects.filter((p) => p.status === "PLANNING");
  const inProgress = filteredProjects.filter((p) => p.status === "IN_PROGRESS");
  const onHold = filteredProjects.filter((p) => p.status === "ON_HOLD");
  const completed = filteredProjects.filter((p) => p.status === "COMPLETED");
  const cancelled = filteredProjects.filter((p) => p.status === "CANCELLED");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, clientsRes] = await Promise.all([
        projectAPI.getProjects(),
        projectAPI.getClients(),
      ]);
      setProjects(projectsRes.data || []);
      setClients(clientsRes.data || []);
    } catch (err) {
      toast.error("Failed to load projects or clients");
    }
  };

  const handleDrop = async (projectId: number, newStatus: string) => {
    const oldProjects = [...projects];

    // Optimistic UI update
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, status: newStatus as any } : p
      )
    );

    try {
      await projectAPI.updateProjectStatus(projectId, { status: newStatus });
      toast.success("Project status updated");
    } catch (err) {
      setProjects(oldProjects);
      toast.error("Failed to update project status");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteProjectId) return;

    try {
      await projectAPI.deleteProject(deleteProjectId);
      setProjects((prev) => prev.filter((p) => p.id !== deleteProjectId));
      toast.success("Project deleted successfully");
    } catch (err) {
      toast.error("Failed to delete project");
    } finally {
      setDeleteProjectId(null);
    }
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setEditTitle(project.title || "");
    setEditDescription(project.description || "");
    setEditStatus(project.status || "PLANNING");
    setEditProgress(project.progress || 0);
    setEditStartDate(project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : "");
    setEditEndDate(project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : "");
    setEditBudget(project.budget || 0);
    setEditProjectOpen(true);
  };

  const handleUpdateProject = async () => {
    if (!editingProject || !editTitle) {
      toast.error("Project title is required");
      return;
    }

    try {
      const payload: any = {
        title: editTitle,
        description: editDescription,
        status: editStatus,
        progress: editProgress,
        startDate: editStartDate,
        endDate: editEndDate,
        budget: editBudget || undefined,
      };

      const formData = new FormData();
      formData.append("data", JSON.stringify(payload));

      await projectAPI.updateProject(editingProject.id, formData);
      toast.success("Project updated successfully");
      setEditProjectOpen(false);
      fetchData();
    } catch (err) {
      try {
        await projectAPI.updateProjectStatus(editingProject.id, { status: editStatus, progress: editProgress });
        toast.success("Project status updated");
        setEditProjectOpen(false);
        fetchData();
      } catch (err2) {
        toast.error("Failed to update project");
      }
    }
  };

  const handleCreateProject = async () => {
    const errors: Record<string, string> = {};

    if (clientType === "existing") {
      if (!selectedClient) {
        errors.selectedClient = "Please select an existing client";
      }
    } else {
      if (!clientName || !clientName.trim()) {
        errors.clientName = "Client name is required";
      }
      if (!clientPhone || !clientPhone.trim()) {
        errors.clientPhone = "Client phone number is required";
      }
      if (!clientAddress || !clientAddress.trim()) {
        errors.clientAddress = "Client street address is required";
      }
      if (!clientCity || !clientCity.trim()) {
        errors.clientCity = "Client city is required";
      }
      if (!clientZip || !clientZip.trim()) {
        errors.clientZip = "Client zip code is required";
      }
      if (!clientState || !clientState.trim()) {
        errors.clientState = "Client state is required";
      }
    }

    if (!projectTitle || !projectTitle.trim()) {
      errors.projectTitle = "Project title is required";
    }

    if (!projectStartDate) {
      errors.projectStartDate = "Start date is required";
    }

    if (!projectEndDate) {
      errors.projectEndDate = "End date is required";
    } else if (projectStartDate && new Date(projectStartDate) > new Date(projectEndDate)) {
      errors.projectEndDate = "End date cannot be earlier than start date";
    }

    setFormErrors(errors);

    const firstError = Object.values(errors)[0];
    if (firstError) {
      toast.error(firstError);
      return;
    }

    try {
      const formData = new FormData();

      const payload: any = {
        title: projectTitle.trim(),
        description: projectDescription.trim(),
        startDate: projectStartDate,
        endDate: projectEndDate,
        budget: projectBudget || undefined,
        clientType,
      };

      if (clientType === "existing") {
        payload.clientId = selectedClient;
      } else {
        payload.client = {
          name: clientName.trim(),
          phone: clientPhone.trim(),
          email: clientEmail.trim() || undefined,
          address: clientAddress.trim(),
          city: clientCity.trim(),
          zip: clientZip.trim(),
          state: clientState.trim(),
        };
      }

      formData.append("data", JSON.stringify(payload));

      attachments.forEach((file) => {
        formData.append("attachments", file);
      });

      await projectAPI.createProject(formData);

      toast.success("Project created successfully");
      setNewProjectOpen(false);
      // Reset form
      setProjectTitle("");
      setProjectDescription("");
      setProjectStartDate("");
      setProjectEndDate("");
      setProjectBudget(0);
      setClientType("existing");
      setSelectedClient("");
      setClientName("");
      setClientPhone("");
      setClientEmail("");
      setClientAddress("");
      setClientCity("");
      setClientZip("");
      setClientState("");
      setAttachments([]);
      setFormErrors({});

      fetchData();
    } catch (err: any) {
      const errorMessage = err?.data?.message || err?.message || "Failed to create project";
      toast.error(errorMessage);
    }
  };

  const handleAction = (type: string, project: Project) => {
    if (type === "delete") {
      setDeleteProjectId(project.id);
      return;
    }
    if (type === "edit") {
      openEditModal(project);
      return;
    }
    if (type === "view") {
      navigate(`/projects/${project.id}`);
      return;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6 max-w-[1600px] mx-auto p-1 sm:p-2 pb-12">

        {/* Simple Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Project Management</h2>
            <p className="text-gray-500 text-sm">
              Organize, monitor, and deliver projects efficiently with real-time status tracking.
            </p>
          </div>

          {/* Create New Project Dialog Trigger */}
          <Dialog open={newProjectOpen} onOpenChange={(open) => { setNewProjectOpen(open); if (!open) setFormErrors({}); }}>
            <DialogTrigger asChild>
              <Button className="shadow-sm">
                <Plus className="mr-2 size-4" />
                New Project
              </Button>
            </DialogTrigger>
              
              <DialogContent className="max-w-2xl rounded-2xl shadow-2xl p-6">
                <DialogHeader className="border-b pb-3">
                  <DialogTitle className="text-xl font-bold">Create New Project</DialogTitle>
                </DialogHeader>
                
                <ScrollArea className="max-h-[70vh] py-4 pr-4">
                  <div className="space-y-6">
                    {/* Client Section */}
                    <div className="space-y-4">
                      <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wider">Client Information</h3>
                      
                      <RadioGroup
                        value={clientType}
                        onValueChange={(value: "existing" | "new") => {
                          setClientType(value);
                          setFormErrors({});
                        }}
                        className="flex items-center gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="existing" id="existing" />
                          <Label htmlFor="existing" className="cursor-pointer font-medium">Existing Client</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="new" id="new" />
                          <Label htmlFor="new" className="cursor-pointer font-medium">New Client</Label>
                        </div>
                      </RadioGroup>
                      
                      {clientType === "existing" ? (
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold">Select Client *</Label>
                          <SearchableSelect
                            className={`w-full rounded-lg ${formErrors.selectedClient ? 'border-red-500' : ''}`}
                            placeholder="Select existing client"
                            searchPlaceholder="Search client..."
                            value={selectedClient}
                            onValueChange={(val) => {
                              setSelectedClient(val);
                              setFormErrors((prev) => ({ ...prev, selectedClient: "" }));
                            }}
                            options={clients?.map((client) => ({
                              value: client.id.toString(),
                              label: client.name,
                              sublabel: client.email || client.phone || "",
                            })) || []}
                          />
                          {formErrors.selectedClient && (
                            <p className="text-xs text-red-500 mt-1">{formErrors.selectedClient}</p>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Name *</Label>
                            <Input
                              value={clientName}
                              onChange={(e) => {
                                setClientName(e.target.value);
                                setFormErrors((prev) => ({ ...prev, clientName: "" }));
                              }}
                              placeholder="Client name"
                              className={`rounded-lg ${formErrors.clientName ? 'border-red-500' : ''}`}
                            />
                            {formErrors.clientName && (
                              <p className="text-xs text-red-500 mt-1">{formErrors.clientName}</p>
                            )}
                          </div>
                          
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Phone *</Label>
                            <Input
                              value={clientPhone}
                              onChange={(e) => {
                                setClientPhone(e.target.value);
                                setFormErrors((prev) => ({ ...prev, clientPhone: "" }));
                              }}
                              placeholder="Phone number"
                              className={`rounded-lg ${formErrors.clientPhone ? 'border-red-500' : ''}`}
                            />
                            {formErrors.clientPhone && (
                              <p className="text-xs text-red-500 mt-1">{formErrors.clientPhone}</p>
                            )}
                          </div>
                          
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Email (optional)</Label>
                            <Input
                              value={clientEmail}
                              onChange={(e) => setClientEmail(e.target.value)}
                              placeholder="Email"
                              className="rounded-lg"
                            />
                          </div>
                          
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Street Address *</Label>
                            <Input
                              value={clientAddress}
                              onChange={(e) => {
                                setClientAddress(e.target.value);
                                setFormErrors((prev) => ({ ...prev, clientAddress: "" }));
                              }}
                              placeholder="Street address"
                              className={`rounded-lg ${formErrors.clientAddress ? 'border-red-500' : ''}`}
                            />
                            {formErrors.clientAddress && (
                              <p className="text-xs text-red-500 mt-1">{formErrors.clientAddress}</p>
                            )}
                          </div>
                          
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">City *</Label>
                            <Input
                              value={clientCity}
                              onChange={(e) => {
                                setClientCity(e.target.value);
                                setFormErrors((prev) => ({ ...prev, clientCity: "" }));
                              }}
                              placeholder="City"
                              className={`rounded-lg ${formErrors.clientCity ? 'border-red-500' : ''}`}
                            />
                            {formErrors.clientCity && (
                              <p className="text-xs text-red-500 mt-1">{formErrors.clientCity}</p>
                            )}
                          </div>
                          
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Zip Code *</Label>
                            <Input
                              value={clientZip}
                              onChange={(e) => {
                                setClientZip(e.target.value);
                                setFormErrors((prev) => ({ ...prev, clientZip: "" }));
                              }}
                              placeholder="Zip code"
                              className={`rounded-lg ${formErrors.clientZip ? 'border-red-500' : ''}`}
                            />
                            {formErrors.clientZip && (
                              <p className="text-xs text-red-500 mt-1">{formErrors.clientZip}</p>
                            )}
                          </div>
                          
                          <div className="space-y-1.5 col-span-2">
                            <Label className="text-xs font-semibold">State *</Label>
                            <Input
                              value={clientState}
                              onChange={(e) => {
                                setClientState(e.target.value);
                                setFormErrors((prev) => ({ ...prev, clientState: "" }));
                              }}
                              placeholder="State"
                              className={`rounded-lg ${formErrors.clientState ? 'border-red-500' : ''}`}
                            />
                            {formErrors.clientState && (
                              <p className="text-xs text-red-500 mt-1">{formErrors.clientState}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Project Section */}
                    <div className="space-y-4 pt-2 border-t">
                      <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wider">Project Details</h3>
                      
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Project Title *</Label>
                        <Input
                          value={projectTitle}
                          onChange={(e) => {
                            setProjectTitle(e.target.value);
                            setFormErrors((prev) => ({ ...prev, projectTitle: "" }));
                          }}
                          placeholder="Enter project title"
                          className={`rounded-lg ${formErrors.projectTitle ? 'border-red-500' : ''}`}
                        />
                        {formErrors.projectTitle && (
                          <p className="text-xs text-red-500 mt-1">{formErrors.projectTitle}</p>
                        )}
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Description</Label>
                        <Textarea
                          value={projectDescription}
                          onChange={(e) => setProjectDescription(e.target.value)}
                          placeholder="Project description"
                          rows={3}
                          className="rounded-lg"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Attachments</Label>
                        <Input type="file" multiple onChange={handleFileChange} className="rounded-lg" />
                        
                        {attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {attachments?.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 dark:bg-gray-900 p-2 rounded-lg"
                              >
                                <span>{file.name}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => removeAttachment(index)}
                                >
                                  <X className="w-3.5 h-3.5 text-gray-400" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Start Date *</Label>
                          <Input
                            type="date"
                            value={projectStartDate}
                            onChange={(e) => {
                              setProjectStartDate(e.target.value);
                              setFormErrors((prev) => ({ ...prev, projectStartDate: "" }));
                            }}
                            className={`rounded-lg ${formErrors.projectStartDate ? 'border-red-500' : ''}`}
                          />
                          {formErrors.projectStartDate && (
                            <p className="text-xs text-red-500 mt-1">{formErrors.projectStartDate}</p>
                          )}
                        </div>
                        
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">End Date *</Label>
                          <Input
                            type="date"
                            value={projectEndDate}
                            onChange={(e) => {
                              setProjectEndDate(e.target.value);
                              setFormErrors((prev) => ({ ...prev, projectEndDate: "" }));
                            }}
                            className={`rounded-lg ${formErrors.projectEndDate ? 'border-red-500' : ''}`}
                          />
                          {formErrors.projectEndDate && (
                            <p className="text-xs text-red-500 mt-1">{formErrors.projectEndDate}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
                
                <div className="flex gap-2 justify-end pt-4 border-t mt-2">
                  <Button
                    variant="outline"
                    onClick={() => setNewProjectOpen(false)}
                    className="rounded-xl"
                  >
                    Cancel 
                  </Button>
                  <Button onClick={handleCreateProject} className="bg-blue-600 hover:bg-blue-700 font-bold rounded-xl">
                    Create Project 
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
        </div>

        {/* Toolbar: Search, Status Filter & View Modes */}
        <Card className="shadow-lg border-gray-200/80 dark:border-gray-800 rounded-2xl">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              
              {/* Search & Filter */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border-gray-200 dark:border-gray-800 shadow-sm"
                  />
                </div>

                <SearchableSelect
                  className="w-full sm:w-48 bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border-gray-200 dark:border-gray-800 shadow-sm"
                  placeholder="All Status"
                  searchPlaceholder="Search status..."
                  value={filterStatus}
                  onValueChange={setFilterStatus}
                  options={[
                    { value: "all", label: "All Status" },
                    { value: "PLANNING", label: "Planning" },
                    { value: "IN_PROGRESS", label: "In Progress" },
                    { value: "ON_HOLD", label: "On Hold" },
                    { value: "COMPLETED", label: "Completed" },
                    { value: "CANCELLED", label: "Cancelled" },
                  ]}
                />
              </div>

              {/* View Switcher Tabs */}
              <Tabs
                value={viewMode}
                onValueChange={(v) => setViewMode(v as any)}
                className="w-full md:w-auto"
              >
                <TabsList className="grid w-full grid-cols-3 max-w-xs bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
                  <TabsTrigger value="kanban" className="rounded-lg text-xs font-semibold gap-1.5">
                    <KanbanIcon className="w-3.5 h-3.5" />
                    Kanban
                  </TabsTrigger>
                  <TabsTrigger value="grid" className="rounded-lg text-xs font-semibold gap-1.5">
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Grid
                  </TabsTrigger>
                  <TabsTrigger value="table" className="rounded-lg text-xs font-semibold gap-1.5">
                    <TableIcon className="w-3.5 h-3.5" />
                    Table
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* View Contents */}
        <Tabs value={viewMode}>
          
          {/* ── KANBAN VIEW ────────────────────────────────────────────── */}
          <TabsContent value="kanban" className="mt-0">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 pt-2">
              <KanbanColumn
                title="Planning"
                status="PLANNING"
                projects={planning}
                onDrop={handleDrop}
                onAction={handleAction}
              />
              <KanbanColumn
                title="In Progress"
                status="IN_PROGRESS"
                projects={inProgress}
                onDrop={handleDrop}
                onAction={handleAction}
              />
              <KanbanColumn
                title="On Hold"
                status="ON_HOLD"
                projects={onHold}
                onDrop={handleDrop}
                onAction={handleAction}
              />
              <KanbanColumn
                title="Completed"
                status="COMPLETED"
                projects={completed}
                onDrop={handleDrop}
                onAction={handleAction}
              />
              <KanbanColumn
                title="Cancelled"
                status="CANCELLED"
                projects={cancelled}
                onDrop={handleDrop}
                onAction={handleAction}
              />
            </div>
          </TabsContent>

          {/* ── GRID VIEW ──────────────────────────────────────────────── */}
          <TabsContent value="grid" className="mt-0 pt-2">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => {
                const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.PLANNING;
                return (
                  <Card
                    key={project.id}
                    className="hover:shadow-lg transition-all border-gray-200/80 dark:border-gray-800 rounded-2xl overflow-hidden flex flex-col justify-between"
                  >
                    <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-900/40">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="line-clamp-1 text-base font-bold">
                            {project.title}
                          </CardTitle>
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            <span>{project.client?.name || "No Client"}</span>
                          </p>
                        </div>
                        <Badge className={`px-2.5 py-0.5 border font-semibold text-[11px] ${statusCfg.badge}`}>
                          {statusCfg.label}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-4 pb-5 space-y-4 flex-1">
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                        {project.description || "No description provided."}
                      </p>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center text-gray-500">
                          <span>Timeline</span>
                          <span className="font-mono text-gray-800 dark:text-gray-200">
                            {formatDate(project.startDate)} – {formatDate(project.endDate)}
                          </span>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Progress</span>
                            <span className="font-bold text-gray-900 dark:text-gray-100">{project.progress || 0}%</span>
                          </div>
                          <Progress value={project.progress || 0} className="h-2 rounded-full" />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 h-9 gap-1.5 text-xs font-semibold rounded-xl"
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Details
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-xl"
                          onClick={() => openEditModal(project)}
                          title="Edit Project"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-xl"
                          onClick={() => setDeleteProjectId(project.id)}
                          title="Delete Project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {filteredProjects.length === 0 && (
                <div className="col-span-full py-16 text-center text-gray-400 bg-white dark:bg-gray-950 border border-dashed rounded-2xl">
                  No projects match your filter criteria.
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── TABLE VIEW (ACTION FIXED & ACTIVE) ───────────────────────── */}
          <TabsContent value="table" className="mt-0 pt-2">
            <Card className="shadow-lg border-gray-200/80 dark:border-gray-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50/80 dark:bg-gray-900">
                    <TableRow>
                      <TableHead className="font-bold text-gray-700 dark:text-gray-300">Project Title</TableHead>
                      <TableHead className="font-bold text-gray-700 dark:text-gray-300">Client</TableHead>
                      <TableHead className="font-bold text-gray-700 dark:text-gray-300">Status</TableHead>
                      <TableHead className="font-bold text-gray-700 dark:text-gray-300">Progress</TableHead>
                      <TableHead className="font-bold text-gray-700 dark:text-gray-300">Timeline</TableHead>
                      <TableHead className="font-bold text-gray-700 dark:text-gray-300 text-right pr-6">Action Section</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredProjects.map((project) => {
                      const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.PLANNING;
                      return (
                        <TableRow key={project.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/40 transition-colors">
                          <TableCell className="font-bold text-gray-900 dark:text-gray-100">
                            <div className="flex flex-col">
                              <span>{project.title}</span>
                              {project.description && (
                                <span className="text-[11px] text-gray-400 font-normal line-clamp-1 max-w-xs">
                                  {project.description}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="text-gray-700 dark:text-gray-300 font-medium text-xs">
                            {project.client?.name || "—"}
                          </TableCell>

                          <TableCell>
                            <Badge className={`px-2.5 py-0.5 border font-semibold text-[11px] ${statusCfg.badge}`}>
                              {statusCfg.label}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2.5 min-w-[120px]">
                              <Progress
                                value={project.progress || 0}
                                className="w-20 h-2 rounded-full"
                              />
                              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                {Math.round(project.progress || 0)}%
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                            {formatDate(project.startDate)} – {formatDate(project.endDate)}
                          </TableCell>

                          {/* ACTION SECTION - 3 ACTIVE BUTTONS + 3 ACTIVE DOTS MENU */}
                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Direct View Button */}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 px-2.5 text-xs gap-1 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-800 rounded-lg shadow-sm"
                                onClick={() => navigate(`/projects/${project.id}`)}
                                title="View Project Details"
                              >
                                <Eye className="w-3.5 h-3.5 text-gray-500" />
                                <span>View</span>
                              </Button>

                              {/* Direct Edit Button */}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 px-2.5 text-xs gap-1 text-blue-600 hover:bg-blue-50 border-blue-200 dark:border-blue-900 rounded-lg shadow-sm"
                                onClick={() => openEditModal(project)}
                                title="Edit Project"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </Button>

                              {/* Direct Delete Button */}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 px-2.5 text-xs gap-1 text-rose-600 hover:bg-rose-50 border-rose-200 dark:border-rose-900 rounded-lg shadow-sm"
                                onClick={() => setDeleteProjectId(project.id)}
                                title="Delete Project"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </Button>

                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {filteredProjects.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-12 text-center text-gray-500">
                          No projects found matching the filter criteria.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── EDIT PROJECT DIALOG ────────────────────────────────────── */}
        <Dialog open={editProjectOpen} onOpenChange={setEditProjectOpen}>
          <DialogContent className="max-w-md rounded-2xl shadow-2xl p-6">
            <DialogHeader className="border-b pb-3">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600" />
                <span>Edit Project</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Project Title *
                </Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Project title"
                  className="rounded-lg shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Description
                </Label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Project description"
                  rows={3}
                  className="rounded-lg shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className="rounded-lg shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLANNING">Planning</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="ON_HOLD">On Hold</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Progress ({editProgress}%)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={editProgress}
                    onChange={(e) => setEditProgress(Number(e.target.value))}
                    className="rounded-lg shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Start Date
                  </Label>
                  <Input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="rounded-lg shadow-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    End Date
                  </Label>
                  <Input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="rounded-lg shadow-sm"
                  />
                </div>
              </div>

              <Button
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 font-bold rounded-xl shadow-md transition-all mt-3"
                onClick={handleUpdateProject}
              >
                Save Project Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── DELETE CONFIRMATION ALERT DIALOG ───────────────────────── */}
        <AlertDialog
          open={!!deleteProjectId}
          onOpenChange={() => setDeleteProjectId(null)}
        >
          <AlertDialogContent className="rounded-2xl shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold text-rose-600">Delete Project?</AlertDialogTitle>
            </AlertDialogHeader>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This action cannot be undone. All related tasks and project data will be permanently removed.
            </p>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl"
                onClick={handleDeleteConfirm}
              >
                Delete Project
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </DndProvider>
  );
};
