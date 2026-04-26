import { logger } from "@/lib/logger/server-logger";
import { ServiceUnavailableError } from "@/lib/http/errors";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ethers } from "ethers";

export type IncidentRecord = {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  incident_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type LinkedIncidentRecord = IncidentRecord & {
  role?: string | null;
};

type IncidentEntityRow = {
  role: string | null;
  incidentId: string;
  incidents: IncidentTableRow | IncidentTableRow[] | null;
};

type IncidentTableRow = {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  incidentType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export class CorrelationRepository {
  private readonly context = CorrelationRepository.name;

  async listIncidents(filters?: { severity?: string | null; status?: string | null }) {
    try {
      const client = createSupabaseAdminClient();
      let query = client
        .from("incidents")
        .select("*")
        .eq("isActive", true)
        .order("createdAt", { ascending: false })
        .limit(100);

      if (filters?.severity) {
        query = query.eq("severity", filters.severity.toUpperCase());
      }

      if (filters?.status) {
        query = query.eq("status", filters.status.toUpperCase());
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((row) => this.toIncidentRecord(row as IncidentTableRow));
    } catch (error) {
      if (this.isMissingSupabaseConfig(error)) {
        throw new ServiceUnavailableError((error as Error).message);
      }
      logger.warn("Supabase incident list query failed", {
        context: this.context,
        error: (error as Error).message,
      });
      return [];
    }
  }

  async getIncident(id: string) {
    try {
      const client = createSupabaseAdminClient();
      const { data, error } = await client
        .from("incidents")
        .select("*, incident_entities(*), incident_findings(*)")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return null;
      }

      return {
        ...this.toIncidentRecord(data as IncidentTableRow),
        incident_entities: (data.incident_entities ?? []).map((entity: Record<string, unknown>) => ({
          ...entity,
          incidentId: entity.incidentId,
          entityType: entity.entityType,
          entityId: entity.entityId,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
        })),
        incident_findings: data.incident_findings ?? [],
      };
    } catch (error) {
      if (this.isMissingSupabaseConfig(error)) {
        throw new ServiceUnavailableError((error as Error).message);
      }
      logger.warn("Supabase incident detail query failed", {
        context: this.context,
        incidentId: id,
        error: (error as Error).message,
      });
      return null;
    }
  }

  async listLinkedIncidents(subjectType: string, chainId: string, address: string) {
    try {
      const client = createSupabaseAdminClient();
      const normalizedAddress = ethers.getAddress(address.trim());
      const entityId = await this.resolveEntityId(client, subjectType, chainId, normalizedAddress);
      if (!entityId) {
        return [];
      }

      const { data, error } = await client
        .from("incident_entities")
        .select("role, incidentId, incidents(*)")
        .eq("entityType", subjectType)
        .eq("entityId", entityId)
        .order("createdAt", { ascending: false })
        .limit(5);

      if (error) throw error;

      return this.deduplicateLinkedIncidents((data ?? []) as unknown as IncidentEntityRow[])
        .map((row) => {
          const incident = this.pickEmbeddedIncident(row.incidents);
          if (!incident) {
            return null;
          }

          return {
            ...this.toIncidentRecord(incident),
          role: row.role ?? null,
          };
        })
        .filter(Boolean) as LinkedIncidentRecord[];
    } catch (error) {
      if (this.isMissingSupabaseConfig(error)) {
        throw new ServiceUnavailableError((error as Error).message);
      }
      logger.warn("Supabase linked incident query failed", {
        context: this.context,
        subjectType,
        chainId,
        address,
        error: (error as Error).message,
      });
      return [];
    }
  }

  private async resolveEntityId(
    client: ReturnType<typeof createSupabaseAdminClient>,
    subjectType: string,
    chainId: string,
    address: string,
  ) {
    const table = subjectType === "wallet" ? "wallets" : subjectType === "contract" ? "contracts" : null;
    if (!table) {
      return null;
    }

    const { data, error } = await client
      .from(table)
      .select("id")
      .eq("chainId", chainId)
      .ilike("address", address)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return typeof data?.id === "string" ? data.id : null;
  }

  private deduplicateLinkedIncidents(rows: IncidentEntityRow[]) {
    const seen = new Set<string>();
    return rows.filter((row) => {
      const incidentId = row.incidentId || this.pickEmbeddedIncident(row.incidents)?.id;
      if (!incidentId || seen.has(incidentId)) {
        return false;
      }
      seen.add(incidentId);
      return Boolean(row.incidents);
    });
  }

  private isMissingSupabaseConfig(error: unknown) {
    return error instanceof Error && error.message.includes("Supabase admin client is not configured");
  }

  private toIncidentRecord(row: IncidentTableRow): IncidentRecord {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      severity: row.severity,
      status: row.status,
      incident_type: row.incidentType,
      is_active: row.isActive,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  private pickEmbeddedIncident(value: IncidentEntityRow["incidents"]) {
    if (Array.isArray(value)) {
      return value[0] ?? null;
    }

    return value;
  }
}

export const correlationRepository = new CorrelationRepository();
