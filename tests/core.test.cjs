"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../src/core.js");

test("boş çalışma skor üretmez", () => {
  const result = Core.calculate(Core.blankProject());
  assert.equal(result.ready, false);
  assert.equal(result.readiness, null);
  assert.equal(result.risk, null);
});

test("örnek çalışma açıklanabilir ve deterministik sonuç verir", () => {
  const result = Core.calculate(Core.sampleProject());
  assert.equal(result.ready, true);
  assert.equal(result.readiness, 88);
  assert.equal(result.risk, 3);
  assert.equal(result.riskLabel, "İzle");
  assert.equal(result.controlLabel, "Müdahale mümkün");
  assert.equal(result.completed, 3);
});

test("olasılık, etki ve kontrol güvenli aralığa sıkıştırılır", () => {
  const normalized = Core.normalizeProject({
    decision: "Karar",
    scenarios: [{ id: "up", probability: 999, impact: -999, control: 0 }]
  });
  assert.equal(normalized.scenarios[0].probability, 5);
  assert.equal(normalized.scenarios[0].impact, -5);
  assert.equal(normalized.scenarios[0].control, 1);
});

test("bilinmeyen alanlar içe aktarımdan taşınmaz", () => {
  const normalized = Core.normalizeProject({
    decision: "Karar",
    token: "taşınmamalı",
    scenarios: [{ id: "up", description: "A", secret: "taşınmamalı" }]
  });
  assert.equal(Object.hasOwn(normalized, "token"), false);
  assert.equal(Object.hasOwn(normalized.scenarios[0], "secret"), false);
});

test("kontrol arttıkça aynı olumsuz senaryonun riski düşer", () => {
  const lowControl = { description: "Zorlanır", probability: 5, impact: -5, control: 1 };
  const highControl = { ...lowControl, control: 5 };
  assert.ok(Core.scenarioRisk(lowControl) > Core.scenarioRisk(highControl));
});

test("olumlu etki risk maruziyetine eklenmez", () => {
  assert.equal(Core.scenarioRisk({ description: "İyi gider", probability: 5, impact: 5, control: 1 }), 0);
});

test("hazırlık kapsamı metin alanları doldukça artar", () => {
  const partial = { description: "A", signal: "", action: "", control: 3 };
  const complete = { description: "A", signal: "B", action: "C", control: 3 };
  assert.ok(Core.scenarioPreparation(complete) > Core.scenarioPreparation(partial));
});

test("yalnızca bir yol tamamlandığında sonuç kısmi olarak işaretlenir", () => {
  const project = Core.blankProject();
  project.decision = "Bir karar";
  Object.assign(project.scenarios[1], { description: "Ana sonuç", signal: "Sinyal", action: "Eylem" });
  const result = Core.calculate(project);
  assert.equal(result.ready, true);
  assert.equal(result.completed, 1);
  assert.match(result.context, /Kısmi veri/);
});

test("kontrol karakterleri temizlenir ve metin sınırı uygulanır", () => {
  assert.equal(Core.cleanText("A\u0000B", 10), "AB");
  assert.equal(Core.cleanText("abcdef", 3), "abc");
});

test("Markdown dışa aktarımı karar görünümünü ve üç yolu içerir", () => {
  const markdown = Core.toMarkdown(Core.sampleProject());
  assert.match(markdown, /# Forklight karar provası/);
  assert.match(markdown, /Hazırlık skoru: 88\/100/);
  assert.match(markdown, /İyimser yol/);
  assert.match(markdown, /Ters yol/);
});

test("dosya adı işletim sistemi için güvenli hale gelir", () => {
  const filename = Core.safeFilename("Yeni iş / büyük karar?");
  assert.equal(filename, "yeni-is-buyuk-karar");
});

test("bozuk senaryo dizisi güvenli varsayılanlara döner", () => {
  const normalized = Core.normalizeProject({ decision: "Karar", scenarios: "bozuk" });
  assert.equal(normalized.scenarios.length, 3);
  assert.deepEqual(normalized.scenarios.map((item) => item.id), ["up", "base", "down"]);
});
