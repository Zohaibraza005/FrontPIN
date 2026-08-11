const prisma = require("../../config/prisma");


exports.createInvoiceCompany = async (req, res) => {
    try {
      const { name, title, phone, email, vat } = JSON.parse(req.body.data);
  
      const logoUrl = req.file ? `/uploads/${req.file.filename}` : null;
  
      const company = await prisma.invoiceCompany.create({
        data: {
          name,
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
        console.log(error.message)
      res.status(500).json({ message: "Error creating invoice company" });
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
  
