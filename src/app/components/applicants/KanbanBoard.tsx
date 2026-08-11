// components/KanbanBoard.tsx
import { useDrag, useDrop } from "react-dnd";
import { Badge } from "../ui/badge";
import { API_URL } from "@/app/services/api";


const PIPELINE = [
  { label: "Applied", value: "APPLIED" },
  { label: "Shortlisted", value: "SHORTLISTED" },
  { label: "Interview", value: "INTERVIEW" },
  { label: "Offered", value: "OFFERED" },
  { label: "Hired", value: "HIRED" },
  { label: "Rejected", value: "REJECTED" },
];

/* ---------- Applicant Card ---------- */

function ApplicantCard({ applicant, onClick }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "APPLICANT",
    item: { id: applicant.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const daysInStage = 6; // static demo

  return (
    <div
      ref={drag}
      onClick={() => onClick(applicant)}
      className={`bg-white p-4 rounded-xl border shadow-sm cursor-pointer transition
      hover:shadow-md ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex justify-between">
        <h4 className="font-medium text-sm">
          {applicant.name}
        </h4>
        <Badge>{applicant.experience} yrs</Badge>
      </div>

      <p className="text-xs text-gray-600 mt-1">
        {applicant.phone}
        {/* {JSON.stringify(applicant)} */}
        
      </p>
      <p className="text-xs text-blue-600 mt-1">
      {applicant.cvUrl && <a href={API_URL+applicant?.cvUrl}>CV LINK</a>}
      </p>

      {/* {daysInStage > 5 && (
        <div className="text-xs text-red-500 mt-2">
          ⚠ Stuck in stage
        </div>
      )} */}
    </div>
  );
}

/* ---------- Pipeline Column ---------- */

function PipelineColumn({
  title,
  status,
  applicants,
  onDrop,
  onCardClick,
}) {
  const [, drop] = useDrop(() => ({
    accept: "APPLICANT",
    drop: (item: any) => onDrop(item.id, status),
  }));

  return (
    <div
      ref={drop}
      className="bg-gray-50 rounded-xl p-4 min-h-[350px]"
    >
      <div className="flex justify-between mb-4">
        <h3 className="font-semibold">{title}</h3>
        <Badge>{applicants.length}</Badge>
      </div>

      <div className="space-y-3">
        {applicants.map((app) => (
          <ApplicantCard
            key={app.id}
            applicant={app}
            onClick={onCardClick}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------- Main Kanban ---------- */

export default function KanbanBoard({
  applicants,
  onDrop,
  onCardClick,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {PIPELINE.map((stage) => (
        <PipelineColumn
          key={stage.value}
          title={stage.label}
          status={stage.value}
          applicants={applicants.filter(
            (a) => a.status === stage.value
          )}
          onDrop={onDrop}
          onCardClick={onCardClick}
        />
      ))}
    </div>
  );
}