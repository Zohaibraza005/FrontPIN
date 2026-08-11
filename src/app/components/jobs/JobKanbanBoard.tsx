import { useDrop } from "react-dnd";
import JobCard from "./JobCard";

const STATUSES = [
  { label: "Open", value: "OPEN" },
  { label: "Draft", value: "DRAFT" },
  { label: "Closed", value: "CLOSED" },
];

export default function JobKanbanBoard({
  jobs,
  onDrop,
  onView,
  onEdit,
  onViewCandidates,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {STATUSES.map((stage) => (
        <Column
          key={stage.value}
          stage={stage}
          jobs={jobs.filter((j) => j.status === stage.value)}
          onDrop={onDrop}
          onView={onView}
          onEdit={onEdit}
          onViewCandidates={onViewCandidates}
        />
      ))}
    </div>
  );
}

function Column({ stage, jobs, onDrop, onView, onEdit, onViewCandidates }) {
  const [, drop] = useDrop(() => ({
    accept: "JOB",
    drop: (item: any) => onDrop(item.id, stage.value),
  }));

  return (
    <div ref={drop} className="bg-gray-50 rounded-xl p-4 min-h-[350px]">
      <h3 className="font-semibold mb-4">{stage.label}</h3>

      <div className="space-y-4">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onView={onView}
            onEdit={onEdit}
            onViewCandidates={onViewCandidates}
          />
        ))}
      </div>
    </div>
  );
}