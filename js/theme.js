"use strict";

window.ClasslineTheme = (() => {
  const root = document.documentElement;
  
  function getTheme() {
    return root.dataset.theme === "dark" ? "dark" : "light";
  }
  
  function apply(theme) {
    const normalized = theme === "dark" ? "dark" : "light";
    
    root.dataset.theme = normalized;
    
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    
    if (metaTheme) {
      metaTheme.content = normalized === "dark" ? "#101010" : "#f5f5f3";
    }
    
    return normalized;
  }
  
  function toggle() {
    return apply(getTheme() === "dark" ? "light" : "dark");
  }
  
  return {
    getTheme,
    apply,
    toggle
  };
})();