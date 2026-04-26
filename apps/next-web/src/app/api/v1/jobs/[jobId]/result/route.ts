import { NextResponse } from "next/server";
import { runs } from "@trigger.dev/sdk/v3";
import { NotFoundError } from "@/lib/http/errors";
import { respondWithError } from "@/lib/http/route";
import { configureTrigger } from "@/trigger/configure";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    if (!process.env.TRIGGER_SECRET_KEY) {
      throw new NotFoundError("Trigger.dev is not configured");
    }

    configureTrigger();
    const { jobId } = await context.params;
    const run = await runs.retrieve(jobId);

    return NextResponse.json({
      job_id: run.id,
      status: run.status.toLowerCase(),
      ready: run.isCompleted && Boolean(run.output),
      failed_reason: run.error?.message ?? undefined,
      analysis: run.isCompleted ? run.output ?? undefined : undefined,
    });
  } catch (error) {
    return respondWithError(error);
  }
}
