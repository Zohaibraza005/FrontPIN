//@ts-nocheck

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL, departmentAPI, employeeAPI, locationAPI } from '../services/api';
import { Switch } from "../components/ui/switch";
import { Checkbox } from '../components/ui/checkbox';
import { useNavigate } from 'react-router';
import { User, Briefcase, DollarSign, CheckCircle } from 'lucide-react';

// ── Sample data (you can move to mockData later) ─────────────────────
const mockLocations = [
  { id: 'loc1', name: 'Head Office - Lahore' },
  { id: 'loc2', name: 'Branch - Karachi' },
  { id: 'loc3', name: 'Branch - Islamabad' },
  { id: 'loc4', name: 'Remote' },
];

const employmentStatuses = ['Full-time', 'Part-time', 'Contract', 'Intern'];
const workModes = ['On-site', 'Remote', 'Hybrid'];
const currencies = ['PKR', 'USD', 'EUR', 'GBP'];
const cycleDates = Array.from({ length: 31 }, (_, i) => i + 1);

const privilegesList = [
  { id: 'project', label: 'Project' },
  { id: 'task', label: 'Task' },
  { id: 'invoice', label: 'Invoice' },
  { id: 'report', label: 'Report (Own Team)' },
];

export const AddEmployee: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<'admin' | 'supervisor' | 'user'>('user');
  const [selectedPrivileges, setSelectedPrivileges] = useState<any[]>([]);
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [supervisorId, setSupervisorId] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('');
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

  const stepsConfig = [
    { title: 'Employee Information', icon: User },
    { title: 'Privileges & Job Information', icon: Briefcase },
    { title: 'Payroll & Extra Hours', icon: DollarSign },
    { title: 'Review & Submit', icon: CheckCircle },
  ];

  const fetchDepartmentsByLocation = async (companyId: number) => {
    const res = await departmentAPI.getDepartments({ companyId });
    setDepartments(res.data);
  };

  const fetchSupervisors = async (companyId: number) => {
    const res = await employeeAPI.getSupervisorsByLocation(companyId);
    setSupervisors(res.data);
  };

  const fetchLocations = async () => {
    try {
      const res = await locationAPI.getLocations();
      setLocations(res.data);
    } catch (err) {
      toast.error("Failed to load locations");
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (location) {
      fetchDepartmentsByLocation(Number(location));
      fetchSupervisors(Number(location));
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
    setEmploymentStatus('');
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
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const togglePrivilege = (id: string) => {
    setSelectedPrivileges(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
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
      if (!firstName || !lastName) return false;
      if (canLogin) {
        return password && pin.length === 4 && phoneNumber;
      }
    }
    if (step === 2) {
      return !!location && !!designation;
    }
    return true; // step 3 & 4 always allow next
  };

  const handleCreateEmployee = async () => {
    try {
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

      toast.success("Employee created successfully");
      resetForm();

    } catch (error: any) {
      console.log(error.message)
      const message =
        error?.message || "Failed to create employee";
    
      toast.error(message);
    
      // 🔥 Smart Step Navigation
      if (
        message.toLowerCase().includes("username") ||
        message.toLowerCase().includes("email") ||
        message.toLowerCase().includes("phone") ||
        message.toLowerCase().includes("national") ||
        message.toLowerCase().includes("employee id")
      ) {
        if (message.includes("Username")) {
          setFieldErrors({ username: message });
          setStep(1);
        }
        setStep(1);

      }
    
      if (
        message.toLowerCase().includes("department") ||
        message.toLowerCase().includes("location") ||
        message.toLowerCase().includes("supervisor")
      ) {
        setStep(2);
      }
    }
  };

  const togglePermission = (module: string, key: string) => {
    setSelectedPrivileges(prev => {
      const existing = prev.find(p => p.module === module);

      if (!existing) {
        return [
          ...prev,
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
        p.module === module
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
    const existing = selectedPrivileges.find(p => p.module === module);
    if (!existing) return false;
    return existing[mapKey(key)];
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="font-semibold text-lg">Step 1: Employee Information</h3>

            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <Label>Profile Image</Label>
                <Input type="file" accept="image/*" onChange={handleImageChange} className="mt-2" />
                {imagePreview && (
                  <div className="mt-4">
                    <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-full border" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Employee ID</Label>
                <Input
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>

              
              <div className="col-span-2 flex items-center justify-between border p-4 rounded-lg">
                      <div>
                        <Label className="font-medium">Create Login Credentials?</Label>
                        <p className="text-sm text-gray-500">
                          If disabled, employee will not be able to login.
                        </p>
                      </div>

                      <Switch
                        checked={canLogin}
                        onCheckedChange={setCanLogin}
                      />
                    </div>
                    {canLogin && 
                    <div className="space-y-2">
                <Label>Username *</Label>
                <Input value={username} onChange={e => setUsername(e.target.value)} />
              </div>
                  }
                  <div className="space-y-2">
                    <Label>Phone Number {canLogin && "*"}</Label>
                    <Input
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>National ID</Label>
                    <Input
                      value={nationalId}
                      onChange={e => setNationalId(e.target.value)}
                    />
                  </div>
              {canLogin && (
  <>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
    <div className="space-y-2">
      <Label>Password *</Label>
      <Input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
    </div>

    <div className="space-y-2">
      <Label>4-Digit PIN *</Label>
      <Input
        type="password"
        maxLength={4}
        value={pin}
        onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
      />
    </div>
  </>
)}

              <div className="space-y-2">
                <Label>Role *</Label>
                <Select value={role} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8">
            <h3 className="font-semibold text-lg">Step 2: Privileges & Job Information</h3>

            {role !== 'admin' ? (
            
              <div className="space-y-6">
                <Label className="text-base font-semibold">Module Permissions</Label>
            
                <div className="border rounded-xl overflow-hidden">
                  <div className="grid grid-cols-6 bg-muted px-4 py-3 text-sm font-medium">
                    <div>Module</div>
                    <div className="text-center">Create</div>
                    <div className="text-center">Read</div>
                    <div className="text-center">Update</div>
                    <div className="text-center">Delete</div>
                    <div className="text-center">Own Team</div>
                  </div>
            
                  {privilegesList.map((mod, index) => (
                    <div
                      key={mod.id}
                      className={`grid grid-cols-6 items-center px-4 py-3 border-t ${
                        index % 2 === 0 ? "bg-background" : "bg-muted/40"
                      }`}
                    >
                      <div className="font-medium">{mod.label}</div>
            
                      <div className="flex justify-center">
                        <Checkbox
                          checked={isChecked(mod.id.toUpperCase(), "create")}
                          onCheckedChange={() =>
                            togglePermission(mod.id.toUpperCase(), "create")
                          }
                        />
                      </div>
            
                      <div className="flex justify-center">
                        <Checkbox
                          checked={isChecked(mod.id.toUpperCase(), "read")}
                          onCheckedChange={() =>
                            togglePermission(mod.id.toUpperCase(), "read")
                          }
                        />
                      </div>
            
                      <div className="flex justify-center">
                        <Checkbox
                          checked={isChecked(mod.id.toUpperCase(), "update")}
                          onCheckedChange={() =>
                            togglePermission(mod.id.toUpperCase(), "update")
                          }
                        />
                      </div>
            
                      <div className="flex justify-center">
                        <Checkbox
                          checked={isChecked(mod.id.toUpperCase(), "delete")}
                          onCheckedChange={() =>
                            togglePermission(mod.id.toUpperCase(), "delete")
                          }
                        />
                      </div>
            
                      <div className="flex justify-center">
                        {mod.id === "report" ? (
                          <Checkbox
                            checked={isChecked(mod.id.toUpperCase(), "ownTeamOnly")}
                            onCheckedChange={() =>
                              togglePermission(mod.id.toUpperCase(), "ownTeamOnly")
                            }
                          />
                        ) : (
                          "-"
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-green-700 font-medium">
                  All permissions automatically granted to Admin
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
                <Label>Location</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id.toString()}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                  {departments.map(dep => (
                  <SelectItem key={dep.id} value={dep.id.toString()}>
                    {dep.title}
                  </SelectItem>
                ))}
                  </SelectContent>
                </Select>
              </div>

            

              <div className="space-y-2">
                <Label>Supervisor</Label>
                <Select value={supervisorId} onValueChange={setSupervisorId}>
                  <SelectTrigger><SelectValue placeholder="Select supervisor" /></SelectTrigger>
                  <SelectContent>
                  {supervisors.map(s => (
    <SelectItem key={s.id} value={s.id.toString()}>
      {s.firstName} {s.lastName}
    </SelectItem>
  ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Employment Status</Label>
                <Select value={employmentStatus} onValueChange={setEmploymentStatus}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    {employmentStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Designation</Label>
                <Input value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Software Engineer" />
              </div>

              <div className="space-y-2">
                <Label>Hiring Date</Label>
                <Input type="date" value={hiringDate} onChange={e => setHiringDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Work Mode</Label>
                <Select value={workMode} onValueChange={setWorkMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {workModes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8">
            <h3 className="font-semibold text-lg">Step 3: Payroll & Extra Hours</h3>

            <div className="space-y-6">
              <div>
                <Label>Payout Type</Label>
                <div className="flex gap-8 mt-3">
                  {(['daily', 'hourly', 'monthly'] as const).map(type => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="payoutType"
                        checked={payoutType === type}
                        onChange={() => setPayoutType(type)}
                      />
                      <span className="capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Rate</Label>
                  <Input
                    type="number"
                    value={rate}
                    onChange={e => setRate(Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cycle Date (1–31)</Label>
                  <Select value={cycleDate.toString()} onValueChange={v => setCycleDate(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {cycleDates.map(d => <SelectItem key={d} value={d.toString()}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={allowExtraHours}
                    onChange={e => setAllowExtraHours(e.target.checked)}
                    className="size-5 accent-primary"
                  />
                  <Label className="cursor-pointer font-medium">Allow Extra Hours (Overtime)</Label>
                </div>

                {allowExtraHours && (
                  <div className="grid grid-cols-2 gap-6 pl-8">
                    <div className="space-y-2">
                      <Label>Max Extra Hours Allowed</Label>
                      <Input
                        type="number"
                        min={0}
                        value={maxExtraHours}
                        onChange={e => setMaxExtraHours(Math.max(0, Number(e.target.value) || 0))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Overtime Rate (per hour)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={overtimeRate}
                        onChange={e => setOvertimeRate(Math.max(0, Number(e.target.value) || 0))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

        case 4:
          return (
            <div className="space-y-8">
              <h3 className="font-semibold text-xl text-gray-800">Review & Confirm Employee Details</h3>
        
              {/* Main Profile Card */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                {/* Header with Avatar & Basic Info */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-6 flex items-center gap-5 border-b">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Profile"
                      className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">
                      {(firstName?.[0] || '').toUpperCase()}
                      {(lastName?.[0] || '').toUpperCase()}
                    </div>
                  )}
        
                  <div>
                    <h4 className="text-2xl font-bold text-gray-900">
                      {firstName} {lastName}
                    </h4>
                    <p className="text-gray-600 mt-1">{designation || 'Not specified'}</p>
                    <div className="mt-2 flex items-center gap-3 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        role === 'supervisor' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </span>
                      {canLogin ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Can Login
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          No Login
                        </span>
                      )}
                    </div>
                  </div>
                </div>
        
                {/* Two-column content */}
                <div className="grid md:grid-cols-2 gap-8 p-6">
                  {/* Left Column - Personal & Job */}
                  <div className="space-y-6">
                    <div>
                      <h5 className="text-lg font-semibold text-gray-800 mb-3">Personal Information</h5>
                      <div className="space-y-2 text-sm text-gray-700">
                        <p><span className="font-medium">Email:</span> {email || '—'}</p>
                        <p><span className="font-medium">Username:</span> {username || '—'}</p>
                        <p><span className="font-medium">Phone:</span> {phoneNumber || '—'}</p>
                        <p><span className="font-medium">National ID:</span> {nationalId || '—'}</p>
                        <p><span className="font-medium">Employee ID:</span> {employeeId || '—'}</p>
                      </div>
                    </div>
        
                    <div>
                      <h5 className="text-lg font-semibold text-gray-800 mb-3">Job Information</h5>
                      <div className="space-y-2 text-sm text-gray-700">
                        <p><span className="font-medium">Location:</span> {locations.find(l => l.id.toString() === location)?.name || 'Not specified'}</p>
                        <p><span className="font-medium">Department:</span> {department ? departments.find(d => d.id.toString() === department)?.title : 'Not specified'}</p>
                        <p><span className="font-medium">Supervisor:</span> {supervisors.find(s => s.id.toString() === supervisorId) 
                          ? `${supervisors.find(s => s.id.toString() === supervisorId).firstName} ${supervisors.find(s => s.id.toString() === supervisorId).lastName || ''}` 
                          : 'None'}</p>
                        <p><span className="font-medium">Employment Status:</span> {employmentStatus || '—'}</p>
                        <p><span className="font-medium">Hiring Date:</span> {hiringDate || '—'}</p>
                        <p><span className="font-medium">Work Mode:</span> {workMode}</p>
                      </div>
                    </div>
                  </div>
        
                  {/* Right Column - Privileges & Payroll */}
                  <div className="space-y-6">
                    <div>
                      <h5 className="text-lg font-semibold text-gray-800 mb-3">Privileges</h5>
                      {role === 'admin' ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <p className="text-green-800 font-medium">Full Admin Access — All permissions granted</p>
                        </div>
                      ) : selectedPrivileges.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {selectedPrivileges.map(id => {
                            const priv = privilegesList.find(p => p.id === id);
                            return priv ? (
                              <div 
                                key={id} 
                                className="bg-blue-50 text-blue-800 px-3 py-2 rounded-md text-sm font-medium"
                              >
                                {priv.label}
                              </div>
                            ) : null;
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">No specific privileges selected</p>
                      )}
                    </div>
        
                    <div>
                      <h5 className="text-lg font-semibold text-gray-800 mb-3">Payroll & Overtime</h5>
                      <div className="space-y-2 text-sm text-gray-700">
                        <p><span className="font-medium">Payout Type:</span> {payoutType.charAt(0).toUpperCase() + payoutType.slice(1)}</p>
                        <p><span className="font-medium">Rate:</span> {rate} {currency}</p>
                        <p><span className="font-medium">Cycle Date:</span> {cycleDate}{cycleDate === 1 ? 'st' : cycleDate === 2 ? 'nd' : cycleDate === 3 ? 'rd' : 'th'} of month</p>
                        
                        <div className="pt-2">
                          <p className="font-medium">Overtime Allowed: {allowExtraHours ? 
                            <span className="text-green-600">Yes</span> : 
                            <span className="text-gray-500">No</span>}
                          </p>
                          {allowExtraHours && (
                            <div className="mt-2 pl-4 border-l-2 border-gray-200 text-sm">
                              <p>Max Extra Hours: {maxExtraHours}</p>
                              <p>Overtime Rate: {overtimeRate} {currency}/hour</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
        
              {/* Final Confirmation Banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
                <p className="text-amber-800 font-medium">
                  Please review the information above carefully.
                </p>
                <p className="text-amber-700 mt-1 text-sm">
                  Once you click "Create Employee", this record will be added to the system.
                </p>
              </div>
            </div>
          );
      default:
        return null;
    }
  };

  return (
    <div className="">
       <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate('/employees')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Add Employee</h1>
              <p className="text-gray-600">
              
              </p>
            </div>
          </div>
      <Card className=' mt-5'> 
        <CardHeader>
        <CardTitle>Step {step} of {totalSteps}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Progress Stepper with Icons */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {stepsConfig.map((s, i) => (
              <div key={i} className={`text-center p-2 rounded-lg ${i + 1 === step ? 'bg-gray-50' : ''}`}>
                <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${
                  i + 1 < step ? 'bg-green-500 text-white' : 
                  i + 1 === step ? 'bg-black text-white' : 
                  'bg-gray-200 text-gray-500'
                }`}>
                  <s.icon className="size-6" />
                </div>
                <p className="mt-2 text-sm font-medium">{s.title}</p>
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="py-6">
            {renderStepContent()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={goToPrevious}
              disabled={step === 1}
            >
              <ChevronLeft className="mr-2 size-4" />
              Previous
            </Button>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/employees')} // Assuming route to employees list
              >
                Cancel
              </Button>

              {step < totalSteps ? (
                <Button
                  onClick={goToNext}
                  disabled={!canGoNext()}
                >
                  Next
                  <ChevronRight className="ml-2 size-4" />
                </Button>
              ) : (
                <Button onClick={handleCreateEmployee}>
                  Create Employee
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};