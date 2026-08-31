"use strict";

const ForklightCore = (() => {
  const VERSION = 1;
  const SCENARIO_META = [
    { id: "up", label: "İyimser yol", heading: "Beklenenden iyi giderse", defaultImpact: 3 },
    { id: "base", label: "Ana yol", heading: "En olası tablo", defaultImpact: 0 },
    { id: "down", label: "Ters yol", heading: "Plan zorlanırsa", defaultImpact: -3 }
  ];

  function clamp(value, min, max) {
    const numeric = Number(value);
    return Math.min(max, Math.max(min, Number.isFinite(numeric) ? numeric : min));
  }

  function cleanText(value, maxLength) {
    return String(value ?? "")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
      .slice(0, maxLength);
  }

  function blankScenario(meta) {
    return {
      id: meta.id,
      description: "",
      probability: 3,
      impact: meta.defaultImpact,
      control: 3,
      signal: "",
      action: ""
    };
  }

  function blankProject() {
    return {
      version: VERSION,
      decision: "",
      reviewTrigger: "",
      updatedAt: new Date().toISOString(),
      scenarios: SCENARIO_META.map(blankScenario)
    };
  }

  function sampleProject() {
    return normalizeProject({
      version: VERSION,
      decision: "2027’de ürün ekibini tamamen uzaktan çalışmaya geçirmek",
      reviewTrigger: "Devir süresi iki sprint üst üste %20 uzarsa hibrit düzeni yeniden değerlendir",
      scenarios: [
        {
          id: "up",
          description: "Yeteneğe erişim genişler; ekip memnuniyeti ve odak süresi artar.",
          probability: 4,
          impact: 4,
          control: 4,
          signal: "İlk 30 günde teslim hızının artması",
          action: "Eşzamansız çalışma rehberini devreye al"
        },
        {
          id: "base",
          description: "Verim sabit kalır; iletişim alışkanlıklarını yeniden kurmak gerekir.",
          probability: 3,
          impact: 2,
          control: 3,
          signal: "Toplantı süresi artarken çıktının sabit kalması",
          action: "Haftalık karar günlüğü ve ortak ofis saatleri koy"
        },
        {
          id: "down",
          description: "Bağlam kaybı büyür; yeni ekip üyeleri uyum sağlamakta zorlanır.",
          probability: 2,
          impact: -5,
          control: 2,
          signal: "Devir süresinin iki sprint üst üste uzaması",
          action: "Hibrit düzene dönüş eşiğini önceden tanımla"
        }
      ]
    });
  }

  function normalizeScenario(input, meta) {
    const source = input && typeof input === "object" ? input : {};
    return {
      id: meta.id,
      description: cleanText(source.description, 360),
      probability: Math.round(clamp(source.probability ?? 3, 1, 5)),
      impact: Math.round(clamp(source.impact ?? meta.defaultImpact, -5, 5)),
      control: Math.round(clamp(source.control ?? 3, 1, 5)),
      signal: cleanText(source.signal, 220),
      action: cleanText(source.action, 220)
    };
  }

  function normalizeProject(input) {
    const source = input && typeof input === "object" ? input : {};
    const sourceScenarios = Array.isArray(source.scenarios) ? source.scenarios : [];
    return {
      version: VERSION,
      decision: cleanText(source.decision, 160),
      reviewTrigger: cleanText(source.reviewTrigger, 180),
      updatedAt: new Date().toISOString(),
      scenarios: SCENARIO_META.map((meta, index) => {
        const matching = sourceScenarios.find((item) => item && item.id === meta.id);
        return normalizeScenario(matching || sourceScenarios[index], meta);
      })
    };
  }

  function filledCount(scenario) {
    return [scenario.description, scenario.signal, scenario.action]
      .filter((value) => value.trim().length > 0).length;
  }

  function scenarioPreparation(scenario) {
    const filled = filledCount(scenario);
    if (filled === 0) return 0;
    return ((filled / 3) * 70) + ((scenario.control / 5) * 30);
  }

  function scenarioRisk(scenario) {
    if (!scenario.description.trim() || scenario.impact >= 0) return 0;
    const outsideControlShare = (6 - scenario.control) / 5;
    return scenario.probability * Math.abs(scenario.impact) * outsideControlShare;
  }

  function riskBand(value) {
    if (value <= 2) return "Sakin alan";
    if (value <= 6) return "İzle";
    if (value <= 11) return "Önlem hazırla";
    if (value <= 17) return "Eşiği belirle";
    return "Yüksek dikkat";
  }

  function controlBand(value) {
    if (value < 2) return "Kontrol düşük";
    if (value < 3) return "Alan dar";
    if (value < 4) return "Müdahale mümkün";
    return "Alan güçlü";
  }

  function outlookBand(value) {
    if (value >= 2) return { label: "Ufuk açık", tone: "positive" };
    if (value >= 0.5) return { label: "Olumlu eğim", tone: "positive" };
    if (value > -0.5) return { label: "Dengeli", tone: "neutral" };
    if (value > -2) return { label: "Baskı var", tone: "warning" };
    return { label: "Sert rüzgâr", tone: "warning" };
  }

  function calculate(projectInput) {
    const project = normalizeProject(projectInput);
    const described = project.scenarios.filter((scenario) => scenario.description.trim());
    const completed = project.scenarios.filter((scenario) => filledCount(scenario) === 3).length;
    const hasEnoughData = Boolean(project.decision.trim() && described.length);

    if (!hasEnoughData) {
      return {
        ready: false,
        readiness: null,
        risk: null,
        riskLabel: "—",
        control: null,
        controlLabel: "—",
        outlook: { label: "Bekliyor", tone: "neutral" },
        completed,
        context: "Bir karar ve en az bir senaryo yazınca görünüm oluşur."
      };
    }

    const readiness = Math.round(
      project.scenarios.reduce((sum, scenario) => sum + scenarioPreparation(scenario), 0) / 3
    );
    const risk = Math.round(
      project.scenarios.reduce((sum, scenario) => sum + scenarioRisk(scenario), 0) / 3
    );
    const control = described.reduce((sum, scenario) => sum + scenario.control, 0) / described.length;
    const probabilityTotal = described.reduce((sum, scenario) => sum + scenario.probability, 0);
    const weightedOutlook = probabilityTotal
      ? described.reduce((sum, scenario) => sum + (scenario.probability * scenario.impact), 0) / probabilityTotal
      : 0;

    return {
      ready: true,
      readiness,
      risk,
      riskLabel: riskBand(risk),
      control: Math.round(control * 10) / 10,
      controlLabel: controlBand(control),
      outlook: outlookBand(weightedOutlook),
      completed,
      context: completed === 3
        ? "Üç yol da hazır. Değerler değiştikçe görünüm canlı güncellenir."
        : `Kısmi veri · ${completed}/3 yol tamamlandı. Daha net bir görünüm için boş alanları doldur.`
    };
  }

  function markdownEscape(value) {
    return String(value).replace(/([\\`*_[\]<>])/g, "\\$1");
  }

  function toMarkdown(projectInput) {
    const project = normalizeProject(projectInput);
    const result = calculate(project);
    const lines = [
      "# Forklight karar provası",
      "",
      `**Karar:** ${markdownEscape(project.decision || "Belirtilmedi")}`,
      `**Yeniden değerlendirme sinyali:** ${markdownEscape(project.reviewTrigger || "Belirtilmedi")}`,
      "",
      "## Karar görünümü",
      "",
      `- Hazırlık skoru: ${result.readiness ?? "—"}/100`,
      `- Risk maruziyeti: ${result.riskLabel}${result.risk === null ? "" : ` (${result.risk}/25)`}`,
      `- Kontrol alanı: ${result.controlLabel}`,
      `- Hazırlanan yollar: ${result.completed}/3`,
      "",
      "> Bu görünüm bir gelecek tahmini değil; kullanıcının kendi girdilerinden oluşan karar destek özetidir.",
      ""
    ];

    project.scenarios.forEach((scenario, index) => {
      const meta = SCENARIO_META[index];
      lines.push(
        `## ${meta.label} — ${meta.heading}`,
        "",
        markdownEscape(scenario.description || "Henüz yazılmadı."),
        "",
        `- Olasılık: ${scenario.probability}/5`,
        `- Etki: ${scenario.impact > 0 ? "+" : ""}${scenario.impact}/5`,
        `- Kontrol: ${scenario.control}/5`,
        `- Erken sinyal: ${markdownEscape(scenario.signal || "Belirtilmedi")}`,
        `- Hazırlık hamlesi: ${markdownEscape(scenario.action || "Belirtilmedi")}`,
        ""
      );
    });

    return lines.join("\n");
  }

  function safeFilename(decision) {
    const normalized = String(decision || "forklight-karar")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 48);
    return normalized || "forklight-karar";
  }

  return {
    VERSION,
    SCENARIO_META,
    clamp,
    cleanText,
    blankProject,
    sampleProject,
    normalizeProject,
    filledCount,
    scenarioPreparation,
    scenarioRisk,
    calculate,
    toMarkdown,
    safeFilename
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = ForklightCore;
if (typeof window !== "undefined") window.ForklightCore = ForklightCore;
