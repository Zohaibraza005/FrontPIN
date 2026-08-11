// pages/Jobs.tsx
import { useEffect, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Button } from "../components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router";

import JobSummaryCards from "../components/jobs/JobSummaryCards";
import JobKanbanBoard from "../components/jobs/JobKanbanBoard";
import JobDetailSheet from "../components/jobs/JobDetailSheet";
import JobEditSheet from "../components/jobs/JobEditSheet";
import JobCandidatesSheet from "../components/jobs/JobCandidatesSheet";
import { jobAPI } from "../services/api";



export default function Jobs() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [candidateSheetOpen, setCandidateSheetOpen] = useState(false);

  ////////////////////////////////////////////////////
  // 🔹 FETCH JOBS
  ////////////////////////////////////////////////////
  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await jobAPI.getJobs();
      setJobs(res.data);
    } catch (err) {
      console.error("Failed to fetch jobs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  ////////////////////////////////////////////////////
  // 🔹 HANDLE DRAG DROP STATUS UPDATE
  ////////////////////////////////////////////////////
  const handleDrop = async (id: number, newStatus: string) => {
    try {
      // optimistic update
      setJobs((prev) =>
        prev.map((j) =>
          j.id === id ? { ...j, status: newStatus } : j
        )
      );

      await jobAPI.updateJobStatus(id, newStatus);
    } catch (err) {
      console.error("Status update failed", err);
      fetchJobs(); // rollback
    }
  };

  ////////////////////////////////////////////////////

  if (loading) {
    return <div className="p-6">Loading jobs...</div>;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-8">

        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Jobs Management</h2>
          <Button onClick={() => navigate("/jobs/add")}>
            <Plus className="mr-2 size-4" />
            Post New Job
          </Button>
        </div>

        <JobSummaryCards jobs={jobs} />

        <JobKanbanBoard
          jobs={jobs}
          onDrop={handleDrop}
          onView={(job) => {
            setSelectedJob(job);
            setDetailOpen(true);
          }}
          onEdit={(job) => {
            setSelectedJob(job);
            setEditOpen(true);
          }}
          onViewCandidates={(job) => {
            setSelectedJob(job);
            setCandidateSheetOpen(true);
          }}
        />

        <JobDetailSheet
          job={selectedJob}
          open={detailOpen}
          setOpen={setDetailOpen}
        />

        <JobEditSheet
          job={selectedJob}
          open={editOpen}
          setOpen={setEditOpen}
          onUpdated={fetchJobs} // 👈 refresh after edit
        />

        <JobCandidatesSheet
          job={selectedJob}
          open={candidateSheetOpen}
          setOpen={setCandidateSheetOpen}
        />

      </div>
    </DndProvider>
  );
}