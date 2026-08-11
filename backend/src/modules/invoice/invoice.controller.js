const prisma = require("../../config/prisma");


exports.createInvoice = async (req, res) => {
    try {
      const {
        companyId,
        clientId,
        issueDate,
        dueDate,
        currency,
        items,
        globalDiscountType,
        globalDiscountValue,
        taxRate,
        status
      } = req.body;
  
      let subtotal = 0;
  
      const preparedItems = items.map(item => {
        const base = item.quantity * item.unitPrice;
        const discount = item.discountType === "percent"
          ? base * (item.discountValue / 100)
          : item.discountValue;
  
        const total = Math.max(0, base - discount);
  
        subtotal += total;
  
        return {
          ...item,
          total
        };
      });
  
      const discountAmount =
        globalDiscountType === "percent"
          ? subtotal * (globalDiscountValue / 100)
          : globalDiscountValue;
  
      const afterDiscount = subtotal - discountAmount;
      const taxAmount = afterDiscount * (taxRate / 100);
      const grandTotal = afterDiscount + taxAmount;
      let invoiceStatus = "UNPAID";
      if (status === "DRAFT") {
        invoiceStatus = "DRAFT";
      }
      const invoiceNumber = `INV-${Date.now()}`;
  
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
      
          company: {
            connect: { id: companyId }
          },
      
          client: {
            connect: { id: clientId }
          },
      
          organization: {
            connect: { id: req.user.orgId }
          },
          status:invoiceStatus,
          issueDate: new Date(issueDate),
          dueDate: dueDate ? new Date(dueDate) : null,
          currency,
          subtotal,
          discount: discountAmount,
          tax: taxAmount,
          total: grandTotal,
          balance: grandTotal,
          createdBy: {
            connect: { id: req.user.id }
          },
      
          items: {
            create: preparedItems
          },
      
          logs: {
            create: {
              action: "CREATED",
              description: "Invoice created",
              user: {
                connect: { id: req.user.id }
              }
            }
          }
        }
      });
      
      res.json({ success: true, invoice });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Invoice creation failed" });
    }
  };
  exports.updateInvoice = async (req, res) => {
    try {
      const { id } = req.params;
      const {
        companyId,
        clientId,
        issueDate,
        dueDate,
        currency,
        items,
        globalDiscountType,
        globalDiscountValue,
        taxRate
      } = req.body;
  
      const invoice = await prisma.invoice.findUnique({
        where: { id: Number(id) },
        include: { transactions: true }
      });
  
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
  
      // 🔥 Recalculate everything backend side
      let subtotal = 0;
  
      const preparedItems = items.map(item => {
        const base = item.quantity * item.unitPrice;
        const discount =
          item.discountType === "percent"
            ? base * (item.discountValue / 100)
            : item.discountValue;
  
        const total = Math.max(0, base - discount);
        subtotal += total;
  
        return {
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountType: item.discountType,
          discountValue: item.discountValue,
          total
        };
      });
  
      const discountAmount =
        globalDiscountType === "percent"
          ? subtotal * (globalDiscountValue / 100)
          : globalDiscountValue;
  
      const afterDiscount = subtotal - discountAmount;
      const taxAmount = afterDiscount * (taxRate / 100);
      const grandTotal = afterDiscount + taxAmount;
  
      const paidAmount = invoice.paidAmount;
      const balance = grandTotal - paidAmount;
  
      let status = "UNPAID";
      if (paidAmount === 0) status = "UNPAID";
      else if (paidAmount < grandTotal) status = "PARTIALLY_PAID";
      else status = "PAID";
  
      // Update invoice
    
      const up = await prisma.invoice.update({
        where: { id: Number(id) },
        data: {
          companyId: companyId ? Number(companyId) : invoice.companyId,
          clientId: clientId ? Number(clientId) : invoice.clientId,
          issueDate: issueDate ? new Date(issueDate) : invoice.issueDate,
          dueDate: dueDate ? new Date(dueDate) : null,
          currency,
          subtotal,
          discount: discountAmount,
          tax: taxAmount,
          total: grandTotal,
          balance,
          status,
          items: {
            deleteMany: {
              invoiceId: Number(id)
            },
            create: preparedItems
          }
        }
      });
      
      await prisma.invoiceLog.create({
        data: {
          invoiceId: Number(id),
          action: "UPDATED",
          description: "Invoice updated",
          userId: req.user.id
        }
      });
  
      res.json({ success: true });
  
    } catch (error) {
      res.status(500).json({ message: "Update failed" });
    }
  };
  
  exports.addTransaction = async (req, res) => {
    try {
      const { amount, paymentMethod, reference } = req.body;
      const { id } = req.params;
  
      const invoice = await prisma.invoice.findUnique({
        where: { id: Number(id) }
      });
  
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
  
      const newPaidAmount = invoice.paidAmount + amount;
      const newBalance = invoice.total - newPaidAmount;
  
      let status = "PARTIALLY_PAID";
      if (newBalance <= 0) status = "PAID";
  
      await prisma.invoiceTransaction.create({
        data: {
          invoiceId: invoice.id,
          amount,
          paymentMethod,
          reference,
          createdById: req.user.id
        }
      });
  
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          balance: newBalance,
          status
        }
      });
  
      res.json({ success: true });
  
    } catch (error) {
      res.status(500).json({ message: "Payment failed" });
    }
  };
  
  exports.getInvoices = async (req, res) => {
    try {
        const { status, clientId, companyId, startDate, endDate } = req.query;

        let where = {
          organizationId: req.user.organizationId
        };
        
        if (status) where.status = status;
        if (clientId) where.clientId = Number(clientId);
        if (companyId) where.companyId = Number(companyId);
        
        if (startDate && endDate) {
          where.issueDate = {
            gte: new Date(startDate),
            lte: new Date(endDate)
          };
        }
  
     
  
      const invoices = await prisma.invoice.findMany({
        where,
        include: {
          company: true,
          client: true,
          items: true,
          transactions: true,
          logs: {
            orderBy: { createdAt: "desc" }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      });
  
      /* 🔥 Auto Mark Overdue */
      const today = new Date();
  
      for (let invoice of invoices) {
        if (
          invoice.status !== "PAID" &&
          invoice.dueDate &&
          new Date(invoice.dueDate) < today
        ) {
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: "OVERDUE" }
          });
          invoice.status = "OVERDUE";
        }
      }
  
      res.json({
        success: true,
        data: invoices
      });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  };
  exports.deleteInvoice = async (req, res) => {
    try {
      const { id } = req.params;
  
      await prisma.invoice.delete({
        where: { id: Number(id) }
      });
  
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Delete failed" });
    }
  };
  exports.getSingleInvoice = async (req, res) => {
    try {
      const { id } = req.params;
  
      const invoice = await prisma.invoice.findFirst({
        where: {
          id: Number(id),
          organizationId: req.user.organizationId
        },
        include: {
          company: true,
          client: true,
          items: true,
          transactions: {
            orderBy: { createdAt: "desc" }
          },
          logs: {
            orderBy: { createdAt: "desc" }
          }
        }
      });
  
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
  
      res.json({
        success: true,
        data: invoice
      });
  
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  };
  exports.updateTransaction = async (req, res) => {
    try {
      const { id } = req.params;
      const { amount, paymentMethod, referenceId } = req.body;
  
      const transaction = await prisma.invoiceTransaction.findUnique({
        where: { id: Number(id) }
      });
  
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
  
      const invoice = await prisma.invoice.findUnique({
        where: { id: transaction.invoiceId },
        include: { transactions: true }
      });
  
      const oldAmount = transaction.amount;
      const newAmount = Number(amount);
  
      // Calculate new paid amount
      const newPaidAmount =
        invoice.paidAmount - oldAmount + newAmount;
  
      if (newPaidAmount > invoice.total) {
        return res.status(400).json({
          message: "Amount exceeds invoice total"
        });
      }
  
      // Update transaction
      await prisma.invoiceTransaction.update({
        where: { id: Number(id) },
        data: {
          amount: newAmount,
          paymentMethod,
          reference: referenceId
        }
      });
  
      // Determine new status
      let newStatus = "UNPAID";
  
      if (newPaidAmount === 0) {
        newStatus = "UNPAID";
      } else if (newPaidAmount < invoice.total) {
        newStatus = "PARTIALLY_PAID";
      } else {
        newStatus = "PAID";
      }
  
      // Update invoice
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          balance: invoice.total - newPaidAmount,
          status: newStatus
        }
      });
  
      // Create log
      await prisma.invoiceLog.create({
        data: {
          invoiceId: invoice.id,
          action: "TRANSACTION_UPDATED",
          description: `Payment updated from ${oldAmount} to ${newAmount}`,
          userId: req.user.id
        }
      });
  
      res.json({ success: true });
  
    } catch (error) {
      res.status(500).json({ message: "Update failed" });
    }
  };
  exports.deleteTransaction = async (req, res) => {
    try {
      const { id } = req.params;
  
      const transaction = await prisma.invoiceTransaction.findUnique({
        where: { id: Number(id) }
      });
  
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
  
      const invoice = await prisma.invoice.findUnique({
        where: { id: transaction.invoiceId }
      });
  
      const newPaidAmount = invoice.paidAmount - transaction.amount;
  
      // Delete transaction
      await prisma.invoiceTransaction.delete({
        where: { id: Number(id) }
      });
  
      // Determine new status
      let newStatus = "UNPAID";
  
      if (newPaidAmount === 0) {
        newStatus = "UNPAID";
      } else if (newPaidAmount < invoice.total) {
        newStatus = "PARTIALLY_PAID";
      } else {
        newStatus = "PAID";
      }
  
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          balance: invoice.total - newPaidAmount,
          status: newStatus
        }
      });
  
      // Create log
      await prisma.invoiceLog.create({
        data: {
          invoiceId: invoice.id,
          action: "TRANSACTION_DELETED",
          description: `Payment of ${transaction.amount} deleted`,
          userId: req.user.id
        }
      });
  
      res.json({ success: true });
  
    } catch (error) {
      res.status(500).json({ message: "Delete failed" });
    }
  };
  
  
  