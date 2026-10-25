function number(value) {
  let hash = 2166136261;
  for (const char of String(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}
function delay(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason || Error("Agent stopped"));
    const timer = setTimeout(done, milliseconds);
    function done() { signal?.removeEventListener("abort", cancel); resolve(); }
    function cancel() { clearTimeout(timer); signal?.removeEventListener("abort", cancel); reject(signal.reason || Error("Agent stopped")); }
    signal?.addEventListener("abort", cancel, { once: true });
  });
}

/** @param {{origin:string,token:string,seed?:number,signal?:AbortSignal,smoke?:boolean}} options */
export async function runCommunityAgent({ origin, token, seed = 1, signal, smoke = false }) {
  const base = new URL(origin).origin;
  if (smoke && !["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname))
    throw Error("Accelerated agent smoke tests are local-only.");
  let requests = 0;
  async function request(path, body, method = body ? "POST" : "GET") {
    const response = await fetch(base + path, {
      method, redirect: "manual", headers: {
        Origin: base, Cookie: `sa_agent=${encodeURIComponent(token)}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      }, body: body ? JSON.stringify(body) : undefined,
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
    });
    requests += 1;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(`Agent request failed (HTTP ${response.status}, ${data.error || "request_failed"})`);
    return data;
  }
  const manifest = await request("/api/attempts?action=manifest");
  if (!manifest.chapters?.length) throw Error("No available chapter for this agent.");
  const passage = manifest.chapters[number(`${seed}:chapter`) % manifest.chapters.length];
  const reading = await request("/api/account?action=reading");
  const book = await request(`/data/bible/en/${passage.book}.json`);
  const chapter = book.chapters?.[passage.chapter - 1];
  if (!chapter) throw Error("Chapter text is unavailable.");
  const words = JSON.stringify(chapter).split(/\s+/).length;
  const seconds = Math.max(25, Math.min(180, Math.ceil(words / (160 + seed % 100) * 60)));
  await delay(smoke ? 1 : seconds * 1000, signal);
  const history = new Map((reading.reading || []).map(item => [`${item.book}:${item.chapter}`, item]));
  history.set(`${passage.book}:${passage.chapter}`, { ...passage, title: book.book || passage.book });
  await request("/api/account?action=reading", { reading: [...history.values()] }, "PUT");
  await request("/api/attempts?action=read", passage);
  let state = await request("/api/attempts?action=start", { ...passage, missionId: manifest.id, locale: "en" });
  const attemptId = state.attemptId;
  while (state.task) {
    if ("correct" in state.task || "hint" in state.task || "reference" in state.task)
      throw Error("Unexpected private question data.");
    const pick = number(`${seed}:${state.task.question}`) % state.task.options.length;
    const selected = [pick];
    if (state.task.type === "multi" && number(`${seed}:${state.task.index}`) % 2)
      selected.push((pick + 1) % state.task.options.length);
    await delay(smoke ? 1 : (4 + number(`${seed}:delay:${state.task.index}`) % 14) * 1000, signal);
    state = await request("/api/attempts?action=answer", { attemptId, taskIndex: state.task.index, selected });
  }
  if (!state.completed) throw Error("The agent attempt was not completed.");
  await request("/api/community?action=finish", { action: "finish" });
  return { completed: true, score: state.result.score, total: state.result.total, requests };
}
