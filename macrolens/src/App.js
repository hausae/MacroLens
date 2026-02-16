import { useState, useRef, useCallback, useEffect } from "react";

// ─── Design Tokens ───────────────────────────────────────────────
const C = {
  bg:          "#0d0f0e",
  surface:     "#151918",
  card:        "#1c2220",
  border:      "#2a3330",
  accent:      "#4ade80",
  accentDim:   "#166534",
  protein:     "#f97316",
  carbs:       "#3b82f6",
  fat:         "#eab308",
  fiber:       "#a78bfa",
  sugar:       "#f472b6",
  textPrimary: "#e8f5e9",
  textSecond:  "#86a491",
  textMuted:   "#4d6b5a",
};

// ─── Sub-components ──────────────────────────────────────────────

function MacroBar({ label, value, max, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
        <span style={{ color:C.textMuted, fontSize:11, fontFamily:"'DM Mono',monospace", letterSpacing:"0.06em" }}>
          {label}
        </span>
        <span style={{ color, fontSize:13, fontWeight:700, fontFamily:"'DM Mono',monospace" }}>
          {value}g
        </span>
      </div>
      <div style={{ height:5, background:C.border, borderRadius:99, overflow:"hidden" }}>
        <div style={{
          height:"100%", width:`${pct}%`, background:color,
          borderRadius:99, transition:"width 1.1s cubic-bezier(0.34,1.56,0.64,1)",
          boxShadow:`0 0 10px ${color}66`,
        }}/>
      </div>
    </div>
  );
}

function MacroPill({ label, value, color, icon }) {
  return (
    <div style={{
      flex:1, background:C.card, border:`1px solid ${C.border}`,
      borderRadius:14, padding:"14px 10px", textAlign:"center", position:"relative", overflow:"hidden",
    }}>
      <div style={{
        position:"absolute", top:0, left:0, right:0, height:3,
        background:color, boxShadow:`0 0 16px ${color}`,
      }}/>
      <div style={{ fontSize:18, marginBottom:3 }}>{icon}</div>
      <div style={{ fontSize:20, fontWeight:800, color, fontFamily:"'Syne',sans-serif", lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:10, color:C.textMuted, margin:"2px 0" }}>grams</div>
      <div style={{ fontSize:10, color:C.textSecond, fontWeight:600 }}>{label}</div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display:"flex", gap:6, justifyContent:"center", padding:"6px 0" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width:8, height:8, borderRadius:"50%", background:C.accent,
          animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite`,
        }}/>
      ))}
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────
export default function App() {
  const [apiKey, setApiKey]         = useState(() => localStorage.getItem("ml_apikey") || "");
  const [showKey, setShowKey]       = useState(false);
  const [image, setImage]           = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageMime, setImageMime]   = useState("image/jpeg");
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState(null);
  const [dragging, setDragging]     = useState(false);
  const [history, setHistory]       = useState(() => {
    try { return JSON.parse(localStorage.getItem("ml_history") || "[]"); } catch { return []; }
  });
  const [tab, setTab]               = useState("scan"); // "scan" | "history"

  const galleryRef = useRef();
  const cameraRef  = useRef();

  // Persist API key
  useEffect(() => { if (apiKey) localStorage.setItem("ml_apikey", apiKey); }, [apiKey]);

  const processFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setResult(null);
    setError(null);
    setImageMime(file.type);
    setImage(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = (e) => setImageBase64(e.target.result.split(",")[1]);
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    processFile(e.dataTransfer.files[0]);
  }, []);

  const analyze = async () => {
    if (!imageBase64 || !apiKey) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-opus-4-5-20251101",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: [
              { type:"image", source:{ type:"base64", media_type: imageMime, data: imageBase64 } },
              { type:"text", text:`Analyze this food image and estimate its macronutrients.
Respond ONLY with a valid JSON object, no markdown, no extra text:
{
  "foodName": "descriptive name of the food(s)",
  "servingSize": "estimated portion (e.g. 1 bowl ~350g)",
  "calories": <number>,
  "protein": <number in grams>,
  "carbs": <number in grams>,
  "fat": <number in grams>,
  "fiber": <number in grams>,
  "sugar": <number in grams>,
  "confidence": "low|medium|high",
  "notes": "one helpful sentence about the estimate accuracy or key ingredients"
}` },
            ],
          }],
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const text  = data.content.map(b => b.text || "").join("");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);

      // Save to history
      const entry = { ...parsed, timestamp: Date.now(), thumb: image };
      const next = [entry, ...history].slice(0, 20);
      setHistory(next);
      localStorage.setItem("ml_history", JSON.stringify(next));
    } catch (e) {
      setError(e.message?.includes("invalid")
        ? "Invalid API key. Double-check it in the settings above."
        : "Couldn't read the food. Try a clearer, well-lit photo.");
    } finally {
      setLoading(false);
    }
  };

  const confColor = (c) => c === "high" ? C.accent : c === "medium" ? C.fat : "#ef4444";
  const hasKey = apiKey.trim().startsWith("sk-ant-");

  return (
    <>
      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
        input,button { font-family:'DM Sans',sans-serif; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:${C.border}; border-radius:4px; }
      `}</style>

      <div style={{ minHeight:"100dvh", background:C.bg, color:C.textPrimary, fontFamily:"'DM Sans',sans-serif", display:"flex", flexDirection:"column" }}>

        {/* ── Header ── */}
        <header style={{
          borderBottom:`1px solid ${C.border}`, padding:"16px 20px",
          background:C.surface, display:"flex", alignItems:"center", justifyContent:"space-between",
          position:"sticky", top:0, zIndex:10,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{
              width:34, height:34, borderRadius:10,
              background:`linear-gradient(135deg,${C.accent},#22c55e)`,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:17,
            }}>🥗</div>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:800, letterSpacing:"-0.02em" }}>MacroLens</div>
              <div style={{ fontSize:10, color:C.textMuted }}>AI Nutrition Tracker</div>
            </div>
          </div>
          <button
            onClick={() => setShowKey(v => !v)}
            style={{
              background: hasKey ? `${C.accent}18` : `${C.fat}18`,
              border:`1px solid ${hasKey ? C.accentDim : "#713f12"}`,
              borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:600,
              color: hasKey ? C.accent : C.fat, cursor:"pointer",
            }}>
            {hasKey ? "✓ API Key" : "⚠ Set Key"}
          </button>
        </header>

        {/* ── API Key Panel ── */}
        {showKey && (
          <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"14px 20px" }}>
            <div style={{ fontSize:12, color:C.textMuted, marginBottom:8 }}>
              Paste your <strong style={{color:C.textSecond}}>Anthropic API key</strong> — stored only on this device.
              Get one at <span style={{color:C.accent}}>console.anthropic.com</span>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <input
                type="password"
                placeholder="sk-ant-api03-..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                style={{
                  flex:1, background:C.card, border:`1px solid ${C.border}`,
                  borderRadius:10, padding:"10px 14px", color:C.textPrimary, fontSize:13,
                  outline:"none",
                }}
              />
              <button onClick={() => setShowKey(false)} style={{
                background:C.accentDim, border:"none", borderRadius:10,
                padding:"10px 14px", color:C.accent, fontSize:13, fontWeight:700, cursor:"pointer",
              }}>Save</button>
            </div>
          </div>
        )}

        {/* ── Tab Bar ── */}
        <div style={{
          display:"flex", background:C.surface,
          borderBottom:`1px solid ${C.border}`,
        }}>
          {["scan","history"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex:1, padding:"12px", background:"none", border:"none",
              borderBottom:`2px solid ${tab===t ? C.accent : "transparent"}`,
              color: tab===t ? C.accent : C.textMuted,
              fontSize:13, fontWeight:600, cursor:"pointer",
              textTransform:"capitalize", letterSpacing:"0.02em",
            }}>
              {t === "scan" ? "📸 Scan Food" : `📋 History (${history.length})`}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <main style={{ flex:1, overflowY:"auto", padding:"20px 18px", maxWidth:520, width:"100%", margin:"0 auto" }}>

          {/* SCAN TAB */}
          {tab === "scan" && (
            <>
              {/* Upload zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => galleryRef.current.click()}
                style={{
                  border:`2px dashed ${dragging ? C.accent : C.border}`,
                  borderRadius:20, overflow:"hidden", cursor:"pointer",
                  background: dragging ? `${C.accent}08` : C.surface,
                  transition:"all 0.25s", minHeight: image ? 0 : 180,
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                {image ? (
                  <div style={{ position:"relative", width:"100%" }}>
                    <img src={image} alt="food" style={{ width:"100%", maxHeight:280, objectFit:"cover", display:"block" }}/>
                    <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(13,15,14,.75) 0%,transparent 55%)" }}/>
                    <div style={{
                      position:"absolute", bottom:10, left:10,
                      background:`${C.accent}22`, border:`1px solid ${C.accent}44`,
                      borderRadius:7, padding:"3px 9px", fontSize:11, color:C.accent,
                      fontFamily:"'DM Mono',monospace",
                    }}>tap to change</div>
                  </div>
                ) : (
                  <div style={{ textAlign:"center", padding:32 }}>
                    <div style={{ fontSize:44, marginBottom:10 }}>🍽️</div>
                    <div style={{ fontSize:15, fontWeight:600, marginBottom:5 }}>Drop a food photo here</div>
                    <div style={{ fontSize:12, color:C.textMuted }}>or tap to choose from gallery</div>
                  </div>
                )}
              </div>

              <input ref={galleryRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => processFile(e.target.files[0])}/>
              <input ref={cameraRef}  type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={e => processFile(e.target.files[0])}/>

              {/* Buttons */}
              <div style={{ display:"flex", gap:10, marginTop:12 }}>
                <button
                  onClick={e => { e.stopPropagation(); cameraRef.current.click(); }}
                  style={{
                    flex:1, padding:13, borderRadius:12,
                    background:C.card, border:`1px solid ${C.border}`,
                    color:C.textSecond, fontSize:14, fontWeight:600, cursor:"pointer",
                    display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                  }}>
                  📷 Camera
                </button>
                <button
                  onClick={analyze}
                  disabled={!image || loading || !hasKey}
                  style={{
                    flex:2, padding:13, borderRadius:12, border:"none",
                    background: (image && !loading && hasKey)
                      ? `linear-gradient(135deg,${C.accent},#22c55e)` : C.accentDim,
                    color: (image && !loading && hasKey) ? "#0d0f0e" : C.textMuted,
                    fontSize:14, fontWeight:700,
                    cursor: (image && !loading && hasKey) ? "pointer" : "not-allowed",
                    boxShadow: (image && !loading && hasKey) ? `0 4px 18px ${C.accent}40` : "none",
                    transition:"all 0.2s",
                  }}>
                  {loading ? "Analyzing…" : !hasKey ? "⚠ Set API Key First" : "✦ Analyze Macros"}
                </button>
              </div>

              {/* Loading */}
              {loading && (
                <div style={{
                  marginTop:16, background:C.card, border:`1px solid ${C.border}`,
                  borderRadius:16, padding:"18px 20px", textAlign:"center",
                }}>
                  <Spinner/>
                  <div style={{ color:C.textSecond, fontSize:13, marginTop:8 }}>Reading nutritional content…</div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={{
                  marginTop:14, background:"#1f0a0a", border:"1px solid #7f1d1d",
                  borderRadius:12, padding:"12px 14px", color:"#fca5a5", fontSize:13,
                }}>⚠ {error}</div>
              )}

              {/* Results */}
              {result && !loading && (
                <div style={{ marginTop:18, animation:"fadeUp 0.5s ease" }}>

                  {/* Name + confidence */}
                  <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:18, marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div>
                        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:19, fontWeight:800, letterSpacing:"-0.02em" }}>
                          {result.foodName}
                        </div>
                        <div style={{ color:C.textMuted, fontSize:12, marginTop:3 }}>{result.servingSize}</div>
                      </div>
                      <div style={{
                        background:`${confColor(result.confidence)}22`,
                        border:`1px solid ${confColor(result.confidence)}44`,
                        borderRadius:7, padding:"3px 9px", fontSize:10,
                        color:confColor(result.confidence), fontFamily:"'DM Mono',monospace", whiteSpace:"nowrap",
                      }}>{result.confidence} conf.</div>
                    </div>

                    {/* Calories */}
                    <div style={{
                      marginTop:14, background:C.surface, borderRadius:12, padding:"14px 16px", textAlign:"center",
                    }}>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:52, fontWeight:800, color:C.accent, lineHeight:1 }}>
                        {result.calories}
                      </div>
                      <div style={{ color:C.textMuted, fontSize:11, marginTop:3, fontFamily:"'DM Mono',monospace", letterSpacing:"0.1em" }}>
                        CALORIES
                      </div>
                    </div>
                  </div>

                  {/* Macro pills */}
                  <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                    <MacroPill label="Protein" value={result.protein} color={C.protein} icon="🥩"/>
                    <MacroPill label="Carbs"   value={result.carbs}   color={C.carbs}   icon="🌾"/>
                    <MacroPill label="Fat"     value={result.fat}     color={C.fat}     icon="🫒"/>
                  </div>

                  {/* Detailed bars */}
                  <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:18 }}>
                    <div style={{ fontSize:10, color:C.textMuted, fontFamily:"'DM Mono',monospace", letterSpacing:"0.1em", marginBottom:14 }}>
                      FULL BREAKDOWN
                    </div>
                    <MacroBar label="PROTEIN"    value={result.protein} max={60}  color={C.protein}/>
                    <MacroBar label="CARBS"      value={result.carbs}   max={120} color={C.carbs}/>
                    <MacroBar label="FAT"        value={result.fat}     max={70}  color={C.fat}/>
                    <MacroBar label="FIBER"      value={result.fiber}   max={30}  color={C.fiber}/>
                    <MacroBar label="SUGAR"      value={result.sugar}   max={60}  color={C.sugar}/>
                  </div>

                  {/* Notes */}
                  {result.notes && (
                    <div style={{
                      marginTop:10, background:`${C.accent}0a`,
                      border:`1px solid ${C.accent}22`, borderRadius:12,
                      padding:"11px 14px", fontSize:12, color:C.textSecond,
                      display:"flex", gap:8, alignItems:"flex-start",
                    }}>
                      <span>💡</span><span>{result.notes}</span>
                    </div>
                  )}

                  <div style={{ textAlign:"center", marginTop:14, fontSize:10, color:C.textMuted }}>
                    AI estimates only — not a substitute for professional nutrition advice.
                  </div>
                </div>
              )}
            </>
          )}

          {/* HISTORY TAB */}
          {tab === "history" && (
            <div>
              {history.length === 0 ? (
                <div style={{ textAlign:"center", padding:"60px 20px" }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
                  <div style={{ color:C.textMuted, fontSize:14 }}>No scans yet — go snap some food!</div>
                </div>
              ) : (
                <>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                    <div style={{ fontSize:12, color:C.textMuted }}>Last {history.length} scans</div>
                    <button onClick={() => { setHistory([]); localStorage.removeItem("ml_history"); }}
                      style={{ background:"none", border:"none", color:"#ef4444", fontSize:12, cursor:"pointer" }}>
                      Clear all
                    </button>
                  </div>
                  {history.map((h, i) => (
                    <div key={i} style={{
                      background:C.card, border:`1px solid ${C.border}`, borderRadius:16,
                      padding:14, marginBottom:10, display:"flex", gap:12, alignItems:"center",
                    }}>
                      {h.thumb && (
                        <img src={h.thumb} alt="" style={{ width:56, height:56, borderRadius:10, objectFit:"cover", flexShrink:0 }}/>
                      )}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:14, marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {h.foodName}
                        </div>
                        <div style={{ fontSize:11, color:C.textMuted, marginBottom:6 }}>
                          {new Date(h.timestamp).toLocaleDateString()} · {h.servingSize}
                        </div>
                        <div style={{ display:"flex", gap:10 }}>
                          <span style={{ fontSize:11, color:C.accent, fontFamily:"'DM Mono',monospace" }}>{h.calories} kcal</span>
                          <span style={{ fontSize:11, color:C.protein, fontFamily:"'DM Mono',monospace" }}>P {h.protein}g</span>
                          <span style={{ fontSize:11, color:C.carbs,   fontFamily:"'DM Mono',monospace" }}>C {h.carbs}g</span>
                          <span style={{ fontSize:11, color:C.fat,     fontFamily:"'DM Mono',monospace" }}>F {h.fat}g</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
