const state = {
  lastResult: null,
  dataset: []
};

const $ = (id) => document.getElementById(id);
const t = {
  complete: "Complete",
  noTab: "No active tab found",
  collectingList: "Scrolling and collecting visible job cards...",
  collectingDetail: "Collecting the current job detail page...",
  collectFailed: "Collection failed",
  detailFailed: "Detail page collection failed",
  copied: "JSON copied",
  cleared: "Local dataset cleared",
  inaccessible: "Current page is not accessible",
  autoOn: "Auto detail collection enabled",
  autoOff: "Auto detail collection disabled",
  listLabel: "List page",
  detailLabel: "Detail page",
  storageUpdated: "Local dataset updated"
};

function setBusy(isBusy, message = "") {
  $("collectBtn").disabled = isBusy;
  $("detailBtn").disabled = isBusy;
  $("statusDot").className = `dot ${isBusy ? "busy" : "idle"}`;
  $("message").textContent = message;
}

function setResult(result) {
  state.lastResult = result;
  $("count").textContent = String(result.jobs.length);
  $("statusDot").className = result.jobs.length ? "dot ok" : "dot error";
  $("message").textContent = result.message || `${t.complete}: ${result.jobs.length}`;
  $("collectBtn").disabled = false;
  $("detailBtn").disabled = false;
}

function normalizedUrl(url) {
  return String(url || "").replace(/[?#].*$/, "");
}

function jobKey(job) {
  const url = normalizedUrl(job.url);
  if (/\/\d+\.html$/i.test(url)) return `url|${url}`;
  return [job.source, job.title, job.company, job.city, job.salary, job.experience, job.education, url].join("|");
}

function isLikelyJob(job) {
  const title = String(job.title || "").trim();
  const company = String(job.company || "").trim();
  const city = String(job.city || "").trim();
  const salary = String(job.salary || "").trim();
  const description = String(job.description || "").trim();
  const tags = Array.isArray(job.tags) ? job.tags.join(";") : String(job.tags || "").trim();
  const jobWord = /(\u5de5\u7a0b\u5e08|\u7b97\u6cd5|\u5f00\u53d1|\u89c6\u89c9|\u56fe\u50cf|AI|\u4eba\u5de5\u667a\u80fd|\u5b9e\u4e60|\u7814\u7a76\u5458|\u4ea7\u54c1|\u6d4b\u8bd5|\u8fd0\u7ef4|\u67b6\u6784|\u6559\u5e08|\u4eba\u624d|\u6280\u672f|\u7814\u53d1|\u52a9\u7406|\u7ecf\u7406|\u4e13\u5458)/i;
  const salaryWord = /(\u5343|\u4e07|k|K|\u85aa|\/\u5e74|\/\u6708|\u9762\u8bae)/;
  if (!title) return false;
  if (title === company && !description) return false;
  if (!company && !city && tags && !salaryWord.test(salary) && !description) return false;
  if (!jobWord.test(title) && !salaryWord.test(salary) && !description) return false;
  return true;
}

function jobQuality(job) {
  const weights = { title: 5, company: 5, city: 2, salary: 2, experience: 1, education: 1, tags: 2, description: 10, company_info: 4, address: 2, url: 3, company_url: 1 };
  return Object.entries(weights).reduce((score, [field, weight]) => {
    const value = job[field];
    const filled = Array.isArray(value) ? value.length > 0 : String(value || "").trim().length > 0;
    return score + (filled ? weight : 0);
  }, /\/\d+\.html/i.test(String(job.url || "")) ? 10 : 0);
}

function mergeJobs(existing, incoming) {
  const byKey = new Map();
  existing.filter(isLikelyJob).forEach((job) => byKey.set(jobKey(job), job));
  incoming.filter(isLikelyJob).forEach((job) => {
    const key = jobKey(job);
    const old = byKey.get(key);
    byKey.set(key, !old || jobQuality(job) >= jobQuality(old) ? { ...old, ...job } : old);
  });
  return Array.from(byKey.values());
}

async function loadDataset() {
  const data = await chrome.storage.local.get({ jobs: [], autoDetail: true });
  const originalJobs = Array.isArray(data.jobs) ? data.jobs : [];
  state.dataset = originalJobs.map(sanitizeJob);
  if (JSON.stringify(state.dataset) !== JSON.stringify(originalJobs)) {
    await chrome.storage.local.set({ jobs: state.dataset });
  }
  $("autoDetail").checked = Boolean(data.autoDetail);
  updateDatasetUi();
}

function sanitizeJob(job) {
  const cleaned = { ...job };
  const raw = String(cleaned.raw_text || "");
  if (raw && (!cleaned.address || !String(cleaned.address).includes("\u7701"))) {
    const fullAddress = raw.match(/\u5730\u56fe\u5b8c\u6574\u5730\u5740[:\uff1a]\s*(.+?)(?:\u516c\u53f8\u4fe1\u606f|51Job\u5b89\u5168\u63d0\u9192|$)/)?.[1] || "";
    if (fullAddress) cleaned.address = fullAddress.trim();
  }
  delete cleaned.raw_text;
  return cleaned;
}

async function saveDataset(jobs) {
  state.dataset = jobs;
  await chrome.storage.local.set({ jobs });
  updateDatasetUi();
}

function updateDatasetUi() {
  const hasJobs = state.dataset.length > 0;
  $("totalCount").textContent = String(state.dataset.length);
  $("copyBtn").disabled = !hasJobs;
  $("csvBtn").disabled = !hasJobs;
  $("jsonBtn").disabled = !hasJobs;
  $("clearBtn").disabled = !hasJobs;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error(t.noTab);
  return tab;
}

async function injectContentScript(tabId) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
}

async function runCollector() {
  const tab = await getActiveTab();
  await injectContentScript(tab.id);
  const options = { scrollRounds: Number($("scrollRounds").value || 0), waitMs: Number($("waitMs").value || 1200), includeDetails: $("includeDetails").checked };
  const [execution] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: (collectorOptions) => window.JobPageExtractor.collect(collectorOptions), args: [options] });
  return execution.result;
}

async function runDetailCollector() {
  const tab = await getActiveTab();
  await injectContentScript(tab.id);
  const [execution] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => window.JobPageExtractor.collectDetail() });
  return execution.result;
}

function toCsv(jobs) {
  const columns = ["source", "title", "company", "city", "salary", "experience", "education", "tags", "description", "company_info", "address", "page_url", "company_url", "url_type", "url", "collected_at"];
  const escape = (value) => {
    const text = Array.isArray(value) ? value.join(";") : String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [columns.join(","), ...jobs.map((job) => columns.map((column) => escape(job[column])).join(","))].join("\n");
}

function downloadText(filename, text, mimeType) {
  const url = `data:${mimeType};charset=utf-8,${encodeURIComponent(text)}`;
  chrome.downloads.download({ url, filename, saveAs: true });
}

async function mergeAndReport(result, label) {
  setResult(result);
  if (!result.jobs.length) return;
  const merged = mergeJobs(state.dataset, result.jobs);
  const added = merged.length - state.dataset.length;
  await saveDataset(merged);
  $("message").textContent = `${label}: ${result.jobs.length} found, ${added} new, ${merged.length} total`;
}

$("collectBtn").addEventListener("click", async () => {
  try {
    setBusy(true, t.collectingList);
    await mergeAndReport(await runCollector(), t.listLabel);
  } catch (error) {
    $("statusDot").className = "dot error";
    $("message").textContent = error.message || t.collectFailed;
    $("collectBtn").disabled = false;
    $("detailBtn").disabled = false;
  }
});

$("detailBtn").addEventListener("click", async () => {
  try {
    setBusy(true, t.collectingDetail);
    await mergeAndReport(await runDetailCollector(), t.detailLabel);
  } catch (error) {
    $("statusDot").className = "dot error";
    $("message").textContent = error.message || t.detailFailed;
    $("collectBtn").disabled = false;
    $("detailBtn").disabled = false;
  }
});

$("autoDetail").addEventListener("change", async () => {
  await chrome.storage.local.set({ autoDetail: $("autoDetail").checked });
  $("message").textContent = $("autoDetail").checked ? t.autoOn : t.autoOff;
});

$("copyBtn").addEventListener("click", async () => {
  await navigator.clipboard.writeText(JSON.stringify(state.dataset, null, 2));
  $("message").textContent = t.copied;
});

$("csvBtn").addEventListener("click", () => downloadText("jobs.csv", toCsv(state.dataset), "text/csv"));
$("jsonBtn").addEventListener("click", () => downloadText("jobs.json", JSON.stringify(state.dataset, null, 2), "application/json"));

$("clearBtn").addEventListener("click", async () => {
  await saveDataset([]);
  $("count").textContent = "0";
  $("message").textContent = t.cleared;
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.jobs) {
    state.dataset = Array.isArray(changes.jobs.newValue) ? changes.jobs.newValue : [];
    updateDatasetUi();
    $("message").textContent = `${t.storageUpdated}: ${state.dataset.length}`;
  }
});

getActiveTab()
  .then((tab) => { $("siteHint").textContent = new URL(tab.url).hostname; })
  .catch(() => { $("siteHint").textContent = t.inaccessible; });

loadDataset();
