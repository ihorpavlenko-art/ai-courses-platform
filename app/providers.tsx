"use client";

import { SessionProvider } from "next-auth/react";
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from "@tanstack/react-query";
import { useState, useRef, useCallback } from "react";
import { ToastProvider, useToast } from "./components/toast";

function QueryProviderWithToast({ children }: { children: React.ReactNode }) {
  const { addToast } = useToast();

  // Use a ref to keep the addToast function stable for QueryClient
  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;

  const handleError = useCallback((error: Error) => {
    const message =
      error.message && error.message !== "Failed to fetch"
        ? error.message
        : "Something went wrong. Please try again.";
    addToastRef.current(message, "error");
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => handleError(error),
        }),
        mutationCache: new MutationCache({
          onError: (error) => handleError(error),
        }),
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 3,
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff: 1s, 2s, 4s (capped at 30s)
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 3,
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000),
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <QueryProviderWithToast>{children}</QueryProviderWithToast>
      </ToastProvider>
    </SessionProvider>
  );
}
