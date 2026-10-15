const prisma = require("../../config/prisma");

exports.getLocations = async (req, res) => {
  const orgId = req.user.orgId;

  const locations = await prisma.company.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
    },
    include: {
      _count: {
        select: {
          employees: {
            where: {
              organizationId: orgId,
              deletedAt: null,
              NOT: { role: "ADMIN" },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({ success: true, data: locations });
};

exports.createLocation = async (req, res) => {
  const orgId = req.user.orgId;
  

  const {
    name,
    address,
    type,
    capacity,
    enableGeofence,
    latitude,
    longitude,
    radius,
    timezone
  } = req.body;

  const location = await prisma.company.create({
    data: {
      name,
      address,
      type,
      capacity,
      enableGeofence,
      latitude,
      longitude,
      radius,
      organizationId: orgId,
      timezone
    },
  });

  res.status(201).json({ success: true, data: location });
};
exports.updateLocation = async (req, res) => {
    try {
      const orgId = req.user.orgId;
      const locationId = parseInt(req.params.id);
  
      const {
        name,
        address,
        type,
        capacity,
        enableGeofence,
        latitude,
        longitude,
        radius,
        timezone
      } = req.body;
  
      // Check if location belongs to same organization
      const existing = await prisma.company.findFirst({
        where: {
          id: locationId,
          organizationId: orgId,
          deletedAt: null,
        },
      });
  
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Location not found",
        });
      }
  
      const updated = await prisma.company.update({
        where: { id: locationId },
        data: {
          name,
          address,
          type,
          capacity,
          enableGeofence,
          latitude,
          longitude,
          radius,
          timezone
        },
      });
  
      res.json({
        success: true,
        message: "Location updated successfully",
        data: updated,
      });
  
    } catch (error) {
      console.error("Update Location Error:", error);
      res.status(500).json({
        success: false,
        message: "Something went wrong",
      });
    }
  };

  exports.deleteLocation = async (req, res) => {
    try {
      const orgId = req.user.orgId;
      const locationId = parseInt(req.params.id);
  
      const existing = await prisma.company.findFirst({
        where: {
          id: locationId,
          organizationId: orgId,
          deletedAt: null,
        },
      });
  
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Location not found",
        });
      }

      // Check if another active location exists to reassign employees and schedules
      const anotherLocation = await prisma.company.findFirst({
        where: {
          organizationId: orgId,
          deletedAt: null,
          id: { not: locationId },
        },
      });

      if (anotherLocation) {
        await prisma.employee.updateMany({
          where: { companyId: locationId },
          data: { companyId: anotherLocation.id },
        });
        await prisma.schedule.updateMany({
          where: { companyId: locationId },
          data: { companyId: anotherLocation.id },
        });
      } else {
        await prisma.employee.updateMany({
          where: { companyId: locationId },
          data: { companyId: null },
        });
        await prisma.schedule.updateMany({
          where: { companyId: locationId },
          data: { companyId: null },
        });
      }
  
      await prisma.company.update({
        where: { id: locationId },
        data: {
          deletedAt: new Date(),
          active: false,
        },
      });
  
      res.json({
        success: true,
        message: "Location deleted successfully",
      });
  
    } catch (error) {
      console.error("Delete Location Error:", error);
      res.status(500).json({
        success: false,
        message: "Something went wrong",
      });
    }
  };
  
