import { NextResponse } from "next/server";
import { HttpError } from "./errors";

export function respondWithError(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : "Unexpected error",
    },
    { status: 500 },
  );
}
