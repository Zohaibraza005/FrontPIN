//@ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
  Clock,
  Phone,
  Mail,
  CreditCard,
  Camera,
  Upload,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Car,
  ShieldCheck,
  Sparkles,
  RefreshCw,
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

export const AddVisitor: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error('Please enter the visitor full name');
      return;
    }

    if (!phone.trim()) {
      toast.error('Please enter visitor phone number');
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
      formData.append('status', 'CHECKED_IN');
      formData.append('checkInTime', new Date().toISOString());
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

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* ── Top Header & Breadcrumb ────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Link to="/visitors" className="hover:text-blue-600 font-medium flex items-center gap-1">
              <UserCheck className="size-3.5" /> Visitors
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-semibold">Add Visitor</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Add New Visitor</h2>
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold">
              Real-time DB
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Register visitor credentials, assign host employee, issue badge and save directly to company records
          </p>
        </div>

        <Button
          variant="outline"
          asChild
          className="rounded-xl border-gray-200 text-gray-600 hover:text-gray-900"
        >
          <Link to="/visitors">
            <ArrowLeft className="size-4 mr-1.5" /> Back to Visitors
          </Link>
        </Button>
      </div>

      {/* ── Main Form Card ────────────────────────────────────────── */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* 1. VISITOR PERSONAL INFORMATION */}
          <Card className="border border-gray-200/80 shadow-2xs rounded-2xl bg-white overflow-hidden">
            <div className="p-4 px-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Visitor Personal Details</h3>
                  <p className="text-xs text-gray-500">Full name, contact and identification details</p>
                </div>
              </div>
            </div>

            <CardContent className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-2">
                {/* Photo Preview / Upload */}
                <div className="flex flex-col items-center">
                  <div className="relative size-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden group">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="size-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-gray-400 group-hover:text-blue-600">
                        <Camera className="size-7" />
                        <span className="text-[10px] mt-1 font-medium">Add Photo</span>
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
                  <span className="text-[11px] text-gray-400 mt-1.5">Optional photo/pass</span>
                </div>

                {/* Primary Info */}
                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-gray-700">
                      Full Name <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                      <Input
                        required
                        placeholder="e.g. Muhammad Ali / Sarah Khan"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-9 h-10 rounded-xl border-gray-200 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-gray-700">
                      Phone Number <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                      <Input
                        required
                        placeholder="e.g. +92 300 1234567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-9 h-10 rounded-xl border-gray-200 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-gray-700">Email Address (Optional)</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                      <Input
                        type="email"
                        placeholder="e.g. visitor@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9 h-10 rounded-xl border-gray-200 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-gray-700">CNIC / National ID (Optional)</Label>
                    <div className="relative mt-1">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                      <Input
                        placeholder="e.g. 42101-1234567-1"
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value)}
                        className="pl-9 h-10 rounded-xl border-gray-200 text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. VISIT PURPOSE & HOST ASSIGNMENT */}
          <Card className="border border-gray-200/80 shadow-2xs rounded-2xl bg-white overflow-hidden">
            <div className="p-4 px-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Visit Assignment & Host</h3>
                  <p className="text-xs text-gray-500">Destination branch, visiting employee host and purpose</p>
                </div>
              </div>
            </div>

            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Branch Location */}
                <div>
                  <Label className="text-xs font-semibold text-gray-700">Company Branch / Location</Label>
                  <div className="mt-1">
                    <SearchableSelect
                      className="w-full h-10 rounded-xl border-gray-200 text-xs sm:text-sm bg-white"
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
                  <Label className="text-xs font-semibold text-gray-700">Department</Label>
                  <div className="mt-1">
                    <SearchableSelect
                      className="w-full h-10 rounded-xl border-gray-200 text-xs sm:text-sm bg-white"
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
                  <Label className="text-xs font-semibold text-gray-700">Host Employee</Label>
                  <div className="mt-1">
                    <SearchableSelect
                      className="w-full h-10 rounded-xl border-gray-200 text-xs sm:text-sm bg-white"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Purpose of Visit */}
                <div>
                  <Label className="text-xs font-semibold text-gray-700">Purpose of Visit</Label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="mt-1 w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:border-blue-500"
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
                  <Label className="text-xs font-semibold text-gray-700">Visit Start Date / Joining Date (Optional)</Label>
                  <div className="relative mt-1">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="pl-9 h-10 rounded-xl border-gray-200 text-sm"
                    />
                  </div>
                </div>
              </div>

              {purpose === 'Other' && (
                <div>
                  <Label className="text-xs font-semibold text-gray-700">Specify Purpose</Label>
                  <Input
                    placeholder="Enter visit purpose..."
                    value={customPurpose}
                    onChange={(e) => setCustomPurpose(e.target.value)}
                    className="mt-1 h-10 rounded-xl border-gray-200 text-sm"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Action Buttons ────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              asChild
              className="h-11 px-5 rounded-xl border-gray-200 text-gray-700"
            >
              <Link to="/visitors">Cancel</Link>
            </Button>

            <Button
              type="submit"
              disabled={submitting}
              className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs font-semibold flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  <span>Save Visitor</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
