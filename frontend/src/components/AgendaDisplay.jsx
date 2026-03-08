import React from "react";

function AgendaDisplay({ agenda }) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h2 className="text-xl font-semibold mb-2">Agenda</h2>

      <ol className="list-decimal pl-5 space-y-1">
        {agenda?.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ol>
    </div>
  );
}

export default AgendaDisplay;