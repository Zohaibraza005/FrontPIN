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
  setRefreshCookie(res, refreshToken);

  // refreshToken is also returned so the app can renew its session silently
  return ok(res, { user, accessToken, refreshToken }, "Logged in");
});

function setRefreshCookie(res, refreshToken) {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "lax",
    path: "/api/auth/refresh",
    maxAge: 365 * 24 * 60 * 60 * 1000,
  });
}

// POST /api/auth/refresh  { refreshToken }  (or the httpOnly cookie)
exports.refresh = asyncHandler(async (req, res) => {
  const token = req.body?.refreshToken || req.cookies?.refreshToken;
  const { accessToken, refreshToken } = await authService.refresh(token);
  setRefreshCookie(res, refreshToken);
  return ok(res, { accessToken, refreshToken }, "Session refreshed");
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


