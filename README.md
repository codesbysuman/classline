# Classline — Class Routine Planner

A responsive class timetable planner built with vanilla HTML, CSS, and JavaScript.

## Features

- Responsive calendar with week and month views
- Recurring classes and one-time sessions
- Manually managed holidays
- Recurring classes are suppressed on configured holidays
- AI-assisted timetable creation through a generated prompt and JSON import
- JSON validation and confirmation before replacing the current routine
- Dark and light themes
- IndexedDB storage with LocalStorage fallback
- JSON backup and restore
- Basic offline caching through a service worker
- No external JavaScript dependencies

## Run locally

The service worker and some browser APIs require localhost or HTTPS.

If Python is installed, open a terminal in this directory and run:

    python -m http.server 8000

Then open:

    http://localhost:8000

Alternatively, use a local development server in your code editor.

## AI workflow

1. Open AI assistant.
2. Describe the timetable.
3. Generate and copy the prompt.
4. Paste it into your preferred AI assistant.
5. Ask the AI to return valid JSON only.
6. Paste the JSON back into Classline.
7. Validate, review, and confirm the import.

AI output is treated as untrusted input. It is parsed, validated, and confirmed
before being applied. Review the imported timetable carefully.

## Data and privacy

The application stores its data locally in the browser. There is no app server
or automatic upload of the timetable. If you send the generated prompt to an
external AI service, the information you include is subject to that service's
privacy policies.

Export a backup before clearing browser storage or changing devices.

## Browser support

A modern browser is recommended. Clipboard access and service workers work best
when the app is served from localhost or HTTPS.