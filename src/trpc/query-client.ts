import { QueryClient } from "@tanstack/react-query";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Pages pass server-rendered data as initialData, so don't refetch it immediately
        staleTime: 30 * 1000,
      },
    },
  });
