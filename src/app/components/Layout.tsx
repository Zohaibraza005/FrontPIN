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
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { cn } from './ui/utils';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', roles: ['ADMIN', 'SUPERVISOR', 'USER'] },
  { icon: Clock, label: 'Attendance', path: '/attendance', roles: ['ADMIN', 'SUPERVISOR', 'USER'] },
  { icon: Calendar, label: 'Schedule', path: '/schedule', roles: ['ADMIN'] },
  { icon: FolderKanban, label: 'Projects', path: '/projects', roles: ['ADMIN', 'SUPERVISOR'] },
  { icon: CheckSquare, label: 'Tasks', path: '/tasks', roles: ['ADMIN', 'SUPERVISOR', 'USER'] },
  { icon: FileText, label: 'Invoices', path: '/invoices', roles: ['ADMIN'] },
  { icon: Umbrella, label: 'Leave', path: '/leave', roles: ['ADMIN', 'SUPERVISOR', 'USER'] },
  { icon: Timer, label: 'Overtime', path: '/overtime', roles: ['ADMIN', 'SUPERVISOR', 'USER'] },
  { icon: Users, label: 'Employee', path: '/employees', roles: ['ADMIN'] },
  { icon: DollarSign, label: 'Payroll', path: '/payroll', roles: ['ADMIN'] },
  // { icon: MapPin, label: 'Locations', path: '/locations', roles: ['ADMIN'] },
  // { icon: MapPin, label: 'Departments', path: '/departments', roles: ['ADMIN'] },
  { icon: UserPlus, label: 'Recruitment', path: '/jobs', roles: ['ADMIN'] },
  { icon: BarChart3, label: 'Reports', path: '/reports', roles: ['ADMIN'] },
  {
    icon: Cog,
    label: 'Organization',
    roles: ['ADMIN'],
    children: [
      { label: 'Settings', path: '/organization', },
      { label: 'Departments', path: '/departments', },
      { label: 'Locations', path: '/locations', },
      // you can add more later: Settings, Billing, Branches, etc.
    ]
  },

  // { icon: Cog, label: 'Organization', path: '/organization', roles: ['ADMIN'] },
  // { icon: Package, label: 'Assets', path: '/assets', roles: ['ADMIN'] },
];

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
  }, []);

  const [isTodayOff, setIsTodayOff] = useState(false);

  const loadTodayStatus = async () => {
    try {
      const res = await attendanceAPI.getTodayStatus();
      updateBreakData(res);

      if (res.isOffDay) {
        setIsTodayOff(true);
      }

      if (res.clockedOut) {
        setIsClockedIn(false);
        setClockedOutInfo({
          checkInTime: res.checkInTime,
          checkOutTime: res.checkOutTime,
        });
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

          setActivityStartTime(
            new Date(res.currentActivity.startTime).getTime()
          );
        }

        setBreakSeconds(res.breakSeconds || 0);

        if (res.isOnBreak && res.breakStartTime) {
          setIsOnBreak(true);
          setBreakStartTime(
            new Date(res.breakStartTime).getTime()
          );
        }
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

    const interval = setInterval(() => {
      const now = Date.now();

      let totalBreak = breakSeconds;

      if (isOnBreak && breakStartTime) {
        totalBreak += Math.floor((now - breakStartTime) / 1000);
      }

      const totalWorked =
        Math.floor((now - activityStartTime) / 1000) - totalBreak;

      setElapsedTime(Math.max(totalWorked, 0));
    }, 1000);

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

      if (!selectedItem) return;

      const location = await getLocation();

      console.log(location);
      const payload = {
        lat: location.lat || 0,
        lng: location.lng || 0,
        activityType: selectedTab,
        activityName: selectedTab === "activity" ? selectedItem : undefined,
        taskId: selectedTab === "task" ? Number(selectedItem) : null,
        method: 'PIN'
      };

      const res = await attendanceAPI.clockIn(payload);

      setIsClockedIn(true);

      setCurrentActivity({
        type: res.activityType,
        name: res.activityTitle
      });

      const activityStart = new Date(res.activityStartTime).getTime();

      setActivityStartTime(activityStart);  // ✅ important
      setBreakSeconds(0);
      setBreakStartTime(null);
      setIsOnBreak(false);
      setElapsedTime(0);

      setDrawerOpen(false);
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
      loadTodayStatus()
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

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-300",
          sidebarOpen ? "w-64" : "w-20",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Fixed top header */}
          <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6 shrink-0">
            {sidebarOpen ? (
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                FRONTPIN
              </h1>
            ) : (
              <span className="text-2xl font-bold text-blue-600">FP</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* SCROLLABLE AREA – this MUST grow and scroll */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full px-3 py-4">
              <nav className="space-y-1 min-h-[200px]">
                {filteredMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    location.pathname === item.path ||
                    (item.path && location.pathname.startsWith(item.path)) ||
                    (item.children?.some(child => location.pathname === child.path || location.pathname.startsWith(child.path)));

                  // Has children → render as collapsible
                  if (item.children && item.children.length > 0) {
                    const [isOpen, setIsOpen] = React.useState(
                      // auto-open if any child is active
                      item.children.some(c => location.pathname === c.path || location.pathname.startsWith(c.path))
                    );

                    return (
                      <div key={item.label} className="relative">
                        <button
                          onClick={() => setIsOpen(!isOpen)}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-blue-50 text-blue-700"
                              : "text-gray-700 hover:bg-gray-100"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="size-5 shrink-0" />
                            {sidebarOpen && <span>{item.label}</span>}
                          </div>
                          {sidebarOpen && (
                            isOpen ? (
                              <ChevronDown className="size-4 opacity-70" />
                            ) : (
                              <ChevronRight className="size-4 opacity-70" />
                            )
                          )}
                        </button>

                        {/* Submenu */}
                        {isOpen && sidebarOpen && (
                          <div className="ml-8 mt-1 space-y-1 pb-2">
                            {item.children.map((child) => {
                              const ChildIcon = child.icon;
                              const childActive =
                                location.pathname === child.path ||
                                (child.path && location.pathname.startsWith(child.path));

                              return (
                                <Link
                                  key={child.path}
                                  to={child.path}
                                  className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                    childActive
                                      ? "bg-indigo-50 text-indigo-700"
                                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                  )}
                                  onClick={() => setMobileMenuOpen(false)}
                                >
                                  {ChildIcon && <ChildIcon className="size-4 shrink-0" />}
                                  <span>{child.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Normal menu item (no children)
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-700 hover:bg-gray-100"
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon className="size-5 shrink-0" />
                      {sidebarOpen && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </nav>

              {/* Extra padding at bottom so last item isn't hidden under logout */}
              <div className="h-16" />
            </ScrollArea>
          </div>

          {/* Fixed bottom – logout always visible */}
          <div className="border-t border-gray-200 p-3 sm:p-4 shrink-0 bg-white">
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 gap-3"
              onClick={logout}
            >
              <LogOut className="size-5" />
              {sidebarOpen && <span>Logout</span>}
            </Button>
          </div>
        </div>
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
          "flex-1 flex flex-col transition-all duration-300",
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
                  location.pathname.startsWith(item.path || "") ||
                  item.children?.some(child =>
                    location.pathname.startsWith(child.path)
                  )
                );
                return match?.label || "Dashboard";
              })()}
            </h2>
          </div>

          <div className="flex items-center gap-3">

            {isClockedIn ? (
              <TooltipProvider>
                <div className="flex items-center gap-2 sm:gap-3 relative flex-wrap">
                  {/* Break / Resume Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className={`h-9 w-9 transition-colors ${isOnBreak
                          ? 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200'
                          : 'hover:bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        onClick={handleBreak}
                      >
                        <Coffee className="h-5 w-5" />
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
                        className="h-9 w-9 hover:bg-indigo-50 text-indigo-600 border-indigo-200"
                        onClick={() => {
                          setDrawerMode('change');
                          setPinVerified(true);
                          setSelectedTab('activity');
                          setSelectedItem('');
                          setDrawerOpen(true);
                        }}
                      >
                        <RefreshCw className="h-5 w-5" />
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
                        className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        onClick={() => {
                          setDrawerMode('clockout');
                          setPinVerified(true);
                          setDrawerOpen(true);
                        }}
                      >
                        <LogOut className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Clock Out</TooltipContent>
                  </Tooltip>

                  {/* Timer + Status */}
                  <div className="flex items-center gap-2.5 pl-2 border-l border-gray-200">
                    <div className="flex items-center gap-3 pl-3 border-l border-gray-200">

                      <div className="text-sm sm:text-lg font-mono font-bold text-gray-900 tracking-widest">
                        {formatTime(elapsedTime)}
                      </div>

                      {isOnBreak ? (
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-900 rounded-full border border-amber-300 flex items-center gap-1.5 shadow-xs">
                            <Coffee className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                            <span>
                              On Break (Break {currentBreakNumber}{allowedBreakCount > 0 ? ` of ${allowedBreakCount}` : ''})
                            </span>
                          </span>
                          <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200" title="Active break timer">
                            ⏱ {formatTime(activeBreakSeconds)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 text-[10px] sm:text-xs font-medium bg-green-100 text-green-800 rounded-full border border-green-300 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-green-600" />
                            <span>Working</span>
                          </span>
                          {totalUsedBreakMinutes > 0 && (
                            <span className="text-[11px] text-gray-500 font-medium">
                              (Breaks: {totalUsedBreakMinutes}m{allowedBreakCount > 0 ? ` / ${totalAllowedBreakMinutes}m` : ''})
                            </span>
                          )}
                        </div>
                      )}

                    </div>


                    <div className="flex items-center gap-1.5">
                      {/* {isOnBreak ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                <Coffee className="h-3 w-3 mr-1" />
                Break
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">
                <Clock className="h-3 w-3 mr-1" />
                Working
              </span>
            )} */}
                      {currentActivity && (
                        <div className="text-xs text-gray-500 ml-2 font-medium">
                          {currentActivity.type === "task"
                            ? `Task: ${currentActivity.name}`
                            : `Activity: ${currentActivity.name}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TooltipProvider>
            ) : clockedOutInfo ? (
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border rounded-lg">
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-green-600">
                    In:{" "}
                  </span>
                  {new Date(clockedOutInfo.checkInTime).toLocaleTimeString()}
                </div>

                <div className="text-sm text-gray-600">
                  <span className="font-medium text-red-600">
                    Out:{" "}
                  </span>
                  {new Date(clockedOutInfo.checkOutTime).toLocaleTimeString()}
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
            )}

            {/* Help Tour Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={startTour}
              className="hidden md:flex"
            >
              <HelpCircle className="size-4 mr-2" />
              Take Tour
            </Button>

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
                className="flex items-center gap-2"
              >
                <div className="size-8 rounded-full bg-blue-600 text-white flex items-center justify-center">
                  {user.firstName.charAt(0)}
                </div>
                <ChevronDown className="size-4" />
              </Button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-[85vw] sm:w-56 bg-white shadow-xl rounded-xl border z-50">
                  <div className="p-4 border-b">
                    <p className="font-medium">{user.firstName}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>

                  <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-50"
                  >
                    Profile
                  </button>

                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
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
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
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
                          {new Date().toLocaleDateString('en-GB', {
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
                          {new Date().toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                }

                {drawerMode !== 'clockout' ? (
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
                ) : (
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
                <Button onClick={handleClockIn} disabled={!selectedItem}>
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