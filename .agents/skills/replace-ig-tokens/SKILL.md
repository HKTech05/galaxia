---
name: replace-ig-tokens
description: >-
  Use this skill when the user wants to replace, update, or rotate Instagram
  (IGAA) access tokens for the Galaxia chatbot system. Handles all 7 IG bot
  tokens on the EC2 production server.
---

# Replace Instagram (IGAA) Tokens

This skill handles replacing expired Instagram Graph API access tokens for all
Galaxia chatbot IG bots on the EC2 production server.

## Token Mapping

There are **7 IG bots**, each with its own env variable in the EC2 `.env` file:

| Bot               | Env Variable              |
|--------------------|---------------------------|
| Digital Diaries    | `INSTAGRAM_TOKEN`         |
| La Paraiso         | `IG_TOKEN_LAPARAISO`      |
| Mount View         | `IG_TOKEN_MOUNTVIEW`      |
| Hill View          | `IG_TOKEN_HILLVIEW`       |
| Heavenly Villa     | `IG_TOKEN_HEAVENLYVILLA`  |
| Ambrose            | `IG_TOKEN_AMBROSE`        |
| Amstel Nest        | `IG_TOKEN_AMSTELNEST`     |

## File Location

- **EC2 `.env` file**: `~/galaxia/GLX2CB/mainchatbotgalaxia/.env`
- **SSH access**: `ssh -i "<deploy-key-path>" ec2-user@65.1.183.241`
- **Deploy key**: `C:\Users\K\Desktop\FINAL PROJ\GLX2\backend\galaxia-deploy-key.pem`

## Steps

### 1. Collect New Tokens

Ask the user for the new IGAA tokens. They will provide them labeled by bot
name (e.g., "digital diaries: IGAA...", "ambrose: IGAA...").

### 2. Replace Each Token on EC2

For each token, run a `sed` command via SSH to replace the value in the `.env`
file. Use the pipe `|` delimiter in sed since tokens contain `/` characters.

```bash
ssh -i "<deploy-key>" -o StrictHostKeyChecking=no ec2-user@65.1.183.241 \
  "cd ~/galaxia/GLX2CB/mainchatbotgalaxia && \
   sed -i 's|^<ENV_VAR>=.*|<ENV_VAR>=<NEW_TOKEN>|' .env && \
   echo '<BOT_NAME> token updated'"
```

**Example** (Digital Diaries):
```bash
sed -i 's|^INSTAGRAM_TOKEN=.*|INSTAGRAM_TOKEN=IGAAXTprnk4M1...|' .env
```

> [!CAUTION]
> NEVER commit tokens to git or display them in output. These are secrets.

### 3. Verify All 7 Tokens Were Updated

Run a count check to confirm all tokens match the new prefix:

```bash
ssh -i "<deploy-key>" -o StrictHostKeyChecking=no ec2-user@65.1.183.241 \
  "cd ~/galaxia/GLX2CB/mainchatbotgalaxia && \
   grep -c 'IGAA' .env"
```

Expected output: `7` (one for each bot).

### 4. Restart the Chatbot Service

```bash
ssh -i "<deploy-key>" -o StrictHostKeyChecking=no ec2-user@65.1.183.241 \
  "pm2 restart wa-chatbot --update-env"
```

### 5. Confirm to User

Report which tokens were updated in a table format and confirm the service
restarted successfully.

## Important Notes

- Tokens all start with `IGAA` prefix
- Tokens are **long strings** (200+ chars) — use `sed` with `|` delimiter to avoid issues with special characters
- Do NOT modify any other `.env` variables
- Do NOT commit `.env` to git — it is in `.gitignore`
- If the user provides fewer than 7 tokens, only replace the ones provided
