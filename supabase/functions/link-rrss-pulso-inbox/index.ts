import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}

function rows(payload: any, keys: string[]) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return json({ ok: true });

  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ ok: false, error: "Sesión LINK requerida." }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );

    const { data: member, error: memberError } = await supabase.rpc("link_world_is_member");
    if (memberError || member !== true) return json({ ok: false, error: "Miembro LINK requerido." }, 403);

    const body = await req.json();
    const businessId = String(body?.business_id || "");
    if (!businessId) return json({ ok: false, error: "business_id obligatorio." }, 400);

    const startedAt = new Date().toISOString();
    const summary: any = {
      accounts: 0,
      conversations_seen: 0,
      conversations_changed: 0,
      conversations_unchanged: 0,
      history_calls: 0,
      messages_synced: 0,
      link_id: null,
      errors: [],
    };

    await supabase.from("link_rrss_workspace_state").upsert({
      business_id: businessId,
      last_sync_started_at: startedAt,
      last_sync_status: "syncing",
      last_sync_error: null,
      updated_at: startedAt,
    }, { onConflict: "business_id" });

    const { data: profiles, error: profileError } = await supabase
      .from("link_rrss_profiles")
      .select("id")
      .eq("business_id", businessId);
    if (profileError) throw profileError;

    const profileIds = (profiles || []).map((x: any) => x.id);
    if (!profileIds.length) return json({ ok: true, summary: { ...summary, note: "Sin perfil RRSS" } });

    const { data: sources, error: sourceError } = await supabase
      .from("link_rrss_sources")
      .select("id,profile_id")
      .in("profile_id", profileIds);
    if (sourceError) throw sourceError;

    for (const source of sources || []) {
      const { data: accounts, error: accountError } = await supabase
        .from("link_rrss_accounts")
        .select("*")
        .eq("source_id", source.id);
      if (accountError) throw accountError;

      for (const account of accounts || []) {
        summary.accounts++;

        const { data: inboxCall, error: inboxCallError } = await supabase.functions.invoke("link-rrss-zernio", {
          body: {
            action: "zernio.get",
            source_id: source.id,
            path: "/v1/inbox/conversations",
            query: {
              accountId: account.external_account_id,
              platform: account.platform,
              limit: 100,
              sortOrder: "desc",
            },
          },
        });

        if (inboxCallError || !inboxCall?.ok) {
          summary.errors.push({ account: account.username, step: "inbox", error: inboxCallError?.message || inboxCall?.error || "inbox error" });
          continue;
        }

        const conversations = rows(inboxCall.data, ["conversations"]);
        summary.conversations_seen += conversations.length;

        const externalIds = conversations.map((c: any) => String(c?.id || c?._id || "")).filter(Boolean);
        const previousByExternal = new Map<string, any>();

        if (externalIds.length) {
          const { data: previous, error: previousError } = await supabase
            .from("link_rrss_conversations")
            .select("id,external_conversation_id,last_message_at,last_message,unread_count")
            .eq("account_id", account.id)
            .in("external_conversation_id", externalIds);
          if (previousError) throw previousError;
          for (const row of previous || []) previousByExternal.set(String(row.external_conversation_id), row);
        }

        const changed = new Set<string>();
        for (const c of conversations) {
          const id = String(c?.id || c?._id || "");
          if (!id) continue;

          const prev = previousByExternal.get(id);
          const stamp = String(c?.updatedTime || c?.updatedAt || c?.lastMessageAt || "");
          const unread = Number(c?.unreadCount || 0);
          const last = typeof c?.lastMessage === "string"
            ? c.lastMessage
            : (c?.lastMessage?.text || c?.lastMessageText || c?.preview || null);

          const isChanged =
            !prev ||
            (stamp && String(prev.last_message_at || "") !== stamp) ||
            Number(prev?.unread_count || 0) !== unread ||
            (last != null && String(prev?.last_message || "") !== String(last));

          if (isChanged) changed.add(id);
        }

        summary.conversations_changed += changed.size;
        summary.conversations_unchanged += Math.max(0, conversations.length - changed.size);

        const now = new Date().toISOString();
        const conversationRows = conversations.map((c: any) => {
          const id = String(c?.id || c?._id || "");
          if (!id) return null;
          return {
            account_id: account.id,
            external_conversation_id: id,
            participant_id: c?.participantId || null,
            participant_name: c?.participantName || c?.participantUsername || c?.username || null,
            participant_username: c?.participantUsername || c?.username || null,
            participant_picture: c?.participantPicture || null,
            platform_url: c?.url || null,
            status: c?.status || "active",
            unread_count: Number(c?.unreadCount || 0),
            last_message: typeof c?.lastMessage === "string" ? c.lastMessage : (c?.lastMessage?.text || c?.lastMessageText || c?.preview || null),
            last_message_at: c?.updatedTime || c?.updatedAt || c?.lastMessageAt || null,
            raw: c || {},
            last_seen_at: now,
            updated_at: now,
          };
        }).filter(Boolean);

        if (conversationRows.length) {
          const { error: saveConversationError } = await supabase
            .from("link_rrss_conversations")
            .upsert(conversationRows, { onConflict: "account_id,external_conversation_id" });
          if (saveConversationError) throw saveConversationError;
        }

        const { data: localConversations, error: localConversationError } = await supabase
          .from("link_rrss_conversations")
          .select("id,external_conversation_id")
          .eq("account_id", account.id)
          .in("external_conversation_id", externalIds);
        if (localConversationError) throw localConversationError;

        const localByExternal = new Map((localConversations || []).map((x: any) => [String(x.external_conversation_id), String(x.id)]));
        const changedConversations = conversations.filter((c: any) => changed.has(String(c?.id || c?._id || "")));

        for (let i = 0; i < changedConversations.length; i += 4) {
          const batch = changedConversations.slice(i, i + 4);

          await Promise.all(batch.map(async (c: any) => {
            const externalConversationId = String(c?.id || c?._id || "");
            const localConversationId = localByExternal.get(externalConversationId);
            if (!externalConversationId || !localConversationId) return;

            const { data: historyCall, error: historyCallError } = await supabase.functions.invoke("link-rrss-zernio", {
              body: {
                action: "zernio.get",
                source_id: source.id,
                path: `/v1/inbox/conversations/${encodeURIComponent(externalConversationId)}/messages`,
                query: {
                  accountId: account.external_account_id,
                  limit: 50,
                  sortOrder: "desc",
                },
              },
            });

            if (historyCallError || !historyCall?.ok) {
              summary.errors.push({
                account: account.username,
                conversation: externalConversationId,
                step: "history",
                error: historyCallError?.message || historyCall?.error || "history error",
              });
              return;
            }

            summary.history_calls++;
            const messages = rows(historyCall.data, ["messages"]);
            const stamp = new Date().toISOString();

            const messageRows = messages.map((m: any) => {
              const id = String(m?.id || m?._id || "");
              if (!id) return null;
              const direction = ["incoming", "outgoing"].includes(String(m?.direction || "").toLowerCase())
                ? String(m.direction).toLowerCase()
                : "unknown";

              return {
                conversation_id: localConversationId,
                external_message_id: id,
                direction,
                sender_id: m?.senderId || null,
                sender_name: m?.senderName || null,
                message: typeof m?.message === "string" ? m.message : (m?.text || null),
                attachments: Array.isArray(m?.attachments) ? m.attachments : [],
                delivery_status: m?.deliveryStatus || null,
                sent_via: m?.sentVia || null,
                platform_created_at: m?.createdAt || m?.sentAt || null,
                raw: m || {},
                last_seen_at: stamp,
                updated_at: stamp,
              };
            }).filter(Boolean);

            if (messageRows.length) {
              const { error: saveMessageError } = await supabase
                .from("link_rrss_messages")
                .upsert(messageRows, { onConflict: "conversation_id,external_message_id" });
              if (saveMessageError) throw saveMessageError;
              summary.messages_synced += messageRows.length;
            }
          }));
        }
      }
    }

    const { data: promotionRequest, error: promotionInsertError } = await supabase
      .from("link_rrss_promotion_requests")
      .insert({
        business_id: businessId,
        since: startedAt,
      })
      .select("id")
      .single();

    if (promotionInsertError) {
      summary.errors.push({ step: "link_id", error: promotionInsertError.message });
    } else {
      const { data: promotionResult, error: promotionReadError } = await supabase
        .from("link_rrss_promotion_requests")
        .select("status,result,error,processed_at")
        .eq("id", promotionRequest.id)
        .single();

      if (promotionReadError) {
        summary.errors.push({ step: "link_id", error: promotionReadError.message });
      } else if (promotionResult?.status === "error") {
        summary.errors.push({ step: "link_id", error: promotionResult.error || "LINK ID promotion error" });
      } else {
        summary.link_id = promotionResult?.result || {};
      }
    }

    const status = summary.errors.length ? "partial" : "ok";
    const finishedAt = new Date().toISOString();

    const { data: workspace } = await supabase
      .from("link_rrss_workspace_state")
      .select("module_state")
      .eq("business_id", businessId)
      .maybeSingle();

    await supabase.from("link_rrss_workspace_state").upsert({
      business_id: businessId,
      last_sync_status: status,
      last_sync_error: summary.errors.length ? JSON.stringify(summary.errors.slice(-5)) : null,
      module_state: { ...(workspace?.module_state || {}), pulso_vivo: summary },
      updated_at: finishedAt,
    }, { onConflict: "business_id" });

    return json({ ok: true, summary });
  } catch (error: any) {
    return json({ ok: false, error: String(error?.message || error) }, 500);
  }
});