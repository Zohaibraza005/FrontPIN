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
import { Pencil, Plus, Trash2, Eye, AlertTriangle, RefreshCw, Cpu, Server, Wifi, WifiOff, CheckCircle2, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { locationAPI, organizationAPI, leaveAPI, invoiceCompanyAPI, API_URL } from "../services/api";
import { deviceService, BiometricDevice } from "../services/device.service";
import ReactSelect from 'react-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/ui/dialog";
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
  const [zkLocation, setZkLocation] = useState(null);
  const [locations, setLocations] = useState([]);

  // 🔹 Biometric Devices state
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<BiometricDevice | null>(null);
  const [testingDeviceId, setTestingDeviceId] = useState<number | null>(null);
  const [syncingDeviceId, setSyncingDeviceId] = useState<number | null>(null);
  const [deviceForm, setDeviceForm] = useState({
    name: "",
    brand: "HIKVISION", // "HIKVISION" | "ZKTECO"
    ipAddress: "",
    port: "8000",
    username: "admin",
    password: "",
    companyId: "",
    direction: "CHECK_IN", // "CHECK_IN" | "CHECK_OUT" | "AUTO"
  });

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

  // 🔹 Invoice Companies state
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: "",
    title: "",
    phone: "",
    email: "",
    vat: "",
  });
  const [companyLogo, setCompanyLogo] = useState(null);
  const [editingCompany, setEditingCompany] = useState(null);
  const [viewingCompany, setViewingCompany] = useState(null);
  const [viewCompanyModalOpen, setViewCompanyModalOpen] = useState(false);
  const [companyDeleteModalOpen, setCompanyDeleteModalOpen] = useState(false);
  const [deletingCompany, setDeletingCompany] = useState(null);
  const [isDeletingCompany, setIsDeletingCompany] = useState(false);

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

  const loadCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const res = await invoiceCompanyAPI.getAll();
      setCompanies(res.data || []);
    } catch (err) {
      console.error("Failed to load companies:", err);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const loadDevices = async () => {
    setLoadingDevices(true);
    try {
      const res = await deviceService.getDevices();
      setDevices(res.data || []);
    } catch (err) {
      console.error("Failed to load devices:", err);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleEditDevice = (device: any) => {
    setEditingDevice(device);
    setDeviceForm({
      name: device.name || "",
      brand: device.brand || "HIKVISION",
      ipAddress: device.ipAddress || "",
      port: String(device.port || (device.brand === "HIKVISION" ? 8000 : 4370)),
      username: device.username || "admin",
      password: "",
      companyId: device.companyId ? String(device.companyId) : "",
      direction: device.direction || "AUTO",
    });
    setDeviceModalOpen(true);
  };

  const handleSaveDevice = async () => {
    if (!deviceForm.name.trim() || !deviceForm.ipAddress.trim()) {
      toast.error("Please enter device name and IP address");
      return;
    }

    try {
      const payload: any = {
        name: deviceForm.name.trim(),
        brand: deviceForm.brand as any,
        ipAddress: deviceForm.ipAddress.trim(),
        port: Number(deviceForm.port) || (deviceForm.brand === "HIKVISION" ? 8000 : 4370),
        username: deviceForm.username,
        direction: deviceForm.direction || "AUTO",
        companyId: deviceForm.companyId ? Number(deviceForm.companyId) : undefined,
      };

      if (deviceForm.password && deviceForm.password.trim()) {
        payload.password = deviceForm.password;
      }

      if (editingDevice) {
        await deviceService.updateDevice(editingDevice.id, payload);
        toast.success("Device updated successfully!");
      } else {
        await deviceService.addDevice({
          ...payload,
          password: deviceForm.password,
        });
        toast.success(`${deviceForm.brand} Device saved successfully!`);
      }

      setDeviceModalOpen(false);
      setEditingDevice(null);
      setDeviceForm({
        name: "",
        brand: "HIKVISION",
        ipAddress: "",
        port: "8000",
        username: "admin",
        password: "",
        companyId: "",
        direction: "CHECK_IN",
      });
      loadDevices();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to save device");
    }
  };

  const handleTestDevice = async (id: number) => {
    setTestingDeviceId(id);
    try {
      const res = await deviceService.testConnection(id);
      if (res.isOnline) {
        toast.success("Device is ONLINE and reachable!");
      } else {
        toast.error("Device is OFFLINE or unreachable");
      }
      loadDevices();
    } catch (err: any) {
      toast.error("Connection test failed");
    } finally {
      setTestingDeviceId(null);
    }
  };

  const handleSyncDevice = async (id: number) => {
    setSyncingDeviceId(id);
    try {
      const res = await deviceService.syncLogs(id);
      toast.success(res.message || "Logs synced successfully!");
      loadDevices();
    } catch (err: any) {
      toast.error("Failed to sync logs");
    } finally {
      setSyncingDeviceId(null);
    }
  };

  const handleDeleteDevice = async (id: number) => {
    try {
      await deviceService.deleteDevice(id);
      toast.success("Device removed successfully");
      loadDevices();
    } catch (err: any) {
      toast.error("Failed to delete device");
    }
  };

  const handleOpenEditCompanyModal = (company: any) => {
    setEditingCompany(company);
    setCompanyForm({
      name: company.name,
      title: company.title,
      phone: company.phone,
      email: company.email || "",
      vat: company.vat || "",
    });
    setCompanyLogo(null);
    setCompanyModalOpen(true);
  };

  const handleOpenViewCompanyModal = (company: any) => {
    setViewingCompany(company);
    setViewCompanyModalOpen(true);
  };

  const handleDeleteCompany = (company: any) => {
    setDeletingCompany(company);
    setCompanyDeleteModalOpen(true);
  };

  const handleConfirmDeleteCompany = async () => {
    if (!deletingCompany) return;
    try {
      setIsDeletingCompany(true);
      await invoiceCompanyAPI.delete(deletingCompany.id);
      toast.success("Company deleted successfully");
      setCompanyDeleteModalOpen(false);
      setDeletingCompany(null);
      loadCompanies();
    } catch (err) {
      toast.error("Failed to delete company");
    } finally {
      setIsDeletingCompany(false);
    }
  };

  const handleSaveCompany = async () => {
    if (!companyForm.name.trim() || !companyForm.title.trim() || !companyForm.phone.trim()) {
      toast.error("Please fill in all required fields (*)");
      return;
    }

    const formData = new FormData();
    formData.append('data', JSON.stringify({
      name: companyForm.name,
      title: companyForm.title,
      phone: companyForm.phone,
      email: companyForm.email || undefined,
      vat: companyForm.vat || undefined,
    }));

    if (companyLogo) formData.append('logo', companyLogo);

    try {
      if (editingCompany) {
        await invoiceCompanyAPI.update(editingCompany.id, formData);
        toast.success('Company updated successfully');
      } else {
        await invoiceCompanyAPI.create(formData);
        toast.success('Company created successfully');
      }
      setCompanyModalOpen(false);
      setEditingCompany(null);
      loadCompanies();

      // Reset form
      setCompanyForm({
        name: "",
        title: "",
        phone: "",
        email: "",
        vat: "",
      });
      setCompanyLogo(null);
    } catch (err: any) {
      toast.error(err?.message || (editingCompany ? 'Failed to update company' : 'Failed to create company'));
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      const res = await organizationAPI.getProfile();
      const location = await locationAPI.getLocations();
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
    loadCompanies();
    loadDevices();
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
    "IT Services", "Software House", "Fintech", "Healthcare", "Hospital", "Pharmaceutical",
    "Construction", "Real Estate", "Education", "University", "School", "College",
    "Manufacturing", "Textile", "Retail", "E-commerce", "Logistics", "Transportation",
    "Marketing Agency", "Digital Marketing", "Telecommunications", "Energy", "Oil & Gas",
    "Insurance", "Banking", "Microfinance", "Government", "NGO", "Non-Profit",
    "Hospitality", "Hotel", "Restaurant", "Travel Agency", "Aviation", "Automobile",
    "Media", "Entertainment", "Publishing", "Legal Firm", "Consultancy", "Architecture",
    "Engineering", "Food & Beverage", "Agriculture", "Farming", "Mining", "Security Services",
    "Event Management", "HR Consultancy", "Recruitment Agency", "Call Center", "BPO",
    "Outsourcing", "Fitness", "Gym", "Beauty Salon", "Spa", "Interior Design",
    "Import/Export", "Wholesale", "Trading", "Startup", "SaaS", "AI Company",
    "Blockchain", "Cybersecurity", "Data Analytics", "Research", "Biotechnology",
    "Electronics", "Hardware", "Furniture", "Packaging", "Printing",
    "Sports Club", "Gaming", "Animation Studio", "Film Production", "Photography",
    "Music Production", "Apparel", "Fashion Brand", "Jewelry", "Handicrafts",
    "Courier", "Warehousing", "Marine", "Shipping", "Environmental Services",
    "Waste Management", "Water Treatment", "Power Generation", "Solar Company",
    "Investment Firm", "Private Equity", "Venture Capital"
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
    if (!ip || !port || !zkLocation) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      const testRes = await organizationAPI.testZKTecoConnection({
        ip,
        port: Number(port),
      });

      if (testRes.status === "ok") {
        await organizationAPI.bindZKTeco({
          ip,
          port: Number(port),
          locationId: Number(zkLocation),
        });

        setZkConfig({
          ip,
          port: Number(port),
          locationId: Number(zkLocation),
        });

        toast.success("ZKTeco connected successfully!");

        setOpen(false);
        setIp("");
        setPort("");
        setZkLocation(null);
      } else {
        toast.error(testRes.message || "Connection test failed");
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to connect ZKTeco"
      );
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
          <TabsTrigger value="companies">Companies</TabsTrigger>
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
                        border: 0,
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
                        fontSize: 14
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
                        border: 0,
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
                        fontSize: 14
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
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Cpu className="h-6 w-6 text-primary" />
                  Biometric & Hardware Integrations
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect Hikvision Face Terminals & ZKTeco Biometric Machines for real-time attendance tracking.
                </p>
              </div>
              <Dialog
                open={deviceModalOpen}
                onOpenChange={(isOpen) => {
                  setDeviceModalOpen(isOpen);
                  if (!isOpen) {
                    setEditingDevice(null);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setEditingDevice(null);
                      setDeviceForm({
                        name: "",
                        brand: "HIKVISION",
                        ipAddress: "",
                        port: "8000",
                        username: "admin",
                        password: "",
                        companyId: "",
                        direction: "CHECK_IN",
                      });
                      setDeviceModalOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Connect New Device
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingDevice ? "Edit Biometric Device" : "Connect Biometric Device"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>Device Brand</Label>
                      <Select
                        value={deviceForm.brand}
                        onValueChange={(val) =>
                          setDeviceForm({
                            ...deviceForm,
                            brand: val,
                            port: val === "HIKVISION" ? "8000" : "4370",
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Brand" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HIKVISION">Hikvision (Face & Access Terminal)</SelectItem>
                          <SelectItem value="ZKTECO">ZKTeco (Fingerprint & RFID Machine)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Device Punch Role / Direction</Label>
                      <Select
                        value={deviceForm.direction || "CHECK_IN"}
                        onValueChange={(val) =>
                          setDeviceForm({
                            ...deviceForm,
                            direction: val,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Punch Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CHECK_IN">Check-In (Always Check In)</SelectItem>
                          <SelectItem value="CHECK_OUT">Check-Out (Always Check Out)</SelectItem>
                          <SelectItem value="AUTO">Both / Auto (Dynamic)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        Select whether punches from this machine are fixed as Check-In or Check-Out.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Device Name / Label</Label>
                      <Input
                        value={deviceForm.name}
                        onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })}
                        placeholder="e.g. Main Gate Turnstile Terminal"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>IP Address</Label>
                        <Input
                          value={deviceForm.ipAddress}
                          onChange={(e) => setDeviceForm({ ...deviceForm, ipAddress: e.target.value })}
                          placeholder="e.g. 192.168.1.200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Port</Label>
                        <Input
                          value={deviceForm.port}
                          onChange={(e) => setDeviceForm({ ...deviceForm, port: e.target.value })}
                          placeholder={deviceForm.brand === "HIKVISION" ? "8000" : "4370"}
                        />
                      </div>
                    </div>

                    {deviceForm.brand === "HIKVISION" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Username</Label>
                          <Input
                            value={deviceForm.username}
                            onChange={(e) => setDeviceForm({ ...deviceForm, username: e.target.value })}
                            placeholder="admin"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Password</Label>
                          <Input
                            type="password"
                            value={deviceForm.password}
                            onChange={(e) => setDeviceForm({ ...deviceForm, password: e.target.value })}
                            placeholder={editingDevice ? "Leave blank to keep unchanged" : "••••••••"}
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Office Location (Optional)</Label>
                      <Select
                        value={deviceForm.companyId || ""}
                        onValueChange={(val) => setDeviceForm({ ...deviceForm, companyId: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Location" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((d: any) => (
                            <SelectItem key={d.id} value={String(d.id)}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter className="mt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDeviceModalOpen(false);
                        setEditingDevice(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveDevice}>
                      {editingDevice ? "Update Device" : "Save & Connect"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadingDevices ? (
                <p className="text-center py-6 text-muted-foreground">Loading devices...</p>
              ) : devices.length === 0 ? (
                <div className="text-center py-10 border border-dashed rounded-lg">
                  <Server className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <h3 className="font-semibold text-lg">No Biometric Devices Connected</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                    Add your Hikvision Face Recognition Terminal or ZKTeco machine IP address to enable real-time attendance sync.
                  </p>
                  <Button
                    onClick={() => {
                      setEditingDevice(null);
                      setDeviceForm({
                        name: "",
                        brand: "HIKVISION",
                        ipAddress: "",
                        port: "8000",
                        username: "admin",
                        password: "",
                        companyId: "",
                        direction: "CHECK_IN",
                      });
                      setDeviceModalOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Connect Device Now
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device Name</TableHead>
                      <TableHead>Brand / Protocol</TableHead>
                      <TableHead>IP & Port</TableHead>
                      <TableHead>Punch Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.map((device) => (
                      <TableRow key={device.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Server className="h-4 w-4 text-muted-foreground" />
                            {device.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {device.brand === "HIKVISION" ? (
                            <Badge className="bg-purple-600 hover:bg-purple-700 text-white">
                              Hikvision (ISAPI)
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">
                              ZKTeco (UDP/TCP)
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {device.ipAddress}:{device.port}
                        </TableCell>
                        <TableCell>
                          {device.direction === "CHECK_IN" ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-bold flex items-center gap-1 w-fit">
                              <ArrowDownRight className="h-3.5 w-3.5 text-emerald-600" /> Check In
                            </Badge>
                          ) : device.direction === "CHECK_OUT" ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 font-bold flex items-center gap-1 w-fit">
                              <ArrowUpRight className="h-3.5 w-3.5 text-blue-600" /> Check Out
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-300 font-medium flex items-center gap-1 w-fit">
                              Both / Auto
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {device.status === "ONLINE" ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 flex items-center gap-1 w-fit">
                              <Wifi className="h-3 w-3" /> Online
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-300 flex items-center gap-1 w-fit">
                              <WifiOff className="h-3 w-3" /> Offline / Standby
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={testingDeviceId === device.id}
                            onClick={() => handleTestDevice(device.id)}
                          >
                            {testingDeviceId === device.id ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                            )}
                            Test
                          </Button>
                          {device.brand === "ZKTECO" && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={syncingDeviceId === device.id}
                              onClick={() => handleSyncDevice(device.id)}
                            >
                              {syncingDeviceId === device.id ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
                              ) : (
                                <RefreshCw className="h-3.5 w-3.5 mr-1 text-blue-600" />
                              )}
                              Sync
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            onClick={() => handleEditDevice(device)}
                            title="Edit Device"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteDevice(device.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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

        {/* ================= COMPANIES TAB ================= */}
        <TabsContent value="companies">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Companies</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage companies for your invoices. These companies will be linked to the invoice section.
                </p>
              </div>
              <Button onClick={() => setCompanyModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Company
              </Button>
            </CardHeader>
            <CardContent>
              {loadingCompanies ? (
                <p className="text-center py-6 text-muted-foreground">Loading companies...</p>
              ) : companies.length === 0 ? (
                <div className="text-center py-10 border border-dashed rounded-lg space-y-3">
                  <p className="text-muted-foreground">No companies created yet.</p>
                  <Button onClick={() => setCompanyModalOpen(true)} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Company
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Logo</TableHead>
                      <TableHead>Company Name</TableHead>
                      <TableHead>Title/Tagline</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>VAT/Tax ID</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell>
                          {company.logoUrl ? (
                            <img
                              src={`${API_URL}${company.logoUrl}`}
                              alt={company.name}
                              className="w-10 h-10 rounded object-cover border"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 border">
                              {company.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">{company.name}</TableCell>
                        <TableCell>{company.title || "—"}</TableCell>
                        <TableCell>{company.phone || "—"}</TableCell>
                        <TableCell>{company.email || "—"}</TableCell>
                        <TableCell>{company.vat || "—"}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenViewCompanyModal(company)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditCompanyModal(company)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            onClick={() => handleDeleteCompany(company)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
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

      {/* ================= COMPANY CREATE/EDIT DIALOG ================= */}
      <Dialog open={companyModalOpen} onOpenChange={(open) => {
        setCompanyModalOpen(open);
        if (!open) {
          setEditingCompany(null);
          setCompanyForm({
            name: "",
            title: "",
            phone: "",
            email: "",
            vat: "",
          });
          setCompanyLogo(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCompany ? "Edit Company" : "Add New Company"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input
                value={companyForm.name}
                onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Title / Tagline *</Label>
              <Input
                value={companyForm.title}
                onChange={(e) => setCompanyForm({ ...companyForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input
                value={companyForm.phone}
                onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Logo Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setCompanyLogo(e.target.files?.[0] || null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Email (optional)</Label>
              <Input
                value={companyForm.email}
                onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>VAT / Tax ID (optional)</Label>
              <Input
                value={companyForm.vat}
                onChange={(e) => setCompanyForm({ ...companyForm, vat: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setCompanyModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCompany}>
              {editingCompany ? "Update Company" : "Save Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= COMPANY VIEW DIALOG ================= */}
      <Dialog open={viewCompanyModalOpen} onOpenChange={setViewCompanyModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Company Details</DialogTitle>
          </DialogHeader>
          {viewingCompany && (
            <div className="space-y-4 py-4">
              <div className="flex justify-center pb-2">
                {viewingCompany.logoUrl ? (
                  <img
                    src={`${API_URL}${viewingCompany.logoUrl}`}
                    alt={viewingCompany.name}
                    className="w-24 h-24 rounded object-cover border shadow-sm"
                  />
                ) : (
                  <div className="w-24 h-24 rounded bg-gray-100 flex items-center justify-center text-2xl font-bold text-gray-500 border shadow-sm">
                    {viewingCompany.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400 text-xs">Company Name</Label>
                  <p className="font-semibold text-sm">{viewingCompany.name}</p>
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Title / Tagline</Label>
                  <p className="font-semibold text-sm">{viewingCompany.title || "—"}</p>
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Phone</Label>
                  <p className="font-semibold text-sm">{viewingCompany.phone || "—"}</p>
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Email</Label>
                  <p className="font-semibold text-sm">{viewingCompany.email || "—"}</p>
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">VAT / Tax ID</Label>
                  <p className="font-semibold text-sm">{viewingCompany.vat || "—"}</p>
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Status</Label>
                  <p className="font-semibold text-sm">
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      {viewingCompany.status}
                    </Badge>
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewCompanyModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= COMPANY DELETE DIALOG ================= */}
      <Dialog open={companyDeleteModalOpen} onOpenChange={setCompanyDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-red-600">
              <AlertTriangle className="size-5" />
              Delete Company
            </DialogTitle>
          </DialogHeader>

          {deletingCompany && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete the company{" "}
                <span className="font-bold text-gray-900">
                  {deletingCompany.name}
                </span>
                ? This action cannot be undone.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setCompanyDeleteModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={isDeletingCompany}
                  onClick={handleConfirmDeleteCompany}
                >
                  {isDeletingCompany ? "Deleting..." : "Delete Company"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}