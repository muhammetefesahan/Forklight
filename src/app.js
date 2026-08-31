"use strict";

(() => {
  const Core = window.ForklightCore;
  const STORAGE_KEY = "forklight:workspace:v1";
  const MAX_IMPORT_BYTES = 1024 * 1024;
  let state = loadProject();
  let toastTimer;
  let saveTimer;

  const elements = {
    decision: document.querySelector("#decision"),
    reviewTrigger: document.querySelector("#review-trigger"),
    scenarioGrid: document.querySelector("#scenario-grid"),
    saveStatus: document.querySelector("#save-status"),
    storageAlert: document.querySelector("#storage-alert"),
    readinessScore: document.querySelector("#readiness-score"),
    readinessMeter: document.querySelector("#readiness-meter"),
    riskBand: document.querySelector("#risk-band"),
    controlBand: document.querySelector("#control-band"),
    completionCount: document.querySelector("#completion-count"),
    triggerStatus: document.querySelector("#trigger-status"),
    outlookBand: document.querySelector("#outlook-band"),
    scoreContext: document.querySelector("#score-context"),
    scorePanel: document.querySelector("#score-panel"),
    mobileReadiness: document.querySelector("#mobile-readiness"),
    mobileRisk: document.querySelector("#mobile-risk"),
    mobileScore: document.querySelector("#mobile-score"),
    importButton: document.querySelector("#import-button"),
    importFile: document.querySelector("#import-file"),
    exportJson: document.querySelector("#export-json"),
    exportMarkdown: document.querySelector("#export-markdown"),
    sampleButton: document.querySelector("#sample-button"),
    clearButton: document.querySelector("#clear-button"),
    clearDialog: document.querySelector("#clear-dialog"),
    toast: document.querySelector("#toast")
  };

  function loadProject() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? Core.normalizeProject(JSON.parse(saved)) : Core.sampleProject();
    } catch {
      queueMicrotask(() => {
        const alert = document.querySelector("#storage-alert");
        if (alert) alert.hidden = false;
      });
      return Core.sampleProject();
    }
  }

  function saveProject() {
    state.updatedAt = new Date().toISOString();
    elements.saveStatus.textContent = "Kaydediliyor…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        elements.saveStatus.textContent = "Bu cihazda kaydedildi";
        elements.storageAlert.hidden = true;
      } catch {
        elements.saveStatus.textContent = "Kaydedilemedi";
        elements.storageAlert.hidden = false;
      }
    }, 180);
  }

  function formatRange(field, value) {
    return field === "impact" && Number(value) > 0 ? `+${value}` : String(value);
  }

  function updateRange(card, field, value) {
    const output = card.querySelector(`[data-output="${field}"]`);
    const input = card.querySelector(`[data-field="${field}"]`);
    if (output) output.value = formatRange(field, value);
    if (input) {
      input.value = String(value);
      input.setAttribute("aria-valuenow", String(value));
      input.setAttribute("aria-valuetext", formatRange(field, value));
    }
  }

  function render() {
    elements.decision.value = state.decision;
    elements.reviewTrigger.value = state.reviewTrigger;
    state.scenarios.forEach((scenario) => {
      const card = elements.scenarioGrid.querySelector(`[data-scenario="${scenario.id}"]`);
      if (!card) return;
      ["description", "signal", "action"].forEach((field) => {
        card.querySelector(`[data-field="${field}"]`).value = scenario[field];
      });
      ["probability", "impact", "control"].forEach((field) => {
        updateRange(card, field, scenario[field]);
      });
    });
    renderSummary();
  }

  function renderSummary() {
    const result = Core.calculate(state);
    const readiness = result.readiness === null ? "—" : String(result.readiness);
    elements.readinessScore.textContent = readiness;
    elements.readinessMeter.value = result.readiness ?? 0;
    elements.readinessMeter.textContent = String(result.readiness ?? 0);
    elements.riskBand.textContent = result.riskLabel;
    elements.controlBand.textContent = result.controlLabel;
    elements.completionCount.textContent = `${result.completed} / 3`;
    elements.triggerStatus.textContent = state.reviewTrigger.trim() ? "Tanımlı" : "Belirlenmedi";
    elements.outlookBand.textContent = result.outlook.label;
    elements.outlookBand.dataset.tone = result.outlook.tone;
    elements.scoreContext.textContent = result.context;
    elements.scorePanel.dataset.state = result.ready ? "ready" : "empty";
    elements.mobileReadiness.textContent = readiness === "—" ? readiness : `${readiness}/100`;
    elements.mobileRisk.textContent = result.riskLabel;
  }

  function updateTopLevel(field, value) {
    state[field] = Core.cleanText(value, field === "decision" ? 160 : 180);
    saveProject();
    renderSummary();
  }

  function bindInputs() {
    elements.decision.addEventListener("input", (event) => updateTopLevel("decision", event.target.value));
    elements.reviewTrigger.addEventListener("input", (event) => updateTopLevel("reviewTrigger", event.target.value));

    elements.scenarioGrid.addEventListener("input", (event) => {
      const input = event.target.closest("[data-field]");
      const card = event.target.closest("[data-scenario]");
      if (!input || !card) return;
      const scenario = state.scenarios.find((item) => item.id === card.dataset.scenario);
      if (!scenario) return;
      const field = input.dataset.field;
      scenario[field] = input.type === "range" ? Number(input.value) : input.value;
      if (input.type === "range") updateRange(card, field, scenario[field]);
      saveProject();
      renderSummary();
    });
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    toastTimer = setTimeout(() => {
      elements.toast.hidden = true;
    }, 3200);
  }

  function downloadFile(content, type, suffix) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${Core.safeFilename(state.decision)}.${suffix}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast(`.${suffix} dosyası cihazına indirildi.`);
  }

  async function importProject(file) {
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      showToast("Dosya çok büyük. En fazla 1 MB JSON içe aktarılabilir.");
      return;
    }
    try {
      const parsed = JSON.parse(await file.text());
      state = Core.normalizeProject(parsed);
      render();
      saveProject();
      showToast("Çalışma güvenli biçimde içe aktarıldı.");
    } catch {
      showToast("Bu JSON dosyası geçerli bir Forklight çalışması değil.");
    } finally {
      elements.importFile.value = "";
    }
  }

  function bindActions() {
    elements.exportJson.addEventListener("click", () => {
      downloadFile(JSON.stringify(Core.normalizeProject(state), null, 2), "application/json", "json");
    });
    elements.exportMarkdown.addEventListener("click", () => {
      downloadFile(Core.toMarkdown(state), "text/markdown;charset=utf-8", "md");
    });
    elements.importButton.addEventListener("click", () => elements.importFile.click());
    elements.importFile.addEventListener("change", (event) => importProject(event.target.files[0]));
    elements.sampleButton.addEventListener("click", () => {
      state = Core.sampleProject();
      render();
      saveProject();
      showToast("Örnek karar provası yüklendi.");
    });
    elements.clearButton.addEventListener("click", () => elements.clearDialog.showModal());
    elements.clearDialog.addEventListener("close", () => {
      if (elements.clearDialog.returnValue !== "confirm") return;
      state = Core.blankProject();
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        elements.storageAlert.hidden = false;
      }
      render();
      showToast("Çalışma temizlendi. Yeni bir karar yazabilirsin.");
      elements.decision.focus();
    });
    elements.mobileScore.addEventListener("click", () => {
      elements.scorePanel.scrollIntoView({ behavior: "smooth", block: "start" });
      elements.scorePanel.querySelector("summary").focus({ preventScroll: true });
    });
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }

  bindInputs();
  bindActions();
  render();
  saveProject();
  registerServiceWorker();
})();
