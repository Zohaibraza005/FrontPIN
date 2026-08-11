import React, { useEffect, useState } from 'react';
import { mockPayrolls, mockEmployees } from '../services/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import moment from 'moment'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { DollarSign, Download, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {   DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger, } from "../components/ui/dropdown-menu";
  import {
    LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
  } from "recharts";
  import { PieChart, Pie, Cell, Legend } from "recharts";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter
} from '../components/ui/dialog';
import { departmentAPI, employeeAPI, locationAPI, payrollAPI } from '../services/api';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { useNavigate } from 'react-router';
export const Payroll: React.FC = () => {
  const [generateOpen, setGenerateOpen] = useState(false);
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [type, setType] = useState<'INDIVIDUAL' | 'DEPARTMENT' | 'LOCATION'>('INDIVIDUAL');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState(null);


  
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<number[]>([]);
  const [stats, setStats] = useState<any>(null);
const [trend, setTrend] = useState<any[]>([]);
const [overtimeTrend, setOvertimeTrend] = useState<any[]>([]);
const [departmentBreakdown, setDepartmentBreakdown] = useState<any[]>([]);
const [headcount, setHeadcount] = useState<any>(null);
const [attendanceImpact, setAttendanceImpact] = useState<any>(null);
const [riskAlerts, setRiskAlerts] = useState<any[]>([]);
  const currentYear = new Date().getFullYear();

  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  const months = moment.months().map((m, i) => ({
    label: m,
    value: i + 1
  }));
  // Mock data (replace with API)
  const [employees,setEmployees] = useState([]);

  const [departments,setDepartments] = useState([]);

  const [locations,setLocations] = useState([]);

  const toggleSelection = (id: number, list: number[], setList: any) => {
    if (list.includes(id)) {
      setList(list?.filter(i => i !== id));
    } else {
      setList([...list, id]);
    }
  };

  const [payrolls, setPayrolls] = useState([]);
  const now = moment();

const [filterMonth, setFilterMonth] = useState<number>(now.month() + 1);
const [filterYear, setFilterYear] = useState<number>(now.year());
  const [filterStatus, setFilterStatus] = useState('all');

  // const filteredPayrolls = payrolls?.filter((payroll) => {
  //   if (filterMonth !== 'all' && payroll.month !== filterMonth) return false;
  //   if (filterStatus !== 'all' && payroll.status !== filterStatus) return false;
  //   return true;
  // });
  const loadAnalytics = async () => {
    try {
      const [
        statsRes,
        trendRes,
        overtimeRes,
        deptRes,
        headcountRes,
        attendanceRes,
        riskRes
      ] = await Promise.all([
        payrollAPI.getStats({
          month: filterMonth !== "all" ? filterMonth : undefined,
          year: filterYear ?? undefined
        }),
        payrollAPI.getTrend(),
        payrollAPI.getOvertimeTrend(),
        payrollAPI.getDepartmentBreakdown({
          month: filterMonth !== "all" ? filterMonth : undefined,
          year: filterYear ?? undefined
        }),
        payrollAPI.getHeadcount(),
        payrollAPI.getAttendanceImpact({
          month: filterMonth !== "all" ? filterMonth : undefined,
          year: filterYear ?? undefined
        }),
        payrollAPI.getRiskAlerts({
          month: filterMonth !== "all" ? filterMonth : undefined,
          year: filterYear ?? undefined
        }),
      ]);
  
      setStats(statsRes);
      setTrend(trendRes);
      setOvertimeTrend(overtimeRes);
      setDepartmentBreakdown(deptRes);
      setHeadcount(headcountRes);
      setAttendanceImpact(attendanceRes);
      setRiskAlerts(riskRes);
  
    } catch {
      toast.error("Failed to load analytics");
    }
  };
  
  const loadPayrolls = async () => {
    try {
      const res = await payrollAPI.getAll({
        month: filterMonth || undefined,
        year: filterYear || undefined,
        status: filterStatus !== "all" ? filterStatus : undefined
      });
  
      setPayrolls(res.data);
      setSummary(res.summary);
    } catch {
      toast.error("Failed to load payrolls");
    }
  };
  
  const loadInfo = async ()=>{
    const res = await employeeAPI.getActiveEmployees();
    setEmployees(res.data)
    const res1 = await departmentAPI.getDepartments();
    setDepartments(res1.data)
    const res2 = await locationAPI.getLocations();
    setLocations(res2.data)
  }
  useEffect(() => {
    loadPayrolls();
    loadAnalytics();
  }, [filterMonth, filterYear, filterStatus]);
  useEffect(() => {
    loadInfo();
    
  }, []);

  const totalPayroll = summary?.totalPayroll || 0;
const totalPaid = summary?.totalPaid || 0;

  const handleDelete = async (id: number) => {
    try {
      await payrollAPI.delete(id);
  
      // UI se immediately remove karo
      setPayrolls(prev => prev?.filter(p => p.id !== id));
  
      toast.success("Payroll deleted successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Delete failed");
    }
  };
  const handleGeneratePayroll = async () => {

    if (!selectedMonth || !selectedYear) {
      return toast.error("Select month and year");
    } 

    if (
      (type === "INDIVIDUAL" && selectedEmployees.length === 0) ||
      (type === "DEPARTMENT" && selectedDepartments.length === 0) ||
      (type === "LOCATION" && selectedLocations.length === 0)
    ) {
      return toast.error("Please select at least one option");
    }

    try {
      setLoading(true);
      setProgress(30);
      const payload = {
        month: selectedMonth,
        year: selectedYear,
        type,
        employeeIds: selectedEmployees,
        departmentIds: selectedDepartments,
        locationIds: selectedLocations
      }
      const res = await payrollAPI.generateBulk(payload);
      setProgress(100);
      setSummary(res);
      toast.success("Payroll generated successfully");
      setGenerateOpen(false);

    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Generation failed");
    }finally {
      setLoading(false);
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Payroll Management</h2>
          <p className="text-gray-600">Manage employee payroll</p>
        </div>

       
      </div>
      <Button onClick={() => setGenerateOpen(true)}>
          <Plus className="mr-2 size-4" />
          Generate Payroll
        </Button>
      {/* GENERATE DIALOG */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Generate Payroll</DialogTitle>
          </DialogHeader>
          {loading && (
  <div className="space-y-2">
    <div className="w-full bg-gray-200 rounded-full h-3">
      <div
        className="bg-blue-600 h-3 rounded-full transition-all"
        style={{ width: `${progress}%` }}
      />
    </div>
    <p className="text-sm text-gray-500">
      Generating payroll... {progress}%
    </p>
  </div>
)}
{summary && (
  <div className="bg-green-50 p-4 rounded-md mt-4">
    <p className="font-semibold">Payroll Summary</p>
    <p>Generated: {summary.generated}</p>
    <p>Skipped (Duplicate): {summary.skipped}</p>
  </div>
)}

          <div className="space-y-5 py-4">

            {/* Month */}
            <div className="space-y-2">
              <Label>Select Month</Label>
              <Select onValueChange={(v) => setSelectedMonth(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose Month" />
                </SelectTrigger>
                <SelectContent>
                  {months?.map(m => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year */}
            <div className="space-y-2">
              <Label>Select Year</Label>
              <Select onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose Year" />
                </SelectTrigger>
                <SelectContent>
                  {years?.map(y => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>Generate For</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                  <SelectItem value="DEPARTMENT">Department</SelectItem>
                  <SelectItem value="LOCATION">Location</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Multi Select Area */}
            <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-3">

              {type === "INDIVIDUAL" && employees.map(emp => (
                <div key={emp.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedEmployees.includes(emp.id)}
                    onCheckedChange={() =>
                      toggleSelection(emp.id, selectedEmployees, setSelectedEmployees)
                    }
                  />
                  <span>{emp.firstName} {emp.lastName}</span>
                  
                </div>
              ))}

              {type === "DEPARTMENT" && departments.map(dep => (
                <div key={dep.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedDepartments.includes(dep.id)}
                    onCheckedChange={() =>
                      toggleSelection(dep.id, selectedDepartments, setSelectedDepartments)
                    }
                  />
                  <span>{dep.title}</span>
                </div>
              ))}

              {type === "LOCATION" && locations.map(loc => (
                <div key={loc.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedLocations.includes(loc.id)}
                    onCheckedChange={() =>
                      toggleSelection(loc.id, selectedLocations, setSelectedLocations)
                    }
                  />
                  <span>{loc.name}</span>
                </div>
              ))}

            </div>

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGeneratePayroll}>
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    
      </div>
      <div className="grid gap-6 md:grid-cols-4">

{/* TOTAL GROSS */}
<Card className="border-l-4 border-l-blue-600">
  <CardHeader>
    <CardTitle>Total Gross</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-xl font-bold">
      Rs. {stats?.totalGross?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || 0}
    </div>
  </CardContent>
</Card>

{/* TOTAL NET */}
<Card className="border-l-4 border-l-green-600">
  <CardHeader>
    <CardTitle>Total Net</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-xl font-bold">
      Rs. {stats?.totalNet?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || 0}
    </div>
  </CardContent>
</Card>

{/* HEADCOUNT */}
<Card className="border-l-4 border-l-yellow-600">
  <CardHeader>
    <CardTitle>Headcount</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-xl font-bold">
      {stats?.headcount || 0}
    </div>
  </CardContent>
</Card>

{/* AVG COST */}
<Card className="border-l-4 border-l-purple-600">
  <CardHeader>
    <CardTitle>Avg Cost / Employee</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-xl font-bold">
      Rs. {stats?.averageCostPerEmployee?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || 0}
    </div>
  </CardContent>
</Card>

</div>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle>Payroll Records</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
            <SearchableSelect
              className="w-[150px]"
              placeholder="Month"
              searchPlaceholder="Search month..."
              value={filterMonth.toString()}
              onValueChange={(v) => setFilterMonth(Number(v))}
              options={months.map((m) => ({
                value: m.value.toString(),
                label: m.label,
              }))}
            />

            <SearchableSelect
              className="w-[120px]"
              placeholder="Year"
              searchPlaceholder="Search year..."
              value={filterYear.toString()}
              onValueChange={(v) => setFilterYear(Number(v))}
              options={years.map((y) => ({
                value: y.toString(),
                label: y.toString(),
              }))}
            />

            <SearchableSelect
              className="w-[150px]"
              placeholder="Status"
              searchPlaceholder="Search status..."
              value={filterStatus}
              onValueChange={setFilterStatus}
              options={[
                { value: "all", label: "All Statuses" },
                { value: "GENERATED", label: "Generated" },
                { value: "PAID", label: "Paid" },
              ]}
            />

              <Button variant="outline" size="sm">
                <Download className="mr-2 size-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Base Salary</TableHead>
                  <TableHead>Overtime</TableHead>
                  <TableHead>Bonus</TableHead>
                  <TableHead>Deductions</TableHead>
                  
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {payrolls?.map((payroll) => (
  <TableRow key={payroll.id}>
    
    <TableCell className="font-medium">
      {payroll?.employee?.firstName} {payroll?.employee?.lastName}
    </TableCell>

    <TableCell>
      {moment(payroll.periodStart).format("MMM YYYY")}
    </TableCell>

    <TableCell>Rs. {payroll?.rate?.toLocaleString()}</TableCell>

  
    <TableCell className="text-green-600">
  +Rs. {payroll.overtimeAmount?.toLocaleString() || 0}
</TableCell>

<TableCell className="text-green-600">
  +Rs. {payroll.bonus?.toLocaleString() || 0}
</TableCell>

<TableCell className="text-red-600">
  -Rs. {payroll.grossDeductions?.toLocaleString() || 0}
</TableCell>

<TableCell>
  <Select
    value={payroll.status}
    onValueChange={async (value) => {
      try {
        await payrollAPI.updateStatus(payroll.id, { status: value });
        toast.success("Status updated");
        loadPayrolls();
      } catch (err: any) {
        toast.error(err?.response?.data?.message || "Update failed");
      }
    }}
    disabled={payroll.locked}
  >
    <SelectTrigger className="w-[140px]">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="GENERATED">Generated</SelectItem>
      <SelectItem value="PAID">Paid</SelectItem>
      <SelectItem value="DRAFT">Draft</SelectItem>
    </SelectContent>
  </Select>
</TableCell>
    
    <TableCell>
      <div className="d-flex">
      <Button variant="outline" size="sm"   onClick={() => navigate(`/payroll/view/${payroll.id}`)}>View</Button>
  

      <Button 
  variant="outline" 
  size="sm" 
  onClick={() => handleDelete(payroll.id)}
>
  Delete
</Button>
      </div>

</TableCell>
  </TableRow>
))}

              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {riskAlerts.length > 0 && (
  <Card className="border-l-4 border-l-red-600">
    <CardHeader>
      <CardTitle>⚠ Risk Alerts</CardTitle>
    </CardHeader>
    <CardContent>
      {riskAlerts.map((alert, index) => (
        <p key={index} className="text-red-600 text-sm">
          {alert.message}
        </p>
      ))}
    </CardContent>
  </Card>
)}
<div className="grid gap-6 md:grid-cols-2">
<Card>
  <CardHeader>
    <CardTitle>Payroll Trend (Last 6 Months)</CardTitle>
  </CardHeader>
  <CardContent className="h-72">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={trend}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="total" stroke="#2563eb" />
      </LineChart>
    </ResponsiveContainer>
  </CardContent>
</Card>
<Card>
  <CardHeader>
    <CardTitle>Department Cost Distribution</CardTitle>
  </CardHeader>
  <CardContent className="h-72">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={departmentBreakdown}
          dataKey="total"
          nameKey="department"
          outerRadius={100}
          label
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  </CardContent>
</Card>
</div>
     
    </div>
  );
};
