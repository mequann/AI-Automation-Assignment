import React, { useState, useEffect } from "react";
import "./styles/App.css";
import CommandInput from "./components/CommandInput.jsx";
import MeetingDetails from "./components/MeetingDetails.jsx";
import AgendaDisplay from "./components/AgendaDisplay.jsx";
import EmailDraftPreview from "./components/EmailDraftPreview.jsx";
import axios from "axios";

function App() {
  // Check Google Calendar connection
  const checkGoogleCalendarConnection = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/calendar-events");
      // If not authorized, backend returns error
      if (
        res.data &&
        res.data.error &&
        res.data.error.includes("not connected")
      ) {
        window.open("http://localhost:5000/auth/google", "_blank");
        return false;
      }
      return true;
    } catch (err) {
      // If error, assume not connected
      window.open("http://localhost:5000/auth/google", "_blank");
      return false;
    }
  };
  const [meetingData, setMeetingData] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [reminderMsg, setReminderMsg] = useState("");
  const [followUpMsg, setFollowUpMsg] = useState("");
  const [calendarStatus, setCalendarStatus] = useState("");
  const [calendarEvents, setCalendarEvents] = useState([]);

  useEffect(() => {
    // Fetch meeting history from DB
    axios.get("http://localhost:5000/api/meetings").then((res) => {
      setMeetings(res.data);
    });
    // Fetch Google Calendar events
    axios.get("http://localhost:5000/api/calendar-events").then((res) => {
      setCalendarEvents(res.data);
    });
  }, []);

  const handleCompleteActionItem = async (meetingId, item) => {
    await axios.post("http://localhost:5000/api/complete-action-item", {
      meetingId,
      item,
    });
    // Refresh meetings
    const res = await axios.get("http://localhost:5000/api/meetings");
    setMeetings(res.data);
    if (selectedMeeting) {
      setSelectedMeeting(res.data.find((m) => m.id === selectedMeeting.id));
    }
  };

  // Wrap meeting creation logic to check Google Calendar connection first
  const handleCreateMeeting = async (meetingRequest) => {
    const connected = await checkGoogleCalendarConnection();
    if (!connected) return;
    // ...existing meeting creation logic (e.g., send to backend)
    // You can call your CommandInput logic here
  };

  const handleSendFollowUp = async (meetingId) => {
    const res = await axios.post("http://localhost:5000/api/send-followup", {
      meetingId,
    });
    setFollowUpMsg(res.data.followUp);
  };

  return (
    <div className="App">
      {/* All UI elements are inside this parent div */}
      <h1>AI Meeting Preparation Assistant</h1>
      <div style={{ marginBottom: 20 }}>
        {/* <button
          onClick={() => {
            window.open("http://localhost:5000/auth/google", "_blank");
          }}
        >
          Connect Google Calendar
        </button> */}
        {calendarStatus && (
          <div style={{ marginBottom: 20, color: "green" }}>
            {calendarStatus}
          </div>
        )}
      </div>
      <CommandInput setMeetingData={setMeetingData} />
      {meetingData && (
        <div>
          <MeetingDetails data={meetingData} />
          <AgendaDisplay agenda={meetingData.agenda} />
          {meetingData.actionItems && meetingData.actionItems.length > 0 && (
            <div className="action-items">
              <h2>Action Items</h2>
              <ul>
                {meetingData.actionItems.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          <EmailDraftPreview draft={meetingData.emailDraft} />
        </div>
      )}
      <hr style={{ margin: "2rem 0" }} />
      <h2>Meeting History (Google Calendar)</h2>
      <ul>
        {calendarEvents.map((event) => {
          const start = event.start?.dateTime || event.start?.date || null;
          const end = event.end?.dateTime || event.end?.date || null;
          const attendees = event.attendees
            ? event.attendees.map((a) => a.email).join(", ")
            : "None";
          return (
            <li key={event.id}>
              <strong>{event.summary}</strong>
              <br />
              Start: {start ? new Date(start).toLocaleString() : "No start"}
              <br />
              End: {end ? new Date(end).toLocaleString() : "No end"}
              <br />
              {event.description && (
                <span>
                  Description: {event.description}
                  <br />
                </span>
              )}
              Attendees: {attendees}
            </li>
          );
        })}
      </ul>
      {selectedMeeting && (
        <div style={{ marginTop: 20 }}>
          <MeetingDetails data={selectedMeeting} />
          <AgendaDisplay agenda={selectedMeeting.agenda} />
          <EmailDraftPreview draft={selectedMeeting.emailDraft} />
          <h3>Action Items</h3>
          <ul>
            {selectedMeeting.actionItems.map((item, idx) => (
              <li key={idx}>
                {item}{" "}
                <button
                  onClick={() =>
                    handleCompleteActionItem(selectedMeeting.id, item)
                  }
                >
                  Complete
                </button>
              </li>
            ))}
          </ul>
          <button onClick={() => handleSendFollowUp(selectedMeeting.id)}>
            Send Follow-Up Email
          </button>
          {followUpMsg && <pre style={{ marginTop: 10 }}>{followUpMsg}</pre>}
        </div>
      )}
    </div>
  );
}

export default App;
