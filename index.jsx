import { useState, useEffect, useRef, useCallback } from "react";

const GEMINI_KEY = "AQ.Ab8RN6KWzZOhM4sP9gWUC6thFrkHlM_xaaiYxbTMGSlSff-naw";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

const CURRICULUM = [
  { id: 0, topic: "Variables & Print", icon: "📦", color: "#4ade80", desc: "Store data, print it out" },
  { id: 1, topic: "Strings", icon: "🔤", color: "#60a5fa", desc: "Text manipulation & formatting" },
  { id: 2, topic: "Numbers & Math", icon: "🔢", color: "#f472b6", desc: "Arithmetic & type conversion" },
  { id: 3, topic: "Lists", icon: "📋", color: "#fb923c", desc: "Collections & indexing" },
  { id: 4, topic: "Conditionals", icon: "🔀", color: "#a78bfa", desc: "if/elif/else decisions" },
  { id: 5, topic: "Loops", icon: "🔄", color: "#34d399", desc: "for & while repetition" },
  { id: 6, topic: "Functions", icon: "⚙️", color: "#fbbf24", desc: "Reusable blocks of code" },
  { id: 7, topic: "Dictionaries", icon: "🗂️", color: "#f87171", desc: "Key-value data stores" },
  { id: 8, topic: "Comprehensions", icon: "⚡", color: "#38bdf8", desc: "Compact list & dict syntax" },
  { id: 9, topic: "Error Handling", icon: "🛡️", color: "#c084fc", desc: "try/except & exceptions" },
  { id: 10, topic: "OOP", icon: "🏗️", color: "#4ade80", desc: "Classes, objects & methods" },
];

async function callGemini(prompt, jsonMode = false) {
  try {
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 2048,
      },
    };
    if (jsonMode) body.generationConfig.responseMimeType = "application/json";
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (jsonMode) {
      const clean = text.replace(/```json\n?|\n?```/g, "").trim();
      return JSON.parse(clean);
    }
    return text;
  } catch (e) {
    return null;
  }
}

async function runPython(code) {
  try {
    const res = await fetch("https://emkc.org/api/v2/piston/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: "python",
        version: "3.10.0",
        files: [{ content: code }],
        stdin: "",
        run_timeout: 5000,
      }),
    });
    const data = await res.json();
    return { stdout: data.run?.stdout || "", stderr: data.run?.stderr || "", exitCode: data.run?.code };
  } catch {
    return { stdout: "", stderr: "Could not connect to code runner.", exitCode: 1 };
  }
}

const styles = {
  app: {
    display: "flex",
    height: "100vh",
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    background: "#0d1117",
    color: "#c9d1d9",
    overflow: "hidden",
  },
  sidebar: {
    width: 240,
    background: "#161b22",
    borderRight: "1px solid #21262d",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    flexShrink: 0,
  },
  sidebarHeader: {
    padding: "16px",
    borderBottom: "1px solid #21262d",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    fontSize: 22,
    fontWeight: 700,
    background: "linear-gradient(135deg, #4ade80, #60a5fa)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: -0.5,
  },
  sidebarScroll: { flex: 1, overflowY: "auto", padding: "8px 0" },
  topicRow: (active, done, locked) => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 16px",
    cursor: locked ? "not-allowed" : "pointer",
    background: active ? "#1f2937" : "transparent",
    borderLeft: active ? "2px solid #4ade80" : "2px solid transparent",
    opacity: locked ? 0.4 : 1,
    transition: "all 0.15s",
  }),
  topicIcon: { fontSize: 16, width: 22, textAlign: "center" },
  topicName: (active) => ({
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    color: active ? "#f0f6ff" : "#8b949e",
    flex: 1,
  }),
  checkMark: (color) => ({
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 9,
    color: "#000",
    fontWeight: 700,
    flexShrink: 0,
  }),
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  topbar: {
    padding: "12px 20px",
    borderBottom: "1px solid #21262d",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#161b22",
    gap: 16,
  },
  topicTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    fontWeight: 600,
    color: "#f0f6ff",
  },
  taskDots: { display: "flex", gap: 6, alignItems: "center" },
  dot: (filled, current) => ({
    width: current ? 28 : 8,
    height: 8,
    borderRadius: 4,
    background: filled ? "#4ade80" : current ? "#4ade80" : "#21262d",
    transition: "all 0.3s",
  }),
  content: {
    flex: 1,
    overflowY: "auto",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  taskCard: (color) => ({
    background: "#161b22",
    border: `1px solid ${color}33`,
    borderRadius: 12,
    padding: 20,
    position: "relative",
    overflow: "hidden",
  }),
  taskCardGlow: (color) => ({
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
  }),
  taskTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#f0f6ff",
    marginBottom: 10,
  },
  conceptBadge: (color) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "3px 10px",
    background: `${color}22`,
    border: `1px solid ${color}55`,
    borderRadius: 100,
    fontSize: 11,
    color: color,
    fontWeight: 600,
    marginBottom: 12,
  }),
  taskDesc: {
    fontSize: 13,
    color: "#c9d1d9",
    lineHeight: 1.7,
    marginBottom: 12,
  },
  exampleBox: {
    background: "#0d1117",
    border: "1px solid #21262d",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 12,
    color: "#8b949e",
    whiteSpace: "pre-wrap",
    lineHeight: 1.6,
  },
  editorSection: {
    background: "#161b22",
    border: "1px solid #21262d",
    borderRadius: 12,
    overflow: "hidden",
  },
  editorBar: {
    padding: "8px 14px",
    background: "#1c2128",
    borderBottom: "1px solid #21262d",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: 11,
    color: "#8b949e",
  },
  editorDots: { display: "flex", gap: 6 },
  editorDot: (c) => ({ width: 10, height: 10, borderRadius: "50%", background: c }),
  textarea: {
    width: "100%",
    minHeight: 180,
    background: "#0d1117",
    color: "#c9d1d9",
    border: "none",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
    fontSize: 13,
    lineHeight: 1.8,
    padding: "14px 16px",
    boxSizing: "border-box",
    caretColor: "#4ade80",
    WebkitTapHighlightColor: "transparent",
  },
  btnRow: {
    display: "flex",
    gap: 10,
    padding: "10px 14px",
    background: "#1c2128",
    borderTop: "1px solid #21262d",
  },
  btnPrimary: (loading) => ({
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "9px 18px",
    background: loading ? "#1f2937" : "linear-gradient(135deg, #22c55e, #16a34a)",
    border: "none",
    borderRadius: 8,
    color: loading ? "#6b7280" : "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: loading ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    WebkitTapHighlightColor: "transparent",
    transition: "opacity 0.15s",
  }),
  btnSecondary: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "9px 14px",
    background: "transparent",
    border: "1px solid #30363d",
    borderRadius: 8,
    color: "#8b949e",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
    WebkitTapHighlightColor: "transparent",
  },
  outputBox: (hasError) => ({
    background: "#0d1117",
    border: `1px solid ${hasError ? "#f8714433" : "#21262d"}`,
    borderRadius: 12,
    overflow: "hidden",
  }),
  outputBar: (hasError) => ({
    padding: "7px 14px",
    background: hasError ? "#1a0f0f" : "#161b22",
    borderBottom: `1px solid ${hasError ? "#f8714433" : "#21262d"}`,
    fontSize: 11,
    color: hasError ? "#f87171" : "#8b949e",
    display: "flex",
    alignItems: "center",
    gap: 6,
  }),
  outputText: {
    padding: "12px 16px",
    fontSize: 12,
    lineHeight: 1.8,
    whiteSpace: "pre-wrap",
    fontFamily: "inherit",
    color: "#c9d1d9",
  },
  feedbackCard: (passed) => ({
    background: passed ? "#0a1f12" : "#1a0d0d",
    border: `1px solid ${passed ? "#22c55e44" : "#ef444444"}`,
    borderRadius: 12,
    padding: 20,
  }),
  feedbackVerdict: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 10,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  feedbackText: {
    fontSize: 13,
    color: "#c9d1d9",
    lineHeight: 1.7,
    marginBottom: 10,
  },
  qualityTip: {
    background: "#1f2937",
    border: "1px solid #30363d",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 12,
    color: "#60a5fa",
    marginBottom: 10,
    display: "flex",
    gap: 6,
  },
  encouragement: {
    fontSize: 12,
    color: "#8b949e",
    fontStyle: "italic",
  },
  nextBtn: {
    marginTop: 14,
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 20px",
    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    WebkitTapHighlightColor: "transparent",
  },
  hintCard: {
    background: "#1a1500",
    border: "1px solid #fbbf2444",
    borderRadius: 12,
    padding: 16,
    fontSize: 13,
    color: "#fde68a",
    lineHeight: 1.7,
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
  },
  skeletonPulse: {
    background: "linear-gradient(90deg, #161b22 25%, #1c2128 50%, #161b22 75%)",
    backgroundSize: "200% 100%",
    animation: "pulse 1.5s infinite",
    borderRadius: 8,
  },
  statsBar: {
    padding: "10px 16px",
    borderTop: "1px solid #21262d",
    display: "flex",
    gap: 16,
    fontSize: 11,
    color: "#8b949e",
  },
  statItem: { display: "flex", alignItems: "center", gap: 5 },
};

function Skeleton({ h = 16, mb = 8, w = "100%" }) {
  return (
    <div style={{ ...styles.skeletonPulse, height: h, marginBottom: mb, width: w }} />
  );
}

export default function PyTeach() {
  const [topicIdx, setTopicIdx] = useState(0);
  const [taskNum, setTaskNum] = useState(1);
  const [task, setTask] = useState(null);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [hint, setHint] = useState(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [loadingTask, setLoadingTask] = useState(false);
  const [loadingRun, setLoadingRun] = useState(false);
  const [loadingHint, setLoadingHint] = useState(false);
  const [completedTopics, setCompletedTopics] = useState(new Set());
  const [tasksDone, setTasksDone] = useState({}); // topicIdx -> max taskNum done
  const [streak, setStreak] = useState(0);
  const [totalSolved, setTotalSolved] = useState(0);
  const textareaRef = useRef(null);

  const generateTask = useCallback(async (tIdx, tNum) => {
    setLoadingTask(true);
    setFeedback(null);
    setOutput(null);
    setHint(null);
    setHintLevel(0);
    const topic = CURRICULUM[tIdx];
    const diff = tNum === 1 ? "easy (beginner-friendly)" : tNum === 2 ? "medium (requires some thought)" : "challenging (tests real understanding)";

    const prompt = `You are a world-class Python teacher. Generate task ${tNum}/3 for topic: "${topic.topic}".
Difficulty: ${diff}.

Return ONLY a valid JSON object (no markdown fences, no explanation outside JSON):
{
  "title": "short catchy task title (5 words max)",
  "conceptBadge": "core concept in 3 words",
  "description": "Clear, specific task description. Tell EXACTLY what function/code to write, what inputs to handle, what output to produce. 2-3 sentences.",
  "example": "Show a concrete example:\nInput: ...\nOutput: ...\n(or show what to print/return)",
  "starterCode": "Helpful starter code with comments. Include the function signature if needed. 4-8 lines.",
  "hint1": "A gentle nudge. Don't give away the answer. Point them in the right direction.",
  "hint2": "A bigger hint with the key approach or partial pseudocode.",
  "checkDescription": "In plain English, what should the code output or do to be marked correct?",
  "conceptExplanation": "A one-sentence 'aha moment' explanation of the main concept."
}

Make tasks practical and satisfying to solve. Examples:
- Variables: print a personalized greeting, swap two variables
- Strings: reverse a string, count vowels, build a password checker
- Lists: find max without max(), rotate a list, deduplicate
- Functions: fibonacci, factorial, calculator with 4 operations
- Loops: FizzBuzz, multiplication table, find prime numbers`;

    const result = await callGemini(prompt, true);
    if (result) {
      setTask(result);
      setCode(result.starterCode || "# Write your code here\n");
    } else {
      setTask({ title: "Error", description: "Could not load task. Check your API key.", starterCode: "", example: "", conceptBadge: "Error" });
      setCode("");
    }
    setLoadingTask(false);
  }, []);

  useEffect(() => { generateTask(0, 1); }, []);

  const handleRun = async () => {
    if (!code.trim() || loadingRun) return;
    setLoadingRun(true);
    setFeedback(null);

    const result = await runPython(code);
    setOutput(result);

    const evalPrompt = `You are an encouraging Python teacher evaluating a student's solution.

TASK: ${task?.description}
WHAT CORRECT CODE SHOULD DO: ${task?.checkDescription}
EXAMPLE: ${task?.example}

STUDENT CODE:
\`\`\`python
${code}
\`\`\`

ACTUAL OUTPUT:
${result.stdout || "(no output)"}
${result.stderr ? `ERRORS:\n${result.stderr}` : ""}

Evaluate carefully. Return ONLY valid JSON:
{
  "passed": true or false,
  "verdict": "one-line verdict (e.g. 'Perfect!', 'Almost there!', 'Not quite yet')",
  "emoji": "one emoji (✅ for pass, ❌ for error, ⚠️ for close)",
  "explanation": "2-3 sentences. Be specific about what's right or wrong. Be warm and encouraging. Reference their actual code.",
  "codeQuality": "One specific tip to make the code more Pythonic or cleaner. Or praise if it's already great.",
  "encouragement": "A short motivational sentence (different each time). Relate it to real Python use cases."
}

Note: if code has a syntax/runtime error, passed = false. If output mostly matches the expected behavior, passed = true.`;

    const ev = await callGemini(evalPrompt, true);
    if (ev) {
      setFeedback(ev);
      if (ev.passed) {
        setStreak(s => s + 1);
        setTotalSolved(n => n + 1);
        setTasksDone(prev => ({ ...prev, [topicIdx]: Math.max(prev[topicIdx] || 0, taskNum) }));
      } else {
        setStreak(0);
      }
    }
    setLoadingRun(false);
  };

  const handleHint = async () => {
    if (loadingHint) return;
    setLoadingHint(true);
    if (hintLevel === 0) {
      setHint(task?.hint1 || "Think about what Python built-ins might help here.");
      setHintLevel(1);
    } else {
      setHint(task?.hint2 || "Break the problem into smaller steps first.");
      setHintLevel(2);
    }
    setLoadingHint(false);
  };

  const handleNext = async () => {
    if (taskNum < 3) {
      const next = taskNum + 1;
      setTaskNum(next);
      await generateTask(topicIdx, next);
    } else {
      const nextTopic = topicIdx + 1;
      if (nextTopic < CURRICULUM.length) {
        setCompletedTopics(prev => new Set([...prev, topicIdx]));
        setTopicIdx(nextTopic);
        setTaskNum(1);
        await generateTask(nextTopic, 1);
      }
    }
  };

  const handleTopicClick = async (idx) => {
    if (idx > topicIdx && !completedTopics.has(idx)) return;
    if (idx === topicIdx) return;
    setTopicIdx(idx);
    setTaskNum(1);
    await generateTask(idx, 1);
  };

  const handleTab = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const s = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newCode = code.substring(0, s) + "    " + code.substring(end);
      setCode(newCode);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = s + 4;
        }
      });
    }
  };

  const cur = CURRICULUM[topicIdx];

  return (
    <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap');
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0d1117; }
        ::-webkit-scrollbar-thumb { background: #21262d; border-radius: 4px; }
        @keyframes pulse { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .fade-in { animation: fadeIn 0.3s ease; }
        button:active { opacity: 0.75; transform: scale(0.98); }
        textarea { -webkit-tap-highlight-color: transparent; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>

      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <span style={{ fontSize: 20 }}>🐍</span>
          <span style={styles.logo}>PyTeach AI</span>
        </div>
        <div style={styles.sidebarScroll}>
          {CURRICULUM.map((t, i) => {
            const done = completedTopics.has(i) || (tasksDone[i] >= 3);
            const active = i === topicIdx;
            const locked = i > topicIdx && !completedTopics.has(i);
            return (
              <div key={i} style={styles.topicRow(active, done, locked)} onClick={() => !locked && handleTopicClick(i)}>
                <span style={styles.topicIcon}>{t.icon}</span>
                <span style={styles.topicName(active)}>{t.topic}</span>
                {done ? (
                  <div style={styles.checkMark(t.color)}>✓</div>
                ) : active ? (
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.color, flexShrink: 0 }} />
                ) : locked ? (
                  <span style={{ fontSize: 10 }}>🔒</span>
                ) : null}
              </div>
            );
          })}
        </div>
        <div style={styles.statsBar}>
          <div style={styles.statItem}><span>🔥</span><span>{streak}</span></div>
          <div style={styles.statItem}><span>✅</span><span>{totalSolved} solved</span></div>
        </div>
      </div>

      {/* Main */}
      <div style={styles.main}>
        {/* Top bar */}
        <div style={styles.topbar}>
          <div style={styles.topicTitle}>
            <span>{cur.icon}</span>
            <span style={{ color: cur.color }}>{cur.topic}</span>
            <span style={{ color: "#30363d" }}>·</span>
            <span style={{ color: "#8b949e", fontWeight: 400 }}>Task {taskNum} of 3</span>
          </div>
          <div style={styles.taskDots}>
            {[1, 2, 3].map(n => (
              <div key={n} style={styles.dot(
                n < taskNum || (n === taskNum && feedback?.passed),
                n === taskNum
              )} />
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {loadingTask ? (
            <div style={{ ...styles.taskCard(cur.color), animation: "none" }}>
              <Skeleton h={12} mb={16} w="40%" />
              <Skeleton h={18} mb={12} />
              <Skeleton h={14} mb={8} />
              <Skeleton h={14} mb={8} w="80%" />
              <Skeleton h={80} mb={0} />
            </div>
          ) : task ? (
            <>
              {/* Task Card */}
              <div style={styles.taskCard(cur.color)} className="fade-in">
                <div style={styles.taskCardGlow(cur.color)} />
                <div style={styles.conceptBadge(cur.color)}>
                  <span>⚡</span>{task.conceptBadge}
                </div>
                {task.conceptExplanation && (
                  <div style={{ fontSize: 12, color: "#8b949e", marginBottom: 12, fontStyle: "italic" }}>
                    💡 {task.conceptExplanation}
                  </div>
                )}
                <div style={styles.taskTitle}>{task.title}</div>
                <div style={styles.taskDesc}>{task.description}</div>
                {task.example && (
                  <div style={styles.exampleBox}>{task.example}</div>
                )}
              </div>

              {/* Editor */}
              <div style={styles.editorSection}>
                <div style={styles.editorBar}>
                  <div style={styles.editorDots}>
                    <div style={styles.editorDot("#ff5f57")} />
                    <div style={styles.editorDot("#febc2e")} />
                    <div style={styles.editorDot("#28c840")} />
                  </div>
                  <span>solution.py</span>
                  <span>Python 3.10</span>
                </div>
                <textarea
                  ref={textareaRef}
                  style={styles.textarea}
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  onKeyDown={handleTab}
                  spellCheck={false}
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="# Write your Python code here..."
                />
                <div style={styles.btnRow}>
                  <button style={styles.btnPrimary(loadingRun)} onClick={handleRun} disabled={loadingRun}>
                    {loadingRun ? "⏳ Running..." : "▶ Run & Check"}
                  </button>
                  <button style={styles.btnSecondary} onClick={handleHint} disabled={loadingHint || hintLevel >= 2}>
                    {hintLevel >= 2 ? "🪫 No more hints" : hintLevel === 1 ? "💡 Bigger Hint" : "💡 Hint"}
                  </button>
                  <button
                    style={{ ...styles.btnSecondary, marginLeft: "auto" }}
                    onClick={() => { setCode(task.starterCode || ""); setOutput(null); setFeedback(null); setHint(null); setHintLevel(0); }}
                  >
                    ↺ Reset
                  </button>
                </div>
              </div>

              {/* Hint */}
              {hint && (
                <div style={styles.hintCard} className="fade-in">
                  <span>💡</span>
                  <span>{hint}</span>
                </div>
              )}

              {/* Output */}
              {output && (
                <div style={styles.outputBox(!!output.stderr)} className="fade-in">
                  <div style={styles.outputBar(!!output.stderr)}>
                    {output.stderr ? "⚠ Error" : "✦ Output"}
                  </div>
                  <div style={styles.outputText}>
                    {output.stderr || output.stdout || "(no output)"}
                  </div>
                </div>
              )}

              {/* Feedback */}
              {feedback && (
                <div style={styles.feedbackCard(feedback.passed)} className="fade-in">
                  <div style={{ ...styles.feedbackVerdict, color: feedback.passed ? "#4ade80" : "#f87171" }}>
                    <span>{feedback.emoji}</span>
                    <span>{feedback.verdict}</span>
                  </div>
                  <div style={styles.feedbackText}>{feedback.explanation}</div>
                  {feedback.codeQuality && (
                    <div style={styles.qualityTip}>
                      <span>🔵</span>
                      <span>{feedback.codeQuality}</span>
                    </div>
                  )}
                  <div style={styles.encouragement}>{feedback.encouragement}</div>
                  {feedback.passed && (
                    <button style={styles.nextBtn} onClick={handleNext}>
                      {taskNum < 3 ? `Next Task (${taskNum + 1}/3) →` : topicIdx < CURRICULUM.length - 1 ? `Next Topic: ${CURRICULUM[topicIdx + 1].topic} →` : "🎉 You've completed all topics!"}
                    </button>
                  )}
                </div>
              )}

              {/* Bottom padding */}
              <div style={{ height: 20 }} />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
