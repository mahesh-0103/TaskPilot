# 🛰️ TaskPilot

**The Sovereign Executive Layer for Autonomous Workflow Execution.**

TaskPilot is an intelligent command center that transforms unstructured meeting data into structured, self-healing workflow engines. It functions as a digital Chief of Staff, proactively identifying mission-critical objectives and ensuring project continuity through autonomous neural manifesting.

---

### 🧠 Core Intelligence Systems

*   **⚡ Neural Manifesting**: Leverages a "Competitive Race" between **Gemini 1.5 Flash** and **Mistral Large** to extract tasks, owners, and deadlines with sub-second latency.
*   **♻️ Self-Healing Engine**: Real-time trajectory monitoring. When a bottleneck or delay is detected, TaskPilot autonomously recalibrates dependencies and reassigns priorities to protect the mission timeline.
*   **📡 Orbital Synchronization**: Seamless projection of objectives to the cloud via **Google Calendar** and **Gmail** notifications, maintaining a persistent strategic presence.
*   **🔐 Sovereign Security**: Built with a "Privacy First" architecture using **Supabase RLS** and local-first state handling for total data ownership.

---

### 🛠️ Technical Architecture

| Component | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Framer Motion |
| **Backend** | FastAPI (Python 3.10+), Pydantic v2 |
| **Intelligence** | Google GenAI (Gemini), Mistral AI |
| **Persistence** | Supabase (PostgreSQL, Auth, RLS) |
| **Deployment** | Vercel (Frontend), Render (Backend) |

---

### 🚀 Rapid Deployment

#### 1. Backend Synchronization
```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\activate | Unix: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

#### 2. Frontend Launch
```bash
cd frontend
npm install
npm run dev -- --port 3000
```

#### 3. Environment Calibration
Configure `.env` files in both the `backend` and `frontend` directories with your **Supabase**, **Google**, and **Mistral** API credentials.

---

*TaskPilot • Your Strategic Executive Layer • v1.2.0 • 2026*
