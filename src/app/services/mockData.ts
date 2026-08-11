// Mock data for the application
// In production, all this data will come from your MySQL database

export const mockEmployees = [
  { id: '1', name: 'John Smith', email: 'john@company.com', role: 'admin', department: 'IT', position: 'Senior Developer', pin: '1234', avatar: null, salary: 85000, joinDate: '2020-01-15' },
  { id: '2', name: 'Sarah Johnson', email: 'sarah@company.com', role: 'supervisor', department: 'HR', position: 'HR Manager', pin: '5678', avatar: null, salary: 75000, joinDate: '2019-06-20' },
  { id: '3', name: 'Michael Brown', email: 'michael@company.com', role: 'employee', department: 'Sales', position: 'Sales Executive', pin: '9012', avatar: null, salary: 55000, joinDate: '2021-03-10' },
  { id: '4', name: 'Emily Davis', email: 'emily@company.com', role: 'employee', department: 'IT', position: 'Frontend Developer', pin: '3456', avatar: null, salary: 70000, joinDate: '2020-11-05' },
  { id: '5', name: 'David Wilson', email: 'david@company.com', role: 'employee', department: 'Marketing', position: 'Marketing Specialist', pin: '7890', avatar: null, salary: 60000, joinDate: '2021-08-15' },
];

export const mockAttendance = [
  { id: '1', employeeId: '1', employeeName: 'John Smith', date: '2026-02-16', checkIn: '09:00 AM', checkOut: '06:00 PM', status: 'present', hours: '9h' },
  { id: '2', employeeId: '2', employeeName: 'Sarah Johnson', date: '2026-02-16', checkIn: '08:45 AM', checkOut: '05:45 PM', status: 'present', hours: '9h' },
  { id: '3', employeeId: '3', employeeName: 'Michael Brown', date: '2026-02-16', checkIn: '09:15 AM', checkOut: null, status: 'present', hours: 'In Progress' },
  { id: '4', employeeId: '4', employeeName: 'Emily Davis', date: '2026-02-16', checkIn: null, checkOut: null, status: 'absent', hours: '0h' },
  { id: '5', employeeId: '5', employeeName: 'David Wilson', date: '2026-02-16', checkIn: '09:00 AM', checkOut: '06:00 PM', status: 'present', hours: '9h' },
];

export const mockProjects = [
  { id: '1', name: 'Website Redesign', client: 'Acme Corp', status: 'in-progress', progress: 65, startDate: '2026-01-15', endDate: '2026-03-30', budget: 50000, spent: 32500, teamSize: 5 },
  { id: '2', name: 'Mobile App Development', client: 'Tech Solutions', status: 'in-progress', progress: 40, startDate: '2026-02-01', endDate: '2026-05-15', budget: 75000, spent: 30000, teamSize: 7 },
  { id: '3', name: 'CRM Integration', client: 'Global Industries', status: 'planning', progress: 15, startDate: '2026-02-10', endDate: '2026-04-20', budget: 35000, spent: 5250, teamSize: 3 },
  { id: '4', name: 'Data Migration', client: 'Finance Co', status: 'completed', progress: 100, startDate: '2025-11-01', endDate: '2026-01-31', budget: 40000, spent: 38000, teamSize: 4 },
];

export const mockTasks = [
  { id: '1', title: 'Design homepage mockup', projectId: '1', assignedTo: 'Emily Davis', status: 'in-progress', priority: 'high', dueDate: '2026-02-20', description: 'Create high-fidelity mockup for new homepage' },
  { id: '2', title: 'Implement authentication', projectId: '2', assignedTo: 'John Smith', status: 'in-progress', priority: 'high', dueDate: '2026-02-18', description: 'Setup JWT authentication system' },
  { id: '3', title: 'Database schema design', projectId: '3', assignedTo: 'John Smith', status: 'todo', priority: 'medium', dueDate: '2026-02-25', description: 'Design database schema for CRM' },
  { id: '4', title: 'Write API documentation', projectId: '1', assignedTo: 'Michael Brown', status: 'todo', priority: 'low', dueDate: '2026-03-01', description: 'Document all API endpoints' },
  { id: '5', title: 'User testing', projectId: '1', assignedTo: 'Sarah Johnson', status: 'done', priority: 'medium', dueDate: '2026-02-10', description: 'Conduct user testing sessions' },
  { id: '6', title: 'Setup CI/CD pipeline', projectId: '2', assignedTo: 'David Wilson', status: 'in-progress', priority: 'high', dueDate: '2026-02-22', description: 'Configure automated deployment' },
];

export const mockInvoices = [
  { id: '1', invoiceNumber: 'INV-2026-001', client: 'Acme Corp', amount: 12500, status: 'paid', issueDate: '2026-02-01', dueDate: '2026-02-15', paidDate: '2026-02-14' },
  { id: '2', invoiceNumber: 'INV-2026-002', client: 'Tech Solutions', amount: 18750, status: 'pending', issueDate: '2026-02-10', dueDate: '2026-02-24', paidDate: null },
  { id: '3', invoiceNumber: 'INV-2026-003', client: 'Global Industries', amount: 8500, status: 'overdue', issueDate: '2026-01-20', dueDate: '2026-02-05', paidDate: null },
  { id: '4', invoiceNumber: 'INV-2026-004', client: 'Finance Co', amount: 15000, status: 'draft', issueDate: '2026-02-15', dueDate: '2026-03-01', paidDate: null },
];

export const mockLeaves = [
  { id: '1', employeeId: '2', employeeName: 'Sarah Johnson', type: 'annual', startDate: '2026-02-20', endDate: '2026-02-24', days: 5, status: 'pending', reason: 'Family vacation', appliedDate: '2026-02-10' },
  { id: '2', employeeId: '3', employeeName: 'Michael Brown', type: 'sick', startDate: '2026-02-17', endDate: '2026-02-17', days: 1, status: 'approved', reason: 'Medical appointment', appliedDate: '2026-02-16' },
  { id: '3', employeeId: '4', employeeName: 'Emily Davis', type: 'annual', startDate: '2026-03-01', endDate: '2026-03-05', days: 5, status: 'pending', reason: 'Personal travel', appliedDate: '2026-02-12' },
  { id: '4', employeeId: '5', employeeName: 'David Wilson', type: 'emergency', startDate: '2026-02-15', endDate: '2026-02-16', days: 2, status: 'approved', reason: 'Family emergency', appliedDate: '2026-02-14' },
];

export const mockOvertimes = [
  { id: '1', employeeId: '1', employeeName: 'John Smith', date: '2026-02-10', hours: 3, rate: 1.5, amount: 150, status: 'approved', reason: 'Project deadline' },
  { id: '2', employeeId: '3', employeeName: 'Michael Brown', date: '2026-02-12', hours: 2, rate: 1.5, amount: 80, status: 'pending', reason: 'Client meeting preparation' },
  { id: '3', employeeId: '4', employeeName: 'Emily Davis', date: '2026-02-14', hours: 4, rate: 1.5, amount: 180, status: 'approved', reason: 'Emergency bug fix' },
];

export const mockSchedules = [
  { id: '1', employeeId: '1', employeeName: 'John Smith', date: '2026-02-17', shift: 'Morning', startTime: '09:00', endTime: '18:00', location: 'Office' },
  { id: '2', employeeId: '2', employeeName: 'Sarah Johnson', date: '2026-02-17', shift: 'Morning', startTime: '08:00', endTime: '17:00', location: 'Office' },
  { id: '3', employeeId: '3', employeeName: 'Michael Brown', date: '2026-02-17', shift: 'Afternoon', startTime: '13:00', endTime: '22:00', location: 'Remote' },
  { id: '4', employeeId: '4', employeeName: 'Emily Davis', date: '2026-02-17', shift: 'Morning', startTime: '09:00', endTime: '18:00', location: 'Office' },
];

export const mockLocations = [
  { id: '1', name: 'Headquarters', address: '123 Business Ave, New York, NY 10001', type: 'office', capacity: 150, active: true },
  { id: '2', name: 'West Branch', address: '456 Tech Park, San Francisco, CA 94102', type: 'office', capacity: 80, active: true },
  { id: '3', name: 'East Branch', address: '789 Innovation Dr, Boston, MA 02101', type: 'office', capacity: 60, active: true },
  { id: '4', name: 'Remote', address: 'Various Locations', type: 'remote', capacity: 999, active: true },
];

export const mockApplicants = [
  { id: '1', name: 'Alex Thompson', email: 'alex@email.com', phone: '+1-555-0101', position: 'Frontend Developer', status: 'interview', appliedDate: '2026-02-01', experience: '3 years', resume: 'resume.pdf' },
  { id: '2', name: 'Jessica Lee', email: 'jessica@email.com', phone: '+1-555-0102', position: 'HR Assistant', status: 'review', appliedDate: '2026-02-05', experience: '2 years', resume: 'resume.pdf' },
  { id: '3', name: 'Robert Chen', email: 'robert@email.com', phone: '+1-555-0103', position: 'Backend Developer', status: 'offer', appliedDate: '2026-01-28', experience: '5 years', resume: 'resume.pdf' },
  { id: '4', name: 'Maria Garcia', email: 'maria@email.com', phone: '+1-555-0104', position: 'Marketing Manager', status: 'rejected', appliedDate: '2026-02-08', experience: '4 years', resume: 'resume.pdf' },
];

export const mockPerformance = [
  { id: '1', employeeId: '1', employeeName: 'John Smith', period: 'Q4 2025', rating: 4.5, strengths: 'Technical leadership, code quality', improvements: 'Communication with stakeholders', reviewDate: '2026-01-15', reviewer: 'Sarah Johnson' },
  { id: '2', employeeId: '3', employeeName: 'Michael Brown', period: 'Q4 2025', rating: 4.0, strengths: 'Client relationships, sales targets', improvements: 'Time management', reviewDate: '2026-01-20', reviewer: 'Sarah Johnson' },
  { id: '3', employeeId: '4', employeeName: 'Emily Davis', period: 'Q4 2025', rating: 4.8, strengths: 'Design skills, creativity', improvements: 'Team collaboration', reviewDate: '2026-01-18', reviewer: 'John Smith' },
];

export const mockAssets = [
  { id: '1', name: 'MacBook Pro 16"', category: 'laptop', serialNumber: 'MBP2023001', assignedTo: 'John Smith', status: 'assigned', purchaseDate: '2023-05-15', value: 2500 },
  { id: '2', name: 'iPhone 15 Pro', category: 'phone', serialNumber: 'IPH2024001', assignedTo: 'Sarah Johnson', status: 'assigned', purchaseDate: '2024-01-20', value: 1200 },
  { id: '3', name: 'Dell Monitor 27"', category: 'monitor', serialNumber: 'MON2023015', assignedTo: 'Emily Davis', status: 'assigned', purchaseDate: '2023-08-10', value: 450 },
  { id: '4', name: 'Herman Miller Chair', category: 'furniture', serialNumber: 'FUR2023020', assignedTo: null, status: 'available', purchaseDate: '2023-06-01', value: 800 },
  { id: '5', name: 'iPad Pro 12.9"', category: 'tablet', serialNumber: 'IPD2024005', assignedTo: 'Michael Brown', status: 'assigned', purchaseDate: '2024-02-10', value: 1100 },
];

export const mockPayrolls = [
  { id: '1', employeeId: '1', employeeName: 'John Smith', month: 'January 2026', baseSalary: 7083, overtime: 150, bonus: 500, deductions: 850, netPay: 6883, status: 'paid', paidDate: '2026-02-01' },
  { id: '2', employeeId: '2', employeeName: 'Sarah Johnson', month: 'January 2026', baseSalary: 6250, overtime: 0, bonus: 300, deductions: 750, netPay: 5800, status: 'paid', paidDate: '2026-02-01' },
  { id: '3', employeeId: '3', employeeName: 'Michael Brown', month: 'January 2026', baseSalary: 4583, overtime: 80, bonus: 200, deductions: 550, netPay: 4313, status: 'paid', paidDate: '2026-02-01' },
  { id: '4', employeeId: '4', employeeName: 'Emily Davis', month: 'January 2026', baseSalary: 5833, overtime: 180, bonus: 250, deductions: 700, netPay: 5563, status: 'paid', paidDate: '2026-02-01' },
  { id: '5', employeeId: '5', employeeName: 'David Wilson', month: 'January 2026', baseSalary: 5000, overtime: 0, bonus: 150, deductions: 600, netPay: 4550, status: 'pending', paidDate: null },
];
