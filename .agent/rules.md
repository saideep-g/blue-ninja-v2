---
description: Rules for current agent
---

- Do not commit changes automatically. Wait for my explicit confirmation before running git add or git commit.
- Always use TypeScript.

# Git Commit Standards

When generating git commit messages, always use a **detailed, multi-line format** following Conventional Commits. Avoid single-line summaries unless the change is trivial.

**Format:**
```
<type>(<scope>): <short summary>

<detailed description of specific changes>
- Bullet points for multiple changes
- Explanation of "why" if the change is complex

<footer/metadata if applicable>
```

**Example:**
```
fix(auth): Resolve token expiration race condition

- Added a mutex lock to the token refresh logic
- Updated the interceptor to retry failed requests once
- Fixed a bug where logout wasn't clearing local storage

Fixes #123
```