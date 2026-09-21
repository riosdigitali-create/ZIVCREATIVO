const tabs = [...document.querySelectorAll("[data-plan-tab]")];
const panels = [...document.querySelectorAll("[data-plan-panel]")];
const panelHost = document.querySelector(".service-panels");
const plansSection = document.querySelector(".service-plans");
const answerBar = document.querySelector(".plan-answer");
const answerText = document.querySelector("[data-plan-answer]");
const changeButton = document.querySelector("[data-change-plan]");

function syncHeight(panel) {
  if (!panelHost || !panel) return;
  panelHost.style.height = `${panel.scrollHeight}px`;
}

function selectPlan(name, focus = false) {
  const activeTab = tabs.find((tab) => tab.dataset.planTab === name);
  const activePanel = panels.find((panel) => panel.dataset.planPanel === name);
  if (!activeTab || !activePanel) return;

  tabs.forEach((tab) => {
    const selected = tab === activeTab;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  panels.forEach((panel) => {
    const selected = panel === activePanel;
    panel.classList.toggle("is-active", selected);
    panel.setAttribute("aria-hidden", String(!selected));
    panel.inert = !selected;
  });
  plansSection?.classList.add("has-selection");
  if (answerBar) answerBar.hidden = false;
  if (answerText) answerText.textContent = activeTab.querySelector("b")?.textContent || activeTab.textContent.trim();
  syncHeight(activePanel);
  if (focus) activeTab.focus();
}

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectPlan(tab.dataset.planTab));
  tab.addEventListener("keydown", (event) => {
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    selectPlan(tabs[nextIndex].dataset.planTab, true);
    tabs[nextIndex].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  });
});

changeButton?.addEventListener("click", () => {
  tabs.forEach((tab, index) => {
    tab.setAttribute("aria-selected", "false");
    tab.tabIndex = index === 0 ? 0 : -1;
  });
  panels.forEach((panel) => {
    panel.classList.remove("is-active");
    panel.setAttribute("aria-hidden", "true");
    panel.inert = true;
  });
  plansSection?.classList.remove("has-selection");
  if (answerBar) answerBar.hidden = true;
  if (panelHost) panelHost.style.height = "0px";
  tabs[0]?.focus();
  document.querySelector(".build-question")?.scrollIntoView({ behavior: "smooth", block: "center" });
});

document.querySelectorAll(".service-examples, .online-business-examples").forEach((examples) => {
  examples.addEventListener("toggle", () => {
    const activePanel = panels.find((panel) => panel.classList.contains("is-active"));
    requestAnimationFrame(() => syncHeight(activePanel));
  });
});

if (panelHost) panelHost.style.height = "0px";
window.addEventListener("resize", () => {
  const activePanel = panels.find((panel) => panel.classList.contains("is-active"));
  syncHeight(activePanel);
});
