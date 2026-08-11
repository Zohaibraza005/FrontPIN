const { z } = require("zod");

const loginSchema = z.object({
  identifier: z.string().min(3), // email OR username
  password: z.string().min(6),
});

module.exports = { loginSchema };
