const xml2js = require("xml2js");

/**
 * Parses incoming Hikvision ISAPI Webhook payload (XML or JSON)
 * @param {Object|String} body - Express req.body or raw body
 * @returns {Object} normalized punch details { biometricId, punchTime, deviceName, method, rawData }
 */
async function parseHikvisionEvent(body) {
  try {
    let parsedData = body;

    // If body is raw XML string
    if (typeof body === "string" && body.trim().startsWith("<")) {
      const parser = new xml2js.Parser({ explicitArray: false });
      parsedData = await parser.parseStringPromise(body);
    }

    // Extract Event fields from JSON or parsed XML structure
    const eventObj =
      parsedData?.AccessControllerEvent ||
      parsedData?.EventNotificationAlert ||
      parsedData;

    const biometricId =
      eventObj?.employeeNoString ||
      eventObj?.employeeNo ||
      eventObj?.cardNo ||
      eventObj?.serialNo ||
      null;

    const rawTime =
      eventObj?.eventTime ||
      eventObj?.time ||
      eventObj?.dateTime ||
      new Date().toISOString();

    const punchTime = new Date(rawTime);

    const method =
      eventObj?.currentVerifyMode ||
      eventObj?.verifyMode ||
      "HIKVISION_FACE";

    return {
      biometricId: biometricId ? String(biometricId).trim() : null,
      punchTime: isNaN(punchTime.getTime()) ? new Date() : punchTime,
      method: String(method),
      rawData: parsedData,
    };
  } catch (error) {
    console.error("Error parsing Hikvision Event:", error);
    return null;
  }
}

module.exports = {
  parseHikvisionEvent,
};
