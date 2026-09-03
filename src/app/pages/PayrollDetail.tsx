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
  History,
  Edit,
  Pencil,
  Trash2,
  Plus,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { API_URL, payrollAPI } from '../services/api';

const EARNINGS_TITLES = [
  "KPIs",
  "PPC Bounty",
  "Monthly Bounty",
  "Special Bounty",
  "Current Month Commission",
  "Minus One Month Commission",
  "Minus Two Month Commission",
  "Overtime",
  "Allowance",
  "Arrears",
  "Bonus",
  "Other Earning",
];

const DEDUCTIONS_TITLES = [
  "Tardies",
  "Unpaid Days",
  "Tax",
  "Advance",
  "Food Deduction",
  "CT Deduction",
  "GYM Deduction",
  "Late Deduction",
  "Other Deduction",
];
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  PDFDownloadLink,
} from '@react-pdf/renderer';
import { UNISOFTWARES_LOGO } from '../utils/logoBase64';

// ────────────────────────────────────────────────
// PDF Styles for Payroll Slip (Matching UNISOFTWARES Design)
// ────────────────────────────────────────────────
const pdfStyles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#000000',
    backgroundColor: '#ffffff',
  },
  // Top Header Area
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  logoImage: {
    width: 220,
    height: 48,
    objectFit: 'contain',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  salarySlipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  headerAddress: {
    fontSize: 8,
    color: '#333333',
  },
  headerPhone: {
    fontSize: 8,
    color: '#333333',
    marginTop: 2,
  },
  headerRedLine: {
    borderBottomWidth: 2,
    borderBottomColor: '#a81d24',
    marginBottom: 20,
  },

  // Employee Information Grid
  infoGrid: {
    marginBottom: 25,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  infoCell: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '46%',
  },
  infoLabel: {
    width: '38%',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000000',
  },
  infoValueContainer: {
    width: '62%',
    borderBottomWidth: 0.8,
    borderBottomColor: '#666666',
    paddingBottom: 2,
    alignItems: 'center',
  },
  infoValueText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
  },

  // Earnings & Deductions Table
  tableContainer: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#000000',
    marginBottom: 25,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#a81d24',
  },
  tableHeaderCol: {
    width: '50%',
    padding: 5,
    alignItems: 'center',
  },
  tableHeaderTitle: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#a81d24',
    textAlign: 'center',
  },
  verticalDivider: {
    borderRightWidth: 1,
    borderRightColor: '#000000',
  },
  tableBodyRow: {
    flexDirection: 'row',
  },
  tableColHalf: {
    width: '50%',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3.5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#333333',
  },
  itemTitle: {
    fontSize: 8.5,
    color: '#000000',
  },
  itemAmount: {
    fontSize: 8.5,
    color: '#000000',
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#000000',
  },
  totalTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000000',
  },
  totalAmount: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'right',
  },

  // Footer & Net Payable
  footerContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    marginTop: 5,
  },
  netPayableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  netPayableLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
    marginRight: 15,
  },
  netPayableValueContainer: {
    width: 170,
    borderBottomWidth: 1,
    borderBottomColor: '#666666',
    paddingBottom: 2,
    alignItems: 'center',
  },
  netPayableValueText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
  },
  websiteBanner: {
    backgroundColor: '#a81d24',
    paddingVertical: 5,
    paddingHorizontal: 25,
    borderRadius: 1,
  },
  websiteBannerText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

// PDF Slip Component
export const PayrollSlipPDF = ({ payroll }: { payroll: any }) => {
  const periodMoment = moment(payroll?.periodStart || payroll?.createdAt || new Date());
  const salaryMonth = periodMoment.format("MMMM");
  const salaryYear = periodMoment.format("YYYY");
  const empName = `${payroll?.employee?.firstName || ""} ${payroll?.employee?.lastName || ""}`.trim() || "Employee";
  const empDesignation = payroll?.employee?.designation || payroll?.employee?.jobInfo?.jobTitle || "Employee";

  const basicSalary = Number(payroll?.rate || 0);
  const extraComponents = payroll?.components || [];

  const formatAmt = (val: number) => {
    return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Dynamic + standard Earnings matching Image 1
  const customEarnings = extraComponents.filter((c: any) =>
    ["INCREMENT", "BONUS", "ALLOWANCE", "COMMISSION", "OVERTIME", "KPIS", "BOUNTY", "ARREARS"].includes(String(c.type || "").toUpperCase())
  );

  const earningsList: { title: string; amount: number }[] = [
    { title: "Basic Salary", amount: basicSalary },
  ];

  const defaultEarningsTitles = [
    "KPIs",
    "PPC Bounty",
    "Monthly Bounty",
    "Special Bounty",
    "Current Month Commission",
    "Minus One Month Commission",
    "Minus Two Month Commission",
    "Overtime",
    "Allowance",
    "Arrears",
  ];

  defaultEarningsTitles.forEach((t) => {
    const existing = customEarnings.find((c: any) => String(c.title || "").toLowerCase() === t.toLowerCase());
    earningsList.push({
      title: t,
      amount: existing ? Number(existing.amount || 0) : 0,
    });
  });

  customEarnings.forEach((c: any) => {
    if (!earningsList.some((e) => e.title.toLowerCase() === String(c.title || "").toLowerCase())) {
      earningsList.push({ title: c.title, amount: Number(c.amount || 0) });
    }
  });

  // Dynamic + standard Deductions matching Image 1
  const customDeductions = extraComponents.filter((c: any) =>
    ["DEDUCTION", "TAX", "LOAN", "TARDIES", "UNPAID", "FOOD", "CT", "GYM", "ADVANCE"].includes(String(c.type || "").toUpperCase())
  );

  const deductionsList: { title: string; amount: number }[] = [];

  const defaultDeductionsTitles = [
    "Tardies",
    "Unpaid Days",
    "Tax",
    "Advance",
    "Food Deduction",
    "CT Deduction",
    "GYM Deduction",
  ];

  defaultDeductionsTitles.forEach((t) => {
    const existing = customDeductions.find((c: any) => String(c.title || "").toLowerCase() === t.toLowerCase());
    deductionsList.push({
      title: t,
      amount: existing ? Number(existing.amount || 0) : 0,
    });
  });

  customDeductions.forEach((c: any) => {
    if (!deductionsList.some((d) => d.title.toLowerCase() === String(c.title || "").toLowerCase())) {
      deductionsList.push({ title: c.title, amount: Number(c.amount || 0) });
    }
  });

  const totalEarnings = payroll?.grossEarnings || earningsList.reduce((sum, item) => sum + item.amount, 0);
  const totalDeductions = payroll?.grossDeductions || deductionsList.reduce((sum, item) => sum + item.amount, 0);
  const netPayable = payroll?.netSalary || payroll?.netPay || Math.max(0, totalEarnings - totalDeductions);

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header Section */}
        <View style={pdfStyles.headerContainer}>
          <Image src={UNISOFTWARES_LOGO} style={pdfStyles.logoImage} />
          <View style={pdfStyles.headerRight}>
            <Text style={pdfStyles.salarySlipTitle}>SALARY SLIP</Text>
            <Text style={pdfStyles.headerAddress}>454 – G4, Phase II, Johar Town, Lahore</Text>
            <Text style={pdfStyles.headerPhone}>+92 301 9069 539</Text>
          </View>
        </View>

        {/* Red Line Divider */}
        <View style={pdfStyles.headerRedLine} />

        {/* Employee Info Grid */}
        <View style={pdfStyles.infoGrid}>
          {/* Row 1 */}
          <View style={pdfStyles.infoRow}>
            <View style={pdfStyles.infoCell}>
              <Text style={pdfStyles.infoLabel}>Employee Name:</Text>
              <View style={pdfStyles.infoValueContainer}>
                <Text style={pdfStyles.infoValueText}>{empName}</Text>
              </View>
            </View>
            <View style={pdfStyles.infoCell}>
              <Text style={pdfStyles.infoLabel}>Salary Month:</Text>
              <View style={pdfStyles.infoValueContainer}>
                <Text style={pdfStyles.infoValueText}>{salaryMonth}</Text>
              </View>
            </View>
          </View>

          {/* Row 2 */}
          <View style={pdfStyles.infoRow}>
            <View style={pdfStyles.infoCell}>
              <Text style={pdfStyles.infoLabel}>Designation:</Text>
              <View style={pdfStyles.infoValueContainer}>
                <Text style={pdfStyles.infoValueText}>{empDesignation}</Text>
              </View>
            </View>
            <View style={pdfStyles.infoCell}>
              <Text style={pdfStyles.infoLabel}>Year:</Text>
              <View style={pdfStyles.infoValueContainer}>
                <Text style={pdfStyles.infoValueText}>{salaryYear}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Earnings & Deductions Table */}
        <View style={pdfStyles.tableContainer}>
          {/* Table Header */}
          <View style={pdfStyles.tableHeaderRow}>
            <View style={[pdfStyles.tableHeaderCol, pdfStyles.verticalDivider]}>
              <Text style={pdfStyles.tableHeaderTitle}>EARNINGS</Text>
            </View>
            <View style={pdfStyles.tableHeaderCol}>
              <Text style={pdfStyles.tableHeaderTitle}>DEDUCTIONS</Text>
            </View>
          </View>

          {/* Table Body */}
          <View style={pdfStyles.tableBodyRow}>
            {/* Earnings Column */}
            <View style={[pdfStyles.tableColHalf, pdfStyles.verticalDivider]}>
              {earningsList.map((item, idx) => (
                <View key={idx} style={pdfStyles.itemRow}>
                  <Text style={pdfStyles.itemTitle}>{item.title}</Text>
                  <Text style={pdfStyles.itemAmount}>{formatAmt(item.amount)}</Text>
                </View>
              ))}
              <View style={pdfStyles.totalRow}>
                <Text style={pdfStyles.totalTitle}>Total Earnings</Text>
                <Text style={pdfStyles.totalAmount}>{formatAmt(totalEarnings)}</Text>
              </View>
            </View>

            {/* Deductions Column */}
            <View style={pdfStyles.tableColHalf}>
              {deductionsList.map((item, idx) => (
                <View key={idx} style={pdfStyles.itemRow}>
                  <Text style={pdfStyles.itemTitle}>{item.title}</Text>
                  <Text style={pdfStyles.itemAmount}>{formatAmt(item.amount)}</Text>
                </View>
              ))}
              {/* Spacer rows so Deductions total aligns horizontally with Earnings total */}
              {Array.from({ length: Math.max(0, earningsList.length - deductionsList.length) }).map((_, i) => (
                <View key={`spacer-${i}`} style={pdfStyles.itemRow}>
                  <Text style={pdfStyles.itemTitle}> </Text>
                  <Text style={pdfStyles.itemAmount}> </Text>
                </View>
              ))}
              <View style={pdfStyles.totalRow}>
                <Text style={pdfStyles.totalTitle}>Total Deductions</Text>
                <Text style={pdfStyles.totalAmount}>{formatAmt(totalDeductions)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer & Net Payable */}
        <View style={pdfStyles.footerContainer}>
          <View style={pdfStyles.netPayableRow}>
            <Text style={pdfStyles.netPayableLabel}>Net Payable:</Text>
            <View style={pdfStyles.netPayableValueContainer}>
              <Text style={pdfStyles.netPayableValueText}>{formatAmt(netPayable)}</Text>
            </View>
          </View>

          <View style={pdfStyles.websiteBanner}>
            <Text style={pdfStyles.websiteBannerText}>www.unisoftwares.com</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export const PayrollDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payroll, setPayroll] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openAdjust, setOpenAdjust] = useState(false);
  const [editingComponentId, setEditingComponentId] = useState<number | null>(null);
  const [adjustType, setAdjustType] = useState<'INCREMENT' | 'DEDUCTION'>('INCREMENT');
  const [title, setTitle] = useState(EARNINGS_TITLES[0]);
  const [customTitle, setCustomTitle] = useState('');
  const [amount, setAmount] = useState('');

  const handleTypeChange = (newType: 'INCREMENT' | 'DEDUCTION') => {
    setAdjustType(newType);
    const defaultTitle = newType === 'INCREMENT' ? EARNINGS_TITLES[0] : DEDUCTIONS_TITLES[0];
    setTitle(defaultTitle);
    setCustomTitle('');
  };

  const handleOpenAddModal = () => {
    setEditingComponentId(null);
    setAdjustType('INCREMENT');
    setTitle(EARNINGS_TITLES[0]);
    setCustomTitle('');
    setAmount('');
    setOpenAdjust(true);
  };

  const handleOpenEditModal = (comp: any) => {
    setEditingComponentId(comp.id);
    const isDeduction = ["DEDUCTION", "TAX", "LOAN", "TARDIES", "UNPAID", "FOOD", "CT", "GYM", "ADVANCE"].includes(String(comp.type || "").toUpperCase());
    const typeVal = isDeduction ? 'DEDUCTION' : 'INCREMENT';
    setAdjustType(typeVal);

    const titlesList = isDeduction ? DEDUCTIONS_TITLES : EARNINGS_TITLES;
    if (titlesList.includes(comp.title)) {
      setTitle(comp.title);
      setCustomTitle('');
    } else {
      setTitle(isDeduction ? "Other Deduction" : "Other Earning");
      setCustomTitle(comp.title);
    }
    setAmount(String(comp.amount));
    setOpenAdjust(true);
  };

  const handleDeleteComponent = async (componentId: number) => {
    if (!window.confirm("Are you sure you want to delete this adjustment?")) return;
    try {
      await payrollAPI.deleteComponent(componentId);
      toast.success("Adjustment deleted");
      loadPayroll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete adjustment");
    }
  };

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
    const finalTitle = (title === "Other Earning" || title === "Other Deduction")
      ? (customTitle.trim() || title)
      : (title || (adjustType === "INCREMENT" ? EARNINGS_TITLES[0] : DEDUCTIONS_TITLES[0]));

    if (!finalTitle.trim() || !amount || Number(amount) <= 0) {
      toast.error('Title and positive amount required');
      return;
    }

    try {
      const payloadType = adjustType === "INCREMENT" ? "BONUS" : "DEDUCTION";
      if (editingComponentId) {
        await payrollAPI.updateComponent(editingComponentId, {
          type: payloadType,
          title: finalTitle,
          amount: Number(amount),
        });
        toast.success('Adjustment updated successfully');
      } else {
        await payrollAPI.addComponent(payroll.id, {
          type: payloadType,
          title: finalTitle,
          amount: Number(amount),
        });
        toast.success('Adjustment added successfully');
      }

      setOpenAdjust(false);
      setEditingComponentId(null);
      setTitle(EARNINGS_TITLES[0]);
      setCustomTitle('');
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
                {payroll.employee?.profileImage ? (
                  <img
                    src={API_URL + payroll.employee.profileImage}
                    alt="Employee"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <User className="w-12 h-12 text-gray-400" />
                )}
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-xl font-semibold">
                    {payroll.employee?.firstName || ''} {payroll.employee?.lastName || ''}
                  </h3>
                  <p className="text-gray-600 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    {payroll.employee?.designation || payroll.employee?.jobInfo?.jobTitle || 'Staff'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Hiring Date</p>
                    <p>
                      {(payroll.employee?.hiringDate || payroll.employee?.jobInfo?.hiringDate)
                        ? moment(payroll.employee?.hiringDate || payroll.employee?.jobInfo?.hiringDate).format('DD MMM YYYY')
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Payroll Cycle</p>
                    <p>1st to 30th (Monthly)</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Location</p>
                    <p>{payroll.employee?.company?.name || payroll.employee?.location?.name || 'Main Office'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Department</p>
                    <p>{payroll.employee?.department?.title || 'General'}</p>
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
        {(() => {
          const baseSalary = Number(payroll?.rate || payroll?.grossSalary || 0);
          const extraComponents = payroll?.components || [];

          const customEarnings = extraComponents.filter((c: any) =>
            ["BASIC", "ALLOWANCE", "BONUS", "COMMISSION", "OVERTIME", "INCREMENT", "KPIS", "BOUNTY", "ARREARS"].includes(String(c.type || "").toUpperCase())
          );

          const customDeductions = extraComponents.filter((c: any) =>
            ["DEDUCTION", "TAX", "LOAN", "TARDIES", "UNPAID", "FOOD", "CT", "GYM", "ADVANCE"].includes(String(c.type || "").toUpperCase())
          );

          const calcGrossEarnings = baseSalary + customEarnings.reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);
          const calcGrossDeductions = customDeductions.reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);
          const calcNetPayable = Math.max(0, calcGrossEarnings - calcGrossDeductions);

          return (
            <Card>
              <CardHeader>
                <CardTitle>Pay Slip Information - {moment(payroll.periodStart).format('MMM YYYY')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table className='px-3'>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[45%]">Description</TableHead>
                        <TableHead className="text-right">Earnings (PKR)</TableHead>
                        <TableHead className="text-right">Deductions (PKR)</TableHead>
                        {!payroll.locked && payroll.status !== 'PAID' && (
                          <TableHead className="w-[90px] text-center">Actions</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Basic Salary */}
                      <TableRow className="bg-blue-50/80 font-medium">
                        <TableCell className="font-semibold text-gray-900">Basic Salary</TableCell>
                        <TableCell className="text-right font-bold">{baseSalary.toLocaleString()}</TableCell>
                        <TableCell className="text-right"></TableCell>
                        {!payroll.locked && payroll.status !== 'PAID' && <TableCell />}
                      </TableRow>

                      {/* Extra Earnings */}
                      {customEarnings.map((c: any) => (
                        <TableRow key={c.id} className="hover:bg-gray-50/70 transition-colors">
                          <TableCell className="font-semibold text-gray-800 flex items-center gap-2">
                            <span>{c.title}</span>
                          </TableCell>
                          <TableCell className="text-right text-emerald-600 font-bold">
                            +{Number(c.amount).toLocaleString()}
                          </TableCell>
                          <TableCell />
                          {!payroll.locked && payroll.status !== 'PAID' && (
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(c)}
                                  className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Edit Adjustment"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComponent(c.id)}
                                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                  title="Delete Adjustment"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}

                      <TableRow className="font-bold border-t bg-emerald-50/30">
                        <TableCell>Gross Earnings</TableCell>
                        <TableCell className="text-right text-emerald-700">{calcGrossEarnings.toLocaleString()}</TableCell>
                        <TableCell></TableCell>
                        {!payroll.locked && payroll.status !== 'PAID' && <TableCell />}
                      </TableRow>

                      {/* Extra Deductions */}
                      {customDeductions.map((c: any) => (
                        <TableRow key={c.id} className="hover:bg-gray-50/70 transition-colors">
                          <TableCell className="font-semibold text-gray-800">{c.title}</TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-right text-rose-600 font-bold">
                            -{Number(c.amount).toLocaleString()}
                          </TableCell>
                          {!payroll.locked && payroll.status !== 'PAID' && (
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(c)}
                                  className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Edit Adjustment"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComponent(c.id)}
                                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                  title="Delete Adjustment"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}

                      <TableRow className="font-bold border-t bg-rose-50/30">
                        <TableCell>Gross Deductions</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right text-rose-700">{calcGrossDeductions.toLocaleString()}</TableCell>
                        {!payroll.locked && payroll.status !== 'PAID' && <TableCell />}
                      </TableRow>

                      {/* Net Pay */}
                      <TableRow className="bg-gray-100/80 font-bold">
                        <TableCell className="text-gray-900 font-bold">Net Pay</TableCell>
                        <TableCell className="text-right text-xl text-emerald-700">
                          PKR {calcNetPayable.toLocaleString()}
                        </TableCell>
                        <TableCell></TableCell>
                        {!payroll.locked && payroll.status !== 'PAID' && <TableCell />}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Add Adjustment Dialog */}
        <Dialog open={openAdjust} onOpenChange={setOpenAdjust}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                {editingComponentId ? 'Edit Adjustment' : 'Add Adjustment'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Type</Label>
                <Select value={adjustType} onValueChange={(v: 'INCREMENT' | 'DEDUCTION') => handleTypeChange(v)}>
                  <SelectTrigger className="bg-white border-gray-300 h-10 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCREMENT" className="text-xs font-semibold text-emerald-700">EARNINGS</SelectItem>
                    <SelectItem value="DEDUCTION" className="text-xs font-semibold text-rose-700">DEDUCTIONS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">
                  {adjustType === 'INCREMENT' ? 'Earnings Title' : 'Deductions Title'}
                </Label>
                <Select value={title} onValueChange={(v) => setTitle(v)}>
                  <SelectTrigger className="bg-white border-gray-300 h-10 text-xs font-medium">
                    <SelectValue placeholder="Select Title..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {(adjustType === 'INCREMENT' ? EARNINGS_TITLES : DEDUCTIONS_TITLES).map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(title === "Other Earning" || title === "Other Deduction") && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Custom Title</Label>
                  <Input
                    placeholder="Enter custom title"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="bg-white border-gray-300 h-10 text-xs"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Amount (PKR)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount (e.g. 5000)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-white border-gray-300 h-10 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" onClick={() => setOpenAdjust(false)} className="text-xs font-semibold">
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddAdjustment} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">
                Add Adjustment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Card className="border border-gray-200/80 shadow-2xs rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-gray-50/60 px-6 py-4 border-b border-gray-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <History className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-gray-900">Payroll Activity Log & Audit Trail</CardTitle>
                <p className="text-[11px] text-gray-500 mt-0.5">Real-time log of status changes and salary adjustments.</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-white text-gray-600 border-gray-200 text-[11px] font-semibold">
              {payroll.auditLogs?.length || 0} Events Logged
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {(!payroll.auditLogs || payroll.auditLogs.length === 0) ? (
              <div className="p-8 text-center text-xs text-gray-400 italic">
                No activity records found for this payroll slip.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/40 hover:bg-gray-50/40">
                      <TableHead className="text-xs font-bold text-gray-700 w-[45%]">Action Event</TableHead>
                      <TableHead className="text-xs font-bold text-gray-700">Performed By</TableHead>
                      <TableHead className="text-xs font-bold text-gray-700 text-right">Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payroll.auditLogs.map((log: any) => {
                      const actionStr = String(log.action || "").toUpperCase();
                      let actionBadge = (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 font-semibold text-xs px-2.5 py-1">
                          {log.action}
                        </Badge>
                      );

                      if (actionStr === "PAID") {
                        actionBadge = (
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs px-2.5 py-1 flex items-center gap-1.5 w-fit">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Payment Processed (PAID)</span>
                          </Badge>
                        );
                      } else if (actionStr === "GENERATED") {
                        actionBadge = (
                          <Badge className="bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs px-2.5 py-1 flex items-center gap-1.5 w-fit">
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            <span>Payslip Generated</span>
                          </Badge>
                        );
                      } else if (actionStr.startsWith("COMPONENT_ADDED")) {
                        const compName = actionStr.replace("COMPONENT_ADDED", "").replace(/[()]/g, "").trim();
                        actionBadge = (
                          <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-xs px-2.5 py-1 flex items-center gap-1.5 w-fit">
                            <Plus className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Adjustment Added {compName ? `(${compName})` : ""}</span>
                          </Badge>
                        );
                      } else if (actionStr.startsWith("COMPONENT_UPDATED")) {
                        actionBadge = (
                          <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-bold text-xs px-2.5 py-1 flex items-center gap-1.5 w-fit">
                            <Pencil className="w-3.5 h-3.5 text-amber-600" />
                            <span>Adjustment Updated</span>
                          </Badge>
                        );
                      } else if (actionStr.startsWith("COMPONENT_DELETED")) {
                        actionBadge = (
                          <Badge className="bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs px-2.5 py-1 flex items-center gap-1.5 w-fit">
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Adjustment Deleted</span>
                          </Badge>
                        );
                      }

                      const firstName = log.performedBy?.firstName || "Admin";
                      const lastName = log.performedBy?.lastName || "User";

                      return (
                        <TableRow key={log.id} className="hover:bg-gray-50/70 transition-colors">
                          <TableCell className="py-3">
                            {actionBadge}
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="size-7 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center shrink-0 border border-blue-200">
                                {firstName.charAt(0)}{lastName.charAt(0)}
                              </div>
                              <span className="text-xs font-semibold text-gray-800">
                                {firstName} {lastName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 text-xs text-gray-600 font-medium">
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                              <span>{moment(log.createdAt).format("DD MMM YYYY, hh:mm A")}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};