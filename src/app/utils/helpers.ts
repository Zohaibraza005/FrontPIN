/**
 * FRONTPIN - Enterprise Company Management System
 * 
 * OVERVIEW:
 * FRONTPIN is a comprehensive company management software built with React, TypeScript, and Tailwind CSS.
 * It includes role-based access control (Admin, Supervisor, Employee) and integrates with MySQL backend.
 * 
 * KEY FEATURES:
 * 
 * 1. AUTHENTICATION & AUTHORIZATION
 *    - Role-based access: Admin, Supervisor, Employee
 *    - JWT token authentication
 *    - Secure PIN system for attendance
 * 
 * 2. ATTENDANCE MANAGEMENT
 *    - Check-in/check-out with 4-digit PIN
 *    - Multi-location support
 *    - Real-time attendance tracking
 *    - Attendance reports and analytics
 * 
 * 3. SCHEDULE MANAGEMENT
 *    - Employee shift scheduling
 *    - Location-based schedules
 *    - Calendar view
 * 
 * 4. PROJECT MANAGEMENT
 *    - Project tracking with progress indicators
 *    - Budget vs. spent tracking
 *    - Team size management
 *    - Status workflows (Planning, In Progress, Completed, On Hold)
 * 
 * 5. TASK MANAGEMENT
 *    - Kanban board view (drag & drop)
 *    - Table view with filters
 *    - Priority levels (Low, Medium, High)
 *    - Task assignment to employees
 *    - Project-based task organization
 * 
 * 6. INVOICE MANAGEMENT
 *    - Invoice creation and tracking
 *    - Payment status (Paid, Pending, Overdue, Draft)
 *    - Client management
 * 
 * 7. LEAVE MANAGEMENT
 *    - Leave request submission
 *    - Multiple leave types (Annual, Sick, Emergency, Casual)
 *    - Approval workflow for supervisors and admins
 *    - Leave balance tracking
 * 
 * 8. OVERTIME MANAGEMENT
 *    - Overtime hour logging
 *    - Overtime rate calculation
 *    - Approval system
 * 
 * 9. EMPLOYEE MANAGEMENT
 *    - Employee directory with search and filters
 *    - Department and position tracking
 *    - PIN management for attendance
 *    - Role assignment
 * 
 * 10. PAYROLL MANAGEMENT (Admin only)
 *     - Salary calculations
 *     - Overtime and bonus integration
 *     - Deductions tracking
 *     - Payroll generation and processing
 * 
 * 11. LOCATION MANAGEMENT (Admin only)
 *     - Multiple office/location support
 *     - Capacity tracking
 *     - Location-based operations
 * 
 * 12. APPLICANT TRACKING SYSTEM (ATS)
 *     - Job application management
 *     - Candidate pipeline (Review, Interview, Offer, Rejected)
 *     - Contact information tracking
 * 
 * 13. PERFORMANCE MANAGEMENT
 *     - Performance reviews
 *     - Rating system (0-5 scale)
 *     - Strengths and improvement areas
 *     - Review period tracking
 * 
 * 14. ASSET MANAGEMENT
 *     - IT and physical asset tracking
 *     - Asset assignment to employees
 *     - Serial number tracking
 *     - Asset value and purchase date
 * 
 * 15. REPORTS & ANALYTICS
 *     - Dashboard with key metrics
 *     - Attendance reports
 *     - Project analytics
 *     - Leave statistics
 *     - Payroll trends
 *     - Task completion metrics
 * 
 * 16. NOTIFICATIONS
 *     - Real-time notification system
 *     - Firebase Cloud Messaging (FCM) support
 *     - Unread notification counter
 *     - Mark as read functionality
 * 
 * 17. GUIDED TOUR
 *     - Interactive application tour using React Joyride
 *     - First-time user onboarding
 * 
 * TECHNOLOGY STACK:
 * - React 18.3.1 with TypeScript
 * - React Router 7 for navigation
 * - Tailwind CSS v4 for styling
 * - Shadcn/ui component library
 * - Recharts for data visualization
 * - React DnD for drag & drop
 * - React Joyride for tours
 * - Sonner for toast notifications
 * - Date-fns for date manipulation
 * - Lucide React for icons
 * 
 * ARCHITECTURE:
 * 
 * /src/app/
 * ├── App.tsx                    # Main application component
 * ├── routes.tsx                 # React Router configuration
 * ├── components/
 * │   ├── Layout.tsx            # Main layout with sidebar
 * │   └── ui/                   # Reusable UI components
 * ├── contexts/
 * │   ├── AuthContext.tsx       # Authentication state management
 * │   ├── NotificationContext.tsx # Notification management
 * │   └── TourContext.tsx       # Application tour
 * ├── pages/
 * │   ├── Login.tsx             # Login page
 * │   ├── Dashboard.tsx         # Main dashboard with analytics
 * │   ├── Attendance.tsx        # Attendance check-in/out
 * │   ├── Schedule.tsx          # Employee scheduling
 * │   ├── Projects.tsx          # Project management
 * │   ├── Tasks.tsx             # Task board (Kanban + Table)
 * │   ├── Invoices.tsx          # Invoice management
 * │   ├── Leave.tsx             # Leave requests
 * │   ├���─ Overtime.tsx          # Overtime tracking
 * │   ├── Employees.tsx         # Employee directory
 * │   ├── Payroll.tsx           # Payroll processing
 * │   ├── Locations.tsx         # Location management
 * │   ├── Applicants.tsx        # Applicant tracking
 * │   ├── Performance.tsx       # Performance reviews
 * │   ├── Assets.tsx            # Asset management
 * │   ├── Reports.tsx           # Analytics and reports
 * │   └── NotFound.tsx          # 404 page
 * └── services/
 *     ├── api.ts                # API service layer for backend
 *     ├── mockData.ts           # Mock data for development
 *     └── firebase-config.ts    # Firebase FCM configuration
 * 
 * ROLE-BASED ACCESS:
 * 
 * ADMIN:
 * - Full access to all modules
 * - Employee management (create, edit, delete)
 * - Payroll management
 * - Location management
 * - Approve/reject leave and overtime
 * - System configuration
 * 
 * SUPERVISOR:
 * - Schedule management
 * - Project and task management
 * - Approve/reject leave and overtime
 * - View employee information
 * - Reports and analytics
 * - ATS and performance reviews
 * 
 * EMPLOYEE:
 * - Check-in/check-out attendance
 * - View own schedule
 * - View projects and tasks
 * - Submit leave requests
 * - Submit overtime requests
 * - View own payroll information
 * 
 * INTEGRATION WITH MYSQL BACKEND:
 * 
 * 1. Update API_BASE_URL in /src/app/services/api.ts
 * 2. Uncomment fetch() calls in the apiCall() function
 * 3. Implement backend endpoints as documented in api.ts
 * 4. Create MySQL database schema as recommended
 * 5. Implement JWT authentication on backend
 * 6. Hash PINs before storing in database
 * 7. Setup CORS for frontend-backend communication
 * 
 * SECURITY CONSIDERATIONS:
 * - Store JWT tokens securely (HttpOnly cookies recommended for production)
 * - Hash employee PINs before storing
 * - Implement rate limiting on authentication endpoints
 * - Validate all user inputs on backend
 * - Use HTTPS in production
 * - Implement proper CORS policies
 * - Don't store sensitive data in localStorage in production
 * 
 * DEPLOYMENT:
 * 1. Build: npm run build
 * 2. Deploy built files to your hosting service
 * 3. Configure environment variables for production
 * 4. Setup backend API server
 * 5. Configure MySQL database
 * 6. Setup Firebase for push notifications (optional)
 * 
 * FUTURE ENHANCEMENTS:
 * - Two-factor authentication
 * - Advanced reporting with custom date ranges
 * - Document management system
 * - Time tracking with screenshots
 * - Mobile app (React Native)
 * - Biometric authentication for attendance
 * - AI-powered performance insights
 * - Integration with popular HR tools
 * - Custom workflow builder
 * - Advanced role permissions
 */

// Utility functions for the application

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

export const calculateWorkHours = (checkIn: string, checkOut: string): number => {
  const [inHour, inMin] = checkIn.split(':').map(Number);
  const [outHour, outMin] = checkOut.split(':').map(Number);
  
  const inMinutes = inHour * 60 + inMin;
  const outMinutes = outHour * 60 + outMin;
  
  return (outMinutes - inMinutes) / 60;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePIN = (pin: string): boolean => {
  return /^\d{4}$/.test(pin);
};

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    active: 'green',
    inactive: 'gray',
    pending: 'yellow',
    approved: 'green',
    rejected: 'red',
    completed: 'green',
    'in-progress': 'blue',
    planning: 'gray',
    overdue: 'red',
  };
  return colors[status.toLowerCase()] || 'gray';
};
