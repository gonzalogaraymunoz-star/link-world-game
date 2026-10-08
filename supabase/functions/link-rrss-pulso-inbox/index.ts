import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const ZERNIO_BASE = "https://zernio.com/api";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function rows(payload: any, keys: string[]) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

async function requireMember(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    throw Object.assign(new Error("Sesión LINK requerida."), { status: 401 });
  }

  const user = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );

  const { data, error } = await user.rpc("link_world_is_member");
  if (error || data !== true) {
    throw Object.assign(new Error("Miembro LINK requerido."), { status: 403 });
  }
}

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function readZernioKey(admin: any, sourceId: string) {
  const { data: source, error } = await admin
    .from("link_rrss_sources")
    .select("vault_secret_id")
    .eq("id", sourceId)
    .single();

  if (error || !source?.vault_secret_id) {
    throw new Error("Fuente Zernio sin credencial.");
  }

  const { data: apiKey, error: secretError } = await admin.rpc(
    "link_rrss_read_secret",
    { p_secret_id: source.vault_secret_id },
  );

  if (secretError || !apiKey) {
    throw new Error("No se pudo abrir la credencial Zernio.");
  }

  return String(apiKey);
}

async function zernioGet(
  apiKey: string,
  path: string,
  query: Record<string, unknown> = {},
) {
  const url = new URL(ZERNIO_BASE + path);

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  const text = await response.text();
  let payload: any = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ||
        payload?.error ||
        payload?.message ||
        `Zernio ${response.status}`,
    );
  }

  return payload;
}

async function persistConversations(
  admin: any,
  account: any,
  conversations: any[],
) {
  const now = new Date().toISOString();

  const records = conversations
    .map((conversation: any) => {
      const id = String(conversation?.id || conversation?._id || "");
      if (!id) return null;

      return {
        account_id: account.id,
        external_conversation_id: id,
        participant_id: conversation?.participantId || null,
        participant_name:
          conversation?.participantName ||
          conversation?.participantUsername ||
          conversation?.username ||
          null,
        participant_username:
          conversation?.participantUsername || conversation?.username || null,
        participant_picture: conversation?.participantPicture || null,
        platform_url: conversation?.url || null,
        status: conversation?.status || "active",
        unread_count: Number(conversation?.unreadCount || 0),
        last_message:
          typeof conversation?.lastMessage === "string"
            ? conversation.lastMessage
            : conversation?.lastMessage?.text ||
              conversation?.lastMessageText ||
              conversation?.preview ||
              null,
        last_message_at:
          conversation?.updatedTime ||
          conversation?.updatedAt ||
          conversation?.lastMessageAt ||
          null,
        raw: conversation || {},
        last_seen_at: now,
        updated_at: now,
      };
    })
    .filter(Boolean);

  if (!records.length) return [];

  const { data, error } = await admin
    .from("link_rrss_conversations")
    .upsert(records, {
      onConflict: "account_id,external_conversation_id",
    })
    .select("id,external_conversation_id");

  if (error) throw error;
  return data || [];
}

async function persistMessages(
  admin: any,
  conversationId: string,
  messages: any[],
) {
  const now = new Date().toISOString();

  const records = messages
    .map((message: any) => {
      const externalId = String(message?.id || message?._id || "");
      if (!externalId) return null;

      const direction = ["incoming", "outgoing"].includes(
        String(message?.direction || "").toLowerCase(),
      )
        ? String(message.direction).toLowerCase()
        : "unknown";

      return {
        conversation_id: conversationId,
        external_message_id: externalId,
        direction,
        sender_id: message?.senderId || null,
        sender_name: message?.senderName || null,
        message:
          typeof message?.message === "string"
            ? message.message
            : message?.text || null,
        attachments: Array.isArray(message?.attachments)
          ? message.attachments
          : [],
        delivery_status: message?.deliveryStatus || null,
        sent_via: message?.sentVia || null,
        platform_created_at: message?.createdAt || message?.sentAt || null,
        raw: message || {},
        last_seen_at: now,
        updated_at: now,
      };
    })
    .filter(Boolean);

  if (!records.length) return 0;

  const { error } = await admin
    .from("link_rrss_messages")
    .upsert(records, {
      onConflict: "conversation_id,external_message_id",
    });

  if (error) throw error;
  return records.length;
}

Deno.serve(async (req: Request) => {
  try {
    await requireMember(req);

    const body = await req.json();
    const businessId = String(body?.business_id || "");

    if (!businessId) {
      return json({ ok: false, error: "business_id obligatorio." }, 400);
    }

    const admin = adminClient();
    const startedAt = new Date().toISOString();

    const summary: any = {
      accounts: 0,
      conversations_seen: 0,
      conversations_changed: 0,
      conversations_unchanged: 0,
      history_calls: 0,
      messages_synced: 0,
      errors: [],
    };

    await admin.from("link_rrss_workspace_state").upsert(
      {
        business_id: businessId,
        last_sync_started_at: startedAt,
        last_sync_status: "syncing",
        last_sync_error: null,
        updated_at: startedAt,
      },
      { onConflict: "business_id" },
    );

    const { data: profiles, error: profileError } = await admin
      .from("link_rrss_profiles")
      .select("id")
      .eq("business_id", businessId);

    if (profileError) throw profileError;

    const profileIds = (profiles || []).map((row: any) => row.id);

    if (!profileIds.length) {
      return json({
        ok: true,
        summary: { ...summary, note: "Sin perfil RRSS" },
      });
    }

    const { data: sources, error: sourceError } = await admin
      .from("link_rrss_sources")
      .select("id")
      .in("profile_id", profileIds);

    if (sourceError) throw sourceError;

    for (const source of sources || []) {
      const apiKey = await readZernioKey(admin, source.id);

      const { data: accounts, error: accountError } = await admin
        .from("link_rrss_accounts")
        .select("*")
        .eq("source_id", source.id);

      if (accountError) throw accountError;

      for (const account of accounts || []) {
        summary.accounts += 1;

        try {
          const inboxPayload = await zernioGet(
            apiKey,
            "/v1/inbox/conversations",
            {
              accountId: account.external_account_id,
              platform: account.platform,
              limit: 100,
              sortOrder: "desc",
            },
          );

          const conversations = rows(inboxPayload, ["conversations"]);
          summary.conversations_seen += conversations.length;

          const externalIds = conversations
            .map((conversation: any) =>
              String(conversation?.id || conversation?._id || "")
            )
            .filter(Boolean);

          const previousByExternal = new Map<string, any>();

          if (externalIds.length) {
            const { data: previous, error: previousError } = await admin
              .from("link_rrss_conversations")
              .select(
                "id,external_conversation_id,last_message_at,last_message,unread_count",
              )
              .eq("account_id", account.id)
              .in("external_conversation_id", externalIds);

            if (previousError) throw previousError;

            for (const row of previous || []) {
              previousByExternal.set(
                String(row.external_conversation_id),
                row,
              );
            }
          }

          const changedExternal = new Set<string>();

          for (const conversation of conversations) {
            const externalId = String(
              conversation?.id || conversation?._id || "",
            );

            if (!externalId) continue;

            const previous = previousByExternal.get(externalId);
            const remoteStamp = String(
              conversation?.updatedTime ||
                conversation?.updatedAt ||
                conversation?.lastMessageAt ||
                "",
            );
            const remoteUnread = Number(conversation?.unreadCount || 0);
            const remoteLastMessage =
              typeof conversation?.lastMessage === "string"
                ? conversation.lastMessage
                : conversation?.lastMessage?.text ||
                  conversation?.lastMessageText ||
                  conversation?.preview ||
                  null;

            const changed =
              !previous ||
              (remoteStamp &&
                String(previous.last_message_at || "") !== remoteStamp) ||
              Number(previous?.unread_count || 0) !== remoteUnread ||
              (remoteLastMessage != null &&
                String(previous?.last_message || "") !==
                  String(remoteLastMessage));

            if (changed) changedExternal.add(externalId);
          }

          summary.conversations_changed += changedExternal.size;
          summary.conversations_unchanged += Math.max(
            0,
            conversations.length - changedExternal.size,
          );

          const savedConversations = await persistConversations(
            admin,
            account,
            conversations,
          );

          const localByExternal = new Map(
            savedConversations.map((row: any) => [
              String(row.external_conversation_id),
              String(row.id),
            ]),
          );

          const changedConversations = conversations.filter(
            (conversation: any) =>
              changedExternal.has(
                String(conversation?.id || conversation?._id || ""),
              ),
          );

          for (let index = 0; index < changedConversations.length; index += 4) {
            const batch = changedConversations.slice(index, index + 4);

            await Promise.all(
              batch.map(async (conversation: any) => {
                const externalId = String(
                  conversation?.id || conversation?._id || "",
                );
                const localId = localByExternal.get(externalId);

                if (!externalId || !localId) return;

                const historyPayload = await zernioGet(
                  apiKey,
                  `/v1/inbox/conversations/${encodeURIComponent(externalId)}/messages`,
                  {
                    accountId: account.external_account_id,
                    limit: 50,
                    sortOrder: "desc",
                  },
                );

                summary.history_calls += 1;
                summary.messages_synced += await persistMessages(
                  admin,
                  localId,
                  rows(historyPayload, ["messages"]),
                );
              }),
            );
          }
        } catch (error: any) {
          summary.errors.push({
            account: account.username || account.platform,
            error: String(error?.message || error),
          });
        }
      }
    }

    const finishedAt = new Date().toISOString();
    const status = summary.errors.length ? "partial" : "ok";

    const { data: workspace } = await admin
      .from("link_rrss_workspace_state")
      .select("module_state")
      .eq("business_id", businessId)
      .maybeSingle();

    await admin.from("link_rrss_workspace_state").upsert(
      {
        business_id: businessId,
        last_sync_status: status,
        last_sync_error: summary.errors.length
          ? JSON.stringify(summary.errors.slice(-5))
          : null,
        module_state: {
          ...(workspace?.module_state || {}),
          pulso_vivo: summary,
        },
        updated_at: finishedAt,
      },
      { onConflict: "business_id" },
    );

    return json({ ok: true, summary });
  } catch (error: any) {
    return json(
      { ok: false, error: String(error?.message || error) },
      error?.status || 500,
    );
  }
});
