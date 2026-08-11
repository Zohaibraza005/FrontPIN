// src/pages/PayrollDetail.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import moment from 'moment';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import {
  User,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  FileText,
  Briefcase,
  Edit,
  Plus,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { API_URL, payrollAPI } from '../services/api';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
} from '@react-pdf/renderer';

// ────────────────────────────────────────────────
// PDF Styles for Payroll Slip
// ────────────────────────────────────────────────
const pdfStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 12,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  bold: {
    fontWeight: 'bold',
  },
  hr: {
    borderBottomWidth: 1,
    borderColor: '#ddd',
    marginVertical: 10,
  },
  earningsTable: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: 8,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  col1: { width: '60%' },
  col2: { width: '40%', textAlign: 'right' },
});

// PDF Slip Component
const PayrollSlipPDF = ({ payroll }: { payroll: any }) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <View style={pdfStyles.header}>
        <Text style={pdfStyles.title}>Pay Slip - {moment(payroll.periodStart).format('MMM YYYY')}</Text>
        <Text style={pdfStyles.subtitle}>
          {payroll.employee.firstName} {payroll.employee.lastName} • {payroll.employee.designation || 'Employee'}
        </Text>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.bold}>Employee Details</Text>
        <View style={pdfStyles.row}>
          <Text>Emp ID:</Text>
          <Text>{payroll.employee.id || '—'}</Text>
        </View>
        <View style={pdfStyles.row}>
          
          <Text>Hiring Date:</Text>
          <Text>{moment(payroll.employee.jobInfo.hiringDate).format('DD MMM YYYY') || '—'}</Text>
        </View>
        <View style={pdfStyles.row}>
          <Text>Location:</Text>
          <Text>{payroll.employee.location?.name || '—'}</Text>
        </View>
      </View>

      <View style={pdfStyles.hr} />

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.bold}>Attendance Summary</Text>
        <View style={pdfStyles.row}>
          <Text>Total Working Days:</Text>
          <Text>{payroll.workingDays || 0}</Text>
        </View>
        <View style={pdfStyles.row}>
          <Text>Present Days:</Text>
          <Text>{payroll.presentDays || 0}</Text>
        </View>
        <View style={pdfStyles.row}>
          <Text>Absent Days:</Text>
          <Text>{payroll.absentDays || 0}</Text>
        </View>
        <View style={pdfStyles.row}>
          <Text>Leave Days:</Text>
          <Text>{payroll.leaveDays || 0}</Text>
        </View>
        <View style={pdfStyles.row}>
          <Text>Overtime Hours:</Text>
          <Text>{payroll.overtimeHours || 0}</Text>
        </View>
      </View>

      <View style={pdfStyles.hr} />

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.bold}>Earnings</Text>
        <View style={pdfStyles.earningsTable}>
          <View style={pdfStyles.tableHeader}>
            <Text style={pdfStyles.col1}>Description</Text>
            <Text style={pdfStyles.col2}>Amount</Text>
          </View>

          <View style={pdfStyles.tableRow}>
            <Text style={pdfStyles.col1}>Basic Salary</Text>
            <Text style={pdfStyles.col2}>PKR {payroll.rate?.toLocaleString() || '0'}</Text>
          </View>

          {payroll.components
            ?.filter((a: any) => a.type === 'INCREMENT')
            .map((a: any) => (
              <View key={a.id} style={pdfStyles.tableRow}>
                <Text style={pdfStyles.col1}>{a.title}</Text>
                <Text style={pdfStyles.col2}>PKR {a.amount.toLocaleString()}</Text>
              </View>
            ))}

          <View style={[pdfStyles.tableRow, { fontWeight: 'bold' }]}>
            <Text style={pdfStyles.col1}>Gross Earnings</Text>
            <Text style={pdfStyles.col2}>PKR {payroll.grossEarnings?.toLocaleString() || '0'}</Text>
          </View>
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.bold}>Deductions</Text>
        <View style={pdfStyles.earningsTable}>
          <View style={pdfStyles.tableHeader}>
            <Text style={pdfStyles.col1}>Description</Text>
            <Text style={pdfStyles.col2}>Amount</Text>
          </View>

          {payroll.components
            ?.filter((a: any) => a.type === 'DEDUCTION')
            .map((a: any) => (
              <View key={a.id} style={pdfStyles.tableRow}>
                <Text style={pdfStyles.col1}>{a.title}</Text>
                <Text style={pdfStyles.col2}>PKR {a.amount.toLocaleString()}</Text>
              </View>
            ))}

          <View style={[pdfStyles.tableRow, { fontWeight: 'bold' }]}>
            <Text style={pdfStyles.col1}>Gross Deductions</Text>
            <Text style={pdfStyles.col2}>PKR {payroll.grossDeductions?.toLocaleString() || '0'}</Text>
          </View>
        </View>
      </View>

      <View style={pdfStyles.hr} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', fontSize: 16, fontWeight: 'bold' }}>
        <Text>Net Pay</Text>
        <Text>PKR {payroll.netSalary?.toLocaleString() || '0'}</Text>
      </View>
    </Page>
  </Document>
);

export const PayrollDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payroll, setPayroll] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openAdjust, setOpenAdjust] = useState(false);
  const [adjustType, setAdjustType] = useState<'INCREMENT' | 'DEDUCTION'>('INCREMENT');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');

  const loadPayroll = async () => {
    try {
      const res = await payrollAPI.getById(id);
      console.log(res)
      setPayroll(res);
    } catch {
      toast.error('Failed to load payroll');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayroll();
  }, [id]);

  const handleAddAdjustment = async () => {
    if (!title.trim() || !amount || Number(amount) <= 0) {
      toast.error('Title and positive amount required');
      return;
    }

    try {
      await payrollAPI.addComponent(payroll.id, {
        type: adjustType === "INCREMENT" ? "BONUS" : "DEDUCTION",
        title,
        amount: Number(amount),
      });
      toast.success('Adjustment added');
      setOpenAdjust(false);
      setTitle('');
      setAmount('');
      loadPayroll(); // Reload updated payroll
    } catch {
      toast.error('Failed to add adjustment');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading payroll...</div>;
  if (!payroll) return <div className="p-8 text-center">Payroll not found</div>;

  const totalDays = payroll.workingDays || 21;
  const presentPercent = (payroll.presentDays / totalDays) * 100;
  const absentPercent = (payroll.absentDays / totalDays) * 100;
  const leavePercent = (payroll.leaveDays / totalDays) * 100;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate('/payroll')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Pay Slip - {moment(payroll.periodStart).format('MMM YYYY')}</h1>
              <p className="text-gray-600">
                Employee: {payroll.employee.firstName} {payroll.employee.lastName}
               
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
          <Button
  variant="outline"
  disabled={loading}
  onClick={async () => {
    try {
      const newStatus =
        payroll.status === "PAID" ? "GENERATED" : "PAID";

      await payrollAPI.updateStatus(payroll.id, {
        status: newStatus,
      });

      toast.success(
        newStatus === "PAID"
          ? "Payroll marked as Paid"
          : "Payroll reverted to Draft"
      );

      loadPayroll();
    } catch {
      toast.error("Failed to update status");
    }
  }}
>
  {payroll.status === "PAID" ? "Mark as Draft" : "Mark as Paid"}
</Button>
            <PDFDownloadLink
              document={<PayrollSlipPDF payroll={payroll} />}
              fileName={`payslip_${payroll.employee.firstName}_${moment(payroll.periodStart).format('MMM-YYYY')}.pdf`}
            >
              {({ loading }) => (
                <Button disabled={loading} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download Slip
                  
                </Button>
              )}
            </PDFDownloadLink>

            <Button   disabled={payroll.locked}  onClick={() => setOpenAdjust(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Adjustment
            </Button>
          </div>
        </div>

        {/* Employee Info Card */}
        <Card className="border-l-4 border-l-blue-600 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Photo Placeholder */}
              <div className="w-28 h-28 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {/* Replace with real image if available */}
                {/* <User className="w-12 h-12 text-gray-400" /> */}
                <img src={API_URL+payroll.employee.profileImage} style={{
                    objectFit:'contain',
                    aspectRatio:3/3
                }}/>
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-xl font-semibold">
                    {payroll.employee.firstName} {payroll.employee.lastName}
                  </h3>
                  <p className="text-gray-600 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    {payroll.employee.designation || 'Graphic Designer (Manager)'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Hiring Date</p>
                    
                    <p>{moment(payroll.employee.jobInfo.hiringDate).format('DD MMM YYYY') || '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Payroll Cycle</p>
                    <p>10th to 10th</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Location</p>
                    <p>{payroll.employee.location?.name || 'Block G4, Lahore'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Department</p>
                    <p>{payroll.employee.department?.title || 'Tech'}</p>
                  </div>
                </div>
              </div>

              <Badge variant="outline" className="self-start">
                {payroll.status || 'Generated'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Overview - {moment(payroll.periodStart).format('MMM YYYY')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Present
                  </span>
                  <span>{payroll.presentDays} days</span>
                </div>
                <Progress value={presentPercent} className="h-2 bg-green-100" indicatorColor="bg-green-600" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    Absent
                  </span>
                  <span>{payroll.absentDays} days</span>
                </div>
                <Progress value={absentPercent} className="h-2 bg-red-100" indicatorColor="bg-red-600" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-yellow-600" />
                    Leave
                  </span>
                  <span>{payroll.leaveDays} days</span>
                </div>
                <Progress value={leavePercent} className="h-2 bg-yellow-100" indicatorColor="bg-yellow-600" />
              </div>
            </div>

            <div className="flex justify-between text-sm font-medium">
              <span>Total Working Days</span>
              <span>{payroll.workingDays || 21}</span>
            </div>
          </CardContent>
        </Card>

        {/* Earnings & Deductions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Pay Slip Information - {moment(payroll.periodStart).format('MMM YYYY')}</CardTitle>
          </CardHeader>
          <CardContent >
            <div className="overflow-x-auto">
              <Table className='px-3'>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Description</TableHead>
                    <TableHead className="text-right">Earnings (PKR)</TableHead>
                    <TableHead className="text-right">Deductions (PKR)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Earnings */}
                  <TableRow className="bg-blue-50">
                    <TableCell className="font-medium">Basic Salary</TableCell>
                    <TableCell className="text-right">{payroll?.rate?.toLocaleString()}</TableCell>
                    <TableCell className="text-right"></TableCell>
                  </TableRow>

                  {payroll.components
                      ?.filter((c: any) =>
                        ["BASIC", "ALLOWANCE", "BONUS", "COMMISSION", "OVERTIME"].includes(c.type)
                      )
                      .map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell>{c.title}</TableCell>
                          <TableCell className="text-right text-green-600">
                            +{c.amount.toLocaleString()}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                    ))}
                          {payroll.components
                            ?.filter((c: any) =>
                              ["TAX", "LOAN", "DEDUCTION"].includes(c.type)
                            )
                            .map((c: any) => (
                              <TableRow key={c.id}>
                                <TableCell>{c.title}</TableCell>
                                <TableCell />
                                <TableCell className="text-right text-red-600">
                                  -{c.amount.toLocaleString()}
                                </TableCell>
                              </TableRow>
                          ))}
                  <TableRow className="font-bold border-t">
                    <TableCell>Gross Earnings</TableCell>
                    <TableCell className="text-right">{payroll.grossEarnings?.toLocaleString() || '0'}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>

                  {/* Deductions */}
                  {payroll.components
                    ?.filter((a: any) => a.type === 'DEDUCTION')
                    .map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.title}</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right text-red-600">-{a.amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}

                  <TableRow className="font-bold border-t">
                    <TableCell>Gross Deductions</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right">{payroll.grossDeductions?.toLocaleString() || '0'}</TableCell>
                  </TableRow>

                  {/* Net Pay */}
                  <TableRow className="bg-gray-50 font-bold">
                    <TableCell>Net Pay</TableCell>
                    <TableCell className="text-right text-xl text-green-700">
                      PKR {payroll.netSalary?.toLocaleString()}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Add Adjustment Dialog */}
        <Dialog open={openAdjust} onOpenChange={setOpenAdjust}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Adjustment</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={adjustType} onValueChange={(v: 'INCREMENT' | 'DEDUCTION') => setAdjustType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCREMENT">Increment</SelectItem>
                    <SelectItem value="DEDUCTION">Deduction</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Title (Bonus, Loan, Tax, etc.)</Label>
                <Input
                  placeholder="e.g. Performance Bonus"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Amount (PKR)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenAdjust(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddAdjustment}>Add Adjustment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Card>
  <CardHeader>
    <CardTitle>Payroll Activity Log</CardTitle>
  </CardHeader>
  <CardContent>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Action</TableHead>
          <TableHead>By</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payroll.auditLogs?.map((log: any) => (
          <TableRow key={log.id}>
            <TableCell>{log.action}</TableCell>
            <TableCell>
              {log.performedBy?.firstName} {log.performedBy?.lastName}
            </TableCell>
            <TableCell>
              {moment(log.createdAt).format("DD MMM YYYY HH:mm")}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </CardContent>
</Card>
      </div>
    </div>
  );
};