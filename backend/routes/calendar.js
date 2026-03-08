const express = require("express");
const router = express.Router();
const {
  createEvent,
  getAllMeetings,
} = require("../controllers/calendarController");

router.post("/create-event", createEvent);
router.get("/meetings", getAllMeetings);

module.exports = router;
