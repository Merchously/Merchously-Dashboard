# Merchously Dashboard

Human-in-the-loop (HITL) dashboard for the Merchously agent system. This dashboard allows you to review and approve agent outputs at 4 critical checkpoints in your client journey.

## Features

- **4 HITL Approval Checkpoints:**
  - Proposal Review (before sending to client)
  - Discovery Call Summary Verification
  - Tier Execution Step Approvals (7 Launch steps)
  - Quality Checks (before delivery)

- **Real-Time Updates:** Server-Sent Events (SSE) push updates when new approvals arrive
- **Simple Authentication:** Single password login with JWT sessions (7-day expiry)
- **SQLite Database:** Lightweight, file-based approval workflow tracking
- **Airtable Integration:** Read client data from your existing CRM
- **Clean UI:** Built with Next.js 15, TypeScript, Tailwind CSS, and shadcn/ui

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Airtable API key (Personal Access Token)
- n8n instance running at `https://agents.merchously.com`

### Installation

1. **Install dependencies:**
   \`\`\`bash
   cd dashboard
   npm install
   \`\`\`

2. **Configure environment variables:**
   \`\`\`bash
   cp .env.example .env.local
   \`\`\`

   Edit `.env.local` and set:
   - `DASHBOARD_PASSWORD` - Your login password
   - `JWT_SECRET` - Random 32-character secret for JWT signing
   - `AIRTABLE_API_KEY` - Your Airtable Personal Access Token
   - Other environment variables as needed

3. **Initialize the database:**
   \`\`\`bash
   mkdir -p db
   sqlite3 db/merchously.db < db/schema.sql
   \`\`\`

   Or just run the dev server - it will auto-initialize the schema on first run.

4. **Run the development server:**
   \`\`\`bash
   npm run dev
   \`\`\`

5. **Open the dashboard:**
   Navigate to [http://localhost:3000](http://localhost:3000)

   Login with the password you set in `.env.local` (default: `merchously123`)

## Project Structure

\`\`\`
dashboard/
├── app/                              # Next.js App Router
│   ├── layout.tsx                   # Root layout
│   ├── page.tsx                     # Redirects to /dashboard
│   ├── login/page.tsx               # Login page
│   ├── dashboard/
│   │   ├── layout.tsx               # Dashboard shell
│   │   └── page.tsx                 # Main dashboard
│   └── api/
│       ├── auth/                    # Login/logout API
│       ├── webhooks/                # n8n webhook receivers
│       ├── approvals/               # Approval CRUD API
│       ├── clients/                 # Airtable client data
│       └── events/                  # SSE stream
├── components/
│   ├── ui/                          # shadcn components
│   └── dashboard/                   # Dashboard-specific components
├── lib/
│   ├── db.ts                        # SQLite client
│   ├── auth.ts                      # JWT authentication
│   ├── airtable.ts                  # Airtable API client
│   └── utils.ts                     # Utility functions
├── db/
│   ├── schema.sql                   # Database schema
│   └── merchously.db                # SQLite database (auto-created)
├── middleware.ts                    # Route protection
└── .env.local                       # Environment variables
\`\`\`

## Development Workflow

### Phase 1: Foundation ✅ (Completed)
- [x] Next.js 15 project initialized
- [x] shadcn/ui component library set up
- [x] SQLite database schema created
- [x] Authentication system (JWT + password)
- [x] Login page and API route
- [x] Route protection middleware
- [x] Basic dashboard layout

### Phase 2: Data Layer ✅ (Completed)
- [x] Airtable integration
- [x] Approval API routes (CRUD)
- [x] Client API routes
- [x] Test data seeding

### Phase 3: Approval UI ✅ (Completed)
- [x] Approval cards component
- [x] Approval modal with review/approve/reject actions
- [x] Client detail page with journey timeline
- [x] Timeline component
- [x] Progress indicator

### Phase 4: Webhooks + Real-Time ✅ (Completed)
- [x] Webhook receiver API routes for all agents
- [x] SSE implementation for real-time updates
- [x] Dashboard SSE listener
- [x] Test webhook script

### Phase 5: Deployment (Ready)
- [x] Production server configuration (server.js)
- [x] Environment template (.env.example)
- [x] Deployment guide (DEPLOYMENT.md)
- [x] Production build tested
- [ ] Deploy to Hostinger (follow DEPLOYMENT.md)
- [ ] Update n8n workflows with webhook nodes

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with password
- `POST /api/auth/logout` - Logout (clear session)

### Webhooks (from n8n)
- `POST /api/webhooks/proposal` - Proposal review checkpoint
- `POST /api/webhooks/discovery-call` - Discovery summary checkpoint
- `POST /api/webhooks/tier-execution` - Tier execution step checkpoint
- `POST /api/webhooks/quality-compliance` - Quality check checkpoint

### Approvals
- `GET /api/approvals` - List all approvals
- `GET /api/approvals?status=pending` - Filter by status
- `GET /api/approvals/:id` - Get approval details
- `PATCH /api/approvals/:id` - Approve/reject/edit

### Clients
- `GET /api/clients` - List all clients (from Airtable)
- `GET /api/clients/:email` - Get client details

### Real-Time
- `GET /api/events` - SSE stream for real-time updates

## Database Schema

### `approvals` Table
- Tracks approval workflow state (pending/approved/rejected/edited)
- Stores agent payloads and responses
- Links to client email (Airtable primary key)
- Admin comments and edited responses

### `webhook_events` Table
- Audit trail for all webhook calls
- Logs agent key, payload, response status
- Useful for debugging

### `sse_clients` Table
- Tracks active SSE connections
- Auto-cleanup for stale connections

## Testing

### Manual Testing Checklist
1. Login with correct password → Success
2. Login with wrong password → Error
3. Access /dashboard without login → Redirect to /login
4. Logout → Redirect to /login, cannot access /dashboard
5. Dashboard displays stats correctly
6. Pending approvals list shows empty state

### Next Steps for Testing
- Trigger n8n agent manually → Verify webhook creates approval
- Review approval → Approve/reject/edit
- Verify real-time update (SSE)

## Deployment (Hostinger)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive step-by-step deployment instructions.

**Quick steps:**
1. Build: `npm run build`
2. Upload to Hostinger via SFTP
3. Set environment variables in `.env.production`
4. Initialize database: `sqlite3 db/merchously.db < db/schema.sql`
5. Start server: `node server.js` (or use PM2)
6. Update n8n workflows to send webhooks to dashboard URL

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DASHBOARD_PASSWORD` | Login password | `merchously123` |
| `JWT_SECRET` | JWT signing secret (32 chars) | `your-random-secret-here` |
| `N8N_API_URL` | n8n instance URL | `https://agents.merchously.com` |
| `N8N_WEBHOOK_SECRET` | Shared secret for webhook validation | `shared-secret` |
| `AIRTABLE_API_KEY` | Airtable PAT | `patXXXXXXXXXXXX` |
| `AIRTABLE_BASE_ID` | Airtable base ID | `appwE9eU3t3vk6jLS` |
| `AIRTABLE_TABLE_ID` | Airtable table ID | `tbljcOBPFzyO5rCT4` |
| `DATABASE_PATH` | SQLite database path | `./db/merchously.db` |

## Troubleshooting

### Database Issues
- **"Database locked"**: SQLite is in WAL mode for better concurrency. Check for stale `.db-wal` or `.db-shm` files.
- **Schema not initialized**: Manually run `sqlite3 db/merchously.db < db/schema.sql`

### Authentication Issues
- **"Invalid token"**: Check `JWT_SECRET` is consistent across restarts
- **Can't login**: Verify `DASHBOARD_PASSWORD` in `.env.local`

### Webhook Issues
- **Webhook not creating approval**: Check n8n logs, verify webhook URL, check webhook secret
- **Webhook registration issue**: Toggle workflow off/on in n8n UI (known issue with API-created workflows)

## License

Proprietary - Merchously Internal Use Only

## Support

For issues or questions, contact: julius@merchously.com
