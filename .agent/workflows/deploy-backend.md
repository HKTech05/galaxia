---
description: Deploy backend changes to EC2
---
// turbo-all

1. Add all changes and commit:
```bash
cd c:\Users\krish\OneDrive\Desktop\FINAL PROJ\GLX2
git add -A
git commit -m "deploy: backend changes"
git push
```

2. SSH into EC2 and deploy:
```bash
ssh -i "c:\Users\krish\OneDrive\Desktop\FINAL PROJ\GLX2\backend\galaxia-deploy-key.pem" -o StrictHostKeyChecking=no ec2-user@65.1.183.241 "cd ~/galaxia/backend && git pull && npm run build && pm2 restart all --update-env"
```

Notes:
- EC2 IP: `65.1.183.241`
- SSH User: `ec2-user`
- SSH Key: `backend/galaxia-deploy-key.pem`
- Backend path on EC2: `~/galaxia/backend`
- Chatbot path on EC2: `~/galaxia/GLX2CB/mainchatbotgalaxia`
- PM2 processes: `galaxia-api` (backend), `wa-chatbot` (chatbot)
- Frontend auto-deploys on Vercel when pushed to `main`
- Always use `--update-env` with pm2 restart to pick up .env changes
- Repo is PRIVATE. If `git pull` fails with auth error, run on EC2:
  ```
  git config --global credential.helper store
  # Then git pull will prompt for username (GitHub username) and password (GitHub PAT token)
  ```
- NEVER commit API keys, tokens, or passwords to source code. Use .env files only.
