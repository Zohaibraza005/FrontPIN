// Applicants.tsx
import React, { useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import SummaryCards from "../components/applicants/SummaryCards";
import JobFilter from "../components/applicants/JobFilter";
import RecruitmentAnalytics from "../components/applicants/RecruitmentAnalytics";
import KanbanBoard from "../components/applicants/KanbanBoard";
import ApplicantSheet from "../components/applicants/ApplicantSheet";
import InterviewModal from "../components/applicants/InterviewModal";
import OfferModal from "../components/applicants/OfferModal";
import { Button } from "../components/ui/button";
import { ArrowLeft, Plus, X } from "lucide-react";
import { useNavigate } from "react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";
import { useParams } from "react-router";

import { applicantAPI,candidateAPI, employeeAPI, jobAPI  } from "../services/api";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '../components/ui/sheet';
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Checkbox } from "../components/ui/checkbox";



const mockApplicants = [
  { id: 1, name: "Ali Khan", job: "Frontend Dev", status: "APPLIED", experience: 3, email: "ali@mail.com", phone: "0300" },
  { id: 2, name: "Sara Ahmed", job: "Backend Dev", status: "INTERVIEW", experience: 4, email: "sara@mail.com", phone: "0301" },
  { id: 3, name: "Usman Tariq", job: "HR Executive", status: "OFFERED", experience: 2, email: "usman@mail.com", phone: "0302" },
  { id: 4, name: "Fatima Noor", job: "Frontend Dev", status: "HIRED", experience: 5, email: "fatima@mail.com", phone: "0303" },
];

export default function JobApplicants() {
  const navigate = useNavigate()
  const { jobId } = useParams();
const [applicants, setApplicants] = useState<any[]>([]);
const [loading, setLoading] = useState(true);
const [jobTitle, setJobTitle] = useState("");
  const [selectedJob, setSelectedJob] = useState("ALL");
  const [selectedPriority, setSelectedPriority] = useState("ALL");
  const [selectedApplicant, setSelectedApplicant] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
const [selectedJobId, setSelectedJobId] = useState("");
const [excelFile, setExcelFile] = useState<File | null>(null);
const [candidateSheetOpen, setCandidateSheetOpen] = useState(false);
const [editMode, setEditMode] = useState(false);
const [editingCandidate, setEditingCandidate] = useState<any>(null);
const [scheduleOpen, setScheduleOpen] = useState(false);
const [offerModalOpen, setOfferModalOpen] = useState(false);
const [hireModalOpen, setHireModalOpen] = useState(false);
const [candidateToHire, setCandidateToHire] = useState<any>(null);

const [employees, setEmployees] = useState<any[]>([]);
const [candidateSearch, setCandidateSearch] = useState("");
const [candidateSelectOpen, setCandidateSelectOpen] = useState(false);

const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);
const [interviewDate, setInterviewDate] = useState("");
const [selectedInterviewer, setSelectedInterviewer] = useState("");
const [sendInterviewEmail, setSendInterviewEmail] = useState(false);
const [offeredSalary, setOfferedSalary] = useState("");
const [sendOfferEmail, setSendOfferEmail] = useState(false);

const [candidateForm, setCandidateForm] = useState({
  name: "",
  email: "",
  phone: "",
  cnic: "",
  address: "",
  qualification: "",
  experience: "",
  
});

const [cvFile, setCvFile] = useState<File | null>(null);
const openAddCandidate = () => {
  setEditMode(false);
  setEditingCandidate(null);
  setCandidateForm({
    name: "",
    email: "",
    phone: "",
    cnic: "",
    address: "",
    qualification: "",
    experience: "",
    
  });
  setCvFile(null);
  setCandidateSheetOpen(true);
};

const openEditCandidate = (candidate: any) => {
  setEditMode(true);
  setEditingCandidate(candidate);
  setCandidateForm({
    name: candidate.name,
    email: candidate.email,
    phone: candidate.phone,
    cnic: candidate.cnic || "",
    address: candidate.address || "",
    qualification: candidate.qualification || "",
    experience: candidate.experience,
    
  });
  setCandidateSheetOpen(true);
};
useEffect(() => {
    const fetchEmployees = async () => {
      const res = await employeeAPI.getActiveEmployees();
      setEmployees(res.data);
    };
  
    fetchEmployees();
  }, []);
useEffect(() => {
    if (!jobId) return;
  
    const fetchData = async () => {
      try {
        setLoading(true);
  
        const [jobRes,candidatesRes] = await Promise.all([
           jobAPI.getJobById(Number(jobId)),
          candidateAPI.getByJob(Number(jobId)),
        ]);
  
        setJobTitle(jobRes.data.title);
        setApplicants(candidatesRes.data);
  
      } catch (err) {
        toast.error("Failed to load applicants");
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, [jobId]);
  const filteredApplicants =
    selectedJob === "ALL"
      ? applicants
      : applicants.filter((a) => a.job === selectedJob);

      const handleDrop = async (id: number, status: string) => {
        try {
          // optimistic update
          setApplicants((prev) =>
            prev.map((a) => (a.id === id ? { ...a, status } : a))
          );
      
          await candidateAPI.updateStatus(id, status);
      
        } catch (err) {
          toast.error("Status update failed");
        }
      };
  const handleBulkUpload = async () => {
  
    if (!excelFile) {
      toast.error("Please upload an Excel file");
      return;
    }
  
    try {
      const formData = new FormData();
      formData.append("jobId", jobId);
      formData.append("file", excelFile);
  
      // Example API call
      await applicantAPI.bulkUpload(formData);
  
      toast.success("Candidates uploaded successfully 🎉");
  
      setUploadModalOpen(false);
      setSelectedJobId("");
      setExcelFile(null);
  
    } catch (error) {
      toast.error("Upload failed");
    }
  };
  const handleCandidateSubmit = async () => {
    if (!candidateForm.name || !candidateForm.email) {
      toast.error("Name and Email required");
      return;
    }
  
    try {
      const formData = new FormData();
      const payload = {
        ...candidateForm,
        jobId: Number(jobId), // 🔥 always from URL
      };
      formData.append("data", JSON.stringify(payload));
  
      if (cvFile) {
        formData.append("cv", cvFile);
      }
  
      if (editMode) {
        await candidateAPI.updateCandidate(editingCandidate.id, formData);
        toast.success("Candidate updated successfully");
      } else {
        await candidateAPI.createCandidate(formData);
        toast.success("Candidate added successfully");
      }
      
      // 🔥 refresh
      const refreshed = await candidateAPI.getByJob(Number(jobId));
      setApplicants(refreshed.data);
      
      setCandidateSheetOpen(false);
  
    } catch (error) {
      toast.error("Something went wrong");
    }
  };
  const shortlistedCandidates = applicants.filter(
    (c) => c.status === "SHORTLISTED"
  );
  if (loading) {
    return <div className="p-6">Loading applicants...</div>;
  }
  return (
    <DndProvider backend={HTML5Backend}>
       <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
        <button
            onClick={() => navigate('/jobs')}
            className="p-2 rounded-lg border hover:bg-gray-100 transition"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-2xl font-bold">
                Applicants – {jobTitle}
                </h2>
          {/* <p className="text-gray-600">Manage employee</p> */}
        </div>

       
      </div>
      <div className="flex gap-3">
      <Button
  variant="secondary"
  onClick={() => {
    console.log(shortlistedCandidates)
    const firstCandidate = shortlistedCandidates.find(
      c => selectedCandidates.includes(c.id)
    );
    console.log(shortlistedCandidates[0]);

    setCandidateToHire(shortlistedCandidates[0]);
    setHireModalOpen(true);
  }}
>
  Mark as Hired
</Button>
      <Button variant="outline" onClick={() => setScheduleOpen(true)}>
  Schedule Interview
</Button>

<Button variant="outline" onClick={() => setOfferModalOpen(true)}>
  Generate Offer
</Button>
  <Button
    variant="outline"
    onClick={() => setUploadModalOpen(true)}
  >
    <Upload className="mr-2 h-4 w-4" />
    Upload Candidates
  </Button>

  <Button onClick={openAddCandidate}>+ Add Candidate</Button>
      
</div>
      {/* GENERATE DIALOG */}
 
    
      </div>
      <div className="space-y-8">

        <SummaryCards applicants={filteredApplicants} />

        <JobFilter
          applicants={applicants}
          selectedJob={selectedJob}
          setSelectedJob={setSelectedJob}
          selectedPriority={selectedPriority}
          setSelectedPriority={setSelectedPriority}
        />

        {/* <RecruitmentAnalytics applicants={filteredApplicants} /> */}

        <KanbanBoard
          applicants={filteredApplicants}
          onDrop={handleDrop}
          onCardClick={(a) => {
            setSelectedApplicant(a);
            setSheetOpen(true);
          }}
        />

        <ApplicantSheet
          applicant={selectedApplicant}
          open={sheetOpen}
          setOpen={setSheetOpen}
          onScheduleInterview={() => setInterviewOpen(true)}
          onGenerateOffer={() => setOfferOpen(true)}
        />

        <InterviewModal open={interviewOpen} setOpen={setInterviewOpen} />

        <OfferModal open={offerOpen} setOpen={setOfferOpen} />

      </div>
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
  <DialogContent className="sm:max-w-[500px]">
    <DialogHeader>
      <DialogTitle>Upload Candidates (Bulk)</DialogTitle>
    </DialogHeader>

    <div className="space-y-6 mt-4">

      {/* Select Job */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Select Job Vacancy *
        </label>

        <Select
          value={selectedJobId}
          onValueChange={setSelectedJobId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose job" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">
              Frontend Developer
            </SelectItem>
            <SelectItem value="2">
              Backend Developer
            </SelectItem>
            <SelectItem value="3">
              HR Executive
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Upload File */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Upload Excel File (.xlsx / .csv) *
        </label>

        <Input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => {
            if (e.target.files) {
              setExcelFile(e.target.files[0]);
            }
          }}
        />

        {excelFile && (
          <div className="text-sm text-gray-500">
            Selected: {excelFile.name}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-500">
        Make sure your Excel file contains columns:
        <br />
        <b>Name | Email | Phone | Experience</b>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => setUploadModalOpen(false)}
        >
          Cancel
        </Button>

        <Button onClick={handleBulkUpload}>
          Upload
        </Button>
      </div>

    </div>
  </DialogContent>
</Dialog>
<Sheet open={candidateSheetOpen} onOpenChange={setCandidateSheetOpen}>
  <SheetContent side="right" className="w-full sm:w-[650px] overflow-y-auto">
    <SheetHeader>
      <SheetTitle>
        {editMode ? "Edit Candidate" : "Add New Candidate"}
      </SheetTitle>
    </SheetHeader>

    <div className="mt-6 space-y-6 px-4 pb-10">

      {/* Basic Info */}
      <div className="space-y-4">

        <div>
          <Label>Full Name *</Label>
          <Input
            value={candidateForm.name}
            onChange={(e) =>
              setCandidateForm({ ...candidateForm, name: e.target.value })
            }
            placeholder="Enter full name"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              value={candidateForm.email}
              onChange={(e) =>
                setCandidateForm({ ...candidateForm, email: e.target.value })
              }
              placeholder="example@mail.com"
            />
          </div>

          <div>
            <Label>Phone</Label>
            <Input
              value={candidateForm.phone}
              onChange={(e) =>
                setCandidateForm({ ...candidateForm, phone: e.target.value })
              }
              placeholder="0300xxxxxxx"
            />
          </div>
        </div>

        <div>
          <Label>CNIC</Label>
          <Input
            value={candidateForm.cnic}
            onChange={(e) =>
              setCandidateForm({ ...candidateForm, cnic: e.target.value })
            }
            placeholder="xxxxx-xxxxxxx-x"
          />
        </div>

        <div>
          <Label>Address</Label>
          <Input
            value={candidateForm.address}
            onChange={(e) =>
              setCandidateForm({ ...candidateForm, address: e.target.value })
            }
            placeholder="Complete address"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Qualification</Label>
            <Input
              value={candidateForm.qualification}
              onChange={(e) =>
                setCandidateForm({
                  ...candidateForm,
                  qualification: e.target.value,
                })
              }
              placeholder="Bachelors / Masters"
            />
          </div>

          <div>
            <Label>Experience (Years)</Label>
            <Input
              type="number"
              value={candidateForm.experience}
              onChange={(e) =>
                setCandidateForm({
                  ...candidateForm,
                  experience: e.target.value,
                })
              }
            />
          </div>
        </div>
        {/* CV Upload */}
        <div>
          <Label>Upload CV (PDF/DOC)</Label>
          <Input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => {
              if (e.target.files) {
                setCvFile(e.target.files[0]);
              }
            }}
          />

          {cvFile && (
            <p className="text-sm text-gray-500 mt-2">
              Selected: {cvFile.name}
            </p>
          )}
        </div>

      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-6">
        <Button
          variant="outline"
          onClick={() => setCandidateSheetOpen(false)}
        >
          Cancel
        </Button>

        <Button onClick={handleCandidateSubmit}>
          {editMode ? "Update Candidate" : "Create Candidate"}
        </Button>
      </div>

    </div>
  </SheetContent>
</Sheet>
<Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
  <DialogContent className="sm:max-w-[600px]">
    <DialogHeader>
      <DialogTitle>Schedule Interview</DialogTitle>
    </DialogHeader>

    <div className="space-y-6 mt-4">

      {/* MULTI SELECT CANDIDATES */}
      <div className="space-y-2 relative">
        <Label>Select Shortlisted Candidates</Label>

        <div
          onClick={() => setCandidateSelectOpen(!candidateSelectOpen)}
          className="w-full border rounded-md px-3 py-2 text-sm flex items-center justify-between cursor-pointer bg-white"
        >
          <span>
            {selectedCandidates.length > 0
              ? `${selectedCandidates.length} selected`
              : "Select candidates"}
          </span>
        </div>

        {candidateSelectOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border rounded-md shadow-lg">
            <div className="p-2 border-b">
              <Input
                placeholder="Search candidate..."
                value={candidateSearch}
                onChange={(e) => setCandidateSearch(e.target.value)}
              />
            </div>

            <div className="max-h-60 overflow-y-auto">
              {shortlistedCandidates
                .filter(c =>
                  c.name.toLowerCase().includes(candidateSearch.toLowerCase())
                )
                .map(c => {
                  const isSelected = selectedCandidates.includes(c.id);

                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedCandidates(prev =>
                            prev.filter(id => id !== c.id)
                          );
                        } else {
                          setSelectedCandidates(prev => [...prev, c.id]);
                        }
                      }}
                      className={`px-3 py-2 text-sm cursor-pointer flex justify-between hover:bg-gray-100 ${
                        isSelected ? "bg-gray-100" : ""
                      }`}
                    >
                      {c.name}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Selected Chips */}
        {selectedCandidates.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedCandidates.map(id => {
              const c = shortlistedCandidates.find(x => x.id === id);
              if (!c) return null;

              return (
                <div
                  key={id}
                  className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md text-sm"
                >
                  {c.name}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() =>
                      setSelectedCandidates(prev =>
                        prev.filter(cid => cid !== id)
                      )
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Interview Date */}
      <div className="space-y-2">
        <Label>Interview Date</Label>
        <Input
          type="date"
          value={interviewDate}
          onChange={(e) => setInterviewDate(e.target.value)}
        />
      </div>

      {/* Interviewer Select */}
      <div className="space-y-2">
        <Label>Select Interviewer</Label>
        <Select
          value={selectedInterviewer}
          onValueChange={setSelectedInterviewer}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose interviewer" />
          </SelectTrigger>
          <SelectContent>
            {employees.map(emp => (
              <SelectItem key={emp.id} value={emp.id.toString()}>
                {emp.firstName} {emp.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* Send Email Switch */}
<div className="flex items-center justify-between border p-4 rounded-lg">
  <div>
    <Label className="font-medium">Send Email Notification?</Label>
    <p className="text-sm text-gray-500">
      Selected candidates will receive interview email.
    </p>
  </div>

  <Switch
    checked={sendInterviewEmail}
    onCheckedChange={setSendInterviewEmail}
  />
</div>

      {/* Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => setScheduleOpen(false)}>
          Cancel
        </Button>

        <Button
                onClick={async () => {
                    await interviewAPI.create({
                    candidateIds: selectedCandidates,
                    interviewerId: selectedInterviewer,
                    interviewDate,
                    sendEmail: sendInterviewEmail,
                    });

                    toast.success("Interview Scheduled");
                    setScheduleOpen(false);
                }}
                >
                Schedule
                </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
<Dialog open={offerModalOpen} onOpenChange={setOfferModalOpen}>
  <DialogContent className="sm:max-w-[600px]">
    <DialogHeader>
      <DialogTitle>Generate Offer Letter</DialogTitle>
    </DialogHeader>

    <div className="space-y-6">

      {/* MULTI SELECT SAME AS INTERVIEW */}
      {/* reuse shortlistedCandidates */}
      <div className="space-y-2 relative">
        <Label>Select Shortlisted Candidates</Label>

        <div
          onClick={() => setCandidateSelectOpen(!candidateSelectOpen)}
          className="w-full border rounded-md px-3 py-2 text-sm flex items-center justify-between cursor-pointer bg-white"
        >
          <span>
            {selectedCandidates.length > 0
              ? `${selectedCandidates.length} selected`
              : "Select candidates"}
          </span>
        </div>

        {candidateSelectOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border rounded-md shadow-lg">
            <div className="p-2 border-b">
              <Input
                placeholder="Search candidate..."
                value={candidateSearch}
                onChange={(e) => setCandidateSearch(e.target.value)}
              />
            </div>

            <div className="max-h-60 overflow-y-auto">
              {shortlistedCandidates
                .filter(c =>
                  c.name.toLowerCase().includes(candidateSearch.toLowerCase())
                )
                .map(c => {
                  const isSelected = selectedCandidates.includes(c.id);

                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedCandidates(prev =>
                            prev.filter(id => id !== c.id)
                          );
                        } else {
                          setSelectedCandidates(prev => [...prev, c.id]);
                        }
                      }}
                      className={`px-3 py-2 text-sm cursor-pointer flex justify-between hover:bg-gray-100 ${
                        isSelected ? "bg-gray-100" : ""
                      }`}
                    >
                      {c.name}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Selected Chips */}
        {selectedCandidates.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedCandidates.map(id => {
              const c = shortlistedCandidates.find(x => x.id === id);
              if (!c) return null;

              return (
                <div
                  key={id}
                  className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md text-sm"
                >
                  {c.name}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() =>
                      setSelectedCandidates(prev =>
                        prev.filter(cid => cid !== id)
                      )
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Offered Salary */}
      <div className="space-y-2">
        <Label>Offered Salary</Label>
        <Input
          type="number"
          value={offeredSalary}
          onChange={(e) => setOfferedSalary(e.target.value)}
        />
      </div>

      {/* Send Email Checkbox */}
      <div className="flex items-center gap-2">
        <Checkbox
          checked={sendOfferEmail}
          onCheckedChange={(v:any)=>setSendOfferEmail(v)}
        />
        <Label>Send Offer Email?</Label>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={()=>setOfferModalOpen(false)}>
          Cancel
        </Button>

        <Button
          onClick={async () => {
            await candidateAPI.bulkUpdateStatus({
              candidateIds: selectedCandidates,
              status: "OFFERED",
              offeredSalary,
              sendEmail: sendOfferEmail,
            });

            toast.success("Offer Generated");
            setOfferModalOpen(false);
          }}
        >
          Generate Offer
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
<Dialog open={hireModalOpen} onOpenChange={setHireModalOpen}>
  <DialogContent className="sm:max-w-[700px] overflow-y-auto max-h-[90vh]">
    <DialogHeader>
      <DialogTitle>Create Employee</DialogTitle>
    </DialogHeader>

    {candidateToHire && (
      <div className="space-y-6">

        {/* Prefilled Fields */}
        <div className="grid grid-cols-2 gap-4">

          <div>
            <Label>First Name</Label>
            <Input
              value={candidateToHire.name.split(" ")[0]}
              readOnly
            />
          </div>

          <div>
            <Label>Last Name</Label>
            <Input
              value={candidateToHire.name.split(" ")[1] || ""}
              readOnly
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input
              value={candidateToHire.email}
              readOnly
            />
          </div>

          <div>
            <Label>Phone</Label>
            <Input
              value={candidateToHire.phone}
              readOnly
            />
          </div>

          <div>
            <Label>Designation</Label>
            <Input
              value=""
              placeholder="Enter designation"
              onChange={(e)=>setDesignation(e.target.value)}
            />
          </div>

          <div>
            <Label>Salary</Label>
            <Input
              type="number"
              value={offeredSalary}
              onChange={(e)=>setRate(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={()=>setHireModalOpen(false)}>
            Cancel
          </Button>

          <Button
            onClick={async () => {

              const formData = new FormData();

              formData.append("personal", JSON.stringify({
                firstName: candidateToHire.name.split(" ")[0],
                lastName: candidateToHire.name.split(" ")[1] || "",
                email: candidateToHire.email,
                phoneNumber: candidateToHire.phone,
                role: "user",
                canLogin: true
              }));

              formData.append("job", JSON.stringify({
                designation,
                employmentStatus: "Full-time",
                hiringDate: new Date().toISOString().split("T")[0],
              }));

              formData.append("payroll", JSON.stringify({
                payoutType: "monthly",
                rate: offeredSalary,
                currency: "PKR",
              }));

              await employeeAPI.createEmployee(formData);

              await candidateAPI.updateStatus(candidateToHire.id, "HIRED");

              toast.success("Candidate Converted to Employee");

              setHireModalOpen(false);
            }}
          >
            Create Employee
          </Button>
        </div>

      </div>
    )}
  </DialogContent>
</Dialog>
    </DndProvider>
  );
}