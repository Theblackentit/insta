(function initLocalAgent(global) {
  const STOPWORDS = new Set(["the", "and", "that", "this", "with", "about", "your", "have", "what", "would", "could", "should", "just", "from", "they", "them", "there", "their", "wanna", "want", "talk", "into", "then", "than", "because"]);

  function tokenize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  }

  function extractFacts(text) {
    const lowered = String(text || "").toLowerCase();
    const patterns = [
      /my name is ([a-z\s'-]{2,30})/i,
      /i am ([a-z\s'-]{2,40})/i,
      /i like ([a-z0-9\s,'-]{2,60})/i,
      /i love ([a-z0-9\s,'-]{2,60})/i,
      /i live in ([a-z\s'-]{2,40})/i,
    ];
    const facts = [];
    for (const pattern of patterns) {
      const match = lowered.match(pattern);
      if (match?.[0]) facts.push(match[0]);
    }
    return facts;
  }

  function extractTopics(text) {
    return tokenize(text).filter((word) => word.length > 2 && !STOPWORDS.has(word)).slice(-8);
  }

  function buildTrigram(sentences) {
    const graph = {};
    for (const sentence of sentences) {
      const tokens = tokenize(sentence);
      if (tokens.length < 3) continue;
      for (let i = 0; i < tokens.length - 2; i += 1) {
        const key = `${tokens[i]} ${tokens[i + 1]}`;
        if (!graph[key]) graph[key] = [];
        graph[key].push(tokens[i + 2]);
      }
    }
    return graph;
  }

  function pickStartPair(graph, seedWords) {
    const keys = Object.keys(graph);
    if (!keys.length) return "let s";
    const seeded = keys.filter((key) => seedWords.some((seed) => key.includes(seed)));
    const source = seeded.length ? seeded : keys;
    return source[Math.floor(Math.random() * source.length)];
  }

  function generateFromTrigram(graph, seedWords, maxTokens = 20) {
    const start = pickStartPair(graph, seedWords);
    let [w1, w2] = start.split(" ");
    const out = [w1, w2];
    for (let i = 0; i < maxTokens; i += 1) {
      const next = graph[`${w1} ${w2}`];
      if (!next?.length) break;
      const w3 = next[Math.floor(Math.random() * next.length)];
      out.push(w3);
      w1 = w2;
      w2 = w3;
    }
    return out.join(" ");
  }

  function cleanupSentence(text) {
    const cleaned = text
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^([a-z])/, (match) => match.toUpperCase());
    return cleaned.endsWith(".") || cleaned.endsWith("!") || cleaned.endsWith("?") ? cleaned : `${cleaned}.`;
  }

  function memoryKey(fromId, agentId) {
    return `${fromId}:${agentId}`;
  }

  function ensureMemory(store, key) {
    if (!store[key]) store[key] = { facts: [], topics: [], transcript: [] };
    return store[key];
  }

  function remember(store, fromId, agentId, userText, botText = "") {
    const key = memoryKey(fromId, agentId);
    const node = ensureMemory(store, key);
    const facts = extractFacts(userText);
    for (const fact of facts) if (!node.facts.includes(fact)) node.facts.push(fact);
    node.facts = node.facts.slice(-30);
    const topics = extractTopics(userText);
    for (const topic of topics) if (!node.topics.includes(topic)) node.topics.push(topic);
    node.topics = node.topics.slice(-40);
    if (userText) node.transcript.push(`user: ${userText}`);
    if (botText) node.transcript.push(`bot: ${botText}`);
    node.transcript = node.transcript.slice(-80);
  }

  function generateReply({ account, fromUser, input, history, memoryStore }) {
    const key = memoryKey(fromUser, account.id);
    const memory = ensureMemory(memoryStore, key);
    const lower = String(input || "").toLowerCase().trim();
    const seedWords = extractTopics(lower);
    const profileText = `${account.identity || ""} ${account.bio || ""}`;
    const historyText = (history || []).map((m) => m.text || "").join(". ");
    const corpora = []
      .concat(global.AI_CORPUS || [])
      .concat(memory.transcript || [])
      .concat([profileText, historyText, input]);

    if (/^(hey|hi|hello)\b/.test(lower)) {
      return `Hey ${fromUser.username}, what's up?`;
    }
    if (/wanna talk about|want to talk about/.test(lower)) {
      const topic = seedWords.slice(-3).join(" ");
      return topic ? `Yeah, I'm down. Let's talk about ${topic}.` : "Yeah, I'm down. What do you want to get into?";
    }
    if (/favorite character/.test(lower)) {
      const topics = memory.topics.join(" ");
      if (topics.includes("dragon") || topics.includes("ball")) return "Frieza.";
      return "Probably the one with the best character arc.";
    }
    if (/^(yes|no)\??$/.test(lower)) return "Fair enough.";

    const trigram = buildTrigram(corpora);
    let generated = generateFromTrigram(trigram, seedWords);
    if (!generated || generated.length < 8) generated = "I get you. Keep going, I am following.";
    return cleanupSentence(generated);
  }

  global.LocalAgent = {
    remember,
    generateReply,
    getOpener(account) {
      const shortBio = account?.bio ? ` ${account.bio}` : "";
      return `${account?.identity || account?.username || "This character"} is online.${shortBio}`.trim();
    },
  };
})(window);
