//@ts-nocheck

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { API_URL, departmentAPI, employeeAPI, locationAPI } from '../services/api';
import { Switch } from "../components/ui/switch";
import { Checkbox } from '../components/ui/checkbox';
import { useNavigate } from 'react-router';
import {
  User,
  Briefcase,
  DollarSign,
  CheckCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Camera,
  Trash2,
  Eye,
  EyeOff,
  Shield,
  Building2,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  AlertCircle,
  Lock,
  Phone,
  Mail,
  UserCheck,
  CreditCard,
  Check,
  Loader2,
  Upload
} from 'lucide-react';
import { Badge } from '../components/ui/badge';

const employmentStatuses = ['Full-time', 'Part-time', 'Contract', 'Intern'];
const workModes = ['On-site', 'Remote', 'Hybrid'];
const currencies = ['PKR', 'USD', 'EUR', 'GBP'];
const cycleDates = Array.from({ length: 31 }, (_, i) => i + 1);

const privilegesList = [
  { id: 'employee', label: 'Employee', description: 'Manage employee profiles and status' },
  { id: 'attendance', label: 'Attendance', description: 'Clock in, check activities & time logs' },
  { id: 'leave', label: 'Leave', description: 'Request & approve leave applications' },
  { id: 'project', label: 'Project', description: 'Access and assign project tasks' },
  { id: 'task', label: 'Task', description: 'Create, update & complete assigned tasks' },
  { id: 'invoice', label: 'Invoice', description: 'Create and view client invoices' },
  { id: 'report', label: 'Report (Own Team)', description: 'Export performance & summary reports' },
  { id: 'overtime', label: 'Overtime', description: 'Log & manage overtime work hours' },
  { id: 'enable_gps', label: 'GPS Tracking', description: 'Enforce geofencing & location check' },
  { id: 'schedule', label: 'Schedule', description: 'Manage work shift schedules' },
];

const visibleInputClass = "h-11 px-3.5 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 shadow-2xs transition-all w-full";
const visibleSelectClass = "h-11 px-3.5 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-900 shadow-2xs hover:border-gray-400 focus:ring-2 focus:ring-blue-500/20 w-full";

export const AddEmployee: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [role, setRole] = useState<'admin' | 'supervisor' | 'user'>('user');
  const [selectedPrivileges, setSelectedPrivileges] = useState<any[]>([]);
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [supervisorId, setSupervisorId] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('Full-time');
  const [designation, setDesignation] = useState('');
  const [hiringDate, setHiringDate] = useState('');
  const [workMode, setWorkMode] = useState('On-site');
  const [allowExtraHours, setAllowExtraHours] = useState(false);
  const [maxExtraHours, setMaxExtraHours] = useState(0);
  const [payoutType, setPayoutType] = useState<'daily' | 'hourly' | 'monthly'>('monthly');
  const [rate, setRate] = useState(0);
  const [currency, setCurrency] = useState('PKR');
  const [cycleDate, setCycleDate] = useState(1);
  const [overtimeRate, setOvertimeRate] = useState(0);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [canLogin, setCanLogin] = useState(true);
  const [employeeId, setEmployeeId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [fieldErrors, setFieldErrors] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stepsConfig = [
    { step: 1, title: 'Personal Info', subtitle: 'Identity & Login', icon: User },
    { step: 2, title: 'Job & Privileges', subtitle: 'Dept & Permissions', icon: Briefcase },
    { step: 3, title: 'Payroll & Overtime', subtitle: 'Salary & Extra Hours', icon: DollarSign },
    { step: 4, title: 'Review & Submit', subtitle: 'Final Confirmation', icon: CheckCircle },
  ];

  const fetchDepartments = async (companyId?: number) => {
    try {
      const res = await departmentAPI.getDepartments(companyId ? { companyId } : {});
      let list = res.data || [];
      if (list.length === 0 && companyId) {
        const allRes = await departmentAPI.getDepartments({});
        list = allRes.data || [];
      }
      setDepartments(list);
    } catch {
      setDepartments([]);
    }
  };

  const fetchSupervisors = async (companyId?: number) => {
    try {
      const res = await employeeAPI.getSupervisorsByLocation(companyId);
      setSupervisors(res.data || []);
    } catch {
      setSupervisors([]);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await locationAPI.getLocations();
      setLocations(res.data || []);
    } catch (err) {
      toast.error("Failed to load locations");
    }
  };

  useEffect(() => {
    fetchLocations();
    fetchDepartments();
    fetchSupervisors();
  }, []);

  useEffect(() => {
    if (location) {
      fetchDepartments(Number(location));
      fetchSupervisors(Number(location));
    } else {
      fetchDepartments();
      fetchSupervisors();
    }
  }, [location]);

  const resetForm = () => {
    setStep(1);
    setFirstName('');
    setLastName('');
    setEmail('');
    setUsername('');
    setPassword('');
    setPin('');
    setRole('user');
    setSelectedPrivileges([]);
    setDepartment('');
    setLocation('');
    setSupervisorId('');
    setEmploymentStatus('Full-time');
    setDesignation('');
    setHiringDate('');
    setWorkMode('On-site');
    setAllowExtraHours(false);
    setMaxExtraHours(0);
    setPayoutType('monthly');
    setRate(0);
    setCurrency('PKR');
    setCycleDate(1);
    setOvertimeRate(0);
    setProfileImage(null);
    setImagePreview(null);
    setEmployeeId('');
    setPhoneNumber('');
    setNationalId('');
    setCanLogin(true);
    setFieldErrors({});
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      setProfileImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeProfileImage = () => {
    setProfileImage(null);
    setImagePreview(null);
  };

  const togglePrivilege = (id: string) => {
    setSelectedPrivileges(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const selectAllPrivileges = () => {
    setSelectedPrivileges(privilegesList.map(p => p.id));
  };

  const clearAllPrivileges = () => {
    setSelectedPrivileges([]);
  };

  const handleRoleChange = (newRole: 'admin' | 'supervisor' | 'user') => {
    setRole(newRole);
    if (newRole === 'admin') {
      setSelectedPrivileges(privilegesList.map(p => p.id));
    } else if (role === 'admin') {
      setSelectedPrivileges([]);
    }
  };

  const goToNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const goToPrevious = () => {
    if (step > 1) setStep(step - 1);
  };

  const canGoNext = () => {
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim()) return false;
      if (canLogin) {
        return Boolean(username.trim() && password && pin.length === 4 && phoneNumber.trim());
      }
    }
    if (step === 2) {
      return !!location && !!designation.trim();
    }
    return true;
  };

  const handleCreateEmployee = async () => {
    try {
      setIsSubmitting(true);
      const formData = new FormData();

      formData.append("personal", JSON.stringify({
        firstName,
        lastName,
        email,
        username,
        password: canLogin ? password : null,
        pin: canLogin ? pin : null,
        role,
        companyId: location,
        departmentId: department,
        supervisorId,
        employeeId,
        phoneNumber,
        nationalId,
        canLogin
      }));

      formData.append("job", JSON.stringify({
        designation,
        employmentStatus,
        hiringDate,
        workMode,
      }));

      formData.append("payroll", JSON.stringify({
        payoutType,
        rate,
        currency,
        cycleDate,
        allowExtraHours,
        maxExtraHours,
        overtimeRate,
      }));

      formData.append("privileges", JSON.stringify(
        role === "admin"
          ? privilegesList.map(p => p.id)
          : selectedPrivileges
      ));

      if (profileImage) {
        formData.append("profileImage", profileImage);
      }

      await employeeAPI.createEmployee(formData);

      toast.success("Employee created successfully!");
      resetForm();
      navigate('/employees');

    } catch (error: any) {
      console.error(error);
      const message = error?.message || "Failed to create employee";
      toast.error(message);

      if (
        message.toLowerCase().includes("username") ||
        message.toLowerCase().includes("email") ||
        message.toLowerCase().includes("phone") ||
        message.toLowerCase().includes("national") ||
        message.toLowerCase().includes("employee id")
      ) {
        if (message.toLowerCase().includes("username")) {
          setFieldErrors({ username: message });
        }
        setStep(1);
      } else if (
        message.toLowerCase().includes("department") ||
        message.toLowerCase().includes("location") ||
        message.toLowerCase().includes("supervisor")
      ) {
        setStep(2);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePermission = (module: string, key: string) => {
    setSelectedPrivileges(prev => {
      const existing = prev.find(p => typeof p === 'object' && p?.module === module);

      if (!existing) {
        return [
          ...prev.filter(p => typeof p !== 'object' || p?.module !== module),
          {
            module,
            canCreate: key === "create",
            canRead: key === "read",
            canUpdate: key === "update",
            canDelete: key === "delete",
            ownTeamOnly: key === "ownTeamOnly",
          },
        ];
      }

      return prev.map(p =>
        typeof p === 'object' && p?.module === module
          ? { ...p, [mapKey(key)]: !p[mapKey(key)] }
          : p
      );
    });
  };

  const mapKey = (key: string) => {
    if (key === "create") return "canCreate";
    if (key === "read") return "canRead";
    if (key === "update") return "canUpdate";
    if (key === "delete") return "canDelete";
    return key;
  };

  const isChecked = (module: string, key: string) => {
    const existing = selectedPrivileges.find(p => typeof p === 'object' && p?.module === module);
    if (!existing) {
      return selectedPrivileges.includes(module.toLowerCase());
    }
    return Boolean(existing[mapKey(key)]);
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            {/* Profile Avatar Card */}
            <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 p-5 rounded-2xl border border-gray-200">
              <Label className="text-xs font-bold text-gray-800 mb-3 block">Profile Photo</Label>
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="relative group shrink-0">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Avatar preview"
                      className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md ring-2 ring-blue-500/20"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-md ring-2 ring-blue-500/20">
                      {firstName?.[0]?.toUpperCase() || <User className="w-9 h-9 text-white/80" />}
                    </div>
                  )}
                  <label
                    htmlFor="profile-upload"
                    className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Camera className="w-5 h-5" />
                  </label>
                  <input
                    id="profile-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>

                <div className="space-y-2 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <label
                      htmlFor="profile-upload-btn"
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-gray-300 text-gray-700 shadow-xs hover:bg-gray-50 hover:text-gray-900 cursor-pointer transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-blue-600" />
                      {imagePreview ? 'Change Photo' : 'Upload Photo'}
                    </label>
                    <input
                      id="profile-upload-btn"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    {imagePreview && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={removeProfileImage}
                        className="text-red-600 border-red-200 hover:bg-red-50 text-xs px-3 h-9 rounded-xl"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Supports JPG, PNG or GIF (Max file size 5MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Basic Info Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-800">Employee ID (Code)</Label>
                <Input
                  placeholder="e.g. EMP-101"
                  className={visibleInputClass}
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-800">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Basil"
                  className={visibleInputClass}
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-800">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Nadeem"
                  className={visibleInputClass}
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                />
              </div>
            </div>

            {/* Contact & Identity Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  Phone Number {canLogin && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  placeholder="+92 300 1234567"
                  className={visibleInputClass}
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                  National ID (CNIC / Passport)
                </Label>
                <Input
                  placeholder="35202-xxxxxxx-x"
                  className={visibleInputClass}
                  value={nationalId}
                  onChange={e => setNationalId(e.target.value)}
                />
              </div>
            </div>

            {/* User Role Card */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-800">User Role Level *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => handleRoleChange('user')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                    role === 'user'
                      ? 'border-2 border-blue-600 bg-blue-50/50 shadow-xs'
                      : 'border border-gray-300 bg-white hover:border-gray-400'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">User Employee</p>
                    <p className="text-xs text-gray-500 mt-0.5">Standard staff with access to assigned tasks and personal attendance.</p>
                  </div>
                </div>

                <div
                  onClick={() => handleRoleChange('supervisor')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                    role === 'supervisor'
                      ? 'border-2 border-indigo-600 bg-indigo-50/50 shadow-xs'
                      : 'border border-gray-300 bg-white hover:border-gray-400'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${role === 'supervisor' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Supervisor</p>
                    <p className="text-xs text-gray-500 mt-0.5">Can review team attendance, approve leaves & manage team workflows.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Login Credentials Switch Card */}
            <div className="bg-white border border-gray-300 p-5 rounded-2xl space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <Label className="text-sm font-bold text-gray-900 cursor-pointer">
                      Enable System Login Access
                    </Label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Allow this employee to log into the Frontpin web app & mobile PIN system.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={canLogin}
                  onCheckedChange={setCanLogin}
                />
              </div>

              {canLogin && (
                <div className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="email"
                      placeholder="basil@gmail.com"
                      className={visibleInputClass}
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      Username <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="basil480"
                      className={`${visibleInputClass} ${fieldErrors.username ? 'border-red-500' : ''}`}
                      value={username}
                      onChange={e => {
                        setUsername(e.target.value);
                        setFieldErrors(prev => ({ ...prev, username: null }));
                      }}
                    />
                    {fieldErrors.username && (
                      <p className="text-xs text-red-600 font-medium">{fieldErrors.username}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-gray-400" />
                      Login Password <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className={`${visibleInputClass} pr-10`}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-gray-400" />
                        4-Digit Mobile PIN <span className="text-red-500">*</span>
                      </span>
                      <span className="text-[10px] text-gray-400">Used for clock-in</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPin ? "text" : "password"}
                        maxLength={4}
                        placeholder="1234"
                        className={`${visibleInputClass} tracking-widest text-center font-mono font-bold pr-10`}
                        value={pin}
                        onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      >
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* Job Details Card */}
            <div className="bg-white p-5 rounded-2xl border border-gray-300 space-y-4 shadow-2xs">
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b pb-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Workplace & Job Role Details
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-800">
                    Location (Office / Company) <span className="text-red-500">*</span>
                  </Label>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger className={visibleSelectClass}>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map(loc => (
                        <SelectItem key={loc.id} value={loc.id.toString()}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-800">Department</Label>
                  <Select
                    value={department}
                    onValueChange={setDepartment}
                    onOpenChange={(open) => {
                      if (open) {
                        fetchDepartments(location ? Number(location) : undefined);
                      }
                    }}
                  >
                    <SelectTrigger className={visibleSelectClass}>
                      <SelectValue placeholder={departments.length === 0 ? "Select department" : "Select department"} />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.length === 0 ? (
                        <div className="p-3 text-xs text-gray-400 text-center italic">No departments found in database</div>
                      ) : (
                        departments.map(dep => (
                          <SelectItem key={dep.id} value={dep.id.toString()}>
                            {dep.title} {dep.company?.name ? `(${dep.company.name})` : ''}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-800">Direct Supervisor</Label>
                  <Select value={supervisorId} onValueChange={setSupervisorId}>
                    <SelectTrigger className={visibleSelectClass}>
                      <SelectValue placeholder="Select supervisor" />
                    </SelectTrigger>
                    <SelectContent>
                      {supervisors.map(s => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          {s.firstName} {s.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-800">
                    Job Designation <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Software Engineer"
                    className={visibleInputClass}
                    value={designation}
                    onChange={e => setDesignation(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-800">Employment Status</Label>
                  <Select value={employmentStatus} onValueChange={setEmploymentStatus}>
                    <SelectTrigger className={visibleSelectClass}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {employmentStatuses.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-800">Hiring Date</Label>
                  <Input
                    type="date"
                    className={visibleInputClass}
                    value={hiringDate}
                    onChange={e => setHiringDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-2">
                <Label className="text-xs font-semibold text-gray-800 mb-2 block">Work Mode</Label>
                <div className="flex gap-3">
                  {workModes.map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setWorkMode(mode)}
                      className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                        workMode === mode
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Privileges & Permissions Table */}
            <div className="bg-white p-5 rounded-2xl border border-gray-300 space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-3">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-600" />
                    Module Permissions & Privileges
                  </h4>
                  <p className="text-xs text-gray-500">
                    Specify CRUD access levels for each module.
                  </p>
                </div>
                {role !== 'admin' && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selectAllPrivileges}
                      className="text-xs h-8 text-blue-600 border-blue-300 hover:bg-blue-50 rounded-xl"
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearAllPrivileges}
                      className="text-xs h-8 text-gray-600 border-gray-300 hover:bg-gray-50 rounded-xl"
                    >
                      Clear All
                    </Button>
                  </div>
                )}
              </div>

              {role === 'admin' ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-xs font-medium">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  All system privileges and administrative module access levels are automatically granted for Admin users.
                </div>
              ) : (
                <div className="border border-gray-300 rounded-xl overflow-hidden text-xs">
                  <div className="grid grid-cols-6 bg-gray-50 px-4 py-2.5 font-bold text-gray-700 border-b border-gray-300">
                    <div>Module Name</div>
                    <div className="text-center">Create</div>
                    <div className="text-center">Read</div>
                    <div className="text-center">Update</div>
                    <div className="text-center">Delete</div>
                    <div className="text-center">Own Team</div>
                  </div>

                  <div className="divide-y divide-gray-200">
                    {privilegesList.map((mod, index) => (
                      <div
                        key={mod.id}
                        className={`grid grid-cols-6 items-center px-4 py-2.5 hover:bg-blue-50/30 transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-gray-900">{mod.label}</p>
                          <p className="text-[10px] text-gray-400 hidden sm:block">{mod.description}</p>
                        </div>

                        <div className="flex justify-center">
                          <Checkbox
                            checked={isChecked(mod.id.toUpperCase(), "create")}
                            onCheckedChange={() => togglePermission(mod.id.toUpperCase(), "create")}
                          />
                        </div>

                        <div className="flex justify-center">
                          <Checkbox
                            checked={isChecked(mod.id.toUpperCase(), "read")}
                            onCheckedChange={() => togglePermission(mod.id.toUpperCase(), "read")}
                          />
                        </div>

                        <div className="flex justify-center">
                          <Checkbox
                            checked={isChecked(mod.id.toUpperCase(), "update")}
                            onCheckedChange={() => togglePermission(mod.id.toUpperCase(), "update")}
                          />
                        </div>

                        <div className="flex justify-center">
                          <Checkbox
                            checked={isChecked(mod.id.toUpperCase(), "delete")}
                            onCheckedChange={() => togglePermission(mod.id.toUpperCase(), "delete")}
                          />
                        </div>

                        <div className="flex justify-center">
                          {mod.id === "report" ? (
                            <Checkbox
                              checked={isChecked(mod.id.toUpperCase(), "ownTeamOnly")}
                              onCheckedChange={() => togglePermission(mod.id.toUpperCase(), "ownTeamOnly")}
                            />
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* Payout Type Card */}
            <div className="bg-white p-5 rounded-2xl border border-gray-300 space-y-4 shadow-2xs">
              <Label className="text-xs font-semibold text-gray-800 block">Payout Frequency Type</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['monthly', 'hourly', 'daily'] as const).map(type => (
                  <div
                    key={type}
                    onClick={() => setPayoutType(type)}
                    className={`p-4 rounded-2xl border cursor-pointer text-center transition-all ${
                      payoutType === type
                        ? 'border-2 border-emerald-600 bg-emerald-50/50 shadow-xs'
                        : 'border border-gray-300 bg-white hover:border-gray-400'
                    }`}
                  >
                    <p className="text-sm font-bold capitalize text-gray-900">{type}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {type === 'monthly' ? 'Fixed monthly salary' : type === 'hourly' ? 'Paid per hour worked' : 'Per day payout'}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-800">Salary Rate Amount</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 50000"
                    className={`${visibleInputClass} font-mono font-semibold`}
                    value={rate}
                    onChange={e => setRate(Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-800">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className={`${visibleSelectClass} font-semibold`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-800">Payout Cycle Date (1–31)</Label>
                  <Select value={cycleDate.toString()} onValueChange={v => setCycleDate(Number(v))}>
                    <SelectTrigger className={visibleSelectClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cycleDates.map(d => (
                        <SelectItem key={d} value={d.toString()}>
                          Day {d} of Month
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Overtime Card */}
            <div className="bg-white p-5 rounded-2xl border border-gray-300 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <Label className="text-sm font-bold text-gray-900 cursor-pointer">
                      Allow Extra Hours (Overtime)
                    </Label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Enable overtime tracking and specify max extra hours allowed.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={allowExtraHours}
                  onCheckedChange={setAllowExtraHours}
                />
              </div>

              {allowExtraHours && (
                <div className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-800">Max Extra Hours Allowed</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="e.g. 20"
                      className={visibleInputClass}
                      value={maxExtraHours}
                      onChange={e => setMaxExtraHours(Math.max(0, Number(e.target.value) || 0))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-800">Overtime Hourly Rate ({currency})</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="e.g. 500"
                      className={visibleInputClass}
                      value={overtimeRate}
                      onChange={e => setOvertimeRate(Math.max(0, Number(e.target.value) || 0))}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            {/* Profile Review Hero Card */}
            <div className="bg-white border border-gray-300 rounded-2xl shadow-2xs overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-6 text-white flex flex-col sm:flex-row items-center gap-5">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover border-4 border-white/20 shadow-md"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-2xl font-bold border-4 border-white/20 shadow-md">
                    {(firstName?.[0] || '').toUpperCase()}
                    {(lastName?.[0] || '').toUpperCase()}
                  </div>
                )}

                <div className="text-center sm:text-left">
                  <h4 className="text-2xl font-bold tracking-tight">
                    {firstName} {lastName}
                  </h4>
                  <p className="text-blue-100 text-sm font-medium mt-0.5">
                    {designation || 'No Designation Set'}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
                    <span className="px-3 py-1 rounded-full font-bold bg-white/20 backdrop-blur-md text-white">
                      Role: {role.toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full font-bold ${
                      canLogin ? 'bg-emerald-400 text-emerald-950' : 'bg-gray-400/40 text-white'
                    }`}>
                      {canLogin ? 'Login Enabled' : 'No Login'}
                    </span>
                    {workMode && (
                      <span className="px-3 py-1 rounded-full font-bold bg-white/20 backdrop-blur-md text-white">
                        {workMode}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Two Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 text-xs text-gray-700">
                {/* Left Column */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                    <h5 className="font-bold text-gray-900 text-sm border-b pb-1.5 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-blue-600" />
                      Personal & Contact Information
                    </h5>
                    <div className="space-y-1 pt-1">
                      <p><span className="font-medium text-gray-500">Employee ID:</span> <span className="font-bold text-gray-900">{employeeId || '—'}</span></p>
                      <p><span className="font-medium text-gray-500">Email:</span> <span className="font-semibold text-gray-900">{email || '—'}</span></p>
                      <p><span className="font-medium text-gray-500">Username:</span> <span className="font-semibold text-gray-900">{username || '—'}</span></p>
                      <p><span className="font-medium text-gray-500">Phone Number:</span> <span className="font-semibold text-gray-900">{phoneNumber || '—'}</span></p>
                      <p><span className="font-medium text-gray-500">National ID:</span> <span className="font-semibold text-gray-900">{nationalId || '—'}</span></p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                    <h5 className="font-bold text-gray-900 text-sm border-b pb-1.5 flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-indigo-600" />
                      Job & Department
                    </h5>
                    <div className="space-y-1 pt-1">
                      <p><span className="font-medium text-gray-500">Location:</span> <span className="font-bold text-gray-900">{locations.find(l => l.id.toString() === location)?.name || 'Not selected'}</span></p>
                      <p><span className="font-medium text-gray-500">Department:</span> <span className="font-semibold text-gray-900">{department ? departments.find(d => d.id.toString() === department)?.title : 'Not selected'}</span></p>
                      <p><span className="font-medium text-gray-500">Supervisor:</span> <span className="font-semibold text-gray-900">{supervisors.find(s => s.id.toString() === supervisorId) ? `${supervisors.find(s => s.id.toString() === supervisorId).firstName} ${supervisors.find(s => s.id.toString() === supervisorId).lastName || ''}` : 'None'}</span></p>
                      <p><span className="font-medium text-gray-500">Employment Status:</span> <span className="font-semibold text-gray-900">{employmentStatus}</span></p>
                      <p><span className="font-medium text-gray-500">Hiring Date:</span> <span className="font-semibold text-gray-900">{hiringDate || '—'}</span></p>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                    <h5 className="font-bold text-gray-900 text-sm border-b pb-1.5 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-indigo-600" />
                      System Permissions
                    </h5>
                    <div className="pt-1">
                      {role === 'admin' ? (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                          Full Admin Access Granted
                        </Badge>
                      ) : selectedPrivileges.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedPrivileges.map(p => {
                            const pId = typeof p === 'object' ? p.module : p;
                            const priv = privilegesList.find(x => x.id === pId.toLowerCase());
                            return (
                              <Badge key={pId} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                                {priv?.label || pId}
                              </Badge>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">No specific permissions granted</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                    <h5 className="font-bold text-gray-900 text-sm border-b pb-1.5 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Payroll & Overtime Policy
                    </h5>
                    <div className="space-y-1 pt-1">
                      <p><span className="font-medium text-gray-500">Payout Type:</span> <span className="font-bold text-gray-900 capitalize">{payoutType}</span></p>
                      <p><span className="font-medium text-gray-500">Salary Rate:</span> <span className="font-bold text-emerald-700">{rate} {currency}</span></p>
                      <p><span className="font-medium text-gray-500">Cycle Date:</span> <span className="font-semibold text-gray-900">Day {cycleDate} of month</span></p>
                      <p><span className="font-medium text-gray-500">Overtime Allowed:</span> <span className={`font-semibold ${allowExtraHours ? 'text-emerald-600' : 'text-gray-500'}`}>{allowExtraHours ? `Yes (Max ${maxExtraHours} hrs @ ${overtimeRate} ${currency}/hr)` : 'No'}</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Final Info Alert */}
            <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-blue-800">
              <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
              <span>
                Please double check the details above. Clicking <strong>Create Employee</strong> will register this employee record into the database.
              </span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-10">
      {/* Main Single Card Container */}
      <Card className="rounded-2xl border border-gray-300 shadow-2xs overflow-hidden bg-white">
        {/* Integrated Top Header & Simple Un-boxed Stepper Bar */}
        <div className="p-6 border-b border-gray-200 bg-gray-50/70 space-y-6">
          {/* Top Row: Back button, Title & Step Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate('/employees')}
                className="rounded-xl border-gray-300 hover:bg-white text-gray-700 h-10 w-10 shrink-0 shadow-2xs"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-blue-600">Employees</span>
                  <span className="text-gray-300">/</span>
                  <span className="text-gray-500">Add New</span>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900">Add New Employee</h1>
              </div>
            </div>
          </div>

          {/* Simple Horizontal Stepper Line (No Cards) */}
          <div className="pt-2">
            <div className="flex items-center justify-between relative max-w-3xl mx-auto px-4">
              {/* Connected Background Progress Line */}
              <div className="absolute left-[10%] right-[10%] top-4 h-0.5 bg-gray-200 z-0" />
              <div
                className="absolute left-[10%] top-4 h-0.5 bg-blue-600 transition-all duration-300 z-0"
                style={{
                  width: `${((step - 1) / (totalSteps - 1)) * 80}%`,
                }}
              />

              {stepsConfig.map((s) => {
                const isActive = s.step === step;
                const isCompleted = s.step < step;
                const Icon = s.icon;

                return (
                  <div
                    key={s.step}
                    onClick={() => {
                      if (isCompleted) setStep(s.step);
                    }}
                    className={`relative z-10 flex flex-col items-center group transition-all ${
                      isCompleted ? 'cursor-pointer' : ''
                    }`}
                  >
                    {/* Circle Node Badge */}
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md scale-110'
                          : isCompleted
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-white border-2 border-gray-300 text-gray-400'
                      }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : <span>{s.step}</span>}
                    </div>

                    {/* Step Title */}
                    <div className="mt-2 text-center">
                      <p className={`text-xs font-bold transition-colors ${
                        isActive
                          ? 'text-blue-700'
                          : isCompleted
                          ? 'text-gray-900'
                          : 'text-gray-400'
                      }`}>
                        {s.title}
                      </p>
                      <p className="text-[10px] text-gray-400 hidden sm:block mt-0.5">
                        {s.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          {/* Form Step Body */}
          <div className="p-6">
            {renderStepContent()}
          </div>

          {/* Fixed Footer Actions */}
          <div className="flex items-center justify-between p-6 bg-gray-50/50 border-t border-gray-300">
            <Button
              type="button"
              variant="outline"
              onClick={goToPrevious}
              disabled={step === 1 || isSubmitting}
              className="rounded-xl px-5 h-11 border-gray-300 hover:bg-gray-100 text-xs font-bold"
            >
              <ChevronLeft className="mr-1.5 size-4" />
              Previous Step
            </Button>

            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/employees')}
                disabled={isSubmitting}
                className="rounded-xl px-4 h-11 border-gray-300 hover:bg-gray-100 text-xs font-bold text-gray-600"
              >
                Cancel
              </Button>

              {step < totalSteps ? (
                <Button
                  type="button"
                  onClick={goToNext}
                  disabled={!canGoNext() || isSubmitting}
                  className="rounded-xl px-6 h-11 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
                >
                  Next Step
                  <ChevronRight className="ml-1.5 size-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleCreateEmployee}
                  disabled={isSubmitting}
                  className="rounded-xl px-7 h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating Employee...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Create Employee
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};