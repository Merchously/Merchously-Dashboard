# Merchously — Human Roles & Dashboard Architecture (v1)

**Document Type:** System Architecture & Governance

**Status:** Active Draft

**Version:** v1.0

**Owner:** Founder (Julius Joaquin)

**Last Updated:** 2026-02-10

---

## 1. Purpose of This Document

This document defines:

- The **required human roles** for Merchously to operate safely and at scale
- The **division of responsibility** between humans and AI agents
- The **optimal internal application / dashboard** needed to support end-to-end client acquisition and delivery
- The **design principles** required to prevent system drift, scope creep, and operational chaos

This document is intended to be:

- Read and analyzed by **VS Code / Claude Code**
- Used as a **validation reference** against existing n8n AI agents
- A **blueprint for building or auditing** the Merchously internal dashboard

If implementation diverges from this document, it must be corrected or escalated.

---

## 2. Guiding Principles

1. **Humans make decisions. AI supports decisions.**
2. **Stages cannot be skipped without escalation.**
3. **Every client exists in exactly one state at a time.**
4. **Undefined authority creates operational risk.**
5. **If a decision affects money, scope, or risk — it is human-owned.**

---

## 3. Required Human Roles (Minimum Viable Team)

These roles are **non-negotiable**, even in a lean setup.

### 3.1 Founder / Principal

**Purpose:** Protect system integrity and long-term value.

**Owns:**
- Final client fit decisions
- Pricing exceptions
- Scope exceptions
- Licensing / IP risk
- Strategic judgment
- Escalations of any kind

**Required Touchpoints:**
- Internal Fit Decision (post-discovery)
- Proposal approval
- Any exception or escalation

**May NOT Delegate:**
- Pricing outside documented ranges
- Licensing or IP interpretation
- Final go / no-go calls

---

### 3.2 Sales & Discovery Lead (Human)

**Purpose:** Diagnose fit and establish trust.

**Owns:**
- Discovery calls
- Live conversations
- Reading between the lines (budget, power, intent)
- Framing recommendations
- Live proposal walkthroughs

**AI Support Allowed:**
- Note capture
- Summary generation
- Risk flagging

**AI May NOT Replace This Role.**

---

### 3.3 Delivery Lead / Project Owner

**Purpose:** Ensure successful execution and client outcomes.

**Owns:**
- Client success
- Delivery pacing
- Boundary enforcement
- Tier SOP execution
- Client communication clarity

**Rules:**
- One delivery lead per client
- No shared ownership
- Authority must be explicit

---

### 3.4 Creative / Execution Specialists

**Purpose:** Execute scoped work accurately.

**Owns:**
- Deliverables
- SOP adherence
- Task execution

**Does NOT Own:**
- Scope decisions
- Client expectation setting
- Prioritization

---

### 3.5 AI Systems Operator (Founder-Level Responsibility)

**Purpose:** Maintain AI system health.

**Owns:**
- n8n workflow integrity
- Prompt accuracy
- Agent authority limits
- Data correctness
- Guardrails and escalation logic

AI systems do not self-govern.

---

## 4. Human vs AI Responsibility Boundary

### 4.1 AI Agents SHOULD Own

- Lead intake
- ICP classification
- Discovery note structuring
- Proposal drafting
- SOP checklist generation
- Task creation
- Status updates
- Risk flagging
- Reminder nudges

### 4.2 AI Agents MUST NOT Own

- Go / no-go decisions
- Pricing commitments
- Scope expansion
- Client reassurance during conflict
- Licensing interpretation
- Exception approval

**Rule of Thumb:**
> AI handles consistency. Humans handle judgment.

---

## 5. Optimal Internal Application / Dashboard

### 5.1 Core Design Intent

The Merchously dashboard is **not a CRM**.

It is a **state-based decision and flow control system**.

Primary question it must answer at all times:

- What stage is this client in?
- What decision is required now?
- Who owns the next action?
- What is blocked?
- What is at risk?

---

## 6. Required Dashboard Modules (v1)

### 6.1 Pipeline & Stage Control

- Each client exists in exactly one stage:
  1. Lead Captured
  2. Qualified
  3. Discovery Completed
  4. Internal Review
  5. Proposal Sent
  6. Closed
  7. Onboarding
  8. Active Delivery
  9. Complete / Transition

- Stage skipping is prohibited without escalation
- Stage changes must be logged

---

### 6.2 Client Record (Single Source of Truth)

Each client record must include:

- Customer Type
- ICP Level
- Tier
- Budget range
- Decision-maker
- Risk flags
- Trust score
- Active SOP
- Assigned human roles
- AI-generated outputs (read-only)

---

### 6.3 Decision Queue (Founder View)

A dedicated queue for:

- Pricing exceptions
- Scope change requests
- Risk escalations
- Tier upgrades
- Client friction flags

If this queue is empty, the system is healthy.

---

### 6.4 Delivery Command Center (Per Client)

Shows:

- Active SOP step
- Completed steps
- Blockers
- Missing inputs
- Timeline drift
- Client responsiveness

Prevents status ambiguity and reactive firefighting.

---

### 6.5 AI Activity Log (Read-Only)

Tracks:

- Which agent executed
- When it ran
- What it produced
- What it flagged
- What it escalated

Purpose: auditability and trust.

---

### 6.6 Metrics & System Health

Track only non-vanity metrics:

- Lead → Discovery conversion
- Discovery → Proposal rate
- Proposal → Close rate
- Time per stage
- ICP A vs B mix
- Escalation frequency
- Average delivery duration

Metric drift indicates upstream failure.

---

## 7. Operational Flow (Reality Check)

1. Lead enters → AI classifies → human reviews
2. Discovery occurs → AI structures → human interprets
3. Proposal drafted → human approves → sent
4. Client closes → onboarding auto-triggers
5. Delivery SOP activates → AI tracks → human leads
6. Issues escalate → founder decides → system resumes

No undocumented work. No invisible decisions.

---

## 8. Validation Questions (Must Be Answered)

### 8.1 Capacity & Scale

- Max concurrent clients per Delivery Lead?
- Revenue threshold for second Delivery Lead?
- Signals for Tier 2 → Tier 3 transition?

### 8.2 Risk & Control

- Maximum acceptable exception rate?
- When does a "good client" become a system risk?
- Kill-switch criteria for bad engagements?

### 8.3 AI Governance

- Which agent failures require immediate human review?
- What data is strictly read-only for AI?
- Prompt audit frequency?

### 8.4 Productization

- Which dashboard modules become client-facing later?
- Which remain internal forever?
- Boundary between Merchously Agency vs future SaaS?

---

## 9. Final Principle

Merchously is not building:

- A generic CRM
- An automation playground
- An AI demo

Merchously is building a **decision-safe operating system** where:

- Humans decide
- AI assists
- Systems enforce discipline

Any implementation that violates this principle must be corrected or escalated.

---

**End of Document**

