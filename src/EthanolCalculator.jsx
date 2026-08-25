import React, { useState, useMemo, createContext, useContext } from "react";
import { Fuel, Droplet, Target, Check, AlertTriangle, Beaker, Gauge, Flame, Grid2x2 } from "lucide-react";

/* ============================================================
   HESAP ÇEKİRDEĞİ — platformdan bağımsız, saf fonksiyonlar.
   core/blend.js olarak ayırıp iOS / web / test tarafında
   aynen kullanabilirsin.
   ============================================================ */

export const ADDITIVES = {
  ethanol: { id: "ethanol", label: { tr: "Etanol", en: "Ethanol", es: "Etanol" }, ron: 109, presets: [10, 20, 25, 50, 85] },
  toluene: { id: "toluene", label: { tr: "Toluen", en: "Toluene", es: "Tolueno" }, ron: 121, presets: [5, 10, 15, 20, 30] },
  custom:  { id: "custom",  label: null, ron: 110, presets: [5, 10, 20, 30, 50] },
};

export const OCTANES = [93, 95, 98, 100];

export const AUTHOR = "dev.main.dragon";
export const SHOW_AD = true;   // false yaparsan banner alanı tamamen kapanır

export const APPS = [
  { id: "power", name: { tr: "Güç Hesaplama", en: "Power Calculator", es: "Cálculo de Potencia" }, url: null },
];

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
   DİLLER
   ============================================================ */

export const LANGS = ["tr", "en", "es"];

const STR = {
  tr: {
    title: "YAKIT KATKISI", tankBtn: "Depom kaç litre?",
    custom: "Özel", customName: "Katkı",
    customRon: "Katkının Oktanı (RON)", baseOctane: "Depodaki Benzinin Oktanı",
    tabAmount: "Miktara göre", tabTarget: "Hedefe göre",
    tankLabel: "Depodaki Yakıt", gasoline: "Benzin", fuel: "Yakıt",
    current: (n) => `Mevcut ${n}`, toAdd: (n) => `Eklenecek ${n}`,
    target: (n) => `Hedef ${n}`, resulting: (n) => `Oluşan ${n} Oranı`,
    result: "Sonuç", totalVolume: "Toplam Hacim",
    octane: "Karışım Oktanı (RON)", points: "puan",
    note: "oktan doğrusal karışım tahminidir",
    empty: "Önce depodaki yakıt miktarını gir.",
    dilute: "Hedef mevcut oranın altında. Benzin ekleyerek seyreltmen gerekir.",
    atTarget: "Karışım zaten hedefte. Ekleme gerekmiyor.",
    tolWarn: "%30 üzeri toluen contalara ve yakıt hortumlarına zarar verebilir, soğuk çalıştırmayı zorlaştırır.",
    appsBtn: "Diğer uygulamalar", appsTitle: "Diğer Uygulamalar", soon: "Çok yakında", appsHint: "Yeni araçlar üzerinde çalışıyoruz.",
    modalTitle: "Depo Hacimleri", modalHint: "Seçince depo hacmi alana yazılır.",
    close: "Kapat",
  },
  en: {
    title: "FUEL ADDITIVE", tankBtn: "My tank size?",
    custom: "Custom", customName: "Additive",
    customRon: "Additive octane (RON)", baseOctane: "Octane of fuel in tank",
    tabAmount: "By amount", tabTarget: "By target",
    tankLabel: "Fuel in Tank", gasoline: "Gasoline", fuel: "Fuel",
    current: (n) => `Current ${n}`, toAdd: (n) => `${n} to Add`,
    target: (n) => `Target ${n}`, resulting: (n) => `Resulting ${n}`,
    result: "Result", totalVolume: "Total Volume",
    octane: "Blend Octane (RON)", points: "pts",
    note: "octane is a linear-blend estimate",
    empty: "Enter how much fuel is in the tank first.",
    dilute: "Target is below the current ratio. You need to dilute with gasoline.",
    atTarget: "The blend is already on target. Nothing to add.",
    tolWarn: "Above 30% toluene can damage seals and fuel lines, and makes cold starts harder.",
    appsBtn: "Other apps", appsTitle: "Other Apps", soon: "Coming soon", appsHint: "More tools are on the way.",
    modalTitle: "Tank Sizes", modalHint: "Tap one to fill in the tank field.",
    close: "Close",
  },
  es: {
    title: "ADITIVO", tankBtn: "¿Mi depósito?",
    custom: "Otro", customName: "Aditivo",
    customRon: "Octanaje del aditivo (RON)", baseOctane: "Octanaje del depósito",
    tabAmount: "Por cantidad", tabTarget: "Por objetivo",
    tankLabel: "En el Depósito", gasoline: "Gasolina", fuel: "Combustible",
    current: (n) => `${n} actual`, toAdd: (n) => `${n} a Añadir`,
    target: (n) => `${n} objetivo`, resulting: (n) => `${n} resultante`,
    result: "Resultado", totalVolume: "Volumen Total",
    octane: "Octanaje de la Mezcla (RON)", points: "pts",
    note: "el octanaje es una estimación de mezcla lineal",
    empty: "Introduce primero el combustible del depósito.",
    dilute: "El objetivo está por debajo del nivel actual. Hay que diluir con gasolina.",
    atTarget: "La mezcla ya está en el objetivo. No hace falta añadir nada.",
    tolWarn: "Por encima del 30%, el tolueno puede dañar juntas y latiguillos, y dificulta el arranque en frío.",
    appsBtn: "Otras apps", appsTitle: "Otras Apps", soon: "Muy pronto", appsHint: "Estamos preparando más herramientas.",
    modalTitle: "Capacidad del Depósito", modalHint: "Toca una para rellenar el campo.",
    close: "Cerrar",
  },
};

/* ============================================================
   TEMALAR
   ============================================================ */

const MONO = "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace";
const SANS = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif";

const THEME = {
  id: "amount",
  bg: "#0b0e11", card: "#151a1f", line: "#272f38",
  text: "#f2f4f6", dim: "#7b8794",
  add: "#d0202c", cur: "#d0202c", accent: "#f2f4f6",
  presetBg: "#181e25", presetOn: "#d0202c", presetOnText: "#ffffff",
  danger: "#f0b429", dangerBg: "#241c10",
  radius: 3, cardRadius: 6, outline: true,
  numFont: MONO, upper: true, track: 3, thumbRadius: "3px", gap: 6,
};

export const VERSION =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0";

const ThemeCtx = createContext(THEME);
const useT = () => useContext(ThemeCtx);

let DEC = ",";      // ondalık ayıracı
let PCTPRE = true;  // %20 mi 20% mi

const num = (v, d = 1) => v.toFixed(d).replace(".", DEC).replace(DEC + "0", "");
const fmtL = (v) => {
  if (!isFinite(v)) return "—";
  if (v > 0 && v < 1) return `${(v * 1000).toFixed(0)} mL`;
  return `${v.toFixed(1).replace(".", DEC)} L`;
};
const fmtPct = (v) => (PCTPRE ? `%${num(v)}` : `${num(v)}%`);
const fmtNum = (v, d = 1) => v.toFixed(d).replace(".", DEC);

/* ============================================================
   PARÇALAR
   ============================================================ */

function Card({ children, accent, active, style }) {
  const t = useT();
  return (
    <div style={{
      background: t.card, borderRadius: t.cardRadius, padding: 11,
      border: `1px solid ${active ? accent : t.outline ? t.line : "transparent"}`,
      ...style,
    }}>{children}</div>
  );
}

function Cap({ children, size = 12 }) {
  const t = useT();
  return (
    <span style={{
      fontSize: t.upper ? size - 3 : size - 1, color: t.dim,
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
              padding: big ? "7px 0" : "5px 0",
              fontSize: big ? (t.upper ? 12 : 14) : (t.upper ? 11 : 13),
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
  const us = { fontSize: 17, fontWeight: 700, fontFamily: t.numFont, color: t.text };
  return (
    <span style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
      {unit === "%" && PCTPRE && <span style={us}>%</span>}
      <input className="ec-num" inputMode="decimal" value={shown}
        onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        style={{ width: `${Math.max(2, shown.length)}ch`, fontFamily: t.numFont, color: t.text }} />
      {unit !== "%" ? <span style={us}>{unit}</span> : !PCTPRE && <span style={us}>%</span>}
    </span>
  );
}

function Row({ icon: Icon, label, value, unit, color, action, ...s }) {
  const t = useT();
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Icon size={17} color={color} strokeWidth={2.2} />
        <span style={{
          fontSize: t.upper ? 12 : 15, fontWeight: 600,
          textTransform: t.upper ? "uppercase" : "none",
          letterSpacing: t.upper ? "0.09em" : 0,
        }}>{label}</span>
        <span style={{ flex: 1, minWidth: 4 }}>{action}</span>
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
        color, fontSize: t.upper ? 29 : 34, fontWeight: 800,
        letterSpacing: t.upper ? -0.6 : -1, lineHeight: 1, fontFamily: t.numFont,
      }}>{value}</div>
    </div>
  );
}

/* Reklam alanı — ileride gerçek reklam SDK'sıyla değiştirilecek.
   Şimdilik public/banner.png (320x50) gösterir. */
function AdSlot() {
  const t = useT();
  const [ok, setOk] = useState(true);
  if (!ok || !SHOW_AD) return null;
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: t.gap }}>
      <img
        src={`${import.meta.env.BASE_URL}banner.png`}
        alt=""
        width={320}
        height={50}
        onError={() => setOk(false)}
        style={{
          width: 320, height: 50, maxWidth: "100%", objectFit: "cover",
          display: "block", borderRadius: t.radius,
          border: `1px solid ${t.line}`,
        }}
      />
    </div>
  );
}

function Modal({ title, hint, onClose, closeLabel, children }) {
  const t = useT();
  return (
    <div onClick={onClose}
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
        <div style={{ marginBottom: 4 }}><Cap>{title}</Cap></div>
        <p style={{ color: t.dim, fontSize: 12, margin: "0 0 14px", lineHeight: 1.5 }}>{hint}</p>
        {children}
        <button onClick={onClose}
          style={{
            width: "100%", marginTop: 8, padding: "12px 0",
            background: "transparent", color: t.dim,
            border: `1px solid ${t.line}`, borderRadius: t.radius,
            fontSize: 12, fontWeight: 700, fontFamily: MONO,
            textTransform: "uppercase", letterSpacing: ".1em", cursor: "pointer",
          }}>{closeLabel}</button>
      </div>
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
  const [tank, setTank] = useState(0);
  const [currentPct, setCurrentPct] = useState(0);
  const [targetPct, setTargetPct] = useState(20);
  const [addVolume, setAddVolume] = useState(5);
  const [showTanks, setShowTanks] = useState(false);
  const [showApps, setShowApps] = useState(false);
  const [lang, setLang] = useState("tr");

  const t = THEME;
  const L = STR[lang];
  DEC = lang === "en" ? "." : ",";
  PCTPRE = lang !== "en";
  const A = additiveId === "custom"
    ? { ...ADDITIVES.custom, ron: customRon, name: L.customName }
    : { ...ADDITIVES[additiveId], name: ADDITIVES[additiveId].label[lang] };

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
    { v: r.parts.tank, c: "#39424c", label: L.fuel },
    { v: r.parts.added, c: addColor, label: isAdd ? A.name : L.gasoline },
  ].filter((s) => s.v > 1e-6);

  return (
    <ThemeCtx.Provider value={t}>
      <div style={{
        background: t.bg, color: t.text, minHeight: "100vh",
        padding: "calc(16px + env(safe-area-inset-top, 0px)) 12px calc(18px + env(safe-area-inset-bottom, 0px))", fontFamily: SANS,
        fontVariantNumeric: "tabular-nums", WebkitTapHighlightColor: "transparent",
        maxWidth: 520, margin: "0 auto",
      }}>
        <style>{`
          .ec-range{-webkit-appearance:none;appearance:none;width:100%;outline:none;touch-action:none;display:block;}
          .ec-range::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:${t.thumbRadius};background:${t.id === "amount" ? t.text : "#fff"};box-shadow:0 1px 5px rgba(0,0,0,.7);cursor:pointer;}
          .ec-range::-moz-range-thumb{width:18px;height:18px;border:none;border-radius:${t.thumbRadius};background:${t.id === "amount" ? t.text : "#fff"};cursor:pointer;}
          .ec-range:focus-visible{box-shadow:0 0 0 3px ${t.accent}99;}
          .ec-num{background:transparent;border:none;font-size:17px;font-weight:700;text-align:right;padding:0;outline:none;font-variant-numeric:tabular-nums;min-width:2ch;}
          .ec-num:focus-visible{border-bottom:2px solid ${t.accent};}
          @media (prefers-reduced-motion:no-preference){.ec-bar span{transition:flex-grow .25s ease;}}
        `}</style>

        {/* Tüm görünümü kaplayan zemin — WebView'ın beyaz arkaplanını gizler */}
        <div style={{ position: "fixed", inset: 0, background: t.bg, zIndex: -1 }} />

        <AdSlot />

        <header style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9, flexWrap: "wrap", rowGap: 6 }}>
          <Flame size={19} color={t.add} strokeWidth={2.2} />
          <h1 style={{
            fontSize: t.upper ? 15 : 22, fontWeight: 800, margin: 0, whiteSpace: "nowrap",
            letterSpacing: t.upper ? "0.1em" : -0.7,
            fontFamily: t.upper ? MONO : SANS,
          }}>{L.title}</h1>
          <button onClick={() => setShowApps(true)}
            style={{
              marginLeft: "auto", cursor: "pointer",
              background: "transparent", color: t.dim,
              border: `1px solid ${t.line}`, borderRadius: t.radius,
              padding: "5px 8px", fontSize: 9, fontWeight: 700, fontFamily: MONO,
              textTransform: "uppercase", letterSpacing: ".06em", whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: 4,
            }}>
            <Grid2x2 size={11} strokeWidth={2.4} /> {L.appsBtn}
          </button>
          <button
            onClick={() => setLang(LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length])}
            aria-label="Language"
            style={{
              cursor: "pointer", background: "transparent", color: t.add,
              border: `1px solid ${t.line}`, borderRadius: t.radius,
              padding: "5px 7px", fontSize: 9, fontWeight: 800, fontFamily: MONO,
              textTransform: "uppercase", letterSpacing: ".06em",
            }}>{lang}</button>
        </header>

        {/* Kurulum: katkı türü + oktan */}
        <Card style={{ marginBottom: t.gap }}>
          <Segmented big value={additiveId} onChange={setAdditiveId}
            options={Object.values(ADDITIVES).map((a) => ({ value: a.id, label: a.label ? a.label[lang] : L.custom }))} />

          {additiveId === "custom" ? (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", marginBottom: 8, alignItems: "baseline" }}>
                <span style={{ flex: 1 }}><Cap>{L.customRon}</Cap></span>
                <NumberField value={customRon} unit="" onChange={setCustomRon} min={60} max={160} />
              </div>
              <Slider value={customRon} min={60} max={160} step={1}
                onChange={setCustomRon} color={t.add} />
            </div>
          ) : null}

          <div style={{ margin: "10px 0 5px" }}><Cap>{L.baseOctane}</Cap></div>
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
          {[["amount", L.tabAmount], ["target", L.tabTarget]].map(([k, label]) => {
            const on = mode === k;
            return (
              <button key={k} role="tab" aria-selected={on} onClick={() => switchMode(k)}
                style={{
                  flex: 1, border: "none", borderRadius: t.id === "amount" ? 3 : 99,
                  padding: "8px 0", fontSize: t.upper ? 11 : 14, fontWeight: 700,
                  cursor: "pointer",
                  textTransform: t.upper ? "uppercase" : "none",
                  letterSpacing: t.upper ? ".1em" : 0,
                  fontFamily: t.upper ? MONO : SANS,
                  background: on ? t.accent : "transparent",
                  color: on ? t.bg : t.dim,
                }}>{label}</button>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: t.gap }}>
          <Card>
            <Row icon={Fuel} label={L.tankLabel} value={tank}
              action={
                <button onClick={() => setShowTanks(true)}
                  style={{
                    background: "transparent", border: "none", padding: "2px 4px",
                    color: t.dim, cursor: "pointer", fontFamily: MONO, fontSize: 9,
                    fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em",
                    textDecoration: "underline", textUnderlineOffset: 3, whiteSpace: "nowrap",
                  }}>{L.tankBtn}</button>
              } unit="L" color={t.cur}
              min={0} max={120} step={0.5} onChange={setTank} />
          </Card>

          <Card>
            <Row icon={Droplet} label={L.current(A.name)} value={currentPct} unit="%" color={t.cur}
              min={0} max={100} step={1} onChange={setCurrentPct} />
          </Card>

          {mode === "amount" ? (
            <Card accent={t.add} active={addVolume > 0}>
              <Row icon={Beaker} label={L.toAdd(A.name)} value={addVolume} unit="L" color={t.add}
                min={0} max={addMax} step={0.1} onChange={setAddVolume} />
              <div style={{ marginTop: 8 }}>
                <Segmented value={addVolume} onChange={setAddVolume}
                  options={[0.5, 1, 2.5, 5, 10].map((v) => ({
                    value: v, label: `${String(v).replace(".", DEC)} L`,
                  }))} />
              </div>
            </Card>
          ) : (
            <Card accent={t.add} active={targetPct !== currentPct}>
              <Row icon={Target} label={L.target(A.name)} value={targetPct} unit="%" color={t.add}
                min={0} max={100} step={1} onChange={setTargetPct} />
              <div style={{ marginTop: 8 }}>
                <Segmented value={targetPct} onChange={setTargetPct}
                  options={A.presets.map((p) => ({ value: p, label: PCTPRE ? `%${p}` : `${p}%` }))} />
              </div>
            </Card>
          )}

          {/* SONUÇ */}
          <Card style={{ padding: 12 }} accent={t.add}
            active={!r.blocked && r.mode !== "empty"}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
              {r.blocked ? <AlertTriangle size={17} color={t.danger} />
                : <Check size={17} color={t.add} strokeWidth={3} />}
              <span style={{
                fontSize: t.upper ? 12 : 15, fontWeight: 700, flex: 1,
                textTransform: t.upper ? "uppercase" : "none",
                letterSpacing: t.upper ? "0.12em" : 0,
              }}>{L.result}</span>
            </div>

            {r.mode === "empty" && <p style={{ color: t.dim, margin: 0 }}>{L.empty}</p>}
            {r.blocked === "gasoline" && (
              <p style={{ color: t.danger, margin: 0, lineHeight: 1.5 }}>
                {L.dilute}
              </p>
            )}
            {r.mode === "ok" && (
              <p style={{ color: t.add, margin: 0 }}>{L.atTarget}</p>
            )}

            {!r.blocked && ["additive", "gasoline", "amount"].includes(r.mode) && (
              <>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  {r.mode === "amount"
                    ? <Readout caption={L.resulting(A.name)} value={fmtPct(r.finalPct)} color={t.add} />
                    : <Readout caption={L.toAdd(isAdd ? A.name : L.gasoline)} value={fmtL(r.addAmount)} color={addColor} />}
                  <Readout caption={L.totalVolume} value={fmtL(r.totalVolume)} color={t.accent} align="right" />
                </div>

                {/* Karışım şeridi */}
                <div className="ec-bar" style={{
                  display: "flex", gap: t.id === "amount" ? 2 : 0,
                  height: t.id === "amount" ? 7 : 11,
                  borderRadius: t.id === "amount" ? 1 : 99,
                  overflow: "hidden", marginTop: 11,
                  background: t.id === "amount" ? "transparent" : t.line,
                }}>
                  {segs.map((s, i) => <span key={i} style={{ flexGrow: s.v, background: s.c }} />)}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
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
                  marginTop: 11, padding: "9px 11px",
                  borderRadius: t.radius,
                  background: t.id === "amount" ? "transparent" : "#0a1614",
                  border: `1px solid ${t.line}`,
                }}>
                  <Gauge size={17} color={t.accent} strokeWidth={2.2} />
                  <div style={{ flex: 1 }}>
                    <Cap size={12}>{L.octane}</Cap>
                    <div style={{
                      fontFamily: t.numFont, fontSize: 13, color: t.dim, marginTop: 2,
                    }}>
                      {octane} &rarr; <strong style={{ color: t.text }}>{fmtNum(r.finalRon)}</strong>
                    </div>
                  </div>
                  <div style={{
                    fontFamily: t.numFont, fontSize: 24, fontWeight: 800,
                    color: t.accent, letterSpacing: -0.8,
                  }}>
                    {r.deltaRon >= 0 ? "+" : ""}{fmtNum(r.deltaRon)}
                  </div>
                </div>

                <div style={{ marginTop: 9, display: "flex", gap: 6, alignItems: "baseline" }}>
                  <Cap size={12}>
                    {fmtPct(r.basePct)} &rarr; {fmtPct(r.finalPct)} ({r.deltaPct >= 0 ? "+" : ""}
                    {fmtNum(r.deltaPct)} {L.points}) · {L.note}
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
                    <span>{L.tolWarn}</span>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>

        <div style={{
          textAlign: "center", marginTop: 11,
          fontFamily: MONO, fontSize: 10, color: t.dim,
          letterSpacing: ".08em",
        }}>
          {AUTHOR} · v{VERSION}
        </div>

        {showTanks && (
          <Modal title={L.modalTitle} hint={L.modalHint} closeLabel={L.close}
            onClose={() => setShowTanks(false)}>
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
          </Modal>
        )}

        {showApps && (
          <Modal title={L.appsTitle} hint={L.appsHint} closeLabel={L.close}
            onClose={() => setShowApps(false)}>
            {APPS.map((a) => {
              const live = Boolean(a.url);
              return (
                <div key={a.id}
                  style={{
                    display: "flex", alignItems: "center", width: "100%",
                    background: t.presetBg, border: `1px solid ${t.line}`,
                    borderRadius: t.radius, padding: "13px 14px", marginBottom: 8,
                    opacity: live ? 1 : 0.55, cursor: live ? "pointer" : "default",
                  }}
                  onClick={live ? () => window.open(a.url, "_blank") : undefined}>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: t.text }}>
                    {a.name[lang]}
                  </span>
                  {!live && (
                    <span style={{
                      fontFamily: MONO, fontSize: 9, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: ".1em",
                      color: t.add, border: `1px solid ${t.add}`,
                      borderRadius: t.radius, padding: "3px 6px", whiteSpace: "nowrap",
                    }}>{L.soon}</span>
                  )}
                </div>
              );
            })}
          </Modal>
        )}
      </div>
    </ThemeCtx.Provider>
  );
}
