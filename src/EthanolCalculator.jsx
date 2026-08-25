import React, { useState, useMemo, createContext, useContext } from "react";
import { Fuel, Droplet, Target, Check, AlertTriangle, Beaker, Gauge, Flame } from "lucide-react";

/* ============================================================
   HESAP ÇEKİRDEĞİ — platformdan bağımsız, saf fonksiyonlar.
   core/blend.js olarak ayırıp iOS / web / test tarafında
   aynen kullanabilirsin.
   ============================================================ */

export const ADDITIVES = {
  ethanol: { id: "ethanol", label: "Etanol", name: "Etanol", ron: 109, presets: [10, 20, 25, 50, 85] },
  toluene: { id: "toluene", label: "Toluen", name: "Toluen", ron: 121, presets: [5, 10, 15, 20, 30] },
  custom:  { id: "custom",  label: "Özel",   name: "Katkı",  ron: 110, presets: [5, 10, 20, 30, 50] },
};

export const OCTANES = [93, 95, 98, 100];

export const CARS = [
  { name: "BMW G20 320i", liters: 60 },
  { name: "Hyundai i20 N", liters: 40 },
  { name: "Golf 8 R", liters: 55 },
];

/* Hedef oran → gereken miktar */
export function calculateBlend({
  tank = 0, currentPct = 0, targetPct = 0,
  purityPct = 100, gasPct = 0,
  ronBase = 95, ronAdditive = 109,
}) {
  const c = currentPct / 100, t = targetPct / 100;
  const p = purityPct / 100, g = gasPct / 100;
  const EPS = 1e-9;

  const baseVolume = tank;
  const baseEthanol = baseVolume > EPS ? c : 0;

  let mode = "ok", amount = 0, blocked = null;

  if (baseVolume <= EPS) mode = "empty";
  else if (Math.abs(t - baseEthanol) < 5e-5) mode = "ok";
  else if (t > baseEthanol) {
    mode = "additive";
    if (p <= t + EPS) blocked = "purity";
    else amount = (baseVolume * (t - baseEthanol)) / (p - t);
  } else {
    mode = "gasoline";
    if (g >= t - EPS) blocked = "gasoline";
    else amount = (baseVolume * (baseEthanol - t)) / (t - g);
  }

  const addAmount = blocked ? 0 : amount;
  const totalVolume = baseVolume + addAmount;
  const addedShare = mode === "additive" ? p : g;
  const finalPct = totalVolume > EPS
    ? ((baseVolume * baseEthanol + addAmount * addedShare) / totalVolume) * 100 : 0;

  const addedRon = mode === "additive" ? ronAdditive : ronBase;
  const finalRon = totalVolume > EPS
    ? (baseVolume * ronBase + addAmount * addedRon) / totalVolume : ronBase;

  return {
    mode, blocked, baseVolume,
    basePct: baseEthanol * 100,
    addAmount, totalVolume, finalPct,
    deltaPct: finalPct - baseEthanol * 100,
    ronBase, finalRon, deltaRon: finalRon - ronBase,
    parts: { tank, added: addAmount },
  };
}

/* Miktar → oluşan oran */
export function blendFromAmount({
  tank = 0, currentPct = 0, purityPct = 100, addVolume = 0,
  ronBase = 95, ronAdditive = 109,
}) {
  const EPS = 1e-9;
  const c = currentPct / 100, p = purityPct / 100;

  const baseVolume = tank;
  const totalVolume = baseVolume + addVolume;
  const finalPct = totalVolume > EPS
    ? ((baseVolume * c + addVolume * p) / totalVolume) * 100 : 0;
  const finalRon = totalVolume > EPS
    ? (baseVolume * ronBase + addVolume * ronAdditive) / totalVolume : ronBase;

  return {
    mode: baseVolume <= EPS ? "empty" : "amount",
    blocked: null, baseVolume,
    basePct: c * 100,
    addAmount: addVolume, totalVolume, finalPct,
    deltaPct: finalPct - c * 100,
    ronBase, finalRon, deltaRon: finalRon - ronBase,
    parts: { tank, added: addVolume },
  };
}

/* ============================================================
   TEMALAR
   ============================================================ */

const MONO = "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace";
const SANS = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif";

const THEME = {
  id: "amount",
  bg: "#0a0c0e", card: "#111619", line: "#242e35",
  text: "#e6edf3", dim: "#66757f",
  add: "#f0b429", cur: "#f0b429", accent: "#38bdf8",
  presetBg: "#161d22", presetOn: "#f0b429", presetOnText: "#100c02",
  danger: "#ff6b5e", dangerBg: "#241110",
  radius: 3, cardRadius: 6, outline: true,
  numFont: MONO, upper: true, track: 4, thumbRadius: "3px", gap: 8,
};

const ThemeCtx = createContext(THEME);
const useT = () => useContext(ThemeCtx);

const fmtL = (v) => {
  if (!isFinite(v)) return "—";
  if (v > 0 && v < 1) return `${(v * 1000).toFixed(0)} mL`;
  return `${v.toFixed(1).replace(".", ",")} L`;
};
const fmtPct = (v) => `%${v.toFixed(1).replace(".", ",").replace(",0", "")}`;
const fmtNum = (v, d = 1) => v.toFixed(d).replace(".", ",");

/* ============================================================
   PARÇALAR
   ============================================================ */

function Card({ children, accent, active, style }) {
  const t = useT();
  return (
    <div style={{
      background: t.card, borderRadius: t.cardRadius, padding: 16,
      border: `1px solid ${active ? accent : t.outline ? t.line : "transparent"}`,
      ...style,
    }}>{children}</div>
  );
}

function Cap({ children, size = 13 }) {
  const t = useT();
  return (
    <span style={{
      fontSize: t.upper ? size - 3 : size, color: t.dim,
      textTransform: t.upper ? "uppercase" : "none",
      letterSpacing: t.upper ? "0.12em" : 0,
    }}>{children}</span>
  );
}

function Segmented({ options, value, onChange, big }) {
  const t = useT();
  return (
    <div style={{ display: "flex", gap: t.id === "amount" ? 4 : 6 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} aria-pressed={on}
            style={{
              flex: 1, cursor: "pointer",
              padding: big ? "11px 0" : "8px 0",
              fontSize: big ? (t.upper ? 13 : 15) : (t.upper ? 12 : 14),
              fontWeight: 700, fontFamily: t.numFont,
              textTransform: t.upper ? "uppercase" : "none",
              letterSpacing: t.upper ? ".08em" : 0,
              borderRadius: t.radius,
              background: on ? t.presetOn : t.presetBg,
              color: on ? t.presetOnText : t.dim,
              border: `1px solid ${on ? t.presetOn : t.outline ? t.line : "transparent"}`,
            }}>{o.label}</button>
        );
      })}
    </div>
  );
}

function Slider({ value, min, max, step, onChange, color }) {
  const t = useT();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input type="range" className="ec-range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{
        height: t.track, borderRadius: t.id === "amount" ? 2 : 99,
        background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, ${t.line} ${pct}%, ${t.line} 100%)`,
      }} />
  );
}

function NumberField({ value, unit, onChange, min, max }) {
  const t = useT();
  const [draft, setDraft] = useState(null);
  const shown = draft ?? String(value).replace(".", ",");
  const commit = () => {
    const n = parseFloat((draft ?? "").replace(",", "."));
    if (!isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
    setDraft(null);
  };
  const us = { fontSize: 21, fontWeight: 700, fontFamily: t.numFont, color: t.text };
  return (
    <span style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
      {unit === "%" && <span style={us}>%</span>}
      <input className="ec-num" inputMode="decimal" value={shown}
        onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        style={{ width: `${Math.max(2, shown.length)}ch`, fontFamily: t.numFont, color: t.text }} />
      {unit !== "%" && <span style={us}>{unit}</span>}
    </span>
  );
}

function Row({ icon: Icon, label, value, unit, color, ...s }) {
  const t = useT();
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <Icon size={20} color={color} strokeWidth={2.2} />
        <span style={{
          fontSize: t.upper ? 14 : 17, fontWeight: 600, flex: 1,
          textTransform: t.upper ? "uppercase" : "none",
          letterSpacing: t.upper ? "0.09em" : 0,
        }}>{label}</span>
        <NumberField value={value} unit={unit} onChange={s.onChange} min={s.min} max={s.max} />
      </div>
      <Slider {...s} value={value} color={color} />
    </>
  );
}

function Readout({ caption, value, color, align = "left" }) {
  const t = useT();
  return (
    <div style={{ textAlign: align, flex: align === "left" ? 1 : "none" }}>
      <div style={{ marginBottom: t.upper ? 6 : 3 }}><Cap size={13}>{caption}</Cap></div>
      <div style={{
        color, fontSize: t.upper ? 38 : 42, fontWeight: 800,
        letterSpacing: t.upper ? -1 : -1.6, lineHeight: 1, fontFamily: t.numFont,
      }}>{value}</div>
    </div>
  );
}

/* ============================================================
   UYGULAMA
   ============================================================ */

export default function FuelAdditiveCalculator() {
  const [mode, setMode] = useState("amount");
  const [additiveId, setAdditiveId] = useState("ethanol");
  const [octane, setOctane] = useState(95);
  const [customRon, setCustomRon] = useState(110);
  const [tank, setTank] = useState(20);
  const [currentPct, setCurrentPct] = useState(0);
  const [targetPct, setTargetPct] = useState(20);
  const [addVolume, setAddVolume] = useState(5);
  const [showTanks, setShowTanks] = useState(false);

  const t = THEME;
  const A = additiveId === "custom"
    ? { ...ADDITIVES.custom, ron: customRon }
    : ADDITIVES[additiveId];

  const shared = { tank, currentPct, ronBase: octane, ronAdditive: A.ron };

  const r = useMemo(
    () => mode === "target"
      ? calculateBlend({ ...shared, targetPct })
      : blendFromAmount({ ...shared, addVolume }),
    [mode, additiveId, customRon, octane, tank, currentPct, targetPct, addVolume]
  );

  const switchMode = (next) => {
    if (next === mode) return;
    if (next === "amount") {
      const f = calculateBlend({ ...shared, targetPct });
      if (f.mode === "additive" && !f.blocked) setAddVolume(Math.round(f.addAmount * 10) / 10);
    } else {
      setTargetPct(Math.round(blendFromAmount({ ...shared, addVolume }).finalPct));
    }
    setMode(next);
  };

  const addMax = Math.min(200, Math.max(10, Math.ceil(tank * 2)));
  const isAdd = r.mode === "additive" || r.mode === "amount";
  const addColor = isAdd ? t.add : t.cur;

  const segs = [
    { v: r.parts.tank, c: t.id === "amount" ? "#3d4a52" : "#2c4640", label: "Yakıt" },
    { v: r.parts.added, c: addColor, label: isAdd ? A.name : "Benzin" },
  ].filter((s) => s.v > 1e-6);

  return (
    <ThemeCtx.Provider value={t}>
      <div style={{
        background: t.bg, color: t.text, minHeight: "100%",
        padding: "20px 16px 40px", fontFamily: SANS,
        fontVariantNumeric: "tabular-nums", WebkitTapHighlightColor: "transparent",
        maxWidth: 520, margin: "0 auto",
      }}>
        <style>{`
          .ec-range{-webkit-appearance:none;appearance:none;width:100%;outline:none;touch-action:none;display:block;}
          .ec-range::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:${t.thumbRadius};background:${t.id === "amount" ? t.text : "#fff"};box-shadow:0 1px 5px rgba(0,0,0,.7);cursor:pointer;}
          .ec-range::-moz-range-thumb{width:22px;height:22px;border:none;border-radius:${t.thumbRadius};background:${t.id === "amount" ? t.text : "#fff"};cursor:pointer;}
          .ec-range:focus-visible{box-shadow:0 0 0 3px ${t.accent}99;}
          .ec-num{background:transparent;border:none;font-size:21px;font-weight:700;text-align:right;padding:0;outline:none;font-variant-numeric:tabular-nums;min-width:2ch;}
          .ec-num:focus-visible{border-bottom:2px solid ${t.accent};}
          @media (prefers-reduced-motion:no-preference){.ec-bar span{transition:flex-grow .25s ease;}}
        `}</style>

        <header style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5, flexWrap: "wrap" }}>
          <Flame size={22} color={t.add} strokeWidth={2.2} />
          <h1 style={{
            fontSize: t.upper ? 19 : 27, fontWeight: 800, margin: 0,
            letterSpacing: t.upper ? "0.16em" : -0.7,
            fontFamily: t.upper ? MONO : SANS,
          }}>YAKIT KATKISI</h1>
          <button onClick={() => setShowTanks(true)}
            style={{
              marginLeft: "auto", cursor: "pointer",
              background: "transparent", color: t.dim,
              border: `1px solid ${t.line}`, borderRadius: t.radius,
              padding: "5px 9px", fontSize: 10, fontWeight: 700, fontFamily: MONO,
              textTransform: "uppercase", letterSpacing: ".08em",
              display: "flex", alignItems: "center", gap: 5,
            }}>
            <Fuel size={12} strokeWidth={2.4} /> Depom kaç litre?
          </button>
        </header>
        <p style={{ color: t.dim, fontSize: t.upper ? 12 : 14, margin: "0 0 16px", lineHeight: 1.5 }}>
          {mode === "target"
            ? `Hedef orana ulaşmak için gereken ${A.name.toLowerCase()} miktarını hesaplar.`
            : `Ekleyeceğin ${A.name.toLowerCase()} miktarını sürükle, oluşacak karışımı gösterir.`}
        </p>

        {/* Kurulum: katkı türü + oktan */}
        <Card style={{ marginBottom: t.gap }}>
          <div style={{ marginBottom: 8 }}><Cap>Katkı Maddesi</Cap></div>
          <Segmented big value={additiveId} onChange={setAdditiveId}
            options={Object.values(ADDITIVES).map((a) => ({ value: a.id, label: a.label }))} />

          {additiveId === "custom" ? (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", marginBottom: 8, alignItems: "baseline" }}>
                <span style={{ flex: 1 }}><Cap>Katkının Oktanı (RON)</Cap></span>
                <NumberField value={customRon} unit="" onChange={setCustomRon} min={60} max={160} />
              </div>
              <Slider value={customRon} min={60} max={160} step={1}
                onChange={setCustomRon} color={t.add} />
            </div>
          ) : (
            <div style={{ marginTop: 10 }}><Cap size={12}>RON {A.ron}</Cap></div>
          )}

          <div style={{ margin: "18px 0 8px" }}><Cap>Depodaki Benzinin Oktanı</Cap></div>
          <Segmented value={octane} onChange={setOctane}
            options={OCTANES.map((o) => ({ value: o, label: String(o) }))} />
        </Card>

        {/* Mod seçici */}
        <div role="tablist" style={{
          display: "flex", gap: t.id === "amount" ? 1 : 4,
          background: t.card, borderRadius: t.id === "amount" ? 6 : 99,
          padding: t.id === "amount" ? 3 : 4, marginBottom: t.gap,
          border: t.outline ? `1px solid ${t.line}` : "none",
        }}>
          {[["amount", "Miktara göre"], ["target", "Hedefe göre"]].map(([k, label]) => {
            const on = mode === k;
            return (
              <button key={k} role="tab" aria-selected={on} onClick={() => switchMode(k)}
                style={{
                  flex: 1, border: "none", borderRadius: t.id === "amount" ? 3 : 99,
                  padding: "10px 0", fontSize: t.upper ? 12 : 15, fontWeight: 700,
                  cursor: "pointer",
                  textTransform: t.upper ? "uppercase" : "none",
                  letterSpacing: t.upper ? ".1em" : 0,
                  fontFamily: t.upper ? MONO : SANS,
                  background: on ? t.accent : "transparent",
                  color: on ? (t.id === "amount" ? "#04222e" : "#2a0512") : t.dim,
                }}>{label}</button>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: t.gap }}>
          <Card>
            <Row icon={Fuel} label="Depodaki Yakıt" value={tank} unit="L" color={t.cur}
              min={0} max={120} step={0.5} onChange={setTank} />
          </Card>

          <Card>
            <Row icon={Droplet} label={`Mevcut ${A.name}`} value={currentPct} unit="%" color={t.cur}
              min={0} max={100} step={1} onChange={setCurrentPct} />
          </Card>

          {mode === "amount" ? (
            <Card accent={t.add} active={addVolume > 0}>
              <Row icon={Beaker} label={`Eklenecek ${A.name}`} value={addVolume} unit="L" color={t.add}
                min={0} max={addMax} step={0.1} onChange={setAddVolume} />
              <div style={{ marginTop: 12 }}>
                <Segmented value={addVolume} onChange={setAddVolume}
                  options={[0.5, 1, 2.5, 5, 10].map((v) => ({
                    value: v, label: `${String(v).replace(".", ",")} L`,
                  }))} />
              </div>
            </Card>
          ) : (
            <Card accent={t.add} active={targetPct !== currentPct}>
              <Row icon={Target} label={`Hedef ${A.name}`} value={targetPct} unit="%" color={t.add}
                min={0} max={100} step={1} onChange={setTargetPct} />
              <div style={{ marginTop: 12 }}>
                <Segmented value={targetPct} onChange={setTargetPct}
                  options={A.presets.map((p) => ({ value: p, label: `%${p}` }))} />
              </div>
            </Card>
          )}

          {/* SONUÇ */}
          <Card style={{ padding: 18 }} accent={t.add}
            active={!r.blocked && r.mode !== "empty"}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              {r.blocked ? <AlertTriangle size={19} color={t.danger} />
                : <Check size={19} color={t.add} strokeWidth={3} />}
              <span style={{
                fontSize: t.upper ? 14 : 17, fontWeight: 700, flex: 1,
                textTransform: t.upper ? "uppercase" : "none",
                letterSpacing: t.upper ? "0.12em" : 0,
              }}>Sonuç</span>
            </div>

            {r.mode === "empty" && <p style={{ color: t.dim, margin: 0 }}>Önce depodaki yakıt miktarını gir.</p>}
            {r.blocked === "gasoline" && (
              <p style={{ color: t.danger, margin: 0, lineHeight: 1.5 }}>
                Hedef mevcut oranın altında. Benzin ekleyerek seyreltmen gerekir.
              </p>
            )}
            {r.mode === "ok" && (
              <p style={{ color: t.add, margin: 0 }}>Karışım zaten hedefte. Ekleme gerekmiyor.</p>
            )}

            {!r.blocked && ["additive", "gasoline", "amount"].includes(r.mode) && (
              <>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  {r.mode === "amount"
                    ? <Readout caption={`Oluşan ${A.name} Oranı`} value={fmtPct(r.finalPct)} color={t.add} />
                    : <Readout caption={`Eklenecek ${isAdd ? A.name : "Benzin"}`} value={fmtL(r.addAmount)} color={addColor} />}
                  <Readout caption="Toplam Hacim" value={fmtL(r.totalVolume)} color={t.accent} align="right" />
                </div>

                {/* Karışım şeridi */}
                <div className="ec-bar" style={{
                  display: "flex", gap: t.id === "amount" ? 2 : 0,
                  height: t.id === "amount" ? 8 : 12,
                  borderRadius: t.id === "amount" ? 1 : 99,
                  overflow: "hidden", marginTop: 20,
                  background: t.id === "amount" ? "transparent" : t.line,
                }}>
                  {segs.map((s, i) => <span key={i} style={{ flexGrow: s.v, background: s.c }} />)}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 10 }}>
                  {segs.map((s, i) => (
                    <span key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: t.id === "amount" ? 0 : 2, background: s.c }} />
                      <Cap size={12}>{s.label} {fmtL(s.v)}</Cap>
                    </span>
                  ))}
                </div>

                {/* Oktan */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 12,
                  marginTop: 18, padding: "14px 16px",
                  borderRadius: t.radius,
                  background: t.id === "amount" ? "transparent" : "#0a1614",
                  border: `1px solid ${t.line}`,
                }}>
                  <Gauge size={20} color={t.accent} strokeWidth={2.2} />
                  <div style={{ flex: 1 }}>
                    <Cap size={12}>Karışım Oktanı (RON)</Cap>
                    <div style={{
                      fontFamily: t.numFont, fontSize: 15, color: t.dim, marginTop: 3,
                    }}>
                      {octane} &rarr; <strong style={{ color: t.text }}>{fmtNum(r.finalRon)}</strong>
                    </div>
                  </div>
                  <div style={{
                    fontFamily: t.numFont, fontSize: 30, fontWeight: 800,
                    color: t.accent, letterSpacing: -0.8,
                  }}>
                    {r.deltaRon >= 0 ? "+" : ""}{fmtNum(r.deltaRon)}
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 6, alignItems: "baseline" }}>
                  <Cap size={12}>
                    {fmtPct(r.basePct)} &rarr; {fmtPct(r.finalPct)} ({r.deltaPct >= 0 ? "+" : ""}
                    {fmtNum(r.deltaPct)} puan) · oktan doğrusal karışım tahminidir
                  </Cap>
                </div>

                {additiveId === "toluene" && r.finalPct > 30 && (
                  <div style={{
                    display: "flex", gap: 8, marginTop: 12, padding: 12,
                    borderRadius: t.radius, background: t.dangerBg, color: t.danger,
                    fontSize: 13, lineHeight: 1.5,
                    border: t.outline ? `1px solid ${t.danger}55` : "none",
                  }}>
                    <AlertTriangle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>%30 üzeri toluen contalara ve yakıt hortumlarına zarar verebilir, soğuk çalıştırmayı zorlaştırır.</span>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>

        {showTanks && (
          <div onClick={() => setShowTanks(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 50, padding: 20,
              background: "rgba(0,0,0,.78)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
              style={{
                background: t.card, border: `1px solid ${t.line}`,
                borderRadius: t.cardRadius, padding: 18,
                width: "100%", maxWidth: 360,
              }}>
              <div style={{ marginBottom: 4 }}><Cap>Depo Hacimleri</Cap></div>
              <p style={{ color: t.dim, fontSize: 12, margin: "0 0 14px", lineHeight: 1.5 }}>
                Seçince depo hacmi alana yazılır.
              </p>

              {CARS.map((c) => (
                <button key={c.name}
                  onClick={() => { setTank(c.liters); setShowTanks(false); }}
                  style={{
                    display: "flex", alignItems: "center", width: "100%",
                    background: t.presetBg, border: `1px solid ${t.line}`,
                    borderRadius: t.radius, padding: "13px 14px", marginBottom: 8,
                    color: t.text, cursor: "pointer", textAlign: "left",
                  }}>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{c.name}</span>
                  <strong style={{ fontFamily: MONO, fontSize: 17, color: t.add }}>
                    {c.liters} L
                  </strong>
                </button>
              ))}

              <button onClick={() => setShowTanks(false)}
                style={{
                  width: "100%", marginTop: 8, padding: "12px 0",
                  background: "transparent", color: t.dim,
                  border: `1px solid ${t.line}`, borderRadius: t.radius,
                  fontSize: 12, fontWeight: 700, fontFamily: MONO,
                  textTransform: "uppercase", letterSpacing: ".1em", cursor: "pointer",
                }}>Kapat</button>
            </div>
          </div>
        )}
      </div>
    </ThemeCtx.Provider>
  );
}
