//@ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { visitorAPI, employeeAPI, locationAPI, departmentAPI } from '../services/api';
import {
  UserCheck,
  User,
  Building2,
  MapPin,
  Calendar,
  Phone,
  Mail,
  CreditCard,
  Camera,
  Upload,
  ArrowLeft,
  CheckCircle2,
  Check,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Info,
} from 'lucide-react';

const visitPurposes = [
  'Meeting',
  'Visitor Employee',
  'Job Interview',
  'Client Visit',
  'Vendor / Supplier',
  'Delivery / Courier',
  'Maintenance / IT Support',
  'Contractor / Work',
  'Personal Visit',
  'Other',
];

const stepsConfig = [
  { step: 1, title: 'Personal Details', subtitle: 'Identity & Contact', icon: User },
  { step: 2, title: 'Visit & Host', subtitle: 'Assignment & Purpose', icon: Building2 },
  { step: 3, title: 'Review & Submit', subtitle: 'Summary & Confirm', icon: CheckCircle2 },
];

export const AddVisitor: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Wizard Step State
  const [step, setStep] = useState(1);
  const totalSteps = stepsConfig.length;

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [hostId, setHostId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [purpose, setPurpose] = useState('Meeting');
  const [customPurpose, setCustomPurpose] = useState('');
  const [startDate, setStartDate] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Dropdown options
  const [locations, setLocations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      setLoading(true);
      const [locRes, deptRes, empRes] = await Promise.all([
        locationAPI.getLocations().catch(() => ({ data: [] })),
        departmentAPI.getDepartments().catch(() => ({ data: [] })),
        employeeAPI.getEmployees().catch(() => ({ data: [] })),
      ]);

      const locs = locRes.data || [];
      setLocations(locs);
      if (locs.length > 0) {
        setCompanyId(String(locs[0].id));
      }

      setDepartments(deptRes.data || []);
      setEmployees((empRes.data || []).filter((e: any) => e.role !== 'ADMIN' && e.role !== 'admin'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const canGoNext = () => {
    if (step === 1) {
      return Boolean(fullName.trim() && phone.trim());
    }
    if (step === 2) {
      if (purpose === 'Other' && !customPurpose.trim()) return false;
      return true;
    }
    return true;
  };

  const goToNext = () => {
    if (step === 1) {
      if (!fullName.trim()) {
        toast.error('Please enter the visitor full name');
        return;
      }
      if (!phone.trim()) {
        toast.error('Please enter visitor phone number');
        return;
      }
    }
    if (step === 2) {
      if (purpose === 'Other' && !customPurpose.trim()) {
        toast.error('Please specify the visit purpose');
        return;
      }
    }
    setStep((s) => Math.min(totalSteps, s + 1));
  };

  const goToPrevious = () => {
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!fullName.trim()) {
      toast.error('Please enter the visitor full name');
      setStep(1);
      return;
    }

    if (!phone.trim()) {
      toast.error('Please enter visitor phone number');
      setStep(1);
      return;
    }

    try {
      setSubmitting(true);

      const finalPurpose = purpose === 'Other' && customPurpose.trim() ? customPurpose.trim() : purpose;

      const formData = new FormData();
      formData.append('fullName', fullName.trim());
      formData.append('phone', phone.trim());
      if (email.trim()) formData.append('email', email.trim());
      if (nationalId.trim()) formData.append('nationalId', nationalId.trim());
      formData.append('purpose', finalPurpose);
      if (hostId && hostId !== 'all') formData.append('hostId', hostId);
      if (companyId && companyId !== 'all') formData.append('companyId', companyId);
      if (departmentId && departmentId !== 'all') formData.append('departmentId', departmentId);
      if (startDate) formData.append('startDate', startDate);
      formData.append('status', 'EXPECTED');
      if (photoFile) formData.append('photo', photoFile);

      const res = await visitorAPI.createVisitor(formData);

      if (res && res.success) {
        toast.success(res.message || 'Visitor registered successfully!');
        window.dispatchEvent(new CustomEvent('visitor-updated'));
        navigate('/visitors');
      } else {
        toast.error(res?.message || 'Failed to register visitor');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || 'Error creating visitor record');
    } finally {
      setSubmitting(false);
    }
  };

  const currentStep = stepsConfig.find((s) => s.step === step) || stepsConfig[0];
  const CurrentStepIcon = currentStep.icon;

  const selectedLocation = locations.find((l) => String(l.id) === String(companyId));
  const selectedDept = departments.find((d) => String(d.id) === String(departmentId));
  const selectedHost = employees.find((e) => String(e.id) === String(hostId));

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-2">
              {/* Photo Upload / Avatar */}
              <div className="flex flex-col items-center">
                <div className="relative size-28 rounded-2xl bg-gray-100 dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center overflow-hidden group">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="size-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400 group-hover:text-blue-600 transition-colors">
                      <Camera className="size-8" />
                      <span className="text-[11px] mt-1.5 font-medium">Add Photo</span>
                    </div>
                  )}
                  <label
                    htmlFor="photo-upload"
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition-opacity"
                  >
                    <Upload className="size-5" />
                  </label>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </div>
                <span className="text-[11px] text-gray-400 mt-2">Optional visitor photo</span>
              </div>

              {/* Primary Fields */}
              <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Full Name <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                    <Input
                      required
                      placeholder="e.g. Muhammad Ali / Sarah Khan"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-9 h-11 rounded-xl border-gray-200 dark:border-gray-800 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Phone Number <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                    <Input
                      required
                      placeholder="e.g. +92 300 1234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-9 h-11 rounded-xl border-gray-200 dark:border-gray-800 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Email Address (Optional)</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="e.g. visitor@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 h-11 rounded-xl border-gray-200 dark:border-gray-800 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">CNIC / National ID (Optional)</Label>
                  <div className="relative mt-1">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                    <Input
                      placeholder="e.g. 42101-1234567-1"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      className="pl-9 h-11 rounded-xl border-gray-200 dark:border-gray-800 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Branch Location */}
              <div>
                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Company Branch / Location</Label>
                <div className="mt-1">
                  <SearchableSelect
                    className="w-full h-11 rounded-xl border-gray-200 dark:border-gray-800 text-xs sm:text-sm bg-white dark:bg-gray-900"
                    icon={<MapPin className="w-3.5 h-3.5 text-gray-400" />}
                    placeholder="Select branch..."
                    searchPlaceholder="Search branch..."
                    value={companyId}
                    onValueChange={setCompanyId}
                    options={locations.map((loc) => ({
                      value: String(loc.id),
                      label: loc.name || `Location #${loc.id}`,
                    }))}
                  />
                </div>
              </div>

              {/* Department */}
              <div>
                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Department</Label>
                <div className="mt-1">
                  <SearchableSelect
                    className="w-full h-11 rounded-xl border-gray-200 dark:border-gray-800 text-xs sm:text-sm bg-white dark:bg-gray-900"
                    icon={<Building2 className="w-3.5 h-3.5 text-gray-400" />}
                    placeholder="Select department..."
                    searchPlaceholder="Search department..."
                    value={departmentId}
                    onValueChange={setDepartmentId}
                    options={[
                      { value: 'all', label: 'All Departments / General' },
                      ...departments.map((dept) => ({
                        value: String(dept.id),
                        label: dept.title || dept.name || `Dept #${dept.id}`,
                      })),
                    ]}
                  />
                </div>
              </div>

              {/* Host Employee */}
              <div>
                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Host Employee</Label>
                <div className="mt-1">
                  <SearchableSelect
                    className="w-full h-11 rounded-xl border-gray-200 dark:border-gray-800 text-xs sm:text-sm bg-white dark:bg-gray-900"
                    icon={<User className="w-3.5 h-3.5 text-gray-400" />}
                    placeholder="Select employee being visited..."
                    searchPlaceholder="Search employee..."
                    value={hostId}
                    onValueChange={setHostId}
                    options={[
                      { value: 'all', label: 'General / No Specific Host' },
                      ...employees.map((emp) => ({
                        value: String(emp.id),
                        label: `${emp.firstName} ${emp.lastName || ''} (${emp.employeeId || emp.designation || 'Staff'})`.trim(),
                      })),
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Purpose of Visit */}
              <div>
                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Purpose of Visit</Label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="mt-1 w-full h-11 px-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none"
                >
                  {visitPurposes.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Visit Start Date / Joining Date (Optional) */}
              <div>
                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Visit Start Date / Joining Date (Optional)
                </Label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-9 h-11 rounded-xl border-gray-200 dark:border-gray-800 text-sm"
                  />
                </div>
              </div>
            </div>

            {purpose === 'Other' && (
              <div>
                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Specify Purpose</Label>
                <Input
                  placeholder="Enter visit purpose..."
                  value={customPurpose}
                  onChange={(e) => setCustomPurpose(e.target.value)}
                  className="mt-1 h-11 rounded-xl border-gray-200 dark:border-gray-800 text-sm"
                />
              </div>
            )}
          </div>
        );

      case 3:
        const finalPurposeDisplay = purpose === 'Other' && customPurpose.trim() ? customPurpose.trim() : purpose;
        const hostDisplayName = selectedHost
          ? `${selectedHost.firstName} ${selectedHost.lastName || ''} (${selectedHost.employeeId || selectedHost.designation || 'Staff'})`
          : 'General / No Specific Host';
        const locationDisplayName = selectedLocation?.name || 'Default Branch';
        const departmentDisplayName = selectedDept?.title || selectedDept?.name || 'All Departments';

        return (
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-5 sm:p-6 space-y-6">
              {/* Header with Photo & Basic Info */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-4 border-b border-gray-200/60 dark:border-gray-800">
                <div className="size-20 rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Visitor" className="size-full object-cover" />
                  ) : (
                    <User className="size-10 text-gray-400" />
                  )}
                </div>
                <div className="text-center sm:text-left flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {fullName || 'Unnamed Visitor'}
                    </h3>
                    <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-xs font-semibold">
                      {finalPurposeDisplay}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Phone className="size-3.5 text-gray-400" /> {phone || '—'}
                    </span>
                    {email && (
                      <span className="flex items-center gap-1">
                        <Mail className="size-3.5 text-gray-400" /> {email}
                      </span>
                    )}
                    {nationalId && (
                      <span className="flex items-center gap-1 font-mono">
                        <CreditCard className="size-3.5 text-gray-400" /> {nationalId}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Visit Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-xl bg-white dark:bg-gray-950 border border-gray-200/70 dark:border-gray-800">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Branch Location</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 truncate">
                    <MapPin className="size-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">{locationDisplayName}</span>
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-gray-950 border border-gray-200/70 dark:border-gray-800">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Department</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 truncate">
                    <Building2 className="size-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate">{departmentDisplayName}</span>
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-gray-950 border border-gray-200/70 dark:border-gray-800">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Host Employee</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 truncate">
                    <User className="size-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{hostDisplayName}</span>
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-gray-950 border border-gray-200/70 dark:border-gray-800">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Start / Joining Date</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 truncate">
                    <Calendar className="size-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">{startDate || 'Immediate / Today'}</span>
                  </p>
                </div>
              </div>

              {/* Informational callout */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-blue-900 dark:text-blue-200 text-xs">
                <Info className="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p>
                  Once registered, this visitor record will appear in the <strong>Visitors</strong> directory. You can push them directly to biometric / facial attendance punch machines from the table actions.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto p-1 sm:p-2 pb-10 space-y-6">
      {/* ── Page Header & Breadcrumb ────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/visitors')}
          className="rounded-xl border-gray-200 dark:border-gray-800 h-9 w-9 shrink-0"
          title="Back to visitors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <button
              type="button"
              onClick={() => navigate('/visitors')}
              className="hover:text-blue-600 flex items-center gap-1"
            >
              <UserCheck className="size-3" />
              Visitors
            </button>
            <ChevronRight className="w-3 h-3" />
            <span>Add Visitor</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Add New Visitor</h1>
        </div>
      </div>

      {/* ── Main Stepper Grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6 items-start">
        {/* Stepper: vertical on desktop */}
        <aside className="hidden lg:block lg:sticky lg:top-4">
          <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm p-3">
            <p className="px-2 pt-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Step {step} of {totalSteps}
            </p>
            <ol className="space-y-1">
              {stepsConfig.map((s) => {
                const isActive = s.step === step;
                const isCompleted = s.step < step;
                const Icon = s.icon;
                return (
                  <li key={s.step}>
                    <button
                      type="button"
                      onClick={() => {
                        if (isCompleted) setStep(s.step);
                      }}
                      className={`w-full flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-950/50'
                          : isCompleted
                          ? 'hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer'
                          : 'cursor-default'
                      }`}
                    >
                      <span
                        className={`size-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : isCompleted
                            ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 dark:bg-emerald-950/50'
                            : 'bg-gray-100 text-gray-400 dark:bg-gray-900'
                        }`}
                      >
                        {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={`block text-sm font-semibold ${
                            isActive
                              ? 'text-blue-700 dark:text-blue-300'
                              : isCompleted
                              ? 'text-gray-900 dark:text-gray-100'
                              : 'text-gray-400'
                          }`}
                        >
                          {s.title}
                        </span>
                        <span className="block text-[11px] text-gray-500 dark:text-gray-400 truncate">
                          {s.subtitle}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="mt-3 mx-2 mb-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-900 overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </aside>

        {/* Form Card */}
        <Card className="gap-0 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden bg-white dark:bg-gray-950 min-w-0">
          {/* Compact stepper for small screens */}
          <div className="lg:hidden flex items-center gap-1.5 px-4 pt-4">
            {stepsConfig.map((s) => (
              <div
                key={s.step}
                className={`h-1.5 flex-1 rounded-full ${
                  s.step < step ? 'bg-emerald-500' : s.step === step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-800'
                }`}
              />
            ))}
          </div>

          {/* Step Header */}
          <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
            <div className="size-10 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center shrink-0">
              <CurrentStepIcon className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Step {step} of {totalSteps}
              </p>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{currentStep.title}</h2>
            </div>
            <span className="ml-auto hidden sm:block text-xs text-gray-500 dark:text-gray-400">
              {currentStep.subtitle}
            </span>
          </div>

          <CardContent className="p-0">
            {/* Step Body */}
            <div className="p-5 sm:p-6">{renderStepContent()}</div>

            {/* Sticky Step Footer Navigation */}
            <div className="sticky bottom-0 flex items-center justify-between gap-2 px-5 sm:px-6 py-4 bg-white/95 dark:bg-gray-950/95 backdrop-blur border-t border-gray-100 dark:border-gray-800">
              <Button
                type="button"
                variant="outline"
                onClick={goToPrevious}
                disabled={step === 1 || submitting}
                className="rounded-lg h-10 px-4"
              >
                <ChevronLeft className="mr-1 size-4" />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/visitors')}
                  disabled={submitting}
                  className="rounded-lg h-10 px-4"
                >
                  Cancel
                </Button>

                {step < totalSteps ? (
                  <Button
                    type="button"
                    onClick={goToNext}
                    disabled={!canGoNext() || submitting}
                    className="rounded-lg h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    Next
                    <ChevronRight className="ml-1 size-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={submitting}
                    className="rounded-lg h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 shadow-xs"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" />
                        <span>Saving Visitor...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-4" />
                        <span>Save Visitor</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
