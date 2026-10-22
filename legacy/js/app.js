"use strict";

window.ClasslineApp = (() => {
  let state;
  let toastTimer;

  const titles = {
    calendar: "Calendar",
    routine: "My routine",
    holidays: "Holidays",
    assistant: "AI assistant",
    settings: "Settings"
  };

  function createId() {
    if (crypto.randomUUID) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  async function persist() {
    state = await window.ClasslineDB.save(state);
    window.ClasslineRoutine.setState(state);
  }

  function toast(message) {
    const element = document.getElementById("toast");

    element.textContent = message;
    element.classList.add("visible");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      element.classList.remove("visible");
    }, 2600);
  }

  function navigate(view) {
    if (!titles[view]) return;

    document.querySelectorAll(".view").forEach(element => {
      element.classList.toggle("active", element.id === `view-${view}`);
    });

    document.querySelectorAll("[data-view]").forEach(button => {
      button.classList.toggle("active", button.dataset.view === view);
    });

    document.getElementById("page-title").textContent = titles[view];

    document.getElementById("sidebar").classList.remove("open");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderAll() {
    window.ClasslineRoutine.setState(state);
    window.ClasslineCalendar.render();
    window.ClasslineRoutine.renderRoutineList();
    window.ClasslineRoutine.renderHolidayList();
  }

  function clearClassForm() {
    document.getElementById("class-form").reset();
    document.getElementById("class-id").value = "";
    document.getElementById("class-dialog-title").textContent = "Add a class";
  }

  function openClassDialog(item = {}) {
    clearClassForm();

    document.getElementById("class-dialog-title").textContent =
      item.id ? "Edit class" : "Add a class";

    document.getElementById("class-id").value = item.id || "";
    document.getElementById("class-name").value = item.name || "";
    document.getElementById("class-start").value = item.startTime || "";
    document.getElementById("class-end").value = item.endTime || "";
    document.getElementById("class-location").value = item.location || "";
    document.getElementById("class-date").value =
      item.date || item.selectedDate || "";

    document.querySelectorAll("#weekday-picker input").forEach(input => {
      input.checked = Array.isArray(item.days) && item.days.includes(Number(input.value));
    });

    document.getElementById("class-dialog").showModal();
  }

  function openHolidayDialog(date = "") {
    document.getElementById("holiday-form").reset();
    document.getElementById("holiday-date").value =
      date || window.ClasslineCalendar.getSelectedDate();

    document.getElementById("holiday-dialog").showModal();
  }

  function saveClass(event) {
    event.preventDefault();

    const id = document.getElementById("class-id").value;
    const name = document.getElementById("class-name").value.trim();
    const startTime = document.getElementById("class-start").value;
    const endTime = document.getElementById("class-end").value;
    const location = document.getElementById("class-location").value.trim();
    const date = document.getElementById("class-date").value || null;

    const days = [...document.querySelectorAll("#weekday-picker input:checked")]
      .map(input => Number(input.value));

    if (startTime >= endTime) {
      toast("End time must be later than start time.");
      return;
    }

    if (date && days.length) {
      toast("For a one-time class, clear the recurring weekdays.");
      return;
    }

    if (!date && !days.length) {
      toast("Select weekdays or choose a one-time date.");
      return;
    }

    const item = {
      id: id || createId(),
      name,
      startTime,
      endTime,
      location,
      days,
      date
    };

    const existingIndex = state.classes.findIndex(entry => entry.id === id);

    if (existingIndex >= 0) {
      state.classes[existingIndex] = item;
    } else {
      state.classes.push(item);
    }

    persist().then(() => {
      document.getElementById("class-dialog").close();
      renderAll();
      toast(id ? "Class updated." : "Class added.");
    }).catch(error => {
      console.error(error);
      toast("Unable to save this class.");
    });
  }

  function saveHoliday(event) {
    event.preventDefault();

    const name = document.getElementById("holiday-name").value.trim();
    const date = document.getElementById("holiday-date").value;
    const note = document.getElementById("holiday-note").value.trim();

    if (state.holidays.some(item => item.date === date)) {
      toast("A holiday already exists on that date.");
      return;
    }

    state.holidays.push({
      id: createId(),
      name,
      date,
      note
    });

    persist().then(() => {
      document.getElementById("holiday-dialog").close();
      renderAll();
      toast("Holiday saved.");
    }).catch(error => {
      console.error(error);
      toast("Unable to save the holiday.");
    });
  }

  async function replaceRoutine(data) {
    state.classes = data.classes;
    state.holidays = data.holidays;

    await persist();
    renderAll();
    toast("Your routine has been replaced.");
  }

  function bindNavigation() {
    document.querySelectorAll("[data-view]").forEach(button => {
      button.addEventListener("click", () => navigate(button.dataset.view));
    });

    document.querySelectorAll("[data-close-dialog]").forEach(button => {
      button.addEventListener("click", () => {
        button.closest("dialog").close();
      });
    });
  }

  function bindEvents() {
    bindNavigation();

    document.getElementById("quick-add").addEventListener("click", () => {
      openClassDialog({ date: window.ClasslineCalendar.getSelectedDate() });
    });

    document.getElementById("routine-add-class").addEventListener("click", () => {
      openClassDialog();
    });

    document.getElementById("add-holiday").addEventListener("click", () => {
      openHolidayDialog();
    });

    document.getElementById("add-holiday-from-calendar")
      .addEventListener("click", () => {
        openHolidayDialog(window.ClasslineCalendar.getSelectedDate());
      });

    document.getElementById("previous-week").addEventListener("click", () => {
      window.ClasslineCalendar.previous();
    });

    document.getElementById("next-week").addEventListener("click", () => {
      window.ClasslineCalendar.next();
    });

    document.getElementById("today-button").addEventListener("click", () => {
      window.ClasslineCalendar.today();
    });

    document.getElementById("month-toggle").addEventListener("click", () => {
      window.ClasslineCalendar.toggleMode();
    });

    document.getElementById("class-form").addEventListener("submit", saveClass);
    document.getElementById("holiday-form").addEventListener("submit", saveHoliday);

    document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
    document.getElementById("settings-theme-toggle")
      .addEventListener("click", toggleTheme);

    document.getElementById("generate-prompt").addEventListener("click", () => {
      window.ClasslineAI.generate();
    });

    document.getElementById("copy-prompt").addEventListener("click", () => {
      window.ClasslineAI.copyPrompt();
    });

    document.getElementById("share-prompt").addEventListener("click", () => {
      window.ClasslineAI.sharePrompt();
    });

    document.getElementById("read-clipboard").addEventListener("click", () => {
      window.ClasslineAI.readClipboard();
    });

    document.getElementById("validate-routine").addEventListener("click", () => {
      window.ClasslineAI.validate();
    });

    document.getElementById("export-data").addEventListener("click", () => {
      window.ClasslineBackup.exportData(state);
      toast("Backup exported.");
    });

    document.getElementById("import-data-button").addEventListener("click", () => {
      document.getElementById("import-data-file").click();
    });

    document.getElementById("import-data-file").addEventListener("change", async event => {
      const file = event.target.files[0];

      try {
        const imported = await window.ClasslineBackup.importFile(file);

        if (!imported) return;

        const confirmed = window.confirm(
          "Restore this backup? Your current classes and holidays will be replaced."
        );

        if (!confirmed) return;

        state = imported;
        await persist();
        renderAll();
        toast("Backup restored.");
      } catch (error) {
        toast(error.message || "Unable to restore backup.");
      } finally {
        event.target.value = "";
      }
    });

    // Returning to the app does not grant clipboard access automatically.
    // Offer a manual action rather than silently reading private clipboard data.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        const textarea = document.getElementById("routine-json");

        if (document.getElementById("view-assistant").classList.contains("active") &&
            !textarea.value.trim()) {
          toast("Back from your AI assistant? Paste or read the returned JSON.");
        }
      }
    });
  }

  async function toggleTheme() {
    const theme = window.ClasslineTheme.toggle();

    state.preferences.theme = theme;

    try {
      await persist();
    } catch (error) {
      console.error(error);
      toast("Theme changed, but saving the preference failed.");
      return;
    }

    toast(`${theme === "dark" ? "Dark" : "Light"} theme enabled.`);
  }

  async function init() {
    state = await window.ClasslineDB.load();

    window.ClasslineRoutine.setState(state);
    window.ClasslineTheme.apply(state.preferences.theme || "light");

    const today = new Date();

    document.getElementById("today-label").textContent =
      new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long"
      }).format(today).toUpperCase();

    bindEvents();
    renderAll();

    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("./sw.js").catch(error => {
        console.warn("Service worker registration failed.", error);
      });
    }
  }

  return {
    init,
    persist,
    renderAll,
    toast,
    navigate,
    openClassDialog,
    openHolidayDialog,
    replaceRoutine
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  window.ClasslineApp.init().catch(error => {
    console.error("Classline failed to start.", error);
    alert("The app could not start. Try reloading the page.");
  });
});