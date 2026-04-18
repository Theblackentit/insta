(function initRoleplayEngine(global) {
  class RoleplayEngine {
    constructor() {
      this.db = null;
    }

    init() {
      if (!global.Dexie) {
        console.warn("Dexie not found. RoleplayEngine disabled.");
        return false;
      }
      this.db = new global.Dexie("RoleplayEngineDB");
      this.db.version(1).stores({
        characters: "id, name, updatedAt",
        threads: "id, characterId, userId, updatedAt",
        messages: "++id, threadId, sender, timestamp, content, summariesEndingHere",
      });
      return true;
    }

    async upsertCharacter(account) {
      if (!this.db || !account?.id) return;
      await this.db.characters.put({
        id: account.id,
        name: account.username,
        description: `${account.identity || ""} ${account.bio || ""}`.trim(),
        behavior: account.behavior || "friendly",
        updatedAt: Date.now(),
      });
    }

    async loadOrCreateThread(characterId, userId) {
      if (!this.db) return null;
      const key = `${userId}:${characterId}`;
      let thread = await this.db.threads.get(key);
      if (!thread) {
        thread = { id: key, characterId, userId, createdAt: Date.now(), updatedAt: Date.now() };
        await this.db.threads.put(thread);
      }
      return thread;
    }

    async addMessage(threadId, sender, content) {
      if (!this.db || !threadId || !content) return;
      await this.db.messages.add({
        threadId,
        sender,
        timestamp: Date.now(),
        content,
        summariesEndingHere: null,
      });
      await this.db.threads.update(threadId, { updatedAt: Date.now() });
    }

    async getMessages(threadId) {
      if (!this.db) return [];
      return this.db.messages.where({ threadId }).sortBy("timestamp");
    }

    async maybeSummarize(threadId) {
      if (!this.db) return;
      const messages = await this.getMessages(threadId);
      if (messages.length < 24) return;
      const oldSlice = messages.slice(0, messages.length - 12);
      const summary = this.extractiveSummary(oldSlice.map((m) => `${m.sender}: ${m.content}`).join(" "), 6);
      if (!summary) return;
      const target = oldSlice[oldSlice.length - 1];
      await this.db.messages.update(target.id, {
        summariesEndingHere: { 1: summary },
      });
    }

    extractiveSummary(text, maxSentences = 6) {
      const sentences = String(text || "").split(/(?<=[.!?])\s+/).map((line) => line.trim()).filter(Boolean);
      if (!sentences.length) return "";
      if (sentences.length <= maxSentences) return sentences.join(" ");
      const words = String(text).toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2);
      const freq = {};
      for (const word of words) freq[word] = (freq[word] || 0) + 1;
      return sentences
        .map((sentence, index) => ({
          sentence,
          index,
          score: sentence.toLowerCase().split(/\s+/).reduce((sum, word) => sum + (freq[word] || 0), 0),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, maxSentences)
        .sort((a, b) => a.index - b.index)
        .map((item) => item.sentence)
        .join(" ");
    }

    async getContextForReply(threadId, maxMessages = 20) {
      const messages = await this.getMessages(threadId);
      const recent = messages.slice(-maxMessages).map((m) => ({ sender: m.sender, text: m.content }));
      const summaries = messages
        .filter((m) => m.summariesEndingHere?.[1])
        .slice(-3)
        .map((m) => m.summariesEndingHere[1]);
      return { recent, summaries };
    }
  }

  global.RoleplayEngine = RoleplayEngine;
})(window);
