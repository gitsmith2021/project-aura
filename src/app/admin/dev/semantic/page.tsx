import { SemanticCatalog } from "@/components/admin/SemanticCatalog";

export const dynamic = "force-dynamic";

/** CF-3.1 WS7 — Semantic Catalog Manager (SUPER_ADMIN). Manage entity aliases,
 *  inspect trigram/vector matches, rebuild the index, address unrecognized terms. */
export default function SemanticPage() {
  return <SemanticCatalog />;
}
