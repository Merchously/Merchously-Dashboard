# Merchously Dashboard - Deployment Guide

This guide provides step-by-step instructions for deploying the Merchously Dashboard to Hostinger.

## Prerequisites

Before deploying, ensure you have:

- ✅ Hostinger account with Node.js hosting enabled
- ✅ Domain/subdomain configured: `dashboard.merchously.com`
- ✅ SSH access to your Hostinger server
- ✅ n8n instance running at `agents.merchously.com`
- ✅ Airtable Personal Access Token with read access
- ✅ SFTP client (FileZilla, Cyberduck, or VS Code SFTP extension)

## Step 1: Build the Application Locally

1. **Install dependencies:**
   ```bash
   cd dashboard
   npm install
   ```

2. **Build for production:**
   ```bash
   npm run build
   ```

3. **Verify the build:**
   ```bash
   # Check that .next directory exists
   ls -la .next

   # Test locally
   NODE_ENV=production node server.js
   # Visit http://localhost:3000
   ```

## Step 2: Prepare Files for Upload

Create a production-ready package with only necessary files:

```bash
# From the dashboard directory
tar -czf dashboard-prod.tar.gz \
  .next/ \
  public/ \
  db/schema.sql \
  node_modules/ \
  package.json \
  package-lock.json \
  server.js \
  next.config.ts \
  tsconfig.json
```

**Alternative:** Upload via SFTP (see Step 3)

## Step 3: Upload to Hostinger

### Option A: Using SFTP Client

1. **Connect to Hostinger via SFTP:**
   - Host: Your Hostinger FTP hostname (e.g., `ftp.merchously.com`)
   - Username: Your FTP username
   - Password: Your FTP password
   - Port: 21 (or 22 for SFTP)

2. **Create directory structure:**
   ```
   /home/username/dashboard.merchously.com/
   ```

3. **Upload files:**
   - Upload all files from your local `dashboard/` directory
   - Exclude: `.env.local`, `db/merchously.db` (will create on server)

### Option B: Using Command Line

```bash
# From your local machine
scp -r dashboard/ username@your-server:/home/username/dashboard.merchously.com/
```

## Step 4: Configure Environment Variables

1. **SSH into your Hostinger server:**
   ```bash
   ssh username@your-hostinger-server
   ```

2. **Navigate to dashboard directory:**
   ```bash
   cd /home/username/dashboard.merchously.com
   ```

3. **Create production environment file:**
   ```bash
   nano .env.production
   ```

4. **Paste and configure:**
   ```env
   NODE_ENV=production
   NEXT_PUBLIC_API_URL=https://dashboard.merchously.com
   PORT=3000
   HOSTNAME=0.0.0.0

   # Generate secure password
   DASHBOARD_PASSWORD=your-secure-password-123

   # Generate JWT secret with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   JWT_SECRET=your-generated-jwt-secret-here

   N8N_API_URL=https://agents.merchously.com
   N8N_WEBHOOK_SECRET=your-webhook-secret

   AIRTABLE_API_KEY=patYourActualAirtableToken
   AIRTABLE_BASE_ID=appwE9eU3t3vk6jLS
   AIRTABLE_TABLE_ID=tbljcOBPFzyO5rCT4

   DATABASE_PATH=./db/merchously.db
   SSE_HEARTBEAT_INTERVAL=30000
   ```

5. **Save and secure the file:**
   ```bash
   chmod 600 .env.production
   ```

## Step 5: Initialize Database

1. **Create database directory:**
   ```bash
   mkdir -p db
   ```

2. **Initialize SQLite database:**
   ```bash
   npm install -g better-sqlite3
   node -e "
   const Database = require('better-sqlite3');
   const fs = require('fs');
   const db = new Database('./db/merchously.db');
   const schema = fs.readFileSync('./db/schema.sql', 'utf8');
   db.exec(schema);
   console.log('Database initialized successfully');
   "
   ```

3. **Verify database:**
   ```bash
   sqlite3 db/merchously.db "SELECT name FROM sqlite_master WHERE type='table';"
   # Should show: approvals, webhook_events
   ```

## Step 6: Install Production Dependencies

```bash
# Install Node.js dependencies (if not uploaded with node_modules)
npm install --production
```

## Step 7: Start the Server

### Option A: Direct Start (Testing)

```bash
NODE_ENV=production node server.js
```

Visit `http://your-server-ip:3000` to test.

### Option B: Using PM2 (Recommended for Production)

1. **Install PM2 globally:**
   ```bash
   npm install -g pm2
   ```

2. **Start dashboard with PM2:**
   ```bash
   pm2 start server.js --name "merchously-dashboard" --env production
   ```

3. **Save PM2 process list:**
   ```bash
   pm2 save
   ```

4. **Enable PM2 on server startup:**
   ```bash
   pm2 startup
   # Follow the command output to configure startup script
   ```

5. **Verify status:**
   ```bash
   pm2 status
   pm2 logs merchously-dashboard
   ```

## Step 8: Configure Reverse Proxy (Hostinger)

Configure your Hostinger Node.js app settings:

1. **Navigate to:** Hostinger Panel → Websites → Manage → Node.js
2. **Create Node.js App:**
   - Application root: `/home/username/dashboard.merchously.com`
   - Application URL: `dashboard.merchously.com`
   - Application startup file: `server.js`
   - Node.js version: 18.x or higher
   - Port: 3000
3. **Save and restart** the application

## Step 9: Update n8n Workflows

Add HTTP Request nodes to your n8n workflows to send webhooks to the dashboard:

### For Proposal Drafting Agent:

1. **Open workflow:** Proposal Drafting Agent (`IjqokjmvqrvnbTCt`)
2. **Add HTTP Request node** after the AI Agent completes
3. **Configure:**
   - Method: POST
   - URL: `https://dashboard.merchously.com/api/webhooks/proposal`
   - Headers:
     ```json
     {
       "Content-Type": "application/json",
       "X-Webhook-Secret": "your-webhook-secret"
     }
     ```
   - Body:
     ```json
     {
       "email": "{{ $json.email }}",
       "payload": {{ $json.input }},
       "response": {{ $json.output }}
     }
     ```
4. **Save and toggle workflow off/on** (to register webhook)

### Repeat for All Agents:

- Lead Intake: `/api/webhooks/leadIntake`
- Discovery: `/api/webhooks/discovery`
- Onboarding: `/api/webhooks/onboarding`
- Tier Execution: `/api/webhooks/tierExecution`
- Customer Support: `/api/webhooks/customerSupport`
- Quality Compliance: `/api/webhooks/qualityCompliance`

## Step 10: Test End-to-End

1. **Trigger n8n workflow manually:**
   - Go to n8n
   - Open Proposal Drafting Agent
   - Click "Test Workflow" with sample data

2. **Verify webhook received:**
   ```bash
   # On Hostinger server
   pm2 logs merchously-dashboard
   # Look for "Webhook received from proposal"
   ```

3. **Check database:**
   ```bash
   sqlite3 db/merchously.db "SELECT * FROM approvals ORDER BY created_at DESC LIMIT 1;"
   ```

4. **Open dashboard:**
   - Visit `https://dashboard.merchously.com/login`
   - Enter admin password
   - Verify new approval appears in "Pending Approvals"

5. **Test approval flow:**
   - Click "Review" on pending approval
   - Click "Approve"
   - Verify status changes to "approved" in database
   - Check n8n logs for follow-up action (e.g., sending proposal email)

## Step 11: Monitor and Maintain

### View Logs

```bash
# PM2 logs
pm2 logs merchously-dashboard

# Real-time monitoring
pm2 monit

# View specific lines
pm2 logs merchously-dashboard --lines 100
```

### Restart Server

```bash
pm2 restart merchously-dashboard
```

### Update Deployment

```bash
# 1. Build locally
npm run build

# 2. Upload .next directory via SFTP

# 3. Restart on server
pm2 restart merchously-dashboard
```

### Backup Database

```bash
# Weekly backup
cp db/merchously.db db/backups/merchously-$(date +%Y%m%d).db
```

## Troubleshooting

### Issue: Dashboard not loading

**Solution:**
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs merchously-dashboard --lines 50

# Restart
pm2 restart merchously-dashboard
```

### Issue: Webhooks not arriving

**Solution:**
1. Check n8n workflow execution logs
2. Verify webhook URL is correct
3. Check X-Webhook-Secret header matches
4. Test webhook manually:
   ```bash
   curl -X POST https://dashboard.merchously.com/api/webhooks/proposal \
     -H "Content-Type: application/json" \
     -H "X-Webhook-Secret: your-secret" \
     -d '{"email":"test@example.com","payload":{},"response":{}}'
   ```

### Issue: SSE not working (no real-time updates)

**Solution:**
1. Check browser console for SSE connection errors
2. Verify firewall allows SSE connections
3. Test SSE endpoint: `https://dashboard.merchously.com/api/events`

### Issue: Login not working

**Solution:**
1. Verify DASHBOARD_PASSWORD in .env.production
2. Check JWT_SECRET is set
3. Clear browser cookies
4. Check server logs for authentication errors

### Issue: Airtable data not loading

**Solution:**
1. Verify AIRTABLE_API_KEY is valid
2. Check AIRTABLE_BASE_ID and AIRTABLE_TABLE_ID
3. Test Airtable API manually:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     "https://api.airtable.com/v0/appwE9eU3t3vk6jLS/tbljcOBPFzyO5rCT4?maxRecords=1"
   ```

## Security Checklist

- ✅ Changed default DASHBOARD_PASSWORD
- ✅ Generated random JWT_SECRET (32+ characters)
- ✅ Set N8N_WEBHOOK_SECRET and configured in n8n
- ✅ Secured .env.production with `chmod 600`
- ✅ HTTPS enabled on dashboard.merchously.com
- ✅ Firewall configured to allow only necessary ports
- ✅ PM2 configured to restart on crashes
- ✅ Database backups scheduled

## Performance Optimization

### Enable Next.js Caching

Already configured in `next.config.ts`:
```typescript
output: 'standalone'
```

### Database Indexing

```sql
-- Add indexes for faster queries (already in schema.sql)
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_client ON approvals(client_email);
CREATE INDEX IF NOT EXISTS idx_approvals_created ON approvals(created_at DESC);
```

### PM2 Cluster Mode (Optional)

For high traffic:
```bash
pm2 start server.js -i max --name "merchously-dashboard"
```

## Support

If you encounter issues not covered in this guide:

1. Check server logs: `pm2 logs merchously-dashboard`
2. Check n8n execution logs
3. Verify all environment variables are set correctly
4. Review database with: `sqlite3 db/merchously.db`

---

**Deployment Status Checklist:**

- [ ] Step 1: Build completed locally
- [ ] Step 2: Files packaged
- [ ] Step 3: Uploaded to Hostinger
- [ ] Step 4: Environment variables configured
- [ ] Step 5: Database initialized
- [ ] Step 6: Dependencies installed
- [ ] Step 7: Server started with PM2
- [ ] Step 8: Reverse proxy configured
- [ ] Step 9: n8n workflows updated
- [ ] Step 10: End-to-end test passed
- [ ] Step 11: Monitoring configured

**Dashboard is live at:** `https://dashboard.merchously.com` ✅
