import { FollowDeviceTheme } from "~/app/components/theme-toggle";
import { DEVICE_THEME_SCRIPT } from "~/lib/device-theme-script";

/**
 * Gives a page on the visitor's own device (the vote page, and the host views through their
 * layout) the device's light or dark theme. The inline script sets it before the first paint of a
 * full load, so a light device never flashes dark; it's fixed text, with nothing from a visitor in
 * it. FollowDeviceTheme sets it on a client navigation, keeps it in step, and takes it off when
 * the page closes. Every screen under it follows, the password form included.
 */
export function DeviceTheme() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: DEVICE_THEME_SCRIPT }} />
      <FollowDeviceTheme />
    </>
  );
}
