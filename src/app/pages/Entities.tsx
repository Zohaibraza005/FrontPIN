import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Search, Plus, Edit, Trash2, Building2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { entityAPI, locationAPI } from "../services/api";

interface Entity {
  id: number;
  name: string;
  code: string;
  description: string | null;
  status: string;
  organizationId: number;
  companyId: number | null;
  company?: {
    id: number;
    name: string;
  } | null;
  _count?: {
    employees: number;
  };
  createdAt: string;
  updatedAt: string;
}

export const Entities: React.FC = () => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Modal State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);

  // Form Fields
  const [entityName, setEntityName] = useState("");
  const [entityCode, setEntityCode] = useState("");
  const [entityDescription, setEntityDescription] = useState("");
  const [entityLocation, setEntityLocation] = useState<string>("none");
  const [entityStatus, setEntityStatus] = useState("active");

  useEffect(() => {
    fetchEntities();
    fetchLocations();
  }, []);

  const fetchEntities = async () => {
    try {
      setLoading(true);
      const res = await entityAPI.getEntities();
      if (res?.data) {
        setEntities(res.data);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load entities");
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await locationAPI.getLocations();
      if (res?.data) {
        setLocations(res.data);
      }
    } catch (err) {
      console.error("Failed to load locations:", err);
    }
  };

  const openAddDialog = () => {
    setEditingEntity(null);
    setEntityName("");
    setEntityCode("");
    setEntityDescription("");
    setEntityLocation("none");
    setEntityStatus("active");
    setDialogOpen(true);
  };

  const openEditDialog = (item: Entity) => {
    setEditingEntity(item);
    setEntityName(item.name);
    setEntityCode(item.code);
    setEntityDescription(item.description || "");
    setEntityLocation(item.companyId ? String(item.companyId) : "none");
    setEntityStatus(item.status || "active");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!entityName.trim()) {
      toast.error("Please enter an Entity Name");
      return;
    }
    if (!entityCode.trim()) {
      toast.error("Please enter an Entity Code");
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        name: entityName.trim(),
        code: entityCode.trim().toUpperCase(),
        description: entityDescription.trim() || null,
        status: entityStatus,
        companyId: entityLocation !== "none" ? parseInt(entityLocation) : null,
      };

      if (editingEntity) {
        await entityAPI.updateEntity(editingEntity.id, payload);
        toast.success("Entity updated successfully");
      } else {
        await entityAPI.createEntity(payload);
        toast.success("Entity created successfully");
      }

      setDialogOpen(false);
      await fetchEntities();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save entity");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this entity?")) {
      return;
    }

    try {
      await entityAPI.deleteEntity(id);
      toast.success("Entity deleted successfully");
      await fetchEntities();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete entity");
    }
  };

  const filteredEntities = entities.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      (item.company && item.company.name.toLowerCase().includes(q));

    const matchesStatus =
      filterStatus === "all" || item.status.toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const isAct = status?.toLowerCase() === "active";
    return (
      <Badge
        className={
          isAct
            ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
            : "bg-red-100 text-red-800 border-red-200 hover:bg-red-200"
        }
      >
        {isAct ? "Active" : "Inactive"}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-900">Entity Management</h2>
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              {entities.length} {entities.length === 1 ? "Entity" : "Entities"}
            </Badge>
          </div>
          <p className="text-gray-600 text-sm mt-0.5">
            Manage organizational business entities, legal units, and codes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchEntities}
            disabled={loading}
            className="hidden sm:inline-flex"
          >
            <RefreshCw className={`size-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 size-4" />
            Add Entity
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[220px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Search by name, code, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Entities List</CardTitle>
          <span className="text-xs text-gray-500">
            Showing {filteredEntities.length} of {entities.length}
          </span>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Entity Code</TableHead>
                  <TableHead>Entity Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Location / Branch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Loading entities...
                    </TableCell>
                  </TableRow>
                ) : filteredEntities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Building2 className="size-10 text-gray-300" />
                        <p className="font-medium text-gray-600">No entities found</p>
                        <p className="text-xs text-gray-400">
                          {searchQuery || filterStatus !== "all"
                            ? "Try adjusting your search query or filter"
                            : "Click 'Add Entity' to create your first business entity"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntities.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-200">
                          {item.code}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">
                        {item.name}
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate text-gray-600 text-sm">
                        {item.description || "—"}
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {item.company?.name || "—"}
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Edit Entity"
                            onClick={() => openEditDialog(item)}
                          >
                            <Edit className="size-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Delete Entity"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="size-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingEntity ? "Edit Entity" : "Add New Entity"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            {/* Entity Name */}
            <div className="space-y-1.5">
              <Label htmlFor="entityName">
                Entity Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="entityName"
                placeholder="e.g. Frontpin Global Inc."
                value={entityName}
                onChange={(e) => setEntityName(e.target.value)}
              />
            </div>

            {/* Entity Code */}
            <div className="space-y-1.5">
              <Label htmlFor="entityCode">
                Entity Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="entityCode"
                placeholder="e.g. ENT-001 or FP-HQ"
                value={entityCode}
                onChange={(e) => setEntityCode(e.target.value)}
                className="font-mono uppercase"
              />
              <p className="text-[11px] text-gray-500">
                Unique code identifier used for organizational reporting and employee binding.
              </p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="entityDescription">Description</Label>
              <Textarea
                id="entityDescription"
                placeholder="Brief description or purpose of this entity..."
                rows={3}
                value={entityDescription}
                onChange={(e) => setEntityDescription(e.target.value)}
              />
            </div>

            {/* Location / Branch */}
            <div className="space-y-1.5">
              <Label>Location / Company Branch (Optional)</Label>
              <Select value={entityLocation} onValueChange={setEntityLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None / Organization-wide</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={String(loc.id)}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label>
                Status <span className="text-red-500">*</span>
              </Label>
              <Select value={entityStatus} onValueChange={setEntityStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingEntity ? "Update Entity" : "Create Entity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default Entities;
