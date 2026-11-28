/**
 * Sets a device page's theme (the vote page, the host views) before it first paints, so a light
 * device never flashes dark: an inline script in the page's HTML. Its text is fixed; nothing in it comes from a visitor. In a
 * file of its own, without React, because the page's server code imports it.
 */

/** Where the voter's pick is remembered on the device */
export const THEME_STORAGE_KEY = "awardbro-theme";
/** The device's light setting */
export const LIGHT_QUERY = "(prefers-color-scheme: light)";

export const DEVICE_THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("${LIGHT_QUERY}").matches?"light":"dark";if(t==="light")document.documentElement.dataset.theme="light"}catch(e){}})()`;
