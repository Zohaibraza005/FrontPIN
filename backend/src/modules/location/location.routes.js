const router = require("express").Router();
const controller = require("./location.controller");
const { protect } = require("../../middleware/auth");

router.get("/", protect, controller.getLocations);
router.post("/", protect, controller.createLocation);
router.put("/:id", protect, controller.updateLocation);
router.delete("/:id", protect, controller.deleteLocation);
// routes/maps.js
router.get("/autocomplete", async (req, res) => {
    try {
      const { input } = req.query;
  
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${input}&key=${process.env.GOOGLE_API_KEY}&components=country:pk`
      );
  
      const data = await response.json();
  
      res.json(data);
  
    } catch (error) {
        console.log('passing')
      res.status(500).json({ error: "Autocomplete failed" });
    }
  });

module.exports = router;
