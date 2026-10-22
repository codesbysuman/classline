"use strict";

window.ClasslineCalendar = (() => {
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let currentDate = new Date();
  let selectedDate = toISODate(new Date());
  let monthMode = false;

  function toISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function fromISODate(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function addDays(date, amount) {
    const result = new Date(date);
    result.setDate(result.getDate() + amount);
    return result;
  }

  function startOfWeek(date) {
    const result = new Date(date);
    result.setHours(12, 0, 0, 0);
    result.setDate(result.getDate() - result.getDay() + 1);

    return result;
  }

  function formatDate(date, options = {}) {
    return new Intl.DateTimeFormat(undefined, options).format(date);
  }

  function getClassesForDate(dateString) {
    return window.ClasslineRoutine.getClassesForDate(dateString);
  }

  function getHoliday(dateString) {
    return window.ClasslineRoutine.getHoliday(dateString);
  }

  function renderWeek() {
    const grid = document.getElementById("week-grid");
    const start = startOfWeek(currentDate);

    grid.replaceChildren();

    const headingEnd = addDays(start, 6);

    document.getElementById("week-heading").textContent =
      `${formatDate(start, { day: "numeric", month: "short" })} – ` +
      `${formatDate(headingEnd, { day: "numeric", month: "short", year: "numeric" })}`;

    for (let index = 0; index < 7; index += 1) {
      const date = addDays(start, index);
      const iso = toISODate(date);
      const classes = getClassesForDate(iso);
      const holiday = getHoliday(iso);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "day-cell";

      if (iso === selectedDate) button.classList.add("selected");
      if (iso === toISODate(new Date())) button.classList.add("today");

      const dayName = document.createElement("span");
      dayName.className = "day-name";
      dayName.textContent = WEEKDAYS[date.getDay()];

      const dayNumber = document.createElement("span");
      dayNumber.className = "day-number";
      dayNumber.textContent = date.getDate();

      const meta = document.createElement("span");
      meta.className = "day-meta";

      if (holiday) {
        meta.classList.add("is-holiday");
        meta.textContent = "Holiday";
      } else if (classes.length) {
        meta.classList.add("has-classes");
        meta.textContent = `${classes.length} class${classes.length === 1 ? "" : "es"}`;
      } else {
        meta.textContent = "Free";
      }

      button.append(dayName, dayNumber, meta);

      button.addEventListener("click", () => {
        selectedDate = iso;
        currentDate = fromISODate(iso);
        render();
      });

      grid.append(button);
    }
  }

  function renderMonth() {
    const grid = document.getElementById("month-grid");
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    grid.replaceChildren();

    WEEKDAYS.forEach(day => {
      const heading = document.createElement("div");
      heading.className = "month-weekday";
      heading.textContent = day;
      grid.append(heading);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const numberOfDays = new Date(year, month + 1, 0).getDate();

    document.getElementById("week-heading").textContent =
      formatDate(currentDate, { month: "long", year: "numeric" });

    for (let index = 0; index < firstDay; index += 1) {
      const empty = document.createElement("div");
      empty.className = "month-day empty";
      grid.append(empty);
    }

    for (let day = 1; day <= numberOfDays; day += 1) {
      const date = new Date(year, month, day);
      const iso = toISODate(date);
      const classes = getClassesForDate(iso);
      const holiday = getHoliday(iso);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "month-day";

      if (iso === selectedDate) button.classList.add("selected");
      if (iso === toISODate(new Date())) button.classList.add("today");

      const number = document.createElement("span");
      number.textContent = day;
      button.append(number);

      if (holiday || classes.length) {
        const meta = document.createElement("small");
        meta.textContent = holiday ? "Holiday" : `${classes.length} class(es)`;
        button.append(meta);
      }

      button.addEventListener("click", () => {
        selectedDate = iso;
        currentDate = fromISODate(iso);
        render();
      });

      grid.append(button);
    }
  }

  function renderSelectedDay() {
    const container = document.getElementById("selected-day-content");
    const date = fromISODate(selectedDate);
    const holiday = getHoliday(selectedDate);
    const classes = getClassesForDate(selectedDate);

    document.getElementById("selected-date-heading").textContent =
      formatDate(date, {
        weekday: "long",
        day: "numeric",
        month: "long"
      });

    container.replaceChildren();

    if (holiday) {
      const notice = document.createElement("div");
      notice.className = "empty-state";

      const title = document.createElement("strong");
      title.textContent = holiday.name;

      const message = document.createElement("p");
      message.textContent = holiday.note
        ? `Holiday · ${holiday.note}`
        : "No recurring classes are scheduled on this holiday.";

      notice.append(title, message);
      container.append(notice);
    }

    if (!classes.length && !holiday) {
      const empty = document.createElement("div");
      empty.className = "empty-state";

      const title = document.createElement("strong");
      title.textContent = "Nothing scheduled";

      const message = document.createElement("p");
      message.textContent = "Enjoy the free time or add a class to your timetable.";

      const button = document.createElement("button");
      button.className = "secondary-button";
      button.type = "button";
      button.textContent = "Add class";
      button.addEventListener("click", () => {
        window.ClasslineApp.openClassDialog({ date: selectedDate });
      });

      empty.append(title, message, button);
      container.append(empty);
      return;
    }

    classes.forEach(item => {
      container.append(window.ClasslineRoutine.createClassCard(item, true));
    });
  }

  function render() {
    renderWeek();
    renderMonth();

    document.getElementById("week-grid").classList.toggle("hidden", monthMode);
    document.getElementById("month-grid").classList.toggle("hidden", !monthMode);

    document.getElementById("month-toggle").textContent =
      monthMode ? "Week view" : "Month view";

    renderSelectedDay();
  }

  function previous() {
    currentDate = addDays(currentDate, monthMode ? -30 : -7);
    render();
  }

  function next() {
    currentDate = addDays(currentDate, monthMode ? 30 : 7);
    render();
  }

  function today() {
    currentDate = new Date();
    selectedDate = toISODate(currentDate);
    render();
  }

  function toggleMode() {
    monthMode = !monthMode;
    render();
  }

  function selectDate(value) {
    selectedDate = value;
    currentDate = fromISODate(value);
    render();
  }

  function getSelectedDate() {
    return selectedDate;
  }

  return {
    render,
    previous,
    next,
    today,
    toggleMode,
    selectDate,
    getSelectedDate,
    toISODate,
    fromISODate,
    formatDate
  };
})();