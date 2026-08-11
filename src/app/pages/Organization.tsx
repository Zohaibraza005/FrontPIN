//@ts-nocheck
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { locationAPI, organizationAPI, leaveAPI } from "../services/api";
import ReactSelect from 'react-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Switch } from "../components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";

const ALL_TIMEZONES = Intl.supportedValuesOf('timeZone');
export default function Organization() {

  const [editMode, setEditMode] = useState(false);
  const [zkConfig, setZkConfig] = useState(null);
  const [open, setOpen] = useState(false);
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [zkLocation,setZkLocation] = useState(null)
  const [locations,setLocations] = useState([])

  // 🔹 Leave Types state
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loadingLeaveTypes, setLoadingLeaveTypes] = useState(false);
  const [leaveTypeModalOpen, setLeaveTypeModalOpen] = useState(false);
  const [editingLeaveType, setEditingLeaveType] = useState(null);
  const [leaveTypeForm, setLeaveTypeForm] = useState({
    name: "",
    code: "",
    isActive: true,
  });

  const [form, setForm] = useState({
    title: "",
    phone: "",
    email: "",
    emergencyContact: "",
    address: "",
    employees: "",
    category: "",
    orgTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // sensible default
  });

  const loadLeaveTypes = async () => {
    setLoadingLeaveTypes(true);
    try {
      const res = await leaveAPI.getLeaveTypes({ all: true });
      setLeaveTypes(res.types || []);
    } catch (err) {
      console.error("Failed to load leave types:", err);
    } finally {
      setLoadingLeaveTypes(false);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      const res = await organizationAPI.getProfile();
      const location =await locationAPI.getLocations();
      setLocations(location.data)
      
      setForm({
        title: res.name,
        phone: res.phone || "",
        email: res.email || "",
        emergencyContact: res.emergencyContact || "",
        address: res.address || "",
        employees: res.totalEmployees?.toString() || "",
        category: res.category || "",
        orgTimeZone: res.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      setZkConfig(res.integrations?.zkteco || null);
    };
  
    loadProfile();
    loadLeaveTypes();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingLeaveType(null);
    setLeaveTypeForm({ name: "", code: "", isActive: true });
    setLeaveTypeModalOpen(true);
  };

  const handleOpenEditModal = (lt: any) => {
    setEditingLeaveType(lt);
    const displayCode = lt.code ? lt.code.replace(/_ORG\d+$/, "") : "";
    setLeaveTypeForm({
      name: lt.name,
      code: displayCode,
      isActive: lt.isActive,
    });
    setLeaveTypeModalOpen(true);
  };

  const handleSaveLeaveType = async () => {
    if (!leaveTypeForm.name.trim()) {
      toast.error("Please enter leave type name");
      return;
    }

    try {
      if (editingLeaveType) {
        await leaveAPI.updateLeaveType(editingLeaveType.id, {
          name: leaveTypeForm.name,
          code: leaveTypeForm.code,
          isActive: leaveTypeForm.isActive,
        });
        toast.success("Leave type updated successfully!");
      } else {
        await leaveAPI.createLeaveType({
          name: leaveTypeForm.name,
          code: leaveTypeForm.code,
          isActive: leaveTypeForm.isActive,
        });
        toast.success("Leave type created successfully!");
      }
      setLeaveTypeModalOpen(false);
      loadLeaveTypes();
    } catch (error: any) {
      toast.error(error.message || "Failed to save leave type");
    }
  };

  const handleDeleteLeaveType = async (id: number) => {
    try {
      const res = await leaveAPI.deleteLeaveType(id);
      if (res.deactivated) {
        toast.info(res.message || "Leave type deactivated");
      } else {
        toast.success("Leave type deleted successfully!");
      }
      loadLeaveTypes();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete leave type");
    }
  };

  const organizationCategories = [
    "IT Services","Software House","Fintech","Healthcare","Hospital","Pharmaceutical",
    "Construction","Real Estate","Education","University","School","College",
    "Manufacturing","Textile","Retail","E-commerce","Logistics","Transportation",
    "Marketing Agency","Digital Marketing","Telecommunications","Energy","Oil & Gas",
    "Insurance","Banking","Microfinance","Government","NGO","Non-Profit",
    "Hospitality","Hotel","Restaurant","Travel Agency","Aviation","Automobile",
    "Media","Entertainment","Publishing","Legal Firm","Consultancy","Architecture",
    "Engineering","Food & Beverage","Agriculture","Farming","Mining","Security Services",
    "Event Management","HR Consultancy","Recruitment Agency","Call Center","BPO",
    "Outsourcing","Fitness","Gym","Beauty Salon","Spa","Interior Design",
    "Import/Export","Wholesale","Trading","Startup","SaaS","AI Company",
    "Blockchain","Cybersecurity","Data Analytics","Research","Biotechnology",
    "Electronics","Hardware","Furniture","Packaging","Printing",
    "Sports Club","Gaming","Animation Studio","Film Production","Photography",
    "Music Production","Apparel","Fashion Brand","Jewelry","Handicrafts",
    "Courier","Warehousing","Marine","Shipping","Environmental Services",
    "Waste Management","Water Treatment","Power Generation","Solar Company",
    "Investment Firm","Private Equity","Venture Capital"
  ];

  const categoryOptions = React.useMemo(
    () => organizationCategories.map((cat) => ({ label: cat, value: cat })),
    []
  );
  
  const timezoneOptions = React.useMemo(
    () =>
      ALL_TIMEZONES.map((tz) => ({
        label: tz,
        value: tz,
      })),
    []
  );

  const locationOptions = [
    { value: 'main-office', label: 'Main Office' },
    { value: 'branch-1', label: 'Branch 1' },
    { value: 'branch-2', label: 'Branch 2' },
    // Add more locations as needed or fetch dynamically
  ];

  const handleSave = async () => {
    try {
      await organizationAPI.updateProfile({
        name: form.title,
        phone: form.phone,
        email: form.email,
        emergencyContact: form.emergencyContact,
        address: form.address,
        totalEmployees: Number(form.employees),
        category: form.category,
        timeZone: form.orgTimeZone,
      });
  
      toast.success("Organization profile updated successfully!");
      setEditMode(false);
  
    } catch (error) {
      toast.error("Failed to update organization profile");
    }
  };

  const handleTestConnect = async () => {
    if (!ip || !port || !selectedLocation) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      const testRes = await organizationAPI.testZKTecoConnection({ ip, port });
      if (testRes.status === 'ok') {
        await organizationAPI.bindZKTeco({
          ip,
          port,
          location: selectedLocation.value,
        });
        setZkConfig({ ip, port, location: selectedLocation.value });
        toast.success("Connection successful and bound to organization!");
        setOpen(false);
        setIp('');
        setPort('');
        setSelectedLocation(null);
      } else {
        toast.error("Connection test failed");
      }
    } catch (error) {
      toast.error("Failed to connect or bind");
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-10 space-y-8">

      <h2 className="text-2xl font-bold">Organization Settings</h2>

      <Tabs defaultValue="profile" className="space-y-6">

        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="leave-types">Leave Types</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        {/* ================= PROFILE TAB ================= */}
        <TabsContent value="profile">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Organization Profile</CardTitle>

              {!editMode && (
                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </CardHeader>

            <CardContent className="space-y-6">

              <div className="grid grid-cols-2 gap-6">

                <div className="space-y-2">
                  <Label>Organization Title</Label>
                  <Input
                    disabled={!editMode}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    disabled={!editMode}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    disabled={!editMode}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Emergency Contact</Label>
                  <Input
                    disabled={!editMode}
                    value={form.emergencyContact}
                    onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Address</Label>
                  <Input
                    disabled={!editMode}
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>No. of Employees</Label>
                  <Input
                    type="number"
                    disabled={!editMode}
                    value={form.employees}
                    onChange={(e) => setForm({ ...form, employees: e.target.value })}
                  />
                </div>
                
                
<div className="space-y-2">
  <Label>Category</Label>
  <ReactSelect
    isSearchable
    isClearable
    isDisabled={!editMode}
    options={organizationCategories.map(cat => ({ label: cat, value: cat }))}
    value={form.category ? { label: form.category, value: form.category } : null}
    onChange={(selectedOption) => {
      setForm(prev => ({
        ...prev,
        category: selectedOption ? selectedOption.value : ""
      }));
    }}
    placeholder="Search or select category..."
    className="react-select-container"
    classNamePrefix="react-select"
    styles={{
      control: (base) => ({
        ...base,
        borderColor: 'hsl(var(--input))',
        backgroundColor: '#f3f3f5',
        borderRadius: 'var(--radius)',
        minHeight: '40px',
        boxShadow: 'none',
        '&:hover': { borderColor: 'hsl(var(--input))' },
        border:0,
      }),
      valueContainer: (base) => ({
        ...base,
        padding: '0 8px',
        fontSize: '0.875rem',
      }),
      input: (base) => ({
        ...base,
        margin: 0,
        padding: 0,
      }),
      indicatorSeparator: () => ({ display: 'none' }),
      dropdownIndicator: (base) => ({
        ...base,
        padding: '0 8px',
        color: 'hsl(var(--muted-foreground))',
      }),
      menu: (base) => ({
        ...base,
        backgroundColor: 'white',
        border: '1px solid hsl(var(--border))',
        borderRadius: 'var(--radius)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        marginTop: 4,
        zIndex: 50,

      }),
      menuList: (base) => ({
        ...base,
        padding: '4px',
        maxHeight: '300px',
        fontSize:14
      }),
      option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected 
          ? 'hsl(var(--accent))' 
          : state.isFocused 
            ? 'hsl(var(--accent)/0.5)' 
            : 'transparent',
        color: state.isSelected 
          ? 'hsl(var(--accent-foreground))' 
          : 'hsl(var(--foreground))',
        padding: '8px 12px',
        borderRadius: '4px',
        cursor: 'default',
      }),
    }}
  />
</div>

<div className="space-y-2">
  <Label>Timezone {form.orgTimeZone ? `(${form.orgTimeZone})` : ""}</Label>
  <ReactSelect
    isSearchable
    isClearable
    isDisabled={!editMode}
    options={ALL_TIMEZONES.map(tz => ({ label: tz, value: tz }))}
    value={form.orgTimeZone ? { label: form.orgTimeZone, value: form.orgTimeZone } : null}
    onChange={(selectedOption) => {
      setForm(prev => ({
        ...prev,
        orgTimeZone: selectedOption ? selectedOption.value : ""
      }));
    }}
    placeholder="Search timezone (e.g. Asia/Karachi)..."
    className="react-select-container"
    classNamePrefix="react-select"
    // Same styles object as above – copy paste kar dena
    styles={{
      control: (base) => ({
        ...base,
        borderColor: 'hsl(var(--input))',
        backgroundColor: '#f3f3f5',
        borderRadius: 'var(--radius)',
        minHeight: '40px',
        boxShadow: 'none',
        '&:hover': { borderColor: 'hsl(var(--input))' },
        border:0,
      }),
      valueContainer: (base) => ({
        ...base,
        padding: '0 8px',
        fontSize: '0.875rem',
        
      }),
      input: (base) => ({
        ...base,
        margin: 0,
        padding: 0,
        // borderWidth:0,
        
      }),
      indicatorSeparator: () => ({ display: 'none' }),
      dropdownIndicator: (base) => ({
        ...base,
        padding: '0 8px',
        color: 'hsl(var(--muted-foreground))',
      }),
      menu: (base) => ({
        ...base,
        backgroundColor: 'white',
        border: '1px solid hsl(var(--border))',
        borderRadius: 'var(--radius)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        marginTop: 4,
        zIndex: 50,
      }),
      menuList: (base) => ({
        ...base,
        padding: '4px',
        maxHeight: '300px',
        fontSize:14
      }),
      option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected 
          ? 'hsl(var(--accent))' 
          : state.isFocused 
            ? 'hsl(var(--accent)/0.5)' 
            : 'transparent',
        color: state.isSelected 
          ? 'hsl(var(--accent-foreground))' 
          : 'hsl(var(--foreground))',
        padding: '8px 12px',
        borderRadius: '4px',
        cursor: 'default',
      }),
    }}
  />
</div>

              </div>

              {editMode && (
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    Cancel
                  </Button>

                  <Button onClick={handleSave}>
                    Save Changes
                  </Button>
                </div>
              )}

            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= PRICING TAB ================= */}
        <TabsContent value="pricing">

          <div className="grid md:grid-cols-3 gap-6">

            {/* Basic Plan */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Plan</CardTitle>
                <p className="text-2xl font-bold mt-2">$19 / month</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>✔ 10 Employees</p>
                <p>✔ Basic HRMS</p>
                <p>✔ Attendance</p>
                <p>✖ Payroll</p>
              </CardContent>
            </Card>

            {/* PRO PLAN (Highlighted) */}
            <Card className="border-2 border-blue-600 shadow-lg relative">
              <Badge className="absolute top-4 right-4 bg-blue-600 text-white">
                Most Popular
              </Badge>

              <CardHeader>
                <CardTitle>Pro Plan</CardTitle>
                <p className="text-3xl font-bold mt-2">$49 / month</p>
              </CardHeader>

              <CardContent className="space-y-2">
                <p>✔ 100 Employees</p>
                <p>✔ Full HRMS</p>
                <p>✔ Payroll</p>
                <p>✔ Recruitment (ATS)</p>
                <p>✔ Reporting</p>
              </CardContent>
            </Card>

            {/* Enterprise */}
            <Card>
              <CardHeader>
                <CardTitle>Enterprise</CardTitle>
                <p className="text-2xl font-bold mt-2">Custom Pricing</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>✔ Unlimited Employees</p>
                <p>✔ Full Suite</p>
                <p>✔ Dedicated Support</p>
                <p>✔ Custom Integrations</p>
              </CardContent>
            </Card>

          </div>

        </TabsContent>

        {/* ================= INTEGRATIONS TAB ================= */}
        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>ZKTeco Integration</CardTitle>
            </CardHeader>
            <CardContent>
              {zkConfig ? (
                <div className="space-y-2">
                  <Badge variant="success">Connected</Badge>
                  <p>IP: {zkConfig.ip}</p>
                  <p>Port: {zkConfig.port}</p>
                  <p>Location: {zkConfig.location}</p>
                </div>
              ) : (
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setOpen(true)}>Connect ZKTeco</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Connect ZKTeco Device</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>IP Address</Label>
                        <Input
                          value={ip}
                          onChange={(e) => setIp(e.target.value)}
                          placeholder="Enter IP"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Port</Label>
                        <Input
                          value={port}
                          onChange={(e) => setPort(e.target.value)}
                          placeholder="Enter Port"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <Select onValueChange={setZkLocation}>
                      <SelectTrigger >
                        <SelectValue placeholder="Locations" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map(d => (
                          <SelectItem key={d.id} value={String(d.id)}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                      </div>
                      <Button onClick={handleTestConnect}>Test Connection</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= LEAVE TYPES TAB ================= */}
        <TabsContent value="leave-types">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Leave Types</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage organization leave types. Created leave types will be available for employees when requesting leaves.
                </p>
              </div>
              <Button onClick={handleOpenCreateModal}>
                <Plus className="h-4 w-4 mr-2" />
                Add Leave Type
              </Button>
            </CardHeader>
            <CardContent>
              {loadingLeaveTypes ? (
                <p className="text-center py-6 text-muted-foreground">Loading leave types...</p>
              ) : leaveTypes.length === 0 ? (
                <div className="text-center py-10 border border-dashed rounded-lg space-y-3">
                  <p className="text-muted-foreground">No leave types created yet.</p>
                  <Button onClick={handleOpenCreateModal} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Leave Type
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Leave Type Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveTypes.map((lt) => {
                      const displayCode = lt.code ? lt.code.replace(/_ORG\d+$/, "") : "—";
                      return (
                        <TableRow key={lt.id}>
                          <TableCell className="font-medium">{lt.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {displayCode}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {lt.isActive ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                Active
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                                Inactive
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditModal(lt)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-800 hover:bg-red-50"
                              onClick={() => handleDeleteLeaveType(lt.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* ================= LEAVE TYPE CREATE / EDIT DIALOG ================= */}
      <Dialog open={leaveTypeModalOpen} onOpenChange={setLeaveTypeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLeaveType ? "Edit Leave Type" : "Create New Leave Type"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="lt-name">Leave Type Name <span className="text-red-500">*</span></Label>
              <Input
                id="lt-name"
                placeholder="e.g. Annual Leave, Sick Leave, Casual Leave"
                value={leaveTypeForm.name}
                onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lt-code">Leave Code (Optional)</Label>
              <Input
                id="lt-code"
                placeholder="e.g. ANNUAL, SICK, CASUAL"
                value={leaveTypeForm.code}
                onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, code: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Short code identifier for internal records.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label>Active Status</Label>
                <p className="text-xs text-muted-foreground">
                  Allow employees to select this leave type when requesting leave.
                </p>
              </div>
              <Switch
                checked={leaveTypeForm.isActive}
                onCheckedChange={(checked) => setLeaveTypeForm({ ...leaveTypeForm, isActive: checked })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setLeaveTypeModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveLeaveType}>
                {editingLeaveType ? "Update Leave Type" : "Create Leave Type"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}