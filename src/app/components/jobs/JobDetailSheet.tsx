import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";

export default function JobDetailSheet({ job, open, setOpen }) {
  if (!job) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="w-full sm:w-[650px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{job.title}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4 text-sm px-3">
          <p>{job.description}</p>

          <div className="grid grid-cols-2 gap-4">
            <div>Department: {job.department}</div>
            <div>Location: {job.location}</div>
            <div>Experience: {job.experience} yrs</div>
            <div>Positions: {job.positions}</div>
            <div>Employment: {job.employmentType}</div>
            <div>Deadline: {job.deadline}</div>
            <div>Hiring Manager: {job.hiringManager}</div>
            <div>Priority: {job.priority}</div>
          </div>

          <div>
            Salary: {job.salaryMin} - {job.salaryMax}
          </div>

          <div>Skills: {job.skills}</div>
        </div>
      </SheetContent>
    </Sheet>
  );
}