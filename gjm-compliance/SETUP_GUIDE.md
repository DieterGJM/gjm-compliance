# GJM Ultra Brokers — Compliance Portal
## Deployment & Setup Guide

---

## What This App Does

A POPIA-compliant compliance management portal for GJM Ultra Brokers that:

- ✅ Generates all 5 FICA/FAIS compliance documents per client session
- ✅ Supports **Natural Persons** and **Legal Entities**
- ✅ Pre-fills shared client details (name, ID, address) across all selected docs
- ✅ Auto-calculates Client Risk Profile score (8 factors) with override option
- ✅ Warns on TFS / Foreign PEP / PIP flags (non-blocking, advisor proceeds manually)
- ✅ Downloads each document as **Word (.docx)** or **PDF**
- ✅ **Role-based login**: Advisor vs Compliance Officer
- ✅ **Zero client data stored on any server** — fully POPIA compliant

---

## POPIA Compliance Architecture

> **No personal data ever leaves the browser.**

- Client details are stored in React component state only (RAM)
- Documents are generated entirely in the browser using `docx` and `jsPDF`
- On session end / page close, all data is automatically discarded
- Supabase is used **only** for authentication (staff email/password login)
- No client names, IDs, addresses, or financial data touch Supabase or Netlify servers

---

## Step 1: Supabase Setup

1. Go to **https://supabase.com** → Create a free account
2. Click **"New project"** → Name it `gjm-compliance`
3. Set a strong database password (save it securely)
4. Wait for the project to provision (~1 min)

### Get your keys:
- Go to **Settings → API**
- Copy **Project URL** → `VITE_SUPABASE_URL`
- Copy **anon / public key** → `VITE_SUPABASE_ANON_KEY`

### Create users:
1. Go to **Authentication → Users → Add User**
2. Add each advisor with their email + a password
3. To assign roles, go to the user → **Edit** → Add to User Metadata:
   ```json
   { "role": "advisor" }
   ```
   Or for the compliance officer (Tanya):
   ```json
   { "role": "compliance_officer" }
   ```

### Disable public sign-ups (important for security):
- Go to **Authentication → Providers → Email**
- Turn OFF **"Enable email confirmations"** (optional, for easier onboarding)
- Go to **Authentication → Settings** → Turn OFF **"Enable Sign Ups"**
  *(This means only you can add users from the dashboard — no public registration)*

---

## Step 2: Deploy to Netlify

### Option A: Deploy from GitHub (recommended)

1. Upload the project folder to a GitHub repo
2. Go to **https://app.netlify.com** → **"Add new site" → "Import from Git"**
3. Connect GitHub and select the repo
4. Build settings (auto-detected):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Click **"Add environment variables"** and add:
   ```
   VITE_SUPABASE_URL      = https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY = your-anon-key
   ```
6. Click **Deploy site**

### Option B: Drag & Drop Deploy

1. On your computer, open a terminal in the project folder
2. Run:
   ```bash
   npm install
   npm run build
   ```
3. This creates a `dist/` folder
4. Go to **https://app.netlify.com** → drag the `dist/` folder onto the deploy zone

---

## Step 3: Set a Custom Domain (optional)

In Netlify → **Domain settings** → Add your domain (e.g. `compliance.gjmultrabrokers.co.za`)

---

## Step 4: Local Development

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local and add your Supabase URL and anon key

# Start development server
npm run dev
# Opens at http://localhost:5173
```

---

## Documents Generated

| Document | Regulation | When to Use |
|---|---|---|
| Onboarding Questionnaire | FICA Section 21 | All new clients; existing clients not seen in 36+ months |
| Ongoing Due Diligence | FICA Section 22 | Periodic review of existing clients |
| Transactional DD | FICA Section 22 | Each new transaction or policy change |
| RA Calculation | FAIS — Suitability | Retirement annuity proposals |
| FNA Calculator | FAIS Section 8 | Full financial needs analysis / Record of Advice |

---

## User Roles

| Role | Access | Set In |
|---|---|---|
| `advisor` | Create sessions, generate documents | Supabase user metadata |
| `compliance_officer` | Same as advisor + CO badge displayed | Supabase user metadata |

Pre-configured users:
- **Dieter Hartig** — Advisor
- **Tanya Van Niekerk** — Compliance Officer

---

## Risk Score Reference

| Score | Band | Action |
|---|---|---|
| 0 – 8 | LOW RISK | Standard onboarding |
| 9 – 16 | MEDIUM RISK | Additional documentation may be required |
| 17+ | HIGH RISK | Must be signed off by Compliance Officer (Tanya Van Niekerk) |

---

## Important Compliance Notes

1. **TFS List** — If a client appears on the Targeted Financial Sanctions list, the app shows a warning. You must refer to Tanya immediately before proceeding.
2. **PEP/PIP** — Foreign PEP triggers a warning. Complete the relevant questionnaire before proceeding.
3. **36-Month Rule** — If it has been more than 36 months since the last questionnaire, a new Onboarding Questionnaire is required.
4. **High-Risk Clients** — Documents generated for high-risk clients (score 17+) require physical sign-off by Tanya Van Niekerk before filing.
5. **Document Retention** — Print and store signed documents in your secure filing system. The portal does not retain copies.

---

## Support

For technical issues with the portal, contact your IT administrator.
For FICA/FAIS compliance queries, contact Tanya Van Niekerk.
