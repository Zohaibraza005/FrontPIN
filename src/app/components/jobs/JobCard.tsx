import { useDrag } from "react-dnd";
import { Badge } from "../ui/badge";
import { Eye, Pencil, Users } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Link } from "react-router";

export default function JobCard({
  job,
  onView,
  onEdit,
  onViewCandidates,
}) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "JOB",
    item: { id: job.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <Link to={`/jobs/${job.id}/applicants`}>
    <div
      ref={drag}
      onClick={() => onView(job)}
      className={`cursor-pointer bg-white p-4 rounded-xl border shadow-sm mb-3 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex justify-between items-center">
        <h4 className="font-medium">{job.title}</h4>
        <Badge>{job.priority}</Badge>
      </div>

      <p className="text-xs text-gray-500 mt-1">
        {job.department} • {job.location}
      </p>

      {/* Candidate Avatars */}
      <div className="flex items-center mt-3 -space-x-2">
        {job?.candidates?.slice(0, 4).map((c) => (
          <Tooltip key={c.id}>
            <TooltipTrigger asChild>
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs border-2 border-white">
                {c.name[0]}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {c.name} - {c.status}
            </TooltipContent>
          </Tooltip>
        ))}
        {job.candidates?.length > 4 && (
          <div className="text-xs ml-2">
            +{job.candidates?.length - 4}
          </div>
        )}
      </div>

      {/* Icons */}
      <div className="flex gap-3 mt-4 text-gray-600">
        
        {/* <Pencil size={18} onClick={() => onEdit(job)} className="cursor-pointer" />
        <Users size={18} onClick={() => onViewCandidates(job)} className="cursor-pointer" /> */}
      </div>
    </div>
    </Link>
  );
}