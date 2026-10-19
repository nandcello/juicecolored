export const themeStorageKey = "learn-theme";

// Runs before first paint so a saved choice never flashes the other theme.
export const themeScript = `(function(){try{var t=localStorage.getItem("${themeStorageKey}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}})()`;
