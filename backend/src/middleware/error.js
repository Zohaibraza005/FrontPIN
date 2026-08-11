exports.notFound = (req, res) => {
    res.status(404).json({ success: false, message: "Route not found" });
  };
  
  exports.errorHandler = (err, req, res, next) => {
    const status = err.statusCode || 500;
    res.status(status).json({
      success: false,
      message: err.message || "Server error",
    });
  };
  