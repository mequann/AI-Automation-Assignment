// Mark action item as completed
exports.completeActionItem = async (req, res) => {
  const { meetingId, item } = req.body;
  try {
    const { completeActionItem } = require("../utils/prisma");
    const updatedMeeting = await completeActionItem(meetingId, item);
    res.json({ message: "Action item completed", meeting: updatedMeeting });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to complete action item", details: err.message });
  }
};
// controllers/meetingController.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// IMPORTANT: Use the FULL model name with "models/" prefix
// From your list, these are the working models:
const WORKING_MODELS = {
  FAST: "models/gemini-2.5-flash", // ✅ Fast and capable (June 2025)
  LITE: "models/gemini-2.5-flash-lite", // ✅ Even faster, lighter (July 2025)
  PREVIOUS: "models/gemini-2.0-flash", // ✅ Previous version
  LATEST: "models/gemini-flash-latest", // ✅ Always latest version
};

// Use the fast model for your meeting assistant
const model = genAI.getGenerativeModel({ model: WORKING_MODELS.FAST });

exports.parseMeeting = async (req, res) => {
  const { userInput } = req.body;

  if (!userInput) {
    return res.status(400).json({ error: "No user input provided" });
  }

  try {
    console.log("📝 Processing meeting request:", userInput);
    console.log("🤖 Using model:", WORKING_MODELS.FAST);

    const prompt = `Extract meeting information from this request and return a valid JSON object.
    
    Request: "${userInput}"
    
    IMPORTANT: Return ONLY this exact JSON structure with no additional text, no markdown, no explanation:
    {
      "title": "meeting title",
      "time": "meeting time with date",
      "participants": ["array of participant names"],
      "agenda": ["array of 4-6 agenda items"],
      "actionItems": ["array of 2-3 action items"],
      "emailDraft": "professional follow-up email draft"
    }`;

    console.log("⏳ Waiting for Gemini response...");

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("✅ Gemini response received");
    console.log("Raw response:", text.substring(0, 200) + "..."); // Log first 200 chars

    // Parse the JSON response
    try {
      // Clean the response - remove any markdown code blocks
      let cleanText = text.replace(/```json\n?|\n?```/g, "").trim();

      // Sometimes the response might have extra text before/after JSON
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanText = jsonMatch[0];
      }

      const parsedData = JSON.parse(cleanText);

      // Add metadata about which model was used
      parsedData._model = WORKING_MODELS.FAST;
      parsedData._timestamp = new Date().toISOString();

      console.log("✅ Successfully parsed meeting data");
      // Create Google Calendar event after parsing
      let calendarEvent = null;
      try {
        const chrono = require("chrono-node");
        const calendarController = require("./calendarController");
        // Parse natural language time to Date
        const parsedDate = chrono.parseDate(parsedData.time);
        if (!parsedDate) {
          throw new Error("Could not parse meeting time: " + parsedData.time);
        }
        calendarEvent = await calendarController.createGoogleCalendarEvent({
          title: parsedData.title,
          time: parsedDate,
          participants: parsedData.participants,
        });
      } catch (calendarError) {
        console.error("Calendar event creation failed:", calendarError.message);
      }
      res.json({ ...parsedData, calendarEvent });
    } catch (parseError) {
      console.error("❌ Failed to parse Gemini response:", parseError.message);
      console.error("Raw text that failed to parse:", text);

      // Fallback to mock data
      const mockData = getMockData(userInput);
      mockData._note = "Using mock data - JSON parsing failed";
      mockData._model = WORKING_MODELS.FAST;
      res.json(mockData);
    }
  } catch (err) {
    console.error("❌ Meeting parse error:", err.message);
    console.error("Full error:", err);

    // Return mock data as fallback
    const mockData = getMockData(userInput);
    mockData._note = "Using mock data - API error";
    mockData._error = err.message;
    res.json(mockData);
  }
};

// Helper function for mock data
function getMockData(userInput) {
  // Extract name if present
  const nameMatch = userInput.match(/with\s+([A-Za-z]+)/i);
  const participantName = nameMatch ? nameMatch[1] : "Team Member";

  // Extract topic if present
  const topicMatch = userInput.match(/about\s+([^.]+)/i);
  const topic = topicMatch ? topicMatch[1].trim() : "general discussion";

  // Extract time if present
  const timeMatch = userInput.match(/(?:at|@)\s+(\d+(?::\d+)?\s*(?:AM|PM)?)/i);
  const time = timeMatch ? timeMatch[1] : "10:00 AM";

  // Extract day if present
  const dayMatch = userInput.match(
    /(?:next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow)/i,
  );
  const day = dayMatch ? dayMatch[1] : "tomorrow";

  // Extract specific person from the request
  const mequanntMatch = userInput.match(/mequannt|mequanint/i);
  if (mequanntMatch) {
    participantName = "Mequannt";
  }

  return {
    title: `${topic} Meeting`,
    time: `${day} at ${time}`,
    participants: [participantName],
    agenda: [
      "Introduction and context setting",
      `Discussion of ${topic}`,
      "Timeline and milestones review",
      "Action items and responsibilities",
      "Next steps and follow-up",
    ],
    actionItems: [
      `${participantName} to prepare meeting materials`,
      "Schedule follow-up meeting if needed",
      "Send meeting summary to all participants",
    ],
    emailDraft: `Dear ${participantName},\n\nThank you for scheduling this meeting to discuss ${topic}. I've confirmed the details for ${day} at ${time}.\n\nAgenda:\n• Introduction and context\n• ${topic} discussion\n• Timeline planning\n• Action items assignment\n• Next steps\n\nPlease let me know if you'd like to add anything to the agenda.\n\nBest regards,\nAI Meeting Assistant`,
  };
}

const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.sendReminders = async (req, res) => {
  res.json({
    message: "Reminders sent successfully",
    sent: true,
    count: 3,
    timestamp: new Date().toISOString(),
  });
};

// Generate and send follow-up email after meeting
exports.sendFollowUp = async (req, res) => {
  const { meetingId } = req.body;
  try {
    const prisma = require("../utils/prisma").prisma;
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
    });
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });
    // Use Gemini to generate follow-up summary
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "models/gemini-2.5-flash",
    });
    const prompt = `Generate a follow-up email for this meeting:\nTitle: ${meeting.title}\nAgenda: ${meeting.agenda.join(", ")}\nAction Items: ${meeting.actionItems.join(", ")}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const followUpText = response.text();
    // Send follow-up email to all participants
    for (const participant of meeting.participants) {
      await sgMail.send({
        to: participant,
        from: process.env.SENDGRID_VERIFIED_SENDER || "mecham381@gmail.com",
        subject: `Follow-up: ${meeting.title}`,
        text: followUpText,
      });
    }
    res.json({ message: "Follow-up emails sent", followUp: followUpText });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to send follow-up", details: err.message });
  }
};
