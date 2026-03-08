import React, { useState } from "react";
import axios from "axios";

function CommandInput({ setMeetingData }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg("");
    try {
      // Step 1: Parse meeting request
      const parseRes = await axios.post(
        "http://localhost:5000/api/parse-meeting",
        {
          userInput: input,
        },
      );
      setMeetingData(parseRes.data);
      // Step 2: Create event
      const eventRes = await axios.post(
        "http://localhost:5000/api/create-event",
        parseRes.data,
      );
      if (eventRes.status === 201) {
        setStatusMsg("Event created and emails sent!");
      } else {
        setStatusMsg("Unexpected response from event creation.");
      }
    } catch (err) {
      if (err.response && err.response.status === 409) {
        setStatusMsg(
          "Conflict: " + (err.response.data.message || "Event already exists."),
        );
      } else {
        setStatusMsg("Error processing request or creating event.");
      }
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="command-input-form">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter your meeting request..."
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? "Processing..." : "Generate"}
      </button>
      {statusMsg && (
        <div
          style={{
            marginTop: 10,
            color: statusMsg.startsWith("Conflict") ? "red" : "green",
          }}
        >
          {statusMsg}
        </div>
      )}
    </form>
  );
}

export default CommandInput;
