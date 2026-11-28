import { DeviceTheme } from "~/app/components/device-theme";

/** The host views (setup, the run view and their password pages) follow the device's theme */
export default function HostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DeviceTheme />
      {children}
    </>
  );
}
