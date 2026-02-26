# TOOLS.md - Local Notes

## Connected Channels & Skills

### 💬 Slack (Channel)
- Mode: socket, enabled
- Use for: team messaging, channel management, reactions
- **Full message actions available**: sendMessage, readMessages, editMessage, deleteMessage, react, reactions, pinMessage, unpinMessage, listPins, memberInfo, emojiList
- To read messages: use message tool with `action=readMessages` and `channelId=<channel_id>`, e.g. `{"action": "readMessages", "channelId": "C0AEZJ4BZ70", "limit": 20}`
- Optional params for readMessages: `limit` (number), `before` (timestamp), `after` (timestamp), `threadId` (thread timestamp)
- Your channelId: C0AEV8FFLTV. This is the channel through which you default to obtaining information.
- **Search strategy**: When asked to search/collect messages about a topic, NEVER limit to a single channel. Search across ALL accessible channels (public, group, DMs). Always expand keywords with common variations (case variants, spaces, hyphens, abbreviations). Prefer Slack search API over manual channel-by-channel scanning when available.

### 🐙 GitHub (Skill: `gh` CLI)
- Account: laychou666
- Use for: issues, PRs, CI status, code review, API queries
- **Counting commits**: Use `gh api "repos/{owner}/{repo}/commits?since=...&until=..." --jq 'length'`. The `since`/`until` params go in the URL query string, NOT as separate `-q` flags. Only query PUBLIC repos unless the user explicitly asks for private ones. List repos first with `gh repo list {user} --visibility=public --json name` to get the repo list.

### 📝 Notion (Skill)
- Default parent page: **SmartHome**
- All new pages go under SmartHome unless explicitly specified otherwise
- Use for: pages, databases, blocks
- **How to access**: Notion is accessed via `curl` to the Notion REST API. The API key is available as the environment variable `$NOTION_API_KEY` (already set by OpenClaw). Do NOT run `notion` as a shell command — no such CLI exists. Do NOT look for `~/.config/notion/api_key`.
- **Shell escaping**: To avoid JSON parsing errors on Windows, ALWAYS write the JSON body to a temp file first, then use `curl -d @file`. Example:
  ```
  echo '{"query": "keywords"}' > /tmp/notion_req.json
  curl -X POST "https://api.notion.com/v1/search" \
    -H "Authorization: Bearer $NOTION_API_KEY" \
    -H "Notion-Version: 2025-09-03" \
    -H "Content-Type: application/json" \
    -d @/tmp/notion_req.json
  ```
  This avoids all shell quoting issues. Use the same pattern for any Notion API call with a JSON body. Refer to `E:\installed_software\node_modules\npm\npm_global\node_modules\openclaw\skills\notion\SKILL.md` for full API docs.
- **Be proactive**: When a user mentions any Notion content, DO NOT ask for page links or IDs. Immediately search using the method above, then retrieve page content with `curl "https://api.notion.com/v1/blocks/{page_id}/children" -H "Authorization: Bearer $NOTION_API_KEY" -H "Notion-Version: 2025-09-03"`. Only ask the user for clarification if the search returns too many ambiguous results.

### 🎮 Google Workspace (Skill: `gog` CLI)
- Account: laychou666@gmail.com
- **CRITICAL env vars**: `HTTP_PROXY`, `HTTPS_PROXY`, and `ZONEINFO` are already set in the OpenClaw env config. If a `gog` command fails with connection errors or timezone errors, verify these vars are present in the shell by running `echo $HTTP_PROXY $ZONEINFO`. If missing, prefix the command with: `HTTP_PROXY=http://127.0.0.1:7890 HTTPS_PROXY=http://127.0.0.1:7890 ZONEINFO=E:/installed_software/zoneinfo.zip gog ...`.
- **Gmail**: send/receive, search, labels
  - **Searching**: Use `gog gmail messages search "<query>" --account laychou666@gmail.com --all`. The entire Gmail query must be in ONE pair of double quotes as a single argument. Use `--all` to fetch all pages. If results seem wrong, try simpler queries first (e.g. just the keyword without date filters) to verify.
- **Google Calendar**: view/create/manage events
- Also available: Drive, Contacts, Sheets, Docs
- **Calendar best practices** (to avoid 404 notFound):
  - Always pass `--account laychou666@gmail.com` explicitly.
  - The calendarId is a POSITIONAL argument, not a flag. Correct: `gog cal events laychou666@gmail.com --account laychou666@gmail.com --from ... --to ...`. Wrong: `gog cal events list --account ...` or `gog cal events --calendarId ...`.
  - Do NOT use `primary` as calendarId — it causes 404 on this setup.
  - Use RFC3339 format for `--from`/`--to` (e.g. `2026-01-01T00:00:00+08:00`). Avoid bare dates or ambiguous timezone formats.
  - If a command fails, retry with variations (explicit calendarId, different date format) before reporting failure. Try at least 2-3 times.

## Environment

- Workspace: `E:\.openclaw\workplace`
- Proxy: `127.0.0.1:7890` (HTTP/HTTPS/ALL_PROXY)
- Model: gpt-5.2 (custom OpenAI-compatible endpoint)
- OS: Windows
