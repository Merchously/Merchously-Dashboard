import Airtable from "airtable";

// Airtable configuration
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || "";
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "appwE9eU3t3vk6jLS";
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID || "tbljcOBPFzyO5rCT4";

// Initialize Airtable
const airtable = new Airtable({ apiKey: AIRTABLE_API_KEY });
const base = airtable.base(AIRTABLE_BASE_ID);

// Client interface (from Airtable Leads table)
export interface AirtableClient {
  id: string; // Airtable record ID
  email: string;
  name: string;
  brand_name?: string;
  customer_type?: string;
  icp_level?: "A" | "B" | "C";
  recommended_tier?: "Launch" | "Growth" | "Scale";
  status?: string;
  budget_range?: string;
  audience_size?: string;
  red_flags?: string[];
  opportunities?: string[];
  confidence_score?: number;
  next_step?: string;
  discovery_summary?: string;
  created_at?: string;
}

/**
 * Get all clients from Airtable
 */
export async function getClients(limit = 100): Promise<AirtableClient[]> {
  try {
    const records = await base(AIRTABLE_TABLE_ID)
      .select({
        maxRecords: limit,
        view: "Grid view", // Default view
        sort: [{ field: "Created", direction: "desc" }],
      })
      .all();

    return records.map((record) => ({
      id: record.id,
      email: (record.get("Email") as string) || "",
      name: (record.get("Name") as string) || "",
      brand_name: record.get("Brand Name") as string | undefined,
      customer_type: record.get("Customer Type") as string | undefined,
      icp_level: record.get("ICP Level") as "A" | "B" | "C" | undefined,
      recommended_tier: record.get("Recommended Tier") as
        | "Launch"
        | "Growth"
        | "Scale"
        | undefined,
      status: record.get("Status") as string | undefined,
      budget_range: record.get("Budget Range") as string | undefined,
      audience_size: record.get("Audience Size") as string | undefined,
      red_flags: record.get("Red Flags") as string[] | undefined,
      opportunities: record.get("Opportunities") as string[] | undefined,
      confidence_score: record.get("Confidence Score") as number | undefined,
      next_step: record.get("Next Step") as string | undefined,
      discovery_summary: record.get("Discovery Summary") as string | undefined,
      created_at: record.get("Created") as string | undefined,
    }));
  } catch (error) {
    console.error("Error fetching clients from Airtable:", error);
    throw error;
  }
}

/**
 * Get a single client by email
 */
export async function getClientByEmail(
  email: string
): Promise<AirtableClient | null> {
  try {
    const records = await base(AIRTABLE_TABLE_ID)
      .select({
        maxRecords: 1,
        filterByFormula: `{Email} = "${email}"`,
      })
      .all();

    if (records.length === 0) {
      return null;
    }

    const record = records[0];
    return {
      id: record.id,
      email: (record.get("Email") as string) || "",
      name: (record.get("Name") as string) || "",
      brand_name: record.get("Brand Name") as string | undefined,
      customer_type: record.get("Customer Type") as string | undefined,
      icp_level: record.get("ICP Level") as "A" | "B" | "C" | undefined,
      recommended_tier: record.get("Recommended Tier") as
        | "Launch"
        | "Growth"
        | "Scale"
        | undefined,
      status: record.get("Status") as string | undefined,
      budget_range: record.get("Budget Range") as string | undefined,
      audience_size: record.get("Audience Size") as string | undefined,
      red_flags: record.get("Red Flags") as string[] | undefined,
      opportunities: record.get("Opportunities") as string[] | undefined,
      confidence_score: record.get("Confidence Score") as number | undefined,
      next_step: record.get("Next Step") as string | undefined,
      discovery_summary: record.get("Discovery Summary") as string | undefined,
      created_at: record.get("Created") as string | undefined,
    };
  } catch (error) {
    console.error(`Error fetching client ${email} from Airtable:`, error);
    throw error;
  }
}

/**
 * Search clients by name or email
 */
export async function searchClients(query: string): Promise<AirtableClient[]> {
  try {
    const records = await base(AIRTABLE_TABLE_ID)
      .select({
        filterByFormula: `OR(FIND(LOWER("${query}"), LOWER({Email})), FIND(LOWER("${query}"), LOWER({Name})))`,
        maxRecords: 50,
      })
      .all();

    return records.map((record) => ({
      id: record.id,
      email: (record.get("Email") as string) || "",
      name: (record.get("Name") as string) || "",
      brand_name: record.get("Brand Name") as string | undefined,
      customer_type: record.get("Customer Type") as string | undefined,
      icp_level: record.get("ICP Level") as "A" | "B" | "C" | undefined,
      recommended_tier: record.get("Recommended Tier") as
        | "Launch"
        | "Growth"
        | "Scale"
        | undefined,
      status: record.get("Status") as string | undefined,
      budget_range: record.get("Budget Range") as string | undefined,
      audience_size: record.get("Audience Size") as string | undefined,
      red_flags: record.get("Red Flags") as string[] | undefined,
      opportunities: record.get("Opportunities") as string[] | undefined,
      confidence_score: record.get("Confidence Score") as number | undefined,
      next_step: record.get("Next Step") as string | undefined,
      discovery_summary: record.get("Discovery Summary") as string | undefined,
      created_at: record.get("Created") as string | undefined,
    }));
  } catch (error) {
    console.error("Error searching clients in Airtable:", error);
    throw error;
  }
}

export default {
  getClients,
  getClientByEmail,
  searchClients,
};
