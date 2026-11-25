import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { describeManageError, type ManageError } from "~/lib/manage-error";

/**
 * Error handler for the manage page's actions: `onError: onManageError("Failed to …")`. Every
 * mutation on the manage page uses it.
 *
 * If the host has lost manage access, it shows the server's message once, however many actions
 * failed, and refreshes the page, which then renders the password form. Any other error shows
 * `fallback`, or the server's message when there's none.
 */
export const useManageErrorHandler = () => {
  const router = useRouter();

  return (fallback?: string) => (error: ManageError) => {
    const { accessLost, message } = describeManageError(error, fallback);
    if (accessLost) {
      toast.error(message, { id: "manage-access-lost" });
      router.refresh();
      return;
    }
    toast.error(message);
  };
};
