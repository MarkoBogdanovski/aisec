import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    chainId: string;
    address: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { chainId, address } = await context.params;

  return NextResponse.json({
    chain_id: chainId,
    contract_address: address,
    persisted: false,
    history: [],
    message: "Contract analysis history is not persisted in the Next.js migration target.",
  });
}
