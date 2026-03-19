---
description: Deploy backend changes to EC2
---
# Deploy Backend to EC2

// turbo-all

1. Commit and push code changes:
```
cd "c:\Users\krish\OneDrive\Desktop\FINAL PROJ\GLX2" && git add -A && git commit -m "YOUR_COMMIT_MESSAGE" && git push origin main
```

2. Copy deploy key to temp with proper permissions:
```
Copy-Item "c:\Users\krish\OneDrive\Desktop\FINAL PROJ\GLX2\backend\galaxia-deploy-key.pem" "$env:TEMP\galaxia-deploy-key.pem" -Force; icacls "$env:TEMP\galaxia-deploy-key.pem" /inheritance:r /grant:r "${env:USERNAME}:(R)"
```

3. SSH to EC2 and deploy:
```
ssh -i "$env:TEMP\galaxia-deploy-key.pem" -o StrictHostKeyChecking=no -o IdentitiesOnly=yes ec2-user@65.1.183.241 "cd /home/ec2-user/galaxia/backend && git pull origin main && npm run build && pm2 restart galaxia-api && pm2 status"
```

## Key Info
- **Elastic IP**: 65.1.183.241 (permanent)
- **Instance ID**: i-047aea54d72c63a56
- **SSH User**: ec2-user (NOT ubuntu)
- **Backend path**: /home/ec2-user/galaxia/backend
- **SSH Key**: backend/galaxia-deploy-key.pem
- **EC2 Key Pair Name**: galaxia-deploy-1773897928
