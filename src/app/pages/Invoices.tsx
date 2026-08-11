import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Plus, Search, Download, Eye, X, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { projectAPI, invoiceAPI } from '../services/api'; // Assuming APIs
import { Link } from 'react-router';

interface Invoice {
  id: number;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  total: number;
  currency: string;
  status: string;
  client: {
    id: number;
    name: string;
  } | null;
}


interface Client {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

interface InvoiceItem {
  name: string;
  description: string;
  quantity: number;
  price: number;
  discountType: 'flat' | 'percent';
  discountValue: number;
}

export const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [newInvoiceOpen, setNewInvoiceOpen] = useState(false);

  // Form states
  const [createDate, setCreateDate] = useState('2026-02-19'); // From tool
  const [dueDate, setDueDate] = useState('');
  const [clientType, setClientType] = useState<'existing' | 'new'>('existing');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientStreet, setClientStreet] = useState('');
  const [clientState, setClientState] = useState('');
  const [clientZip, setClientZip] = useState('');
  const [dateFilter, setDateFilter] = useState("all");
const [startDate, setStartDate] = useState("");
const [endDate, setEndDate] = useState("");
const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

  const [items, setItems] = useState<InvoiceItem[]>([
    { name: '', description: '', quantity: 1, price: 0, discountType: 'flat', discountValue: 0 },
  ]);
  const [currency, setCurrency] = useState('USD');
  const [overallDiscountType, setOverallDiscountType] = useState<'flat' | 'percent'>('flat');
  const [overallDiscountValue, setOverallDiscountValue] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);

  const filteredInvoices = invoices.filter((invoice) => {
    if (
      searchQuery &&
      !invoice.client.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    if (filterStatus !== 'all' &&   invoice.status.toLowerCase() !== filterStatus ) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const normalized = status.toLowerCase();
  
    const variants: Record<string, string> = {
      paid: 'bg-green-100 text-green-800',
      unpaid: 'bg-yellow-100 text-yellow-800',
      partially_paid: 'bg-blue-100 text-blue-800',
      overdue: 'bg-red-100 text-red-800',
      draft: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-gray-300 text-gray-800',
    };
  
    return (
      <Badge className={variants[normalized] || 'bg-gray-100 text-gray-800'}>
        {normalized.replace('_', ' ')}
      </Badge>
    );
  };
  const fetchInvoices = async () => {
    try {
      const params: any = {};
  
      if (filterStatus !== "all") params.status = filterStatus.toUpperCase();
      if (selectedCompanyId) params.companyId = selectedCompanyId;
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }
  
      const res = await invoiceAPI.getInvoices(params);
      setInvoices(res.data);
    } catch {
      toast.error("Failed to load invoices");
    }
  };
  useEffect(() => {
    fetchInvoices();
  }, [filterStatus, selectedCompanyId, startDate, endDate]);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const clientsRes = await projectAPI.getClients();
        setClients(clientsRes.data);
      } catch (err) {
        toast.error('Failed to load data');
      }
    };
    fetchData();
  }, []);
  useEffect(() => {
    const today = new Date();
    let start = "";
    let end = "";
  
    if (dateFilter === "today") {
      start = today.toISOString().split("T")[0];
      end = start;
    }
  
    if (dateFilter === "week") {
      const first = new Date(today.setDate(today.getDate() - today.getDay()));
      start = first.toISOString().split("T")[0];
      end = new Date().toISOString().split("T")[0];
    }
  
    if (dateFilter === "month") {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      start = first.toISOString().split("T")[0];
      end = new Date().toISOString().split("T")[0];
    }
  
    if (dateFilter !== "custom") {
      setStartDate(start);
      setEndDate(end);
    }
  }, [dateFilter]);
  
  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const addItem = () => {
    setItems([
      ...items,
      { name: '', description: '', quantity: 1, price: 0, discountType: 'flat', discountValue: 0 },
    ]);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateItemSubtotal = (item: InvoiceItem) => {
    const base = item.quantity * item.price;
    const discount =
      item.discountType === 'percent'
        ? (base * item.discountValue) / 100
        : item.discountValue;
    return base - discount;
  };

  const subtotal = items.reduce((sum, item) => sum + calculateItemSubtotal(item), 0);

  const overallDiscount =
    overallDiscountType === 'percent'
      ? (subtotal * overallDiscountValue) / 100
      : overallDiscountValue;

  const taxable = subtotal - overallDiscount;
  const taxAmount = (taxable * taxPercent) / 100;
  const grandTotal = taxable + taxAmount;

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await invoiceAPI.deleteInvoice(deleteId);
      toast.success("Invoice deleted");
      setDeleteId(null);
      fetchInvoices();
    } catch {
      toast.error("Delete failed");
    }
  };
  const stats = {
    total: invoices.reduce((sum, i) => sum + i.total, 0),
    paid: invoices.filter(i => i.status === "PAID").reduce((s,i)=>s+i.total,0),
    overdue: invoices.filter(i => i.status === "OVERDUE").reduce((s,i)=>s+i.total,0),
    unpaid: invoices.filter(i => i.status === "UNPAID").reduce((s,i)=>s+i.total,0),
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Invoice Management</h2>
          <p className="text-gray-600">Manage client invoices and payments</p>
        </div>
      
          <Button asChild>
  <Link to="/invoices/add-new">
    <Plus className="mr-2 size-4" />
    New Invoice
  </Link>
</Button>

          
      
        
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  <Card>
    <CardContent className="pt-6">
      <p className="text-sm text-gray-500">Total</p>
      <h3 className="text-xl font-bold">{stats.total.toLocaleString()}</h3>
    </CardContent>
  </Card>

  <Card>
    <CardContent className="pt-6">
      <p className="text-sm text-green-600">Paid</p>
      <h3 className="text-xl font-bold">{stats.paid.toLocaleString()}</h3>
    </CardContent>
  </Card>

  <Card>
    <CardContent className="pt-6">
      <p className="text-sm text-red-600">Overdue</p>
      <h3 className="text-xl font-bold">{stats.overdue.toLocaleString()}</h3>
    </CardContent>
  </Card>

  <Card>
    <CardContent className="pt-6">
      <p className="text-sm text-yellow-600">Unpaid</p>
      <h3 className="text-xl font-bold">{stats.unpaid.toLocaleString()}</h3>
    </CardContent>
  </Card>
</div>


      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <SearchableSelect
              className="w-[180px]"
              placeholder="All Clients"
              searchPlaceholder="Search client..."
              value={selectedCompanyId?.toString() || "all"}
              onValueChange={(val) =>
                setSelectedCompanyId(val === "all" ? null : Number(val))
              }
              options={[
                { value: "all", label: "All Clients" },
                ...clients.map((c) => ({
                  value: c.id.toString(),
                  label: c.name,
                })),
              ]}
            />

            <SearchableSelect
              className="w-[150px]"
              placeholder="All Status"
              searchPlaceholder="Search status..."
              value={filterStatus}
              onValueChange={setFilterStatus}
              options={[
                { value: "all", label: "All Status" },
                { value: "paid", label: "Paid" },
                { value: "pending", label: "Pending" },
                { value: "overdue", label: "Overdue" },
                { value: "draft", label: "Draft" },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              
  {filteredInvoices.map((invoice) => (
    <TableRow key={invoice.id}>
      <TableCell className="font-medium">
        {invoice.invoiceNumber}
      </TableCell>

      <TableCell>
        {invoice.client?.name || "Walk-in Client"}
      </TableCell>

      <TableCell className="font-semibold">
        {invoice.currency} {invoice.total.toLocaleString()}
      </TableCell>

      <TableCell>
        {new Date(invoice.issueDate).toLocaleDateString()}
      </TableCell>

      <TableCell>
        {invoice.dueDate
          ? new Date(invoice.dueDate).toLocaleDateString()
          : "-"}
      </TableCell>

      <TableCell>
        {getStatusBadge(invoice.status)}
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2">
          <Link to={`/invoices/view/${invoice.id}`}>
          <Button variant="ghost" size="sm">
            <Eye className="size-4" />
          </Button>
          </Link>
          <Link to={`/invoices/edit/${invoice.id}`}>
          <Button variant="ghost" size="sm">
            <Edit2 className="size-4" />
          </Button>
          </Link>
          <Button
  variant="ghost"
  size="sm"
  onClick={() => setDeleteId(invoice.id)}
>
  <X className="size-4 text-red-500" />
</Button>
          {/* <Button variant="ghost" size="sm">
            <Download className="size-4" />
          </Button> */}
        </div>
      </TableCell>
    </TableRow>
  ))}

              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Delete</DialogTitle>
    </DialogHeader>

    <p>Are you sure you want to delete this invoice?</p>

    <div className="flex justify-end gap-2 mt-4">
      <Button variant="outline" onClick={() => setDeleteId(null)}>
        Cancel
      </Button>
      <Button variant="destructive" onClick={handleDelete}>
        Delete
      </Button>
    </div>
  </DialogContent>
</Dialog>

    </div>
  );
};