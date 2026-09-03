// src/pages/EditInvoice.tsx
import React, { useEffect, useState } from 'react';

import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../components/ui/dialog';
import { Plus, Trash2, ArrowLeft, Eye, X } from 'lucide-react';
import { toast } from 'sonner';
import { invoiceAPI, projectAPI, invoiceCompanyAPI } from '../services/api';

// PDF Renderer
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import { PDFViewer } from '@react-pdf/renderer';
import { useNavigate, useParams } from 'react-router';

const pdfStyles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  logo: { width: 90, height: 90, objectFit: 'contain' },
  companyInfo: { textAlign: 'right', fontSize: 11, lineHeight: 1.4 },
  invoiceTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: '#1e40af' },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#374151' },
  clientInfo: { fontSize: 12, lineHeight: 1.5, marginBottom: 20 },
  dates: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, fontSize: 12 },
  table: { display: 'table', width: 'auto', borderStyle: 'solid', borderWidth: 1, borderColor: '#d1d5db', marginBottom: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6' },
  tableRow: { flexDirection: 'row' },
  tableColHeader: { width: '25%', borderStyle: 'solid', borderWidth: 1, borderColor: '#d1d5db', padding: 8, fontSize: 11, fontWeight: 'bold' },
  tableCol: { width: '25%', borderStyle: 'solid', borderWidth: 1, borderColor: '#d1d5db', padding: 8, fontSize: 11 },
  totalsSection: { alignItems: 'flex-end', fontSize: 12, marginTop: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', width: '50%', marginBottom: 4 },
  grandTotal: { fontSize: 14, fontWeight: 'bold', borderTopWidth: 1, borderTopColor: '#000', paddingTop: 8, marginTop: 8 },
});

const InvoicePDF = ({ data }: { data: any }) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <View style={pdfStyles.header}>
        {data.company?.logoUrl && <Image style={pdfStyles.logo} src={data.company.logoUrl} />}
        <View style={pdfStyles.companyInfo}>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{data.company?.name || 'Your Company'}</Text>
          <Text>{data.company?.title || ''}</Text>
          <Text>Phone: {data.company?.phone || '—'}</Text>
          {data.company?.email && <Text>Email: {data.company.email}</Text>}
          {data.company?.vat && <Text>VAT: {data.company.vat}</Text>}
        </View>
      </View>

      <Text style={pdfStyles.invoiceTitle}>INVOICE</Text>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
        <View>
          <Text style={pdfStyles.sectionTitle}>Bill To:</Text>
          <View style={pdfStyles.clientInfo}>
            <Text>{data.client?.name || '—'}</Text>
            <Text>{data.client?.phone || '—'}</Text>
            {data.client?.email && <Text>{data.client.email}</Text>}
            {data.client?.address && (
              <Text>
                {data.client.address}, {data.client.city || ''} {data.client.state || ''} {data.client.zip || ''}
              </Text>
            )}
          </View>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <View style={pdfStyles.dates}>
            <View>
              <Text style={{ fontWeight: 'bold' }}>Issue Date:</Text>
              <Text>{data.issueDate}</Text>
            </View>
          </View>
          <View style={pdfStyles.dates}>
            <View>
              <Text style={{ fontWeight: 'bold' }}>Due Date:</Text>
              <Text>{data.dueDate || '—'}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={pdfStyles.table}>
        <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]}>
          <View style={[pdfStyles.tableColHeader, { width: '30%' }]}><Text>Item</Text></View>
          <View style={[pdfStyles.tableColHeader, { width: '30%' }]}><Text>Description</Text></View>
          <View style={[pdfStyles.tableColHeader, { width: '10%' }]}><Text>Qty</Text></View>
          <View style={[pdfStyles.tableColHeader, { width: '15%' }]}><Text>Unit Price</Text></View>
          <View style={[pdfStyles.tableColHeader, { width: '15%' }]}><Text>Total</Text></View>
        </View>

        {data.items.map((item: any, index: number) => {
          const itemTotal = item.quantity * item.unitPrice -
            (item.discountType === 'percent'
              ? (item.quantity * item.unitPrice * item.discountValue / 100)
              : item.discountValue);

          return (
            <View key={index} style={pdfStyles.tableRow}>
              <View style={[pdfStyles.tableCol, { width: '30%' }]}><Text>{item.name}</Text></View>
              <View style={[pdfStyles.tableCol, { width: '30%' }]}><Text>{item.description || '—'}</Text></View>
              <View style={[pdfStyles.tableCol, { width: '10%' }]}><Text>{item.quantity}</Text></View>
              <View style={[pdfStyles.tableCol, { width: '15%' }]}><Text>{item.unitPrice.toFixed(2)}</Text></View>
              <View style={[pdfStyles.tableCol, { width: '15%' }]}><Text>{itemTotal.toFixed(2)}</Text></View>
            </View>
          );
        })}
      </View>

      <View style={pdfStyles.totalsSection}>
        <View style={pdfStyles.totalRow}>
          <Text>Subtotal:</Text>
          <Text>{data.subtotal.toFixed(2)} {data.currency}</Text>
        </View>
        <View style={pdfStyles.totalRow}>
          <Text>Discount:</Text>
          <Text>-{data.globalDiscountAmount.toFixed(2)} {data.currency}</Text>
        </View>
        <View style={pdfStyles.totalRow}>
          <Text>Tax ({data.taxRate}%):</Text>
          <Text>{data.taxAmount.toFixed(2)} {data.currency}</Text>
        </View>
        <View style={[pdfStyles.totalRow, pdfStyles.grandTotal]}>
          <Text>Grand Total:</Text>
          <Text>{data.grandTotal.toFixed(2)} {data.currency}</Text>
        </View>
      </View>
    </Page>
  </Document>
);

// Interfaces
interface Client {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface Company {
  id: number;
  name: string;
  title: string;
  phone: string;
  logoUrl?: string;
  email?: string;
  vat?: string;
}

interface InvoiceItem {
  id?: number; // optional for existing items
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountType: 'flat' | 'percent';
  discountValue: number;
}

interface Invoice {
  id: number;
  invoiceNumber?: string;
  issueDate: string;
  dueDate?: string;
  currency: string;
  items: InvoiceItem[];
  globalDiscountType: 'flat' | 'percent';
  globalDiscountValue: number;
  taxRate: number;
  companyId: number;
  clientId?: number;
  client?: Client; // if new client
  // ... other fields
}

export default function EditInvoice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [clients, setClients] = useState<Client[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Company form (for adding new)
  const [companyName, setCompanyName] = useState('');
  const [companyTitle, setCompanyTitle] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyLogo, setCompanyLogo] = useState<File | null>(null);
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyVat, setCompanyVat] = useState('');

  // Invoice form
  const today = new Date().toISOString().split('T')[0];
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [clientType, setClientType] = useState<'existing' | 'new'>('existing');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [newClient, setNewClient] = useState({
    name: '', phone: '', email: '', address: '', city: '', state: '', zip: '',
  });
 const [invoice,setInvoice] = useState(null)
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [currency, setCurrency] = useState('USD');
  const [globalDiscountType, setGlobalDiscountType] = useState<'flat' | 'percent'>('flat');
  const [globalDiscountValue, setGlobalDiscountValue] = useState(0);
  const [taxRate, setTaxRate] = useState(0);

  // Load invoice + dropdown data
  useEffect(() => {
    async function loadData() {
      try {
        const [invoiceRes, clientsRes, companiesRes] = await Promise.all([
          invoiceAPI.getSingleInvoice(Number(id)),
          projectAPI.getClients(),
          invoiceCompanyAPI.getAll(),
        ]);

        const inv: Invoice = invoiceRes.data;

        // Pre-fill form
        setIssueDate(inv.issueDate?.split('T')[0] || today);
        setDueDate(inv.dueDate ? inv.dueDate.split('T')[0] : '');
        setSelectedCompanyId(inv.companyId?.toString() || '');
        setCurrency(inv.currency || 'USD');
        setGlobalDiscountType(inv.globalDiscountType || 'flat');
        setGlobalDiscountValue(inv.globalDiscountValue || 0);
        setTaxRate(inv.taxRate || 0);

        // Items
        setItems(
          inv.items.map((it: any) => ({
            id: it.id,
            name: it.name,
            description: it.description || '',
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discountType: it.discountType || 'flat',
            discountValue: it.discountValue || 0,
          }))
        );

        // Client logic
        if (inv.clientId) {
          setClientType('existing');
          setSelectedClientId(inv.clientId.toString());
        } else if (inv.client) {
          setClientType('new');
          setNewClient({
            name: inv.client.name || '',
            phone: inv.client.phone || '',
            email: inv.client.email || '',
            address: inv.client.address || '',
            city: inv.client.city || '',
            state: inv.client.state || '',
            zip: inv.client.zip || '',
          });
        }

        setClients(clientsRes.data || []);
        setCompanies(companiesRes.data || []);
      } catch (err) {
        toast.error('Failed to load invoice or data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  // Calculations (same as create)
  const calculateItemTotal = (item: InvoiceItem) => {
    const base = item.quantity * item.unitPrice;
    const discount = item.discountType === 'percent'
      ? base * (item.discountValue / 100)
      : item.discountValue;
    return Math.max(0, base - discount);
  };

  const lineTotals = items.map(calculateItemTotal);
  const subtotal = lineTotals.reduce((sum, val) => sum + val, 0);

  const globalDiscountAmount = globalDiscountType === 'percent'
    ? subtotal * (globalDiscountValue / 100)
    : globalDiscountValue;

  const afterDiscount = Math.max(0, subtotal - globalDiscountAmount);
  const taxAmount = afterDiscount * (taxRate / 100);
  const grandTotal = afterDiscount + taxAmount;

  // Item handlers (same)
  const addItem = () => {
    setItems([...items, { name: '', description: '', quantity: 1, unitPrice: 0, discountType: 'flat', discountValue: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return toast.warning('At least one item is required');
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  // Add Company (same)
  const handleAddCompany = async () => {
    if (!companyName.trim() || !companyTitle.trim() || !companyPhone.trim()) {
      return toast.error('Name, Title and Phone are required');
    }

    const formData = new FormData();
    formData.append('data', JSON.stringify({
      name: companyName,
      title: companyTitle,
      phone: companyPhone,
      email: companyEmail || undefined,
      vat: companyVat || undefined,
    }));

    if (companyLogo) formData.append('logo', companyLogo);

    try {
      const res = await invoiceCompanyAPI.create(formData);
      toast.success('Company created');
      setAddCompanyOpen(false);

      const fresh = await invoiceCompanyAPI.getAll();
      setCompanies(fresh.data || []);
      setSelectedCompanyId(res.data.id.toString());

      setCompanyName('');
      setCompanyTitle('');
      setCompanyPhone('');
      setCompanyLogo(null);
      setCompanyEmail('');
      setCompanyVat('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create company');
    }
  };

  // Update Invoice
  const handleUpdateInvoice = async () => {
    if (!selectedCompanyId) return toast.error('Please select a company');

    if (items.some(i => !i.name.trim() || i.quantity <= 0 || i.unitPrice <= 0)) {
      return toast.error('Every item must have name, quantity > 0 and price > 0');
    }

    if (clientType === 'existing' && !selectedClientId) {
      return toast.error('Please select an existing client');
    }

    if (clientType === 'new' && (!newClient.name.trim() || !newClient.phone.trim())) {
      return toast.error('New client must have name and phone');
    }

    const payload: any = {
      companyId: Number(selectedCompanyId),
      issueDate,
      dueDate: dueDate || null,
      currency,
      items: items.map(i => ({
        ...(i.id ? { id: i.id } : {}), // include id if editing existing item
        name: i.name,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discountType: i.discountType,
        discountValue: i.discountValue,
      })),
      globalDiscountType,
      globalDiscountValue,
      taxRate,
    };

    if (clientType === 'existing') {
      payload.clientId = Number(selectedClientId);
      payload.client = undefined;
    } else {
      payload.client = { ...newClient };
      payload.clientId = undefined;
    }

    try {
      await invoiceAPI.updateInvoice(Number(id), payload);
      toast.success('Invoice updated successfully');
      navigate(`/invoices/edit/${id}`); // or back to list: navigate('/invoices')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update invoice');
    }
  };

  // Preview Data
  const selectedCompany = companies.find(c => c.id === Number(selectedCompanyId));
  const selectedClient = clientType === 'existing'
    ? clients.find(c => c.id === Number(selectedClientId))
    : newClient;

  const previewData = {
    company: selectedCompany || { name: '', title: '', phone: '', logoUrl: '' },
    client: selectedClient || { name: '', phone: '' },
    issueDate,
    dueDate,
    items,
    subtotal,
    globalDiscountAmount,
    taxAmount,
    grandTotal,
    currency,
    taxRate,
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading invoice...</div>;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/invoices')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Edit Invoice {invoice?.invoiceNumber || ''}</h1>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setPreviewOpen(true)}
            disabled={!selectedCompanyId}
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview Invoice
          </Button>
          <Button onClick={handleUpdateInvoice}>Update Invoice</Button>
        </div>
      </div>

      {/* Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company */}
          <Card>
            <CardHeader className="flex-row justify-between items-center">
              <CardTitle>Company</CardTitle>
              <Dialog open={addCompanyOpen} onOpenChange={setAddCompanyOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Add Company
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Company</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Company Name *</Label>
                      <Input value={companyName} onChange={e => setCompanyName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Title / Tagline *</Label>
                      <Input value={companyTitle} onChange={e => setCompanyTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone *</Label>
                      <Input value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Logo Image</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={e => setCompanyLogo(e.target.files?.[0] || null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email (optional)</Label>
                      <Input value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>VAT / Tax ID (optional)</Label>
                      <Input value={companyVat} onChange={e => setCompanyVat(e.target.value)} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddCompanyOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddCompany}>Save Company</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader><CardTitle>Dates</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Issue Date</Label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={e => setIssueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date (optional)</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  min={issueDate}
                />
              </div>
            </CardContent>
          </Card>

          {/* Client */}
          <Card>
            <CardHeader><CardTitle>Client</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup
                value={clientType}
                onValueChange={v => setClientType(v as 'existing' | 'new')}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="existing" id="existing" />
                  <Label htmlFor="existing">Existing Client</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="new" />
                  <Label htmlFor="new">New Client</Label>
                </div>
              </RadioGroup>

              {clientType === 'existing' ? (
                <div className="space-y-2">
                  <Label>Select Client</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedClientId && (
                    <div className="mt-4 p-4 bg-gray-50 rounded text-sm space-y-1">
                      <p><strong>Phone:</strong> {clients.find(c => c.id === Number(selectedClientId))?.phone}</p>
                      {clients.find(c => c.id === Number(selectedClientId))?.email && (
                        <p><strong>Email:</strong> {clients.find(c => c.id === Number(selectedClientId))?.email}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      value={newClient.name}
                      onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone *</Label>
                    <Input
                      value={newClient.phone}
                      onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={newClient.email}
                      onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Street Address</Label>
                    <Input
                      value={newClient.address}
                      onChange={e => setNewClient({ ...newClient, address: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={newClient.city}
                      onChange={e => setNewClient({ ...newClient, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input
                      value={newClient.state}
                      onChange={e => setNewClient({ ...newClient, state: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ZIP / Postal Code</Label>
                    <Input
                      value={newClient.zip}
                      onChange={e => setNewClient({ ...newClient, zip: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Invoice Items</CardTitle>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-24">Qty</TableHead>
                      <TableHead className="w-28">Unit Price</TableHead>
                      <TableHead className="w-32">Discount</TableHead>
                      <TableHead className="w-28 text-right">Total</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Input
                            value={item.name}
                            onChange={e => updateItem(idx, 'name', e.target.value)}
                            placeholder="Item name"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.description}
                            onChange={e => updateItem(idx, 'description', e.target.value)}
                            placeholder="Optional"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={e => updateItem(idx, 'unitPrice', Number(e.target.value))}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Select
                              value={item.discountType}
                              onValueChange={v => updateItem(idx, 'discountType', v as 'flat' | 'percent')}
                            >
                              <SelectTrigger className="w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="flat">Flat</SelectItem>
                                <SelectItem value="percent">%</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.discountValue}
                              onChange={e => updateItem(idx, 'discountValue', Number(e.target.value))}
                              className="w-20"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {calculateItemTotal(item).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(idx)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right - Summary */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader><CardTitle>Invoice Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{subtotal.toFixed(2)} {currency}</span>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Global Discount</Label>
                <div className="flex gap-2">
                  <Select value={globalDiscountType} onValueChange={v => setGlobalDiscountType(v as any)}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat</SelectItem>
                      <SelectItem value="percent">%</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    value={globalDiscountValue}
                    onChange={e => setGlobalDiscountValue(Number(e.target.value))}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Tax Rate (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxRate}
                  onChange={e => setTaxRate(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between text-lg font-bold">
                  <span>Grand Total</span>
                  <span>{grandTotal.toFixed(2)} {currency}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateInvoice}>Update Invoice</Button>
          </div>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Invoice Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1">
            <PDFViewer width="100%" height="100%">
              <InvoicePDF data={previewData} />
            </PDFViewer>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Company Dialog */}
      <Dialog open={addCompanyOpen} onOpenChange={setAddCompanyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Company</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Title / Tagline *</Label>
              <Input value={companyTitle} onChange={e => setCompanyTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Logo Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={e => setCompanyLogo(e.target.files?.[0] || null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Email (optional)</Label>
              <Input value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>VAT / Tax ID (optional)</Label>
              <Input value={companyVat} onChange={e => setCompanyVat(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCompanyOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCompany}>Save Company</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}