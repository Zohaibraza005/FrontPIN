module.exports.ok = (res, data, message = "OK") =>
  res.status(200).json({ success: true, message, data });

module.exports.created = (res, data, message = "CREATED") =>
  res.status(201).json({ success: true, message, data });
