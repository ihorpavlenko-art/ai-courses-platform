// API route error handling wrapper — placeholder for Task 1.3
// This file will contain the withErrorHandling higher-order function

import { NextResponse } from "next/server";
import { AppError } from "./errors";

type RouteHandler = (
  request: Request,
  context?: unknown
) => Promise<NextResponse>;

export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (request: Request, context?: unknown) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof AppError) {
        return NextResponse.json(
          {
            error: {
              code: error.code,
              message: error.message,
              details: error.details,
            },
            statusCode: error.statusCode,
          },
          { status: error.statusCode }
        );
      }

      console.error("Unhandled API error:", error);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred",
          },
          statusCode: 500,
        },
        { status: 500 }
      );
    }
  };
}
