import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";

export default function JobCandidatesSheet({ job, open, setOpen }) {
  if (!job) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="w-full sm:w-[600px]">
        <SheetHeader>
          <SheetTitle>{job.title} - Candidates</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-3 px-5">
          {job.candidates.length === 0 && (
            <div>No candidates yet</div>
          )}

          {job.candidates.map((c) => (
            <div
              key={c.id}
              className="p-3 border rounded-lg flex justify-between"
            >
              <div>{c.name}</div>
              <div className="text-sm text-gray-500">
                {c.status}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}