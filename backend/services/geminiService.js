// Gemini AI Service for meeting request parsing and agenda generation
const axios = require('axios');

const GEMINI_API_URL = process.env.GEMINI_API_URL;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Sends a natural language meeting request to Gemini AI and returns structured meeting data.
 * @param {string} request - The user's meeting request.
 * @returns {Promise<Object>} Structured meeting details, agenda, action items.
 */
async function parseMeetingRequest(request) {
  try {
    const prompt = `You are an AI executive assistant. Extract meeting details and generate a professional agenda.\nInput request: "${request}"\nReturn structured JSON including meeting title, participants, meeting time, agenda items, suggested action items.`;
    const response = await axios.post(
      GEMINI_API_URL,
      {
        prompt,
        api_key: GEMINI_API_KEY
      }
    );
    return response.data;
  } catch (error) {
    throw new Error('Gemini API error: ' + error.message);
  }
}

module.exports = {
  parseMeetingRequest
};
