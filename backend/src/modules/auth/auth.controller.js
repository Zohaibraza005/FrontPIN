const { ok } = require("../../utlis/response");
const asyncHandler = require("../../utlis/asyncHandler");
const { loginSchema } = require("./auth.validation");
const authService = require("./auth.service");
const env = require("../../config/env");

exports.login = asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: parsed.error.flatten(),
    });
  }

  const { user, accessToken, refreshToken } = await authService.login(parsed.data);

  // Web app case: set refresh token in httpOnly cookie (best)
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "lax",
    path: "/api/auth/refresh",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return ok(res, { user, accessToken }, "Logged in");
});
exports.checkIdentifier = asyncHandler(async (req, res) => {
  const { identifier } = req.body;
  
  

  if (!identifier || identifier.length < 3) {
    return res.status(400).json({
      success: false,
      message: "Invalid identifier",
    });
  }

  const user = await authService.checkIdentifier(identifier);

  return ok(res, user, "User found");
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  return ok(res, { user }, "User profile");
});


