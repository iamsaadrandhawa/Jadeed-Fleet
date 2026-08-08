import { supabase } from "./supabaseClient";
import { useAuthStore } from "@/shared/store/authStore";

export async function logAction(
  action: string,
  entity: string,
  entityId: string | null,
  description: string
) {
  const { user } = useAuthStore.getState();
  if (!user) return;
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    user_email: user.email ?? null,
    action,
    entity,
    entity_id: entityId,
    description,
  });
}
