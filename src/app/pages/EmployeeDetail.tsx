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
import { Edit, Save, Plus, Trash2, Eye, Lock, Calendar, FileText, Briefcase, Clock, UserX, User, MapPin, Upload } from 'lucide-react';
import { useParams } from 'react-router';
import { API_URL, employeeAPI, scheduleAPI, locationAPI, departmentAPI } from '../services/api';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import moment from 'moment';

const documentTypes = ['CNIC', 'Contract', 'Degree', 'Experience Letter', 'Other'];
const separationTypes = ['Resignation', 'Termination', 'End of Contract', 'Retirement'];
const separationReasons = ['Better Opportunity', 'Personal Reasons', 'Performance', 'Misconduct', 'Other'];
// ── Mock data / constants ────────────────────────────────────────────────
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
  const [privileges, setPrivileges] = useState<string[]>(employee?.privileges || []);
  const [separation, setSeparation] = useState<any>(null); // null = not separated
  

  
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

    // Documents list (from API or mock)
    const [documents, setDocuments] = useState<any[]>([]);
    useEffect(() => {
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
            phone: emp.phone || '',
            username: emp.username || '',
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
            annualLeaves: emp.payroll?.annualLeaves || 0,
          });
  
          // Populate schedule from emp.Schedule
          if (emp?.Schedule) {
            const scheduleList = Array.isArray(emp.Schedule) ? emp.Schedule : [emp.Schedule];
            const activeSched = scheduleList.find((s: any) => s && !s.deletedAt) || scheduleList[0];
            if (activeSched) {
              let daysArr = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
              if (Array.isArray(activeSched.days) && activeSched.days.length > 0) {
                const dayMap: Record<string, string> = {
                  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
                  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun'
                };
                daysArr = activeSched.days.map((d: any) => {
                  const key = String(d).trim().toLowerCase();
                  return dayMap[key] || String(d).trim();
                });
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

              setSchedule({
                id: activeSched.id,
                workingDays: daysArr,
                shiftStart: activeSched.startTime || '09:00',
                shiftEnd: activeSched.endTime || '18:00',
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

          setLoading(false);
        } catch (err) {
          toast.error('Failed to load employee details');
          setLoading(false);
        }
      };

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
    }, [id]);
 

  const handleAddIncrement = async () => {
    try {
      await employeeAPI.addIncrement(id, {
        type: incrementType,
        value: incrementValue,
        effectiveDate: incrementDate
      });
  
      toast.success("Increment applied");
      setShowIncrementModal(false);
    } catch {
      toast.error("Failed to apply increment");
    }
  };
  

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleSavePersonal = () => {
    // API call: update personal info
    toast.success('Personal information updated');
    setIsEditingPersonal(false);
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

  const handleSavePayroll = () => {
    toast.success('Payroll updated');
    setIsEditingPayroll(false);
  };

  const handleSaveSchedule = async () => {
    try {
      if (schedule.id) {
        await scheduleAPI.updateSchedule(schedule.id, {
          startTime: schedule.shiftStart,
          endTime: schedule.shiftEnd,
          earlyInMinutes: schedule.earlyInMargin,
          earlyOutMinutes: schedule.earlyOutMargin,
          overtimeAllowed: schedule.overtimeAllowed,
          overtimeMinutes: schedule.overtimeMinutes,
          allowHalfDay: schedule.allowHalfDay,
          halfDayMinutes: schedule.allowHalfDay ? schedule.halfDayMinutes : null,
        });
      }
      toast.success('Schedule updated');
      setIsEditingSchedule(false);
    } catch (err) {
      toast.error('Failed to update schedule');
    }
  };

  const handleSavePrivileges = () => {
    toast.success('Privileges updated');
    setIsEditingPrivileges(false);
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
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {employee.firstName} {employee.lastName}
        </h1>
        {/* <Badge variant="outline" className="text-lg px-4 py-1">
          {employee.role?.toUpperCase() || 'EMPLOYEE'}
        </Badge> */}
      </div>
      <Card className="border-l-4 border-l-indigo-600 shadow-md">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              {/* Photo */}
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center overflow-hidden border-4 border-white shadow">
                {employee.profileImage ? (
                  <img src={API_URL+employee.profileImage} alt="Employee" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-16 h-16 text-indigo-500" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-4">
                  <h1 className="text-3xl font-bold">
                    {employee.firstName} {employee.lastName}
                  </h1>
                  <Badge variant="outline" className="text-base px-4 py-1">
                    {employee.designation || 'Employee'}
                  </Badge>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gray-500" />
                    <span>Hired: {moment(employee.hiringDate).format('DD MMM YYYY')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>Status: {employee.employmentStatus || 'Active'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    
                    <span>{employee?.company?.name || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 self-start mt-4 md:mt-0">
                {/* <Button variant="outline">
                  <Edit className="mr-2 h-4 w-4" /> Edit Profile
                </Button> */}
              </div>
            </div>
          </CardContent>
        </Card>
      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-8 gap-2">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="job">Job</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="password-separation">Password / Separation</TabsTrigger>
          <TabsTrigger value="privileges">Privileges</TabsTrigger>
        </TabsList>

        {/* ── PERSONAL INFORMATION ──────────────────────────────────────── */}
        <TabsContent value="personal">
            <Card className="shadow-sm">
              <CardHeader className="flex-row justify-between items-center">
                <CardTitle>Personal Information</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setEditPersonal(!editPersonal)}>
                  {editPersonal ? 'Cancel' : <><Edit className="mr-2 h-4 w-4" /> Edit</>}
                </Button>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <Label>First Name</Label>
                  <Input value={personal.firstName} disabled={!editPersonal} onChange={e => setPersonal({ ...personal, firstName: e.target.value })} />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input value={personal.lastName} disabled={!editPersonal} onChange={e => setPersonal({ ...personal, lastName: e.target.value })} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={personal.email} disabled={!editPersonal} onChange={e => setPersonal({ ...personal, email: e.target.value })} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={personal.phone} disabled={!editPersonal} onChange={e => setPersonal({ ...personal, phone: e.target.value })} />
                </div>
                <div>
                  <Label>Username</Label>
                  <Input value={personal.username} disabled={!editPersonal} onChange={e => setPersonal({ ...personal, username: e.target.value })} />
                </div>
                {editPersonal && (
                  <div className="col-span-full flex justify-end">
                    <Button onClick={handleSavePersonal}>
                      <Save className="mr-2 h-4 w-4" /> Save Changes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        {/* ── JOB INFORMATION ───────────────────────────────────────────── */}
        <TabsContent value="job">
            <Card className="shadow-sm">
              <CardHeader className="flex-row justify-between items-center">
                <CardTitle>Job Information</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setEditJob(!editJob)}>
                  {editJob ? 'Cancel' : <><Edit className="mr-2 h-4 w-4" /> Edit</>}
                </Button>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <Label>Location</Label>
                  {editJob ? (
                    <SearchableSelect
                      className="w-full mt-1"
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
                    <Input value={job.location || 'N/A'} disabled />
                  )}
                </div>

                <div>
                  <Label>Department</Label>
                  {editJob ? (
                    <SearchableSelect
                      className="w-full mt-1"
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
                    <Input value={job.department || 'N/A'} disabled />
                  )}
                </div>

                <div>
                  <Label>Supervisor</Label>
                  {editJob ? (
                    <SearchableSelect
                      className="w-full mt-1"
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
                    <Input value={job.supervisor || 'N/A'} disabled />
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
              <CardHeader className="flex-row justify-between items-center">
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Schedule Information</CardTitle>
              {!isEditingSchedule ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditingSchedule(true)}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditingSchedule(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveSchedule}>
                    <Save className="mr-2 h-4 w-4" /> Save
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Working Days</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {schedule.workingDays.map((day) => (
                      <Badge key={day} variant="secondary">{day}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Shift Start</Label>
                  <Input type="time" value={schedule.shiftStart} disabled={!isEditingSchedule} onChange={(e) => setSchedule({ ...schedule, shiftStart: e.target.value })} />
                </div>
                <div>
                  <Label>Shift End</Label>
                  <Input type="time" value={schedule.shiftEnd} disabled={!isEditingSchedule} onChange={(e) => setSchedule({ ...schedule, shiftEnd: e.target.value })} />
                </div>
                <div>
                  <Label>Early In Margin (minutes)</Label>
                  <Input type="number" value={schedule.earlyInMargin} disabled={!isEditingSchedule} onChange={(e) => setSchedule({ ...schedule, earlyInMargin: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Early Out Margin (minutes)</Label>
                  <Input type="number" value={schedule.earlyOutMargin} disabled={!isEditingSchedule} onChange={(e) => setSchedule({ ...schedule, earlyOutMargin: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Overtime Allowed (minutes)</Label>
                  <Input type="number" value={schedule.overtimeMinutes} disabled={!isEditingSchedule} onChange={(e) => setSchedule({ ...schedule, overtimeMinutes: Number(e.target.value) })} />
                </div>

                {/* Half Day Settings */}
                <div>
                  <Label>Half Day Allowed</Label>
                  {isEditingSchedule ? (
                    <Select
                      value={schedule.allowHalfDay ? "true" : "false"}
                      onValueChange={(val) => setSchedule({ ...schedule, allowHalfDay: val === "true" })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Allowed (Yes)</SelectItem>
                        <SelectItem value="false">Disabled (No)</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="mt-2">
                      <Badge variant={schedule.allowHalfDay ? "default" : "outline"} className={schedule.allowHalfDay ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "text-gray-500"}>
                        {schedule.allowHalfDay ? "Allowed" : "Disabled"}
                      </Badge>
                    </div>
                  )}
                </div>

                <div>
                  <Label>Half Day Margin (minutes)</Label>
                  <Input
                    type="number"
                    value={schedule.halfDayMinutes}
                    disabled={!isEditingSchedule || !schedule.allowHalfDay}
                    onChange={(e) => setSchedule({ ...schedule, halfDayMinutes: Number(e.target.value) })}
                    placeholder="240"
                  />
                  {!isEditingSchedule && schedule.allowHalfDay && (
                    <p className="text-xs text-gray-500 mt-1 font-mono">
                      {Math.floor(schedule.halfDayMinutes / 60)}h {schedule.halfDayMinutes % 60}m shift threshold
                    </p>
                  )}
                </div>

                <div>
                  <Label>Number of Breaks</Label>
                  <Input type="number" value={schedule.numBreaks} disabled={!isEditingSchedule} onChange={(e) => setSchedule({ ...schedule, numBreaks: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Break Duration (minutes)</Label>
                  <Input type="number" value={schedule.breakMinutes} disabled={!isEditingSchedule} onChange={(e) => setSchedule({ ...schedule, breakMinutes: Number(e.target.value) })} />
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {privileges.map((priv) => (
                  <div key={priv.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <span style={{textTansform:'uppercase'}}>{priv.privilege}</span>
                    {isEditingPrivileges ? (
                      <input
                        type="checkbox"
                        checked={privileges.includes(priv.id)}
                        onChange={() => {
                          setPrivileges(prev =>
                            prev.includes(priv.id)
                              ? prev.filter(p => p !== priv.id)
                              : [...prev, priv.id]
                          );
                        }}
                        className="size-5 accent-primary"
                      />
                      
                    ) :null
                    }
                    <Badge variant="default">Granted</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};