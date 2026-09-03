const prisma = require("../../config/prisma");


exports.createInvoiceCompany = async (req, res) => {
    try {
      const { name, title, phone, email, vat } = JSON.parse(req.body.data);
  
      // Check if duplicate company exists
      const existing = await prisma.invoiceCompany.findFirst({
        where: {
          organizationId: req.user.orgId,
          name: name.trim(),
          status: "ACTIVE",
        },
      });

      if (existing) {
        return res.status(400).json({ message: "A company with this name already exists" });
      }

      const logoUrl = req.file ? `/uploads/${req.file.filename}` : null;
  
      const company = await prisma.invoiceCompany.create({
        data: {
          name: name.trim(),
          title,
          phone,
          email,
          vat,
          logoUrl,
          organizationId: req.user.orgId,
        }
      });
  
      res.json({ success: true, data: company });
  
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ message: error.status === 400 ? error.message : "Error creating invoice company" });
    }
  };

  exports.getInvoiceCompanies = async (req, res) => {
    try {
      const companies = await prisma.invoiceCompany.findMany({
        where: {
          organizationId: req.user.orgId,
          status: "ACTIVE"
        },
        orderBy: {
          createdAt: "desc"
        }
      });
  
      res.json({
        success: true,
        data: companies
      });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch invoice companies" });
    }
  };

  exports.updateInvoiceCompany = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, title, phone, email, vat } = JSON.parse(req.body.data);
  
      // Check if duplicate company exists
      const existing = await prisma.invoiceCompany.findFirst({
        where: {
          organizationId: req.user.orgId,
          name: name.trim(),
          status: "ACTIVE",
          id: {
            not: parseInt(id)
          }
        },
      });

      if (existing) {
        return res.status(400).json({ message: "A company with this name already exists" });
      }

      let logoUrl = undefined;
      if (req.file) {
        logoUrl = `/uploads/${req.file.filename}`;
      }
  
      const updated = await prisma.invoiceCompany.update({
        where: {
          id: parseInt(id),
        },
        data: {
          name: name.trim(),
          title,
          phone,
          email: email || null,
          vat: vat || null,
          ...(logoUrl !== undefined && { logoUrl }),
        },
      });
  
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error("Update Invoice Company Error:", error);
      res.status(500).json({ message: error.status === 400 ? error.message : "Failed to update invoice company", error: error.message });
    }
  };
  
  exports.deleteInvoiceCompany = async (req, res) => {
    try {
      const { id } = req.params;
  
      const deleted = await prisma.invoiceCompany.update({
        where: {
          id: parseInt(id),
        },
        data: {
          status: "INACTIVE",
        },
      });
  
      res.json({ success: true, message: "Company deleted successfully", data: deleted });
    } catch (error) {
      console.error("Delete Invoice Company Error:", error);
      res.status(500).json({ message: "Failed to delete invoice company", error: error.message });
    }
  };
  
