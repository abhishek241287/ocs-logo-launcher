---
name: GitHub auto-push setup
description: GitHub repo for OCS OORJA Launcher and how to push after code changes.
---

# GitHub Auto-Push

**Repo:** https://github.com/abhishek241287/ocs-logo-launcher  
**GitHub username:** abhishek241287  
**Remote name:** `github`

## How to push after code changes

Git hooks and `git config core.hooksPath` writes are sandboxed — cannot be set programmatically. Instead, push manually at the end of every agent session that makes code changes.

**Why:** `.git/config` writes and `.git/hooks/` writes are blocked by the Replit sandbox. The remote URL with embedded token (`https://abhishek241287:<token>@github.com/...`) works fine.

**How to apply:**
After any code change session, run this in code_execution:

```javascript
const { execSync } = await import("child_process");
const conns = await listConnections("github");
const token = conns[0].settings.access_token;
const remoteUrl = `https://abhishek241287:${token}@github.com/abhishek241287/ocs-logo-launcher.git`;
execSync(`git remote set-url github "${remoteUrl}"`, { cwd: "/home/runner/workspace" });
execSync(`git push github main`, { cwd: "/home/runner/workspace", stdio: "pipe" });
console.log("Pushed to GitHub");
```

The `github` remote is already configured — only the token URL needs refreshing each session since tokens can rotate.
