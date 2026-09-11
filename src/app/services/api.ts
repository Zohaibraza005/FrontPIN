// Mock API service for connecting to MySQL backend
// Replace these endpoints with your actual backend API URLs

/**
 * INTEGRATION GUIDE FOR YOUR MYSQL BACKEND:
 * 
 * 1. Replace API_BASE_URL with your actual backend URL
 * 2. Uncomment the fetch() calls in apiCall() function
 * 3. Remove or comment out the getMockData() function
 * 4. Ensure your backend endpoints match the structure below:
 * 
 * Backend API Structure:
 * - POST /api/auth/login - Login with email and password
 * - POST /api/auth/logout - Logout
 * - POST /api/attendance/check-in - Check in with PIN
 * - POST /api/attendance/check-out - Check out with PIN
 * - GET /api/attendance - Get attendance records (with filters)
 * - GET /api/schedules - Get schedules
 * - POST /api/schedules - Create schedule
 * - PUT /api/schedules/:id - Update schedule
 * - GET /api/projects - Get projects
 * - POST /api/projects - Create project
 * - PUT /api/projects/:id - Update project
 * - GET /api/tasks - Get tasks
 * - POST /api/tasks - Create task
 * - PUT /api/tasks/:id - Update task
 * - GET /api/employees - Get employees
 * - POST /api/employees - Create employee
 * - PUT /api/employees/:id - Update employee
 * - PUT /api/employees/:id/pin - Set employee PIN
 * - GET /api/invoices - Get invoices
 * - POST /api/invoices - Create invoice
 * - GET /api/leaves - Get leave requests
 * - POST /api/leaves - Create leave request
 * - POST /api/leaves/:id/approve - Approve leave
 * - POST /api/leaves/:id/reject - Reject leave
 * - GET /api/overtimes - Get overtimes
 * - POST /api/overtimes - Create overtime
 * - POST /api/overtimes/:id/approve - Approve overtime
 * - GET /api/payrolls - Get payrolls
 * - POST /api/payrolls/generate - Generate payroll
 * - GET /api/locations - Get locations
 * - POST /api/locations - Create location
 * - GET /api/applicants - Get applicants
 * - PUT /api/applicants/:id/status - Update applicant status
 * - GET /api/performance - Get performance reviews
 * - POST /api/performance - Create performance review
 * - GET /api/assets - Get assets
 * - POST /api/assets - Create asset
 * - POST /api/assets/:id/assign - Assign asset
 * - GET /api/reports/dashboard - Get dashboard statistics
 * - GET /api/reports/attendance - Get attendance report
 * - GET /api/reports/payroll - Get payroll report
 * - GET /api/notifications - Get notifications
 * - POST /api/notifications/:id/read - Mark notification as read
 * - POST /api/notifications/fcm-token - Update FCM token for push notifications
 * 
 * Database Schema Recommendations:
 * - users (id, name, email, password_hash, role, avatar, created_at)
 * - employees (id, user_id, department, position, pin_hash, salary, join_date, created_at)
 * - attendance (id, employee_id, date, check_in, check_out, location_id, status, created_at)
 * - schedules (id, employee_id, date, shift, start_time, end_time, location_id, created_at)
 * - projects (id, name, client, status, progress, start_date, end_date, budget, spent, team_size)
 * - tasks (id, title, description, project_id, assigned_to, status, priority, due_date, created_at)
 * - invoices (id, invoice_number, client, amount, status, issue_date, due_date, paid_date)
 * - leaves (id, employee_id, type, start_date, end_date, days, reason, status, applied_date)
 * - overtimes (id, employee_id, date, hours, rate, amount, reason, status, created_at)
 * - payrolls (id, employee_id, month, base_salary, overtime, bonus, deductions, net_pay, status, paid_date)
 * - locations (id, name, address, type, capacity, active, created_at)
 * - applicants (id, name, email, phone, position, status, applied_date, experience, resume_url)
 * - performance_reviews (id, employee_id, period, rating, strengths, improvements, review_date, reviewer_id)
 * - assets (id, name, category, serial_number, assigned_to, status, purchase_date, value, created_at)
 * - notifications (id, user_id, message, type, read, created_at)
 * - fcm_tokens (id, user_id, token, device_info, created_at)
 */

// export const API_BASE_URL = 'http://localhost:4000/api'; // Change to your backend URL
// export const API_URL = 'http://localhost:4000'; // Change to your backend URL

export const API_BASE_URL = "http://localhost:4000/api"
// export const API_URL = "https://api.frontpin.unisoftdemo.com"
export const API_URL = "http://localhost:4000"
let isRefreshing = false; // optional: prevent multiple simultaneous logouts
// Mock authentication token storage
let authToken: string | null = localStorage.getItem('authToken');
let currentUser: any = JSON.parse(localStorage.getItem('currentUser') || 'null');

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

export const setCurrentUser = (user: any) => {
  currentUser = user;
  if (user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('currentUser');
  }
};

export const getCurrentUser = () => currentUser;

// Generic API call function

export async function apiCall(
  endpoint: string,
  options: RequestInit = {},
): Promise<any> {
  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(localStorage.getItem('authToken') && {
      Authorization: `Bearer ${localStorage.getItem('authToken')}`,
    }),
  };

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  let formattedBody = options.body;
  if (!isFormData && formattedBody && typeof formattedBody === 'object' && !(formattedBody instanceof ArrayBuffer) && !(formattedBody instanceof Blob)) {
    formattedBody = JSON.stringify(formattedBody);
  }

  const finalOptions: RequestInit = {
    ...options,
    headers: {
      ...headers,
      ...((options.headers || {}) as Record<string, string>),
    },
    ...(formattedBody !== undefined && { body: formattedBody }),
  };

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, finalOptions);
  } catch (err: any) {
    const error: any = new Error(err.message || 'Server connection failed');
    error.status = 0;
    error.isNetworkError = true;
    throw error;
  }

  if (!response.ok) {
    let errorData: any = {};

    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText || 'Request failed' };
    }

    // ────────────────────────────────────────────────
    //         Decide whether this is "token expired"
    // ────────────────────────────────────────────────
    const isTokenExpired =
      response.status === 401 &&
      (
        errorData.message?.toLowerCase().includes('expired') ||
        errorData.message?.toLowerCase().includes('jwt expired') ||
        errorData.message?.toLowerCase().includes('token expired') ||
        errorData.error === 'token_expired' ||           // common in some APIs
        errorData.code === 'TOKEN_EXPIRED' ||            // some use code field
        errorData.code === 4011 ||                       // custom codes
        errorData.code === 'AUTH_TOKEN_EXPIRED'
      );

    if (isTokenExpired) {
      handleUnauthorized();
      // You can also throw if the caller wants to show a message
      throw new Error('Access token expired');
    }

    // Normal 401 (forbidden, not logged in, etc.) or other errors
    if (response.status === 401) {
      // Optional: you can handle other 401 cases differently if needed
      // handleUnauthorized(); // ← only if you want ALL 401 → logout
    }

    const error: any = new Error(errorData.message || 'Request failed');
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  if (response.status === 204) return null;

  return response.json();
}
function handleUnauthorized() {
  // Prevent multiple redirects / clear operations
  if (isRefreshing) return;
  isRefreshing = true;

  // Clear everything
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  setAuthToken(null);
  setCurrentUser(null);

  // Option A: If called from React component → use useNavigate()
  // Option B: If called from anywhere (including api file) → window.location
  window.location.href = '/login?session=expired'; // ← most reliable from service file

  // Alternative (if you expose navigate from a custom hook - see below)
  // navigate('/login', { replace: true, state: { from: location } });

  isRefreshing = false;
}


// Auth API
export const authAPI = {
  login: async (identifier: string, password: string) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
  },  
  logout: async () => {
    return apiCall('/auth/logout', { method: 'POST' });
  },
  checkIdentifier: async (identifier:string ) => {
    return apiCall('/auth/check-identifier', {method: 'POST', body:JSON.stringify({identifier})});
  },
};
// Department API
export const departmentAPI = {
  getDepartments: async () => {
    return apiCall("/departments");
  },

  createDepartment: async (data: any) => {
    return apiCall("/departments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateDepartment: async (id: number, data: any) => {
    return apiCall(`/departments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteDepartment: async (id: number) => {
    return apiCall(`/departments/${id}`, {
      method: "DELETE",
    });
  },
};

// Entity API
export const entityAPI = {
  getEntities: async () => {
    return apiCall("/entities");
  },

  createEntity: async (data: any) => {
    return apiCall("/entities", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateEntity: async (id: number, data: any) => {
    return apiCall(`/entities/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteEntity: async (id: number) => {
    return apiCall(`/entities/${id}`, {
      method: "DELETE",
    });
  },

  getNextEmployeeCode: async (id: number | string) => {
    return apiCall(`/entities/${id}/next-employee-code`);
  },
};

export const roleAPI = {
  getRoles: async () => {
    return apiCall("/roles");
  },
  getRoleById: async (id: number | string) => {
    return apiCall(`/roles/${id}`);
  },
  createRole: async (data: { name: string; description?: string; privileges: any[] }) => {
    return apiCall("/roles", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  updateRole: async (id: number | string, data: { name?: string; description?: string; privileges?: any[] }) => {
    return apiCall(`/roles/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  deleteRole: async (id: number | string) => {
    return apiCall(`/roles/${id}`, {
      method: "DELETE",
    });
  },
};


// Attendance API
// Attendance API
export const attendanceAPI = {
// 🔥 Admin Attendance Dashboard
getAdminDashboard: async (companyId?: number | string) => {
  const query = companyId && companyId !== "all"
    ? `?companyId=${companyId}`
    : "";

  return apiCall(`/attendance/admin/dashboard${query}`);
},
  // 🔹 Check if today is working day + already clocked in
  getTodayStatus: async () => {
    return apiCall("/attendance/today-status");
  },
  getAssignableTasks: async () => {
    return apiCall("/projects/tasks/assignable-tasks");
  },
  // 🔹 Verify employee PIN
  verifyPin: async (pin: string) => {
    return apiCall("/attendance/verify-pin", {
      method: "POST",
      body: JSON.stringify({ pin }),
    });
  },

  // 🔹 Clock In
  clockIn: async (data: {
    lat: number;
    lng: number;
    activityType: "activity" | "task";
    activityName?: string;
    taskId?: number | null;
  }) => {
    return apiCall("/attendance/clock-in", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // 🔹 Start Break
  startBreak: async () => {
    return apiCall("/attendance/start-break", {
      method: "POST",
    });
  },

  // 🔹 End Break
  endBreak: async () => {
    return apiCall("/attendance/end-break", {
      method: "POST",
    });
  },

  // 🔹 Change Activity / Task
  changeActivity: async (data: {
    activityType: "activity" | "task";
    activityName?: string;
    taskId?: number | null;
  }) => {
    return apiCall("/attendance/change-activity", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // 🔹 Clock Out
  clockOut: async (data: {
    lat: number;
    lng: number;
    summary: string;
  }) => {
    return apiCall("/attendance/clock-out", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // 🔹 Get attendance history (optional for reports)
  getAttendance: async (filters?: any) => {
    const query = filters
      ? `?${new URLSearchParams(filters).toString()}`
      : "";
    return apiCall(`/attendance${query}`);
  },
  createAttendance: async (data: {
    employeeId: number;
    date: string | Date;
    checkInTime?: string | Date | null;
    checkOutTime?: string | Date | null;
    status: string;
  }) => {
    return apiCall("/attendance", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  updateAttendance: async (
    id: number,
    data: {
      checkInTime?: string | Date | null;
      checkOutTime?: string | Date | null;
      status: string;
    }
  ) => {
    return apiCall(`/attendance/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
    

  // 🔹 Get single day attendance detail
  // getAttendanceByDate: async (date: string) => {
  //   return apiCall(`/attendance/by-date?date=${date}`);
  // },
  // services/api.ts

  getAttendanceReport: async (params?: Record<string, any>) => {
    const query = params
      ? `?${new URLSearchParams(
          Object.entries(params).reduce((acc, [key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
              acc[key] =
                value instanceof Date
                  ? value.toISOString()
                  : String(value);
            }
            return acc;
          }, {} as Record<string, string>)
        ).toString()}`
      : "";
  
    return apiCall(`/attendance/report${query}`);
  },
  
  exportExcel: async (params?: Record<string, any>) => {
    const cleanParams: Record<string, string> = {};
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "" && value !== "all") {
          cleanParams[key] = value instanceof Date ? value.toISOString() : String(value);
        }
      });
    }
    const query = new URLSearchParams(cleanParams).toString();
    const token = localStorage.getItem("authToken");
    const response = await fetch(`${API_BASE_URL}/attendance/export-excel?${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to export Excel file");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    let fileName = "";
    const disposition = response.headers.get("Content-Disposition") || response.headers.get("content-disposition");
    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        fileName = match[1];
      }
    }
    if (!fileName) {
      if (params?.filter === "thisWeek" || params?.view === "weekly") {
        fileName = `Weekly_Attendance_Tracker_${params?.startDate || "week"}.xlsx`;
      } else {
        const dateStr = params?.date ? (params.date instanceof Date ? params.date.toISOString() : String(params.date)) : new Date().toISOString();
        fileName = `Daily_Attendance_Tracker_${dateStr.slice(0, 10)}.xlsx`;
      }
    }

    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};


// Schedule API
export const scheduleAPI = {
  getSchedules: async () => {
    return apiCall("/schedules");
  },

  createSchedule: async (data: any) => {
    return apiCall("/schedules", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateSchedule: async (id: number, data: any) => {
    return apiCall(`/schedules/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteSchedule: async (id: number) => {
    return apiCall(`/schedules/${id}`, {
      method: "DELETE",
    });
  },
};


// Project API
export const invoiceCompanyAPI = {
  create: (data: FormData) =>
    apiCall("/invoice-company", {
      method: "POST",
      body: data,
    }),

  getAll: () =>
    apiCall("/invoice-company"),

  update: (id: number | string, data: FormData) =>
    apiCall(`/invoice-company/${id}`, {
      method: "PUT",
      body: data,
    }),

  delete: (id: number | string) =>
    apiCall(`/invoice-company/${id}`, {
      method: "DELETE",
    }),
};

export const projectAPI = {
  getClients: async () => {
    return apiCall("/projects/clients");
  },
  getProjects: async () => {
    return apiCall("/projects");
  },

  createProject: async (formData: FormData) => {
    return apiCall("/projects", {
      method: "POST",
      body: formData,
    });
  },

  updateProject: async (id: number, formData: FormData) => {
    return apiCall(`/projects/${id}`, {
      method: "PUT",
      body: formData,
    });
  },
  getProjectById: (id: number) => {
    return apiCall(`/projects/${id}`);
  },
  

  deleteProject: async (id: number) => {
    return apiCall(`/projects/${id}`, {
      method: "DELETE",
    });
  },
  updateProjectStatus: async (id: number, data: any) => {
    return apiCall(`/projects/${id}/status`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  getProjectTasks: (projectId: number) =>{
    return apiCall(`/projects/${projectId}/tasks`);
  },
 

createTask: (projectId: number, formData: FormData) =>{
  return   apiCall(`/projects/${projectId}/tasks`, {
    method: "POST",
    body: formData,
  });
},

getProjectLogs: (projectId: number) =>{
  return apiCall(`/projects/${projectId}/logs`)
}
  

};


// Task API
// services/api.ts

export const taskAPI = {
  // 🔹 Get tasks (role-based backend filtering already applied)
  getTasks: async (filters?: Record<string, any>) => {
    const query = filters
      ? `?${new URLSearchParams(filters).toString()}`
      : "";
    return apiCall(`/projects/tasks/get-tasks${query}`);
  },

  // 🔹 Create new task
  createTask: async (formData: FormData) => {

    // 👇 Extract projectId from formData JSON
    const rawData = formData.get("data");
    const parsed = rawData ? JSON.parse(rawData as string) : {};
  
    const endpoint = parsed.projectId
      ? `/${parsed.projectId}/tasks`
      : `/tasks/create`;
  
    return apiCall("/projects" + endpoint, {
      method: "POST",
      body: formData, // 🚀 Send FormData directly
    });
  },
  

  // 🔹 Update task (status, title, priority etc)
  updateTask: async (id: string | number, data: any) => {
    return apiCall(`/projects/tasks/update/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // 🔹 Soft delete task
  deleteTask: async (id: string | number) => {
    return apiCall(`/projects/tasks/delete/${id}`, {
      method: "DELETE",
    });
  },

  // 🔹 Get employees allowed to assign (role-based)
  getAssignableEmployees: async () => {
    return apiCall("/projects/tasks/get-assigned-employee");
  },

  // 🔹 Get single task
  getTaskById: async (id: string | number) => {
    return apiCall(`/tasks/${id}`);
  },
  updateTaskStatus: async (id: number | string, status: string) => {
    return apiCall(`/projects/tasks/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },
  updateTaskAssignees: async (taskId: string | number, assignees: number[]) => {
    return apiCall(`/projects/tasks/update/${taskId}`, {
      method: "PUT",
      body: JSON.stringify({ assignees }),
    });
  },
  getRemarks: async (taskId: string | number) => {
    return apiCall(`/projects/get/${taskId}/remarks`);
  },

  createRemark: async (taskId: string | number, formData: FormData) => {
    return apiCall(`/projects/create/${taskId}/remarks`, {
      method: "POST",
      body: formData,
    });
  },

  updateRemark: async (
    taskId: string | number,
    remarkId: string | number,
    data: { title?: string; content: string }
  ) => {
    return apiCall(`/projects/update/${taskId}/remarks/${remarkId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteRemark: async (taskId: string | number, remarkId: string | number) => {
    return apiCall(`/projects/delete/${taskId}/remarks/${remarkId}`, {
      method: "DELETE",
    });
  },
};


// Employee API
export const employeeAPI = {
  getEmployees: async (filters?: any) => {
    return apiCall(`/employees?${new URLSearchParams(filters)}`);
  },

  createEmployee: async (data: any) => {
    return apiCall('/employees', {
      method: 'POST',
      body: data,
    });
  },

  updateEmployee: async (id: number, data: any) => {
    return apiCall(`/employees/${id}`, {
      method: 'PUT',
      body: data,
    });
  },

  setPIN: async (id: number, pin: string) => {
    return apiCall(`/employees/${id}/pin`, {
      method: 'PUT',
      body: JSON.stringify({ pin }),
    });
  },

  getSupervisorsByLocation: async (companyId: number) => {
    return apiCall(`/employees/supervisors?companyId=${companyId}`);
  },
  deleteEmployee: async (id: number) => {
    return apiCall(`/employees/${id}`, {
      method: 'DELETE',
    });
  },
  getActiveEmployees: async () => {
    return apiCall("/employees/active");
  },
  getDetail: (id: number | string) =>
    apiCall(`/employees/${id}/detail`),
  addIncrement: async (id: number | string, data: any) => {
    return apiCall(`/employees/${id}/increment`, {
      method: 'POST',
      body: data,
    });
  },
  importSupervisors: async (fileOrSupervisors: FormData | { supervisors: string[] }) => {
    if (fileOrSupervisors instanceof FormData) {
      return apiCall('/employees/import-supervisors', {
        method: 'POST',
        body: fileOrSupervisors,
      });
    } else {
      return apiCall('/employees/import-supervisors', {
        method: 'POST',
        body: JSON.stringify(fileOrSupervisors),
      });
    }
  },
  importEmployees: async (fileOrData: FormData | { employees?: string[]; role?: string }) => {
    if (fileOrData instanceof FormData) {
      return apiCall('/employees/import-employees', {
        method: 'POST',
        body: fileOrData,
      });
    } else {
      return apiCall('/employees/import-employees', {
        method: 'POST',
        body: JSON.stringify(fileOrData),
      });
    }
  },
};



// Invoice API
export const invoiceAPI = {
  createInvoice: (data: any) =>
    apiCall("/invoices", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateInvoice: (id: number, data: any) =>
    apiCall(`/invoices/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteInvoice: (id: number) =>
    apiCall(`/invoices/${id}`, {
      method: "DELETE",
    }),

  getInvoices: (params?: any) => {
    const query = params
      ? "?" + new URLSearchParams(params).toString()
      : "";
    return apiCall(`/invoices${query}`);
  },
  getSingleInvoice: (id: number) =>
  apiCall(`/invoices/${id}`),
  addTransaction: (id: number, data: any) => apiCall(`/invoices/${id}/transaction`, { method: "POST", body: JSON.stringify(data), }),
  updateTransaction: (id: number, data: any) =>
  apiCall(`/invoices/transaction/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  }),

deleteTransaction: (id: number) =>
  apiCall(`/invoices/transaction/${id}`, {
    method: "DELETE",
  }),

};


// Leave API


// Overtime API
export const overtimeAPI = {

  getOvertimes: async (filters?: any) => {
    const query = filters
      ? `?${new URLSearchParams(filters)}`
      : "";
    return apiCall(`/overtimes${query}`);
  },

  createOvertime: async (data: {
    employeeId: number;
    date: string;
    hours: number;
    rate: number;
    reason?: string;
  }) => {
    return apiCall(`/overtimes`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateOvertime: async (
    id: number,
    data: {
      employeeId: number;
      date: string;
      hours: number;
      rate: number;
      reason?: string;
      status?: "PENDING" | "APPROVED" | "REJECTED" | string;
    }
  ) => {
    try {
      return await apiCall(`/overtimes/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    } catch (err: any) {
      if (err.status === 404 || err.message?.toLowerCase().includes("route not found")) {
        // Step 1: Delete original overtime record
        try {
          await apiCall(`/overtimes/${id}`, {
            method: "DELETE",
          });
        } catch {
          // If delete fails, ignore and proceed to create
        }

        // Step 2: Create updated overtime record
        const createRes = await apiCall(`/overtimes`, {
          method: "POST",
          body: JSON.stringify({
            employeeId: data.employeeId,
            date: data.date,
            hours: data.hours,
            rate: data.rate,
            reason: data.reason,
          }),
        });

        const newId = createRes?.overtime?.id || createRes?.id;

        // Step 3: Update status if it was APPROVED or REJECTED
        if (newId && data.status && data.status !== "PENDING") {
          try {
            await apiCall(`/overtimes/${newId}/status`, {
              method: "PATCH",
              body: JSON.stringify({ status: data.status }),
            });
          } catch {
            // Status update fallback ignored if fails
          }
        }

        return createRes;
      }
      throw err;
    }
  },

  updateStatus: async (
    id: number,
    status: "APPROVED" | "REJECTED"
  ) => {
    return apiCall(`/overtimes/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  deleteOvertime: async (id: number) => {
    return apiCall(`/overtimes/${id}`, {
      method: "DELETE",
    });
  },
};


// Payroll API
// services/api.ts

  export const payrollAPI = {
    updateStatus: (
      id: number | string,
      data: { status: "PAID" | "GENERATED" | "DRAFT" }
    ) =>
      apiCall(`/payroll/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify(data)
      }),
    LockPayroll: (
      id: number | string,
      data: { status: "PAID" | "GENERATED" | "DRAFT" }
    ) =>
      apiCall(`/payroll/${id}/lock`, {
        method: "PATCH",
        body: JSON.stringify(data)
      }),
      generateBulk: (data: {
        month: number;
        year: number;
        type: "INDIVIDUAL" | "DEPARTMENT" | "LOCATION";
        employeeIds?: number[];
        departmentIds?: number[];
        locationIds?: number[];
      }) =>
        apiCall("/payroll/generate-bulk", {
          method: "POST",
          body: JSON.stringify(data)
        }),
    
    
    generate: (data: {
      employeeId: number;
      month: number;
      year: number;
      bonus?: number;
      deductions?: number;
    }) => apiCall("/payroll/generate", {
      method: "POST",
      body: JSON.stringify(data)
    }),

    getAll: (params?: {
      month?: number;
      year?: number;
      status?: string;
    }) => {
      const query = new URLSearchParams(
        Object.entries(params || {}).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            acc[key] = String(value);
          }
          return acc;
        }, {} as Record<string, string>)
      ).toString();
    
      return apiCall(`/payroll${query ? `?${query}` : ""}`);
    },
    getById: (id: number | string) => {
      return apiCall(`/payroll/${id}`);
    },
    addAdjustment: (
      payrollId: number | string,
      data: {
        type: "INCREMENT" | "DEDUCTION";
        title: string;
        amount: number;
      }
    ) =>
      apiCall(`/payroll/${payrollId}/adjustment`, {
        method: "POST",
        body: JSON.stringify(data)
      }),
    update: (id: number | string, data: any) =>
      apiCall(`/payroll/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: number | string) =>
      apiCall(`/payroll/${id}`, {
        method: "DELETE",
      }),
  addComponent: (
    payrollId: number,
    data: {
      type: string;
      title: string;
      amount: number;
    }
  ) =>
    apiCall(`/payroll/${payrollId}/component`, {
      method: "POST",
      body: JSON.stringify(data)
    }),
  updateComponent: (
    componentId: number | string,
    data: { type?: string; title?: string; amount?: number }
  ) =>
    apiCall(`/payroll/component/${componentId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteComponent: (componentId: number | string) =>
    apiCall(`/payroll/component/${componentId}`, {
      method: "DELETE",
    }),
    getStats: (params?: { month?: number; year?: number }) => {
      const query = new URLSearchParams(
        Object.entries(params || {}).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            acc[key] = String(value);
          }
          return acc;
        }, {} as Record<string, string>)
      ).toString();
  
      return apiCall(`/payroll/stats${query ? `?${query}` : ""}`);
    },
  
    getTrend: () => apiCall("/payroll/trend"),
  
    getOvertimeTrend: () => apiCall("/payroll/overtime-trend"),
  
    getDepartmentBreakdown: (params?: { month?: number; year?: number }) => {
      const query = new URLSearchParams(params as any).toString();
      return apiCall(`/payroll/department-breakdown?${query}`);
    },
  
    getHeadcount: () => apiCall("/payroll/headcount"),
  
    getAttendanceImpact: (params?: { month?: number; year?: number }) => {
      const query = new URLSearchParams(params as any).toString();
      return apiCall(`/payroll/attendance-impact?${query}`);
    },
  
    getRiskAlerts: (params?: { month?: number; year?: number }) => {
      const query = new URLSearchParams(params as any).toString();
      return apiCall(`/payroll/risk-alerts?${query}`);
    }
  };


// Location API
export const locationAPI = {
  getLocations: async () => {
    return apiCall('/locations');
  },
  createLocation: async (data: any) => {
    return apiCall('/locations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateLocation: async (id: number, data: any) => {
    return apiCall(`/locations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteLocation: async (id: number) => {
    return apiCall(`/locations/${id}`, {
      method: 'DELETE',
    });
  },
};
// Reports API (Advanced Reporting)
export const reportsAPI = {

  // 🔹 Admin High Level Dashboard
  getAdminDashboard: async (filters?: any) => {
    const query = filters
      ? `?${new URLSearchParams(filters).toString()}`
      : "";
    return apiCall(`/reports/admin/dashboard${query}`);
  },

  // 🔹 Attendance Report
  getAttendanceReport: async (filters?: any) => {
    const query = filters
      ? `?${new URLSearchParams(filters).toString()}`
      : "";
    return apiCall(`/reports/attendance${query}`);
  },

  // 🔹 Employee Performance
  getPerformanceReport: async (filters?: any) => {
    const query = filters
      ? `?${new URLSearchParams(filters).toString()}`
      : "";
    return apiCall(`/reports/performance${query}`);
  },

  // 🔹 Task Analytics
  getTaskAnalytics: async (filters?: any) => {
    const query = filters
      ? `?${new URLSearchParams(filters).toString()}`
      : "";
    return apiCall(`/reports/task-analytics${query}`);
  },

  // 🔹 Payroll Report
  getPayrollReport: async (filters?: any) => {
    const query = filters
      ? `?${new URLSearchParams(filters).toString()}`
      : "";
    return apiCall(`/reports/payroll${query}`);
  },
};
// Applicant API
export const applicantAPI = {
  getApplicants: async (filters?: any) => {
    return apiCall(`/applicants?${new URLSearchParams(filters)}`);
  },
  updateStatus: async (id: string, status: string) => {
    return apiCall(`/applicants/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
};

// Performance API
export const performanceAPI = {
  getReviews: async (filters?: any) => {
    return apiCall(`/performance?${new URLSearchParams(filters)}`);
  },
  createReview: async (data: any) => {
    return apiCall('/performance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
export const organizationAPI = {

  // 🔹 Get Organization Profile
  getProfile: async () => {
    return apiCall("/employees/organization/profile");
  },

  // 🔹 Update Organization Profile
  updateProfile: async (data: {
    name: string;
    phone: string;
    email: string;
    emergencyContact?: string;
    address?: string;
    totalEmployees?: number;
    category?: string;
    subscriptionPackage?: string;
  }) => {
    return apiCall("/employees/update/organization/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  registerOrganization: async (data: {
    name: string;
    phone: string;
    email: string;
    emergencyContact?: string;
    address?: string;
    totalEmployees?: number;
    category?: string;
    timeZone?:string;
  }) => {
    return apiCall("/employees/register-organization", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },


};
export const candidateAPI = {

  // 🔹 Get candidates by Job
  getByJob: async (jobId: number) => {
    return apiCall(`/jobs/${jobId}/candidates`);
  },

  // 🔹 Create Candidate
  createCandidate: async (formData: FormData) => {
    return apiCall(`/candidates`, {
      method: "POST",
      body: formData,
    });
  },

  // 🔹 Update Candidate
  updateCandidate: async (id: number, formData: FormData) => {
    return apiCall(`/candidates/${id}`, {
      method: "PUT",
      body: formData,
    });
  },

  // 🔹 Update Status (Pipeline move)
  updateStatus: async (id: number, status: string) => {
    return apiCall(`/candidates/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  // 🔹 Soft Delete
  deleteCandidate: async (id: number) => {
    return apiCall(`/candidates/${id}`, {
      method: "DELETE",
    });
  },

};
//Jobs API
export const jobAPI = {

  // 🔹 Get All Jobs
  getJobs: async (filters?: any) => {
    const query = filters
      ? `?${new URLSearchParams(filters)}`
      : "";
    return apiCall(`/jobs${query}`);
  },

  // 🔹 Get Single Job
  getJobById: async (id: number) => {
    return apiCall(`/jobs/${id}`);
  },

  // 🔹 Create Job
  createJob: async (data: any) => {
    return apiCall(`/jobs`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // 🔹 Update Job
  updateJob: async (id: number, data: any) => {
    return apiCall(`/jobs/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // 🔹 Update Job Status (Kanban drag drop)
  updateJobStatus: async (id: number, status: string) => {
    return apiCall(`/jobs/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  // 🔹 Soft Delete Job
  deleteJob: async (id: number) => {
    return apiCall(`/jobs/${id}`, {
      method: "DELETE",
    });
  },

};

// Asset API
export const assetAPI = {
  getAssets: async (filters?: any) => {
    return apiCall(`/assets?${new URLSearchParams(filters)}`);
  },
  createAsset: async (data: any) => {
    return apiCall('/assets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  assignAsset: async (id: string, employeeId: string) => {
    return apiCall(`/assets/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ employeeId }),
    });
  },
};
export const dashboardAPI = {


  // 🔹 User
  getUserDashboard: async (date?: string) => {
    return apiCall(`/dashboard/user${date ? `?date=${date}` : ""}`);
  },

// Update in your api service (dashboardAPI)
getStatsDetails: async (category: string, date: string, location: string) => {
  return apiCall(`/dashboard/stats/${category}?date=${date}&location=${location}`);
},
  getAdminDashboard: async (filters?: { date?: string; location?: string }) => {
    return apiCall(`/dashboard/admin?${new URLSearchParams(filters)}`);
  },
  getWeeklyTimesheet: async (filters?: { date?: string; location?: string }) => {
    return apiCall(`/dashboard/weekly-timesheet?${new URLSearchParams(filters)}`);
  },

  getSupervisorDashboard: async (filters?: { date?: string; location?: string }) => {
    return apiCall(`/dashboard/supervisor?${new URLSearchParams(filters)}`);
  },

  getAdminGraphs: async (filters?: { date?: string; location?: string }) => {
    return apiCall(`/dashboard/admin/graphs?${new URLSearchParams(filters)}`);
  },

};
// Reports API
// export const reportsAPI = {
//   getDashboardStats: async () => {
//     return apiCall('/reports/dashboard');
//   },
//   getAttendanceReport: async (filters?: any) => {
//     return apiCall(`/reports/attendance?${new URLSearchParams(filters)}`);
//   },
//   getPayrollReport: async (filters?: any) => {
//     return apiCall(`/reports/payroll?${new URLSearchParams(filters)}`);
//   },
// };
// Leave API
export const leaveAPI = {

  // 🔹 Get leaves (role-based)
  getLeaves: async (filters?: Record<string, any>) => {
    const query = filters
      ? `?${new URLSearchParams(filters).toString()}`
      : "";
    return apiCall(`/leaves${query}`);
  },

  // 🔹 Get Leave Types
  getLeaveTypes: async (params?: { all?: boolean }) => {
    const query = params?.all ? "?all=true" : "";
    return apiCall(`/leaves/types${query}`);
  },

  // 🔹 Create Leave Type
  createLeaveType: async (data: { name: string; code?: string; isActive?: boolean }) => {
    return apiCall("/leaves/types", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // 🔹 Update Leave Type
  updateLeaveType: async (id: number, data: { name?: string; code?: string; isActive?: boolean }) => {
    return apiCall(`/leaves/types/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // 🔹 Delete Leave Type
  deleteLeaveType: async (id: number) => {
    return apiCall(`/leaves/types/${id}`, {
      method: "DELETE",
    });
  },

  // 🔹 Create Leave
  createLeave: async (data: {
    employeeId: number;
    leaveTypeId: number;
    startDate: string;
    endDate: string;
    reason?: string;
  }) => {
    return apiCall(`/leaves`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // 🔹 Update Leave Status
  updateLeaveStatus: async (
    id: number,
    status: "APPROVED" | "REJECTED",
    payType?: "PAID" | "UNPAID"
  ) => {
    return apiCall(`/leaves/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, payType }),
    });
  },

  // 🔹 Employee Leave Summary
  getEmployeeLeaveSummary: async (employeeId: number) => {
    return apiCall(`/leaves/employee/${employeeId}/summary`);
  },
  getEligibleEmployees: async () => {
    return apiCall("/leaves/eligible-employees");
  },
  deleteLeave: async (id: number | string) => {
    return apiCall(`/leaves/${id}`, {
      method: "DELETE",
    });
  },
  updateLeave: async (
    id: number | string,
    data: {
      leaveTypeId?: number;
      startDate?: string;
      endDate?: string;
      reason?: string;
    }
  ) => {
    return apiCall(`/leaves/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  
  
};


// Notification API
export const notificationAPI = {
  getNotifications: async () => {
    return apiCall('/notifications');
  },
  markAsRead: async (id: string) => {
    return apiCall(`/notifications/${id}/read`, { method: 'POST' });
  },
  updateFCMToken: async (token: string) => {
    return apiCall('/notifications/fcm-token', {
      method: 'POST',
      body: JSON.stringify({ fcmToken: token }),
    });
  },
};

// Mock data function (replace with actual API calls)
function getMockData(endpoint: string, method: string): any {
  // This is mock data for demonstration
  // Replace this entire function with actual fetch calls to your MySQL backend
  
  if (endpoint.includes('/auth/login')) {
    return {
      success: true,
      token: 'mock-jwt-token',
      user: {
        id: '1',
        name: 'John Admin',
        email: 'admin@frontpin.com',
        role: 'admin',
        avatar: null,
      },
    };
  }

  if (endpoint.includes('/reports/dashboard')) {
    return {
      totalEmployees: 156,
      presentToday: 142,
      onLeave: 8,
      pendingLeaves: 12,
      activeProjects: 24,
      completedTasks: 89,
      pendingTasks: 45,
      monthlyPayroll: 450000,
    };
  }

  if (endpoint.includes('/notifications')) {
    return [
      { id: '1', message: 'New leave request from Sarah Johnson', time: '5 min ago', read: false },
      { id: '2', message: 'Project Alpha deadline approaching', time: '1 hour ago', read: false },
      { id: '3', message: 'Overtime request approved', time: '2 hours ago', read: true },
    ];
  }

  return { success: true, data: [] };
}