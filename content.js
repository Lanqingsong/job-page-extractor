(() => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const JOB_WORD_RE = /(\u5de5\u7a0b\u5e08|\u7b97\u6cd5|\u5f00\u53d1|\u89c6\u89c9|\u56fe\u50cf|AI|\u4eba\u5de5\u667a\u80fd|\u5b9e\u4e60|\u7814\u7a76\u5458|\u4ea7\u54c1|\u6d4b\u8bd5|\u8fd0\u7ef4|\u67b6\u6784|\u6559\u5e08|\u4eba\u624d|\u6280\u672f|\u7814\u53d1|\u52a9\u7406|\u7ecf\u7406|\u4e13\u5458)/i;
  const COMPANY_WORD_RE = /(\u516c\u53f8|\u5b66\u9662|\u5927\u5b66|\u5b9e\u9a8c\u5ba4|\u7814\u7a76\u9662|\u79d1\u6280|\u96c6\u56e2|\u4e2d\u5fc3|\u8bbe\u8ba1\u9662|\u533b\u9662|\u5382|\u6240|\u7535\u5668|\u751f\u7269|\u7f51\u7edc|\u4fe1\u606f|\u80a1\u4efd|\u6709\u9650)/;
  const SALARY_RE = /\d+(?:\.\d+)?\s*[-~\u81f3]\s*\d+(?:\.\d+)?\s*(?:k|K|\u5343|\u4e07)(?:\u00b7\d+\u85aa)?|\d+(?:\.\d+)?\s*[-~\u81f3]\s*\d+(?:\.\d+)?\u4e07\/\u5e74|\u9762\u8bae/;
  const CITY_RE = /(\u5317\u4eac|\u4e0a\u6d77|\u5e7f\u5dde|\u6df1\u5733|\u676d\u5dde|\u5357\u4eac|\u82cf\u5dde|\u6210\u90fd|\u6b66\u6c49|\u897f\u5b89|\u5408\u80a5|\u91cd\u5e86|\u5929\u6d25|\u957f\u6c99|\u5b81\u6ce2|\u65e0\u9521|\u4e1c\u839e|\u4f5b\u5c71|\u53a6\u95e8|\u9752\u5c9b|\u90d1\u5dde|\u6d4e\u5357|\u5927\u8fde|\u73e0\u6d77|\u5e38\u5dde|\u5357\u901a|\u6606\u5c71|\u60e0\u5dde|\u4e2d\u5c71)/;
  const EXPERIENCE_RE = /(\d+\s*[-\u81f3]\s*\d+\s*\u5e74|[\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u53410-9]+\u5e74\u4ee5\u4e0a|\u7ecf\u9a8c\u4e0d\u9650|\u5e94\u5c4a|\u5728\u6821|\u5b9e\u4e60)/;
  const EDUCATION_RE = /(\u535a\u58eb|\u7855\u58eb|\u672c\u79d1|\u5927\u4e13|\u5b66\u5386\u4e0d\u9650|\u4e2d\u4e13|\u9ad8\u4e2d)/;

  const adapter = {
    source: "51job",
    cardSelectors: [".joblist-item", ".j_joblist .e", ".job_item", "[class*='joblist'] [class*='item']", "[class*='job-list'] [class*='item']", "[class*='job'] [class*='card']"],
    titleSelectors: [".jname", ".job_title", "[class*='jobName']", "[class*='job-name']", "[class*='title']", "a"],
    companySelectors: [".cname", ".company_name", "[class*='companyName']", "[class*='company-name']", "[class*='company']"],
    salarySelectors: [".sal", ".salary", "[class*='salary']", "[class*='pay']"],
    metaSelectors: [".dc", ".area", ".job_wel", "[class*='area']", "[class*='jobArea']", "[class*='info']"],
    tagSelectors: [".tags span", ".job_wel span", "[class*='tag'] span", "[class*='keyword'] span"]
  };

  function normalize(text) { return String(text || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim(); }
  function textOf(root, selectors) { for (const s of selectors) { const n = root.querySelector(s); const t = normalize(n?.innerText || n?.textContent || ""); if (t) return t; } return ""; }
  function allText(root, selectors) { const a = []; selectors.forEach(s => root.querySelectorAll(s).forEach(n => { const t = normalize(n.innerText || n.textContent || ""); if (t && !a.includes(t)) a.push(t); })); return a; }
  function splitMeta(text) { return { city: text.match(CITY_RE)?.[1] || "", experience: text.match(EXPERIENCE_RE)?.[1] || "", education: text.match(EDUCATION_RE)?.[1] || "" }; }
  function isVisible(n) { const s = getComputedStyle(n); const r = n.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && Number(s.opacity) !== 0 && r.width > 0 && r.height > 0; }
  function isJobDetailUrl(url) { return /jobs\.51job\.com\/[^/?#]+\/\d+\.html/i.test(url); }
  function isCompanyUrl(url) { return /jobs\.51job\.com\/[^/?#]+\/co[^/?#]*\.html/i.test(url) || /(company|gongsi|cominfo|employer)/i.test(url); }
  function inferUrlType(url) { if (!url) return ""; if (isJobDetailUrl(url)) return "job"; if (isCompanyUrl(url)) return "company"; return /(job|jobs|position|zhiwei|zw|detail|pc\/job)/i.test(url) ? "job" : "unknown"; }

  function findCards() {
    const out = [];
    for (const selector of adapter.cardSelectors) {
      document.querySelectorAll(selector).forEach(node => {
        if (!(node instanceof HTMLElement) || !isVisible(node)) return;
        const text = normalize(node.innerText);
        if (text.length < 12 || text.length > 2500) return;
        if (!JOB_WORD_RE.test(text) && !SALARY_RE.test(text)) return;
        if (!out.includes(node)) out.push(node);
      });
      if (out.length >= 3) break;
    }
    if (out.length) return normalizeCardCandidates(out);
    const candidates = [];
    document.querySelectorAll("article, section, li, div").forEach(node => {
      if (!(node instanceof HTMLElement) || !isVisible(node)) return;
      const r = node.getBoundingClientRect();
      const text = normalize(node.innerText);
      if (text.length < 24 || text.length > 1600) return;
      if (r.width < 360 || r.height < 70 || r.height > 380) return;
      if (!JOB_WORD_RE.test(text) || (!SALARY_RE.test(text) && !COMPANY_WORD_RE.test(text))) return;
      candidates.push(node);
    });
    return normalizeCardCandidates(candidates);
  }

  function normalizeCardCandidates(candidates) {
    const jobLike = candidates.filter(node => JOB_WORD_RE.test(normalize(node.innerText)) && (SALARY_RE.test(normalize(node.innerText)) || COMPANY_WORD_RE.test(normalize(node.innerText))));
    const outermost = jobLike.filter(node => !jobLike.some(other => other !== node && other.contains(node)));
    return outermost.length ? outermost : jobLike;
  }

  function collectJobUrls(text, candidates) {
    const decoded = String(text || "");
    const patterns = [/https?:\/\/jobs\.51job\.com\/[^"'<>\\\s]+\/\d+\.html(?:\?[^"'<>\\\s]*)?/gi, /\/\/jobs\.51job\.com\/[^"'<>\\\s]+\/\d+\.html(?:\?[^"'<>\\\s]*)?/gi, /\/[^"'<>\\\s]+\/\d+\.html(?:\?[^"'<>\\\s]*)?/gi];
    patterns.forEach(p => (decoded.match(p) || []).forEach(m => { try { const u = m.startsWith("//") ? `https:${m}` : new URL(m, "https://jobs.51job.com").href; if (isJobDetailUrl(u) && !candidates.includes(u)) candidates.push(u); } catch {} }));
  }
  function findJobUrlInMarkup(card) { const c = []; [card, ...card.querySelectorAll("*")].forEach(n => { if (!(n instanceof HTMLElement)) return; Array.from(n.attributes || []).forEach(a => collectJobUrls(a.value, c)); }); collectJobUrls(card.innerHTML, c); return c[0] || ""; }
  function findBestLink(card, target = "job") { const links = Array.from(card.querySelectorAll("a[href]")); if (!links.length) return null; const cr = card.getBoundingClientRect(); const scored = links.map(link => { const href = link.getAttribute("href") || ""; const text = normalize(link.innerText || link.textContent || ""); let abs = href; try { abs = new URL(href, location.href).href; } catch {} const lr = link.getBoundingClientRect(); const x = (lr.left - cr.left) / (cr.width || 1); let score = 0; if (target === "job") { if (x < 0.55) score += 4; if (isJobDetailUrl(abs)) score += 10; if (JOB_WORD_RE.test(text)) score += 6; if (isCompanyUrl(abs)) score -= 8; if (COMPANY_WORD_RE.test(text)) score -= 2; } else { if (isCompanyUrl(abs)) score += 8; if (COMPANY_WORD_RE.test(text)) score += 4; if (isJobDetailUrl(abs)) score -= 4; } if (/javascript:|#/.test(href)) score -= 5; return { link, score }; }); scored.sort((a, b) => b.score - a.score); return scored[0]?.score > -1 ? scored[0].link : null; }
  function extractUrl(card) { const direct = findJobUrlInMarkup(card); if (direct) return direct; const link = findBestLink(card, "job"); if (!link) return ""; try { return new URL(link.getAttribute("href"), location.href).href; } catch { return ""; } }
  function extractCompanyUrl(card) { const link = findBestLink(card, "company"); if (!link) return ""; try { return new URL(link.getAttribute("href"), location.href).href; } catch { return ""; } }
  function parseFromText(text) { const lines = String(text || "").split(/\n| {2,}/).map(normalize).filter(Boolean); return { salary: text.match(SALARY_RE)?.[0] || "", title: lines.find(l => JOB_WORD_RE.test(l) && l.length <= 100) || "", company: lines.find(l => COMPANY_WORD_RE.test(l) && l.length <= 100) || "" }; }

  function extractJob(card, includeDetails) {
    const raw = card.innerText || "";
    const full = normalize(raw);
    const meta = splitMeta([textOf(card, adapter.metaSelectors), full].join(" "));
    const fallback = parseFromText(raw);
    const url = extractUrl(card);
    const title = textOf(card, adapter.titleSelectors) || fallback.title;
    const company = textOf(card, adapter.companySelectors) || fallback.company;
    return { source: adapter.source, title, company: title === company ? "" : company, city: meta.city, salary: textOf(card, adapter.salarySelectors) || fallback.salary, experience: meta.experience, education: meta.education, tags: allText(card, adapter.tagSelectors).slice(0, 20), description: "", company_info: "", address: "", raw_text: includeDetails ? full.slice(0, 2500) : "", page_url: location.href, company_url: extractCompanyUrl(card), url_type: inferUrlType(url), url, collected_at: new Date().toISOString() };
  }

  function pickText(selectors, options = {}) { const { maxLength = 120, reject = [] } = options; for (const s of selectors) { const values = Array.from(document.querySelectorAll(s)).map(n => normalize(n.innerText || n.textContent || "")).filter(v => v && v.length <= maxLength && !reject.includes(v)); if (values.length) return values[0]; } return ""; }
  function parseHeaderInfo(headerText, pageText) { const text = normalize(headerText || pageText || ""); const salary = text.match(SALARY_RE)?.[0] || ""; const meta = splitMeta(text); return { salary, city: meta.city, experience: meta.experience, education: meta.education }; }
  function extractDescriptionText(pageText) { const direct = pickText([".bmsg.job_msg.inbox", ".job_msg", ".job-detail .bmsg", "[class*='job_msg']"], { maxLength: 6000 }); if (direct) return direct.slice(0, 5000); const markers = ["\u5c97\u4f4d\u804c\u8d23", "\u4efb\u804c\u8981\u6c42", "\u804c\u4f4d\u63cf\u8ff0", "\u5de5\u4f5c\u804c\u8d23", "\u804c\u4f4d\u4fe1\u606f"]; const endMarkers = ["\u804c\u80fd\u7c7b\u522b", "\u5173\u952e\u5b57", "\u5de5\u4f5c\u5730\u5740", "\u516c\u53f8\u4fe1\u606f", "\u516c\u53f8\u4ecb\u7ecd"]; let start = -1; for (const m of markers) { const i = pageText.indexOf(m); if (i >= 0 && (start < 0 || i < start)) start = i; } if (start < 0) return ""; let end = pageText.length; for (const m of endMarkers) { const i = pageText.indexOf(m, start + 4); if (i > start && i < end) end = i; } return pageText.slice(start, end).trim().slice(0, 5000); }
  function extractCompanyInfo(pageText) { const direct = pickText([".job-corp .bmsg", ".job-corp", "[class*='job-corp']", ".com_msg"], { maxLength: 5000 }); if (direct) return direct.replace(/^\u516c\u53f8\u4fe1\u606f\s*/, "").slice(0, 4000); const start = pageText.indexOf("\u516c\u53f8\u4fe1\u606f"); if (start < 0) return ""; const endMarkers = ["51Job\u5b89\u5168\u63d0\u9192", "\u804c\u4f4d\u62db\u8058\u5b98", "\u70ed\u95e8\u57ce\u5e02", "\u63a8\u8350\u804c\u4f4d"]; let end = pageText.length; for (const m of endMarkers) { const i = pageText.indexOf(m, start + 4); if (i > start && i < end) end = i; } return pageText.slice(start, end).replace(/^\u516c\u53f8\u4fe1\u606f\s*/, "").trim().slice(0, 4000); }
  function extractAddress(pageText) {
    const fullAddress = pageText.match(/\u5730\u56fe\u5b8c\u6574\u5730\u5740[:\uff1a]\s*(.+?)(?:\u516c\u53f8\u4fe1\u606f|51Job\u5b89\u5168\u63d0\u9192|$)/)?.[1] || "";
    if (fullAddress) return normalize(fullAddress);
    const direct = pickText([".job-address .bmsg", ".job-address", "[class*='job-address']"], { maxLength: 1000 });
    if (direct) {
      const directFull = direct.match(/\u5730\u56fe\u5b8c\u6574\u5730\u5740[:\uff1a]\s*(.+?)(?:\u516c\u53f8\u4fe1\u606f|51Job\u5b89\u5168\u63d0\u9192|$)/)?.[1] || "";
      if (directFull) return normalize(directFull);
      return direct
        .replace(/^\u5de5\u4f5c\u5730\u5740\s*/, "")
        .replace(/\u70b9\u51fb\u67e5\u770b\u5730\u56fe.*$/, "")
        .trim();
    }
    const match = pageText.match(/\u5de5\u4f5c\u5730\u5740\s+(.+?)(\u516c\u53f8\u4fe1\u606f|51Job\u5b89\u5168\u63d0\u9192|$)/);
    return normalize(match?.[1] || "").replace(/\u70b9\u51fb\u67e5\u770b\u5730\u56fe.*$/, "").trim();
  }
  function extractCompanyName(pageText) { const side = pickText([".com_msg", ".com_msg a", "[class*='com_msg']"], { maxLength: 120 }); if (side && !["\u6211\u77e5\u9053\u4e86", "\u7acb\u5373\u7533\u8bf7", "\u53bb\u5b8c\u5584"].includes(side)) return side; const info = extractCompanyInfo(pageText); const first = info.split(/\n|\u3002|\uff0c/).map(normalize).find(l => COMPANY_WORD_RE.test(l) && l.length <= 120); if (first) return first.replace(/\u6210\u7acb\u4e8e.*$/, "").trim(); return document.title.split("|").map(normalize).find(p => COMPANY_WORD_RE.test(p) && !p.includes("\u62db\u8058")) || ""; }
  function extractKeywords(pageText) { const line = pageText.match(/\u5173\u952e\u5b57[:\uff1a]?\s*([^\n]+)/)?.[1] || ""; return line ? line.split(/\s+|,|\uff0c|;|\uff1b/).map(normalize).filter(Boolean).slice(0, 30) : []; }

  function extractCurrentDetailPage() {
    const raw = document.body?.innerText || "";
    const page = normalize(raw);
    const headerText = pickText([".tHeader.tHjob", ".sticky-job", "[class*='tHjob']", "[class*='sticky-job']"], { maxLength: 500 });
    const header = parseHeaderInfo(headerText, page);
    const title = pickText([".tHeader.tHjob h1", ".sticky-job h1", ".jTitle h1", "h1"], { maxLength: 100, reject: ["APP\u4e0b\u8f7d"] }) || document.title.split("\u62db\u8058")[0].trim();
    return { source: adapter.source, title, company: extractCompanyName(raw), city: header.city, salary: header.salary, experience: header.experience, education: header.education, tags: extractKeywords(raw), description: extractDescriptionText(raw), company_info: extractCompanyInfo(raw), address: extractAddress(raw), raw_text: "", page_url: location.href, company_url: "", url_type: inferUrlType(location.href), url: location.href, collected_at: new Date().toISOString() };
  }

  function dedupe(jobs) { const seen = new Set(); return jobs.filter(j => { const key = [j.title, j.company, j.city, j.salary, String(j.url || "").replace(/[?#].*$/, "")].join("|"); if (seen.has(key)) return false; seen.add(key); return j.title || j.company; }); }
  async function autoScroll(rounds, waitMs) { let last = 0, unchanged = 0; for (let i = 0; i < rounds; i++) { window.scrollBy({ top: Math.max(window.innerHeight * 0.85, 600), behavior: "smooth" }); await sleep(waitMs); const h = document.documentElement.scrollHeight; unchanged = h === last ? unchanged + 1 : 0; last = h; if (unchanged >= 3) break; } }
  function keyOf(job) { const u = String(job.url || "").replace(/[?#].*$/, ""); return /\/\d+\.html$/i.test(u) ? `url|${u}` : [job.source, job.title, job.company, job.city, job.salary, u].join("|"); }
  function quality(job) { return ["title", "company", "city", "salary", "experience", "education", "tags", "description", "company_info", "address", "url"].reduce((s, f) => s + (Array.isArray(job[f]) ? job[f].length > 0 : String(job[f] || "").trim() ? 1 : 0), /\/\d+\.html/i.test(String(job.url || "")) ? 5 : 0); }
  function merge(existing, incoming) { const m = new Map(); existing.forEach(j => m.set(keyOf(j), j)); incoming.forEach(j => { const k = keyOf(j), old = m.get(k); m.set(k, !old || quality(j) >= quality(old) ? { ...old, ...j } : old); }); return Array.from(m.values()); }
  async function autoSaveDetailIfEnabled() { if (!isJobDetailUrl(location.href) || !chrome?.storage?.local) return; await sleep(900); const data = await chrome.storage.local.get({ jobs: [], autoDetail: true }); if (!data.autoDetail) return; const job = extractCurrentDetailPage(); if (!job.title && !job.description) return; await chrome.storage.local.set({ jobs: merge(Array.isArray(data.jobs) ? data.jobs : [], [job]), lastAutoCollectedUrl: location.href, lastAutoCollectedAt: new Date().toISOString() }); }

  window.JobPageExtractor = {
    async collect(options = {}) { const rounds = Math.max(0, Math.min(Number(options.scrollRounds || 0), 30)); const waitMs = Math.max(300, Math.min(Number(options.waitMs || 1200), 5000)); if (rounds > 0) await autoScroll(rounds, waitMs); const jobs = dedupe(findCards().map(card => extractJob(card, options.includeDetails))); return { source: adapter.source, url: location.href, title: document.title, jobs, message: jobs.length ? `\u4ece ${adapter.source} \u9875\u9762\u63d0\u53d6 ${jobs.length} \u6761\u5c97\u4f4d` : "\u672a\u8bc6\u522b\u5230\u5c97\u4f4d\u5361\u7247" }; },
    async collectDetail() { const job = extractCurrentDetailPage(); return { source: job.source, url: location.href, title: document.title, jobs: job.title || job.description ? [job] : [], message: job.title || job.description ? "\u5df2\u63d0\u53d6\u5f53\u524d\u5c97\u4f4d\u8be6\u60c5\u9875" : "\u5f53\u524d\u9875\u9762\u4e0d\u50cf\u5c97\u4f4d\u8be6\u60c5\u9875" }; }
  };

  autoSaveDetailIfEnabled().catch(() => {});
})();
