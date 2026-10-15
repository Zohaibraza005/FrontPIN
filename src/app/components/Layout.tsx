//@ts-nocheck
import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useTour } from '../contexts/TourContext';
import {
  LayoutDashboard,
  Clock,
  Calendar,
  FolderKanban,
  CheckSquare,
  FileText,
  Umbrella,
  Timer,
  Users,
  DollarSign,
  MapPin,
  UserPlus,
  TrendingUp,
  Package,
  BarChart3,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  HelpCircle,
  ChevronDown,
  Coffee, RefreshCw, Cog, ChevronRight,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from './ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Input } from './ui/input';
import { API_URL, attendanceAPI } from '../services/api';
import { locationAPI } from '../services/locationAPI';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { cn } from './ui/utils';

import { to12h } from "../utils/time";
// Ordered for leadership: overview first, then people, time, money, and company setup.
const menuItems = [
  { section: 'Overview', icon: LayoutDashboard, label: 'Dashboard', path: '/', roles: ['ADMIN', 'SUPERVISOR', 'USER'] },
  { section: 'Overview', icon: BarChart3, label: 'Reports', path: '/reports', roles: ['ADMIN', 'SUPERVISOR', 'USER'], module: 'REPORT' },
  {
    section: 'People',
    icon: Users,
    label: 'Employee',
    roles: ['ADMIN', 'SUPERVISOR', 'USER'],
    module: 'EMPLOYEE',
    children: [
      { label: 'All Employees', path: '/employees' },
      { label: 'Add Employee', path: '/employees/add', canCreateModule: 'EMPLOYEE' },
      { label: 'Roles', path: '/roles', roles: ['ADMIN'] },
    ],
  },
  { section: 'Time & Attendance', icon: Clock, label: 'Attendance', path: '/attendance', roles: ['ADMIN', 'SUPERVISOR', 'USER'], module: 'ATTENDANCE' },
  { section: 'Time & Attendance', icon: Calendar, label: 'Schedule', path: '/schedule', roles: ['ADMIN', 'SUPERVISOR', 'USER'], module: 'SCHEDULE' },
  { section: 'Time & Attendance', icon: Umbrella, label: 'Leave', path: '/leave', roles: ['ADMIN', 'SUPERVISOR', 'USER'], module: 'LEAVE' },
  { section: 'Time & Attendance', icon: Timer, label: 'Overtime', path: '/overtime', roles: ['ADMIN', 'SUPERVISOR', 'USER'], module: 'OVERTIME' },
  // { icon: FolderKanban, label: 'Projects', path: '/projects', roles: ['ADMIN', 'SUPERVISOR', 'USER'], module: 'PROJECT' },
  // { icon: CheckSquare, label: 'Tasks', path: '/tasks', roles: ['ADMIN', 'SUPERVISOR', 'USER'], module: 'TASK' },
  // { icon: FileText, label: 'Invoices', path: '/invoices', roles: ['ADMIN', 'SUPERVISOR', 'USER'], module: 'INVOICE' },
  { section: 'Finance', icon: DollarSign, label: 'Payroll', path: '/payroll', roles: ['ADMIN', 'SUPERVISOR', 'USER'], module: 'PAYROLL' },
  // { icon: UserPlus, label: 'Recruitment', path: '/jobs', roles: ['ADMIN'] },
  {
    section: 'Company',
    icon: Cog,
    label: 'Organization',
    roles: ['ADMIN', 'SUPERVISOR', 'USER'],
    module: 'ORGANIZATION',
    children: [
      { label: 'Settings', path: '/organization', roles: ['ADMIN'] },
      { label: 'Departments', path: '/departments' },
      { label: 'Locations', path: '/locations' },
      { label: 'Entities', path: '/entities' },
    ]
  },
  // { icon: Package, label: 'Assets', path: '/assets', roles: ['ADMIN'] },
];

// "/" must match exactly, otherwise every page would count as Dashboard
const pathMatches = (pathname: string, path?: string) =>
  !!path && (path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(path + '/'));

const navItemCls = (active: boolean) =>
  cn(
    "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all",
    active
      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 shadow-xs"
      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100"
  );

const NavIcon = ({ icon: Icon, active }: any) => (
  <span
    className={cn(
      "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
      active
        ? "bg-blue-600 text-white shadow-sm"
        : "bg-gray-100 text-gray-500 group-hover:bg-white group-hover:text-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:group-hover:bg-gray-800"
    )}
  >
    <Icon className="size-4" />
  </span>
);

const WithTip = ({ show, label, children }: any) =>
  show ? (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  ) : (
    children
  );

const getLocation = (): Promise<{ lat: number; lng: number }> => {
  return new Promise((resolve) => {
    if (!navigator?.geolocation) {
      resolve({ lat: 0, lng: 0 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.warn("Geolocation error or permission denied:", error);
        resolve({ lat: 0, lng: 0 });
      },
      { timeout: 5000, enableHighAccuracy: true }
    );
  });
};

interface CollapsibleSidebarItemProps {
  item: any;
  sidebarOpen: boolean;
  isActive: boolean;
  onNavigate: () => void;
}

const CollapsibleSidebarItem: React.FC<CollapsibleSidebarItemProps> = ({
  item,
  sidebarOpen,
  isActive,
  onNavigate,
}) => {
  const location = useLocation();
  const Icon = item.icon;
  const isChildActive = item.children?.some(
    (c: any) => location.pathname === c.path || (c.path && location.pathname.startsWith(c.path))
  );
  const [isOpen, setIsOpen] = useState(isChildActive);

  useEffect(() => {
    if (isChildActive) {
      setIsOpen(true);
    }
  }, [isChildActive]);

  const childList = (
    <div className="ml-[22px] mt-1 space-y-0.5 border-l border-gray-200 dark:border-gray-800 pl-3 pb-1">
      {item.children.map((child: any) => {
        const isExact = location.pathname === child.path;
        const hasMoreSpecificChild = item.children.some(
          (other: any) =>
            other.path !== child.path &&
            other.path.length > child.path.length &&
            (location.pathname === other.path || location.pathname.startsWith(other.path + "/"))
        );
        const childActive =
          isExact || (!hasMoreSpecificChild && location.pathname.startsWith(child.path + "/"));

        return (
          <Link
            key={child.path}
            to={child.path}
            className={cn(
              "relative flex items-center rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
              childActive
                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100"
            )}
            onClick={onNavigate}
          >
            {childActive && <span className="absolute -left-[13px] top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-blue-600" />}
            <span>{child.label}</span>
          </Link>
        );
      })}
    </div>
  );

  // Collapsed sidebar: show the children in a flyout menu
  if (!sidebarOpen) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={cn(navItemCls(isActive), "justify-center px-0")} title={item.label}>
            <NavIcon icon={Icon} active={isActive} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-48 rounded-xl">
          <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{item.label}</div>
          {item.children.map((child: any) => (
            <DropdownMenuItem key={child.path} asChild>
              <Link to={child.path} onClick={onNavigate} className="cursor-pointer">{child.label}</Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className={navItemCls(isActive)}>
        <NavIcon icon={Icon} active={isActive} />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown className={cn("size-4 opacity-60 transition-transform", isOpen ? "rotate-0" : "-rotate-90")} />
      </button>
      {isOpen && childList}
    </div>
  );
};

export const Layout: React.FC = () => {

  const { user, logout, isAuthenticated } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const { startTour } = useTour();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [endOfDaySummary, setEndOfDaySummary] = useState<string>('');
  const [summaryError, setSummaryError] = useState<string>('');

  // Location header state
  const getInitialHeaderLoc = () => {
    const stored = localStorage.getItem("selectedLocation") || localStorage.getItem("dashboard-selected-location") || "all";
    return stored.toLowerCase() === "all" ? "all" : stored;
  };
  const [selectedHeaderLocation, setSelectedHeaderLocation] = useState(getInitialHeaderLoc);
  const [headerLocations, setHeaderLocations] = useState<any[]>([]);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await locationAPI.getLocations();
        setHeaderLocations(res?.data || res || []);
      } catch (err) {
        console.error("Failed to fetch locations in header:", err);
      }
    };
    if (user?.role === 'ADMIN' || user?.role === 'SUPERVISOR') {
      fetchLocations();
    }
  }, [user?.role]);

  useEffect(() => {
    const handleLocationEvent = (e: any) => {
      const val = e.detail || localStorage.getItem("selectedLocation") || "all";
      const normalized = val.toLowerCase() === "all" ? "all" : val;
      setSelectedHeaderLocation(normalized);
    };
    window.addEventListener("location-changed", handleLocationEvent);
    return () => {
      window.removeEventListener("location-changed", handleLocationEvent);
    };
  }, []);

  const handleHeaderLocationChange = (val: string) => {
    const normalized = val.toLowerCase() === "all" ? "all" : val;
    setSelectedHeaderLocation(normalized);
    localStorage.setItem("selectedLocation", normalized);
    localStorage.setItem("dashboard-selected-location", normalized);
    window.dispatchEvent(new CustomEvent("location-changed", { detail: normalized }));
  };


  // Attendance states
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<{ type: 'activity' | 'task'; name: string } | null>(null);

  const [startTime, setStartTime] = useState<number | null>(null);
  const [breakTotal, setBreakTotal] = useState(0);
  const [breakStart, setBreakStart] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'clockin' | 'change' | 'clockout' | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinVerified, setPinVerified] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'activity' | 'task'>('activity');
  const [selectedItem, setSelectedItem] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activityStartTime, setActivityStartTime] = useState<number | null>(null);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [breakStartTime, setBreakStartTime] = useState<number | null>(null);
  const [pinError, setPinError] = useState<string>('');
  const pinInputRef = React.useRef<HTMLInputElement>(null);
  const [clockedOutInfo, setClockedOutInfo] = useState<{
    checkInTime: string;
    checkOutTime: string;
  } | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const activities = ['Development', 'Meeting', 'Research'];

  // 🔹 Enhanced Break State
  const [allowedBreakCount, setAllowedBreakCount] = useState<number>(0);
  const [breakDurations, setBreakDurations] = useState<number[]>([]);
  const [totalAllowedBreakMinutes, setTotalAllowedBreakMinutes] = useState<number>(0);
  const [completedBreakCount, setCompletedBreakCount] = useState<number>(0);
  const [totalUsedBreakMinutes, setTotalUsedBreakMinutes] = useState<number>(0);
  const [currentBreakNumber, setCurrentBreakNumber] = useState<number>(1);
  const [completedBreaks, setCompletedBreaks] = useState<any[]>([]);
  const [activeBreakSeconds, setActiveBreakSeconds] = useState<number>(0);
  const [showBreakConfirmModal, setShowBreakConfirmModal] = useState<boolean>(false);
  const [breakConfirmData, setBreakConfirmData] = useState({
    allowedCount: 0,
    perBreakText: '',
    usedMinutes: 0,
    previousBreakText: '',
  });
  const updateBreakData = (res: any) => {
    if (!res) return;
    if (typeof res.allowedBreakCount === 'number') setAllowedBreakCount(res.allowedBreakCount);
    if (Array.isArray(res.breakDurations)) setBreakDurations(res.breakDurations);
    if (typeof res.totalAllowedBreakMinutes === 'number') setTotalAllowedBreakMinutes(res.totalAllowedBreakMinutes);
    if (typeof res.completedBreakCount === 'number') setCompletedBreakCount(res.completedBreakCount);
    if (typeof res.totalUsedBreakMinutes === 'number') setTotalUsedBreakMinutes(res.totalUsedBreakMinutes);
    if (typeof res.currentBreakNumber === 'number') setCurrentBreakNumber(res.currentBreakNumber);
    if (Array.isArray(res.completedBreaks)) setCompletedBreaks(res.completedBreaks);
  };
  useEffect(() => {
    if (drawerOpen && selectedTab === "task") {
      loadTasks();
    }
  }, [drawerOpen, selectedTab]);

  const loadTasks = async () => {
    try {
      const res = await attendanceAPI.getAssignableTasks();
      setTasks(res.data || []);
    } catch (err) {
      console.log("Failed to load tasks");
    }
  };

  useEffect(() => {
    loadTodayStatus();

    const handleAttendanceUpdate = () => {
      loadTodayStatus();
    };

    window.addEventListener("attendance-updated", handleAttendanceUpdate);
    const pollInterval = setInterval(() => {
      loadTodayStatus();
    }, 15000);

    return () => {
      window.removeEventListener("attendance-updated", handleAttendanceUpdate);
      clearInterval(pollInterval);
    };
  }, [user]);

  const [isTodayOff, setIsTodayOff] = useState(false);
  const [realTime, setRealTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setRealTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadTodayStatus = async () => {
    if (user?.role === 'ADMIN') return;
    try {
      const res = await attendanceAPI.getTodayStatus();
      updateBreakData(res);

      setIsTodayOff(Boolean(res.isOffDay));

      if (res.clockedOut) {
        setIsClockedIn(false);
        setClockedOutInfo({
          checkInTime: res.checkInTime,
          checkOutTime: res.checkOutTime,
        });
        setElapsedTime(0);
        setActivityStartTime(null);
        return;
      }

      if (res.clockedIn) {
        setIsClockedIn(true);
        setClockedOutInfo(null);

        if (res.currentActivity) {
          setCurrentActivity({
            type: res.currentActivity.type,
            name: res.currentActivity.title,
          });
        } else {
          setCurrentActivity({
            type: "activity",
            name: "General Work",
          });
        }

        const effectiveStart = res.currentActivity?.startTime || res.checkInTime;
        const startMs = effectiveStart ? new Date(effectiveStart).getTime() : null;
        if (startMs && !isNaN(startMs)) {
          setActivityStartTime(startMs);

          const now = Date.now();
          let totalBreak = res.breakSeconds || 0;
          if (res.isOnBreak && res.breakStartTime) {
            totalBreak += Math.floor((now - new Date(res.breakStartTime).getTime()) / 1000);
          }
          const initialElapsed = Math.max(0, Math.floor((now - startMs) / 1000) - totalBreak);
          setElapsedTime(initialElapsed);
        }

        setBreakSeconds(res.breakSeconds || 0);

        if (res.isOnBreak && res.breakStartTime) {
          setIsOnBreak(true);
          setBreakStartTime(
            new Date(res.breakStartTime).getTime()
          );
        } else {
          setIsOnBreak(false);
          setBreakStartTime(null);
        }
      } else {
        setIsClockedIn(false);
        setElapsedTime(0);
        setActivityStartTime(null);
      }
    } catch (err) {
      console.log("No active attendance");
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!isClockedIn || !activityStartTime) return;

    const tick = () => {
      const now = Date.now();

      let totalBreak = breakSeconds;

      if (isOnBreak && breakStartTime) {
        totalBreak += Math.floor((now - breakStartTime) / 1000);
      }

      const totalWorked =
        Math.floor((now - activityStartTime) / 1000) - totalBreak;

      setElapsedTime(Math.max(totalWorked, 0));
    };

    tick();
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [
    isClockedIn,
    activityStartTime,
    breakSeconds,
    breakStartTime,
    isOnBreak,
  ]);

  // Real-time timer for current active break
  useEffect(() => {
    if (!isOnBreak || !breakStartTime) {
      setActiveBreakSeconds(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - breakStartTime) / 1000));
      setActiveBreakSeconds(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [isOnBreak, breakStartTime]);

  const calculateElapsed = () => {
    if (!startTime) return 0;

    const now = Date.now();
    let totalBreak = breakTotal;

    if (isOnBreak && breakStart) {
      totalBreak += Math.floor((now - breakStart) / 1000);
    }

    return Math.max(
      0,
      Math.floor((now - startTime) / 1000) - totalBreak
    );
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleClockIn = async () => {
    try {
      if (isTodayOff) {
        toast.error("This is an Off Day. There is no schedule for this day.");
        return;
      }

      const itemToUse = selectedItem || "General Work";
      const tabToUse = selectedTab || "activity";

      const location = await getLocation();

      console.log(location);
      const payload = {
        lat: location.lat || 0,
        lng: location.lng || 0,
        activityType: tabToUse,
        activityName: tabToUse === "activity" ? itemToUse : undefined,
        taskId: tabToUse === "task" && itemToUse ? Number(itemToUse) : null,
        method: 'PIN'
      };

      const res = await attendanceAPI.clockIn(payload);

      setIsClockedIn(true);

      setCurrentActivity({
        type: res.activityType || "activity",
        name: res.activityTitle || "General Work"
      });

      const effectiveStartTime = res.activityStartTime || res.checkInTime || new Date();
      const activityStart = new Date(effectiveStartTime).getTime();

      setActivityStartTime(activityStart);
      setBreakSeconds(0);
      setBreakStartTime(null);
      setIsOnBreak(false);
      setElapsedTime(0);

      setDrawerOpen(false);
      window.dispatchEvent(new CustomEvent('attendance-updated'));
      if (window?.tracking) {
        await window.tracking.start(res.id)
      }
    } catch (err: any) {
      console.log(err);
      const errMsg = err?.response?.data?.message || err?.data?.message || err?.message || "Clock In Failed";
      toast.error(errMsg);
    }
  };

  // const handleClockIn = () => {
  //   if (!selectedItem) return;
  //   setCurrentActivity({ type: selectedTab, name: selectedItem });
  //   setStartTime(Date.now());
  //   setBreakTotal(0);
  //   setBreakStart(null);
  //   setIsOnBreak(false);
  //   setIsClockedIn(true);
  //   setElapsedTime(0);
  //   setDrawerOpen(false);
  //   setSelectedItem('');
  // };

  const handleChangeActivity = async () => {
    try {
      if (!selectedItem) return;

      const res = await attendanceAPI.changeActivity({
        activityType: selectedTab,
        activityName:
          selectedTab === "activity" ? selectedItem : undefined,
        taskId: selectedTab === "task" ? Number(selectedItem) : null,
      });

      const activityStart = new Date(res.startTime).getTime();

      setCurrentActivity({
        type: res.type,
        name: res.title
      });

      setActivityStartTime(activityStart);
      setBreakSeconds(0);
      setBreakStartTime(null);
      setIsOnBreak(false);
      setElapsedTime(0);

      setDrawerOpen(false);
    } catch (err: any) {
      alert(err.message || "Change failed");
    }
  };



  const startBreakExecution = async () => {
    try {
      const res = await attendanceAPI.startBreak();
      const startTimeMs = Date.now();
      setBreakStartTime(startTimeMs);
      setIsOnBreak(true);
      updateBreakData(res);
      setShowBreakConfirmModal(false);
      window.dispatchEvent(new CustomEvent('attendance-updated'));
      toast.success(`Break ${res.currentBreakNumber || currentBreakNumber} started`);
    } catch (err: any) {
      toast.error(err.message || "Failed to start break");
    }
  };

  const handleBreak = async () => {
    try {
      if (isOnBreak) {
        const res = await attendanceAPI.endBreak();
        const now = Date.now();

        if (breakStartTime) {
          setBreakSeconds((prev) =>
            prev + Math.floor((now - breakStartTime) / 1000)
          );
        }

        setBreakStartTime(null);
        setIsOnBreak(false);
        setActiveBreakSeconds(0);
        updateBreakData(res);
        window.dispatchEvent(new CustomEvent('attendance-updated'));
        toast.success("Break ended");
      } else {
        const usedMins = totalUsedBreakMinutes;
        const allowedMins = totalAllowedBreakMinutes;
        const allowedCount = allowedBreakCount;

        if (
          (allowedMins > 0 && usedMins >= allowedMins) ||
          (allowedCount > 0 && completedBreakCount >= allowedCount)
        ) {
          let perBreakText = "";

          if (breakDurations.length > 0) {
            const allSame = breakDurations.every(
              (d) => d === breakDurations[0]
            );

            if (allSame) {
              perBreakText = `${breakDurations[0]} minutes each`;
            } else {
              perBreakText = `${breakDurations.join(", ")} minutes`;
            }
          }

          let previousBreakText = "";

          if (completedBreakCount === 1) {
            previousBreakText = "in your first break";
          } else if (completedBreakCount > 1) {
            previousBreakText = `in your previous ${completedBreakCount} breaks`;
          } else {
            previousBreakText = "so far";
          }

          setBreakConfirmData({
            allowedCount,
            perBreakText,
            usedMinutes: usedMins,
            previousBreakText,
          });

          setShowBreakConfirmModal(true);
          return;
        }

        await startBreakExecution();
      }
    } catch (err: any) {
      toast.error(err.message || "Break failed");
    }
  };



  // Focus hidden input when drawer opens / mode changes
  useEffect(() => {
    if (drawerOpen && drawerMode === 'clockin' && !pinVerified) {
      setTimeout(() => {
        pinInputRef.current?.focus();
      }, 150);
    }
  }, [drawerOpen, drawerMode, pinVerified]);

  const handlePinClick = (digit: string) => {
    if (pinInput.length >= 4) return;
    setPinInput(prev => prev + digit);
    setPinError('');
  };

  const handlePinBackspace = () => {
    setPinInput(prev => prev.slice(0, -1));
    setPinError('');
  };

  // Optional: improve error handling
  const handleVerifyPin = async () => {
    if (pinInput.length !== 4) {
      setPinError("Please enter 4 digits");
      return;
    }

    try {
      const res = await attendanceAPI.verifyPin(pinInput);

      if (res.success) {
        setPinVerified(true);
        setPinError('');
        setPinInput(''); // success pe clear (optional but secure)
        // focus ko hatana nahi hai, bas verified true hone pe UI change ho jayega
      } else {
        throw new Error("Invalid PIN");
      }
    } catch (err: any) {
      setPinError(err.message || "Invalid PIN. Please try again.");
      setPinInput('');           // ← galat hone pe clear karo

      // Important: shake hone ke baad focus wapas laao
      setTimeout(() => {
        pinInputRef.current?.focus();
        // Optional: keyboard ko wapas kholne ke liye mobile pe
        if (pinInputRef.current) {
          pinInputRef.current.select(); // select karke cursor dikhaye
        }
      }, 300); // shake animation ke baad focus (300ms delay acha lagta hai)
    }
  };
  const clockOut = async () => {
    // Optional: make summary required
    if (!endOfDaySummary.trim()) {
      setSummaryError("Please write a brief summary of your day");
      return;
    }

    try {
      const location = await getLocation();

      // Send summary along with clock-out
      await attendanceAPI.clockOut({
        lat: location.lat,
        lng: location.lng,
        summary: endOfDaySummary.trim(),   // ← new field
      });

      // Reset states
      setIsClockedIn(false);
      setIsOnBreak(false);
      setCurrentActivity(null);
      setStartTime(null);
      setBreakTotal(0);
      setBreakStart(null);
      setElapsedTime(0);
      setEndOfDaySummary('');           // clear summary
      setSummaryError('');
      setDrawerOpen(false);
      loadTodayStatus();
      window.dispatchEvent(new CustomEvent('attendance-updated'));
      if (window.tracking) {
        await window.tracking.stop()
      }
      toast.success("Clocked out successfully! Have a great evening!");
    } catch (err: any) {
      console.log(err)
      toast.error(err.message || "Clock Out failed");
    }
  };

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  if (!isAuthenticated || !user) {
    return null;
  }

  const filteredMenuItems = menuItems.filter(item => {
    // 1. Check if the user's role is allowed for this item
    if (item.roles && !item.roles.includes(user.role)) {
      return false;
    }

    // 2. ADMIN role bypasses privilege restrictions
    if (user.role === 'ADMIN') {
      return true;
    }

    // 3. Check specific module privileges if defined
    if (item.module) {
      const privileges = user.privileges || [];
      const priv = privileges.find((p: any) => p.module === item.module);
      if (priv) {
        return Boolean(priv.canRead);
      }
      
      // Default fallback when privilege record is missing in DB/session
      const defaultVisibleModules = ['ATTENDANCE', 'LEAVE', 'OVERTIME', 'SCHEDULE'];
      return defaultVisibleModules.includes(item.module);
    }

    return true;
  }).map(item => {
    if (item.children) {
      const filteredChildren = item.children.filter((child: any) => {
        if (user.role === 'ADMIN') return true;
        if (child.roles && !child.roles.includes(user.role)) return false;
        if (child.canCreateModule) {
          const priv = (user.privileges || []).find((p: any) => p.module === child.canCreateModule);
          if (priv && !priv.canCreate) return false;
        }
        return true;
      });
      return { ...item, children: filteredChildren };
    }
    return item;
  });

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-white dark:bg-gray-950 border-r border-gray-200/80 dark:border-gray-800 transition-all duration-300",
          sidebarOpen ? "w-64" : "w-20",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0"
        )}
      >
        <TooltipProvider delayDuration={150}>
        <div className="flex h-full flex-col">
          {/* Brand */}
          <div className={cn("flex h-16 items-center border-b border-gray-200/80 dark:border-gray-800 shrink-0", sidebarOpen ? "justify-between px-5" : "justify-center px-2")}>
            <Link to="/" className="flex items-center gap-2.5 min-w-0" onClick={() => setMobileMenuOpen(false)}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-sm">
                HP
              </span>
              {sidebarOpen && (
                <span className="min-w-0 leading-tight">
                  <span className="block text-base font-bold tracking-tight text-gray-900 dark:text-gray-100">HR Pro</span>
                  <span className="block text-[11px] font-medium text-gray-500 dark:text-gray-400">Workforce management</span>
                </span>
              )}
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full px-3 py-3">
              <nav className="min-h-[200px]">
                {filteredMenuItems.map((item, idx) => {
                  const isActive =
                    pathMatches(location.pathname, item.path) ||
                    Boolean(item.children?.some((child: any) => pathMatches(location.pathname, child.path)));
                  const showSection = item.section && item.section !== filteredMenuItems[idx - 1]?.section;

                  const sectionHeader = showSection ? (
                    sidebarOpen ? (
                      <div className={cn("px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500", idx === 0 ? "pt-1" : "pt-4")}>
                        {item.section}
                      </div>
                    ) : (
                      idx !== 0 && <div className="mx-3 my-3 border-t border-gray-200 dark:border-gray-800" />
                    )
                  ) : null;

                  // Has children → render as collapsible
                  if (item.children && item.children.length > 0) {
                    return (
                      <React.Fragment key={item.label}>
                        {sectionHeader}
                        <div className="mb-0.5">
                          <CollapsibleSidebarItem
                            item={item}
                            sidebarOpen={sidebarOpen}
                            isActive={isActive}
                            onNavigate={() => setMobileMenuOpen(false)}
                          />
                        </div>
                      </React.Fragment>
                    );
                  }

                  // Normal menu item (no children)
                  return (
                    <React.Fragment key={item.path}>
                      {sectionHeader}
                      <WithTip show={!sidebarOpen} label={item.label}>
                        <Link
                          to={item.path}
                          className={cn(navItemCls(isActive), "mb-0.5", !sidebarOpen && "justify-center px-0")}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {isActive && sidebarOpen && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-blue-600" />}
                          <NavIcon icon={item.icon} active={isActive} />
                          {sidebarOpen && <span className="flex-1">{item.label}</span>}
                        </Link>
                      </WithTip>
                    </React.Fragment>
                  );
                })}
              </nav>

              {/* Extra padding at bottom so last item isn't hidden under the footer */}
              <div className="h-6" />
            </ScrollArea>
          </div>

          {/* Footer: signed-in user + logout */}
          <div className="border-t border-gray-200/80 dark:border-gray-800 p-3 shrink-0 bg-white dark:bg-gray-950">
            {sidebarOpen ? (
              <div className="flex items-center gap-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 px-2.5 py-2">
                {user.profileImage ? (
                  <img
                    src={user.profileImage.startsWith("http") ? user.profileImage : `${API_URL}${user.profileImage}`}
                    alt={user.firstName}
                    className="size-8 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-xs font-semibold text-white">
                    {(user.firstName?.charAt(0) || 'U').toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{user.firstName} {user.lastName || ''}</p>
                  <p className="truncate text-[11px] font-medium text-gray-500 dark:text-gray-400 capitalize">{String(user.role || 'user').toLowerCase()}</p>
                </div>
                <WithTip show label="Logout">
                  <button
                    onClick={logout}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 transition-colors"
                  >
                    <LogOut className="size-4" />
                  </button>
                </WithTip>
              </div>
            ) : (
              <WithTip show label="Logout">
                <button
                  onClick={logout}
                  className="mx-auto flex size-10 items-center justify-center rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <LogOut className="size-4" />
                </button>
              </WithTip>
            )}
          </div>
        </div>
        </TooltipProvider>
      </aside>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div
        className={cn(
          "flex-1 min-w-0 flex flex-col transition-all duration-300",
          sidebarOpen ? "lg:ml-64" : "lg:ml-20"
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start hidden lg:flex"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="size-4" />
              {/* {sidebarOpen && <span className="ml-2"></span>} */}
            </Button>
            <h2 className="text-xl font-semibold text-gray-900">
              {(() => {
                const match = menuItems.find(item =>
                  pathMatches(location.pathname, item.path) ||
                  item.children?.some((child: any) => pathMatches(location.pathname, child.path))
                );
                return match?.label || "Dashboard";
              })()}
            </h2>
          </div>

          <div className="flex items-center gap-3">

            {user?.role !== 'ADMIN' && (
              isClockedIn ? (
                <TooltipProvider>
                  <div className="flex items-center gap-2 sm:gap-2.5 bg-gray-50 border border-gray-200/80 rounded-xl px-2.5 py-1.5 shadow-xs flex-nowrap">
                    {/* Actions Group */}
                    <div className="flex items-center gap-1">
                      {/* Break / Resume Button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className={`h-8 w-8 transition-colors rounded-lg ${isOnBreak
                              ? 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200'
                              : 'hover:bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            onClick={handleBreak}
                          >
                            <Coffee className="h-4.5 w-4.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs p-3 space-y-1.5 max-w-xs">
                          <div className="font-bold text-sm text-gray-900 border-b pb-1 flex items-center justify-between gap-2">
                            <span>Break Status</span>
                            <span className="text-xs font-normal text-gray-500">
                              {allowedBreakCount > 0 ? `${allowedBreakCount} allowed (${totalAllowedBreakMinutes}m total)` : '0 allowed'}
                            </span>
                          </div>
                          {isOnBreak ? (
                            <div className="text-amber-700 font-semibold">
                              Currently taking Break {currentBreakNumber}{allowedBreakCount > 0 ? ` of ${allowedBreakCount}` : ''}
                            </div>
                          ) : (
                            <div className="text-gray-600 font-medium">
                              Next break: Break {currentBreakNumber}{allowedBreakCount > 0 ? ` of ${allowedBreakCount}` : ''}
                            </div>
                          )}
                          <div className="text-gray-600 text-[11px]">
                            Total Used Break Time: <span className="font-semibold">{totalUsedBreakMinutes} mins</span>
                          </div>
                          {completedBreaks.length > 0 && (
                            <div className="pt-1 border-t space-y-1 text-[11px]">
                              <div className="font-semibold text-gray-700">Completed Breaks:</div>
                              {completedBreaks.map((b: any) => (
                                <div key={b.breakNumber} className="flex justify-between text-gray-600">
                                  <span>Break #{b.breakNumber}</span>
                                  <span className="font-mono">{b.durationMinutes} min</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </TooltipContent>
                      </Tooltip>

                      {/* Change Activity */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            disabled={isOnBreak}
                            size="icon"
                            className="h-8 w-8 hover:bg-indigo-50 text-indigo-600 border-indigo-200 rounded-lg"
                            onClick={() => {
                              setDrawerMode('change');
                              setPinVerified(true);
                              setSelectedTab('activity');
                              setSelectedItem('');
                              setDrawerOpen(true);
                            }}
                          >
                            <RefreshCw className="h-4.5 w-4.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Change Activity / Task</TooltipContent>
                      </Tooltip>

                      {/* Clock Out */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            disabled={isOnBreak}
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 rounded-lg"
                            onClick={() => {
                              setDrawerMode('clockout');
                              setPinVerified(true);
                              setDrawerOpen(true);
                            }}
                          >
                            <LogOut className="h-4.5 w-4.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Clock Out</TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Vertical Divider */}
                    <div className="h-5 w-px bg-gray-200 mx-0.5" />

                    {/* Timer & Status Group */}
                    <div className="flex items-center gap-2 flex-nowrap">
                      {/* Time Counter */}
                      <div className="text-sm font-semibold font-mono text-gray-900 tracking-wider whitespace-nowrap">
                        {formatTime(elapsedTime)}
                      </div>

                      {/* Status Badge */}
                      {isOnBreak ? (
                        <div className="flex items-center gap-1.5 flex-nowrap">
                          <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-900 rounded-md border border-amber-200 flex items-center gap-1 whitespace-nowrap">
                            <Coffee className="w-3 h-3 text-amber-700 animate-pulse" />
                            <span className="hidden sm:inline">On Break</span>
                          </span>
                          <span className="font-mono text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-250 whitespace-nowrap">
                            {formatTime(activeBreakSeconds)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 flex-nowrap">
                          <span className="px-2 py-0.5 text-[10px] font-medium bg-green-100 text-green-800 rounded-md border border-green-200 flex items-center gap-1 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                            <span>Working</span>
                          </span>
                          {totalUsedBreakMinutes > 0 && (
                            <span className="text-[10px] text-gray-400 font-medium hidden md:inline whitespace-nowrap">
                              ({totalUsedBreakMinutes}m break)
                            </span>
                          )}
                        </div>
                      )}

                      {/* Current Activity */}
                      {currentActivity && (
                        <div className="hidden lg:flex items-center gap-1 text-[10px] text-gray-400 max-w-[120px] whitespace-nowrap" title={currentActivity.name}>
                          <span className="w-1 h-1 rounded-full bg-gray-300" />
                          <span className="truncate">{currentActivity.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </TooltipProvider>
              ) : clockedOutInfo ? (
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border rounded-lg">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-green-600">
                      In:{" "}
                    </span>
                    {to12h(clockedOutInfo.checkInTime)}
                  </div>

                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-red-600">
                      Out:{" "}
                    </span>
                    {to12h(clockedOutInfo.checkOutTime)}
                  </div>

                </div>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white gap-1.5 px-4"
                        onClick={() => {
                          setDrawerMode('clockin');
                          setPinVerified(false);
                          setPinInput('');
                          setSelectedTab('activity');
                          setSelectedItem('');
                          setDrawerOpen(true);
                        }}
                      >
                        <Clock className="h-4 w-4" />
                        Clock In
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Start your workday</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            )}

            {/* Location Selector */}
            {(user?.role === 'ADMIN' || user?.role === 'SUPERVISOR') && (
              <Select
                value={selectedHeaderLocation}
                onValueChange={handleHeaderLocationChange}
              >
                <SelectTrigger className="w-[150px] sm:w-[180px] bg-white text-black border-gray-300">
                  <SelectValue placeholder="Select Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {headerLocations.map((loc: any) => (
                    <SelectItem key={loc.id} value={String(loc.id)}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Notifications */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  setProfileOpen(false);
                }}
                className="relative"
              >
                <Bell className="size-5" />
                {unreadCount >= 0 && (
                  <span className="absolute -right-1 -top-1 bg-red-500 text-white text-xs rounded-full px-1.5">
                    {unreadCount}
                  </span>
                )}
              </Button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-[90vw] sm:w-80 bg-white shadow-xl rounded-xl border z-50">
                  <div className="p-4 border-b font-semibold">
                    Notifications
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500">
                        No notifications
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className="p-3 border-b hover:bg-gray-50 cursor-pointer"
                        >
                          <p className="text-sm">{n.message}</p>
                          <p className="text-xs text-gray-400">{n.time}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>


            <div className="relative">
              <Button
                variant="ghost"
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-full sm:rounded-lg"
              >
                {user.profileImage ? (
                  <img
                    src={user.profileImage.startsWith("http") ? user.profileImage : `${API_URL}${user.profileImage}`}
                    alt={user.firstName}
                    className="size-8 rounded-full object-cover border border-blue-200"
                  />
                ) : (
                  <div className="size-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center font-semibold text-sm shadow-sm">
                    {user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <span className="hidden md:inline-block text-sm font-medium text-gray-700">
                  {user.firstName} {user.lastName || ''}
                </span>
                <ChevronDown className="size-4 text-gray-500" />
              </Button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-[85vw] sm:w-64 bg-white shadow-xl rounded-xl border border-gray-100 z-50 overflow-hidden divide-y divide-gray-100">
                  <div className="p-4 bg-gradient-to-r from-slate-50 to-indigo-50/50 flex items-center gap-3">
                    {user.profileImage ? (
                      <img
                        src={user.profileImage.startsWith("http") ? user.profileImage : `${API_URL}${user.profileImage}`}
                        alt={user.firstName}
                        className="size-10 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                    ) : (
                      <div className="size-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-base shadow-sm">
                        {user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-gray-900 truncate">
                        {user.firstName} {user.lastName || ''}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-full uppercase">
                        {user.role || 'User'}
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('/profile');
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2.5 transition-colors"
                    >
                      <User className="size-4 text-gray-400 group-hover:text-blue-600" />
                      My Profile
                    </button>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                    >
                      <LogOut className="size-4 text-red-500" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-5">
          <Outlet />
        </main>
      </div>

      {/* Offcanvas Drawer */}
      <Sheet open={user?.role !== 'ADMIN' && drawerOpen} onOpenChange={(open) => user?.role !== 'ADMIN' && setDrawerOpen(open)}>
        <SheetContent
          side="right"
          className="w-full sm:w-[480px] md:w-[540px] overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>Attendance</SheetTitle>
          </SheetHeader>
          <div className={`py-4 ${!pinVerified && drawerMode === 'clockin' && 'customdflex'}`}>
            {(!pinVerified && drawerMode === 'clockin') ? (
              <div className="">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-800">Enter your 4-digit PIN</h3>
                  <p className="text-sm text-gray-500 mt-1">to clock in securely</p>
                </div>


                <div className="flex gap-4 my-4">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`
                    w-14 h-14 rounded-full border-2 flex items-center justify-center text-2xl font-mono
                    transition-all duration-200
                    ${pinInput.length > i
                          ? 'border-black-600 bg-black-50 text-black-700'
                          : 'border-gray-300 bg-white text-transparent'
                        }
                    ${pinError ? 'animate-shake border-red-500' : ''}
                  `}
                    >
                      {pinInput.length > i ? '●' : '○'}
                    </div>
                  ))}
                </div>


                {pinError && (
                  <p className="text-red-600 text-sm font-medium animate-pulse">
                    {pinError}
                  </p>
                )}

                {/* Numpad */}
                <div className="grid grid-cols-3 gap-3 w-full max-w-[320px] mx-auto">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handlePinClick(num)}
                      className="h-16 text-2xl font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {num}
                    </button>
                  ))}

                  <div /> {/* empty space */}

                  <button
                    type="button"
                    onClick={() => handlePinClick('0')}
                    className="h-16 text-2xl font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    0
                  </button>

                  <button
                    type="button"
                    onClick={handlePinBackspace}
                    className="h-16 text-2xl font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 flex items-center justify-center"
                    disabled={pinInput.length === 0}
                  >
                    ←
                  </button>
                </div>

                {/* Hidden input for keyboard support */}
                {/* Hidden input for keyboard support */}
                <input
                  ref={pinInputRef}
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setPinInput(val);
                    setPinError(''); // har key press pe error clear kar do
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Done' || e.key === 'Go') {
                      e.preventDefault();
                      if (pinInput.length === 4) {
                        handleVerifyPin();
                      }
                    }
                  }}
                  className="absolute opacity-0 pointer-events-none h-0 w-0"
                  autoFocus
                />

                <Button
                  onClick={handleVerifyPin}
                  disabled={pinInput.length !== 4}
                  className="w-full max-w-[280px] h-12 text-base mt-4"
                  variant={pinInput.length === 4 ? "default" : "secondary"}
                >
                  Verify PIN
                </Button>

              </div>
            ) : (
              <div className=' px-3'>

                {/* Profile */}
                <div className="px-3 py-4 border-1 border-gray-100 rounded">
                  <div className="flex items-center gap-4">
                    {/* Profile Image / Avatar */}


                    {user.profileImage ? (
                      <img
                        src={`${API_URL}${user.profileImage}`}
                        alt={`${user.firstName} ${user.lastName}`}
                        className="
              w-14 h-14 
              rounded-full 
              object-cover 
              border-2 border-white 
              shadow-md
            "
                        onError={(e) => {
                          // fallback agar image load na ho
                          e.currentTarget.src = ''; // remove broken src
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : null}

                    {/* Fallback initials agar image na ho ya load fail ho */}
                    <div
                      className={`
            w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-semibold shadow-md
            ${user.profileImage ? 'hidden' : 'bg-gradient-to-br from-blue-600 to-indigo-600'}
          `}
                    >
                      {user.firstName?.charAt(0)}
                      {user.lastName?.charAt(0)}
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900 text-base">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {user.email}
                      </p>
                      {/* {user.role && (
            <p className="text-xs text-blue-600 font-medium mt-1">
              {JSON.stringify(user)}
            </p>
          )} */}
                    </div>
                  </div>
                </div>

                {drawerMode !== 'clockout' &&
                  <div className="space-y-3 mb-6  p-3 mt-2   rounded-xl border-1 border-gray-100">
                    <div className="flex items-center gap-3 text-gray-700">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Today</p>
                        <span style={{ fontSize: 12 }} className="text-gray-900">
                          {realTime.toLocaleDateString('en-GB', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-gray-700">
                      <Clock className="w-5 h-5 text-indigo-600" />
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Current Time</p>
                        <p style={{ fontSize: 12 }} className="text-gray-900 tracking-wide">
                          {realTime.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                }

                {drawerMode === 'change' && (
                  <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as 'activity' | 'task')}>
                    <TabsList className='mb-3'>
                      <TabsTrigger value="activity">Activity</TabsTrigger>
                      <TabsTrigger value="task">Tasks</TabsTrigger>
                    </TabsList>
                    <TabsContent value="activity">
                      <Select value={selectedItem} onValueChange={setSelectedItem} >
                        <SelectTrigger>
                          <SelectValue placeholder="Select activity" />
                        </SelectTrigger>
                        <SelectContent>
                          {activities.map((act) => (
                            <SelectItem key={act} value={act}>
                              {act}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TabsContent>
                    <TabsContent value="task">
                      <Select value={selectedItem} onValueChange={setSelectedItem}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select task" />
                        </SelectTrigger>
                        <SelectContent>
                          {tasks.map((task) => (
                            <SelectItem key={task.id} value={String(task.id)}>
                              {task.title}
                              {task.project?.title && (
                                <span className="text-xs text-gray-400 ml-2">
                                  ({task.project.title})
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TabsContent>
                  </Tabs>
                )}

                {drawerMode === 'clockout' && (
                  <div className="space-y-6 px-3 py-4">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-800">Clock Out</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        You're about to end your workday. Please share a quick summary.
                      </p>
                    </div>

                    {/* Today's stats summary (nice touch) */}
                    <div className="bg-gray-50 p-4 rounded-lg border space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Worked:</span>
                        <span className="font-medium">{formatTime(elapsedTime)}</span>
                      </div>
                      {breakSeconds > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Break Time:</span>
                          <span className="font-medium text-amber-700">
                            {formatTime(breakSeconds)}
                          </span>
                        </div>
                      )}
                      {currentActivity && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Last Activity:</span>
                          <span className="font-medium">
                            {currentActivity.type === "task" ? "Task" : "Activity"} — {currentActivity.name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* End of Day Summary Textarea */}
                    <div className="space-y-2">
                      <Label htmlFor="summary" className="text-base font-medium">
                        End of Day Summary <span className="text-red-500 text-sm">*</span>
                      </Label>
                      <Textarea
                        id="summary"
                        placeholder="What did you accomplish today? Any blockers? Plans for tomorrow?"
                        value={endOfDaySummary}
                        onChange={(e) => {
                          setEndOfDaySummary(e.target.value);
                          setSummaryError('');
                        }}
                        rows={5}
                        className={`min-h-[120px] ${summaryError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      />
                      {summaryError && (
                        <p className="text-red-600 text-sm">{summaryError}</p>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                      This helps keep track of daily progress and is visible to your supervisor.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          {pinVerified && (
            <SheetFooter className="flex justify-end gap-2">
              <SheetClose asChild>
                <Button variant="outline">Cancel</Button>
              </SheetClose>
              {drawerMode === 'clockin' && (
                <Button onClick={handleClockIn}>
                  Clock In
                </Button>
              )}
              {drawerMode === 'change' && (
                <Button onClick={handleChangeActivity} disabled={!selectedItem}>
                  Change
                </Button>
              )}
              {drawerMode === 'clockout' && (
                <Button onClick={clockOut}>
                  Save Changes
                </Button>
              )}
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* Break Limit Confirmation Modal */}
      {/* Break Limit Confirmation Modal */}
      <Dialog
        open={showBreakConfirmModal}
        onOpenChange={setShowBreakConfirmModal}
      >
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">

          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <Coffee className="h-5 w-5 text-amber-600" />
              </div>

              <div className="flex-1">
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  Break Limit Reached
                </DialogTitle>

                <p className="mt-1 text-sm text-gray-500">
                  Your allowed break time has been used.
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="px-6 pb-5">

            {/* Break Summary */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">

              <div className="space-y-3">

                {/* Allowed breaks */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Allowed breaks
                  </span>

                  <span className="font-semibold text-gray-900">
                    {breakConfirmData.allowedCount}
                  </span>
                </div>

                {/* Duration */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Break duration
                  </span>

                  <span className="font-semibold text-amber-700">
                    {breakConfirmData.perBreakText || "Not specified"}
                  </span>
                </div>

                {/* Used */}
                <div className="flex items-center justify-between border-t border-amber-200 pt-3">
                  <span className="text-sm text-gray-600">
                    Total time used
                  </span>

                  <span className="font-bold text-red-600">
                    {breakConfirmData.usedMinutes} minutes
                  </span>
                </div>

              </div>
            </div>

            {/* Warning Message */}
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm leading-relaxed text-gray-700">
                You have used the full allowed break time{" "}
                <span className="font-semibold text-gray-900">
                  ({breakConfirmData.usedMinutes} minutes)
                </span>{" "}
                {breakConfirmData.previousBreakText}.
              </p>

              <p className="mt-2 text-sm font-medium text-gray-900">
                Do you still want to start another break?
              </p>
            </div>

          </div>

          {/* Footer */}
          <DialogFooter className="border-t bg-gray-50 px-6 py-4">
            <Button
              variant="outline"
              onClick={() => setShowBreakConfirmModal(false)}
              className="min-w-[90px]"
            >
              Cancel
            </Button>

            <Button
              className="min-w-[140px] bg-amber-600 text-white hover:bg-amber-700"
              onClick={startBreakExecution}
            >
              <Coffee className="mr-2 h-4 w-4" />
              Yes, Start Break
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </div>
  );
};