require("dotenv").config();
const app = require("./app");
const prisma = require("./config/prisma");
const { initHikvisionStreams } = require("./modules/devices/hikvision.service");
const { processBiometricPunch } = require("./modules/devices/device.controller");

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
  initHikvisionStreams(prisma, processBiometricPunch);
});

