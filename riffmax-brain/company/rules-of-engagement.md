# ⚖️ Riffmax Operational Rules of Engagement & Anti-Farming Policy

> **Compliance Authority:** [[Folake Balogun]]  
> **Shift Supervisor:** [[Olaide Emmanuela]]  
> **Enforcing Officer:** [[Ngozi Eze]]

---

## 1. Single Daily Shift Rule (Anti-Farming Attendance Guard)
- To eliminate duplicate attendance manipulation and artificial reward star farming, staff members are permitted exactly **ONE** valid Clock-In $\rightarrow$ Shift Handover $\rightarrow$ Clock-Out sequence per calendar day.
- Subsequent punch attempts within 14 hours of an active shift trigger an automatic rate-limit flag: `ATTENDANCE_PUNCH_COOLDOWN_ACTIVE`.

## 2. Geofence Precision Protocol
- Work punches must match the GPS perimeter of the Victoria Island / Lekki Tech Hub (`6.4312° N, 3.4244° E`, radius `120m`).
- Any punch recorded beyond 120 meters is recorded as `outside_geofence_flagged` and requires dual-supervisor clearance by [[Olaide Emmanuela]].

## 3. Mandatory Handover Prior to Clock-Out
- No outgoing shift lead or technician may clock out without an approved, structured shift handover record logged to `/api/handovers`.
- The handover must state bay status, ongoing tasks, safety incidents, and assigned incoming specialist.

---

## 🔗 Related References
- [[Handovers]]
- [[Product & Regulatory Compliance]]
- [[Executive Morning Briefings]]
