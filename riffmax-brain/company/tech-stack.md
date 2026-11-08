# ⚙️ Riffmax Technology Architecture & Tech Stack

> **Chief Architect:** [[Tariq Al-Hassan]]  
> **Frontend Lead:** [[Babatunde Adeleke]]  
> **Native Mobile Lead:** [[Chidinma Okonjo]]  
> **SRE Lead:** [[Farouk Bello]]

---

## 🛠️ Technology Foundations

```
┌────────────────────────────────────────────────────────┐
│                   CLIENT SURFACES                      │
│  Vanilla ES2024 PWA · Capacitor Android/iOS Native     │
│  Bento UI Tokens · SignaturePad Canvas · Web Audio API │
├────────────────────────────────────────────────────────┤
│                   APPLICATION CORE                     │
│  Node.js (v24 LTS) ESM Native Server · Zero Frameworks │
│  In-Memory High-Speed Cache · Scrypt-64 Cryptography   │
│  Haversine Geofence Engine · OpenAI GPT-5.6 Handover   │
├────────────────────────────────────────────────────────┤
│                   PERSISTENCE LAYER                    │
│  PostgreSQL (Render Cloud Dedicated Frankfurt Pool)    │
│  Atomic Dev Fallback Store (data/shiftrelay.json)      │
│  Idempotency Key Engine (24-Hour TTL Canonical Finger) │
└────────────────────────────────────────────────────────┘
```

---

## 🛡️ Core Reliability Architectural Pillars
1. **Zero External Runtime Bloat**: Server runtime has minimal external dependencies, maximizing execution speed and minimizing CVE attack surfaces ([[Ngozi Eze]]).
2. **Offline-First Synchronous Resilience**: Service worker cache + IndexedDB offline action queue (`offline-queue.js`) ensures staff can log handovers without connectivity ([[Chidinma Okonjo]]).
3. **Strict Zero-Trust Multi-Tenancy**: Every database query is tenant-scoped by `organisation_id` = `00000000-0000-4000-8000-000000000100` ([[Tariq Al-Hassan]]).

---

## 🔗 Department Linkages
- [[Engineering Core]]
- [[DevOps & Site Reliability]]
- [[Security & QA Fortress]]
