// components/JobFilter.tsx
import { Card, CardContent } from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export default function JobFilter({
  applicants,
  selectedJob,
  setSelectedJob,
  selectedPriority,
  setSelectedPriority,
}) {
  const jobs = [...new Set(applicants.map((a) => a.job))];

  return (
    <Card>
      <CardContent className="p-4 flex flex-col sm:flex-row gap-4">

        {/* Active Job Dropdown */}
        <div className="w-full sm:w-[250px]">
          <Select
            value={selectedJob}
            onValueChange={(value) => setSelectedJob(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Active Job" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Jobs</SelectItem>
              {jobs.map((job) => (
                <SelectItem key={job} value={job}>
                  {job}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Priority Filter */}
        <div className="w-full sm:w-[200px]">
          <Select
            value={selectedPriority}
            onValueChange={(value) => setSelectedPriority(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Priority</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

      </CardContent>
    </Card>
  );
}