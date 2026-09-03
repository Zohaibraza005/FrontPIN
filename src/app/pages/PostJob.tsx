// pages/PostJob.tsx
import { useState } from "react";
import { departmentAPI, locationAPI, jobAPI } from "../services/api";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle, } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { toast } from "sonner";

export default function PostJob() {
  const navigate = useNavigate();

  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [depRes, locRes] = await Promise.all([
          departmentAPI.getDepartments(),
          locationAPI.getLocations(),
        ]);

        setDepartments(depRes.data);
        setLocations(locRes.data);

      } catch (err) {
        toast.error("Failed to load departments or locations");
      }
    };

    fetchData();
  }, []);

  const [form, setForm] = useState({
    title: "",
    description: "",
    department: "",
    location: "",
    experience: "",
    salaryMin: "",
    salaryMax: "",
    positions: "",
    employmentType: "",
    deadline: "",
    priority: "MEDIUM",
    hiringManager: "",
    skills: "",
  });

  const handleSubmit = async () => {
    try {
      if (!form.title || !form.department || !form.location) {
        toast.error("Please fill required fields");
        return;
      }

      const payload = {
        ...form,
        experience: form.experience ? Number(form.experience) : null,
        salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
        positions: form.positions ? Number(form.positions) : null,
        deadline: form.deadline || null,
      };

      await jobAPI.createJob(payload);

      toast.success("🎉 Job posted successfully!");

      navigate("/jobs");

    } catch (error) {
      console.error(error);
      toast.error("Failed to post job");
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-10 space-y-8">

      {/* ================= HEADER ================= */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/jobs')}
            className="p-2 rounded-lg border hover:bg-gray-100 transition"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <h2 className="text-2xl font-bold">Post a Job Vacancy</h2>
            <p className="text-gray-500 text-sm">
              Create and publish a new hiring opportunity
            </p>
          </div>
        </div>

       
      </div>

      {/* ================= FORM CARD ================= */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>

        <CardContent className="space-y-8">

          {/* Job Title */}
          <div className="space-y-2">
            <Label>Job Title *</Label>
            <Input
              placeholder="e.g. Senior Frontend Developer"
              value={form.title}
              onChange={(e) =>
                setForm({ ...form, title: e.target.value })
              }
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Job Description</Label>
            <Textarea
              rows={5}
              placeholder="Describe responsibilities, expectations and role details..."
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>

          {/* Department & Location */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Department *</Label>
              <Select
                onValueChange={(v) =>
                  setForm({ ...form, department: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dep) => (
                    <SelectItem key={dep.id} value={dep.id.toString()}>
                      {dep.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Location *</Label>
              <Select
                onValueChange={(v) =>
                  setForm({ ...form, location: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id.toString()}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Experience & Positions */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Experience Required (Years)</Label>
              <Input
                type="number"
                placeholder="e.g. 3"
                value={form.experience}
                onChange={(e) =>
                  setForm({ ...form, experience: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Number of Positions</Label>
              <Input
                type="number"
                placeholder="e.g. 2"
                value={form.positions}
                onChange={(e) =>
                  setForm({ ...form, positions: e.target.value })
                }
              />
            </div>
          </div>

          {/* Salary */}
          <div>
            <Label className="mb-3 block">Salary Range</Label>
            <div className="grid grid-cols-2 gap-6">
              <Input
                type="number"
                placeholder="Minimum Salary"
                value={form.salaryMin}
                onChange={(e) =>
                  setForm({ ...form, salaryMin: e.target.value })
                }
              />
              <Input
                type="number"
                placeholder="Maximum Salary"
                value={form.salaryMax}
                onChange={(e) =>
                  setForm({ ...form, salaryMax: e.target.value })
                }
              />
            </div>
          </div>

          {/* Employment Type & Deadline */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Employment Type</Label>
              <Select
                onValueChange={(v) =>
                  setForm({ ...form, employmentType: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Employment Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FullTime">Full Time</SelectItem>
                  <SelectItem value="PartTime">Part Time</SelectItem>
                  <SelectItem value="Contract">Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Application Deadline</Label>
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) =>
                  setForm({ ...form, deadline: e.target.value })
                }
              />
            </div>
          </div>

          {/* Priority & Hiring Manager */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                onValueChange={(v) =>
                  setForm({ ...form, priority: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Hiring Manager</Label>
              <Input
                placeholder="Manager Name"
                value={form.hiringManager}
                onChange={(e) =>
                  setForm({ ...form, hiringManager: e.target.value })
                }
              />
            </div>
          </div>

          {/* Skills */}
          <div className="space-y-2">
            <Label>Required Skills</Label>
            <Textarea
              placeholder="e.g. React, Node.js, Communication..."
              value={form.skills}
              onChange={(e) =>
                setForm({ ...form, skills: e.target.value })
              }
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSubmit}>
              Publish Job
            </Button>
          </div>
        </CardContent>

      </Card>
    </div>
  );
}