import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { departmentAPI, locationAPI } from '../services/api';

// Mock departments data
const mockDepartments = [
  { id: 'dept1', title: 'Sales', location: 'Head Office', status: 'active' },
  { id: 'dept2', title: 'Marketing', location: 'Branch A', status: 'active' },
  { id: 'dept3', title: 'IT', location: 'Head Office', status: 'inactive' },
  { id: 'dept4', title: 'HR', location: 'Branch B', status: 'active' },
  { id: 'dept5', title: 'Finance', location: 'Head Office', status: 'active' },
];



export const Departments: React.FC = () => {
    const [departments, setDepartments] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);

  // Form states
  const [deptTitle, setDeptTitle] = useState('');
  const [deptLocation, setDeptLocation] = useState('');
  const [deptStatus, setDeptStatus] = useState('active');

  const filteredDepartments = departments.filter((dept) => {
    if (searchQuery && !dept.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterStatus !== 'all' && dept.status !== filterStatus) return false;
    return true;
  });
  useEffect(() => {
    fetchDepartments();
    fetchLocations();
  }, []);
  
  const fetchDepartments = async () => {
    const res = await departmentAPI.getDepartments();
    setDepartments(res.data);
  };
  
  const fetchLocations = async () => {
    const res = await locationAPI.getLocations();
    setLocations(res.data);
  };
  
  const openAddDialog = () => {
    setEditingDept(null);
    setDeptTitle('');
    setDeptLocation('');
    setDeptStatus('active');
    setDialogOpen(true);
  };

  const openEditDialog = (dept: any) => {
    setEditingDept(dept);
    setDeptTitle(dept.title);
    setDeptLocation(dept.location);
    setDeptStatus(dept.status);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!deptTitle || !deptLocation) {
      toast.error("Please fill all required fields");
      return;
    }
  
    if (editingDept) {
      await departmentAPI.updateDepartment(editingDept.id, {
        title: deptTitle,
        companyId: deptLocation,
        status: deptStatus,
      });
      toast.success("Department updated");
    } else {
      await departmentAPI.createDepartment({
        title: deptTitle,
        companyId: deptLocation,
        status: deptStatus,
      });
      toast.success("Department created");
    }
  
    setDialogOpen(false);
    fetchDepartments();
  };
  
  const handleDelete = async (id: number) => {
    if (!confirm("Delete this department?")) return;
  
    await departmentAPI.deleteDepartment(id);
    toast.success("Department deleted");
    fetchDepartments();
  };

  const getStatusBadge = (status: string) => {
    return <Badge className={status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Department Management</h2>
          <p className="text-gray-600">Manage departments and their details</p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="mr-2 size-4" />
          Add Department
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Search departments..."
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

      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.title}</TableCell>
                    <TableCell>{dept?.company?.name}</TableCell>
                    <TableCell>{getStatusBadge(dept.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(dept)}>
                          <Edit className="size-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(dept.id)}>
                          <Trash2 className="size-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDept ? 'Edit Department' : 'Add New Department'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Department Title *</Label>
              <Input value={deptTitle} onChange={(e) => setDeptTitle(e.target.value)} placeholder="Enter department title" />
            </div>
            <div className="space-y-2">
              <Label>Location *</Label>
              <Select value={deptLocation} onValueChange={setDeptLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={String(loc.id)}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select value={deptStatus} onValueChange={setDeptStatus}>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingDept ? 'Update' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};