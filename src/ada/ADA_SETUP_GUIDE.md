# Ada AI Assistant - Setup Guide

## Overview

Ada is an AI-powered chatbot assistant for the Daher Plan project management application. She can:

- Answer questions about project tasks, sprints, and progress
- Send emails to team members on command
- Provide insights about team workload
- Accept voice commands

## Prerequisites

1. **n8n Instance** - Cloud or self-hosted
2. **OpenAI API Key** - Already configured in `AdaBrain.txt`
3. **Gmail Service Account** - Already configured in `gmail.json`
4. **Supabase Database** - Already configured

## Setup Steps

### 1. Database Migration

Run the migration to add email support to profiles:

```sql
-- Execute in Supabase SQL Editor
-- File: migrations/add_email_to_profiles.sql
```

### 2. Import n8n Workflow

1. Open your n8n instance
2. Go to **Workflows** > **Import from File**
3. Select `src/ada/ada-n8n-workflow.json`
4. The workflow will be imported with all nodes

### 3. Configure n8n Credentials

#### OpenAI API
1. In n8n, go to **Credentials**
2. Create new **OpenAI API** credential
3. Enter API Key from `AdaBrain.txt` (this file is gitignored for security)

#### Gmail OAuth2
1. Go to Google Cloud Console
2. Enable Gmail API
3. Create OAuth2 credentials
4. In n8n, create **Gmail OAuth2** credential
5. Authenticate with your Google account

#### Supabase PostgreSQL
1. In n8n, create **PostgreSQL** credential
2. Use your Supabase connection details:
   - Host: `db.vzlgssqtzerleeskhzmo.supabase.co`
   - Database: `postgres`
   - User: `postgres`
   - Password: Your Supabase database password
   - Port: `5432`
   - SSL: Enable

### 4. Update Webhook URL

1. After importing the workflow, n8n will assign a webhook URL
2. Copy the webhook URL (e.g., `https://your-n8n.app.n8n.cloud/webhook/ada-assistant`)
3. Update `.env`:
   ```
   VITE_ADA_WEBHOOK_URL=https://your-n8n.app.n8n.cloud/webhook/ada-assistant
   ```

### 5. Activate Workflow

1. In n8n, open the Ada workflow
2. Click **Activate** to enable the webhook
3. Note: For testing, use `webhook-test` URL; for production, use `webhook` URL

## Usage

### In the Application

1. Navigate to any project
2. Click the Ada floating button (bottom-right)
3. Type or speak your request

### Example Commands

**Questions:**
- "Quais tarefas estao pendentes?"
- "Qual o progresso do projeto?"
- "Quem esta mais sobrecarregado?"
- "Quantos story points temos neste sprint?"

**Email Commands:**
- "Envie um email para a equipe dizendo que iniciaremos um novo sprint amanha"
- "Mande para o Pedro quais tarefas ele esta trabalhando"
- "Avise o Joao que preciso falar com ele amanha"
- "Comunique a equipe sobre a reuniao de retrospectiva"

### Voice Commands

1. Click the microphone button
2. Speak your command in Portuguese
3. Ada will transcribe and process your request

## n8n Workflow Architecture

```
Webhook (POST)
    |
    v
Parse Input
    |
    v
OpenAI - Analyze Intent
    |
    v
Parse Response
    |
    +---> Email Command?
    |         |
    |         +---> Needs Clarification?
    |         |         |
    |         |         +---> Yes: Ask for clarification
    |         |         |
    |         |         +---> No: Send Email via Gmail
    |         |                     |
    |         |                     v
    |         |               CC to requester
    |
    +---> Question?
              |
              +---> Needs Data?
              |         |
              |         +---> Yes: Query Supabase
              |         |           |
              |         |           v
              |         |     OpenAI - Generate Answer
              |         |
              |         +---> No: Direct answer
              |
              v
        Respond to Webhook
```

## Troubleshooting

### CORS Issues
If you see CORS errors, ensure your n8n webhook has proper headers:
```javascript
{
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json"
}
```

### Voice Recognition Not Working
- Ensure you're using HTTPS (required for Web Speech API)
- Check browser permissions for microphone
- Voice recognition works best in Chrome/Edge

### Emails Not Sending
1. Verify Gmail OAuth2 credentials
2. Check that recipient emails exist in profiles table
3. Ensure the workflow is active (not in test mode for production)

### No Response from Ada
1. Check n8n execution logs for errors
2. Verify webhook URL is correct in `.env`
3. Ensure OpenAI API key is valid and has credits

## Security Notes

1. **API Keys**: Never commit API keys to version control
2. **Email Validation**: Ada only sends to verified team members
3. **CC Policy**: All emails include a copy to the requester
4. **Ambiguity Check**: Ada asks for clarification when names are ambiguous

## File Structure

```
src/ada/
  ├── AdaBrain.txt          # OpenAI API Key
  ├── gmail.json            # Gmail Service Account
  ├── ada-n8n-workflow.json # n8n Workflow (importable)
  └── ADA_SETUP_GUIDE.md    # This guide

src/components/
  ├── AdaChatbot.tsx        # Main chatbot UI component
  ├── AdaModal.tsx          # Ada info modal
  └── AdaSprintAssistant.tsx # Sprint retrospective assistant

migrations/
  └── add_email_to_profiles.sql # Email migration
```

## Support

For issues or feature requests, contact the development team or create an issue in the project repository.

---

*Ada - Named after Ada Lovelace, the first computer programmer (1815-1852)*
