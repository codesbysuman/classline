"use strict";

window.ClasslineDB = (() => {
  const DB_NAME = "classline-database";
  const DB_VERSION = 1;
  const STORE_NAME = "app-state";
  const STATE_KEY = "main-state";
  const FALLBACK_KEY = "classline-state-v1";
  
  let databasePromise;
  
  function createInitialState() {
    return {
      version: 1,
      classes: [],
      holidays: [],
      preferences: {
        theme: "light"
      }
    };
  }
  
  function normalizeState(value) {
    const initial = createInitialState();
    
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return initial;
    }
    
    return {
      version: 1,
      classes: Array.isArray(value.classes) ? value.classes : [],
      holidays: Array.isArray(value.holidays) ? value.holidays : [],
      preferences: {
        ...initial.preferences,
        ...(value.preferences && typeof value.preferences === "object" ?
          value.preferences :
          {})
      }
    };
  }
  
  function openDatabase() {
    if (databasePromise) {
      return databasePromise;
    }
    
    databasePromise = new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("IndexedDB is not supported."));
        return;
      }
      
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(
        request.error || new Error("Unable to open the database.")
      );
    });
    
    return databasePromise;
  }
  
  function readIndexedDB() {
    return openDatabase().then(db => new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(STATE_KEY);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    }));
  }
  
  function writeIndexedDB(state) {
    return openDatabase().then(db => new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      
      transaction.objectStore(STORE_NAME).put(state, STATE_KEY);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(
        transaction.error || new Error("Database transaction aborted.")
      );
    }));
  }
  
  function readFallback() {
    try {
      const raw = localStorage.getItem(FALLBACK_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  
  function writeFallback(state) {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(state));
  }
  
  async function load() {
    try {
      const indexedState = await readIndexedDB();
      
      if (indexedState) {
        return normalizeState(indexedState);
      }
    } catch (error) {
      console.warn("IndexedDB unavailable; using LocalStorage.", error);
    }
    
    return normalizeState(readFallback());
  }
  
  async function save(state) {
    const normalized = normalizeState(state);
    
    try {
      await writeIndexedDB(normalized);
    } catch (error) {
      console.warn("IndexedDB save failed; using LocalStorage.", error);
      writeFallback(normalized);
    }
    
    return normalized;
  }
  
  function validateBackup(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Backup must be a JSON object.");
    }
    
    if (!Array.isArray(value.classes) || !Array.isArray(value.holidays)) {
      throw new Error("Backup must contain classes and holidays arrays.");
    }
    
    return normalizeState(value);
  }
  
  return {
    createInitialState,
    normalizeState,
    load,
    save,
    validateBackup
  };
})();