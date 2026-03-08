# AI Meeting Preparation Assistant

## Project Structure

```
AI Automation Assignment/
├── backend/
│   ├── controllers/
│   │   ├── calendarController.js
│   │   ├── emailController.js
│   │   └── meetingController.js
│   ├── routes/
│   │   ├── calendar.js
│   │   ├── email.js
│   │   └── meeting.js
│   ├── services/
│   ├── utils/
│   ├── config/
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       │   ├── AgendaDisplay.js
│       │   ├── CommandInput.js
│       │   ├── EmailDraftPreview.js
│       │   └── MeetingDetails.js
│       ├── pages/
│       ├── styles/
│       │   ├── App.css
│       │   └── index.css
│       ├── App.js
│       └── index.js
├── Client secret&Client ID.txt
├── client_secret_184305149718-bd31jrv76rt0dvh9uth029q8kab0n3u0.apps.googleusercontent.com.json
├── sendergrid APIKEYSG.pNS-6JyjT9-bgGt.txt
└── twilio_2FA_recovery_code.txt
```

## Setup Instructions

### Backend

1. `cd backend`
2. Copy `.env.example` to `.env` and fill in your credentials.
3. Run `npm install` to install dependencies.
4. Start server: `npm run dev` (for development with nodemon) or `npm start`.

### Frontend

1. `cd frontend`
2. Run `npm install` to install dependencies.
3. Start app: `npm start`

## Features

- Natural language meeting requests
- AI-powered agenda and email draft generation
- Google Calendar and SendGrid integration (API logic to be implemented)

## Professional Notes

- All secrets are kept out of source code and referenced via environment variables.
- Modular folder structure for scalability and maintainability.
- Ready for further API and UI enhancements.
