import React, { useEffect, useState } from "react";

import { invoiceAPI } from "../services/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import { Download, Plus, Edit, Trash2, Calendar, User } from "lucide-react";
import { useAuth } from "../contexts/AuthContext"; // Assume this for role
import { useParams } from "react-router";
import { Label } from "../components/ui/label";

export const InvoiceView = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user.role === "ADMIN";

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [editTransactionOpen, setEditTransactionOpen] = useState(false);
  const [editTransactionId, setEditTransactionId] = useState<number | null>(null);
  const [deleteTransactionId, setDeleteTransactionId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [referenceId, setReferenceId] = useState("");

  const fetchInvoice = async () => {
    try {
      const res = await invoiceAPI.getSingleInvoice(Number(id));
      setInvoice(res.data);
    } catch {
      toast.error("Failed to load invoice");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!invoice) return <div>Invoice not found</div>;

  const remaining = invoice.total - invoice.paidAmount;

  const handleAddPayment = async () => {
    const numAmount = Number(amount);
    if (numAmount <= 0) {
      toast.error("Amount must be positive");
      return;
    }
    if (numAmount > remaining) {
      toast.error("Amount cannot exceed remaining balance");
      return;
    }

    try {
      await invoiceAPI.addTransaction(invoice.id, {
        amount: numAmount,
        paymentMethod,
        referenceId,
      });
      toast.success("Payment added");
      setTransactionOpen(false);
      fetchInvoice();
      setAmount("");
      setPaymentMethod("cash");
      setReferenceId("");
    } catch {
      toast.error("Failed to add payment");
    }
  };

  const handleEditPayment = async () => {
    const numAmount = Number(amount);
    if (numAmount <= 0) {
      toast.error("Amount must be positive");
      return;
    }
    const currentTransaction = invoice.transactions.find((t: any) => t.id === editTransactionId);
    const oldAmount = currentTransaction.amount;
    const newRemaining = invoice.total - (invoice.paidAmount - oldAmount + numAmount);
    if (numAmount > oldAmount + remaining) {
      toast.error("Amount cannot exceed remaining balance");
      return;
    }

    try {
      await invoiceAPI.updateTransaction(editTransactionId!, {
        amount: numAmount,
        paymentMethod,
        referenceId,
      });
      toast.success("Payment updated");
      setEditTransactionOpen(false);
      fetchInvoice();
      setAmount("");
      setPaymentMethod("cash");
      setReferenceId("");
      setEditTransactionId(null);
    } catch {
      toast.error("Failed to update payment");
    }
  };

  const handleDeletePayment = async () => {
    try {
      await invoiceAPI.deleteTransaction(deleteTransactionId!);
      toast.success("Payment deleted");
      setDeleteTransactionId(null);
      fetchInvoice();
    } catch {
      toast.error("Failed to delete payment");
    }
  };

  const openEdit = (t: any) => {
    setEditTransactionId(t.id);
    setAmount(t.amount.toString());
    setPaymentMethod(t.paymentMethod);
    setReferenceId(t.referenceId || "");
    setEditTransactionOpen(true);
  };
  const isDraft = invoice.status === "DRAFT";

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">
            Invoice {invoice.invoiceNumber}
          </h2>
          <Badge>{invoice.status}</Badge>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => window.print()}>
            <Download className="size-4 mr-2" />
            PDF
          </Button>

          <Dialog open={transactionOpen} onOpenChange={setTransactionOpen}>
            <DialogTrigger asChild>
              <Button disabled={isDraft}>
                <Plus className="size-4 mr-2" />
                Add Payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Payment</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="jazzcash">JazzCash</SelectItem>
                      <SelectItem value="easypaisa">EasyPaisa</SelectItem>
                      <SelectItem value="bank">Bank Account</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Reference ID (optional)</Label>
                  <Input
                    placeholder="Transaction reference"
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                  />
                </div>
              </div>

              <Button className="mt-4 w-full" onClick={handleAddPayment}>
                Save Payment
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* CLIENT INFO */}
      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p><strong>Name:</strong> {invoice.client?.name}</p>
          <p><strong>Email:</strong> {invoice.client?.email}</p>
          <p><strong>Phone:</strong> {invoice.client?.phone}</p>
          <p><strong>Address:</strong> {invoice.client?.address}</p>
        </CardContent>
      </Card>

      {/* SUMMARY */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{invoice.subtotal}</span>
          </div>
          <div className="flex justify-between">
            <span>Discount</span>
            <span>{invoice.discount}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>{invoice.tax}</span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>{invoice.total}</span>
          </div>

          <div className="flex justify-between text-green-600">
            <span>Paid</span>
            <span>{invoice.paidAmount}</span>
          </div>

          <div className="flex justify-between text-red-600 font-bold">
            <span>Remaining</span>
            <span>{remaining}</span>
          </div>
        </CardContent>
      </Card>

      {/* TABS */}
      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.price}</TableCell>
                      <TableCell>{item.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <div className="relative space-y-4">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            {invoice.transactions.map((t: any) => (
              <div key={t.id} className="relative flex gap-4">
                <div className="z-10 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white">
                  <Calendar className="h-4 w-4" />
                </div>
                <Card className="flex-1">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{t.amount}</p>
                        <p>{t.paymentMethod}</p>
                        <p className="text-sm text-gray-500">{new Date(t.createdAt).toLocaleString()}</p>
                        <p className="text-sm">Added by: {t.createdBy}</p>
                        {t.referenceId && <p className="text-sm">Ref: {t.referenceId}</p>}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTransactionId(t.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <div className="relative space-y-4">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            {invoice.logs.map((log: any) => (
              <div key={log.id} className="relative flex gap-4">
                <div className="z-10 flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white">
                  <User className="h-4 w-4" />
                </div>
                <Card className="flex-1">
                  <CardContent className="p-4">
                    <p className="font-semibold">{log.action}</p>
                    <p>{log.description}</p>
                    <p className="text-sm text-gray-500">{new Date(log.createdAt).toLocaleString()}</p>
                    <p className="text-sm">By: {log.user}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* EDIT TRANSACTION DIALOG */}
      <Dialog open={editTransactionOpen} onOpenChange={setEditTransactionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="jazzcash">JazzCash</SelectItem>
                  <SelectItem value="easypaisa">EasyPaisa</SelectItem>
                  <SelectItem value="bank">Bank Account</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reference ID (optional)</Label>
              <Input
                placeholder="Transaction reference"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
              />
            </div>
          </div>

          <Button className="mt-4 w-full" onClick={handleEditPayment}>
            Update Payment
          </Button>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM DIALOG */}
      <Dialog open={!!deleteTransactionId} onOpenChange={() => setDeleteTransactionId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Payment?</DialogTitle>
          </DialogHeader>

          <p>Are you sure you want to delete this payment? This will adjust the balance.</p>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTransactionId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePayment}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};