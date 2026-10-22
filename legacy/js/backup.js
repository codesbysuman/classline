"use strict";

window.ClasslineBackup = (() => {
  function download(filename, content) {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;

    document.body.append(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportData(state) {
    const date = new Date().toISOString().slice(0, 10);

    download(
      `classline-backup-${date}.json`,
      JSON.stringify(state, null, 2)
    );
  }

  async function importFile(file) {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("The backup file is too large.");
    }

    const raw = await file.text();

    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("This file does not contain valid JSON.");
    }

    return window.ClasslineDB.validateBackup(parsed);
  }

  return {
    exportData,
    importFile
  };
})();