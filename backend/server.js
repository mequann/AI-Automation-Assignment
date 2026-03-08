// Export oAuth2Client for use in controllers
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Scheduled reminders setup
const cron = require("node-cron");
const sgMail = require("@sendgrid/mail");
const prisma = require("./utils/prisma").prisma;
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Send reminders for meetings starting in the next hour
cron.schedule("*/10 * * * *", async () => {
  try {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const meetings = await prisma.meeting.findMany({
      where: {
        time: {
          gte: now,
          lte: oneHourLater,
        },
      },
    });
    for (const meeting of meetings) {
      for (const participant of meeting.participants) {
        await sgMail.send({
          to: participant,
          from: process.env.SENDGRID_VERIFIED_SENDER || "mecham381@gmail.com",
          subject: `Reminder: ${meeting.title} at ${new Date(meeting.time).toLocaleString()}`,
          text: `You have a meeting coming up.\nAgenda: ${meeting.agenda.join("\n")}`,
        });
      }
    }
    if (meetings.length > 0) {
      console.log(`Reminders sent for ${meetings.length} meetings.`);
    }
  } catch (err) {
    console.error("Reminder cron error:", err.message);
  }
});

// Google OAuth2 setup (uses .env or client_secret.json as fallback)
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

let clientId = process.env.GOOGLE_CLIENT_ID;
let clientSecret = process.env.GOOGLE_CLIENT_SECRET;
let redirectUri = process.env.GOOGLE_REDIRECT_URI;

if (!clientId || !clientSecret || !redirectUri) {
  const CLIENT_SECRET_PATH = path.join(__dirname, "config/client_secret.json");
  if (fs.existsSync(CLIENT_SECRET_PATH)) {
    const credentials = JSON.parse(
      fs.readFileSync(CLIENT_SECRET_PATH, "utf8"),
    ).web;
    clientId = credentials.client_id;
    clientSecret = credentials.client_secret;
    redirectUri = credentials.redirect_uris[0];
  } else {
    throw new Error(
      "Google OAuth2 credentials not found in .env or client_secret.json",
    );
  }
}

const oAuth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  redirectUri,
);

// Token persistence
const TOKEN_PATH = path.join(__dirname, "google-credentials.json");
function saveTokens(tokens) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
}
function loadTokens() {
  if (fs.existsSync(TOKEN_PATH)) {
    return JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
  }
  return null;
}

// Load tokens on startup
const loadedTokens = loadTokens();
if (loadedTokens) {
  oAuth2Client.setCredentials(loadedTokens);
  global.googleTokens = loadedTokens;
}

// Step 1: Redirect user to Google consent screen
app.get("/auth/google", (req, res) => {
  const scopes = ["https://www.googleapis.com/auth/calendar"];
  const url = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
  });
  res.redirect(url);
});

// Step 2: Handle callback and exchange code for tokens
app.get("/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    global.googleTokens = tokens;
    saveTokens(tokens);

    // Demo: auto-create a sample event after auth
    const calendar = google.calendar({ version: "v3", auth: oAuth2Client });
    const now = new Date();
    const startTime = new Date(now.getTime() + 3600000); // 1 hour from now
    const endTime = new Date(startTime.getTime() + 3600000); // 2 hours from now
    // Conflict detection
    const eventsRes = await calendar.events.list({
      calendarId: "primary",
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });
    const conflicts = eventsRes.data.items.filter(
      (e) => e.status !== "cancelled",
    );
    let eventCreated = false;
    let emailSent = false;
    let message = "";
    if (conflicts.length > 0) {
      message = `Conflict detected: You already have a meeting at ${startTime.toLocaleTimeString()}. No event created.`;
    } else {
      // Create event
      const event = {
        summary: "Demo Meeting",
        start: { dateTime: startTime.toISOString() },
        end: { dateTime: endTime.toISOString() },
        attendees: [{ email: "ayalneh534@gmail.com" }],
      };
      const response = await calendar.events.insert({
        calendarId: "primary",
        resource: event,
      });
      eventCreated = true;
      // Send email
      const sgMail = require("@sendgrid/mail");
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      await sgMail.send({
        to: "ayalneh534@gmail.com",
        from: process.env.SENDGRID_VERIFIED_SENDER || "mecham381@gmail.com",
        subject: "Demo Meeting Scheduled",
        text: `A demo meeting has been scheduled for ${startTime.toLocaleString()}.`,
      });
      emailSent = true;
      message = `Demo event created and email sent for ${startTime.toLocaleString()}.`;
    }
    res.send(message);
  } catch (err) {
    res.status(500).send("Google Calendar connection failed: " + err.message);
  }
});

// Import routes
const meetingRoutes = require("./routes/meeting");
const calendarRoutes = require("./routes/calendar");
const emailRoutes = require("./routes/email");

// Use routes
app.use("/api", meetingRoutes);
app.use("/api", calendarRoutes);
app.use("/api", emailRoutes);

app.get("/", (req, res) => {
  res.send("AI Meeting Preparation Assistant Backend Running");
});

// TEMP: Test Google Calendar event creation directly
const calendarController = require("./controllers/calendarController");
app.get("/test-calendar", async (req, res) => {
  try {
    if (!global.googleTokens) {
      return res.status(400).json({
        error:
          "Google Calendar not connected. Please visit /auth/google first.",
      });
    }
    oAuth2Client.setCredentials(global.googleTokens);
    const calendar = google.calendar({ version: "v3", auth: oAuth2Client });
    const event = {
      summary: "Test Event",
      start: { dateTime: new Date(Date.now() + 3600000).toISOString() },
      end: { dateTime: new Date(Date.now() + 7200000).toISOString() },
      attendees: [{ email: "l@gmail.com" }], // Replace with your real email
    };
    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
    });
    res.json({ success: true, event: response.data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Export oAuth2Client for use in controllers (after initialization)
module.exports = { oAuth2Client };
