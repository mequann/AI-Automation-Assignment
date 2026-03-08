import React from "react";

function MeetingDetails({ data }) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h2 className="text-xl font-semibold mb-2">Meeting Details</h2>

      <p>
        <span className="font-semibold">Title:</span> {data.title}
      </p>

      <p>
        <span className="font-semibold">Time:</span> {data.time}
      </p>

      <p>
        <span className="font-semibold">Participants:</span>{" "}
        {data.participants?.join(", ")}
      </p>
    </div>
  );
}

export default MeetingDetails;