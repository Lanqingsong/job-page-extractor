# Job Page Extractor

A local-first Chrome extension for saving job postings that are normally visible in the user's browser, for personal job-search research and analysis.

## Why this exists

Job seekers often need to compare many similar roles across cities, companies, salary ranges, required skills, experience levels, and education requirements. Manually copying every posting into a spreadsheet is slow and error-prone, especially when the goal is to decide:

- Which roles match the candidate's background.
- Which roles look promising rather than over-crowded.
- Which missing skills are practical to learn.
- How to adjust a resume and prepare for interviews based on real job descriptions.

This extension is meant to be a local personal research helper for that workflow. The user manually opens recruitment pages in Chrome, and the extension organizes the visible job information into a local dataset that can be exported for later analysis.

## What it does

- Extract visible job cards from recruitment search/list pages.
- Extract structured details from supported job detail pages, including title, company, salary, city, experience, education, description, company info, address, and URL.
- Automatically save supported job detail pages when the user opens them.
- Store all collected data locally in `chrome.storage.local`.
- Export the local dataset as CSV or JSON.

## Supported sites

- 51job detail pages: `https://jobs.51job.com/.../*.html`
- Zhaopin detail pages: `https://www.zhaopin.com/jobdetail/*.htm`
- Liepin detail pages: `https://www.liepin.com/job/*.shtml`

Other job list/detail pages may work through generic DOM heuristics, but they are not guaranteed.

## Compliance and safety boundary

This project is designed for manual, user-initiated collection of pages that the user has already opened in their own browser. It is not a crawler service and is not intended for bulk harvesting, resale, republication, or commercial extraction of recruitment-site data.

The extension:

- It does not bypass login, CAPTCHA, paywalls, access controls, or anti-abuse systems.
- It does not collect account passwords, cookies, tokens, chat messages, phone numbers, resumes, or private user data.
- It does not upload extracted data to a server.
- It does not use hidden/private API signatures or attempt to defeat website rate limits.
- It does not run a background crawler or continuously fetch pages that the user has not opened.
- It does not modify recruitment-site pages or submit applications on the user's behalf.

Users are responsible for complying with the terms of the websites they visit and with applicable laws. If a website forbids extraction, automated collection, or reuse of its content, do not use this tool on that website.

## Install for local use

1. Open `chrome://extensions/`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this folder.

## Usage

Open a supported recruitment page, then click the extension icon.

- Use `Collect Current List Page` to extract visible job cards from a list page.
- Use `Collect Current Detail Page` to extract the currently open job detail page.
- Keep `Auto-save supported job detail pages` enabled to automatically save supported detail pages as you open them.
- Use `Download CSV` or `Download JSON` to export the local dataset.

## Data storage

All extracted records are stored locally in the browser. Exported files are created only when the user clicks the download buttons.

## Development notes

This project is intentionally conservative. It reads page DOM content that is already visible to the user and avoids automated high-frequency crawling or attempts to bypass site protections.
