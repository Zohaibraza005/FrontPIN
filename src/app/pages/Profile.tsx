//@ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { API_URL, employeeAPI } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  Shield,
  Key,
  Camera,
  CheckCircle2,
  Building,
  Briefcase,
  Calendar,
  Lock,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck,
  CreditCard,
  Hash,
  Award,
} from "lucide-react";

export const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [savingPin, setSavingPin] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [detailData, setDetailData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"personal" | "security" | "job" | "privileges">("personal");

  // Personal form state
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [nationalId, setNationalId] = useState(user?.nationalId || "");
  const [employeeId, setEmployeeId] = useState(user?.employeeId || "");

  // Security form state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // PIN form state
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  // Profile image state
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(
    user?.profileImage
      ? user.profileImage.startsWith("http")
        ? user.profileImage
        : `${API_URL}${user.profileImage}`
      : null
  );

  useEffect(() => {
    if (user?.id) {
      fetchEmployeeDetails();
    }
  }, [user?.id]);

  const fetchEmployeeDetails = async () => {
    setLoading(true);
    try {
      const res = await employeeAPI.getDetail(user.id);
      if (res && res.data) {
        const emp = res.data;
        setDetailData(emp);
        setFirstName(emp.firstName || "");
        setLastName(emp.lastName || "");
        setUsername(emp.username || "");
        setEmail(emp.email || "");
        setPhoneNumber(emp.phoneNumber || "");
        setNationalId(emp.nationalId || "");
        setEmployeeId(emp.employeeId || "");
        setPin(emp.pin || "");
        if (emp.profileImage) {
          setProfileImagePreview(
            emp.profileImage.startsWith("http")
              ? emp.profileImage
              : `${API_URL}${emp.profileImage}`
          );
        }
      }
    } catch (err) {
      console.error("Failed to load employee details:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Handle Avatar Upload
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show instant preview
    const previewUrl = URL.createObjectURL(file);
    setProfileImagePreview(previewUrl);

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("profileImage", file);
      formData.append("personal", JSON.stringify({ firstName, lastName }));

      const res = await employeeAPI.updateEmployee(user.id, formData);
      if (res && res.data) {
        const updatedImg = res.data.profileImage;
        updateUser({ profileImage: updatedImg });
        toast.success("Profile photo updated successfully!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile photo");
    } finally {
      setUploadingImage(false);
    }
  };

  // 🔹 Save Personal Details
  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPersonal(true);
    try {
      const formData = new FormData();
      formData.append(
        "personal",
        JSON.stringify({
          firstName,
          lastName,
          username,
          email,
          phoneNumber,
          nationalId,
          employeeId,
        })
      );

      const res = await employeeAPI.updateEmployee(user.id, formData);
      if (res && res.data) {
        updateUser({
          firstName: res.data.firstName,
          lastName: res.data.lastName,
          username: res.data.username,
          email: res.data.email,
          phoneNumber: res.data.phoneNumber,
          nationalId: res.data.nationalId,
          employeeId: res.data.employeeId,
        });
        toast.success("Personal information updated successfully!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update personal information");
    } finally {
      setSavingPersonal(false);
    }
  };

  // 🔹 Save Password
  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSavingSecurity(true);
    try {
      const formData = new FormData();
      formData.append(
        "personal",
        JSON.stringify({
          password: newPassword,
        })
      );

      await employeeAPI.updateEmployee(user.id, formData);
      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setSavingSecurity(false);
    }
  };

  // 🔹 Save Attendance PIN
  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length < 4) {
      toast.error("PIN must be at least 4 digits");
      return;
    }

    setSavingPin(true);
    try {
      await employeeAPI.setPIN(user.id, pin);
      toast.success("Attendance PIN updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update PIN");
    } finally {
      setSavingPin(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* ─────────────────────────────────────────────────────────────
          Hero Header Card - Clean Solid Single-Color Banner (No Gradient)
      ───────────────────────────────────────────────────────────── */}
      <Card className="border shadow-sm overflow-hidden rounded-2xl bg-white">
        {/* Solid Single-Color Top Banner (Blue #2563eb / bg-blue-600 matching system theme) */}
        <div className="h-36 sm:h-44 bg-blue-600 relative"></div>

        {/* Profile Info Overlay Row */}
        <CardContent className="px-6 sm:px-8 pb-6 relative pt-0">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-16 sm:-mt-20 mb-4">
            {/* Avatar with Upload Button */}
            <div className="relative group">
              <div className="size-28 sm:size-36 rounded-full ring-4 ring-white shadow-md overflow-hidden bg-blue-50 flex items-center justify-center text-4xl font-extrabold text-blue-600">
                {profileImagePreview ? (
                  <img
                    src={profileImagePreview}
                    alt={firstName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{(firstName || "U").charAt(0).toUpperCase()}</span>
                )}
              </div>

              {/* Upload Camera Trigger */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="absolute bottom-1 right-1 p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md border-2 border-white transition-colors"
                title="Update Profile Picture"
              >
                {uploadingImage ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>

            {/* Profile Title & Details */}
            <div className="flex-1 text-center sm:text-left space-y-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                  {firstName} {lastName}
                </h1>
                <Badge
                  variant="outline"
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize bg-blue-50 text-blue-700 border-blue-200"
                >
                  <Award className="size-3.5 mr-1 inline text-blue-600" />
                  {user?.role || "Employee"}
                </Badge>
              </div>

              <p className="text-sm text-gray-500 font-medium flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="flex items-center gap-1">
                  <Mail className="size-4 text-gray-400" />
                  {email}
                </span>
                {detailData?.company?.name && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="flex items-center gap-1">
                      <Building className="size-4 text-gray-400" />
                      {detailData.company.name}
                    </span>
                  </>
                )}
              </p>
            </div>

            {/* Refresh Sync Button */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchEmployeeDetails}
                disabled={loading}
                className="rounded-xl text-xs gap-1.5 border-gray-200 hover:bg-gray-50"
              >
                <RefreshCw className={`size-3.5 text-gray-500 ${loading ? "animate-spin" : ""}`} />
                <span>Sync Profile</span>
              </Button>
            </div>
          </div>
        </CardContent>

        {/* Tab Navigation Bar */}
        <div className="border-t border-gray-100 px-6 sm:px-8 bg-gray-50/50 flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab("personal")}
            className={`py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "personal"
                ? "border-blue-600 text-blue-600 bg-white"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <User className="size-4" />
            Personal Details
          </button>

          <button
            onClick={() => setActiveTab("security")}
            className={`py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "security"
                ? "border-blue-600 text-blue-600 bg-white"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <Shield className="size-4" />
            Security & PIN
          </button>

          <button
            onClick={() => setActiveTab("job")}
            className={`py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "job"
                ? "border-blue-600 text-blue-600 bg-white"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <Briefcase className="size-4" />
            Job & Employment
          </button>

          <button
            onClick={() => setActiveTab("privileges")}
            className={`py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "privileges"
                ? "border-blue-600 text-blue-600 bg-white"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <Sparkles className="size-4" />
            System Privileges
          </button>
        </div>
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          Tab Content Sections
      ───────────────────────────────────────────────────────────── */}

      {/* TAB 1: Personal Details */}
      {activeTab === "personal" && (
        <Card className="shadow-sm border rounded-2xl bg-white p-6 sm:p-8">
          <CardHeader className="p-0 pb-6 mb-6 border-b">
            <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <User className="size-5 text-blue-600" />
              <span>Personal Information</span>
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              Update your personal information and contact details.
            </p>
          </CardHeader>

          <form onSubmit={handleSavePersonal} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* First Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">First Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                    className="pl-9 h-10 text-sm rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Last Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Last Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                    className="pl-9 h-10 text-sm rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Username</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    className="pl-9 h-10 text-sm rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email"
                    className="pl-9 h-10 text-sm rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="pl-9 h-10 text-sm rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* National ID / CNI */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">National ID / CNI</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="Enter national ID"
                    className="pl-9 h-10 text-sm rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Employee ID */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Employee Code / ID</Label>
                <div className="relative">
                  <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="EMP-001"
                    className="pl-9 h-10 text-sm rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button
                type="submit"
                disabled={savingPersonal}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 h-10 text-sm font-semibold shadow-sm"
              >
                {savingPersonal ? (
                  <>
                    <RefreshCw className="size-4 mr-2 animate-spin" /> Saving Changes...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4 mr-2" /> Save Personal Info
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* TAB 2: Security & PIN */}
      {activeTab === "security" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Password Update Card */}
          <Card className="shadow-sm border rounded-2xl bg-white p-6">
            <CardHeader className="p-0 pb-4 mb-4 border-b">
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Lock className="size-5 text-blue-600" />
                <span>Change Password</span>
              </CardTitle>
              <p className="text-xs text-gray-500">
                Update your account login password.
              </p>
            </CardHeader>

            <form onSubmit={handleSaveSecurity} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="pl-9 pr-10 h-10 text-sm rounded-xl border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="pl-9 pr-10 h-10 text-sm rounded-xl border-gray-200"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={savingSecurity}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 text-sm font-semibold shadow-sm"
                >
                  {savingSecurity ? "Updating Password..." : "Update Password"}
                </Button>
              </div>
            </form>
          </Card>

          {/* Attendance PIN Card */}
          <Card className="shadow-sm border rounded-2xl bg-white p-6">
            <CardHeader className="p-0 pb-4 mb-4 border-b">
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Key className="size-5 text-blue-600" />
                <span>Attendance Check-in PIN</span>
              </CardTitle>
              <p className="text-xs text-gray-500">
                Set a 4-digit security PIN used for quick daily attendance clock-in.
              </p>
            </CardHeader>

            <form onSubmit={handleSavePin} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Security PIN</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    type={showPin ? "text" : "password"}
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="e.g. 1234"
                    className="pl-9 pr-10 h-10 text-sm rounded-xl border-gray-200 tracking-widest font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={savingPin}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 text-sm font-semibold shadow-sm"
                >
                  {savingPin ? "Updating PIN..." : "Set Attendance PIN"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* TAB 3: Job & Employment Overview */}
      {activeTab === "job" && (
        <Card className="shadow-sm border rounded-2xl bg-white p-6 sm:p-8 space-y-6">
          <CardHeader className="p-0 pb-4 border-b">
            <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Briefcase className="size-5 text-blue-600" />
              <span>Employment & Organization Details</span>
            </CardTitle>
            <p className="text-xs text-gray-500">
              Overview of your role, department, and work configurations in the organization.
            </p>
          </CardHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Designation */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Designation</span>
              <p className="font-bold text-gray-900 text-base">
                {detailData?.jobInfo?.designation || "Employee"}
              </p>
            </div>

            {/* Department */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Department</span>
              <p className="font-bold text-gray-900 text-base">
                {detailData?.department?.name || "General"}
              </p>
            </div>

            {/* Organization / Company */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Company / Location</span>
              <p className="font-bold text-gray-900 text-base">
                {detailData?.company?.name || "Main Location"}
              </p>
            </div>

            {/* Employment Status */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Employment Status</span>
              <p className="font-bold text-blue-700 text-base capitalize">
                {detailData?.jobInfo?.employmentStatus || "Full Time"}
              </p>
            </div>

            {/* Work Mode */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Work Mode</span>
              <p className="font-bold text-blue-700 text-base capitalize">
                {detailData?.jobInfo?.workMode || "Onsite"}
              </p>
            </div>

            {/* Hiring Date */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Hiring Date</span>
              <p className="font-bold text-gray-900 text-base">
                {detailData?.jobInfo?.hiringDate
                  ? new Date(detailData.jobInfo.hiringDate).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "N/A"}
              </p>
            </div>

            {/* Supervisor */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1 sm:col-span-2 lg:col-span-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Reporting Supervisor</span>
              <p className="font-bold text-gray-900 text-base">
                {detailData?.supervisor
                  ? `${detailData.supervisor.firstName} ${detailData.supervisor.lastName || ""}`
                  : "None Assigned"}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 4: System Privileges */}
      {activeTab === "privileges" && (
        <Card className="shadow-sm border rounded-2xl bg-white p-6 sm:p-8 space-y-6">
          <CardHeader className="p-0 pb-4 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="size-5 text-blue-600" />
                <span>Privileges</span>
              </CardTitle>
              <p className="text-xs text-gray-500 mt-1">
                Permissions assigned to your user account across platform modules.
              </p>
            </div>
          </CardHeader>

          {user?.role === "ADMIN" && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-3">
              <Shield className="size-6 text-blue-600 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-blue-900 text-sm">Full Administrative Access</h4>
                <p className="text-xs text-blue-700">
                  As an Administrator, you have complete read, create, update, and delete access across all modules in the application.
                </p>
              </div>
            </div>
          )}

          {/* Module Permissions Table */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-900">Module Permissions</h3>
            {(() => {
              const rawPrivileges = detailData?.privileges || user?.privileges || [];
              const filteredPrivileges = rawPrivileges.filter((p: any) => {
                const mod = String(p.module || "").toUpperCase();
                // Filter out EMPLOYEE module access for non-admin users
                if (user?.role !== "ADMIN" && mod === "EMPLOYEE") {
                  return false;
                }
                return true;
              });

              const MODULE_LABELS: Record<string, string> = {
                ATTENDANCE: "Attendance",
                LEAVE: "Leave",
                OVERTIME: "Overtime",
                SCHEDULE: "Schedule",
                REPORT: "Reports",
                TASK: "Tasks",
                PROJECT: "Projects",
                EMPLOYEE: "Employee",
              };

              // Fallback list of standard user modules if no custom DB privileges
              const displayList = filteredPrivileges.length > 0
                ? filteredPrivileges
                : [
                    { module: "ATTENDANCE", canCreate: true, canRead: true, canUpdate: false, canDelete: false },
                    { module: "LEAVE", canCreate: true, canRead: true, canUpdate: false, canDelete: false },
                    { module: "OVERTIME", canCreate: true, canRead: true, canUpdate: false, canDelete: false },
                    { module: "SCHEDULE", canCreate: true, canRead: true, canUpdate: false, canDelete: false },
                  ];

              return (
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="grid grid-cols-6 bg-gray-100/70 dark:bg-gray-900/80 px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-300 border-b">
                    <div>Module</div>
                    <div className="text-center">Create</div>
                    <div className="text-center">Read</div>
                    <div className="text-center">Update</div>
                    <div className="text-center">Delete</div>
                    <div className="text-center">Own Team</div>
                  </div>

                  {displayList.map((priv: any, index: number) => {
                    const modKey = String(priv.module).toUpperCase();
                    const label = MODULE_LABELS[modKey] || priv.module;
                    const canCreate = user?.role === "ADMIN" || Boolean(priv.canCreate);
                    const canRead = user?.role === "ADMIN" || Boolean(priv.canRead);
                    const canUpdate = user?.role === "ADMIN" || Boolean(priv.canUpdate);
                    const canDelete = user?.role === "ADMIN" || Boolean(priv.canDelete);

                    return (
                      <div
                        key={index}
                        className={`grid grid-cols-6 items-center px-4 py-3.5 text-sm border-t border-gray-100 ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                        }`}
                      >
                        <div className="font-semibold text-gray-900">{label}</div>

                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            disabled
                            checked={canCreate}
                            className="size-4 accent-primary cursor-default disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </div>

                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            disabled
                            checked={canRead}
                            className="size-4 accent-primary cursor-default disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </div>

                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            disabled
                            checked={canUpdate}
                            className="size-4 accent-primary cursor-default disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </div>

                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            disabled
                            checked={canDelete}
                            className="size-4 accent-primary cursor-default disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </div>

                        <div className="flex justify-center text-xs text-gray-400 font-medium">
                          {priv.ownTeamOnly ? (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">Yes</span>
                          ) : (
                            "—"
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </Card>
      )}
    </div>
  );
};
