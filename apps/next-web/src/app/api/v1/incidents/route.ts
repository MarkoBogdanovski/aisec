import { NextRequest, NextResponse } from "next/server";
import { correlationRepository } from "@/lib/correlation/repository";
import { respondWithError } from "@/lib/http/route";

export async function GET(request: NextRequest) {
  try {
    const severity = request.nextUrl.searchParams.get("severity");
    const status = request.nextUrl.searchParams.get("status");
    const incidents = await correlationRepository.listIncidents({ severity, status });
    return NextResponse.json(incidents);
  } catch (error) {
    return respondWithError(error);
  }
}
