import React, { useState, useMemo, useEffect, createContext, useContext } from "react";
import {
  Fuel, Droplet, Target, Check, AlertTriangle, Beaker, Gauge, Flame,
  Grid2x2, Car, History, Calculator, Plus, Trash2, Wallet, Info,
} from "lucide-react";

/* ============================================================
   HESAP ÇEKİRDEĞİ — saf fonksiyonlar, arayüzden bağımsız
   ============================================================ */

export function calculateBlend({
  tank = 0, currentPct = 0, targetPct = 0,
  purityPct = 100, gasPct = 0,
  ronBase = 95, ronAdditive = 109,
}) {
  const c = currentPct / 100, t = targetPct / 100;
  const p = purityPct / 100, g = gasPct / 100;
  const EPS = 1e-9;

  const baseVolume = tank;
  const basePctFrac = baseVolume > EPS ? c : 0;

  let mode = "ok", amount = 0, blocked = null;

  if (baseVolume <= EPS) mode = "empty";
  else if (Math.abs(t - basePctFrac) < 5e-5) mode = "ok";
  else if (t > basePctFrac) {
    mode = "additive";
    if (p <= t + EPS) blocked = "purity";
    else amount = (baseVolume * (t - basePctFrac)) / (p - t);
  } else {
    mode = "gasoline";
    if (g >= t - EPS) blocked = "gasoline";
    else amount = (baseVolume * (basePctFrac - t)) / (t - g);
  }

  const addAmount = blocked ? 0 : amount;
  const totalVolume = baseVolume + addAmount;
  const addedShare = mode === "additive" ? p : g;
  const finalPct = totalVolume > EPS
    ? ((baseVolume * basePctFrac + addAmount * addedShare) / totalVolume) * 100 : 0;

  const baseRon = (1 - basePctFrac) * ronBase + basePctFrac * ronAdditive;
  const addedRon = mode === "additive" ? ronAdditive : ronBase;
  const finalRon = totalVolume > EPS
    ? (baseVolume * baseRon + addAmount * addedRon) / totalVolume : baseRon;

  return {
    mode, blocked, baseVolume,
    basePct: basePctFrac * 100,
    addAmount, totalVolume, finalPct,
    deltaPct: finalPct - basePctFrac * 100,
    ronBase, baseRon, finalRon, deltaRon: finalRon - baseRon,
    parts: { tank, added: addAmount },
  };
}

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

  const baseRon = (1 - c) * ronBase + c * ronAdditive;
  const finalRon = totalVolume > EPS
    ? (baseVolume * baseRon + addVolume * ronAdditive) / totalVolume : baseRon;

  return {
    mode: baseVolume <= EPS ? "empty" : "amount",
    blocked: null, baseVolume,
    basePct: c * 100,
    addAmount: addVolume, totalVolume, finalPct,
    deltaPct: finalPct - c * 100,
    ronBase, baseRon, finalRon, deltaRon: finalRon - baseRon,
    parts: { tank, added: addVolume },
  };
}

/* Maliyet: eklenen katkının bedeli, karışımın litre fiyatı,
   RON puanı başına maliyet. */
export function blendCost({ tank, addAmount, deltaRon, priceFuel, priceAdd }) {
  const total = tank + addAmount;
  if (!priceFuel && !priceAdd) return null;
  const addCost = addAmount * priceAdd;
  const perLitre = total > 0 ? (tank * priceFuel + addCost) / total : 0;
  const perPoint = deltaRon > 0.05 ? addCost / deltaRon : null;
  return { addCost, perLitre, perPoint, basePerLitre: priceFuel };
}

/* ============================================================
   SABİTLER
   ============================================================ */

export const AUTHOR = "dev.main.dragon";
export const SHOW_AD = true;
export const SHOW_APPS_BTN = false;
export const DISC_VERSION = 2;

/* Açılış ekranı süresi (ms). iOS'ta native splash bunu üstlenir. */
export const SPLASH_MS = 3000;

/* Öğretici metni değişirse artır, herkese bir kez daha gösterilir */
export const TOUR_VERSION = 2;

export const VERSION =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0";

export const PRIVACY_URL = "https://devmaindragon.github.io/yakitkatkisi/privacy.html";
export const SUPPORT_URL = "https://devmaindragon.github.io/yakitkatkisi/support.html";

export const ADDITIVES = {
  ethanol: { id: "ethanol", label: { tr: "Etanol", en: "Ethanol", es: "Etanol" }, ron: 109, presets: [10, 20, 25, 50, 85] },
  toluene: { id: "toluene", label: { tr: "Toluen", en: "Toluene", es: "Tolueno" }, ron: 121, presets: [5, 10, 15, 20, 30] },
  custom:  { id: "custom",  label: null, ron: 110, presets: [5, 10, 20, 30, 50] },
};

export const OCTANES = [93, 95, 98, 100];
export const CURRENCIES = ["₺", "$", "€", "£"];

export const APPS = [
  { id: "power", name: { tr: "Güç Hesaplama", en: "Power Calculator", es: "Cálculo de Potencia" }, url: null },
];

/* Yeni kullanıcıya örnek olsun diye; garaj boşsa öneri olarak gösterilir */
export const RUN_TYPES = ["0-100", "100-200", "402m"];

/* REFERANS TABLO — kendi doğruladığın ölçümleri buraya gir.
   Boş bırakırsan "Tablo" sekmesi hiç görünmez.
   Alanlar: id, car, type, seconds, blend, ron (bilinmiyorsa null),
   slope (yol eğimi %, opsiyonel), source, note
*/
export const REFERENCE_RUNS = [
  {
    id: "r1", car: "BMW G20 320i", type: "100-200",
    seconds: 11.20, blend: "E30", ron: null,
    slope: -0.80, source: "mgremaps", note: "",
  },
  {
    id: "r2", car: "BMW G20 320i", type: "100-200",
    seconds: 11.77, blend: "E20", ron: null,
    slope: -0.42, source: "ez_carprojects", note: "",
  },
  {
    id: "r3", car: "BMW G20 320i", type: "100-200",
    seconds: 12.34, blend: "E10", ron: null,
    slope: -0.94, source: "ez_carprojects", note: "",
  },
  {
    id: "r4", car: "BMW G20 320i", type: "100-200",
    seconds: 13.26, blend: "100 oktan", ron: 100,
    slope: -1.12, source: "ez_carprojects", note: "",
  },
];

export const SAMPLE_CARS = [
  { name: "BMW G20 320i", capacity: 60 },
  { name: "Hyundai i20 N", capacity: 40 },
  { name: "Golf 8 R", capacity: 55 },
];

/* ============================================================
   KALICI DEPOLAMA
   ============================================================ */

const K = {
  lang: "yk.lang", disc: "yk.discOk", cars: "yk.cars",
  active: "yk.activeCar", prices: "yk.prices", tour: "yk.tour",
};

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* yok say */ } },
  json(k, fallback) {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  setJson(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* yok say */ } },
};

/* Vite dışında (önizleme, test) import.meta.env tanımsız olabilir */
function baseUrl() {
  try { return import.meta.env?.BASE_URL ?? ""; } catch { return ""; }
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ============================================================
   DİLLER
   ============================================================ */

export const LANGS = ["tr", "en", "es"];

const STR = {
  tr: {
    title: "YAKIT KATKISI",
    navCalc: "Hesap", navGarage: "Garaj",
    custom: "Özel", customName: "Katkı",
    customRon: "Katkının Oktanı (RON)", baseOctane: "Benzinin Oktanı (katkısız)",
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
    overflow: (v, c) => `Depo taşar: ${v} karışım, ${c} kapasiteyi aşıyor.`,

    garage: "Garaj", garageHint: "Aracını kaydet, değerler otomatik dolsun.",
    garageEmpty: "Henüz araç eklemedin.",
    addCar: "Araç ekle", editCar: "Aracı düzenle",
    carName: "Araç adı", carCapacity: "Depo hacmi (L)",
    carPct: "Depodaki katkı oranı (%)", carOctane: "Kullandığı benzin",
    saveCar: "Kaydet", deleteCar: "Sil", activeCar: "Seçili",
    suggestions: "Hazır seçenekler",

    prices: "Fiyatlar", pricesHint: "Karışımın maliyetini hesaplamak için.",
    priceFuel: "Benzin", currency: "Para birimi",
    costTitle: "Maliyet", costAdd: "Katkı bedeli",
    costLitre: "Karışım litre fiyatı", costPoint: "RON puanı başına",

    records: "Kayıtlar", tabRuns: "Denemelerim", tabRef: "Referans", runsEmpty: "Henüz deneme kaydetmedin.",
    runsHint: "Aynı aracın farklı karışımlarla sürelerini karşılaştır.",
    addRun: "Deneme ekle", editRun: "Denemeyi düzenle",
    runCar: "Araç", runType: "Ölçüm", runSeconds: "Süre (sn)",
    runBlend: "Karışım", runRon: "RON",
    runSlope: "Yol eğimi (%)", runNote: "Koşullar",
    runNotePh: "Sıcaklık, rakım, vites, zemin…",
    best: "En iyi", refTitle: "Referans Denemeler",
    refHint: "Kendi ölçümlerimiz. Araç, karışım ve koşullar satırda yazılı.",
    runWarn: "Hız denemelerini yalnızca kapalı pistte veya trafiğe kapalı özel alanda yap. Süreler hava, rakım, lastik ve sürücüye göre değişir; bilimsel ölçüm değildir.",

    privacy: "Gizlilik", support: "Destek",
    discTitle: "Önce Şunu Oku", discOk: "Anladım",
    discHide: "Bir daha gösterme", warning: "Uyarı",
    disc: [
      "Sonuçlar tahmindir. Karıştırmadan önce kendin doğrula.",
      "Yakıta katkı eklemek garantiyi düşürebilir, emisyon ve yakıt mevzuatına aykırı olabilir. Yerel kuralları kontrol et.",
      "Toluen zehirlidir. Buharını soluma, cilde temas ettirme, açık havada çalış. Yüksek oranlar conta ve hortumlara zarar verir.",
      "Yüksek etanol oranları uygun donanımı olmayan araçlarda yakıt sistemine zarar verebilir.",
      "Hız denemelerini yalnızca kapalı pistte veya trafiğe kapalı alanda yap.",
      "Kullanım tamamen kendi sorumluluğundadır.",
    ],
    appsBtn: "Diğer uygulamalar", appsTitle: "Diğer Uygulamalar",
    soon: "Çok yakında", appsHint: "Yeni araçlar üzerinde çalışıyoruz.",
    confirmDel: "Bu kaydı silmek istediğine emin misin?", confirmYes: "Sil",
    navInfo: "Bilgi", infoTitle: "Yüksek Oktan Neden Güç Verir?",
    info: [
      { t: "Oktan, enerji değil vuruntu direncidir",
        d: "Yüksek oktanlı yakıt daha fazla enerji içermez. Aksine etanol, benzinden litre başına yaklaşık üçte bir daha az enerji taşır. Oktan sayısı yakıtın kendiliğinden tutuşmaya — yani vuruntuya — ne kadar direndiğini gösterir. Tek başına oktan yükseltmek güç vermez." },
      { t: "Kazanç motorun ayarından gelir",
        d: "Modern motorlarda vuruntu sensörü vardır. Vuruntu algılandığında ECU ateşleme avansını geri çeker, turbolu motorlarda basıncı düşürür; güç kaybı buradan doğar. Yakıt vuruntuya daha dirençli olduğunda ECU avansı ileri alabilir ve basıncı yükseltebilir. Artış yakıttan değil, motorun artık kısıtlanmadan çalışabilmesinden gelir." },
      { t: "Etanolün ek avantajı: dolgu soğutma",
        d: "Etanol buharlaşırken emme havasından belirgin ısı çeker. Soğuyan hava yoğunlaşır, silindire daha fazla oksijen girer ve vuruntu riski ayrıca azalır. Turbolu motorlarda E30-E85 karışımlarının bu kadar etkili olmasının sebebi budur." },
      { t: "Her motorda kazanç olmaz", warn: true,
        d: "Atmosferik ve fabrika ayarlı bir motor 95 oktanla zaten en uygun avansta çalışıyorsa, 98 veya 100 oktan ölçülebilir bir fark yaratmaz. Kazanç esas olarak turbolu ya da yazılımı yüksek oktana göre düzenlenmiş motorlarda görülür." },
      { t: "Bedeli var", warn: true,
        d: "Etanol oranı arttıkça aynı hava-yakıt oranı için daha fazla yakıt gerekir; tüketim yükselir ve enjektör, pompa gibi parçaların bu debiyi karşılayabilmesi gerekir. Yetersiz kalırsa karışım fakirleşir ve motor zarar görebilir." },
    ], tourNext: "İleri", tourStart: "Başla", tourSkip: "Atla",
    tour: [
      ["Hesap", "Depondaki yakıta ne kadar katkı ekleyeceğini hesaplar. İstersen miktarı sürükle, oluşacak oranı gör; istersen hedef oranı seç, kaç litre gerektiğini söylesin. Karışımın tahmini oktanını da hesaplar."],
      ["Garaj", "Araçlarını kaydet. Bir aracı seçtiğinde depo hacmi, mevcut katkı oranı ve benzin oktanı otomatik dolar. Benzin ve katkı litre fiyatlarını da buradan girersin; maliyet hesabı ona göre çalışır."],
      ["Kayıtlar", "Hızlanma denemelerini kaydet ve farklı karışımların sürelerini karşılaştır. Referans Denemeler sekmesinde bizim ölçümlerimiz yer alır."],
      ["Bilgi", "Yüksek oktanın neden güç verdiğini, etanolün ne işe yaradığını ve hangi motorlarda kazanç beklenmemesi gerektiğini kısaca anlatır."],
    ],
    close: "Kapat", cancel: "Vazgeç",
  },

  en: {
    title: "FUEL ADDITIVE",
    navCalc: "Calculate", navGarage: "Garage",
    custom: "Custom", customName: "Additive",
    customRon: "Additive octane (RON)", baseOctane: "Base gasoline octane",
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
    overflow: (v, c) => `Tank overflows: ${v} blend exceeds the ${c} capacity.`,

    garage: "Garage", garageHint: "Save your car and the values fill in automatically.",
    garageEmpty: "No vehicles yet.",
    addCar: "Add vehicle", editCar: "Edit vehicle",
    carName: "Vehicle name", carCapacity: "Tank capacity (L)",
    carPct: "Additive already in tank (%)", carOctane: "Gasoline used",
    saveCar: "Save", deleteCar: "Delete", activeCar: "Selected",
    suggestions: "Quick add",

    prices: "Prices", pricesHint: "Used to work out the cost of the blend.",
    priceFuel: "Gasoline", currency: "Currency",
    costTitle: "Cost", costAdd: "Additive cost",
    costLitre: "Blend price per litre", costPoint: "Per RON point",

    records: "Records", tabRuns: "My Runs", tabRef: "Reference", runsEmpty: "No runs recorded yet.",
    runsHint: "Compare times for the same car on different blends.",
    addRun: "Add run", editRun: "Edit run",
    runCar: "Vehicle", runType: "Measurement", runSeconds: "Time (s)",
    runBlend: "Blend", runRon: "RON",
    runSlope: "Road gradient (%)", runNote: "Conditions",
    runNotePh: "Temperature, altitude, gear, surface…",
    best: "Best", refTitle: "Reference Runs",
    refHint: "Our own measurements. Car, blend and conditions are listed per row.",
    runWarn: "Only run acceleration tests on a closed track or private land closed to traffic. Times vary with weather, altitude, tyres and driver; these are not scientific measurements.",

    privacy: "Privacy", support: "Support",
    discTitle: "Read This First", discOk: "I understand",
    discHide: "Don\u2019t show again", warning: "Warning",
    disc: [
      "Results are estimates. Verify them yourself before mixing.",
      "Blending additives may void your warranty and can breach emissions and fuel regulations. Check your local rules.",
      "Toluene is toxic. Do not inhale the vapour, avoid skin contact, work outdoors. High ratios damage seals and hoses.",
      "High ethanol ratios can damage the fuel system of vehicles that are not equipped for them.",
      "Only run acceleration tests on a closed track or private land closed to traffic.",
      "You use this app entirely at your own risk.",
    ],
    appsBtn: "Other apps", appsTitle: "Other Apps",
    soon: "Coming soon", appsHint: "More tools are on the way.",
    confirmDel: "Delete this entry?", confirmYes: "Delete",
    navInfo: "Info", infoTitle: "Why Does High Octane Add Power?",
    info: [
      { t: "Octane is knock resistance, not energy",
        d: "High-octane fuel does not contain more energy. Ethanol actually carries about a third less energy per litre than gasoline. The octane number describes how well the fuel resists self-igniting — knocking. Raising octane on its own does not add power." },
      { t: "The gain comes from the engine's tuning",
        d: "Modern engines have knock sensors. When knock is detected the ECU pulls ignition timing back and, on turbo engines, drops boost — that is where power is lost. When the fuel resists knock better, the ECU can advance timing and raise boost. The gain comes from the engine no longer being held back, not from the fuel itself." },
      { t: "Ethanol's extra advantage: charge cooling",
        d: "As ethanol evaporates it draws a significant amount of heat out of the intake charge. Cooler air is denser, so more oxygen reaches the cylinder and knock risk drops further. This is why E30-E85 blends are so effective on turbocharged engines." },
      { t: "Not every engine gains", warn: true,
        d: "If a naturally aspirated engine on its factory map already runs optimal timing on 95 octane, moving to 98 or 100 will make no measurable difference. The gains show up mainly on turbocharged engines or on maps written for higher octane." },
      { t: "There is a cost", warn: true,
        d: "As the ethanol ratio rises, more fuel is needed for the same air-fuel ratio; consumption goes up and the injectors and pump must be able to deliver that flow. If they cannot, the mixture runs lean and the engine can be damaged." },
    ], tourNext: "Next", tourStart: "Start", tourSkip: "Skip",
    tour: [
      ["Calculate", "Works out how much additive to put in your tank. Drag an amount and see the resulting ratio, or pick a target ratio and it tells you how many litres to add. It also estimates the octane of the blend."],
      ["Garage", "Save your vehicles. Selecting one fills in tank capacity, existing additive ratio and fuel grade automatically. Enter gasoline and additive prices here too — the cost breakdown uses them."],
      ["Records", "Log acceleration runs and compare times across different blends. The Reference Runs tab holds our own measurements."],
      ["Info", "A short explanation of why high octane adds power, what ethanol actually does, and which engines should not expect a gain."],
    ],
    close: "Close", cancel: "Cancel",
  },

  es: {
    title: "ADITIVO",
    navCalc: "Calcular", navGarage: "Garaje",
    custom: "Otro", customName: "Aditivo",
    customRon: "Octanaje del aditivo (RON)", baseOctane: "Octanaje de la gasolina base",
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
    overflow: (v, c) => `El depósito rebosa: ${v} de mezcla superan los ${c} de capacidad.`,

    garage: "Garaje", garageHint: "Guarda tu coche y los valores se rellenan solos.",
    garageEmpty: "Aún no hay vehículos.",
    addCar: "Añadir vehículo", editCar: "Editar vehículo",
    carName: "Nombre del vehículo", carCapacity: "Capacidad (L)",
    carPct: "Aditivo ya en el depósito (%)", carOctane: "Gasolina que usa",
    saveCar: "Guardar", deleteCar: "Eliminar", activeCar: "Seleccionado",
    suggestions: "Añadir rápido",

    prices: "Precios", pricesHint: "Para calcular el coste de la mezcla.",
    priceFuel: "Gasolina", currency: "Moneda",
    costTitle: "Coste", costAdd: "Coste del aditivo",
    costLitre: "Precio por litro de la mezcla", costPoint: "Por punto de RON",

    records: "Registros", tabRuns: "Mis Pruebas", tabRef: "Referencia", runsEmpty: "Aún no has registrado pruebas.",
    runsHint: "Compara tiempos del mismo coche con distintas mezclas.",
    addRun: "Añadir prueba", editRun: "Editar prueba",
    runCar: "Vehículo", runType: "Medición", runSeconds: "Tiempo (s)",
    runBlend: "Mezcla", runRon: "RON",
    runSlope: "Pendiente (%)", runNote: "Condiciones",
    runNotePh: "Temperatura, altitud, marcha, firme…",
    best: "Mejor", refTitle: "Pruebas de Referencia",
    refHint: "Nuestras propias mediciones. Coche, mezcla y condiciones en cada fila.",
    runWarn: "Realiza las pruebas de aceleración solo en circuito cerrado o terreno privado cerrado al tráfico. Los tiempos varían según clima, altitud, neumáticos y conductor; no son mediciones científicas.",

    privacy: "Privacidad", support: "Soporte",
    discTitle: "Lee Esto Primero", discOk: "Entendido",
    discHide: "No mostrar de nuevo", warning: "Aviso",
    disc: [
      "Los resultados son estimaciones. Verifícalos antes de mezclar.",
      "Añadir aditivos puede anular la garantía e incumplir la normativa de emisiones y combustibles. Consulta las normas locales.",
      "El tolueno es tóxico. No inhales el vapor, evita el contacto con la piel, trabaja al aire libre. En proporciones altas daña juntas y latiguillos.",
      "Proporciones altas de etanol pueden dañar el sistema de combustible de vehículos no preparados.",
      "Realiza las pruebas de aceleración solo en circuito cerrado o terreno privado.",
      "El uso de esta app es bajo tu entera responsabilidad.",
    ],
    appsBtn: "Otras apps", appsTitle: "Otras Apps",
    soon: "Muy pronto", appsHint: "Estamos preparando más herramientas.",
    confirmDel: "¿Eliminar este registro?", confirmYes: "Eliminar",
    navInfo: "Info", infoTitle: "¿Por Qué el Alto Octanaje Da Potencia?",
    info: [
      { t: "El octanaje es resistencia a la detonación, no energía",
        d: "El combustible de alto octanaje no contiene más energía. De hecho, el etanol aporta alrededor de un tercio menos de energía por litro que la gasolina. El octanaje indica cuánto resiste el combustible a autoencenderse, es decir, a detonar. Subir el octanaje por sí solo no da potencia." },
      { t: "La ganancia viene del ajuste del motor",
        d: "Los motores modernos llevan sensor de detonación. Al detectarla, la ECU retrasa el encendido y, en motores turbo, baja la presión; ahí es donde se pierde potencia. Si el combustible resiste mejor la detonación, la ECU puede adelantar el encendido y subir la presión. La ganancia viene de que el motor deja de estar limitado, no del combustible en sí." },
      { t: "La ventaja extra del etanol: enfriar la admisión",
        d: "Al evaporarse, el etanol extrae bastante calor del aire de admisión. El aire más frío es más denso, entra más oxígeno al cilindro y el riesgo de detonación baja aún más. Por eso las mezclas E30-E85 son tan efectivas en motores turbo." },
      { t: "No todos los motores ganan", warn: true,
        d: "Si un motor atmosférico con su mapa de fábrica ya trabaja con el avance óptimo a 95 octanos, pasar a 98 o 100 no dará una diferencia medible. Las ganancias aparecen sobre todo en motores turbo o con mapas preparados para octanajes altos." },
      { t: "Tiene un coste", warn: true,
        d: "Al subir la proporción de etanol hace falta más combustible para la misma relación aire-combustible; el consumo sube y los inyectores y la bomba deben poder dar ese caudal. Si no llegan, la mezcla se empobrece y el motor puede dañarse." },
    ], tourNext: "Siguiente", tourStart: "Empezar", tourSkip: "Saltar",
    tour: [
      ["Calcular", "Calcula cuánto aditivo añadir al depósito. Arrastra una cantidad y ve la proporción resultante, o elige una proporción objetivo y te dice cuántos litros añadir. También estima el octanaje de la mezcla."],
      ["Garaje", "Guarda tus vehículos. Al seleccionar uno se rellenan la capacidad, la proporción actual y el octanaje. Introduce aquí también los precios de gasolina y aditivo; el cálculo de coste los usa."],
      ["Registros", "Registra pruebas de aceleración y compara tiempos entre mezclas. La pestaña Pruebas de Referencia contiene nuestras propias mediciones."],
      ["Info", "Explica brevemente por qué el alto octanaje da potencia, qué hace realmente el etanol y en qué motores no hay que esperar ganancia."],
    ],
    close: "Cerrar", cancel: "Cancelar",
  },
};

function detectLang() {
  try {
    const codes = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const c of codes) {
      const two = String(c || "").slice(0, 2).toLowerCase();
      if (LANGS.includes(two)) return two;
    }
  } catch { /* yok say */ }
  return "en";
}

function initialLang() {
  const saved = store.get(K.lang);
  return LANGS.includes(saved) ? saved : detectLang();
}

/* ============================================================
   TEMA
   ============================================================ */

const MONO = "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace";
const SANS = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif";

const THEME = {
  bg: "#0b0e11", card: "#151a1f", line: "#272f38",
  text: "#f2f4f6", dim: "#7b8794",
  add: "#d0202c", addText: "#ee4a55", cur: "#d0202c", accent: "#f2f4f6",
  presetBg: "#181e25", presetOn: "#d0202c", presetOnText: "#ffffff",
  danger: "#f0b429", dangerBg: "#241110",
  radius: 3, cardRadius: 6, track: 3, thumbRadius: "3px", gap: 7,
  numFont: MONO,
};

const T = THEME;

let DEC = ",";
let PCTPRE = true;

const num = (v, d = 1) => v.toFixed(d).replace(".", DEC).replace(DEC + "0", "");
const fmtL = (v) => {
  if (!isFinite(v)) return "—";
  if (v > 0 && v < 1) return `${(v * 1000).toFixed(0)} mL`;
  return `${v.toFixed(1).replace(".", DEC)} L`;
};
const fmtPct = (v) => (PCTPRE ? `%${num(v)}` : `${num(v)}%`);
const fmtNum = (v, d = 1) => v.toFixed(d).replace(".", DEC);
const fmtMoney = (v, cur) => `${v.toFixed(2).replace(".", DEC)} ${cur}`;

/* ============================================================
   ORTAK PARÇALAR
   ============================================================ */

const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

function Card({ children, accent, active, style }) {
  return (
    <div style={{
      background: T.card, borderRadius: T.cardRadius, padding: 11,
      border: `1px solid ${active ? accent : T.line}`,
      ...style,
    }}>{children}</div>
  );
}

function Cap({ children, size = 12 }) {
  return (
    <span style={{
      fontSize: Math.max(10, size - 2), color: T.dim,
      textTransform: "uppercase", letterSpacing: "0.12em",
    }}>{children}</span>
  );
}

function Segmented({ options, value, onChange, big }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} aria-pressed={on}
            style={{
              flex: 1, minWidth: 0, cursor: "pointer",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              padding: big ? "10px 8px" : "8px 6px",
              fontSize: big ? 12 : 11, fontWeight: 700, fontFamily: MONO,
              textTransform: "uppercase", letterSpacing: ".08em",
              borderRadius: T.radius,
              background: on ? T.presetOn : T.presetBg,
              color: on ? T.presetOnText : T.dim,
              border: `1px solid ${on ? T.presetOn : T.line}`,
            }}>{o.label}</button>
        );
      })}
    </div>
  );
}

function Slider({ value, min, max, step, onChange, color }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input type="range" className="ec-range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{
        height: T.track, borderRadius: 2,
        background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, ${T.line} ${pct}%, ${T.line} 100%)`,
      }} />
  );
}

function NumberField({ value, unit, onChange, min, max, dec = false }) {
  const [draft, setDraft] = useState(null);
  const shown = draft ?? String(value).replace(".", DEC);
  const commit = () => {
    const n = parseFloat((draft ?? "").replace(",", "."));
    if (!isNaN(n)) onChange(Math.min(max, Math.max(min, dec ? n : n)));
    setDraft(null);
  };
  const us = { fontSize: 17, fontWeight: 700, fontFamily: MONO, color: T.text };
  return (
    <span style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
      {unit === "%" && PCTPRE && <span style={us}>%</span>}
      <input className="ec-num" inputMode="decimal" value={shown}
        onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        style={{ width: `${Math.max(2, shown.length)}ch`, fontFamily: MONO, color: T.text }} />
      {unit !== "%" ? <span style={us}>{unit}</span> : !PCTPRE && <span style={us}>%</span>}
    </span>
  );
}

function Row({ icon: Icon, label, value, unit, color, action, ...s }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Icon size={17} color={color} strokeWidth={2.2} />
        <span style={{
          fontSize: 12, fontWeight: 600,
          textTransform: "uppercase", letterSpacing: "0.09em",
        }}>{label}</span>
        <span style={{ flex: 1, minWidth: 4 }}>{action}</span>
        <NumberField value={value} unit={unit} onChange={s.onChange} min={s.min} max={s.max} />
      </div>
      <Slider {...s} value={value} color={color} />
    </>
  );
}

function Readout({ caption, value, color, align = "left" }) {
  return (
    <div style={{ textAlign: align, flex: align === "left" ? 1 : "none" }}>
      <div style={{ marginBottom: 6 }}><Cap size={13}>{caption}</Cap></div>
      <div style={{
        color, fontSize: 29, fontWeight: 800,
        letterSpacing: -1, lineHeight: 1, fontFamily: MONO,
      }}>{value}</div>
    </div>
  );
}

function Modal({ title, hint, onClose, closeLabel, children, dismissible = true }) {
  return (
    <div onClick={dismissible ? onClose : undefined}
      style={{
        position: "fixed", inset: 0, zIndex: 60, padding: 20,
        background: "rgba(0,0,0,.8)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
        style={{
          background: T.card, border: `1px solid ${T.line}`,
          borderRadius: T.cardRadius, padding: 18,
          width: "100%", maxWidth: 360,
          maxHeight: "84vh", overflowY: "auto",
        }}>
        <div style={{ marginBottom: 4 }}><Cap>{title}</Cap></div>
        {hint
          ? <p style={{ color: T.dim, fontSize: 12, margin: "0 0 14px", lineHeight: 1.5 }}>{hint}</p>
          : <div style={{ height: 12 }} />}
        {children}
        <button onClick={onClose}
          style={{
            width: "100%", marginTop: 10, padding: "12px 0",
            background: "transparent", color: T.dim,
            border: `1px solid ${T.line}`, borderRadius: T.radius,
            fontSize: 12, fontWeight: 700, fontFamily: MONO,
            textTransform: "uppercase", letterSpacing: ".1em", cursor: "pointer",
          }}>{closeLabel}</button>
      </div>
    </div>
  );
}

function BigButton({ onClick, children, icon: Icon, filled, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        width: "100%", padding: "13px 0", borderRadius: T.radius,
        background: filled ? T.add : "transparent",
        color: filled ? "#fff" : T.dim,
        border: `1px solid ${filled ? T.add : T.line}`,
        fontSize: 12, fontWeight: 700, fontFamily: MONO,
        textTransform: "uppercase", letterSpacing: ".1em",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1,
      }}>
      {Icon && <Icon size={15} strokeWidth={2.4} />}
      {children}
    </button>
  );
}

function Splash({ title, onDone }) {
  const [out, setOut] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => setOut(true), Math.max(0, SPLASH_MS - 380));
    const b = setTimeout(onDone, SPLASH_MS);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [onDone]);

  return (
    <div aria-hidden="true" style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: T.bg,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      paddingBottom: "6vh",
      opacity: out ? 0 : 1, transition: "opacity .38s ease",
      pointerEvents: out ? "none" : "auto",
    }}>
      <style>{`
        @keyframes sp-body { from { opacity:0; transform:translateY(10px) scale(.94) } to { opacity:1; transform:none } }
        @keyframes sp-fill { from { transform:scaleY(0) } to { transform:scaleY(1) } }
        @keyframes sp-text { from { opacity:0; transform:translateY(8px); letter-spacing:.5em }
                             to   { opacity:1; transform:none; letter-spacing:.2em } }
        @keyframes sp-sub  { from { opacity:0 } to { opacity:.55 } }
        @keyframes sp-bar  { from { transform:scaleX(0) } to { transform:scaleX(1) } }
        .sp-body { animation: sp-body .55s cubic-bezier(.22,1,.36,1) both; }
        .sp-fill { transform-box: fill-box; transform-origin: bottom;
                   animation: sp-fill .75s .34s cubic-bezier(.22,1,.36,1) both; }
        .sp-text { animation: sp-text .6s .62s cubic-bezier(.22,1,.36,1) both; }
        .sp-sub  { animation: sp-sub .5s 1.05s ease both; }
        .sp-bar  { transform-origin: left; animation: sp-bar ${SPLASH_MS}ms linear both; }
        @media (prefers-reduced-motion: reduce) {
          .sp-body,.sp-fill,.sp-text,.sp-sub { animation-duration: .01ms !important; animation-delay: 0ms !important; }
        }
      `}</style>

      <svg width="112" height="112" viewBox="0 0 1024 1024"
        xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
        <defs>
          <clipPath id="sp-clip">
            <rect className="sp-fill" x="360" y="420" width="304" height="375" />
          </clipPath>
        </defs>
        <g className="sp-body">
          <path d="M290 178 h444 a48 48 0 0 1 48 48 v572 a48 48 0 0 1 -48 48 h-444
                   a48 48 0 0 1 -48 -48 v-572 a48 48 0 0 1 48 -48 Z" fill={T.text} />
          <rect x="242" y="268" width="540" height="34" fill={T.bg} />
          <rect x="242" y="330" width="540" height="34" fill={T.bg} />
        </g>
        <path clipPath="url(#sp-clip)"
          d="M512 432 C 470 512 388 578 388 660 C 388 728 443 783 512 783
             C 581 783 636 728 636 660 C 636 578 554 512 512 432 Z" fill={T.add} />
      </svg>

      <div className="sp-text" style={{
        marginTop: 26, fontFamily: MONO, fontSize: 15, fontWeight: 800,
        letterSpacing: ".2em", color: T.text, whiteSpace: "nowrap",
      }}>{title}</div>

      <div className="sp-sub" style={{
        marginTop: 9, fontFamily: MONO, fontSize: 10, color: T.dim,
        letterSpacing: ".16em", textTransform: "uppercase",
      }}>{AUTHOR}</div>

      <div style={{
        marginTop: 34, width: 132, height: 2,
        background: T.line, borderRadius: 2, overflow: "hidden",
      }}>
        <div className="sp-bar" style={{ height: "100%", background: T.add }} />
      </div>
    </div>
  );
}

function Tour({ onDone }) {
  const { L, setScreen } = useApp();
  const [i, setI] = useState(0);
  const icons = [Calculator, Car, History, Info];
  const keys = ["calc", "garage", "hist", "info"];
  const [title, desc] = L.tour[i];
  const Icon = icons[i];
  const last = i === L.tour.length - 1;

  const go = () => {
    if (last) { setScreen("calc"); onDone(); return; }
    const next = i + 1;
    setScreen(keys[next]);
    setI(next);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 70, padding: 20,
      background: "rgba(0,0,0,.82)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div role="dialog" aria-modal="true" style={{
        background: T.card, border: `1px solid ${T.line}`,
        borderRadius: T.cardRadius, padding: 20,
        width: "100%", maxWidth: 360,
      }}>
        <div style={{
          width: 46, height: 46, borderRadius: T.radius,
          background: T.add, display: "flex",
          alignItems: "center", justifyContent: "center", marginBottom: 16,
        }}>
          <Icon size={24} color="#fff" strokeWidth={2.2} />
        </div>

        <div style={{
          fontSize: 19, fontWeight: 800, color: T.text,
          letterSpacing: -0.3, marginBottom: 8,
        }}>{title}</div>
        <p style={{
          fontSize: 13.5, lineHeight: 1.6, color: T.dim, margin: 0,
        }}>{desc}</p>

        <div style={{
          display: "flex", alignItems: "center", gap: 7, margin: "20px 0 16px",
        }}>
          {L.tour.map((_, k) => (
            <span key={k} style={{
              width: k === i ? 18 : 6, height: 6, borderRadius: 3,
              background: k === i ? T.add : T.line,
              transition: "width .2s ease",
            }} />
          ))}
        </div>

        <BigButton onClick={go} filled>{last ? L.tourStart : L.tourNext}</BigButton>
        {!last && (
          <div style={{ marginTop: 8 }}>
            <BigButton onClick={() => { setScreen("calc"); onDone(); }}>{L.tourSkip}</BigButton>
          </div>
        )}
      </div>
    </div>
  );
}

function AdSlot() {
  const [ok, setOk] = useState(true);
  if (!ok || !SHOW_AD) return null;
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: T.gap }}>
      <img src={`${baseUrl()}banner.png`} alt="" width={320} height={50}
        onError={() => setOk(false)}
        style={{
          width: 320, height: 50, maxWidth: "100%", objectFit: "cover",
          display: "block", borderRadius: T.radius, border: `1px solid ${T.line}`,
        }} />
    </div>
  );
}

/* ============================================================
   EKRAN: HESAP
   ============================================================ */

function CalcScreen() {
  const {
    L, lang, mode, setMode, additiveId, setAdditiveId, customRon, setCustomRon,
    octane, setOctane, tank, setTank, currentPct, setCurrentPct,
    targetPct, setTargetPct, addVolume, setAddVolume,
    A, r, addMax, activeCar, prices, setScreen,
  } = useApp();

  const isAdd = r.mode === "additive" || r.mode === "amount";
  const cost = blendCost({
    tank, addAmount: r.addAmount, deltaRon: r.deltaRon,
    priceFuel: prices.fuel, priceAdd: prices.add,
  });
  const overflow = activeCar && r.totalVolume > activeCar.capacity
    ? r.totalVolume - activeCar.capacity : 0;

  const segs = [
    { v: r.parts.tank, c: "#39424c", label: L.fuel },
    { v: r.parts.added, c: isAdd ? T.add : T.cur, label: isAdd ? A.name : L.gasoline },
  ].filter((s) => s.v > 1e-6);


  return (
    <>
      <Card style={{ marginBottom: T.gap }}>
        <Segmented big value={additiveId} onChange={setAdditiveId}
          options={Object.values(ADDITIVES).map((a) => ({
            value: a.id, label: a.label ? a.label[lang] : L.custom,
          }))} />

        {additiveId === "custom" && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", marginBottom: 7, alignItems: "baseline" }}>
              <span style={{ flex: 1 }}><Cap>{L.customRon}</Cap></span>
              <NumberField value={customRon} unit="" onChange={setCustomRon} min={60} max={160} />
            </div>
            <Slider value={customRon} min={60} max={160} step={1}
              onChange={setCustomRon} color={T.add} />
          </div>
        )}

        <div style={{ margin: "12px 0 6px" }}><Cap>{L.baseOctane}</Cap></div>
        <Segmented value={octane} onChange={setOctane}
          options={OCTANES.map((o) => ({ value: o, label: String(o) }))} />
      </Card>

      {activeCar && (
        <button onClick={() => setScreen("garage")}
          style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            background: T.card, border: `1px solid ${T.line}`, borderRadius: T.cardRadius,
            padding: "9px 11px", marginBottom: T.gap, cursor: "pointer", textAlign: "left",
          }}>
          <Car size={15} color={T.add} strokeWidth={2.2} />
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: T.text }}>
            {activeCar.name}
          </span>
          <Cap size={12}>{activeCar.capacity} L</Cap>
        </button>
      )}

      <div role="tablist" style={{
        display: "flex", gap: 1, background: T.card, borderRadius: T.cardRadius,
        padding: 3, marginBottom: T.gap, border: `1px solid ${T.line}`,
      }}>
        {[["amount", L.tabAmount], ["target", L.tabTarget]].map(([k, label]) => {
          const on = mode === k;
          return (
            <button key={k} role="tab" aria-selected={on} onClick={() => setMode(k)}
              style={{
                flex: 1, border: "none", borderRadius: T.radius, padding: "8px 0",
                fontSize: 11, fontWeight: 700, cursor: "pointer",
                textTransform: "uppercase", letterSpacing: ".1em", fontFamily: MONO,
                background: on ? T.accent : "transparent",
                color: on ? T.bg : T.dim,
              }}>{label}</button>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: T.gap }}>
        <Card>
          <Row icon={Fuel} label={L.tankLabel} value={tank} unit="L" color={T.cur}
            min={0} max={activeCar ? activeCar.capacity : 120} step={0.5} onChange={setTank} />
        </Card>

        <Card>
          <Row icon={Droplet} label={L.current(A.name)} value={currentPct} unit="%" color={T.cur}
            min={0} max={100} step={1} onChange={setCurrentPct} />
        </Card>

        {mode === "amount" ? (
          <Card accent={T.add} active={addVolume > 0}>
            <Row icon={Beaker} label={L.toAdd(A.name)} value={addVolume} unit="L" color={T.add}
              min={0} max={addMax} step={0.1} onChange={setAddVolume} />
            <div style={{ marginTop: 8 }}>
              <Segmented value={addVolume} onChange={setAddVolume}
                options={[0.5, 1, 2.5, 5, 10].map((v) => ({
                  value: v, label: `${String(v).replace(".", DEC)} L`,
                }))} />
            </div>
          </Card>
        ) : (
          <Card accent={T.add} active={targetPct !== currentPct}>
            <Row icon={Target} label={L.target(A.name)} value={targetPct} unit="%" color={T.add}
              min={0} max={100} step={1} onChange={setTargetPct} />
            <div style={{ marginTop: 8 }}>
              <Segmented value={targetPct} onChange={setTargetPct}
                options={A.presets.map((p) => ({ value: p, label: PCTPRE ? `%${p}` : `${p}%` }))} />
            </div>
          </Card>
        )}

        <Card style={{ padding: 12 }} accent={T.add} active={!r.blocked && r.mode !== "empty"}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
            {r.blocked ? <AlertTriangle size={17} color={T.danger} />
              : <Check size={17} color={T.add} strokeWidth={3} />}
            <span style={{
              fontSize: 12, fontWeight: 700, flex: 1,
              textTransform: "uppercase", letterSpacing: "0.12em",
            }}>{L.result}</span>
          </div>

          {r.mode === "empty" && <p style={{ color: T.dim, margin: 0 }}>{L.empty}</p>}
          {r.blocked === "gasoline" && (
            <p style={{ color: T.danger, margin: 0, lineHeight: 1.5 }}>{L.dilute}</p>
          )}
          {r.mode === "ok" && <p style={{ color: T.add, margin: 0 }}>{L.atTarget}</p>}

          {!r.blocked && ["additive", "gasoline", "amount"].includes(r.mode) && (
            <>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                {r.mode === "amount"
                  ? <Readout caption={L.resulting(A.name)} value={fmtPct(r.finalPct)} color={T.add} />
                  : <Readout caption={L.toAdd(isAdd ? A.name : L.gasoline)}
                      value={fmtL(r.addAmount)} color={isAdd ? T.add : T.cur} />}
                <Readout caption={L.totalVolume} value={fmtL(r.totalVolume)}
                  color={T.accent} align="right" />
              </div>

              <div style={{
                display: "flex", gap: 2, height: 7, borderRadius: 1,
                overflow: "hidden", marginTop: 11,
              }}>
                {segs.map((s, i) => <span key={i} style={{ flexGrow: s.v, background: s.c }} />)}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
                {segs.map((s, i) => (
                  <span key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 8, height: 8, background: s.c }} />
                    <Cap size={12}>{s.label} {fmtL(s.v)}</Cap>
                  </span>
                ))}
              </div>

              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                marginTop: 11, padding: "9px 11px",
                borderRadius: T.radius, border: `1px solid ${T.line}`,
              }}>
                <Gauge size={17} color={T.accent} strokeWidth={2.2} />
                <div style={{ flex: 1 }}>
                  <Cap size={12}>{L.octane}</Cap>
                  <div style={{ fontFamily: MONO, fontSize: 13, color: T.dim, marginTop: 3 }}>
                    {fmtNum(r.baseRon)} &rarr;{" "}
                    <strong style={{ color: T.text }}>{fmtNum(r.finalRon)}</strong>
                  </div>
                </div>
                <div style={{
                  fontFamily: MONO, fontSize: 24, fontWeight: 800,
                  color: T.accent, letterSpacing: -0.8,
                }}>
                  {r.deltaRon >= 0 ? "+" : ""}{fmtNum(r.deltaRon)}
                </div>
              </div>

              {cost && (prices.add > 0 || prices.fuel > 0) && (
                <div style={{
                  marginTop: 8, padding: "9px 11px",
                  borderRadius: T.radius, border: `1px solid ${T.line}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                    <Wallet size={15} color={T.dim} strokeWidth={2.2} />
                    <Cap size={12}>{L.costTitle}</Cap>
                  </div>
                  {prices.add > 0 && (
                    <CostRow label={L.costAdd} value={fmtMoney(cost.addCost, prices.cur)} />
                  )}
                  <CostRow label={L.costLitre} value={fmtMoney(cost.perLitre, prices.cur)} />
                  {prices.add > 0 && cost.perPoint != null && (
                    <CostRow label={L.costPoint} value={fmtMoney(cost.perPoint, prices.cur)} strong />
                  )}
                </div>
              )}

              <div style={{
                marginTop: 9, display: "flex", gap: 6, alignItems: "baseline",
              }}>
                <Cap size={12}>
                  {fmtPct(r.basePct)} &rarr; {fmtPct(r.finalPct)} ({r.deltaPct >= 0 ? "+" : ""}
                  {fmtNum(r.deltaPct)} {L.points}) · {L.note}
                </Cap>
              </div>

              {overflow > 0 && (
                <Notice tone="danger">
                  {L.overflow(fmtL(r.totalVolume), fmtL(activeCar.capacity))}
                </Notice>
              )}
              {additiveId === "toluene" && r.finalPct > 30 && (
                <Notice tone="danger">{L.tolWarn}</Notice>
              )}

            </>
          )}
        </Card>
      </div>
    </>
  );
}

function CostRow({ label, value, strong }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", marginTop: 4 }}>
      <span style={{ flex: 1, fontSize: 12, color: T.dim }}>{label}</span>
      <span style={{
        fontFamily: MONO, fontSize: strong ? 15 : 13,
        fontWeight: strong ? 800 : 600,
        color: strong ? T.addText : T.text,
      }}>{value}</span>
    </div>
  );
}

function Notice({ children }) {
  return (
    <div style={{
      display: "flex", gap: 8, marginTop: 10, padding: 11,
      borderRadius: T.radius, background: T.dangerBg, color: T.danger,
      fontSize: 12.5, lineHeight: 1.5, border: `1px solid ${T.danger}55`,
    }}>
      <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{children}</span>
    </div>
  );
}

/* ============================================================
   EKRAN: GARAJ
   ============================================================ */

function GarageScreen() {
  const {
    L, cars, setCars, activeId, setActiveId, prices, setPrices, setScreen, setConfirm,
  } = useApp();
  const [editing, setEditing] = useState(null);

  const blank = () => ({ id: uid(), name: "", capacity: 50, currentPct: 10, octane: 95 });

  const commit = (car) => {
    const name = car.name.trim() || "—";
    const next = cars.some((c) => c.id === car.id)
      ? cars.map((c) => (c.id === car.id ? { ...car, name } : c))
      : [...cars, { ...car, name }];
    setCars(next);
    setActiveId(car.id);
    setEditing(null);
  };

  const remove = (id) => {
    setCars(cars.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
    setEditing(null);
  };

  return (
    <>
      <div style={{ marginBottom: 4 }}><Cap size={14}>{L.garage}</Cap></div>
      <p style={{ color: T.dim, fontSize: 12.5, margin: "0 0 12px", lineHeight: 1.5 }}>
        {L.garageHint}
      </p>

      {cars.length === 0 && (
        <p style={{ color: T.dim, fontSize: 13, margin: "0 0 12px" }}>{L.garageEmpty}</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: T.gap, marginBottom: T.gap }}>
        {cars.map((c) => {
          const on = c.id === activeId;
          return (
            <div key={c.id}
              style={{
                background: T.card, borderRadius: T.cardRadius,
                border: `1px solid ${on ? T.add : T.line}`, overflow: "hidden",
              }}>
              <button onClick={() => { setActiveId(c.id); setScreen("calc"); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  background: "transparent", border: "none", padding: "12px 12px 10px",
                  cursor: "pointer", textAlign: "left",
                }}>
                <Car size={18} color={on ? T.add : T.dim} strokeWidth={2.2} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    display: "block", fontSize: 15, fontWeight: 700, color: T.text,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{c.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: T.dim }}>
                    {c.capacity} L · {fmtPct(c.currentPct)} · RON {c.octane}
                  </span>
                </span>
                {on && (
                  <span style={{
                    fontFamily: MONO, fontSize: 10, fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: ".1em",
                    color: "#fff", background: T.add,
                    borderRadius: T.radius, padding: "3px 6px",
                  }}>{L.activeCar}</span>
                )}
              </button>
              <div style={{ display: "flex", borderTop: `1px solid ${T.line}` }}>
                <button onClick={() => setEditing(c)}
                  style={miniBtn(false)}>{L.editCar}</button>
                <button onClick={() => setConfirm({ action: () => remove(c.id) })}
                  style={{ ...miniBtn(true), borderLeft: `1px solid ${T.line}` }}>
                  <Trash2 size={12} strokeWidth={2.4} /> {L.deleteCar}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <BigButton onClick={() => setEditing(blank())} icon={Plus} filled>{L.addCar}</BigButton>

      {cars.length === 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ marginBottom: 8 }}><Cap>{L.suggestions}</Cap></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {SAMPLE_CARS.map((s) => (
              <button key={s.name}
                onClick={() => commit({ ...blank(), name: s.name, capacity: s.capacity })}
                style={{
                  display: "flex", alignItems: "center", width: "100%",
                  background: T.presetBg, border: `1px solid ${T.line}`,
                  borderRadius: T.radius, padding: "11px 12px",
                  color: T.text, cursor: "pointer", textAlign: "left",
                }}>
                <span style={{ flex: 1, fontSize: 13.5 }}>{s.name}</span>
                <strong style={{ fontFamily: MONO, fontSize: 15, color: T.addText }}>
                  {s.capacity} L
                </strong>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fiyatlar */}
      <div style={{ marginTop: 26 }}>
        <div style={{ marginBottom: 4 }}><Cap size={14}>{L.prices}</Cap></div>
        <p style={{ color: T.dim, fontSize: 12.5, margin: "0 0 10px", lineHeight: 1.5 }}>
          {L.pricesHint}
        </p>
        <Card>
          <PriceRow label={L.priceFuel} value={prices.fuel} cur={prices.cur}
            onChange={(v) => setPrices({ ...prices, fuel: v })} />
          <div style={{ height: 1, background: T.line, margin: "10px 0" }} />
          <PriceRow label={L.additiveLabel} value={prices.add} cur={prices.cur}
            onChange={(v) => setPrices({ ...prices, add: v })} />
          <div style={{ height: 1, background: T.line, margin: "10px 0" }} />
          <div style={{ marginBottom: 7 }}><Cap>{L.currency}</Cap></div>
          <Segmented value={prices.cur} onChange={(v) => setPrices({ ...prices, cur: v })}
            options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
        </Card>
      </div>

      {editing && (
        <CarEditor car={editing} onCancel={() => setEditing(null)} onSave={commit} />
      )}
    </>
  );
}

const miniBtn = (danger) => ({
  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
  background: "transparent", border: "none", padding: "12px 0",
  color: danger ? T.danger : T.dim, cursor: "pointer",
  fontSize: 10.5, fontWeight: 700, fontFamily: MONO,
  textTransform: "uppercase", letterSpacing: ".1em",
});

function PriceRow({ label, value, cur, onChange }) {
  const [draft, setDraft] = useState(null);
  const shown = draft ?? String(value).replace(".", DEC);
  const commit = () => {
    const n = parseFloat((draft ?? "").replace(",", "."));
    if (!isNaN(n) && n >= 0) onChange(Math.min(9999, n));
    setDraft(null);
  };
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
      <span style={{ flex: 1, fontSize: 13, color: T.text }}>{label}</span>
      <input className="ec-num" inputMode="decimal" value={shown}
        onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        style={{ width: "6ch", fontFamily: MONO, color: T.text }} />
      <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: T.dim }}>
        {cur}/L
      </span>
    </div>
  );
}

function CarEditor({ car, onCancel, onSave }) {
  const { L } = useApp();
  const [draft, setDraft] = useState(car);
  const set = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <Modal title={car.name ? L.editCar : L.addCar} closeLabel={L.cancel} onClose={onCancel}>
      <div style={{ marginBottom: 6 }}><Cap>{L.carName}</Cap></div>
      <input value={draft.name} onChange={(e) => set("name")(e.target.value)}
        placeholder="—"
        style={{
          width: "100%", background: T.presetBg, color: T.text,
          border: `1px solid ${T.line}`, borderRadius: T.radius,
          padding: "11px 12px", fontSize: 15, outline: "none",
          fontFamily: SANS, marginBottom: 14,
        }} />

      <div style={{ display: "flex", marginBottom: 7, alignItems: "baseline" }}>
        <span style={{ flex: 1 }}><Cap>{L.carCapacity}</Cap></span>
        <NumberField value={draft.capacity} unit="L" onChange={set("capacity")} min={5} max={200} />
      </div>
      <Slider value={draft.capacity} min={5} max={200} step={1}
        onChange={set("capacity")} color={T.add} />

      <div style={{ display: "flex", margin: "16px 0 7px", alignItems: "baseline" }}>
        <span style={{ flex: 1 }}><Cap>{L.carPct}</Cap></span>
        <NumberField value={draft.currentPct} unit="%" onChange={set("currentPct")} min={0} max={100} />
      </div>
      <Slider value={draft.currentPct} min={0} max={100} step={1}
        onChange={set("currentPct")} color={T.add} />

      <div style={{ margin: "16px 0 7px" }}><Cap>{L.carOctane}</Cap></div>
      <Segmented value={draft.octane} onChange={set("octane")}
        options={OCTANES.map((o) => ({ value: o, label: String(o) }))} />

      <div style={{ marginTop: 16 }}>
        <BigButton onClick={() => onSave(draft)} icon={Check} filled>{L.saveCar}</BigButton>
      </div>
    </Modal>
  );
}

/* ============================================================
   EKRAN: GEÇMİŞ
   ============================================================ */

function RecordsScreen() {
  const { L } = useApp();
  const [tab, setTab] = useState("runs");
  const hasRef = REFERENCE_RUNS.length > 0;

  return (
    <>
      {hasRef && (
        <div style={{ marginBottom: 10 }}>
          <Segmented big value={tab} onChange={setTab}
            options={[
              { value: "runs", label: L.tabRuns },
              { value: "ref", label: L.tabRef },
            ]} />
        </div>
      )}
      {(!hasRef || tab === "runs") && <RunList />}
      {hasRef && tab === "ref" && <RefList />}
    </>
  );
}

function RunRow({ run, best, right }) {
  const delta = best != null && run.seconds > best ? run.seconds - best : 0;
  return (
    <div style={{ padding: "11px 12px 9px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 5 }}>
        <span style={{
          flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, color: T.text,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{run.car || "—"}</span>
        <span style={{
          fontFamily: MONO, fontSize: 20, fontWeight: 800,
          color: delta === 0 ? T.add : T.text, letterSpacing: -0.5,
        }}>{fmtNum(run.seconds, 2)}</span>
        <span style={{ fontFamily: MONO, fontSize: 11, color: T.dim }}>s</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ flex: 1, fontFamily: MONO, fontSize: 11.5, color: T.dim }}>
          {run.blend || "—"}
          {run.ron ? ` · RON ${fmtNum(run.ron)}` : ""}
          {run.slope != null && run.slope !== 0
            ? ` · ${run.slope > 0 ? "+" : ""}${fmtNum(run.slope, 2)}%` : ""}
        </span>
        {delta > 0
          ? <Cap size={11}>+{fmtNum(delta, 2)} s</Cap>
          : <Cap size={11}>{right}</Cap>}
      </div>
      {(run.note || run.source) && (
        <div style={{
          marginTop: 5, fontSize: 11.5, color: T.dim, lineHeight: 1.45,
          display: "flex", gap: 8,
        }}>
          <span style={{ flex: 1 }}>{run.note}</span>
          {run.source && <Cap size={11}>{run.source}</Cap>}
        </div>
      )}
    </div>
  );
}

function RunList() {
  const { L, runs, setRuns, cars, setConfirm } = useApp();
  const [type, setType] = useState("100-200");
  const [editing, setEditing] = useState(null);

  const list = runs
    .filter((r) => r.type === type)
    .sort((a, b) => a.seconds - b.seconds);
  const best = list.length ? list[0].seconds : null;

  const blank = () => ({
    id: uid(), ts: Date.now(), type,
    car: cars[0]?.name || "", seconds: 8, blend: "", ron: 0, slope: 0, note: "",
  });

  const commit = (run) => {
    const next = runs.some((r) => r.id === run.id)
      ? runs.map((r) => (r.id === run.id ? run : r))
      : [...runs, run];
    setRuns(next);
    setEditing(null);
  };

  return (
    <>
      <p style={{ color: T.dim, fontSize: 12.5, margin: "0 0 10px", lineHeight: 1.5 }}>
        {L.runsHint}
      </p>

      <div style={{ marginBottom: 10 }}>
        <Segmented value={type} onChange={setType}
          options={RUN_TYPES.map((v) => ({ value: v, label: v }))} />
      </div>

      {list.length === 0 && (
        <p style={{ color: T.dim, fontSize: 13, margin: "0 0 12px" }}>{L.runsEmpty}</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: T.gap, marginBottom: T.gap }}>
        {list.map((run, i) => (
          <div key={run.id} style={{
            background: T.card, borderRadius: T.cardRadius,
            border: `1px solid ${i === 0 ? T.add : T.line}`, overflow: "hidden",
          }}>
            <RunRow run={run} best={best} right={i === 0 ? L.best : ""} />
            <div style={{ display: "flex", borderTop: `1px solid ${T.line}` }}>
              <button onClick={() => setEditing(run)} style={miniBtn(false)}>{L.editCar}</button>
              <button onClick={() => setConfirm({ action: () => setRuns(runs.filter((x) => x.id !== run.id)) })}
                style={{ ...miniBtn(true), borderLeft: `1px solid ${T.line}` }}>
                <Trash2 size={12} strokeWidth={2.4} /> {L.deleteCar}
              </button>
            </div>
          </div>
        ))}
      </div>

      <BigButton onClick={() => setEditing(blank())} icon={Plus} filled>{L.addRun}</BigButton>

      <Notice>{L.runWarn}</Notice>

      {editing && (
        <RunEditor run={editing} onCancel={() => setEditing(null)} onSave={commit} />
      )}
    </>
  );
}

function RefList() {
  const { L } = useApp();
  const [type, setType] = useState("100-200");
  const list = REFERENCE_RUNS
    .filter((r) => r.type === type)
    .sort((a, b) => a.seconds - b.seconds);
  const best = list.length ? list[0].seconds : null;

  return (
    <>
      <div style={{ marginBottom: 4 }}><Cap size={14}>{L.refTitle}</Cap></div>
      <p style={{ color: T.dim, fontSize: 12.5, margin: "0 0 10px", lineHeight: 1.5 }}>
        {L.refHint}
      </p>
      <div style={{ marginBottom: 10 }}>
        <Segmented value={type} onChange={setType}
          options={RUN_TYPES.map((v) => ({ value: v, label: v }))} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: T.gap }}>
        {list.map((run, i) => (
          <div key={run.id} style={{
            background: T.card, borderRadius: T.cardRadius,
            border: `1px solid ${i === 0 ? T.add : T.line}`,
          }}>
            <RunRow run={run} best={best} right={i === 0 ? L.best : ""} />
          </div>
        ))}
      </div>
      <Notice>{L.runWarn}</Notice>
    </>
  );
}

function RunEditor({ run, onCancel, onSave }) {
  const { L, cars } = useApp();
  const [d, setD] = useState(run);
  const set = (k) => (v) => setD((x) => ({ ...x, [k]: v }));

  const field = {
    width: "100%", background: T.presetBg, color: T.text,
    border: `1px solid ${T.line}`, borderRadius: T.radius,
    padding: "10px 11px", fontSize: 14.5, outline: "none",
    fontFamily: SANS, marginBottom: 13,
  };

  return (
    <Modal title={run.blend || run.note ? L.editRun : L.addRun} closeLabel={L.cancel} onClose={onCancel}>
      <div style={{ marginBottom: 6 }}><Cap>{L.runType}</Cap></div>
      <div style={{ marginBottom: 13 }}>
        <Segmented value={d.type} onChange={set("type")}
          options={RUN_TYPES.map((v) => ({ value: v, label: v }))} />
      </div>

      <div style={{ marginBottom: 6 }}><Cap>{L.runCar}</Cap></div>
      {cars.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <Segmented value={d.car} onChange={set("car")}
            options={cars.slice(0, 3).map((c) => ({ value: c.name, label: c.name }))} />
        </div>
      )}
      <input value={d.car} onChange={(e) => set("car")(e.target.value)}
        placeholder="—" style={field} />

      <div style={{ display: "flex", marginBottom: 7, alignItems: "baseline" }}>
        <span style={{ flex: 1 }}><Cap>{L.runSeconds}</Cap></span>
        <NumberField value={d.seconds} unit="s" onChange={set("seconds")} min={0.5} max={120} />
      </div>
      <Slider value={d.seconds} min={1} max={30} step={0.01}
        onChange={set("seconds")} color={T.add} />

      <div style={{ margin: "16px 0 6px" }}><Cap>{L.runBlend}</Cap></div>
      <input value={d.blend} onChange={(e) => set("blend")(e.target.value)}
        placeholder="E30" style={field} />

      <div style={{ display: "flex", marginBottom: 7, alignItems: "baseline" }}>
        <span style={{ flex: 1 }}><Cap>{L.runRon}</Cap></span>
        <NumberField value={Math.round(d.ron * 10) / 10} unit="" onChange={set("ron")} min={0} max={160} />
      </div>
      <Slider value={Math.min(160, d.ron)} min={0} max={160} step={0.5}
        onChange={set("ron")} color={T.add} />

      <div style={{ display: "flex", margin: "16px 0 7px", alignItems: "baseline" }}>
        <span style={{ flex: 1 }}><Cap>{L.runSlope}</Cap></span>
        <NumberField value={d.slope ?? 0} unit="%" onChange={set("slope")} min={-5} max={5} />
      </div>
      <Slider value={d.slope ?? 0} min={-5} max={5} step={0.01}
        onChange={set("slope")} color={T.add} />

      <div style={{ margin: "16px 0 6px" }}><Cap>{L.runNote}</Cap></div>
      <input value={d.note} onChange={(e) => set("note")(e.target.value)}
        placeholder={L.runNotePh} style={field} />

      <Notice>{L.runWarn}</Notice>

      <div style={{ marginTop: 14 }}>
        <BigButton onClick={() => onSave(d)} icon={Check} filled>{L.saveCar}</BigButton>
      </div>
    </Modal>
  );
}

/* ============================================================
   EKRAN: BİLGİ
   ============================================================ */

function InfoScreen() {
  const { L } = useApp();
  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 4 }}><Cap size={14}>{L.navInfo}</Cap></div>
        <div style={{
          fontSize: 17, fontWeight: 800, color: T.text, letterSpacing: -0.3,
        }}>{L.infoTitle}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: T.gap }}>
        {L.info.map((item, i) => (
          <div key={i} style={{
            background: item.warn ? T.dangerBg : T.card,
            border: `1px solid ${item.warn ? T.danger + "55" : T.line}`,
            borderRadius: T.cardRadius, padding: 13,
          }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 7 }}>
              <span style={{
                width: 20, height: 20, flexShrink: 0, borderRadius: T.radius,
                background: item.warn ? T.danger : T.add,
                color: item.warn ? T.dangerBg : "#fff",
                fontFamily: MONO, fontSize: 11, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{item.warn ? "!" : i + 1}</span>
              <span style={{
                fontSize: 14.5, fontWeight: 700, lineHeight: 1.35,
                color: item.warn ? T.danger : T.text,
              }}>{item.t}</span>
            </div>
            <p style={{
              margin: 0, paddingLeft: 30, fontSize: 13,
              lineHeight: 1.6, color: T.dim,
            }}>{item.d}</p>
          </div>
        ))}
      </div>

      <p style={{
        marginTop: 14, fontSize: 11.5, lineHeight: 1.55,
        color: T.dim, textAlign: "center",
      }}>{L.note}</p>
    </>
  );
}

/* ============================================================
   UYGULAMA
   ============================================================ */

export default function FuelAdditiveApp() {
  const [lang, setLangState] = useState(initialLang);
  const setLang = (l) => { setLangState(l); store.set(K.lang, l); };
  const L = STR[lang];
  DEC = lang === "en" ? "." : ",";
  PCTPRE = lang !== "en";

  const [screen, setScreen] = useState("calc");
  const [mode, setMode] = useState("amount");
  const [additiveId, setAdditiveId] = useState("ethanol");
  const [customRon, setCustomRon] = useState(110);
  const [octane, setOctane] = useState(95);
  const [tank, setTank] = useState(0);
  const [currentPct, setCurrentPct] = useState(0);
  const [targetPct, setTargetPct] = useState(20);
  const [addVolume, setAddVolume] = useState(5);

  const [cars, setCarsState] = useState(() => store.json(K.cars, []));
  const [activeId, setActiveIdState] = useState(() => store.get(K.active));
  const [runs, setRunsState] = useState(() => store.json(K.runs, []));
  const [prices, setPricesState] = useState(
    () => store.json(K.prices, { fuel: 0, add: 0, cur: "₺" })
  );

  const setCars = (v) => { setCarsState(v); store.setJson(K.cars, v); };
  const setRuns = (v) => { setRunsState(v); store.setJson(K.runs, v); };
  const setPrices = (v) => { setPricesState(v); store.setJson(K.prices, v); };

  const activeCar = cars.find((c) => c.id === activeId) || null;

  const setActiveId = (id) => {
    setActiveIdState(id);
    if (id) store.set(K.active, id); else store.set(K.active, "");
    const car = cars.find((c) => c.id === id);
    if (car) {
      setCurrentPct(car.currentPct);
      setOctane(car.octane);
      setTank((v) => Math.min(v, car.capacity));
    }
  };

  const [showDisc, setShowDisc] = useState(
    () => store.get(K.disc) !== String(DISC_VERSION)
  );
  const [discHide, setDiscHide] = useState(false);
  const [showApps, setShowApps] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [splash, setSplash] = useState(true);
  const [showTour, setShowTour] = useState(
    () => store.get(K.tour) !== String(TOUR_VERSION)
  );

  const closeTour = () => {
    store.set(K.tour, String(TOUR_VERSION));
    setShowTour(false);
  };

  const closeDisc = () => {
    if (discHide) store.set(K.disc, String(DISC_VERSION));
    setShowDisc(false);
  };

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

  const addMax = Math.min(200, Math.max(10, Math.ceil(tank * 2)));

  const ctx = {
    L, lang, setLang, screen, setScreen,
    mode, setMode, additiveId, setAdditiveId, customRon, setCustomRon,
    octane, setOctane, tank, setTank, currentPct, setCurrentPct,
    targetPct, setTargetPct, addVolume, setAddVolume,
    A, r, addMax,
    cars, setCars, activeId, setActiveId, activeCar,
    runs, setRuns, prices, setPrices,
    confirm, setConfirm,
  };
  ctx.L = { ...L, additiveLabel: A.name };

  const NAV = [
    ["calc", L.navCalc, Calculator],
    ["garage", L.navGarage, Car],
    ["hist", L.records, History],
    ["info", L.navInfo, Info],
  ];

  return (
    <AppCtx.Provider value={ctx}>
      <div style={{
        background: T.bg, color: T.text, minHeight: "100vh",
        padding: "calc(16px + env(safe-area-inset-top, 0px)) 12px calc(88px + env(safe-area-inset-bottom, 0px))",
        fontFamily: SANS, fontVariantNumeric: "tabular-nums",
        WebkitTapHighlightColor: "transparent", maxWidth: 520, margin: "0 auto",
      }}>
        <style>{`
          .ec-range{-webkit-appearance:none;appearance:none;width:100%;outline:none;touch-action:none;display:block;}
          .ec-range::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:${T.thumbRadius};background:${T.text};box-shadow:0 1px 5px rgba(0,0,0,.7);cursor:pointer;}
          .ec-range::-moz-range-thumb{width:18px;height:18px;border:none;border-radius:${T.thumbRadius};background:${T.text};cursor:pointer;}
          .ec-range:focus-visible{box-shadow:0 0 0 3px ${T.accent}66;}
          .ec-num{background:transparent;border:none;font-size:17px;font-weight:700;text-align:right;padding:0;outline:none;font-variant-numeric:tabular-nums;min-width:2ch;}
          .ec-num:focus-visible{border-bottom:2px solid ${T.add};}
          input::placeholder{color:${T.dim};}
        `}</style>

        <div style={{ position: "fixed", inset: 0, background: T.bg, zIndex: -1 }} />

        <AdSlot />

        <header style={{
          display: "flex", alignItems: "center", gap: 8,
          marginBottom: 12, flexWrap: "wrap", rowGap: 6,
        }}>
          <Flame size={19} color={T.add} strokeWidth={2.2} />
          <h1 style={{
            fontSize: 15, fontWeight: 800, margin: 0, whiteSpace: "nowrap",
            letterSpacing: "0.1em", fontFamily: MONO,
          }}>{L.title}</h1>

          {SHOW_APPS_BTN && (
            <button onClick={() => setShowApps(true)}
              style={{
                marginLeft: "auto", cursor: "pointer", background: "transparent",
                color: T.dim, border: `1px solid ${T.line}`, borderRadius: T.radius,
                padding: "8px 10px", fontSize: 10, fontWeight: 700, fontFamily: MONO,
                textTransform: "uppercase", letterSpacing: ".06em", whiteSpace: "nowrap",
                display: "flex", alignItems: "center", gap: 4,
              }}>
              <Grid2x2 size={11} strokeWidth={2.4} /> {L.appsBtn}
            </button>
          )}
          <button onClick={() => setLang(LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length])}
            aria-label="Language"
            style={{
              marginLeft: SHOW_APPS_BTN ? 0 : "auto",
              cursor: "pointer", background: "transparent", color: T.add,
              border: `1px solid ${T.line}`, borderRadius: T.radius,
              padding: "8px 10px", fontSize: 10, fontWeight: 800, fontFamily: MONO,
              textTransform: "uppercase", letterSpacing: ".06em",
            }}>{lang}</button>
        </header>

        {screen === "calc" && <CalcScreen />}
        {screen === "garage" && <GarageScreen />}
        {screen === "hist" && <RecordsScreen />}
        {screen === "info" && <InfoScreen />}

        <div style={{
          textAlign: "center", marginTop: 16,
          fontFamily: MONO, fontSize: 10, color: T.dim,
          letterSpacing: ".08em", lineHeight: 1.7,
        }}>
          {AUTHOR} · v{VERSION} ·{" "}
          <button onClick={() => { setDiscHide(false); setShowDisc(true); }}
            style={{
              background: "none", border: "none", padding: 0, cursor: "pointer",
              color: T.dim, font: "inherit", textDecoration: "underline",
              textUnderlineOffset: 3,
            }}>{L.warning}</button> ·{" "}
          <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer"
            style={{ color: T.dim }}>{L.privacy}</a> ·{" "}
          <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer"
            style={{ color: T.dim }}>{L.support}</a>
        </div>

        {/* Alt gezinme */}
        <nav style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40,
          background: "rgba(11,14,17,.94)",
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          borderTop: `1px solid ${T.line}`,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}>
          <div style={{ display: "flex", maxWidth: 520, margin: "0 auto" }}>
            {NAV.map(([k, label, Icon]) => {
              const on = screen === k;
              return (
                <button key={k} onClick={() => setScreen(k)}
                  style={{
                    flex: 1, minWidth: 0, display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 4, padding: "11px 2px 10px",
                    background: "transparent", border: "none", cursor: "pointer",
                    color: on ? T.add : T.dim,
                  }}>
                  <Icon size={19} strokeWidth={on ? 2.6 : 2} />
                  <span style={{
                    fontSize: 10, fontWeight: 700, fontFamily: MONO,
                    textTransform: "uppercase", letterSpacing: ".06em",
                    whiteSpace: "nowrap", overflow: "hidden",
                    textOverflow: "ellipsis", maxWidth: "100%",
                  }}>{label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {showDisc && (
          <Modal title={L.discTitle} closeLabel={L.discOk} dismissible={false}
            onClose={closeDisc}>
            {L.disc.map((line, i) => (
              <div key={i} style={{
                display: "flex", gap: 8, marginBottom: 9,
                fontSize: 12.5, lineHeight: 1.5, color: T.text,
              }}>
                <span style={{ color: T.addText, flexShrink: 0 }}>—</span>
                <span>{line}</span>
              </div>
            ))}
            <button onClick={() => setDiscHide((v) => !v)} aria-pressed={discHide}
              style={{
                display: "flex", alignItems: "center", gap: 9, width: "100%",
                marginTop: 14, padding: "11px 12px",
                background: "transparent", border: `1px solid ${T.line}`,
                borderRadius: T.radius, cursor: "pointer", textAlign: "left",
              }}>
              <span style={{
                width: 18, height: 18, flexShrink: 0, borderRadius: 3,
                border: `1.5px solid ${discHide ? T.add : T.dim}`,
                background: discHide ? T.add : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {discHide && <Check size={13} color="#fff" strokeWidth={3.5} />}
              </span>
              <span style={{ fontSize: 12.5, color: T.dim }}>{L.discHide}</span>
            </button>

            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              {LANGS.map((l) => (
                <button key={l} onClick={() => setLang(l)}
                  style={{
                    flex: 1, cursor: "pointer", padding: "7px 0",
                    fontSize: 11, fontWeight: 700, fontFamily: MONO,
                    textTransform: "uppercase", letterSpacing: ".08em",
                    borderRadius: T.radius,
                    background: lang === l ? T.presetOn : T.presetBg,
                    color: lang === l ? T.presetOnText : T.dim,
                    border: `1px solid ${lang === l ? T.presetOn : T.line}`,
                  }}>{l}</button>
              ))}
            </div>
          </Modal>
        )}

        {confirm && (
          <Modal title={L.confirmDel} closeLabel={L.cancel} onClose={() => setConfirm(null)}>
            <BigButton icon={Trash2} filled
              onClick={() => { confirm.action(); setConfirm(null); }}>
              {L.confirmYes}
            </BigButton>
          </Modal>
        )}

        {!splash && !showDisc && showTour && <Tour onDone={closeTour} />}

        {splash && <Splash title={L.title} onDone={() => setSplash(false)} />}

        {showApps && (
          <Modal title={L.appsTitle} hint={L.appsHint} closeLabel={L.close}
            onClose={() => setShowApps(false)}>
            {APPS.map((a) => {
              const live = Boolean(a.url);
              return (
                <div key={a.id}
                  style={{
                    display: "flex", alignItems: "center", width: "100%",
                    background: T.presetBg, border: `1px solid ${T.line}`,
                    borderRadius: T.radius, padding: "13px 14px", marginBottom: 8,
                    opacity: live ? 1 : 0.55, cursor: live ? "pointer" : "default",
                  }}
                  onClick={live ? () => window.open(a.url, "_blank") : undefined}>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: T.text }}>
                    {a.name[lang]}
                  </span>
                  {!live && (
                    <span style={{
                      fontFamily: MONO, fontSize: 10, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: ".1em",
                      color: T.addText, border: `1px solid ${T.add}`,
                      borderRadius: T.radius, padding: "3px 6px", whiteSpace: "nowrap",
                    }}>{L.soon}</span>
                  )}
                </div>
              );
            })}
          </Modal>
        )}
      </div>
    </AppCtx.Provider>
  );
}
