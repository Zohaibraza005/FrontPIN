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
  Lock,
  CreditCard,
  CheckCircle2,
  Loader2,
  CalendarDays,
  RefreshCw,
  AlertCircle,
  Eye,
  Table as TableIcon,
  Coffee,
} from 'lucide-react';
import { toast } from 'sonner';
import { API_URL, payrollAPI, attendanceAPI } from '../services/api';

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
  "Half Day Deduction",
  "Unpaid Leaves",
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
    const existing = customEarnings.find((c: any) =>
      String(c.title || "").toLowerCase() === t.toLowerCase() ||
      (t.toLowerCase() === "overtime" && String(c.type || "").toUpperCase() === "OVERTIME")
    );
    earningsList.push({
      title: t,
      amount: existing ? Number(existing.amount || 0) : 0,
    });
  });

  customEarnings.forEach((c: any) => {
    const isOvertimeMatched = String(c.type || "").toUpperCase() === "OVERTIME" || String(c.title || "").toLowerCase().includes("overtime");
    if (!isOvertimeMatched && !earningsList.some((e) => e.title.toLowerCase() === String(c.title || "").toLowerCase())) {
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
    "Half Day Deduction",
    "Unpaid Leaves",
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

          {/* Row 3 - Pay Period & Cycle */}
          <View style={pdfStyles.infoRow}>
            <View style={pdfStyles.infoCell}>
              <Text style={pdfStyles.infoLabel}>Pay Period:</Text>
              <View style={pdfStyles.infoValueContainer}>
                <Text style={pdfStyles.infoValueText}>
                  {payroll?.periodStart && payroll?.periodEnd
                    ? `${moment(payroll.periodStart).format("DD MMM YYYY")} – ${moment(payroll.periodEnd).format("DD MMM YYYY")}`
                    : `${salaryMonth} ${salaryYear}`}
                </Text>
              </View>
            </View>
            <View style={pdfStyles.infoCell}>
              <Text style={pdfStyles.infoLabel}>Payroll Cycle:</Text>
              <View style={pdfStyles.infoValueContainer}>
                <Text style={pdfStyles.infoValueText}>
                  {(() => {
                    const cycleDate = Number(payroll?.employee?.payroll?.cycleDate) || 1;
                    const payoutType = payroll?.employee?.payroll?.payoutType || payroll?.payoutType || 'monthly';
                    const typeLabel = payoutType.charAt(0).toUpperCase() + payoutType.slice(1);
                    if (cycleDate <= 1) {
                      return `1st of Month (${typeLabel})`;
                    }
                    return `Day ${cycleDate} of Month (${typeLabel})`;
                  })()}
                </Text>
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
              {/* Spacer rows so Earnings total aligns horizontally with Deductions total */}
              {Array.from({ length: Math.max(0, deductionsList.length - earningsList.length) }).map((_, i) => (
                <View key={`spacer-earn-${i}`} style={pdfStyles.itemRow}>
                  <Text style={pdfStyles.itemTitle}> </Text>
                  <Text style={pdfStyles.itemAmount}> </Text>
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

          {payroll?.status === "PAID" && (
            <View style={{ marginTop: 6, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#F0FDF4', borderRadius: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 7, color: '#166534', fontFamily: 'Helvetica-Bold' }}>
                PAYMENT STATUS: PAID
              </Text>
              <Text style={{ fontSize: 7, color: '#166534', fontFamily: 'Helvetica' }}>
                Method: {payroll?.paymentMethod ? String(payroll.paymentMethod).replace(/_/g, " ") : "Direct"}
                {payroll?.transactionRef ? ` | Ref: ${payroll.transactionRef}` : ""}
                {payroll?.paidAt ? ` | Date: ${moment(payroll.paidAt).format("DD MMM YYYY")}` : ""}
              </Text>
            </View>
          )}

          <View style={pdfStyles.websiteBanner}>
            <Text style={pdfStyles.websiteBannerText}>www.unisoftwares.com</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

const ATTENDANCE_STATUS_CONFIG: Record<string, { label: string; badge: string; cell: string; dot: string; letter: string }> = {
  PRESENT: {
    label: "Present",
    letter: "P",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    cell: "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  LATE: {
    label: "Tardy",
    letter: "T",
    badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    cell: "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  TARDY: {
    label: "Tardy",
    letter: "T",
    badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    cell: "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  ABSENT: {
    label: "Absent",
    letter: "A",
    badge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    cell: "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300",
    dot: "bg-rose-500",
  },
  LEAVE: {
    label: "Leave",
    letter: "L",
    badge: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    cell: "bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 dark:bg-sky-950/50 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  OFF_DAY: {
    label: "Off Day",
    letter: "O",
    badge: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800",
    cell: "bg-gray-50/80 text-gray-400 border border-gray-150 hover:bg-gray-100 dark:bg-gray-900/40 dark:text-gray-500",
    dot: "bg-slate-400",
  },
  OFF: {
    label: "Off Day",
    letter: "O",
    badge: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800",
    cell: "bg-gray-50/80 text-gray-400 border border-gray-150 hover:bg-gray-100 dark:bg-gray-900/40 dark:text-gray-500",
    dot: "bg-slate-400",
  },
  UPCOMING: {
    label: "Upcoming",
    letter: "U",
    badge: "bg-slate-50 text-slate-400 border-slate-200",
    cell: "bg-gray-50 text-gray-400 border border-gray-100",
    dot: "bg-gray-400",
  },
};

const formatAttendanceMinutes = (mins: number) => {
  if (!mins || isNaN(mins)) return "0h 0m";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}m`;
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

  // Payment Details Modal States
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payMethod, setPayMethod] = useState('BANK_TRANSFER');
  const [txnRef, setTxnRef] = useState('');
  const [payDate, setPayDate] = useState(moment().format('YYYY-MM-DD'));
  const [paying, setPaying] = useState(false);

  // Attendance Breakdown Modal States
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [attendanceTab, setAttendanceTab] = useState<'list' | 'grid'>('list');
  const [selectedDayRecord, setSelectedDayRecord] = useState<any | null>(null);

  const fetchMonthlyAttendance = async (forceRefresh = false) => {
    if (!payroll?.employeeId) return;
    try {
      setLoadingAttendance(true);
      const startDate = moment(payroll.periodStart).startOf("month").format("YYYY-MM-DD");
      const endDate = moment(payroll.periodStart).endOf("month").format("YYYY-MM-DD");
      const res = await attendanceAPI.getAttendanceReport({
        employeeId: payroll.employeeId,
        startDate,
        endDate,
      });
      const emp = (res?.employees || [])[0];
      const records = (emp?.Attendance || emp?.attendance || []).slice();
      records.sort((a: any, b: any) => new Date(a.reportDate || a.date || a.dateStr).getTime() - new Date(b.reportDate || b.date || b.dateStr).getTime());
      setAttendanceRecords(records);
      if (records.length > 0) {
        setSelectedDayRecord(records[0]);
      }
      if (forceRefresh) {
        toast.success("Attendance refreshed!");
      }
    } catch (err: any) {
      console.error("Failed to load attendance report:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to load attendance details");
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleOpenAttendanceModal = async () => {
    setAttendanceModalOpen(true);
    if (attendanceRecords.length === 0) {
      await fetchMonthlyAttendance();
    }
  };

  const handleConfirmPay = async () => {
    if (!payroll) return;
    try {
      setPaying(true);
      await payrollAPI.updateStatus(payroll.id, {
        status: "PAID",
        paymentMethod: payMethod,
        transactionRef: txnRef.trim() || undefined,
        paidAt: payDate || new Date(),
      });
      toast.success("Payroll marked as PAID with payment details");
      setPayModalOpen(false);
      loadPayroll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update payment");
    } finally {
      setPaying(false);
    }
  };

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
          
          <div className="flex flex-wrap items-center gap-3">
            {/* View Attendance Button */}
            <Button
              variant="outline"
              className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
              onClick={handleOpenAttendanceModal}
            >
              <CalendarDays className="h-4 w-4 text-indigo-600" />
              <span>View Attendance</span>
            </Button>

            {payroll.status === "PAID" ? (
              <Button
                variant="outline"
                disabled={loading || payroll.locked}
                className="text-amber-700 border-amber-300 hover:bg-amber-50 font-semibold"
                onClick={async () => {
                  if (!window.confirm("Are you sure you want to revert this paid payroll back to Generated?")) return;
                  try {
                    await payrollAPI.updateStatus(payroll.id, {
                      status: "GENERATED",
                    });
                    toast.success("Payroll payment reverted to Generated");
                    loadPayroll();
                  } catch (err: any) {
                    toast.error(err?.response?.data?.message || err?.message || "Failed to update status");
                  }
                }}
              >
                Revert Payment
              </Button>
            ) : (
              <Button
                disabled={loading || payroll.locked}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                onClick={() => {
                  setPayMethod(payroll.paymentMethod || "BANK_TRANSFER");
                  setTxnRef(payroll.transactionRef || "");
                  setPayDate(moment().format("YYYY-MM-DD"));
                  setPayModalOpen(true);
                }}
              >
                <DollarSign className="h-4 w-4" />
                <span>Mark as Paid</span>
              </Button>
            )}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Joining Date</p>
                    <p className="font-semibold text-gray-900">
                      {(() => {
                        const effectiveDate = payroll.employee?.jobInfo?.joiningDate || payroll.employee?.joiningDate || payroll.employee?.jobInfo?.hiringDate || payroll.employee?.hiringDate;
                        return effectiveDate ? moment(effectiveDate).format('DD MMM YYYY') : '—';
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Pay Period</p>
                    <p className="font-semibold text-gray-900">
                      {payroll.periodStart && payroll.periodEnd
                        ? `${moment(payroll.periodStart).format('DD MMM YYYY')} – ${moment(payroll.periodEnd).format('DD MMM YYYY')}`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Payroll Cycle</p>
                    <p className="font-semibold text-gray-900">
                      {(() => {
                        const cycleDate = Number(payroll.employee?.payroll?.cycleDate) || 1;
                        const payoutType = payroll.employee?.payroll?.payoutType || payroll.payoutType || 'monthly';
                        const typeLabel = payoutType.charAt(0).toUpperCase() + payoutType.slice(1);
                        if (cycleDate <= 1) {
                          return `Day 1 (${typeLabel})`;
                        }
                        return `Day ${cycleDate} (${typeLabel})`;
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Location</p>
                    <p className="font-semibold text-gray-900">{payroll.employee?.company?.name || payroll.employee?.location?.name || 'Main Office'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Department</p>
                    <p className="font-semibold text-gray-900">{payroll.employee?.department?.title || 'General'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Payout Type</p>
                    <p className="font-semibold text-gray-900 capitalize">{payroll.payoutType || payroll.employee?.payroll?.payoutType || 'Monthly'}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start">
                {payroll.locked && (
                  <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 flex items-center gap-1 font-semibold text-xs">
                    <Lock className="w-3 h-3 text-slate-600" />
                    Locked
                  </Badge>
                )}
                <Badge variant="outline">
                  {payroll.status || 'Generated'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Summary Banner if Paid */}
        {payroll.status === "PAID" && (
          <Card className="border-l-4 border-l-emerald-600 bg-emerald-50/40 border border-emerald-200/80 shadow-2xs">
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="size-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                    Payment Disbursed Successfully
                    <Badge className="bg-emerald-600 text-white text-[10px] font-bold">PAID</Badge>
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 mt-1">
                    <span>
                      Method: <strong className="font-semibold text-gray-900">{payroll.paymentMethod ? payroll.paymentMethod.replace(/_/g, " ") : "Direct"}</strong>
                    </span>
                    {payroll.transactionRef && (
                      <span>
                        Reference: <strong className="font-mono font-semibold text-gray-900">{payroll.transactionRef}</strong>
                      </span>
                    )}
                    {payroll.paidAt && (
                      <span>
                        Paid On: <strong className="font-medium text-gray-900">{moment(payroll.paidAt).format("DD MMM YYYY")}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Attendance Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Overview - {moment(payroll.periodStart).format('MMM YYYY')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
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

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Late / Tardy
                  </span>
                  <span>{payroll.lateDays || 0} days</span>
                </div>
                <Progress value={Math.min(100, ((payroll.lateDays || 0) / totalDays) * 100)} className="h-2 bg-amber-100" indicatorColor="bg-amber-600" />
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

        {/* MARK AS PAID DIALOG */}
        <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
          <DialogContent className="max-w-md w-full rounded-2xl p-6 bg-white shadow-2xl border border-gray-200">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-emerald-800">
                <CreditCard className="size-5 text-emerald-600" />
                Confirm Salary Payment
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between text-xs font-semibold">
                <span className="text-emerald-900">Total Net Amount:</span>
                <span className="font-mono text-sm font-bold text-emerald-700">
                  PKR {Number(payroll?.netSalary || payroll?.rate || 0).toLocaleString()}
                </span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700">Payment Method</Label>
                  <Select value={payMethod} onValueChange={setPayMethod}>
                    <SelectTrigger className="h-9 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                      <SelectItem value="ONLINE">Online Transfer / Wallet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700">Transaction Reference / Slip #</Label>
                  <Input
                    type="text"
                    placeholder="e.g. TXN-89210 or Cheque #1024"
                    value={txnRef}
                    onChange={(e) => setTxnRef(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700">Disbursed Date</Label>
                  <Input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-3 flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                disabled={paying}
                onClick={() => setPayModalOpen(false)}
                className="rounded-xl border-gray-300 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={paying}
                onClick={handleConfirmPay}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-xs px-4 text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {paying ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    Confirm & Mark Paid
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MONTHLY ATTENDANCE AUDIT MODAL */}
        <Dialog open={attendanceModalOpen} onOpenChange={setAttendanceModalOpen}>
          <DialogContent className="sm:max-w-5xl md:max-w-6xl xl:max-w-7xl w-[95vw] max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-200">
            {/* Header */}
            <div className="px-6 sm:px-8 py-5 border-b border-gray-200/80 bg-gradient-to-r from-gray-50/90 via-white to-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="size-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
                  <CalendarDays className="size-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <DialogTitle className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
                      Monthly Attendance Details
                    </DialogTitle>
                    <Badge variant="outline" className="text-xs bg-indigo-50/80 text-indigo-700 border-indigo-200 font-bold px-3 py-0.5 rounded-full">
                      {moment(payroll.periodStart).format("MMMM YYYY")}
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5 truncate">
                    <span className="font-semibold text-gray-800">{payroll.employee.firstName} {payroll.employee.lastName}</span>
                    <span className="text-gray-300 mx-2">•</span>
                    <span>{payroll.employee.department?.title || 'Staff'}</span>
                    <span className="text-gray-300 mx-2">•</span>
                    <span>Pay Period: {moment(payroll.periodStart).startOf("month").format("DD MMM")} – {moment(payroll.periodStart).endOf("month").format("DD MMM YYYY")}</span>
                  </p>
                </div>
              </div>

              {/* View Switcher (with mr-10 to stay clear of shadcn X button) */}
              <div className="flex items-center bg-gray-100/90 p-1 rounded-2xl border border-gray-200/90 gap-1 self-start sm:self-center mr-10 shrink-0">
                <button
                  type="button"
                  onClick={() => setAttendanceTab('list')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    attendanceTab === 'list'
                      ? 'bg-white shadow-xs text-indigo-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <TableIcon className="size-3.5 text-indigo-600" />
                  <span>Daily Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceTab('grid')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    attendanceTab === 'grid'
                      ? 'bg-white shadow-xs text-indigo-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <CalendarDays className="size-3.5 text-indigo-600" />
                  <span>Calendar Strip</span>
                </button>
              </div>
            </div>

            {/* Attendance Summary Strip (Professional Cards with Icons) */}
            <div className="px-6 sm:px-8 py-3.5 bg-gray-50/50 border-b border-gray-200/70 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <div className="px-3.5 py-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center gap-3">
                <div className="size-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Present (P)</span>
                  <span className="text-base sm:text-lg font-black text-emerald-800 leading-tight">
                    {attendanceRecords.filter(r => r.status === 'PRESENT').length} <span className="text-xs font-semibold text-emerald-600">days</span>
                  </span>
                </div>
              </div>

              <div className="px-3.5 py-2.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center gap-3">
                <div className="size-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Clock className="size-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">Tardy (T)</span>
                  <span className="text-base sm:text-lg font-black text-amber-800 leading-tight">
                    {attendanceRecords.filter(r => r.status === 'LATE' || r.status === 'TARDY' || r.isLate).length} <span className="text-xs font-semibold text-amber-600">days</span>
                  </span>
                </div>
              </div>

              <div className="px-3.5 py-2.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 flex items-center gap-3">
                <div className="size-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <XCircle className="size-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">Absent (A)</span>
                  <span className="text-base sm:text-lg font-black text-rose-800 leading-tight">
                    {attendanceRecords.filter(r => r.status === 'ABSENT').length} <span className="text-xs font-semibold text-rose-600">days</span>
                  </span>
                </div>
              </div>

              <div className="px-3.5 py-2.5 rounded-2xl bg-sky-50/70 border border-sky-200/80 flex items-center gap-3">
                <div className="size-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                  <CalendarDays className="size-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 block">Leave (L)</span>
                  <span className="text-base sm:text-lg font-black text-sky-800 leading-tight">
                    {attendanceRecords.filter(r => r.status === 'LEAVE').length} <span className="text-xs font-semibold text-sky-600">days</span>
                  </span>
                </div>
              </div>

              <div className="px-3.5 py-2.5 rounded-2xl bg-slate-100/80 border border-slate-200 flex items-center gap-3">
                <div className="size-9 rounded-xl bg-slate-200/80 text-slate-700 flex items-center justify-center shrink-0">
                  <Coffee className="size-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Off Days (O)</span>
                  <span className="text-base sm:text-lg font-black text-slate-800 leading-tight">
                    {attendanceRecords.filter(r => r.status === 'OFF_DAY' || r.status === 'OFF').length} <span className="text-xs font-semibold text-slate-600">days</span>
                  </span>
                </div>
              </div>

              <div className="px-3.5 py-2.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex items-center gap-3">
                <div className="size-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Briefcase className="size-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">Total Worked</span>
                  <span className="text-base sm:text-lg font-black text-indigo-900 leading-tight">
                    {formatAttendanceMinutes(attendanceRecords.reduce((sum, r) => sum + (Number(r.totalWorkedMinutes) || 0), 0))}
                  </span>
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-5 min-h-[400px]">
              {loadingAttendance ? (
                <div className="py-28 flex flex-col items-center justify-center gap-3 text-gray-400">
                  <Loader2 className="size-9 animate-spin text-indigo-600" />
                  <p className="text-sm font-semibold text-gray-500">Fetching attendance records...</p>
                </div>
              ) : attendanceRecords.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center gap-3 text-gray-400">
                  <AlertCircle className="size-10 text-gray-300" />
                  <p className="text-sm font-semibold text-gray-600">No attendance records found for this period</p>
                </div>
              ) : attendanceTab === 'list' ? (
                <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-xs bg-white">
                  <Table>
                    <TableHeader className="bg-gray-50/90 border-b border-gray-200">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="py-3.5 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Date & Day</TableHead>
                        <TableHead className="py-3.5 px-4 text-xs font-bold text-gray-700 text-center uppercase tracking-wider">Status</TableHead>
                        <TableHead className="py-3.5 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Shift Schedule</TableHead>
                        <TableHead className="py-3.5 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Punch In</TableHead>
                        <TableHead className="py-3.5 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Punch Out</TableHead>
                        <TableHead className="py-3.5 px-4 text-xs font-bold text-gray-700 text-right uppercase tracking-wider">Total Worked</TableHead>
                        <TableHead className="py-3.5 px-4 text-xs font-bold text-gray-700 text-right uppercase tracking-wider">Overtime</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100">
                      {attendanceRecords.map((r, idx) => {
                        const recDate = moment(r.date || r.reportDate || r.dateStr);
                        const statusKey = String(r.status || 'ABSENT').toUpperCase();
                        const cfg = ATTENDANCE_STATUS_CONFIG[statusKey] || ATTENDANCE_STATUS_CONFIG['ABSENT'];
                        const isLateDay = r.isLate || r.lateMinutes > 0;
                        const otMins = Number(r.overtimeMinutes) || (Number(r.overtimeHours) * 60) || 0;

                        return (
                          <TableRow key={r.id || idx} className="hover:bg-indigo-50/30 transition-colors odd:bg-white even:bg-gray-50/30">
                            <TableCell className="py-3 px-4 font-medium text-xs text-gray-900">
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-900 text-sm">{recDate.format("DD MMM YYYY")}</span>
                                <span className="text-[11px] text-gray-400 font-semibold">{recDate.format("dddd")}</span>
                              </div>
                            </TableCell>

                            <TableCell className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.badge}`}>
                                <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                                {cfg.label}
                              </span>
                            </TableCell>

                            <TableCell className="py-3 px-4 text-xs text-gray-600">
                              {r.shiftStartTime && r.shiftEndTime ? (
                                <span className="font-mono text-xs text-gray-700 bg-gray-100/90 px-2.5 py-1 rounded-lg border border-gray-200/70 font-semibold">
                                  {r.shiftStartTime} – {r.shiftEndTime}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">Standard Shift</span>
                              )}
                            </TableCell>

                            <TableCell className="py-3 px-4 text-xs">
                              {r.checkInTime ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold font-mono text-sm text-gray-900">
                                    {moment(r.checkInTime).format("hh:mm A")}
                                  </span>
                                  {isLateDay && (
                                    <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                                      +{r.lateMinutes || 0}m Late
                                    </span>
                                  )}
                                  {r.checkInDevice && (
                                    <span className="text-[11px] text-gray-400 truncate max-w-[130px]" title={r.checkInDevice}>
                                      • {r.checkInDevice}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">—</span>
                              )}
                            </TableCell>

                            <TableCell className="py-3 px-4 text-xs">
                              {r.checkOutTime ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold font-mono text-sm text-gray-900">
                                    {moment(r.checkOutTime).format("hh:mm A")}
                                  </span>
                                  {r.autoClockedOut && (
                                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">Auto</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">—</span>
                              )}
                            </TableCell>

                            <TableCell className="py-3 px-4 text-xs text-right font-black text-gray-900 font-mono text-sm">
                              {Number(r.totalWorkedMinutes) > 0 ? formatAttendanceMinutes(r.totalWorkedMinutes) : "—"}
                            </TableCell>

                            <TableCell className="py-3 px-4 text-xs text-right">
                              {otMins > 0 ? (
                                <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg font-bold font-mono text-xs border border-emerald-200">
                                  +{formatAttendanceMinutes(otMins)}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Calendar Strip (Horizontal day boxes like Attendance timesheet) */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-1">
                    {attendanceRecords.map((r, idx) => {
                      const recDate = moment(r.date || r.reportDate || r.dateStr);
                      const statusKey = String(r.status || 'ABSENT').toUpperCase();
                      const cfg = ATTENDANCE_STATUS_CONFIG[statusKey] || ATTENDANCE_STATUS_CONFIG['ABSENT'];
                      const isSelected = selectedDayRecord?.id === r.id || (selectedDayRecord && (selectedDayRecord.date === r.date || selectedDayRecord.reportDate === r.reportDate));

                      return (
                        <button
                          key={r.id || idx}
                          type="button"
                          onClick={() => setSelectedDayRecord(r)}
                          className={`flex flex-col items-center justify-between p-2.5 rounded-2xl border min-w-[58px] min-h-[82px] transition-all cursor-pointer ${
                            isSelected
                              ? 'ring-2 ring-indigo-600 shadow-md bg-indigo-50/50 border-indigo-400 scale-[1.03]'
                              : 'bg-white hover:bg-gray-50 border-gray-200 shadow-2xs'
                          }`}
                        >
                          <span className="text-[10px] font-bold uppercase text-gray-400">
                            {recDate.format("ddd")}
                          </span>
                          <span className="text-xs font-black text-gray-700">
                            {recDate.format("D")}
                          </span>
                          <div className={`size-7 rounded-xl flex items-center justify-center font-black text-xs border ${cfg.cell}`}>
                            {cfg.letter}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Day Detail Card */}
                  {selectedDayRecord && (() => {
                    const selDate = moment(selectedDayRecord.date || selectedDayRecord.reportDate || selectedDayRecord.dateStr);
                    const selStatus = String(selectedDayRecord.status || 'ABSENT').toUpperCase();
                    const selCfg = ATTENDANCE_STATUS_CONFIG[selStatus] || ATTENDANCE_STATUS_CONFIG['ABSENT'];

                    return (
                      <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/70 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-200/90 pb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-base font-extrabold text-gray-900">
                              {selDate.format("dddd, DD MMMM YYYY")}
                            </span>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold border ${selCfg.badge}`}>
                              <span className={`size-1.5 rounded-full ${selCfg.dot}`} />
                              {selCfg.label}
                            </span>
                          </div>
                          {selectedDayRecord.isLate && (
                            <span className="text-xs font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300">
                              Late Punch In: {selectedDayRecord.lateMinutes} minutes
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
                          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
                            <span className="text-gray-400 text-[11px] font-bold uppercase block">Shift Schedule</span>
                            <span className="font-bold text-gray-900 font-mono text-sm mt-1 block">
                              {selectedDayRecord.shiftStartTime && selectedDayRecord.shiftEndTime
                                ? `${selectedDayRecord.shiftStartTime} – ${selectedDayRecord.shiftEndTime}`
                                : "Standard Schedule"}
                            </span>
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
                            <span className="text-gray-400 text-[11px] font-bold uppercase block">Punch In Time</span>
                            <span className="font-bold text-gray-900 font-mono text-sm mt-1 block">
                              {selectedDayRecord.checkInTime ? moment(selectedDayRecord.checkInTime).format("hh:mm A") : "—"}
                            </span>
                            {selectedDayRecord.checkInDevice && (
                              <span className="text-[11px] text-gray-400 block truncate mt-1">{selectedDayRecord.checkInDevice}</span>
                            )}
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
                            <span className="text-gray-400 text-[11px] font-bold uppercase block">Punch Out Time</span>
                            <span className="font-bold text-gray-900 font-mono text-sm mt-1 block">
                              {selectedDayRecord.checkOutTime ? moment(selectedDayRecord.checkOutTime).format("hh:mm A") : "—"}
                            </span>
                            {selectedDayRecord.autoClockedOut && (
                              <span className="text-[11px] text-gray-400 block mt-1">Auto System Checkout</span>
                            )}
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
                            <span className="text-gray-400 text-[11px] font-bold uppercase block">Total Worked</span>
                            <span className="font-bold text-gray-900 font-mono text-sm mt-1 block">
                              {Number(selectedDayRecord.totalWorkedMinutes) > 0 ? formatAttendanceMinutes(selectedDayRecord.totalWorkedMinutes) : "0h 0m"}
                            </span>
                            {(Number(selectedDayRecord.overtimeMinutes) > 0 || Number(selectedDayRecord.overtimeHours) > 0) && (
                              <span className="text-[11px] text-emerald-600 font-bold block mt-1">
                                Overtime: {formatAttendanceMinutes(Number(selectedDayRecord.overtimeMinutes) || (Number(selectedDayRecord.overtimeHours) * 60))}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Raw punches if present */}
                        {Array.isArray(selectedDayRecord.punches) && selectedDayRecord.punches.length > 0 && (
                          <div className="pt-2 border-t border-gray-200/70">
                            <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider block mb-2">
                              Device Punch Logs ({selectedDayRecord.punches.length})
                            </span>
                            <div className="flex flex-wrap gap-2.5">
                              {selectedDayRecord.punches.map((p: any, pIdx: number) => (
                                <div key={p.id || pIdx} className="bg-white px-3 py-1.5 rounded-xl border border-gray-200 text-xs flex items-center gap-2 shadow-2xs">
                                  <span className="font-extrabold text-indigo-700">{p.type}</span>
                                  <span className="font-mono font-semibold text-gray-700">{moment(p.punchTime).format("hh:mm:ss A")}</span>
                                  {p.device && <span className="text-gray-400 text-[11px]">({p.device})</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Dialog Footer */}
            <div className="px-6 sm:px-8 py-3.5 border-t border-gray-200/80 bg-gray-50/70 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchMonthlyAttendance(true)}
                disabled={loadingAttendance}
                className="text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1.5 cursor-pointer rounded-xl"
              >
                <RefreshCw className={`size-3.5 ${loadingAttendance ? 'animate-spin' : ''}`} />
                <span>Refresh Attendance</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAttendanceModalOpen(false)}
                className="text-xs font-bold rounded-xl px-5 border-gray-300 hover:bg-gray-100"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};