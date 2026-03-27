# TaskPilot – Executive Autonomous Workflow Execution System

**The Digital Chief of Staff for Modern Intelligence.**

TaskPilot transforms unstructured meeting transcripts into structured, actionable strategies. It doesn’t just show you a list; it sequences objectives, monitors progress, and self-heals in the face of delays.

## 🚀 Vision
Built for precision and speed, TaskPilot uses a tiered intelligence layer (LLMs) and a premium "Soft UI" aesthetic to manage your team’s most critical objectives.

- **Synthesis**: Neural extraction of tasks, owners, and deadlines.
- **Strategic Blueprint**: Intelligent sequencing via directed acyclic graphs.
- **Self-Healing**: Autonomous recalibration when objectives are compromised.
- **Cloud Presence**: Google Calendar & Gmail integration out of the box.

## 🛠 Strategic Architecture
- **Frontend**: React 18, Vite, Framer Motion, Tailwind (Inter & Instrument Serif).
- **Backend**: FastAPI (Python 3.10+), Pydantic v2.
- **Persistence**: Supabase (RLS enabled), PostgreSQL.

## 📦 Getting Started

### 1. Prerequisites
- Node.js 18+
- Python 3.10+
- Supabase Account

### 2. Environment Setup
Create a `.env` in the root (and backend/frontend) with:
```env
SUPABASE_URL=YOUR_URL
SUPABASE_KEY=YOUR_SERVICE_ROLE_KEY
VITE_SUPABASE_URL=YOUR_URL
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

### 3. Tactical Launch
**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---
*TaskPilot – Your Strategic Executive Layer • v1.2.0 • 2026*
