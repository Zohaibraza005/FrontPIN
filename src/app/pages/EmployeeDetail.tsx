// EmployeeDetail.tsx
//@ts-nocheck
import React, { useState, useEffect } from 'react';
import { mockEmployees } from '../services/mockData'; // Assume this has employee data
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { toast } from 'sonner';
import { Edit, Save, Plus, Trash2, Eye, Lock, Calendar, FileText, Briefcase, Clock, UserX, User, MapPin, Upload, ArrowLeft, Mail, Phone, Building2, Check, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { useParams, Link } from 'react-router';
import { API_URL, employeeAPI, scheduleAPI, locationAPI, departmentAPI } from '../services/api';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { Switch } from '../components/ui/switch';
import { Checkbox } from '../components/ui/checkbox';
import moment from 'moment';

const ALL_WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FULL_DAY_NAMES: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

const documentTypes = ['CNIC', 'Contract', 'Degree', 'Experience Letter', 'Other'];
const separationTypes = ['Resignation', 'Termination', 'End of Contract', 'Retirement'];
const separationReasons = ['Better Opportunity', 'Personal Reasons', 'Performance', 'Misconduct', 'Other'];
// ── Mock data / constants ────────────────────────────────────────────────
const ALL_PRIVILEGES = [
  { id: 'EMPLOYEE', label: 'Employee' },
  { id: 'ATTENDANCE', label: 'Attendance' },
  { id: 'LEAVE', label: 'Leave' },
  { id: 'PROJECT', label: 'Project' },
  { id: 'TASK', label: 'Task' },
  { id: 'INVOICE', label: 'Invoice' },
  { id: 'REPORT', label: 'Report (Own Team)' },
  { id: 'OVERTIME', label: 'Overtime' },
  { id: 'ENABLE_GPS', label: 'GPS Tracking' },
  { id: 'SCHEDULE', label: 'Schedule' },
];

const mockDocuments = [
  { id: 1, type: 'CNIC', fileName: 'cnic_front.jpg', uploadedAt: '2025-01-10' },
  { id: 2, type: 'Contract', fileName: 'employment_contract.pdf', uploadedAt: '2025-02-05' },
];





export const EmployeeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  // const employee = mockEmployees.find((e) => e.id === id);
  // const { id } = useParams<{ id: string }>();
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingJob, setIsEditingJob] = useState(false);
  const [isEditingPayroll, setIsEditingPayroll] = useState(false);
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [isEditingPrivileges, setIsEditingPrivileges] = useState(false);
  const [showIncrementModal, setShowIncrementModal] = useState(false);
  const [showSeparationModal, setShowSeparationModal] = useState(false);
  const [privilegesList, setprivilegesList] = useState([]);
  

  const [employee, setEmployee] = useState<any>(null);
  

  // Edit states
  const [editPersonal, setEditPersonal] = useState(false);
  const [editJob, setEditJob] = useState(false);
  const [editPayroll, setEditPayroll] = useState(false);
  const [editSchedule, setEditSchedule] = useState(false);
  const [editPrivileges, setEditPrivileges] = useState(false);

  
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);

  // Form states
  const [personal, setPersonal] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    username: '',
    employeeId: '',
    biometricId: '',
  });

  const [locationsList, setLocationsList] = useState<any[]>([]);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [supervisorsList, setSupervisorsList] = useState<any[]>([]);

  const [job, setJob] = useState({
    locationId: '',
    location: '',
    departmentId: '',
    department: '',
    supervisorId: '',
    supervisor: '',
    hiringDate: '',
    employmentStatus: 'Active',
    workMode: 'On-site',
  });

  const [payroll, setPayroll] = useState({
    currency: 'PKR',
    rateType: 'monthly',
    rate: 0,
    overtimeRate: 0,
    cycleDate: 1,
    annualLeaves: 0,
  });

  const [schedule, setSchedule] = useState<any>({
    id: null,
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    shiftStart: '09:00',
    shiftEnd: '18:00',
    earlyInMargin: 15,
    earlyOutMargin: 15,
    overtimeAllowed: true,
    overtimeMinutes: 30,
    allowHalfDay: false,
    halfDayMinutes: 240,
    numBreaks: 2,
    breakMinutes: 15,
  });
  const [daySchedules, setDaySchedules] = useState<Record<string, { startTime: string; endTime: string }>>({
    Mon: { startTime: '09:00', endTime: '18:00' },
    Tue: { startTime: '09:00', endTime: '18:00' },
    Wed: { startTime: '09:00', endTime: '18:00' },
    Thu: { startTime: '09:00', endTime: '18:00' },
    Fri: { startTime: '09:00', endTime: '18:00' },
    Sat: { startTime: '09:00', endTime: '18:00' },
    Sun: { startTime: '09:00', endTime: '18:00' },
  });
  const [selectedDay, setSelectedDay] = useState<string>('Mon');
  const [privileges, setPrivileges] = useState<any[]>([]);
  const [separation, setSeparation] = useState<any>(null); // null = not separated

  const toggleWorkingDay = (day: string) => {
    setSchedule((prev: any) => {
      const isWorking = prev.workingDays.includes(day);
      const updatedDays = isWorking
        ? prev.workingDays.filter((d: string) => d !== day)
        : [...prev.workingDays, day];
      return { ...prev, workingDays: updatedDays };
    });
  };

  const handleUpdateDayTime = (day: string, field: 'startTime' | 'endTime', value: string) => {
    setDaySchedules((prev) => ({
      ...prev,
      [day]: {
        ...(prev[day] || { startTime: schedule.shiftStart || '09:00', endTime: schedule.shiftEnd || '18:00' }),
        [field]: value,
      },
    }));
  };

  const handleApplyTimeAllDays = (sourceDay: string) => {
    const source = daySchedules[sourceDay] || { startTime: schedule.shiftStart || '09:00', endTime: schedule.shiftEnd || '18:00' };
    const updated: Record<string, { startTime: string; endTime: string }> = {};
    ALL_WEEK_DAYS.forEach((d) => {
      updated[d] = { ...source };
    });
    setDaySchedules(updated);
    setSchedule((prev: any) => ({
      ...prev,
      shiftStart: source.startTime,
      shiftEnd: source.endTime,
    }));
    toast.success(`Applied ${FULL_DAY_NAMES[sourceDay] || sourceDay} timing (${source.startTime} - ${source.endTime}) to all days`);
  };

  const [loading, setLoading] = useState(true);

  // Increment modal state
  const [incrementType, setIncrementType] = useState<'percentage' | 'amount'>('percentage');
  const [incrementValue, setIncrementValue] = useState(0);
  const [incrementDate, setIncrementDate] = useState('');

  // Separation form
  const [separationType, setSeparationType] = useState('');
  const [separationReason, setSeparationReason] = useState('');
  const [separationComments, setSeparationComments] = useState('');
  const [separationDate, setSeparationDate] = useState('');
  const [clearanceDate, setClearanceDate] = useState('');
// Document upload
    const [docType, setDocType] = useState('');
    const [docFile, setDocFile] = useState<File | null>(null);

  const fetchEmployee = async () => {
    try {
      const res = await employeeAPI.getDetail(id!);
      const emp = res.data;
      setEmployee(emp);

      // Populate forms
      setPersonal({
        firstName: emp.firstName || '',
        lastName: emp.lastName || '',
        email: emp.email || '',
        phone: emp.phoneNumber || emp.phone || '',
        username: emp.username || '',
        employeeId: emp.employeeId || '',
        biometricId: emp.biometricId || '',
      });

      setJob({
        locationId: emp.companyId ? String(emp.companyId) : (emp.company?.id ? String(emp.company.id) : ''),
        location: emp.company?.name || emp.location?.name || '',
        departmentId: emp.departmentId ? String(emp.departmentId) : (emp.department?.id ? String(emp.department.id) : ''),
        department: emp.department?.title || '',
        supervisorId: emp.supervisorId ? String(emp.supervisorId) : (emp.supervisor?.id ? String(emp.supervisor.id) : ''),
        supervisor: emp.supervisor
          ? `${emp.supervisor.firstName} ${emp.supervisor.lastName}`
          : '',
        hiringDate: emp.hiringDate ? emp.hiringDate.split('T')[0] : (emp.jobInfo?.hiringDate ? emp.jobInfo.hiringDate.split('T')[0] : ''),
        employmentStatus: emp.employmentStatus || emp.jobInfo?.employmentStatus || 'Active',
        workMode: emp.workMode || emp.jobInfo?.workMode || 'On-site',
      });

      setPayroll({
        currency: emp.payroll?.currency || 'PKR',
        rateType: emp.payroll?.payoutType || 'monthly',
        rate: emp.payroll?.rate || 0,
        overtimeRate: emp.payroll?.overtimeRate || 0,
        cycleDate: emp.payroll?.cycleDate || 1,
        annualLeaves: emp.payroll?.annualLeaves ?? 17,
        casualLeaves: emp.payroll?.casualLeaves ?? 10,
        suddenLeaves: emp.payroll?.suddenLeaves ?? 12,
        monthlyLeaves: emp.payroll?.monthlyLeaves ?? 3,
      });

      // Populate schedule from emp.Schedule
      if (emp?.Schedule) {
        const scheduleList = Array.isArray(emp.Schedule) ? emp.Schedule : [emp.Schedule];
        const activeSched = scheduleList.find((s: any) => s && !s.deletedAt) || scheduleList[0];
        if (activeSched) {
          const defaultStart = activeSched.startTime || '09:00';
          const defaultEnd = activeSched.endTime || '18:00';

          let daysArr: string[] = [];
          const newDaySchedules: Record<string, { startTime: string; endTime: string }> = {};

          ALL_WEEK_DAYS.forEach((d) => {
            newDaySchedules[d] = {
              startTime: defaultStart,
              endTime: defaultEnd,
            };
          });

          if (Array.isArray(activeSched.days) && activeSched.days.length > 0) {
            const dayMap: Record<string, string> = {
              mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
              monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun'
            };

            activeSched.days.forEach((d: any) => {
              let rawName = "";
              let sTime = defaultStart;
              let eTime = defaultEnd;

              if (typeof d === "object" && d !== null) {
                rawName = d.dayFull || d.day || d.name || d.short || "";
                if (d.startTime) sTime = d.startTime;
                if (d.endTime) eTime = d.endTime;
              } else {
                rawName = String(d || "").trim();
              }

              const key = rawName.toLowerCase();
              const shortDay = dayMap[key] || rawName;

              if (shortDay && !daysArr.includes(shortDay)) {
                daysArr.push(shortDay);
                newDaySchedules[shortDay] = { startTime: sTime, endTime: eTime };
              }
            });
          } else {
            daysArr = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
          }

          const isHalfDayAllowed = Boolean(
            activeSched.allowHalfDay ?? activeSched.allow_half_day ?? activeSched.halfDayAllowed ?? activeSched.half_day_allowed ?? false
          );
          const halfDayMins = Number(
            activeSched.halfDayMinutes ?? activeSched.half_day_minutes ?? 240
          );

          const isOtAllowed = Boolean(activeSched.overtimeAllowed ?? activeSched.overtime_allowed ?? false);
          const otMins = Number(activeSched.overtimeMinutes ?? activeSched.overtime_minutes ?? 30);

          const breaksArr = Array.isArray(activeSched.breakDurations) ? activeSched.breakDurations : [];
          const hasBreaks = Boolean(activeSched.breaksAllowed || breaksArr.length > 0);

          setDaySchedules(newDaySchedules);

          setSchedule({
            id: activeSched.id,
            workingDays: daysArr,
            shiftStart: defaultStart,
            shiftEnd: defaultEnd,
            earlyInMargin: activeSched.earlyInMargin ?? activeSched.early_in_margin ?? 15,
            earlyOutMargin: activeSched.earlyOutMargin ?? activeSched.early_out_margin ?? 15,
            overtimeAllowed: isOtAllowed,
            overtimeMinutes: otMins,
            allowHalfDay: isHalfDayAllowed,
            halfDayMinutes: halfDayMins,
            numBreaks: hasBreaks ? (breaksArr.length || 1) : 0,
            breakMinutes: breaksArr[0] || 15,
          });
        }
      }
      
      if (emp.privileges) {
        setPrivileges(emp.privileges.map((p: any) => ({
          module: p.module,
          canCreate: p.canCreate || false,
          canRead: p.canRead ?? true,
          canUpdate: p.canUpdate || false,
          canDelete: p.canDelete || false,
          ownTeamOnly: p.ownTeamOnly || false,
        })));
      } else {
        setPrivileges([]);
      }

      setLoading(false);
    } catch (err) {
      toast.error('Failed to load employee details');
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [locRes, depRes, empRes] = await Promise.all([
          locationAPI.getLocations(),
          departmentAPI.getDepartments(),
          employeeAPI.getActiveEmployees ? employeeAPI.getActiveEmployees() : employeeAPI.getEmployees(),
        ]);
        if (locRes?.data) setLocationsList(locRes.data);
        if (depRes?.data) setDepartmentsList(depRes.data);
        if (empRes?.data) setSupervisorsList(empRes.data);
      } catch (err) {
        console.error("Metadata error:", err);
      }
    };

    fetchEmployee();
    fetchMetadata();

    const handleRealTimeSync = () => {
      fetchEmployee();
    };

    window.addEventListener('schedule-updated', handleRealTimeSync);
    window.addEventListener('employee-updated', handleRealTimeSync);
    window.addEventListener('focus', handleRealTimeSync);

    return () => {
      window.removeEventListener('schedule-updated', handleRealTimeSync);
      window.removeEventListener('employee-updated', handleRealTimeSync);
      window.removeEventListener('focus', handleRealTimeSync);
    };
  }, [id]);

    // Documents list (from API or mock)
    const [documents, setDocuments] = useState<any[]>([]);
 

  const handleAddIncrement = async () => {
    try {
      await employeeAPI.addIncrement(id, {
        type: incrementType,
        value: incrementValue,
        effectiveDate: incrementDate
      });
  
      toast.success("Increment applied");
      setShowIncrementModal(false);
      fetchEmployee();
    } catch {
      toast.error("Failed to apply increment");
    }
  };
  

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleSavePersonal = async () => {
    try {
      await employeeAPI.updateEmployee(Number(id), {
        firstName: personal.firstName,
        lastName: personal.lastName,
        email: personal.email,
        phoneNumber: personal.phone,
        username: personal.username,
        employeeId: personal.employeeId,
        biometricId: personal.biometricId,
      });
      toast.success('Personal information updated');
      setEditPersonal(false);
      fetchEmployee();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update personal information');
    }
  };

  const handleSaveJob = async () => {
    try {
      const payload: any = {};
      if (job.locationId) payload.companyId = Number(job.locationId);
      if (job.departmentId) payload.departmentId = Number(job.departmentId);
      if (job.supervisorId) payload.supervisorId = Number(job.supervisorId);
      if (job.hiringDate) payload.hiringDate = job.hiringDate;
      if (job.employmentStatus) payload.employmentStatus = job.employmentStatus;
      if (job.workMode) payload.workMode = job.workMode;

      await employeeAPI.updateEmployee(Number(id), payload);
      toast.success('Job information updated');
      setEditJob(false);

      const res = await employeeAPI.getDetail(id!);
      if (res?.data) {
        setEmployee(res.data);
        setJob({
          locationId: res.data.companyId ? String(res.data.companyId) : '',
          location: res.data.company?.name || res.data.location?.name || '',
          departmentId: res.data.departmentId ? String(res.data.departmentId) : '',
          department: res.data.department?.title || '',
          supervisorId: res.data.supervisorId ? String(res.data.supervisorId) : '',
          supervisor: res.data.supervisor ? `${res.data.supervisor.firstName} ${res.data.supervisor.lastName}` : '',
          hiringDate: res.data.hiringDate ? res.data.hiringDate.split('T')[0] : (res.data.jobInfo?.hiringDate ? res.data.jobInfo.hiringDate.split('T')[0] : ''),
          employmentStatus: res.data.employmentStatus || res.data.jobInfo?.employmentStatus || 'Active',
          workMode: res.data.workMode || res.data.jobInfo?.workMode || 'On-site',
        });
      }
    } catch (err: any) {
      console.error("Save Job Error:", err);
      toast.error(err?.message || 'Failed to update job information');
    }
  };

  const handleSavePayroll = async () => {
    try {
      await employeeAPI.updateEmployee(Number(id), {
        payroll: {
          currency: payroll.currency,
          payoutType: payroll.rateType,
          rate: Number(payroll.rate),
          overtimeRate: Number(payroll.overtimeRate),
          cycleDate: Number(payroll.cycleDate),
          annualLeaves: Number(payroll.annualLeaves),
          casualLeaves: Number(payroll.casualLeaves),
          suddenLeaves: Number(payroll.suddenLeaves),
          monthlyLeaves: Number(payroll.monthlyLeaves),
        },
      });
      toast.success('Payroll information updated successfully');
      setIsEditingPayroll(false);
      fetchEmployee();
    } catch (err: any) {
      console.error("Save Payroll Error:", err);
      toast.error(err?.message || 'Failed to update payroll information');
    }
  };

  const handleSaveSchedule = async () => {
    try {
      if (schedule.id) {
        const daysPayload = schedule.workingDays.map((dayName: string) => {
          const timeObj = daySchedules[dayName] || { startTime: schedule.shiftStart || '09:00', endTime: schedule.shiftEnd || '18:00' };
          const fullDayName = FULL_DAY_NAMES[dayName] || dayName;
          return {
            day: dayName,
            dayFull: fullDayName,
            startTime: timeObj.startTime,
            endTime: timeObj.endTime,
          };
        });

        const firstWorkingDayTime = schedule.workingDays.length > 0 && daySchedules[schedule.workingDays[0]]
          ? daySchedules[schedule.workingDays[0]]
          : { startTime: schedule.shiftStart, endTime: schedule.shiftEnd };

        await scheduleAPI.updateSchedule(schedule.id, {
          days: daysPayload,
          startTime: firstWorkingDayTime.startTime || schedule.shiftStart,
          endTime: firstWorkingDayTime.endTime || schedule.shiftEnd,
          allowEarlyIn: true,
          earlyInMinutes: schedule.earlyInMargin,
          allowEarlyOut: true,
          earlyOutMinutes: schedule.earlyOutMargin,
          overtimeAllowed: schedule.overtimeAllowed,
          overtimeMinutes: schedule.overtimeMinutes,
          allowHalfDay: schedule.allowHalfDay,
          halfDayMinutes: schedule.allowHalfDay ? schedule.halfDayMinutes : null,
          breaksAllowed: schedule.numBreaks > 0,
          breakDurations: schedule.numBreaks > 0 ? [schedule.breakMinutes] : [],
        });
      }
      toast.success('Schedule updated successfully');
      setIsEditingSchedule(false);
      window.dispatchEvent(new CustomEvent('schedule-updated', { detail: { scheduleId: schedule.id, employeeId: id } }));
      window.dispatchEvent(new CustomEvent('employee-updated', { detail: { employeeId: id } }));
      fetchEmployee();
    } catch (err) {
      toast.error('Failed to update schedule');
    }
  };

  const handleSavePrivileges = async () => {
    try {
      await employeeAPI.updateEmployee(Number(id), {
        privileges: privileges,
      });
      toast.success('Privileges updated');
      setIsEditingPrivileges(false);
      fetchEmployee();
    } catch (err: any) {
      console.error("Save privileges error:", err);
      toast.error(err?.message || 'Failed to update privileges');
    }
  };

  const isChecked = (module: string, key: string) => {
    const existing = privileges.find(p => p.module === module);
    if (!existing) return false;
    return Boolean(existing[key]);
  };

  const togglePermission = (module: string, key: string) => {
    setPrivileges(prev => {
      const existing = prev.find(p => p.module === module);

      if (!existing) {
        return [
          ...prev,
          {
            module,
            canCreate: key === "canCreate",
            canRead: key === "canRead",
            canUpdate: key === "canUpdate",
            canDelete: key === "canDelete",
            ownTeamOnly: key === "ownTeamOnly",
          },
        ];
      }

      return prev.map(p =>
        p.module === module
          ? { ...p, [key]: !p[key] }
          : p
      );
    });
  };



  const handleMarkSeparation = () => {
    if (!separationType || !separationDate) {
      toast.error('Please fill required fields');
      return;
    }
    setSeparation({
      type: separationType,
      reason: separationReason,
      comments: separationComments,
      date: separationDate,
      clearanceDate,
    });
    toast.success('Separation marked');
    setShowSeparationModal(false);
  };

  const handleUploadDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Simulate API upload
      toast.success(`Document "${file.name}" uploaded`);
    }
  };

  const handleDeleteDocument = (docId: number) => {
    // API delete
    toast.success('Document deleted');
  };
  if (!employee) return <div className="p-8 text-center">Employee not found</div>;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* ── Top Navigation / Breadcrumb ──────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
        <Link to="/employees" className="inline-flex items-center gap-1.5 hover:text-sky-600 font-medium transition-colors">
          <ArrowLeft className="size-4" />
          <span>Employees</span>
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-semibold truncate">
          {employee.firstName} {employee.lastName}
        </span>
      </div>

      {/* ── Modern Profile Header Card ────────────────────────────────────────── */}
      <Card className="shadow-xs border-gray-200 rounded-2xl overflow-hidden bg-white">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-start sm:items-center">
            {/* Photo Avatar */}
            <div className="relative size-20 sm:size-24 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center overflow-hidden border-4 border-white shadow-xs shrink-0">
              {employee.profileImage ? (
                <img src={API_URL + employee.profileImage} alt="Employee" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl sm:text-2xl font-bold tracking-wider">
                  {`${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase() || 'E'}
                </span>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
                  {employee.firstName} {employee.lastName}
                </h1>
                <Badge variant="secondary" className="bg-sky-50 text-sky-700 border-sky-200 font-semibold px-2.5 py-0.5 text-xs rounded-lg">
                  {employee.designation || employee.jobInfo?.designation || 'Employee'}
                </Badge>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium px-2.5 py-0.5 text-xs rounded-full flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {employee.employmentStatus || employee.jobInfo?.employmentStatus || 'Active'}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm text-gray-600 pt-1">
                {(employee.employeeId || employee.id) && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400 font-mono">ID:</span>
                    <span className="font-semibold text-gray-800">{employee.employeeId || `#${employee.id}`}</span>
                  </div>
                )}
                {employee.biometricId && (
                  <div className="flex items-center gap-1.5 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 text-xs">
                    <span className="text-purple-500 font-medium">Bio ID:</span>
                    <span className="font-bold text-purple-700">{employee.biometricId}</span>
                  </div>
                )}
                {employee.hiringDate && (
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="size-3.5 text-gray-400" />
                    <span>Hired: <strong className="text-gray-700 font-medium">{moment(employee.hiringDate).format('DD MMM YYYY')}</strong></span>
                  </div>
                )}
                {(employee?.company?.name || employee?.location?.name) && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-gray-400" />
                    <span>{employee?.company?.name || employee?.location?.name}</span>
                  </div>
                )}
                {employee.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="size-3.5 text-gray-400" />
                    <span className="truncate">{employee.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs Navigation ─────────────────────────────────────────────────── */}
      <Tabs defaultValue="personal" className="space-y-5">
        <TabsList className="flex flex-wrap h-auto w-full justify-start gap-1 p-1 bg-gray-100/90 rounded-2xl border border-gray-200/60 overflow-x-auto">
          <TabsTrigger value="personal" className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-sky-700 data-[state=active]:shadow-2xs">Personal</TabsTrigger>
          <TabsTrigger value="job" className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-sky-700 data-[state=active]:shadow-2xs">Job</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-sky-700 data-[state=active]:shadow-2xs">Documents</TabsTrigger>
          <TabsTrigger value="schedule" className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-sky-700 data-[state=active]:shadow-2xs">Schedule</TabsTrigger>
          <TabsTrigger value="payroll" className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-sky-700 data-[state=active]:shadow-2xs">Payroll</TabsTrigger>
          <TabsTrigger value="approvals" className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-sky-700 data-[state=active]:shadow-2xs">Approvals</TabsTrigger>
          <TabsTrigger value="password-separation" className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-sky-700 data-[state=active]:shadow-2xs">Password / Separation</TabsTrigger>
          <TabsTrigger value="privileges" className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-sky-700 data-[state=active]:shadow-2xs">Privileges</TabsTrigger>
        </TabsList>

        {/* ── PERSONAL INFORMATION ──────────────────────────────────────── */}
        <TabsContent value="personal">
          <Card className="shadow-xs border-gray-200 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 p-5">
              <div>
                <CardTitle className="text-base font-bold text-gray-900">Personal Information</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Contact details and identity information</p>
              </div>
              <Button
                variant={editPersonal ? "ghost" : "outline"}
                size="sm"
                onClick={() => setEditPersonal(!editPersonal)}
                className="h-9 px-3 text-xs rounded-xl border-gray-200 font-medium"
              >
                {editPersonal ? 'Cancel' : <><Edit className="mr-1.5 size-3.5 text-sky-600" /> Edit</>}
              </Button>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <Label className="text-xs font-semibold text-gray-600">First Name</Label>
                <Input
                  value={personal.firstName}
                  disabled={!editPersonal}
                  onChange={e => setPersonal({ ...personal, firstName: e.target.value })}
                  className="mt-1.5 h-10 rounded-xl border-gray-200 bg-gray-50/50 text-gray-800 disabled:opacity-100 disabled:bg-gray-50/70 disabled:cursor-default font-medium text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600">Last Name</Label>
                <Input
                  value={personal.lastName}
                  disabled={!editPersonal}
                  onChange={e => setPersonal({ ...personal, lastName: e.target.value })}
                  className="mt-1.5 h-10 rounded-xl border-gray-200 bg-gray-50/50 text-gray-800 disabled:opacity-100 disabled:bg-gray-50/70 disabled:cursor-default font-medium text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600">Email</Label>
                <Input
                  type="email"
                  value={personal.email}
                  disabled={!editPersonal}
                  onChange={e => setPersonal({ ...personal, email: e.target.value })}
                  className="mt-1.5 h-10 rounded-xl border-gray-200 bg-gray-50/50 text-gray-800 disabled:opacity-100 disabled:bg-gray-50/70 disabled:cursor-default font-medium text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600">Phone</Label>
                <Input
                  value={personal.phone}
                  disabled={!editPersonal}
                  onChange={e => setPersonal({ ...personal, phone: e.target.value })}
                  className="mt-1.5 h-10 rounded-xl border-gray-200 bg-gray-50/50 text-gray-800 disabled:opacity-100 disabled:bg-gray-50/70 disabled:cursor-default font-medium text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600">Employee ID (Code)</Label>
                <Input
                  value={personal.employeeId}
                  disabled={!editPersonal}
                  onChange={e => setPersonal({ ...personal, employeeId: e.target.value })}
                  placeholder="e.g. 1919"
                  className="mt-1.5 h-10 rounded-xl border-gray-200 bg-gray-50/50 text-gray-800 disabled:opacity-100 disabled:bg-gray-50/70 disabled:cursor-default font-medium text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600">Biometric ID (Device ID)</Label>
                <Input
                  value={personal.biometricId}
                  disabled={!editPersonal}
                  onChange={e => setPersonal({ ...personal, biometricId: e.target.value })}
                  placeholder="e.g. 1001"
                  className="mt-1.5 h-10 rounded-xl border-gray-200 bg-gray-50/50 text-gray-800 disabled:opacity-100 disabled:bg-gray-50/70 disabled:cursor-default font-medium text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600">Username</Label>
                <Input
                  value={personal.username}
                  disabled={!editPersonal}
                  onChange={e => setPersonal({ ...personal, username: e.target.value })}
                  className="mt-1.5 h-10 rounded-xl border-gray-200 bg-gray-50/50 text-gray-800 disabled:opacity-100 disabled:bg-gray-50/70 disabled:cursor-default font-medium text-sm"
                />
              </div>
              {editPersonal && (
                <div className="col-span-full flex justify-end pt-2">
                  <Button onClick={handleSavePersonal} className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl h-10 px-5 text-xs font-semibold shadow-xs">
                    <Save className="mr-2 size-3.5" /> Save Changes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── JOB INFORMATION ───────────────────────────────────────────── */}
        <TabsContent value="job">
          <Card className="shadow-xs border-gray-200 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 p-5">
              <div>
                <CardTitle className="text-base font-bold text-gray-900">Job Information</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Role assignment, department, and employment details</p>
              </div>
              <Button
                variant={editJob ? "ghost" : "outline"}
                size="sm"
                onClick={() => setEditJob(!editJob)}
                className="h-9 px-3 text-xs rounded-xl border-gray-200 font-medium"
              >
                {editJob ? 'Cancel' : <><Edit className="mr-1.5 size-3.5 text-sky-600" /> Edit</>}
              </Button>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <Label className="text-xs font-semibold text-gray-600">Location</Label>
                {editJob ? (
                  <SearchableSelect
                    className="w-full mt-1.5"
                    placeholder="Select Location"
                    searchPlaceholder="Search location..."
                    value={job.locationId}
                    onValueChange={(val) => {
                      const found = locationsList.find((l) => String(l.id) === String(val));
                      setJob({
                        ...job,
                        locationId: val,
                        location: found?.name || "",
                      });
                    }}
                    options={locationsList.map((l) => ({
                      value: String(l.id),
                      label: l.name,
                    }))}
                  />
                ) : (
                  <Input value={job.location || 'N/A'} disabled className="mt-1.5 h-10 rounded-xl border-gray-200 bg-gray-50/50 text-gray-800 disabled:opacity-100 disabled:bg-gray-50/70 disabled:cursor-default font-medium text-sm" />
                )}
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-600">Department</Label>
                {editJob ? (
                  <SearchableSelect
                    className="w-full mt-1.5"
                    placeholder="Select Department"
                    searchPlaceholder="Search department..."
                    value={job.departmentId}
                    onValueChange={(val) => {
                      const found = departmentsList.find((d) => String(d.id) === String(val));
                      setJob({
                        ...job,
                        departmentId: val,
                        department: found?.title || "",
                      });
                    }}
                    options={departmentsList.map((d) => ({
                      value: String(d.id),
                      label: d.title,
                    }))}
                  />
                ) : (
                  <Input value={job.department || 'N/A'} disabled className="mt-1.5 h-10 rounded-xl border-gray-200 bg-gray-50/50 text-gray-800 disabled:opacity-100 disabled:bg-gray-50/70 disabled:cursor-default font-medium text-sm" />
                )}
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-600">Supervisor</Label>
                {editJob ? (
                  <SearchableSelect
                    className="w-full mt-1.5"
                    placeholder="Select Supervisor"
                    searchPlaceholder="Search supervisor..."
                    value={job.supervisorId}
                    onValueChange={(val) => {
                      const found = supervisorsList.find((s) => String(s.id) === String(val));
                      setJob({
                        ...job,
                        supervisorId: val,
                        supervisor: found ? `${found.firstName} ${found.lastName}` : "",
                      });
                    }}
                    options={supervisorsList.map((s) => ({
                      value: String(s.id),
                      label: `${s.firstName} ${s.lastName || ""}`.trim(),
                    }))}
                  />
                ) : (
                  <Input value={job.supervisor || 'N/A'} disabled className="mt-1.5 h-10 rounded-xl border-gray-200 bg-gray-50/50 text-gray-800 disabled:opacity-100 disabled:bg-gray-50/70 disabled:cursor-default font-medium text-sm" />
                )}
              </div>

                <div>
                  <Label>Hiring Date</Label>
                  <Input type="date" value={job.hiringDate} disabled={!editJob} onChange={e => setJob({ ...job, hiringDate: e.target.value })} />
                </div>
                <div>
                  <Label>Employment Status</Label>
                  <Select disabled={!editJob} value={job.employmentStatus} onValueChange={v => setJob({ ...job, employmentStatus: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="On Leave">On Leave</SelectItem>
                      <SelectItem value="Separated">Separated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Work Mode</Label>
                  <Select disabled={!editJob} value={job.workMode} onValueChange={v => setJob({ ...job, workMode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="On-site">On-site</SelectItem>
                      <SelectItem value="Remote">Remote</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editJob && (
                  <div className="col-span-full flex justify-end">
                    <Button onClick={handleSaveJob}>
                      <Save className="mr-2 h-4 w-4" /> Save Changes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        {/* ── DOCUMENTS ──────────────────────────────────────────────────── */}
        <TabsContent value="documents">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Documents</CardTitle>
                <Dialog open={showUploadDocModal} onOpenChange={setShowUploadDocModal}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Upload className="mr-2 h-4 w-4" /> Upload Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upload Document</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Document Type</Label>
                        <Select value={docType} onValueChange={setDocType}>
                          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>
                            {documentTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>File</Label>
                        <Input type="file" onChange={e => setDocFile(e.target.files?.[0] || null)} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowUploadDocModal(false)}>Cancel</Button>
                      <Button onClick={handleUploadDocument}>Upload</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc: any) => (
                      <TableRow key={doc.id}>
                        <TableCell>{doc.type}</TableCell>
                        <TableCell>{doc.fileName || doc.url?.split('/').pop()}</TableCell>
                        <TableCell>{moment(doc.uploadedAt).format('DD MMM YYYY')}</TableCell>
                        <TableCell className="text-right flex gap-2 justify-end">
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteDocument(doc.id)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {documents.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                          No documents uploaded yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

        {/* ── SCHEDULE ───────────────────────────────────────────────────── */}
        <TabsContent value="schedule">
          <Card className="rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden bg-white">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 p-5">
              <div>
                <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Schedule & Shift Configuration
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configure working days, shift hours, grace periods, overtime, and break policies.
                </p>
              </div>

              {!isEditingSchedule ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingSchedule(true)}
                  className="rounded-xl border-gray-200 hover:bg-white text-xs font-semibold"
                >
                  <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit Schedule
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingSchedule(false)}
                    className="rounded-xl border-gray-200 hover:bg-white text-xs font-semibold text-gray-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveSchedule}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                  >
                    <Save className="mr-1.5 h-3.5 w-3.5" /> Save Schedule
                  </Button>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* ── CARD 1: DAILY SHIFT TIMINGS & WORKING DAYS ────────────────── */}
              <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-gray-200/60 pb-3">
                  <div>
                    <Label className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-blue-600" />
                      Daily Shift Timings & Working Pattern
                    </Label>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {isEditingSchedule
                        ? "Check working days and configure individual shift start and end times for each day."
                        : "Active shift timings configured for each day of the week."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-semibold text-xs px-2.5 py-0.5">
                      {schedule.workingDays.length} Working Days / {7 - schedule.workingDays.length} Off Days
                    </Badge>
                  </div>
                </div>

                {/* Quick Presets in Edit Mode */}
                {isEditingSchedule && (
                  <div className="flex flex-wrap items-center gap-2 pb-1 border-b border-gray-200/60">
                    <span className="text-[11px] font-semibold text-gray-500 mr-1">Quick Presets:</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSchedule((prev: any) => ({ ...prev, workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }))}
                      className="text-[11px] h-7 rounded-lg bg-white border-gray-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      Mon – Fri (5 Days)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSchedule((prev: any) => ({ ...prev, workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }))}
                      className="text-[11px] h-7 rounded-lg bg-white border-gray-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      Mon – Sat (6 Days)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSchedule((prev: any) => ({ ...prev, workingDays: ALL_WEEK_DAYS }))}
                      className="text-[11px] h-7 rounded-lg bg-white border-gray-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSchedule((prev: any) => ({ ...prev, workingDays: [] }))}
                      className="text-[11px] h-7 rounded-lg bg-white border-gray-300 hover:bg-red-50 hover:text-red-600"
                    >
                      Clear All
                    </Button>
                  </div>
                )}

                {/* 7 Days Per-Day Schedule List */}
                <div className="grid grid-cols-1 gap-3 pt-1">
                  {ALL_WEEK_DAYS.map((dayKey) => {
                    const isWorking = schedule.workingDays.includes(dayKey);
                    const dayName = FULL_DAY_NAMES[dayKey] || dayKey;
                    const dayTime = daySchedules[dayKey] || { startTime: schedule.shiftStart || '09:00', endTime: schedule.shiftEnd || '18:00' };

                    return (
                      <div
                        key={dayKey}
                        className={`p-4 rounded-2xl border transition-all ${
                          isWorking
                            ? 'bg-white border-gray-200 shadow-2xs hover:border-gray-300'
                            : 'bg-gray-100/50 border-gray-200/60'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 pb-2.5 border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            {isEditingSchedule ? (
                              <Checkbox
                                checked={isWorking}
                                onCheckedChange={() => toggleWorkingDay(dayKey)}
                                id={`day-check-${dayKey}`}
                              />
                            ) : (
                              <div className={`size-6 rounded-full flex items-center justify-center ${isWorking ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-400'}`}>
                                {isWorking ? <Check className="w-3.5 h-3.5" /> : <span className="text-[10px]">✕</span>}
                              </div>
                            )}

                            <Label htmlFor={`day-check-${dayKey}`} className="font-bold text-sm text-gray-900 cursor-pointer">
                              {dayName}
                            </Label>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={
                                isWorking
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[11px]'
                                  : 'bg-gray-100 text-gray-500 border-gray-200 text-[11px]'
                              }
                            >
                              {isWorking ? 'Active Working Day' : 'Off Day (Non-Working)'}
                            </Badge>

                            {isEditingSchedule && isWorking && (
                              <button
                                type="button"
                                onClick={() => handleApplyTimeAllDays(dayKey)}
                                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline ml-2"
                                title="Copy this timing to all days"
                              >
                                Apply timing to all
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Shift Time Inputs for this day */}
                        {isWorking ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-700">Start Time ({dayKey})</Label>
                              <Input
                                type="time"
                                value={dayTime.startTime}
                                disabled={!isEditingSchedule}
                                onChange={(e) => handleUpdateDayTime(dayKey, 'startTime', e.target.value)}
                                className="bg-white border-gray-300 font-semibold h-10 text-xs"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-700">End Time ({dayKey})</Label>
                              <Input
                                type="time"
                                value={dayTime.endTime}
                                disabled={!isEditingSchedule}
                                onChange={(e) => handleUpdateDayTime(dayKey, 'endTime', e.target.value)}
                                className="bg-white border-gray-300 font-semibold h-10 text-xs"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="py-1 text-xs text-gray-400 italic">
                            No shift timing configured (Off Day)
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── CARD 3: PUNCTUALITY & MARGINS ────────────────── */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200/80 space-y-4 shadow-2xs">
                <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5 border-b border-gray-100 pb-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  Punctuality & Grace Margins
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Early In Margin (minutes)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={schedule.earlyInMargin}
                      disabled={!isEditingSchedule}
                      onChange={(e) => setSchedule({ ...schedule, earlyInMargin: Number(e.target.value) })}
                      className="bg-white border-gray-300 h-10"
                    />
                    <p className="text-[10px] text-gray-400">Buffer allowed before shift start time for early check-in.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Early Out Margin (minutes)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={schedule.earlyOutMargin}
                      disabled={!isEditingSchedule}
                      onChange={(e) => setSchedule({ ...schedule, earlyOutMargin: Number(e.target.value) })}
                      className="bg-white border-gray-300 h-10"
                    />
                    <p className="text-[10px] text-gray-400">Buffer allowed before shift end time without marking early departure.</p>
                  </div>
                </div>
              </div>

              {/* ── CARD 4: HALF-DAY & OVERTIME POLICIES ────────────────── */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200/80 space-y-4 shadow-2xs">
                <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5 border-b border-gray-100 pb-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Half-Day & Overtime Rules
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Half Day */}
                  <div className="space-y-3 p-4 rounded-xl bg-gray-50/70 border border-gray-200/80">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-gray-800">Half Day Allowed</Label>
                      {isEditingSchedule ? (
                        <Switch
                          checked={schedule.allowHalfDay}
                          onCheckedChange={(val) => setSchedule({ ...schedule, allowHalfDay: val })}
                        />
                      ) : (
                        <Badge variant={schedule.allowHalfDay ? "default" : "outline"} className={schedule.allowHalfDay ? "bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]" : "text-gray-500 text-[10px]"}>
                          {schedule.allowHalfDay ? "Allowed" : "Disabled"}
                        </Badge>
                      )}
                    </div>

                    {schedule.allowHalfDay && (
                      <div className="space-y-1.5 pt-2 border-t border-gray-200/60">
                        <Label className="text-xs font-semibold text-gray-700">Half Day Threshold Margin (minutes)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={schedule.halfDayMinutes}
                          disabled={!isEditingSchedule}
                          onChange={(e) => setSchedule({ ...schedule, halfDayMinutes: Number(e.target.value) })}
                          className="bg-white border-gray-300 h-9 text-xs"
                        />
                        <p className="text-[10px] text-gray-500 font-mono">
                          {Math.floor(schedule.halfDayMinutes / 60)}h {schedule.halfDayMinutes % 60}m shift threshold required
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Overtime */}
                  <div className="space-y-3 p-4 rounded-xl bg-gray-50/70 border border-gray-200/80">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-gray-800">Overtime Allowed</Label>
                      {isEditingSchedule ? (
                        <Switch
                          checked={schedule.overtimeAllowed}
                          onCheckedChange={(val) => setSchedule({ ...schedule, overtimeAllowed: val })}
                        />
                      ) : (
                        <Badge variant={schedule.overtimeAllowed ? "default" : "outline"} className={schedule.overtimeAllowed ? "bg-purple-100 text-purple-800 border-purple-200 text-[10px]" : "text-gray-500 text-[10px]"}>
                          {schedule.overtimeAllowed ? "Allowed" : "Disabled"}
                        </Badge>
                      )}
                    </div>

                    {schedule.overtimeAllowed && (
                      <div className="space-y-1.5 pt-2 border-t border-gray-200/60">
                        <Label className="text-xs font-semibold text-gray-700">Overtime Allowed (minutes)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={schedule.overtimeMinutes}
                          disabled={!isEditingSchedule}
                          onChange={(e) => setSchedule({ ...schedule, overtimeMinutes: Number(e.target.value) })}
                          className="bg-white border-gray-300 h-9 text-xs"
                        />
                        <p className="text-[10px] text-gray-500 font-mono">
                          Max {schedule.overtimeMinutes} mins ({ (schedule.overtimeMinutes / 60).toFixed(1) } hrs) extra time allowed
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── CARD 5: BREAKS ────────────────── */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200/80 space-y-4 shadow-2xs">
                <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5 border-b border-gray-100 pb-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  Breaks Policy
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Number of Breaks</Label>
                    <Input
                      type="number"
                      min={0}
                      value={schedule.numBreaks}
                      disabled={!isEditingSchedule}
                      onChange={(e) => setSchedule({ ...schedule, numBreaks: Number(e.target.value) })}
                      className="bg-white border-gray-300 h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Break Duration (minutes per break)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={schedule.breakMinutes}
                      disabled={!isEditingSchedule}
                      onChange={(e) => setSchedule({ ...schedule, breakMinutes: Number(e.target.value) })}
                      className="bg-white border-gray-300 h-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PAYROLL ────────────────────────────────────────────────────── */}
        <TabsContent value="payroll">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Payroll Information</CardTitle>
              {!isEditingPayroll ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditingPayroll(true)}>
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowIncrementModal(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Increment
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditingPayroll(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSavePayroll}>
                    <Save className="mr-2 h-4 w-4" /> Save
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label>Currency</Label>
                  <Select disabled={!isEditingPayroll} value={payroll.currency} onValueChange={(v) => setPayroll({ ...payroll, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PKR">PKR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Rate Type</Label>
                  <RadioGroup disabled={!isEditingPayroll} value={payroll.rateType} onValueChange={(v) => setPayroll({ ...payroll, rateType: v as any })}>
                    <div className="flex gap-6 mt-2">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="hourly" id="hourly" />
                        <Label htmlFor="hourly">Hourly</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="daily" id="daily" />
                        <Label htmlFor="daily">Daily</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="monthly" id="monthly" />
                        <Label htmlFor="monthly">Monthly</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
                <div>
                  <Label>Rate</Label>
                  <Input type="number" disabled={!isEditingPayroll} value={payroll.rate} onChange={(e) => setPayroll({ ...payroll, rate: Number(e.target.value) })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label>Overtime Rate</Label>
                  <Input type="number" disabled={!isEditingPayroll} value={payroll.overtimeRate} onChange={(e) => setPayroll({ ...payroll, overtimeRate: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Cycle Date</Label>
                  <Input type="number" disabled={!isEditingPayroll} min={1} max={31} value={payroll.cycleDate} onChange={(e) => setPayroll({ ...payroll, cycleDate: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Annual Leaves</Label>
                  <Input type="number" disabled={!isEditingPayroll} value={payroll.annualLeaves} onChange={(e) => setPayroll({ ...payroll, annualLeaves: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Casual Leave</Label>
                  <Input type="number" disabled={!isEditingPayroll} value={payroll.casualLeaves} onChange={(e) => setPayroll({ ...payroll, casualLeaves: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Sudden Leaves</Label>
                  <Input type="number" disabled={!isEditingPayroll} value={payroll.suddenLeaves} onChange={(e) => setPayroll({ ...payroll, suddenLeaves: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Monthly Leaves</Label>
                  <Input type="number" disabled={!isEditingPayroll} value={payroll.monthlyLeaves} onChange={(e) => setPayroll({ ...payroll, monthlyLeaves: Number(e.target.value) })} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Increment Modal */}
          <Dialog open={showIncrementModal} onOpenChange={setShowIncrementModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Salary Increment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Increment Type</Label>
                  <Select value={incrementType} onValueChange={(v) => setIncrementType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="amount">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Value</Label>
                  <Input type="number" value={incrementValue} onChange={(e) => setIncrementValue(Number(e.target.value))} />
                </div>
                <div>
                  <Label>Apply Date</Label>
                  <Input type="date" value={incrementDate} onChange={(e) => setIncrementDate(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowIncrementModal(false)}>Cancel</Button>
                <Button onClick={handleAddIncrement}>Apply Increment</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── APPROVALS ──────────────────────────────────────────────────── */}
        <TabsContent value="approvals">
          <Card>
            <CardHeader>
              <CardTitle>Leave & Approval Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Apply Date</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Policy</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const leaves = (employee?.leaveRequests || []).map((l: any) => ({
                      id: `leave-${l.id}`,
                      employeeName: `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim(),
                      applyDate: l.createdAt ? moment(l.createdAt).format("YYYY-MM-DD") : (l.startDate ? moment(l.startDate).format("YYYY-MM-DD") : "N/A"),
                      duration: `${l.days || 1} day${(l.days || 1) > 1 ? "s" : ""}`,
                      policy: l.leaveType?.name || "Leave Request",
                      status: l.status ? l.status.charAt(0).toUpperCase() + l.status.slice(1).toLowerCase() : "Pending",
                      rawStatus: l.status?.toUpperCase() || "PENDING",
                    }));

                    const otRequests = (employee?.overtimes || []).map((o: any) => {
                      const mins = o.minutes || (o.hours ? Math.round(o.hours * 60) : 0);
                      const hrs = Math.floor(mins / 60);
                      const m = mins % 60;
                      const durStr = hrs > 0 ? `${hrs}h ${m}m` : `${mins} mins`;

                      return {
                        id: `ot-${o.id}`,
                        employeeName: `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim(),
                        applyDate: o.createdAt ? moment(o.createdAt).format("YYYY-MM-DD") : (o.date ? moment(o.date).format("YYYY-MM-DD") : "N/A"),
                        duration: durStr,
                        policy: "Overtime Request",
                        status: o.status ? o.status.charAt(0).toUpperCase() + o.status.slice(1).toLowerCase() : "Pending",
                        rawStatus: o.status?.toUpperCase() || "PENDING",
                      };
                    });

                    const realApprovals = [...leaves, ...otRequests].sort(
                      (a, b) => new Date(b.applyDate).getTime() - new Date(a.applyDate).getTime()
                    );

                    if (realApprovals.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                            No leave or overtime approval requests found for this employee.
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return realApprovals.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-semibold">{req.employeeName}</TableCell>
                        <TableCell className="font-mono text-xs">{req.applyDate}</TableCell>
                        <TableCell>{req.duration}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {req.policy}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              req.rawStatus === "APPROVED"
                                ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                                : req.rawStatus === "REJECTED"
                                ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300"
                            }
                          >
                            {req.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ));
                  })()}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PASSWORD / SEPARATION ─────────────────────────────────────── */}
        <TabsContent value="password-separation">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Change Password */}
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>New Password</Label>
                  <Input type="password" placeholder="••••••••" />
                </div>
                <div>
                  <Label>Confirm Password</Label>
                  <Input type="password" placeholder="••••••••" />
                </div>
                <Button className="w-full">
                  <Lock className="mr-2 h-4 w-4" /> Update Password
                </Button>
              </CardContent>
            </Card>

            {/* Separation */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Separation</CardTitle>
                {!separation ? (
                  <Button variant="destructive" size="sm" onClick={() => setShowSeparationModal(true)}>
                    <UserX className="mr-2 h-4 w-4" /> Mark Separation
                  </Button>
                ) : (
                  <Badge variant="destructive">Separated</Badge>
                )}
              </CardHeader>
              <CardContent>
                {separation ? (
                  <div className="space-y-2">
                    <p><strong>Type:</strong> {separation.type}</p>
                    <p><strong>Reason:</strong> {separation.reason}</p>
                    <p><strong>Date:</strong> {separation.date}</p>
                    <p><strong>Clearance Date:</strong> {separation.clearanceDate || 'N/A'}</p>
                    <p><strong>Comments:</strong> {separation.comments || 'None'}</p>
                  </div>
                ) : (
                  <p className="text-gray-500">Employee is currently active.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Separation Modal */}
          <Dialog open={showSeparationModal} onOpenChange={setShowSeparationModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Mark Employee Separation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Separation Type *</Label>
                  <Select value={separationType} onValueChange={setSeparationType}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {separationTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Reason *</Label>
                  <Select value={separationReason} onValueChange={setSeparationReason}>
                    <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                    <SelectContent>
                      {separationReasons.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Separation Date *</Label>
                  <Input type="date" value={separationDate} onChange={(e) => setSeparationDate(e.target.value)} />
                </div>
                <div>
                  <Label>Clearance Date</Label>
                  <Input type="date" value={clearanceDate} onChange={(e) => setClearanceDate(e.target.value)} />
                </div>
                <div>
                  <Label>Comments</Label>
                  <Textarea value={separationComments} onChange={(e) => setSeparationComments(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSeparationModal(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleMarkSeparation}>Confirm Separation</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── PRIVILEGES ─────────────────────────────────────────────────── */}
        <TabsContent value="privileges">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Privileges</CardTitle>
              {!isEditingPrivileges ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditingPrivileges(true)}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditingPrivileges(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSavePrivileges}>
                    <Save className="mr-2 h-4 w-4" /> Save
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Label className="text-base font-semibold">Module Permissions</Label>
                {(() => {
                  const listToRender = isEditingPrivileges
                    ? ALL_PRIVILEGES
                    : ALL_PRIVILEGES.filter(priv => {
                        const existing = privileges.find(p => p.module === priv.id);
                        if (!existing) return false;
                        return (
                          existing.canCreate ||
                          existing.canRead ||
                          existing.canUpdate ||
                          existing.canDelete ||
                          existing.ownTeamOnly
                        );
                      });

                  if (listToRender.length === 0) {
                    return (
                      <div className="text-center py-10 border border-dashed rounded-lg text-muted-foreground text-sm">
                        No privileges granted to this employee.
                      </div>
                    );
                  }

                  return (
                    <div className="border rounded-xl overflow-hidden">
                      <div className="grid grid-cols-6 bg-muted px-4 py-3 text-sm font-medium">
                        <div>Module</div>
                        <div className="text-center">Create</div>
                        <div className="text-center">Read</div>
                        <div className="text-center">Update</div>
                        <div className="text-center">Delete</div>
                        <div className="text-center">Own Team</div>
                      </div>

                      {listToRender.map((priv, index) => (
                        <div
                          key={priv.id}
                          className={`grid grid-cols-6 items-center px-4 py-3 border-t ${
                            index % 2 === 0 ? "bg-background" : "bg-muted/40"
                          }`}
                        >
                          <div className="font-semibold text-sm text-gray-700">{priv.label}</div>

                          <div className="flex justify-center">
                            <input
                              type="checkbox"
                              disabled={!isEditingPrivileges}
                              checked={isChecked(priv.id, "canCreate")}
                              onChange={() => togglePermission(priv.id, "canCreate")}
                              className="size-4 accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </div>

                          <div className="flex justify-center">
                            <input
                              type="checkbox"
                              disabled={!isEditingPrivileges}
                              checked={isChecked(priv.id, "canRead")}
                              onChange={() => togglePermission(priv.id, "canRead")}
                              className="size-4 accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </div>

                          <div className="flex justify-center">
                            <input
                              type="checkbox"
                              disabled={!isEditingPrivileges}
                              checked={isChecked(priv.id, "canUpdate")}
                              onChange={() => togglePermission(priv.id, "canUpdate")}
                              className="size-4 accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </div>

                          <div className="flex justify-center">
                            <input
                              type="checkbox"
                              disabled={!isEditingPrivileges}
                              checked={isChecked(priv.id, "canDelete")}
                              onChange={() => togglePermission(priv.id, "canDelete")}
                              className="size-4 accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </div>

                          <div className="flex justify-center">
                            {priv.id === "REPORT" ? (
                              <input
                                type="checkbox"
                                disabled={!isEditingPrivileges}
                                checked={isChecked(priv.id, "ownTeamOnly")}
                                onChange={() => togglePermission(priv.id, "ownTeamOnly")}
                                className="size-4 accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                              />
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};