import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { PieChart, Pie, Cell, Tooltip } from "recharts";

export default function RecruitmentAnalytics({ applicants }) {
  const data = [
    { name: "Applied", value: applicants.filter(a => a.status === "APPLIED").length },
    { name: "Interview", value: applicants.filter(a => a.status === "INTERVIEW").length },
    { name: "Offered", value: applicants.filter(a => a.status === "OFFERED").length },
    { name: "Hired", value: applicants.filter(a => a.status === "HIRED").length },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recruitment Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <PieChart width={300} height={200}>
          <Pie data={data} dataKey="value" outerRadius={80} label />
          <Tooltip />
        </PieChart>
      </CardContent>
    </Card>
  );
}