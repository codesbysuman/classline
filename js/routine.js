"use strict";

window.ClasslineRoutine = (() => {
  let state;
  
  function setState(nextState) {
    state = nextState;
  }
  
  function getState() {
    return state;
  }
  
  function sortClasses(classes) {
    return [...classes].sort((a, b) => {
      return a.startTime.localeCompare(b.startTime) ||
        a.name.localeCompare(b.name);
    });
  }
  
  function getHoliday(dateString) {
    return state.holidays.find(item => item.date === dateString) || null;
  }
  
  function getClassesForDate(dateString) {
    if (getHoliday(dateString)) {
      return [];
    }
    
    const date = window.ClasslineCalendar.fromISODate(dateString);
    const weekday = date.getDay();
    
    return sortClasses(state.classes.filter(item => {
      if (item.date) {
        return item.date === dateString;
      }
      
      return Array.isArray(item.days) && item.days.includes(weekday);
    }));
  }
  
  function escapeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }
  
  function createClassCard(item, showDate = false) {
    const card = document.createElement("article");
    card.className = "class-card";
    
    const time = document.createElement("div");
    time.className = "class-time";
    time.textContent = `${item.startTime} – ${item.endTime}`;
    
    const line = document.createElement("div");
    line.className = "class-time-line";
    
    const details = document.createElement("div");
    details.className = "class-details";
    
    const title = document.createElement("h3");
    title.textContent = item.name;
    
    const subtitle = document.createElement("p");
    
    const parts = [];
    
    if (item.location) parts.push(item.location);
    
    if (item.date && showDate) {
      parts.push(item.date);
    } else if (!item.date && Array.isArray(item.days)) {
      const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      parts.push(item.days.map(day => labels[day]).join(", "));
    }
    
    subtitle.textContent = parts.join(" · ") || "Class";
    
    details.append(title, subtitle);
    
    const actions = document.createElement("div");
    actions.className = "card-actions";
    
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "small-button";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => {
      window.ClasslineApp.openClassDialog(item);
    });
    
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "small-button danger-button";
    remove.textContent = "Delete";
    remove.addEventListener("click", async () => {
      const confirmed = window.confirm(`Delete "${item.name}"?`);
      
      if (!confirmed) return;
      
      state.classes = state.classes.filter(entry => entry.id !== item.id);
      await window.ClasslineApp.persist();
      window.ClasslineApp.renderAll();
      window.ClasslineApp.toast("Class deleted.");
    });
    
    actions.append(edit, remove);
    card.append(time, line, details, actions);
    
    return card;
  }
  
  function renderRoutineList() {
    const container = document.getElementById("routine-list");
    container.replaceChildren();
    
    const classes = sortClasses(state.classes);
    
    if (!classes.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      
      const title = document.createElement("strong");
      title.textContent = "Your routine starts here";
      
      const message = document.createElement("p");
      message.textContent = "Add your first recurring class or one-time session.";
      
      empty.append(title, message);
      container.append(empty);
      return;
    }
    
    classes.forEach(item => {
      container.append(createClassCard(item, true));
    });
  }
  
  function renderHolidayList() {
    const container = document.getElementById("holiday-list");
    container.replaceChildren();
    
    const holidays = [...state.holidays].sort((a, b) => a.date.localeCompare(b.date));
    
    if (!holidays.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      
      const title = document.createElement("strong");
      title.textContent = "No holidays added";
      
      const message = document.createElement("p");
      message.textContent =
        "Add college holidays, closures or other dates without classes.";
      
      empty.append(title, message);
      container.append(empty);
      return;
    }
    
    holidays.forEach(item => {
      const card = document.createElement("article");
      card.className = "class-card";
      
      const time = document.createElement("div");
      time.className = "class-time";
      time.textContent = item.date;
      
      const line = document.createElement("div");
      line.className = "class-time-line";
      line.style.background = "var(--red)";
      
      const details = document.createElement("div");
      details.className = "class-details";
      
      const title = document.createElement("h3");
      title.textContent = item.name;
      
      const note = document.createElement("p");
      note.textContent = item.note || "Holiday / college closure";
      
      details.append(title, note);
      
      const remove = document.createElement("button");
      remove.className = "small-button danger-button";
      remove.type = "button";
      remove.textContent = "Delete";
      
      remove.addEventListener("click", async () => {
        if (!window.confirm(`Delete holiday "${item.name}"?`)) return;
        
        state.holidays = state.holidays.filter(entry => entry.id !== item.id);
        await window.ClasslineApp.persist();
        window.ClasslineApp.renderAll();
        window.ClasslineApp.toast("Holiday deleted.");
      });
      
      const actions = document.createElement("div");
      actions.className = "card-actions";
      actions.append(remove);
      
      card.append(time, line, details, actions);
      container.append(card);
    });
  }
  
  return {
    setState,
    getState,
    getHoliday,
    getClassesForDate,
    createClassCard,
    renderRoutineList,
    renderHolidayList,
    escapeText,
    sortClasses
  };
})();