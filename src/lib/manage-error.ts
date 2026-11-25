import { type TRPCClientErrorLike } from "@trpc/client";

import { type AppRouter } from "~/server/api/root";

export type ManageError = TRPCClientErrorLike<AppRouter>;

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

/**
 * What the manage page shows for a failed action. `accessLost` means the host's manage access
 * is gone (the cookie expired while the page was open), so the page should show the password
 * form again.
 */
export const describeManageError = (error: ManageError, fallback?: string) =>
  error.data?.code === "UNAUTHORIZED"
    ? { accessLost: true, message: error.message || GENERIC_MESSAGE }
    : {
        accessLost: false,
        message: fallback ?? (error.message || GENERIC_MESSAGE),
      };
