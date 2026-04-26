type RequiredEnvKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "TRIGGER_SECRET_KEY"
  | "TRIGGER_PROJECT_REF";

export function readEnvSummary() {
  const requiredKeys: RequiredEnvKey[] = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "TRIGGER_SECRET_KEY",
    "TRIGGER_PROJECT_REF",
  ];

  return {
    required: requiredKeys.map((key) => ({
      key,
      present: Boolean(process.env[key]),
    })),
    optional: [
      "ETHEREUM_RPC_URL",
      "POLYGON_RPC_URL",
      "BASE_RPC_URL",
      "ARBITRUM_RPC_URL",
      "CRYPTOAPIS_API_KEY",
    ].map((key) => ({
      key,
      present: Boolean(process.env[key]),
    })),
  };
}
