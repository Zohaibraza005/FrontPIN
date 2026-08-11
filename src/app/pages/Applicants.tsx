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
import { Plus } from "lucide-react";
import { useNavigate } from "react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { applicantAPI } from "../services/api";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '../components/ui/sheet';
import { Label } from "../components/ui/label";



const mockApplicants = [
  { id: 1, name: "Ali Khan", job: "Frontend Dev", status: "APPLIED", experience: 3, email: "ali@mail.com", phone: "0300" },
  { id: 2, name: "Sara Ahmed", job: "Backend Dev", status: "INTERVIEW", experience: 4, email: "sara@mail.com", phone: "0301" },
  { id: 3, name: "Usman Tariq", job: "HR Executive", status: "OFFERED", experience: 2, email: "usman@mail.com", phone: "0302" },
  { id: 4, name: "Fatima Noor", job: "Frontend Dev", status: "HIRED", experience: 5, email: "fatima@mail.com", phone: "0303" },
];

export default function Applicants() {
  const navigate = useNavigate()
  const [applicants, setApplicants] = useState(mockApplicants);
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

const [candidateForm, setCandidateForm] = useState({
  name: "",
  email: "",
  phone: "",
  cnic: "",
  address: "",
  qualification: "",
  experience: "",
  jobId: "",
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
    jobId: "",
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
    jobId: candidate.jobId || "",
  });
  setCandidateSheetOpen(true);
};

  const filteredApplicants =
    selectedJob === "ALL"
      ? applicants
      : applicants.filter((a) => a.job === selectedJob);

  const handleDrop = (id: number, status: string) => {
    setApplicants((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
  };
  const handleBulkUpload = async () => {
    if (!selectedJobId) {
      toast.error("Please select a job first");
      return;
    }
  
    if (!excelFile) {
      toast.error("Please upload an Excel file");
      return;
    }
  
    try {
      const formData = new FormData();
      formData.append("jobId", selectedJobId);
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
      formData.append("data", JSON.stringify(candidateForm));
  
      if (cvFile) {
        formData.append("cv", cvFile);
      }
  
      if (editMode) {
        await applicantAPI.updateCandidate(editingCandidate.id, formData);
        toast.success("Candidate updated successfully");
      } else {
        await applicantAPI.createCandidate(formData);
        toast.success("Candidate added successfully");
      }
  
      setCandidateSheetOpen(false);
  
    } catch (error) {
      toast.error("Something went wrong");
    }
  };
  return (
    <DndProvider backend={HTML5Backend}>
       <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Applicants Management</h2>
          {/* <p className="text-gray-600">Manage employee</p> */}
        </div>

       
      </div>
      <div className="flex gap-3">
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

        {/* Job Select */}
        <div>
          <Label>Apply For Job</Label>
          <Select
            value={candidateForm.jobId}
            onValueChange={(v) =>
              setCandidateForm({ ...candidateForm, jobId: v })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Job" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Frontend Developer</SelectItem>
              <SelectItem value="2">Backend Developer</SelectItem>
              <SelectItem value="3">HR Executive</SelectItem>
            </SelectContent>
          </Select>
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
    </DndProvider>
  );
}