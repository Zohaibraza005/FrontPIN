const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../../config/prisma");
const env = require("../../config/env");

function signAccessToken(payload) {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.jwtAccessExpires });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshExpires });
}

function isEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

async function login({ identifier, password }) {

  // 🔥 Flexible identifier search
  const user = await prisma.employee.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { email: identifier },
        { username: identifier },
        ...(isNaN(identifier) ? [] : [
          { phoneNumber: identifier },
          { nationalId: identifier },
        ]),
      ]
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      email: true,
      password: true,
      role: true,
      roleId: true,
      appRole: true,
      organizationId: true,
      companyId: true,
      canLogin: true,
      profileImage:true,
      jobInfo:true,
      privileges: true,
    },
  });

  if (!user) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  // 🔥 CHECK LOGIN PERMISSION
  if (!user.canLogin) {
    const err = new Error("Login is disabled for this employee");
    err.statusCode = 403;
    throw err;
  }

  if (!user.password) {
    const err = new Error("Login credentials not set");
    err.statusCode = 403;
    throw err;
  }

  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  // Token payload (multi-tenant safe)
  const tokenPayload = {
    sub: user.id,
    role: user.role,
    orgId: user.organizationId,
    companyId: user.companyId,
  };

  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken({
    sub: user.id,
    orgId: user.organizationId,
  });

  const effectivePrivileges = (user.privileges && user.privileges.length > 0)
    ? user.privileges
    : (user.appRole?.privileges
        ? (typeof user.appRole.privileges === 'string' ? JSON.parse(user.appRole.privileges) : user.appRole.privileges)
        : []);

  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      role: user.role,
      roleId: user.roleId,
      appRole: user.appRole ? { id: user.appRole.id, name: user.appRole.name } : null,
      organizationId: user.organizationId,
      companyId: user.companyId,
      jobInfo: user?.jobInfo ? user?.jobInfo: null,
      profileImage:user?.profileImage,
      privileges: effectivePrivileges
    },
    accessToken,
    refreshToken,
  };
}
async function checkIdentifier(identifier) {

  const cleanIdentifier = identifier
    .trim()
    .replace(/-/g, "");

  const lowerIdentifier = cleanIdentifier.toLowerCase();

  const user = await prisma.employee.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { email: lowerIdentifier },
        { username: lowerIdentifier },
        { employeeId: cleanIdentifier },
        { phoneNumber: cleanIdentifier },
        { nationalId: cleanIdentifier },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      username: true,
      employeeId: true,
      phoneNumber: true,
      nationalId: true,
      canLogin: true,
    },
  });

  if (!user) {
    const err = new Error("Account not found");
    err.statusCode = 404;
    throw err;
  }

  let matchedField = null;

  if (user.email?.toLowerCase() === lowerIdentifier) {
    matchedField = "email";
  } else if (user.username?.toLowerCase() === lowerIdentifier) {
    matchedField = "username";
  } else if (user.employeeId === cleanIdentifier) {
    matchedField = "employeeId";
  } else if (user.phoneNumber === cleanIdentifier) {
    matchedField = "phoneNumber";
  } else if (user.nationalId === cleanIdentifier) {
    matchedField = "nationalId";
  }

  console.log("Matched by:", matchedField);

  if (!user.canLogin) {
    const err = new Error("Login disabled for this employee");
    err.statusCode = 403;
    throw err;
  }

  return {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    matchedBy: matchedField,
  };
}




async function getMe(userId) {
  const user = await prisma.employee.findFirst({
    where: {
      id: userId,
      deletedAt: null,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      email: true,
      role: true,
      roleId: true,
      appRole: true,
      organizationId: true,
      companyId: true,
      canLogin: true,
      profileImage: true,
      jobInfo: true,
      privileges: true,
    },
  });

  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  const effectivePrivileges = (user.privileges && user.privileges.length > 0)
    ? user.privileges
    : (user.appRole?.privileges
        ? (typeof user.appRole.privileges === "string" ? JSON.parse(user.appRole.privileges) : user.appRole.privileges)
        : []);

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    role: user.role,
    roleId: user.roleId,
    appRole: user.appRole ? { id: user.appRole.id, name: user.appRole.name } : null,
    organizationId: user.organizationId,
    companyId: user.companyId,
    jobInfo: user?.jobInfo ? user?.jobInfo : null,
    profileImage: user?.profileImage,
    privileges: effectivePrivileges,
  };
}

module.exports = { login, checkIdentifier, getMe };

