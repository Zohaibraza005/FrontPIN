import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { authAPI } from "../services/api";

export const Login: React.FC = () => {
  const [step, setStep] = useState<"identifier" | "password">("identifier");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [userPreview, setUserPreview] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated, navigate]);

  const handleIdentifierChange = (value: string) => {
    const cleaned = value.replace(/-/g, "");
    setIdentifier(cleaned);
  };

  const handleCheckIdentifier = async () => {
    if (!identifier.trim()) {
      setError("Please enter your identifier");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await authAPI.checkIdentifier(identifier);

      setUserPreview(res.data.data);
      setStep("password");
      setError(""); // clear any previous error
    } catch (err: any) {
      setError(err.response?.data?.message || "User not found");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await login(identifier, password);

      toast.success("Login successful!");
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid password");
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault(); // prevent form submit default behavior
      if (step === "identifier") {
        handleCheckIdentifier();
      } else if (step === "password") {
        handleSubmit();
      }
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* LEFT SIDE (Brand Panel) */}
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

      {/* RIGHT SIDE (Login Card) */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 shadow-2xl rounded-2xl bg-white space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Welcome Back</h2>
            <p className="text-gray-500 text-sm">Sign in to your account</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* STEP 1 - Identifier */}
          {step === "identifier" && (
            <>
              <div className="space-y-2">
                <Label>Email / Username / Employee ID / Phone / CNIC</Label>
                <Input
                  value={identifier}
                  onChange={(e) => handleIdentifierChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter your identifier"
                  className="h-11"
                  autoFocus
                />
                <p className="text-xs text-gray-400">
                  CNIC without dashes (e.g. 3520212345678)
                </p>
              </div>

              <Button
                className="w-full h-11"
                onClick={handleCheckIdentifier}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Checking...
                  </span>
                ) : (
                  "Continue"
                )}
              </Button>
            </>
          )}

          {/* STEP 2 - Password */}
          {step === "password" && (
            <>
              <div className="text-center space-y-1">
                <p className="font-medium text-lg">{userPreview?.name}</p>
                <button
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() => {
                    setStep("identifier");
                    setPassword("");
                    setError("");
                  }}
                >
                  Change account
                </button>
              </div>

              <div className="space-y-2 relative">
                <Label>Password</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-11 pr-10"
                  placeholder="••••••••"
                  autoFocus
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <Button
                className="w-full h-11"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Signing in...
                  </span>
                ) : (
                  "Login"
                )}
              </Button>
            </>
          )}

          <div className="text-center text-sm text-gray-500 space-y-2 pt-2">
            <div>
              Don’t have an organization?{" "}
              <span
                onClick={() => navigate("/register")}
                className="text-blue-600 cursor-pointer hover:underline font-medium"
              >
                Register Now
              </span>
            </div>

            <div className="text-xs text-gray-400 pt-2">© 2025 FrontPin HRM</div>
          </div>
        </Card>
      </div>
    </div>
  );
};