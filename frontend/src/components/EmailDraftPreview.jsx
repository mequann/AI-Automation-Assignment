import React from "react";

function EmailDraftPreview({ draft }) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h2 className="text-xl font-semibold mb-2">Email Draft</h2>

      <pre className="whitespace-pre-wrap break-words bg-gray-100 p-4 rounded-md text-sm">
        {draft}
      </pre>
    </div>
  );
}

export default EmailDraftPreview;