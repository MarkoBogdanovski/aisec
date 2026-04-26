import { NextResponse } from "next/server";
import { correlationRepository } from "@/lib/correlation/repository";
import { NotFoundError } from "@/lib/http/errors";
import { respondWithError } from "@/lib/http/route";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const incident = await correlationRepository.getIncident(id);

    if (!incident) {
      throw new NotFoundError("Incident not found");
    }

    return NextResponse.json(incident);
  } catch (error) {
    return respondWithError(error);
  }
}
