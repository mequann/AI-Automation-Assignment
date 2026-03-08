const { prisma } = require("../utils/prisma");
const { google } = require("googleapis");

// Google Calendar API integration
exports.createGoogleCalendarEvent = async function ({
  title,
  time,
  endTime,
  participants,
  agenda,
  emailDraft,
}) {
  try {
    // Use OAuth2 client and real user token for Google Calendar
    const { google } = require("googleapis");
    const oAuth2Client = require("../server").oAuth2Client;
    if (!global.googleTokens) {
      throw new Error(
        "Google Calendar not connected. Please visit /auth/google first.",
      );
    }
    oAuth2Client.setCredentials(global.googleTokens);
    // Validate participant emails (robust check)
    const allowedRecipients = ["mekacham381@gmail.com", "ayalneh534@gmail.com"];
    const attendeeEmails = participants
      .filter((p) => typeof p === "string" && p.includes("@"))
      .map((p) => p.toLowerCase())
      .filter((email) => allowedRecipients.includes(email));
    if (attendeeEmails.length === 0) {
      throw new Error(
        "No valid attendee emails found. Please include mekacham381@gmail.com or ayalneh534@gmail.com in your request.",
      );
    }
    const calendar = google.calendar({ version: "v3", auth: oAuth2Client });
    // Robust time parsing using chrono-node, handle only strings
    const chrono = require("chrono-node");
    let startTime = typeof time === "string" ? chrono.parseDate(time) : time;
    let parsedEndTime = null;
    if (!startTime) {
      throw new Error(
        "Invalid time value: Could not parse start time from: " + time,
      );
    }
    if (endTime && typeof endTime === "string") {
      parsedEndTime = chrono.parseDate(endTime);
    } else {
      const match =
        typeof time === "string" ? time.match(/(?:-|to)\s*(.*)$/i) : null;
      if (match) parsedEndTime = chrono.parseDate(match[1]);
      if (!parsedEndTime)
        parsedEndTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    }
    if (!parsedEndTime) {
      throw new Error(
        "Invalid time value: Could not parse end time from: " + time,
      );
    }
    const eventsRes = await calendar.events.list({
      calendarId: "primary",
      timeMin: startTime.toISOString(),
      timeMax: parsedEndTime.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });
    // Debug: log all events in window
    console.log(
      "[Conflict Check] Events in window:",
      eventsRes.data.items.map((e) => ({
        id: e.id,
        summary: e.summary,
        status: e.status,
        start: e.start,
        end: e.end,
        eventType: e.eventType,
      })),
    );
    // Only consider real, non-cancelled, non-all-day events
    const conflicts = eventsRes.data.items.filter((event) => {
      if (event.status === "cancelled") return false;
      if (!event.start || !event.end) return false;
      // Handle both dateTime and date (all-day events)
      const eventStart = event.start.dateTime
        ? new Date(event.start.dateTime).getTime()
        : event.start.date
          ? new Date(event.start.date).getTime()
          : null;
      const eventEnd = event.end.dateTime
        ? new Date(event.end.dateTime).getTime()
        : event.end.date
          ? new Date(event.end.date).getTime()
          : null;
      if (!eventStart || !eventEnd) return false;
      const reqStart = startTime.getTime();
      const reqEnd = parsedEndTime.getTime();
      // Block if event matches title, exact time, and all participants
      const eventAttendees = (event.attendees || [])
        .map((a) => a.email.toLowerCase())
        .sort();
      const reqAttendees = attendeeEmails.map((a) => a.toLowerCase()).sort();
      if (
        event.summary === title &&
        eventStart === reqStart &&
        eventEnd === reqEnd &&
        JSON.stringify(eventAttendees) === JSON.stringify(reqAttendees)
      ) {
        return true;
      }
      // Overlap check: event overlaps requested slot
      return eventStart < reqEnd && eventEnd > reqStart;
    });
    // Block if any overlapping event exists
    let emailErrors = [];
    if (conflicts.length > 0) {
      // Send email notification for conflict
      const sgMail = require("@sendgrid/mail");
      if (process.env.SENDGRID_API_KEY) {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        const sender =
          process.env.SENDGRID_VERIFIED_SENDER || "mecham381@gmail.com";
        for (const email of attendeeEmails) {
          try {
            await sgMail.send({
              to: email,
              from: sender,
              subject: `Meeting Conflict: ${title}`,
              text: `Hello,\n\nYour meeting request for \"${title}\" on ${startTime.toLocaleString()} - ${parsedEndTime.toLocaleString()} could not be scheduled because it conflicts with another event already on your calendar.\n\nAgenda:\n${agenda && agenda.length ? agenda.join("\n") : "No agenda provided."}\n\nPlease review your calendar and try scheduling at a different time.\n\nBest regards,\nAI Meeting Assistant`,
            });
          } catch (sgError) {
            emailErrors.push({ email, error: sgError.message });
            console.error(`SendGrid failed for ${email}:`, sgError.message);
          }
        }
      }
      return {
        conflict: true,
        message:
          "Conflict is detected and cannot create event. Check your email for further details.",
        suggestedTime: null,
        emailErrors,
      };
    }
    // No conflict, create event
    const event = {
      summary: title,
      description: agenda ? agenda.join("\n") : "",
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: parsedEndTime.toISOString() },
      attendees: attendeeEmails.map((email) => ({ email })),
    };
    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
    });
    // Send notification email to all attendees
    if (!process.env.SENDGRID_API_KEY) {
      console.error(
        "SendGrid API key missing. Set SENDGRID_API_KEY in your environment.",
      );
    } else {
      const sgMail = require("@sendgrid/mail");
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      const sender =
        process.env.SENDGRID_VERIFIED_SENDER || "mecham381@gmail.com";
      for (const email of attendeeEmails) {
        try {
          await sgMail.send({
            to: email,
            from: sender,
            subject: `Meeting Scheduled: ${title}`,
            text: `You are invited to a meeting.\nAgenda:\n${agenda ? agenda.join("\n") : "No agenda provided."}\n\nDetails:\n${emailDraft || "See calendar event for more info."}`,
          });
          console.log(`SendGrid email sent successfully to ${email}`);
        } catch (sgError) {
          emailErrors.push({ email, error: sgError.message });
          console.error(`SendGrid failed for ${email}:`, sgError);
        }
      }
    }
    return {
      message: "Event created successfully and emails sent!",
      ...response.data,
      emailErrors,
    };
  } catch (error) {
    console.error("Google Calendar error:", error.message);
    throw new Error("Google Calendar API failed");
  }
};

// Import createGoogleCalendarEvent from this file
const { createGoogleCalendarEvent } = exports;

// Create a new meeting event and store in Postgres
exports.createEvent = async (req, res) => {
  try {
    const {
      title,
      time,
      endTime,
      participants,
      agenda,
      actionItems,
      emailDraft,
    } = req.body;
    // Only create event in Google Calendar and send email
    let calendarEvent = null;
    let conflictInfo = null;
    try {
      const eventResult = await createGoogleCalendarEvent({
        title,
        time,
        endTime,
        participants,
        agenda,
        emailDraft,
      });
      if (eventResult && eventResult.conflict) {
        conflictInfo = eventResult;
        // Email is sent inside createGoogleCalendarEvent for conflict
        return res.status(409).json({
          message: conflictInfo.message,
          suggestedTime: conflictInfo.suggestedTime,
        });
      } else {
        calendarEvent = eventResult;
        // Email is sent inside createGoogleCalendarEvent for creation
        return res
          .status(201)
          .json({ message: "Event created", calendarEvent });
      }
    } catch (err) {
      console.error("Calendar event creation failed:", err.message);
      if (err.message && err.message.includes("Forbidden")) {
        console.error("SendGrid API key is invalid or not authorized.");
      }
      return res
        .status(500)
        .json({ error: "Failed to create event", details: err.message });
    }
  } catch (error) {
    console.error("Create event error:", error.message);
    res
      .status(500)
      .json({ error: "Failed to create event", details: error.message });
  }
};

// Get all meetings
// Get all meetings from database
exports.getAllMeetings = async (req, res) => {
  try {
    const meetings = await prisma.meeting.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(meetings);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch meetings", details: error.message });
  }
};

// Get all events from Google Calendar for current user
exports.getCalendarEvents = async (req, res) => {
  try {
    const { google } = require("googleapis");
    const oAuth2Client = require("../server").oAuth2Client;
    if (!global.googleTokens) {
      return res.status(401).json({
        error:
          "Google Calendar not connected. Please visit /auth/google first.",
      });
    }
    oAuth2Client.setCredentials(global.googleTokens);
    const calendar = google.calendar({ version: "v3", auth: oAuth2Client });
    const now = new Date();
    const eventsRes = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      maxResults: 20,
      singleEvents: true,
      orderBy: "startTime",
    });
    const events = eventsRes.data.items.map((event) => ({
      id: event.id,
      summary: event.summary,
      description: event.description,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      attendees: event.attendees ? event.attendees.map((a) => a.email) : [],
      status: event.status,
    }));
    res.json(events);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch calendar events",
      details: error.message,
    });
  }
};
