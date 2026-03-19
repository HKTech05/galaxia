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
ssh -i "c:\Users\krish\OneDrive\Desktop\FINAL PROJ\GLX2\backend\galaxia-deploy-key.pem" -o StrictHostKeyChecking=no ec2-user@65.1.183.241 "cd ~/galaxia/backend && git pull && npm run build && pm2 restart all"
```

Notes:
- EC2 IP: `65.1.183.241`
- SSH User: `ec2-user`
- SSH Key: `backend/galaxia-deploy-key.pem`
- Backend path on EC2: `~/galaxia/backend`
- PM2 process name: `galaxia-api`
- Frontend auto-deploys on Vercel when pushed to `main`
