import { Card, CardContent } from "../ui/card";

export default function JobSummaryCards({ jobs }) {
  const open = jobs.filter((j) => j.status === "OPEN")?.length;
  const draft = jobs.filter((j) => j.status === "DRAFT")?.length;
  const totalCandidates = jobs?.reduce(
    (acc, j) => acc + j.candidates?.length || 0,
    0
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-6">
          <div>Open Jobs</div>
          <div className="text-3xl font-bold">{open}</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div>Draft Jobs</div>
          <div className="text-3xl font-bold">{draft}</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div>Total Candidates</div>
          <div className="text-3xl font-bold">{totalCandidates}</div>
        </CardContent>
      </Card>
    </div>
  );
}