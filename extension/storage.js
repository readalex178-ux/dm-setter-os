// DM Setter OS — Storage Layer (offline + cloud sync)

const STORAGE_KEYS = {
  CHATS: "dm_setter_chats",
  PROSPECTS: "dm_setter_prospects",
  PENDING_SYNC: "dm_setter_pending_sync",
  LAST_SYNC: "dm_setter_last_sync",
};

class DataStore {
  constructor() {
    this.supabase = null;
  }

  setSupabase(client) {
    this.supabase = client;
  }

  // ---- Local Storage (chrome.storage.local) ----

  async getLocal(key) {
    const result = await chrome.storage.local.get(key);
    return result[key] || null;
  }

  async setLocal(key, value) {
    await chrome.storage.local.set({ [key]: value });
  }

  // ---- Chat Messages ----

  async saveMessage(message) {
    // Always save locally first
    const chats = (await this.getLocal(STORAGE_KEYS.CHATS)) || [];
    const msg = {
      ...message,
      id: message.id || crypto.randomUUID(),
      saved_at: new Date().toISOString(),
      synced: false,
    };
    chats.push(msg);
    await this.setLocal(STORAGE_KEYS.CHATS, chats);

    // Queue for cloud sync
    const pending = (await this.getLocal(STORAGE_KEYS.PENDING_SYNC)) || [];
    pending.push({ type: "message", data: msg });
    await this.setLocal(STORAGE_KEYS.PENDING_SYNC, pending);

    // Try immediate sync
    await this.syncToCloud();

    return msg;
  }

  async getMessages(prospectId) {
    const chats = (await this.getLocal(STORAGE_KEYS.CHATS)) || [];
    if (prospectId) return chats.filter((c) => c.prospect_id === prospectId);
    return chats;
  }

  // ---- Prospects ----

  async saveProspect(prospect) {
    const prospects = (await this.getLocal(STORAGE_KEYS.PROSPECTS)) || [];
    const p = {
      ...prospect,
      id: prospect.id || crypto.randomUUID(),
      saved_at: new Date().toISOString(),
      synced: false,
    };

    const idx = prospects.findIndex((x) => x.id === p.id);
    if (idx >= 0) prospects[idx] = p;
    else prospects.push(p);

    await this.setLocal(STORAGE_KEYS.PROSPECTS, prospects);

    const pending = (await this.getLocal(STORAGE_KEYS.PENDING_SYNC)) || [];
    pending.push({ type: "prospect", data: p });
    await this.setLocal(STORAGE_KEYS.PENDING_SYNC, pending);

    await this.syncToCloud();
    return p;
  }

  async getProspects() {
    return (await this.getLocal(STORAGE_KEYS.PROSPECTS)) || [];
  }

  // ---- Cloud Sync ----

  async syncToCloud() {
    if (!this.supabase) return { synced: 0 };

    const { data: { session } } = await this.supabase.auth.getSession();
    if (!session) return { synced: 0 };

    const pending = (await this.getLocal(STORAGE_KEYS.PENDING_SYNC)) || [];
    if (!pending.length) return { synced: 0 };

    let synced = 0;
    const failed = [];

    for (const item of pending) {
      try {
        if (item.type === "message") {
          const { id, synced: _, saved_at, ...rest } = item.data;
          const { error } = await this.supabase.from("messages").upsert({
            id,
            ...rest,
            sent_at: rest.sent_at || saved_at,
          }, { onConflict: "id" });
          if (error) throw error;
        } else if (item.type === "prospect") {
          const { synced: _, saved_at, ...rest } = item.data;
          const { error } = await this.supabase.from("prospects").upsert(rest, { onConflict: "id" });
          if (error) throw error;
        }
        synced++;
      } catch (err) {
        console.warn("Sync failed for item:", err);
        failed.push(item);
      }
    }

    await this.setLocal(STORAGE_KEYS.PENDING_SYNC, failed);

    if (synced > 0) {
      await this.setLocal(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    }

    return { synced, failed: failed.length };
  }

  async pullFromCloud() {
    if (!this.supabase) return;

    const { data: { session } } = await this.supabase.auth.getSession();
    if (!session) return;

    // Pull prospects
    const { data: cloudProspects } = await this.supabase
      .from("prospects")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(500);

    if (cloudProspects?.length) {
      const local = (await this.getLocal(STORAGE_KEYS.PROSPECTS)) || [];
      const merged = [...cloudProspects];

      // Add any local-only prospects
      for (const lp of local) {
        if (!merged.find((cp) => cp.id === lp.id)) {
          merged.push(lp);
        }
      }
      await this.setLocal(STORAGE_KEYS.PROSPECTS, merged);
    }

    // Pull recent messages
    const { data: cloudMessages } = await this.supabase
      .from("messages")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(1000);

    if (cloudMessages?.length) {
      const local = (await this.getLocal(STORAGE_KEYS.CHATS)) || [];
      const merged = [...cloudMessages.map((m) => ({ ...m, synced: true }))];

      for (const lm of local) {
        if (!merged.find((cm) => cm.id === lm.id)) {
          merged.push(lm);
        }
      }
      await this.setLocal(STORAGE_KEYS.CHATS, merged);
    }

    await this.setLocal(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  }

  async getSyncStatus() {
    const pending = (await this.getLocal(STORAGE_KEYS.PENDING_SYNC)) || [];
    const lastSync = await this.getLocal(STORAGE_KEYS.LAST_SYNC);
    return { pendingCount: pending.length, lastSync };
  }
}

const dataStore = new DataStore();
