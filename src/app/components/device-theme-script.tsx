import { DEVICE_THEME_SCRIPT } from "~/lib/device-theme-script";

/**
 * Sets a device page's light or dark theme before its first paint (the vote page and the host
 * views), so a light device never flashes dark. Fixed text, with nothing from a visitor in it.
 */
export function DeviceThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: DEVICE_THEME_SCRIPT }} />;
}
