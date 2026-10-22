"use strict";

window.ClasslineAI = (() => {
  let pendingImport = null;

  function getPrompt() {
    const description =
      document.getElementById("routine-description").value.trim();

    const startDate =
      document.getElementById("academic-start").value;

    const endDate =
      document.getElementById("academic-end").value;

    if (!description) {
      throw new Error("Describe your classes and timetable first.");
    }

    if (startDate && endDate && startDate > endDate) {
      throw new Error("The academic start date must be before the end date.");
    }

    return `You are helping organise an academic class timetable.

Convert the user's description into a JSON object matching the schema below.
Return ONLY valid JSON. Do not use Markdown fences, explanations, comments,
or trailing commas.

USER'S TIMETABLE DESCRIPTION:
${description}

ACADEMIC PERIOD:
Start date: ${startDate || "Not specified"}
End date: ${endDate || "Not specified"}

JSON SCHEMA:
{
  "classes": [
    {
      "name": "Subject name",
      "startTime": "09:00",
      "endTime": "10:00",
      "location": "Optional room or location",
      "days": [1, 3, 5],
      "date": null
    }
  ],
  "holidays": [
    {
      "name": "Holiday name",
      "date": "YYYY-MM-DD",
      "note": "Optional note"
    }
  ]
}

RULES:
1. Use 24-hour HH:MM time strings.
2. Weekday numbers: Sunday=0, Monday=1, Tuesday=2, Wednesday=3,
   Thursday=4, Friday=5, Saturday=6.
3. For recurring classes, use a days array and set date to null.
4. For a one-time class, set date to YYYY-MM-DD and days to [].
5. Include only details that the user supplied or that can be safely derived.
6. Never invent exact class times, dates, or holidays. If something essential
   is missing, ask the user for clarification instead of guessing.
7. Keep holiday dates in YYYY-MM-DD format.
8. Do not include properties other than classes and holidays at the root.
9. Return valid JSON only.

Return the completed JSON object now.`;
  }

  function showStatus(message, type = "") {
    const element = document.getElementById("assistant-status");
    element.textContent = message;
    element.className = `status-message ${type}`.trim();
  }

  function validateTime(value) {
    return typeof value === "string" &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  }

  function validateDate(value) {
    if (typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const parsed = new Date(`${value}T12:00:00`);

    return !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value;
  }

  function validateClass(item, index) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`Class ${index + 1} must be an object.`);
    }

    if (typeof item.name !== "string" ||
        !item.name.trim() ||
        item.name.length > 100) {
      throw new Error(`Class ${index + 1} needs a valid name.`);
    }

    if (!validateTime(item.startTime) || !validateTime(item.endTime)) {
      throw new Error(`Class ${index + 1} has an invalid time.`);
    }

    if (item.startTime >= item.endTime) {
      throw new Error(`Class ${index + 1} must end after it starts.`);
    }

    if (item.location != null &&
        (typeof item.location !== "string" || item.location.length > 100)) {
      throw new Error(`Class ${index + 1} has an invalid location.`);
    }

    if (!Array.isArray(item.days) ||
        !item.days.every(day =>
          Number.isInteger(day) && day >= 0 && day <= 6
        )) {
      throw new Error(`Class ${index + 1} has invalid weekdays.`);
    }

    if (new Set(item.days).size !== item.days.length) {
      throw new Error(`Class ${index + 1} contains duplicate weekdays.`);
    }

    if (item.date != null && !validateDate(item.date)) {
      throw new Error(`Class ${index + 1} has an invalid date.`);
    }

    if (item.date && item.days.length) {
      throw new Error(
        `Class ${index + 1} cannot be both one-time and recurring.`
      );
    }

    if (!item.date && !item.days.length) {
      throw new Error(
        `Class ${index + 1} needs weekdays or a one-time date.`
      );
    }

    return {
      id: crypto.randomUUID(),
      name: item.name.trim(),
      startTime: item.startTime,
      endTime: item.endTime,
      location: (item.location || "").trim(),
      days: [...item.days],
      date: item.date || null
    };
  }

  function validateHoliday(item, index) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`Holiday ${index + 1} must be an object.`);
    }

    if (typeof item.name !== "string" ||
        !item.name.trim() ||
        item.name.length > 100) {
      throw new Error(`Holiday ${index + 1} needs a valid name.`);
    }

    if (!validateDate(item.date)) {
      throw new Error(`Holiday ${index + 1} has an invalid date.`);
    }

    if (item.note != null &&
        (typeof item.note !== "string" || item.note.length > 500)) {
      throw new Error(`Holiday ${index + 1} has an invalid note.`);
    }

    return {
      id: crypto.randomUUID(),
      name: item.name.trim(),
      date: item.date,
      note: (item.note || "").trim()
    };
  }

  function parseAndValidate(raw) {
    let value;

    try {
      value = JSON.parse(raw);
    } catch {
      throw new Error("Invalid JSON. Check the braces, commas and quotation marks.");
    }

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("The response must be a JSON object.");
    }

    if (!Array.isArray(value.classes) || !Array.isArray(value.holidays)) {
      throw new Error('The JSON must contain both "classes" and "holidays" arrays.');
    }

    if (value.classes.length > 300 || value.holidays.length > 500) {
      throw new Error("The imported routine contains too many entries.");
    }

    const classes = value.classes.map(validateClass);
    const holidays = value.holidays.map(validateHoliday);

    const classKeys = new Set();

    for (const item of classes) {
      const key = JSON.stringify([
        item.name.toLowerCase(),
        item.startTime,
        item.endTime,
        item.date,
        item.days
      ]);

      if (classKeys.has(key)) {
        throw new Error(`Possible duplicate class: "${item.name}".`);
      }

      classKeys.add(key);
    }

    const holidayDates = new Set();

    for (const item of holidays) {
      if (holidayDates.has(item.date)) {
        throw new Error(`Multiple holidays use the date ${item.date}.`);
      }

      holidayDates.add(item.date);
    }

    return { classes, holidays };
  }

  function showPreview(data) {
    const container = document.getElementById("import-preview");
    container.replaceChildren();

    const panel = document.createElement("div");
    panel.className = "import-review";

    const title = document.createElement("h3");
    title.textContent = "Review before applying";

    const summary = document.createElement("p");
    summary.textContent =
      `${data.classes.length} class entries and ` +
      `${data.holidays.length} holidays will be imported. ` +
      "Applying this routine will replace your current classes and holidays.";

    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.className = "primary-button";
    confirm.textContent = "Confirm and replace routine";

    confirm.addEventListener("click", async () => {
      const accepted = window.confirm(
        "Replace all existing classes and holidays with this imported routine? " +
        "Export a backup first if you need to preserve your current data."
      );

      if (!accepted) return;

      await window.ClasslineApp.replaceRoutine(data);
      pendingImport = null;
      container.replaceChildren();
      showStatus("Routine imported successfully.", "success");
    });

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "secondary-button";
    cancel.textContent = "Cancel import";

    cancel.addEventListener("click", () => {
      pendingImport = null;
      container.replaceChildren();
      showStatus("Import cancelled.");
    });

    const actions = document.createElement("div");
    actions.className = "button-row";
    actions.append(confirm, cancel);

    panel.append(title, summary, actions);
    container.append(panel);
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";

    document.body.append(textarea);
    textarea.select();

    const successful = document.execCommand("copy");
    textarea.remove();

    if (!successful) {
      throw new Error("Copy failed. Select the text and copy it manually.");
    }
  }

  async function readClipboard() {
    try {
      if (!navigator.clipboard?.readText) {
        throw new Error(
          "Clipboard access is unavailable here. Paste your JSON manually."
        );
      }

      const text = await navigator.clipboard.readText();

      if (!text.trim()) {
        throw new Error("Your clipboard is empty.");
      }

      document.getElementById("routine-json").value = text;
      showStatus("Clipboard text loaded. Validate it before importing.", "success");
    } catch (error) {
      showStatus(
        error.message || "Clipboard access was denied. Paste your JSON manually.",
        "error"
      );
    }
  }

  async function sharePrompt() {
    const prompt = document.getElementById("generated-prompt").value;

    if (!prompt) {
      showStatus("Generate a prompt first.", "error");
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Classline timetable prompt",
          text: prompt
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          showStatus("Sharing failed. You can copy the prompt instead.", "error");
        }
      }

      return;
    }

    try {
      await copyText(prompt);
      showStatus("Sharing is unavailable; the prompt was copied instead.", "success");
    } catch (error) {
      showStatus(error.message, "error");
    }
  }

  function generate() {
    try {
      const prompt = getPrompt();
      document.getElementById("generated-prompt").value = prompt;
      showStatus("Prompt generated. Copy or share it with your AI assistant.", "success");
    } catch (error) {
      showStatus(error.message, "error");
    }
  }

  function validate() {
    try {
      const raw = document.getElementById("routine-json").value.trim();

      if (!raw) {
        throw new Error("Paste your AI-generated JSON first.");
      }

      pendingImport = parseAndValidate(raw);
      showPreview(pendingImport);
      showStatus("Validation successful. Review the import before confirming.", "success");
    } catch (error) {
      pendingImport = null;
      document.getElementById("import-preview").replaceChildren();
      showStatus(error.message, "error");
    }
  }

  return {
    generate,
    validate,
    copyPrompt: async () => {
      try {
        const prompt = document.getElementById("generated-prompt").value;

        if (!prompt) {
          showStatus("Generate a prompt first.", "error");
          return;
        }

        await copyText(prompt);
        showStatus("Prompt copied.", "success");
      } catch (error) {
        showStatus(error.message, "error");
      }
    },
    sharePrompt,
    readClipboard
  };
})();