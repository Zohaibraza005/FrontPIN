const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

exports.protect = async (req, res, next) => {
  try {
    let token;

    // 1️⃣ Get token from header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, token missing",
      });
    }

   const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    

    // decoded contains:
    // sub (user id)
    // role
    // orgId
    // companyId

    // 3️⃣ Check if user still exists
    const user = await prisma.employee.findFirst({
      where: {
        id: decoded.sub,
        deletedAt: null,
      },
      select: {
        id: true,
        role: true,
        organizationId: true,
        companyId: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // 4️⃣ Attach user to request
    req.user = {
      id: user.id,
      role: user.role,
      orgId: user.organizationId,
      organizationId: user.organizationId,
      companyId: user.companyId,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};
