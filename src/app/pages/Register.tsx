import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { organizationAPI } from "../services/api";
import ReactSelect from 'react-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
const ALL_TIMEZONES = Intl.supportedValuesOf('timeZone');
export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    emergencyContact: "",
    address: "",
    totalEmployees: "",
    category: "",
    orgTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // sensible default
  });

  const categories = [
    "IT Services",
    "Software House",
    "Fintech",
    "Healthcare",
    "Construction",
    "Education",
    "Manufacturing",
    "Retail",
    "Logistics",
    "Marketing Agency",
    "Real Estate",
    "NGO",
    "Government",
    "Startup",
    "SaaS",
  ];

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(""); // clear error on change
  };

  const validateForm = () => {
    if (!form.name.trim()) return "Organization name is required";
    if (!form.email.trim()) return "Email is required";
    if (!form.phone.trim()) return "Phone number is required";
    
    return "";
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    try {
      setLoading(true);
      setError("");

      await organizationAPI.registerOrganization({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        emergencyContact: form.emergencyContact.trim() || undefined,
        address: form.address.trim() || undefined,
        totalEmployees: form.totalEmployees ? Number(form.totalEmployees) : undefined,
        category: form.category || undefined,
        timeZone: form.orgTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone, // sensible default
      });


      toast.success("Organization registered successfully!");
      alert(
        "Your organization has been registered.\n\n" +
        "After verification, login credentials will be sent to your email."
      );

      navigate("/login");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Registration failed. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-100">

      {/* LEFT SIDE - Brand Panel (same as Login) */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 text-white items-center justify-center p-12">
        <div className="max-w-md space-y-6">
          <div className="flex items-center gap-3">
            <ShieldCheck size={32} />
            <h1 className="text-3xl font-bold">FrontPin HRM</h1>
          </div>

          <p className="text-lg text-blue-100 leading-relaxed">
            Manage employees, payroll, attendance and projects —
            all in one secure HR platform.
          </p>

          <div className="text-sm text-blue-200">
            Secure • Multi-tenant • Enterprise Ready
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Register Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6">
        <Card className="w-full p-8 shadow-2xl rounded-2xl bg-white space-y-6">

          <div className="text-center">
            <h2 className="text-2xl font-bold">Create Organization</h2>
            <p className="text-gray-500 text-sm">
              Get started with your HR management platform
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <div className="space-y-2 md:col-span-2">
              <Label>Organization Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. Acme Corporation"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="admin@yourcompany.com"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+92 300 1234567"
                className="h-11"
              />
            </div>

         

            <div className="space-y-2">
              <Label>Emergency Contact</Label>
              <Input
                value={form.emergencyContact}
                onChange={(e) => handleChange("emergencyContact", e.target.value)}
                placeholder="Optional"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
      <Label>Timezone </Label>
      <ReactSelect
        isSearchable
        isClearable
        
        options={ALL_TIMEZONES.map(tz => ({ label: tz, value: tz }))}
        value={form.orgTimeZone ? { label: form.orgTimeZone, value: form.orgTimeZone } : null}
        onChange={(selectedOption) => {
          setForm(prev => ({
            ...prev,
            orgTimeZone: selectedOption ? selectedOption.value : ""
          }));
        }}
        placeholder="Search timezone"
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

            <div className="space-y-2 md:col-span-2">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="Office #, Street, City"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label>Total Employees</Label>
              <Input
                type="number"
                value={form.totalEmployees}
                onChange={(e) => handleChange("totalEmployees", e.target.value)}
                placeholder="e.g. 25"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label>Industry Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => handleChange("category", v)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>

          <Button
            className="w-full h-11"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Organization"}
          </Button>

          <div className="text-center text-sm text-gray-500 pt-2">
            Already have an account?{" "}
            <span
              className="text-blue-600 cursor-pointer hover:underline"
              onClick={() => navigate("/login")}
            >
              Sign in
            </span>
          </div>

          <div className="text-center text-xs text-gray-400 pt-4">
            © 2025 FrontPin HRM
          </div>

        </Card>
      </div>
    </div>
  );
};