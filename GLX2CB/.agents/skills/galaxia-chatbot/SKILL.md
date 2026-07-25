---
name: galaxia-chatbot
description: Context, instructions, and workflows for Galaxia Chatbot V2 and testing interface.
---

# Galaxia Chatbot V2 Skill & Reference

## Overview
This skill provides context and instructions for maintaining, testing, and deploying the Galaxia Chatbot V2 system.

## Core Directories
- **Chatbot V2 Project**: `mainchatbotgalaxia/`
- **Widget Testing Panel**: `mainchatbotgalaxia/widget/test.html`
- **Menu Engine**: `mainchatbotgalaxia/services/menuEngine.js`
- **Chat Routes**: `mainchatbotgalaxia/routes/chat.js`

## Key Deployment Commands
- **Deploy Chatbot & Widget to Vercel**:
  ```bash
  cd mainchatbotgalaxia
  npx vercel --prod --yes
  ```

## Live Production Target
- **Live Vercel URL**: `https://galaxia-whatsapp-bot2.vercel.app`
