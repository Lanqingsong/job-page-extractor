# Job Page Extractor

A local-first Chrome extension for saving job postings that are normally visible in the user's browser, for personal job-search research and analysis.

## What it does

- Extract visible job cards from recruitment search/list pages.
- Extract structured details from supported job detail pages, including title, company, salary, city, experience, education, description, company info, address, and URL.
- Automatically save supported 51job detail pages when the user opens them.
- Store all collected data locally in `chrome.storage.local`.
- Export the local dataset as CSV or JSON.

## What it does not do

- It does not bypass login, CAPTCHA, paywalls, access controls, or anti-abuse systems.
- It does not collect account passwords, cookies, tokens, chat messages, phone numbers, resumes, or private user data.
- It does not upload extracted data to a server.
- It does not use hidden/private API signatures or attempt to defeat website rate limits.

Users are responsible for complying with the terms of the websites they visit.

## Install for local use

1. Open `chrome://extensions/`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this folder.

## Usage

Open a supported recruitment page, then click the extension icon.

- Use `智能采集当前列表页` to extract visible job cards from a list page.
- Use `采集当前岗位详情页` to extract the currently open job detail page.
- Keep `打开 51job 岗位详情页时自动采集` enabled to automatically save 51job detail pages as you open them.
- Use `下载 CSV` or `下载 JSON` to export the local dataset.

## Data storage

All extracted records are stored locally in the browser. Exported files are created only when the user clicks the download buttons.

## Development notes

This project is intentionally conservative. It reads page DOM content that is already visible to the user and avoids automated high-frequency crawling or attempts to bypass site protections.
