// routes/meetingRoutes.js
const express = require("express");
const router = express.Router();
const {
  parseMeeting,
  sendReminders,
  sendFollowUp,
  completeActionItem,
} = require("../controllers/meetingController");

// Route to mark action item as completed
router.post("/complete-action-item", completeActionItem);

// Route to parse meeting requests
router.post("/parse-meeting", parseMeeting);

// Route to send reminders (can be POST or GET)
router.post("/send-reminders", sendReminders);
// Also support GET for easy testing
router.get("/send-reminders", sendReminders);

// Route to send follow-up email
router.post("/send-followup", sendFollowUp);

module.exports = router;
