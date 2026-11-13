// ShiftRelay Canonical Multi-Industry Blueprint Engine
// Supplies tailored safety regulations, tax/statutory rules, workflows, handover checklists,
// incident categories, facility zones, department analytics, and optimization ideas per sector.

export const INDUSTRY_PROFILES = {
  tech: {
    key: 'tech',
    label: 'Technology, SaaS & Software Engineering',
    shortLabel: 'Technology & Software',
    aliases: ['tech', 'technology', 'software', 'saas', 'deeptech', 'fintech', 'it', 'cloud', 'engineering', 'ai', 'data', 'enterprise saas', 'enterprise saas & workforce deeptech'],
    defaultHubName: 'Engineering & Operations Hub',
    stationPlaceholder: 'Core Engineering Bay',
    telemetryLabel: 'Cloud & SLA Health',
    telemetryValue: '99.98% Uptime · Primary Region Nominal',
    perimeterLabel: 'Badge / Geo-Verified HQ Access',
    checklistLabel: 'Pre-Shift Readiness & Security Verified',
    skillsPlaceholder: 'e.g. Incident Triage, CI/CD Release Ops, NDPA Privacy Audit',
    defaultSkillSuggestions: [
      'Incident Triage & On-Call', 'CI/CD Deployment', 'SOC 2 Access Review',
      'NDPA Data Governance', 'Cloud Infrastructure SRE', 'API Observability',
      'QA Release Sign-Off', 'Customer Escalation Lead', 'Security Patch Audit'
    ],
    defaultRoleTitle: 'Systems Operations Specialist',
    units: [
      { unit: 'Core Engineering', headcount: 68, attendancePercent: 98.1, overtimeHours: 24, status: 'On Track' },
      { unit: 'Cloud & SRE Ops', headcount: 42, attendancePercent: 98.8, overtimeHours: 31, status: 'On Track' },
      { unit: 'QA & AppSec', headcount: 34, attendancePercent: 97.4, overtimeHours: 14, status: 'On Track' },
      { unit: 'Product & Design', headcount: 29, attendancePercent: 96.9, overtimeHours: 8, status: 'On Track' },
      { unit: 'Customer & Field Ops', headcount: 38, attendancePercent: 95.8, overtimeHours: 19, status: 'Monitor' }
    ],
    defaultHandoverSummary: 'On-Call SRE & Engineering Shift Handoff Complete',
    defaultHandoverNotes: 'API latency P99 holding at 112ms. Zero Sev-1 alerts open. Staging build #418 verified for morning release window.',
    tasks: [
      { id: 'task-tech-sre', text: 'Cloud Health, Error Budget & PagerDuty On-Call Escalation Review', priority: 'urgent', done: true },
      { id: 'task-tech-sec', text: 'Zero-Trust Access Audit, SSH Key Rotation & Endpoint Lock Check', priority: 'urgent', done: false },
      { id: 'task-tech-rel', text: 'CI/CD Release Queue, Migration Freeze & Rollback Readiness Check', priority: 'normal', done: false },
      { id: 'task-tech-ndpa', text: 'NDPA Data Privacy Ticket Queue & Customer SLA Triage Handoff', priority: 'normal', done: false }
    ],
    handoverChecklist: {
      supervisor: [
        'I reviewed open Sev-1/Sev-2 incidents, security alerts, and SLA risks.',
        'Every active deployment, hotfix, or support ticket has an assigned owner and ETA.',
        'Cloud credentials, staging environments, and on-call tooling are verified ready.',
        'The incoming engineer or ops specialist has a clear escalation runbook.'
      ],
      incoming: [
        'I understand active release windows, open incident tickets, and SLA priorities.',
        'I completed my pre-shift workstation security, MFA, and on-call pager readiness check.',
        'I know the owner, deadline, and escalation path for unresolved engineering issues.',
        'I accept responsibility for the listed shift actions.'
      ]
    },
    incidentCategories: [
      'Production Outage / Sev-1',
      'Data Privacy / Security Event',
      'API Latency / Degradation',
      'Access / Authentication Failure',
      'Workstation / Hardware Fault',
      'Customer SLA Breach Risk'
    ],
    zones: [
      { id: 'zone_a', name: 'Bay A · Core Systems & Release Desk', type: 'Engineering & Deployments', tasks: ['CI/CD pipeline green check', 'Production error-rate audit'], hasFlag: false },
      { id: 'zone_b', name: 'Bay B · Cloud NOC & Incident Command', type: 'SRE & Observability', tasks: ['Database failover latency check', 'On-call pager transition sign-off'], hasFlag: false },
      { id: 'zone_c', name: 'Bay C · QA & AppSec Verification Lab', type: 'Security & Compliance', tasks: ['NDPA access log spot check', 'Staging regression verification'], hasFlag: false }
    ],
    safetyRegulations: [
      { authority: 'NDPC (Nigeria Data Protection Act)', title: 'NDPA Customer & Employee Data Access Logging & Breach 72h Protocol', progress: 100, status: 'completed', dueDate: 'Continuous' },
      { authority: 'SOC 2 Type II / ISO 27001', title: 'Production Least-Privilege Access & Quarterly Token Rotation Audit', progress: 96, status: 'at_risk', dueDate: 'End of Quarter' },
      { authority: 'NITDA & Workstation Ergonomics', title: 'DSE Eye-Strain Breaks & 12-Hour On-Call Post-Incident Recovery Window', progress: 98, status: 'completed', dueDate: 'Continuous' }
    ],
    taxAndStatutory: [
      { code: 'PAYE / Finance Act', title: 'Progressive PAYE Tax & Consolidated Relief Allowance (LIRS / State IRS)', rate: 'Statutory Bracket' },
      { code: 'PenCom + NSITF + NHF', title: 'Contributory Pension (8% Emp / 10% Er), 1% NSITF & 2.5% NHF', rate: '21.5% Total Base' },
      { code: 'WHT (5%–10%)', title: 'Withholding Tax on External Technical & Software Contractors', rate: '5% Ind / 10% Corp' },
      { code: 'VAT & NITDA Levy', title: 'FIRS 7.5% VAT on SaaS Invoicing & 1% NITDA Tech Development Levy (≥₦100M)', rate: '7.5% VAT / 1% CIT' }
    ],
    suggestedIdeas: [
      { title: 'Automated On-Call Recovery Credits', impact: 'Retention & Fatigue', detail: 'Grant automatic comp-time recovery hours when engineers resolve overnight Sev-1 incidents past 00:00.' },
      { title: 'Separate WHT Contractors vs PAYE Staff', impact: 'Tax Accuracy', detail: 'Route freelance DevOps/UI consultants into 5%/10% WHT schedules instead of salaried PenCom payroll runs.' },
      { title: 'Two-Person Production Deploy Gate', impact: 'SLA Protection', detail: 'Block major schema migrations when on-shift NOC coverage drops below two active responders.' }
    ]
  },

  restaurant: {
    key: 'restaurant',
    label: 'Restaurants, QSR & Fast Food',
    shortLabel: 'Restaurants & Fast Food',
    aliases: ['restaurant', 'restaurants', 'fast food', 'qsr', 'food', 'food_beverage', 'catering', 'dining', 'bakery', 'kitchen', 'cafe', 'eatery'],
    defaultHubName: 'Flagship Kitchen & Dining Branch',
    stationPlaceholder: 'Hot Line & Front Counter',
    telemetryLabel: 'Cold Chain & Kitchen Temp',
    telemetryValue: 'Chiller 3.1°C · Freezer -18.4°C',
    perimeterLabel: 'Kitchen & Counter POS Terminal',
    checklistLabel: 'Hygiene, Temp Log & Food Prep Verified',
    skillsPlaceholder: 'e.g. HACCP Food Safety, Grill Line, POS & Delivery Triage',
    defaultSkillSuggestions: [
      'HACCP Cold Chain', 'Allergen Protocol', 'Grill & Fryer Line',
      'Barista & Beverage POS', 'FIFO Stock Rotation', 'Food Handler Hygiene',
      'Drive-Thru Expediting', 'Walk-In Chiller Audit', 'Shift Close Reconciliation'
    ],
    defaultRoleTitle: 'Shift Kitchen & Service Lead',
    units: [
      { unit: 'Hot Line & Grill', headcount: 46, attendancePercent: 96.4, overtimeHours: 36, status: 'On Track' },
      { unit: 'Prep & Cold Kitchen', headcount: 34, attendancePercent: 97.2, overtimeHours: 18, status: 'On Track' },
      { unit: 'Front Counter & POS', headcount: 52, attendancePercent: 95.1, overtimeHours: 29, status: 'On Track' },
      { unit: 'Dispatch & Delivery', headcount: 28, attendancePercent: 94.0, overtimeHours: 22, status: 'Monitor' },
      { unit: 'Stewarding & Stores', headcount: 24, attendancePercent: 96.8, overtimeHours: 14, status: 'On Track' }
    ],
    defaultHandoverSummary: 'Morning Kitchen Prep, Cold-Chain Temp Log & POS Float Cleared',
    defaultHandoverNotes: 'Walk-in chiller verified at 3.1°C. Sanitizer concentration strips passed. Lunch rush par trays prepped and allergen boards color-coded.',
    tasks: [
      { id: 'task-qsr-temp', text: 'Walk-In Chiller (0–4°C) & Freezer (-18°C) Temperature Probe Log', priority: 'urgent', done: true },
      { id: 'task-qsr-hygiene', text: 'Kitchen Hairnet, Apron, Handwash Station & Food-Safe Sanitizer Check', priority: 'urgent', done: false },
      { id: 'task-qsr-allergen', text: 'Allergen Cutting-Board Segregation & Fryer Oil Quality Audit', priority: 'normal', done: false },
      { id: 'task-qsr-pos', text: 'Front Counter POS Float Count & Delivery Aggregator Tablet Sync', priority: 'normal', done: false }
    ],
    handoverChecklist: {
      supervisor: [
        'I reviewed cold-chain temperatures, allergen alerts, and customer service incidents.',
        'Every prep par level, delivery queue, and cleaning zone has an assigned owner.',
        'Ingredients, fryer stations, POS floats, and food-safety PPE are stocked and ready.',
        'The incoming shift lead has a clear escalation path to the store manager.'
      ],
      incoming: [
        'I understand prep par levels, expiring FIFO batches, and urgent kitchen tasks.',
        'I completed handwash hygiene, apron/hairnet, and workstation sanitization checks.',
        'I know the owner, prep deadline, and escalation path for equipment or order issues.',
        'I accept responsibility for the listed shift actions.'
      ]
    },
    incidentCategories: [
      'Cold-Chain / Temp Excursion',
      'Allergen / Food Safety Alert',
      'Kitchen Burn / Slip Hazard',
      'Oven / Chiller Equipment Fault',
      'POS / Delivery Tablet Outage',
      'Stock Spoilage / Pest Alert'
    ],
    zones: [
      { id: 'zone_a', name: 'Zone A · Hot Line & Grill', type: 'Cooking & Expediting', tasks: ['Core food temp spot check (≥75°C)', 'Extractor hood & grease trap check'], hasFlag: false },
      { id: 'zone_b', name: 'Zone B · Front Counter & Dispatch', type: 'POS & Guest Service', tasks: ['Till float & contactless sync', 'Delivery rider holding bay sweep'], hasFlag: false },
      { id: 'zone_c', name: 'Zone C · Walk-In Chiller & Dry Store', type: 'HACCP Storage', tasks: ['FIFO expiry sticker verification', 'Chiller door seal & temp log'], hasFlag: true }
    ],
    safetyRegulations: [
      { authority: 'NAFDAC & Food Safety Board', title: 'Semi-Annual Food Handler Medical Clearance & Allergen Labeling Audit', progress: 98, status: 'completed', dueDate: 'Continuous' },
      { authority: 'HACCP / Cold-Chain Standard', title: '3x Daily Walk-In Chiller & Hot-Holding CCP Temperature Verification', progress: 95, status: 'at_risk', dueDate: 'Daily' },
      { authority: 'State Safety Commission', title: 'Ansul Hood Fire Suppression & Non-Slip Kitchen Footwear Check', progress: 100, status: 'completed', dueDate: 'Monthly' }
    ],
    taxAndStatutory: [
      { code: 'PAYE / PenCom / NSITF', title: 'Employee PAYE Tax + 18% Pension + 1% NSITF Injury Cover + 2.5% NHF', rate: 'Standard Payroll' },
      { code: 'State Consumption Tax', title: 'Hotel Occupancy & Restaurant Consumption Tax (e.g. LIRS 5% on Dining)', rate: '5% State Levy' },
      { code: 'FIRS VAT (7.5%)', title: 'Value Added Tax on Prepared Meals & Packaged Takeaway Beverages', rate: '7.5% Output VAT' },
      { code: 'Service Tip Pool Audit', title: 'Equitable Distribution of Customer Service Charge Tied to Verified Hours', rate: 'Audit Trail' }
    ],
    suggestedIdeas: [
      { title: 'Clopening Shift Prevention Rule', impact: 'Staff Retention', detail: 'Block scheduling software from assigning closing cashiers (23:30) onto 06:30 breakfast openings.' },
      { title: 'Peak Prep Overlap Blocks', impact: 'Ticket Speed', detail: 'Schedule two floating prep cooks across 11:30–14:30 to prevent lunch-rush grill bottlenecks.' },
      { title: 'Automated Temperature Exception Alerts', impact: 'Zero Spoilage', detail: 'Escalate any fridge reading above 5°C straight to Store Manager & Executive Governance.' }
    ]
  },

  gas_station: {
    key: 'gas_station',
    label: 'Gas Stations, Petrol & Fuel Retail',
    shortLabel: 'Gas Stations & Fuel Retail',
    aliases: ['gas_station', 'gas station', 'petrol', 'fuel', 'filling station', 'energy retail', 'lpg', 'cng', 'downstream', 'oil and gas'],
    defaultHubName: 'Forecourt & Fuel Retail Station',
    stationPlaceholder: 'Forecourt Island & Canopy',
    telemetryLabel: 'ATG Tank Stock Telemetry',
    telemetryValue: 'PMS 82% · AGO 74% · Vapour Safe',
    perimeterLabel: 'Forecourt Canopy & Cash Vault Gate',
    checklistLabel: 'Forecourt Fire & Anti-Static Readiness Verified',
    skillsPlaceholder: 'e.g. Forecourt Dispensing, Wet-Stock Dipping, LPG Safety',
    defaultSkillSuggestions: [
      'Forecourt Fire Safety', 'Wet-Stock Tank Dipping', 'ATG Gauge Telemetry',
      'LPG Cylinder Safety', 'Tanker Offload Grounding', 'Pump Totalizer Audit',
      'C-Store POS Cashier', 'Oil-Water Separator Check', 'Spill Kit Response'
    ],
    defaultRoleTitle: 'Forecourt Attendant & Station Lead',
    units: [
      { unit: 'Forecourt Dispensers', headcount: 48, attendancePercent: 97.6, overtimeHours: 34, status: 'On Track' },
      { unit: 'LPG & Cylinder Bay', headcount: 18, attendancePercent: 98.4, overtimeHours: 10, status: 'On Track' },
      { unit: 'Wet-Stock & Tank Dipping', headcount: 14, attendancePercent: 99.0, overtimeHours: 8, status: 'On Track' },
      { unit: 'Convenience Mart & POS', headcount: 32, attendancePercent: 95.5, overtimeHours: 21, status: 'On Track' },
      { unit: 'Night Security & Cash Vault', headcount: 20, attendancePercent: 96.1, overtimeHours: 16, status: 'Monitor' }
    ],
    defaultHandoverSummary: 'Forecourt Pump Totalizers Balanced & ATG Underground Tanks Verified',
    defaultHandoverNotes: 'Morning dip matched ATG electronic gauge within ±12L tolerance. Extinguisher pins intact across Islands 1–4. Cash drop vaulted.',
    tasks: [
      { id: 'task-gas-atg', text: 'Underground Tank Wet-Stock Dip vs ATG Telemetry & Pump Totalizer Check', priority: 'urgent', done: true },
      { id: 'task-gas-fire', text: 'Forecourt Fire Extinguishers, Sand Buckets & Emergency Shutoff Button Test', priority: 'urgent', done: false },
      { id: 'task-gas-static', text: 'Anti-Static Cotton Attire, Tanker Grounding Clamp & Zero-Flame Sweep', priority: 'urgent', done: false },
      { id: 'task-gas-cash', text: 'POS Card Batch Settlement, Vault Cash Drop & Forecourt Spill Kit Inspection', priority: 'normal', done: false }
    ],
    handoverChecklist: {
      supervisor: [
        'I reviewed wet-stock tank dips, hydrocarbon spill logs, and fire suppression readiness.',
        'Every pump island, LPG cage, and convenience till has an assigned attendant and float.',
        'Emergency shutoff switches, grounding leads, and fire extinguishers are clear and ready.',
        'The incoming station team has an immediate emergency escalation route.'
      ],
      incoming: [
        'I recorded opening pump meter totalizers and reviewed active tanker offload warnings.',
        'I verified anti-static uniform compliance, zero-ignition rules, and extinguisher placement.',
        'I know the emergency shutoff location, station manager contact, and cash drop limit.',
        'I accept responsibility for the listed shift actions.'
      ]
    },
    incidentCategories: [
      'Hydrocarbon / Fuel Spill',
      'Static / Flame / Vapour Hazard',
      'Dispenser / Nozzle / ATG Fault',
      'Tanker Offload Volume Variance',
      'Forecourt Vehicle Collision',
      'POS / Vault Cash Discrepancy'
    ],
    zones: [
      { id: 'zone_a', name: 'Zone A · Forecourt Islands & Dispensers', type: 'Fuel Retail & Metering', tasks: ['Opening pump totalizer photo log', 'Breakaway hose & nozzle seal check'], hasFlag: false },
      { id: 'zone_b', name: 'Zone B · Underground Tank & LPG Bay', type: 'ATG & Hydrocarbon Storage', tasks: ['Morning manual dip vs ATG reading', 'Vapour vent & oil separator check'], hasFlag: false },
      { id: 'zone_c', name: 'Zone C · Convenience Mart & Cash Office', type: 'C-Store & Vaulting', tasks: ['Vault drop envelope verification', 'POS network & EFT settlement'], hasFlag: false }
    ],
    safetyRegulations: [
      { authority: 'NMDPRA (Downstream Petroleum Regulator)', title: 'Retail Station Operating License, Pressure Vessel & Metering Calibration Audit', progress: 99, status: 'completed', dueDate: 'Annual Renewal' },
      { authority: 'Federal Fire Service & Safety Board', title: 'Weekly Foam Extinguisher, Dry Sand Bucket & Emergency Shutoff Drill', progress: 94, status: 'at_risk', dueDate: 'Monthly' },
      { authority: 'NESREA Environmental Compliance', title: 'Oil-Water Interceptor Cleaning & Spill Absorbent Kit Readiness', progress: 100, status: 'completed', dueDate: 'Continuous' }
    ],
    taxAndStatutory: [
      { code: 'PAYE / PenCom / NSITF', title: 'Forecourt Staff PAYE + 18% PenCom + 1% Hazardous-Duty NSITF Cover', rate: 'Standard Payroll' },
      { code: 'Fuel vs C-Store VAT Split', title: 'Exempt Petroleum Motor Spirit Tracking vs 7.5% VAT on Lubricants & Mart Sales', rate: '7.5% C-Store VAT' },
      { code: 'NMDPRA & Municipal Levies', title: 'Annual Downstream Retail Permit, Signage & Environmental Levy Provision', rate: 'Annual Schedule' }
    ],
    suggestedIdeas: [
      { title: 'Mandatory Meter Totalizer Photo Handover', impact: 'Loss Prevention', detail: 'Require outgoing attendants to upload pump meter closing photos to eliminate unrecorded shrinkage.' },
      { title: 'Automatic Vault Safe-Drop Alerts', impact: 'Cash Security', detail: 'Trigger supervisor notification whenever island cash accumulation exceeds station safe threshold.' },
      { title: 'Night Canopy Fatigue Rotation', impact: 'Forecourt Safety', detail: 'Cap solo late-night LPG/pump shifts at 10 hours with mandatory mid-shift buddy check-ins.' }
    ]
  },

  agriculture: {
    key: 'agriculture',
    label: 'Agricultural Farms & Agribusiness',
    shortLabel: 'Agricultural Farms',
    aliases: ['agriculture', 'agricultural', 'farm', 'farms', 'farming', 'agro', 'agribusiness', 'livestock', 'poultry', 'crop', 'aquaculture', 'estate'],
    defaultHubName: 'Main Farm Estate & Packhouse',
    stationPlaceholder: 'North Field Block & Packhouse',
    telemetryLabel: 'Irrigation & Cold Silo Power',
    telemetryValue: 'Solar Microgrid Online · Silo Humidity 56%',
    perimeterLabel: 'Estate Gatehouse & Field Sector',
    checklistLabel: 'Field Weather, REI & Biosecurity Verified',
    skillsPlaceholder: 'e.g. Safe Agrochemical Spraying, Tractor PTO, Harvest Grading',
    defaultSkillSuggestions: [
      'Tractor & PTO Operation', 'Safe Agrochemical REI', 'Drip Irrigation Ops',
      'Livestock Biosecurity', 'Cold Packhouse Grading', 'Solar Pump Maintenance',
      'Harvest Lot Traceability', 'Heat-Stress Prevention', 'Feed Mill Rationing'
    ],
    defaultRoleTitle: 'Field Operations & Estate Specialist',
    units: [
      { unit: 'Crop & Agronomy Blocks', headcount: 74, attendancePercent: 95.8, overtimeHours: 40, status: 'On Track' },
      { unit: 'Livestock & Poultry', headcount: 38, attendancePercent: 98.2, overtimeHours: 22, status: 'On Track' },
      { unit: 'Tractor & Mechanization', headcount: 24, attendancePercent: 96.5, overtimeHours: 18, status: 'On Track' },
      { unit: 'Cold Packhouse & Silos', headcount: 32, attendancePercent: 97.1, overtimeHours: 16, status: 'On Track' },
      { unit: 'Irrigation & Agro-Inputs', headcount: 22, attendancePercent: 95.0, overtimeHours: 12, status: 'Monitor' }
    ],
    defaultHandoverSummary: 'Morning Irrigation Schedule & Livestock Biosecurity Rounds Complete',
    defaultHandoverNotes: 'Drip manifolds pressurised across Blocks 1–4. Block 3 fungicide Re-Entry Interval clears at 15:00 WAT; warning flags posted.',
    tasks: [
      { id: 'task-agr-rei', text: 'Verify Agrochemical Re-Entry Intervals (REI) & Locked Chemical Store Log', priority: 'urgent', done: true },
      { id: 'task-agr-heat', text: 'Check Field Heat Index, Water Hydration Stations & Sun-Break Schedule', priority: 'urgent', done: false },
      { id: 'task-agr-pto', text: 'Inspect Tractor PTO Safety Shields, Hydraulic Hoses & Drawbar Pins', priority: 'normal', done: false },
      { id: 'task-agr-bio', text: 'Livestock Footbath Disinfectant Replenishment & Cold Packhouse Lot Check', priority: 'normal', done: false }
    ],
    handoverChecklist: {
      supervisor: [
        'I reviewed sprayed plot Re-Entry Intervals (REI), livestock biosecurity, and weather advisories.',
        'Every field block, feeding schedule, and harvest transport run has a clear owner.',
        'Tractors, irrigation pumps, hydration jugs, and chemical store locks are verified ready.',
        'The incoming farm team knows the estate manager escalation route.'
      ],
      incoming: [
        'I understand restricted sprayed zones, livestock quarantine rules, and harvest priorities.',
        'I completed my pre-shift equipment safety check and confirmed hydration/shade breaks.',
        'I know the block supervisor, target completion time, and veterinary escalation line.',
        'I accept responsibility for the listed shift actions.'
      ]
    },
    incidentCategories: [
      'Field Heat Stress / Dehydration',
      'Agrochemical Drift / Exposure',
      'Tractor / PTO / Implement Hazard',
      'Livestock Illness / Biosecurity Breach',
      'Irrigation / Cold Silo Power Fault',
      'Perimeter Fence / Harvest Loss'
    ],
    zones: [
      { id: 'zone_a', name: 'Zone A · Irrigated Crop Blocks', type: 'Field Agronomy', tasks: ['Drip header PSI verification', 'Spray boundary REI flag inspection'], hasFlag: false },
      { id: 'zone_b', name: 'Zone B · Livestock & Biosecurity Barns', type: 'Animal Health & Feed', tasks: ['Boot dip disinfectant check', 'Automated drinker line flush'], hasFlag: false },
      { id: 'zone_c', name: 'Zone C · Harvest Packhouse & Cold Silo', type: 'Post-Harvest Handling', tasks: ['Harvest crate lot tagging', 'Pre-cooler humidity check'], hasFlag: false }
    ],
    safetyRegulations: [
      { authority: 'NESREA & Fed. Ministry of Agriculture', title: 'Locked Agrochemical Inventory & Mandatory Spray Re-Entry Interval (REI)', progress: 97, status: 'completed', dueDate: 'Continuous' },
      { authority: 'Farm Machinery & PTO Standard', title: 'Zero Unshielded Tractor Power-Take-Off (PTO) Shafts & Implement Pin Audit', progress: 93, status: 'at_risk', dueDate: 'Weekly' },
      { authority: 'Agricultural Heat-Index Code', title: 'Early-Morning Heavy Harvest Scheduling & Mandatory Shade/Water Breaks', progress: 100, status: 'completed', dueDate: 'Seasonal' }
    ],
    taxAndStatutory: [
      { code: 'PAYE / PenCom / NSITF', title: 'Permanent Farmhand PAYE, 18% PenCom & 1% NSITF Agricultural Injury Cover', rate: 'Standard Payroll' },
      { code: 'Agricultural Tax Exemption', title: 'Raw Agricultural Produce Zero-Rated / Exempt VAT vs Processed Packaged VAT', rate: 'Exempt Primary' },
      { code: 'Seasonal Day-Labour Roster', title: 'Clean Separation of Daily Harvest Casual Pay vs Monthly Statutory Staff', rate: 'Batch Audit' }
    ],
    suggestedIdeas: [
      { title: 'Dawn Shift Block Rebalancing', impact: 'Output & Safety', detail: 'Shift manual planting and harvest teams to 06:00–11:30 WAT to cut afternoon heat fatigue by 35%.' },
      { title: 'Sprayer Certification Lock', impact: 'HSE Compliance', detail: 'Restrict agrochemical mixing tasks to staff with valid Safe Handling credentials on their profile.' },
      { title: 'Casual vs Salaried Harvest Payroll Split', impact: 'Tax Clarity', detail: 'Tag temporary harvest pickers in separate cost centers so statutory PenCom calculations remain clean.' }
    ]
  },

  transportation: {
    key: 'transportation',
    label: 'Transportation, Fleet & Mobility',
    shortLabel: 'Transportation & Fleet',
    aliases: ['transportation', 'transport', 'fleet', 'transit', 'haulage', 'trucking', 'courier', 'mobility', 'bus', 'carrier'],
    defaultHubName: 'Central Fleet & Dispatch Terminal',
    stationPlaceholder: 'Departure Yard & Dispatch Control',
    telemetryLabel: 'Fleet GPS & Yard Power',
    telemetryValue: '28 Vehicles Online · ELD Synced',
    perimeterLabel: 'Terminal Yard Gate & Dispatch Check-In',
    checklistLabel: 'Pre-Trip DVIR, Licence & Rest Window Verified',
    skillsPlaceholder: 'e.g. Heavy Haulage DVIR, Route Dispatch, Cold-Freight Security',
    defaultSkillSuggestions: [
      'Pre-Trip DVIR Audit', 'Heavy Goods Class-E', 'Hours-of-Service Compliance',
      'Waybill & Manifest Ops', 'Fuel Card Reconciliation', 'GPS Fleet Dispatch',
      'Cargo Tie-Down & Seals', 'Night Convoy Protocol', 'Brake & Tyre Inspection'
    ],
    defaultRoleTitle: 'Fleet Driver & Dispatch Specialist',
    units: [
      { unit: 'Long-Haul Line Drivers', headcount: 64, attendancePercent: 97.4, overtimeHours: 48, status: 'On Track' },
      { unit: 'Urban Express & Shuttle', headcount: 52, attendancePercent: 96.2, overtimeHours: 32, status: 'On Track' },
      { unit: 'Dispatch & Telemetry', headcount: 26, attendancePercent: 98.8, overtimeHours: 14, status: 'On Track' },
      { unit: 'Fleet Workshop & Tyres', headcount: 28, attendancePercent: 95.9, overtimeHours: 20, status: 'On Track' },
      { unit: 'Waybill & Yard Security', headcount: 24, attendancePercent: 94.7, overtimeHours: 16, status: 'Monitor' }
    ],
    defaultHandoverSummary: 'Morning Fleet Dispatch Cleared & Driver Hours-of-Service Verified',
    defaultHandoverNotes: '24 line-haul rigs passed DVIR brake and tyre tread checks. Waybill seals verified on Ibadan & Port Harcourt corridors.',
    tasks: [
      { id: 'task-trn-dvir', text: 'Pre-Trip DVIR Walkaround (Brakes, Tyres, Headlights, Speed Limiter)', priority: 'urgent', done: true },
      { id: 'task-trn-hos', text: 'Verify Driver FRSC Licence Validity & 10-Hour Mandatory Off-Duty Rest', priority: 'urgent', done: false },
      { id: 'task-trn-seal', text: 'Cargo Load Securing, Waybill Manifest Match & Tamper Seal Number Log', priority: 'normal', done: false },
      { id: 'task-trn-fuel', text: 'Starting Odometer Photo, Fuel Card Balance & GPS Tracker Heartbeat Check', priority: 'normal', done: false }
    ],
    handoverChecklist: {
      supervisor: [
        'I reviewed road advisories, open vehicle defects, and driver fatigue / rest windows.',
        'Every active route, breakdown rescue, and cargo manifest has a named dispatcher owner.',
        'Assigned vehicles passed pre-trip DVIR and have valid waybills, extinguishers, and trackers.',
        'The incoming dispatch lead has direct escalation numbers for traffic emergencies.'
      ],
      incoming: [
        'I understand active route ETAs, road hazard alerts, and priority cargo deliveries.',
        'I confirmed my pre-trip vehicle walkaround, valid driver licence, and mandatory rest window.',
        'I know the dispatcher, checkpoint contact, and breakdown escalation protocol.',
        'I accept responsibility for the listed shift actions.'
      ]
    },
    incidentCategories: [
      'Road Incident / Vehicle Collision',
      'Mechanical / Tyre Breakdown',
      'Driver Fatigue / HOS Alert',
      'Cargo Seal / Manifest Variance',
      'Fuel Card / Odometer Mismatch',
      'Route Delay / Security Stop'
    ],
    zones: [
      { id: 'zone_a', name: 'Yard A · Departure & Loading Lane', type: 'Pre-Trip & Waybills', tasks: ['Axle weight & tie-down strap check', 'Tamper seal photo capture'], hasFlag: false },
      { id: 'zone_b', name: 'Bay B · Telemetry & Dispatch Control', type: 'Fleet Command', tasks: ['Live speed-governor alert sweep', 'Driver rest-window clearance'], hasFlag: false },
      { id: 'zone_c', name: 'Bay C · Fleet Tyre & Fuel Pit', type: 'Workshop Readiness', tasks: ['Torque lug-nut spot check', 'Diesel bowser meter audit'], hasFlag: false }
    ],
    safetyRegulations: [
      { authority: 'FRSC (Federal Road Safety Corps)', title: 'Speed Limiter Calibration, Annual Roadworthiness & Reflector Triangle Audit', progress: 98, status: 'completed', dueDate: 'Continuous' },
      { authority: 'Hours-of-Service Fatigue Code', title: '11-Hour Maximum Daily Driving Cap & Minimum 10-Hour Consecutive Rest', progress: 94, status: 'at_risk', dueDate: 'Daily Roster' },
      { authority: 'Fleet Cargo Security Standard', title: 'Dual-Verified Tamper Seal Logging & Night Corridor Convoy Check-Ins', progress: 99, status: 'completed', dueDate: 'Per Trip' }
    ],
    taxAndStatutory: [
      { code: 'PAYE / PenCom / NSITF', title: 'Driver & Dispatcher PAYE + 18% PenCom + 1% NSITF Fleet Transit Cover', rate: 'Standard Payroll' },
      { code: 'Commercial Haulage VAT vs Bus', title: 'FIRS 7.5% VAT on Commercial Freight vs Exempt Public Passenger Transit', rate: '7.5% Freight VAT' },
      { code: 'Trip Allowance & Per-Diem Rule', title: 'Receipted Transit Per-Diem Exclusion vs Taxable Fixed Trip Bonuses', rate: 'PAYE Tagged' }
    ],
    suggestedIdeas: [
      { title: 'Automated HOS Rest Lockout', impact: 'Road Safety', detail: 'Block shift swaps for any driver whose previous trip ended less than 10 hours ago.' },
      { title: 'Odometer-to-Fuel Ratio Watchdog', impact: 'Fuel Savings', detail: 'Flag abnormal L/100km discrepancies directly during closing shift handovers.' },
      { title: 'Tax-Tagged Driver Per-Diem Rules', impact: 'Audit Cleanliness', detail: 'Separate legitimate transit meal receipts from fixed taxable route bonuses in monthly payroll runs.' }
    ]
  },

  healthcare: {
    key: 'healthcare',
    label: 'Healthcare, Hospitals & Clinical Triage',
    shortLabel: 'Healthcare & Clinical',
    aliases: ['healthcare', 'clinical', 'hospital', 'medical', 'clinic', 'pharmacy', 'diagnostic', 'health'],
    defaultHubName: 'Primary Clinical Wing & Triage',
    stationPlaceholder: 'Triage & Inpatient Ward A',
    telemetryLabel: 'Medical Gas & Cold Chain',
    telemetryValue: 'Medical O2 98% · Fridge 4.1°C · UPS Ready',
    perimeterLabel: 'Clinical Wing Badge Terminal',
    checklistLabel: 'SBAR Triage & Clinical Readiness Verified',
    skillsPlaceholder: 'e.g. SBAR Triage, Cold-Chain Pharmacy, BLS Certified',
    defaultSkillSuggestions: [
      'SBAR Clinical Handover', 'Narcotic Vault Audit', 'BLS / ACLS Emergency',
      'Infection Prevention', 'Vaccine Cold-Chain', 'Crash Cart Check',
      'EMR Shift Charting', 'Biohazard Segregation', 'Triage Level 1'
    ],
    defaultRoleTitle: 'Clinical Shift Coordinator',
    units: [
      { unit: 'Emergency & Triage', headcount: 44, attendancePercent: 98.4, overtimeHours: 28, status: 'On Track' },
      { unit: 'Inpatient Nursing', headcount: 72, attendancePercent: 97.6, overtimeHours: 36, status: 'On Track' },
      { unit: 'Pharmacy & Lab', headcount: 34, attendancePercent: 98.1, overtimeHours: 14, status: 'On Track' },
      { unit: 'Biomedical & Sterile', headcount: 22, attendancePercent: 96.5, overtimeHours: 10, status: 'On Track' }
    ],
    defaultHandoverSummary: 'SBAR Clinical Round Completed & Controlled Drug Vault Balanced',
    defaultHandoverNotes: 'ICU Ward B stabilized. Vaccine fridge steady at 4.1°C. Crash cart defibrillator self-test passed.',
    tasks: [
      { id: 'task-med-sbar', text: 'SBAR High-Acuity Patient Alerts, Fall Risks & Allergy Handover Review', priority: 'urgent', done: true },
      { id: 'task-med-vault', text: 'Controlled Drug Register Dual-Signature Count & Vaccine Fridge Check (2–8°C)', priority: 'urgent', done: false },
      { id: 'task-med-cart', text: 'Emergency Crash Cart Seal, Defibrillator & Medical Oxygen PSI Check', priority: 'normal', done: false },
      { id: 'task-med-bio', text: 'Clinical Waste, Sharps Container Seal & Sterile Pack Expiry Audit', priority: 'normal', done: false }
    ],
    handoverChecklist: {
      supervisor: [
        'I reviewed SBAR patient acuity, drug alerts, and biohazard safety notices.',
        'Every high-risk bed, lab stat order, and pharmacy discharge has a clinician owner.',
        'Sterile consumables, oxygen manifold, crash carts, and clinical PPE are ready.',
        'The incoming nurse or clinician has a direct escalation line to the on-call physician.'
      ],
      incoming: [
        'I reviewed SBAR patient statuses, medication timings, and isolation notes.',
        'I verified clinical hygiene, crash cart readiness, and controlled key handoff.',
        'I know the assigned ward doctor, lab deadline, and rapid-response contact.',
        'I accept responsibility for the listed shift actions.'
      ]
    },
    incidentCategories: [
      'Medication / Dosing Near-Miss',
      'Patient Fall / Clinical Escalation',
      'Needlestick / Biohazard Exposure',
      'Cold-Chain / Vaccine Excursion',
      'Medical Oxygen / Equipment Fault',
      'Clinical Ratio / Fatigue Alert'
    ],
    zones: [
      { id: 'zone_a', name: 'Wing A · Emergency & Triage Bay', type: 'Acute Care', tasks: ['Crash cart tamper-seal check', 'O2 cylinder manifold pressure'], hasFlag: false },
      { id: 'zone_b', name: 'Wing B · Pharmacy & Cold Vault', type: 'Dispensing & Narcotics', tasks: ['Controlled drug log double sign-off', 'Reagent fridge 2–8°C trace'], hasFlag: false },
      { id: 'zone_c', name: 'Wing C · Inpatient Recovery Suites', type: 'Ward Care', tasks: ['Isolation PPE cart restock', 'Call-bell response test'], hasFlag: false }
    ],
    safetyRegulations: [
      { authority: 'MDCN / NMCN Clinical Governance', title: 'Verified Nurse-to-Bed Ratio & Structured SBAR Shift Continuity', progress: 98, status: 'completed', dueDate: 'Continuous' },
      { authority: 'HEFAMAA / Biohazard Standard', title: 'Sharps & Infectious Waste Manifesting + Needlestick Post-Exposure Protocol', progress: 95, status: 'at_risk', dueDate: 'Monthly' },
      { authority: 'NAFDAC Vaccine Cold-Chain', title: 'Continuous 2°C–8°C Pharmacy Storage Logging & Backup Generator Failover', progress: 100, status: 'completed', dueDate: 'Daily' }
    ],
    taxAndStatutory: [
      { code: 'PAYE / PenCom / NSITF', title: 'Full-Time Clinical PAYE + 18% PenCom + 1% NSITF Biohazard Injury Cover', rate: 'Standard Payroll' },
      { code: 'Locum Consultant WHT (10%)', title: 'Withholding Tax Tracking for Visiting Specialist Consultants & Surgeons', rate: '10% Contract WHT' },
      { code: 'Medical VAT Exemption', title: 'FIRS Exempt Status on Core Clinical & Prescription Pharmaceutical Supplies', rate: 'VAT Exempt Core' }
    ],
    suggestedIdeas: [
      { title: 'Standardize SBAR Templates in Handover', impact: 'Patient Safety', detail: 'Pre-fill Situation, Background, Assessment, Recommendation blocks to eliminate verbal drop-offs.' },
      { title: 'Separate Locum Doctors from Staff Payroll', impact: 'Tax Compliance', detail: 'Route visiting specialists automatically into 10% WHT consultancy schedules rather than employee PAYE.' },
      { title: 'Enforce Post-Call Rest Windows', impact: 'Clinical Quality', detail: 'Prevent consecutive 12-hour ICU allocations via automated supervisor shift swap locks.' }
    ]
  },

  manufacturing: {
    key: 'manufacturing',
    label: 'Manufacturing & Industrial Plants',
    shortLabel: 'Manufacturing & Industrial',
    aliases: ['manufacturing', 'industrial', 'factory', 'plant', 'production', 'assembly', 'milling', 'processing'],
    defaultHubName: 'Main Production & Assembly Plant',
    stationPlaceholder: 'Production Line & Packaging Floor',
    telemetryLabel: 'Plant Power & Utilities',
    telemetryValue: 'Line Grid + Backup Gen Synced · Compressor 7.2 Bar',
    perimeterLabel: 'Factory Gate & Muster Terminal',
    checklistLabel: 'LOTO, Machine Guard & Plant PPE Verified',
    skillsPlaceholder: 'e.g. LOTO Isolation, PLC Line Calibration, Batch QA',
    defaultSkillSuggestions: [
      'Lockout-Tagout (LOTO)', 'PLC Line Operation', 'ISO 9001 Batch QA',
      'Industrial PPE & HSE', 'Boiler & Compressor Ops', 'Milling & Packaging',
      'Conveyor Calibration', 'Preventive Maintenance', 'Material Hoppers'
    ],
    defaultRoleTitle: 'Production Line Specialist',
    units: [
      { unit: 'Production Lines A/B', headcount: 68, attendancePercent: 97.1, overtimeHours: 42, status: 'On Track' },
      { unit: 'Packaging & Filling', headcount: 54, attendancePercent: 95.8, overtimeHours: 38, status: 'On Track' },
      { unit: 'Quality Assurance', headcount: 31, attendancePercent: 96.3, overtimeHours: 18, status: 'On Track' },
      { unit: 'Plant Maintenance', headcount: 48, attendancePercent: 95.2, overtimeHours: 18, status: 'Monitor' }
    ],
    defaultHandoverSummary: 'Morning Handover: Production Line 2 & Utilities Nominal',
    defaultHandoverNotes: 'Conveyor sensors calibrated cleanly. All emergency-stop interlocks verified. Raw feed stock staged for morning batch.',
    tasks: [
      { id: 'task-mfg-ppe', text: 'Industrial PPE Verification (Steel-Toe Boots, Safety Goggles & High-Vis Vest)', priority: 'urgent', done: true },
      { id: 'task-mfg-loto', text: 'Pre-Shift Lockout-Tagout (LOTO) Clearance & Emergency-Stop Guard Check', priority: 'urgent', done: false },
      { id: 'task-mfg-calib', text: 'Line Speed, Weight Tolerance & QA Batch Traceability Calibration', priority: 'normal', done: false },
      { id: 'task-mfg-util', text: 'Compressor PSI, Backup Generator Fuel & Coolant Pressure Inspection', priority: 'normal', done: false }
    ],
    handoverChecklist: {
      supervisor: [
        'I reviewed LOTO isolations, machine hazards, and safety notices.',
        'Every open maintenance order and batch target has an assigned owner and timing.',
        'Raw materials, line tooling, and required industrial PPE are verified ready.',
        'The incoming operator has a clear plant engineering escalation route.'
      ],
      incoming: [
        'I understand active LOTO locks, batch specs, and outstanding maintenance work.',
        'I completed my pre-shift machine guard and PPE readiness checks.',
        'I know the supervisor, batch deadline, and emergency stop escalation route.',
        'I accept responsibility for the listed shift actions.'
      ]
    },
    incidentCategories: [
      'Machine Guard / LOTO Hazard',
      'Industrial PPE / Safety Violation',
      'Chemical / Coolant Spill',
      'Line Equipment Malfunction',
      'Quality Batch Reject / Defect',
      'Near-Miss'
    ],
    zones: [
      { id: 'zone_a', name: 'Zone A · Receiving & Silo Intake', type: 'Material Staging', tasks: ['Batch intake moisture test', 'Silo level sensor check'], hasFlag: false },
      { id: 'zone_b', name: 'Zone B · Main Production Floor', type: 'Assembly & Processing', tasks: ['Line 2 sensor calibration', 'Emergency-stop guard test'], hasFlag: true },
      { id: 'zone_c', name: 'Zone D · Utilities & Mechanical Plant', type: 'Compressors & Power', tasks: ['Air receiver pressure drain', 'Backup power transfer check'], hasFlag: false }
    ],
    safetyRegulations: [
      { authority: 'Factories Act & Fed. Ministry of Labour', title: 'Lockout-Tagout (LOTO) Zero-Energy State & Machine Interlock Guard Audit', progress: 96, status: 'at_risk', dueDate: 'Monthly' },
      { authority: 'ISO 45001 Occupational Safety', title: 'Industrial PPE Zone Enforcement & Mandatory 12-Hour Shift Recovery', progress: 98, status: 'completed', dueDate: 'Continuous' },
      { authority: 'SON Industrial Standards', title: 'Raw Material Lot Traceability & Calibrated Scale Verification', progress: 100, status: 'completed', dueDate: 'Per Batch' }
    ],
    taxAndStatutory: [
      { code: 'PAYE / PenCom / NSITF', title: 'Plant Payroll PAYE + 18% PenCom + 1% NSITF Industrial Injury Scheme', rate: 'Standard Payroll' },
      { code: 'ITF Training Levy (1%)', title: 'Industrial Training Fund Mandatory 1% Annual Payroll Levy (Reclaimable Training Grants)', rate: '1% Gross Payroll' },
      { code: 'FIRS VAT & Excise', title: '7.5% Output VAT & Applicable Manufactured Goods Excise Filing', rate: '7.5% + Excise' }
    ],
    suggestedIdeas: [
      { title: 'Lockout-Tagout Photo Evidence Gate', impact: 'Zero Machinery Harm', detail: 'Require technicians to attach a photo of personal padlocks removed before handing a line back to ops.' },
      { title: 'Include ITF 1% Levy in Budget Burn', impact: 'Finance Accuracy', detail: 'Track ITF 1% accrual alongside PenCom so Q4 training grant reimbursements are maximized.' },
      { title: 'Rotate High-Noise Line Stations', impact: 'Worker Health', detail: 'Rotate operators between high-decibel packaging and QA benches every 4 hours.' }
    ]
  },

  logistics: {
    key: 'logistics',
    label: 'Logistics, Warehousing & Supply Chain',
    shortLabel: 'Logistics & Warehousing',
    aliases: ['logistics', 'warehouse', 'warehousing', 'supply chain', 'distribution', 'fulfillment', 'fulfilment', 'cargo', 'freight'],
    defaultHubName: 'Central Distribution & Cross-Dock Hub',
    stationPlaceholder: 'Receiving Dock & Racking Floor',
    telemetryLabel: 'Dock & Cold-Chain Power',
    telemetryValue: '12 Dock Bays Active · Cold Vault Nominal',
    perimeterLabel: 'Yard Gate & Dock Badge Check-In',
    checklistLabel: 'MHE Pre-Op & Cargo Seal Readiness Verified',
    skillsPlaceholder: 'e.g. Reach Truck License, WMS Picking, Cold-Chain Seals',
    defaultSkillSuggestions: [
      'Reach Truck / Forklift', 'WMS RF Scanning', 'Cross-Dock Sorting',
      'Waybill & Manifest Audit', 'Pallet Racking Safety', 'Cold-Chain Dock Ops',
      'Cycle Counting', 'Container Loading', 'Hazardous Freight Segregation'
    ],
    defaultRoleTitle: 'Warehouse & Distribution Specialist',
    units: [
      { unit: 'Inbound Receiving', headcount: 42, attendancePercent: 97.6, overtimeHours: 24, status: 'On Track' },
      { unit: 'Pick & Pack Fulfillment', headcount: 68, attendancePercent: 96.4, overtimeHours: 36, status: 'On Track' },
      { unit: 'MHE & Forklift Ops', headcount: 34, attendancePercent: 98.1, overtimeHours: 22, status: 'On Track' },
      { unit: 'Outbound Cross-Dock', headcount: 46, attendancePercent: 95.8, overtimeHours: 30, status: 'Monitor' }
    ],
    defaultHandoverSummary: 'Morning Cross-Dock Wave Cleared & MHE Fleet Charged',
    defaultHandoverNotes: 'All 6 inbound containers tallied against WMS. Cold-chain dock bumpers intact. Priority retail dispatch loaded on Bays 1–3.',
    tasks: [
      { id: 'task-log-mhe', text: 'Forklift & Reach Truck Pre-Op Brake, Horn, Mast & Battery Check', priority: 'urgent', done: true },
      { id: 'task-log-dock', text: 'Loading Bay Wheel Chocks, Dock Locks & High-Vis Pedestrian Separation Check', priority: 'urgent', done: false },
      { id: 'task-log-wms', text: 'RF Barcode Scanner Pool & Inbound/Outbound Waybill Reconciliation', priority: 'normal', done: false },
      { id: 'task-log-rack', text: 'High-Bay Pallet Racking Clear Aisle & Cold-Dock Curtain Seal Audit', priority: 'normal', done: false }
    ],
    handoverChecklist: {
      supervisor: [
        'I reviewed dock congestion, MHE defect tags, and priority carrier cutoffs.',
        'Every urgent container, cycle count, and dispatch wave has an owner and ETA.',
        'Forklifts, RF scanners, high-vis vests, and dock levelers are safe and ready.',
        'The incoming shift lead has direct escalation access to supply chain dispatch.'
      ],
      incoming: [
        'I understand carrier cutoff times, priority waves, and flagged pallets.',
        'I verified MHE pre-op safety, dock wheel chocks, and high-vis compliance.',
        'I know the bay supervisor, dispatch cutoff, and incident escalation line.',
        'I accept responsibility for the listed shift actions.'
      ]
    },
    incidentCategories: [
      'MHE / Forklift Near-Miss',
      'Pallet / Racking Instability',
      'Waybill / Stock Shrinkage',
      'Cold-Chain Dock Excursion',
      'Dock Leveler / Bay Door Fault',
      'Carrier / Dispatch SLA Miss'
    ],
    zones: [
      { id: 'zone_a', name: 'Bay A · Inbound Receiving Dock', type: 'Deconsolidation', tasks: ['Wheel-chock lock engagement', 'Damaged carton quarantine log'], hasFlag: false },
      { id: 'zone_b', name: 'Bay B · High-Bay Racking Aisles', type: 'Storage & Picking', tasks: ['Aisle floor clearance sweep', 'Rack upright impact check'], hasFlag: false },
      { id: 'zone_c', name: 'Bay C · Outbound Dispatch Staging', type: 'Cross-Dock Loading', tasks: ['Carrier manifest scan check', 'Trailer security seal match'], hasFlag: false }
    ],
    safetyRegulations: [
      { authority: 'Warehouse MHE Certification Rule', title: 'Only Valid Certified Operators Permitted on Reach Trucks & Counterbalance Lifts', progress: 100, status: 'completed', dueDate: 'Continuous' },
      { authority: 'NESREA & Supply Chain Safety', title: 'Dangerous Goods Segregation, Spill Containment & Fire Aisle Width Check', progress: 94, status: 'at_risk', dueDate: 'Weekly' },
      { authority: 'ISO 28000 Cargo Integrity', title: 'Dock CCTV Seal Verification & Dual-Signature High-Value Cage Lockup', progress: 99, status: 'completed', dueDate: 'Per Shift' }
    ],
    taxAndStatutory: [
      { code: 'PAYE / PenCom / NSITF', title: 'Warehouse Staff PAYE + 18% PenCom + 1% NSITF Cover + 1% ITF Levy', rate: 'Standard + ITF' },
      { code: 'Freight WHT & Clearing VAT', title: 'Withholding Tax (5%–10%) on Subcontracted Haulage & Bonded Terminal Fees', rate: '5%–10% WHT' },
      { code: 'Demurrage Cost Allocation', title: 'Tag Overtime Surge Hours Directly to Delayed Carrier Demurrage Accounts', rate: 'Cost Audit' }
    ],
    suggestedIdeas: [
      { title: 'Synchronize Loaders to Carrier Slots', impact: 'Overtime Cut', detail: 'Shift afternoon dock staff 2 hours later to match evening port-exit arrivals without overtime.' },
      { title: 'MHE Operator Badge Interlock', impact: 'Yard Safety', detail: 'Require forklift certification on worker profiles before appearing in MHE shift rosters.' },
      { title: 'Auto-Tag High-Value Shrinkage Zones', impact: 'Loss Control', detail: 'Require buddy verification whenever high-shrinkage cage seals are opened during night shifts.' }
    ]
  },

  hospitality: {
    key: 'hospitality',
    label: 'Hospitality, Hotels & Resorts',
    shortLabel: 'Hospitality & Hotels',
    aliases: ['hospitality', 'hotel', 'hotels', 'resort', 'lodging', 'tourism', 'guest service', 'events', 'lounge'],
    defaultHubName: 'Flagship Hotel & Guest Precinct',
    stationPlaceholder: 'Front Desk & Guest Floors',
    telemetryLabel: 'Guest Power & Chiller HVAC',
    telemetryValue: 'Chiller 20.5°C · Dual Power Synchronised',
    perimeterLabel: 'Concierge & Staff Service Entrance',
    checklistLabel: 'Guest Readiness, Key Vault & Hygiene Verified',
    skillsPlaceholder: 'e.g. PMS Night Audit, VIP Concierge, Housekeeping Turnaround',
    defaultSkillSuggestions: [
      'PMS Check-In & Folios', 'VIP Guest Recovery', 'Housekeeping Inspection',
      'Banquet Turnaround', 'Pool Safety & Chlorine', 'Night Audit Closing',
      'Master Keycard Vault', 'Concierge Logistics', 'Preventive Room HVAC'
    ],
    defaultRoleTitle: 'Guest Operations & Hospitality Lead',
    units: [
      { unit: 'Front Desk & Concierge', headcount: 34, attendancePercent: 98.0, overtimeHours: 14, status: 'On Track' },
      { unit: 'Housekeeping & Linen', headcount: 58, attendancePercent: 95.4, overtimeHours: 28, status: 'On Track' },
      { unit: 'Banquet & F&B Service', headcount: 46, attendancePercent: 96.2, overtimeHours: 32, status: 'On Track' },
      { unit: 'Guest Engineering', headcount: 22, attendancePercent: 97.5, overtimeHours: 12, status: 'On Track' }
    ],
    defaultHandoverSummary: 'AM Front Desk Arrivals Briefed & VIP Suite Inspections Passed',
    defaultHandoverNotes: '18 corporate group check-ins staged. Pool pH and chlorine log cleared at 06:30. Master key vault balanced.',
    tasks: [
      { id: 'task-hos-pms', text: 'Review VIP Arrivals, Late Checkouts & Open Guest Service Recovery Tickets', priority: 'urgent', done: true },
      { id: 'task-hos-keys', text: 'Master Keycard Vault Reconciliation & Guest Privacy Folio Check', priority: 'urgent', done: false },
      { id: 'task-hos-hk', text: 'Housekeeping Turnaround Board & Banquet Hall Fire Egress Sweep', priority: 'normal', done: false },
      { id: 'task-hos-eng', text: 'Chiller HVAC, Hot Water Loop & Swimming Pool Chlorine Safety Log', priority: 'normal', done: false }
    ],
    handoverChecklist: {
      supervisor: [
        'I reviewed VIP notes, noise/maintenance complaints, and safety exits.',
        'Every room block, banquet reset, and guest request has a clear owner.',
        'Master keys, housekeeping carts, POS terminals, and pool logs are ready.',
        'The incoming duty team knows the Duty Manager escalation route.'
      ],
      incoming: [
        'I understand today’s occupancy peak, VIP instructions, and pending maintenance.',
        'I verified uniform standards, key vault assignment, and service station setup.',
        'I know the Duty Manager, turnaround cutoff, and guest emergency line.',
        'I accept responsibility for the listed shift actions.'
      ]
    },
    incidentCategories: [
      'Guest Slip / Injury Alert',
      'VIP Service Recovery',
      'Room Keycard / Privacy Issue',
      'Guest HVAC / Plumbing Fault',
      'Banquet Allergen / F&B Alert',
      'Pool / Fire Exit Safety Alert'
    ],
    zones: [
      { id: 'zone_a', name: 'Zone A · Lobby & Front Desk', type: 'Guest Reception', tasks: ['PMS folio audit', 'VIP welcome amenity verify'], hasFlag: false },
      { id: 'zone_b', name: 'Zone B · Guest Wings & Housekeeping', type: 'Rooms & Linen', tasks: ['Corridor emergency exit check', 'Priority room inspection'], hasFlag: false },
      { id: 'zone_c', name: 'Zone C · Banquet & Pool Precinct', type: 'Events & Leisure', tasks: ['Pool pH/chlorine strip check', 'AV & lighting safety walk'], hasFlag: false }
    ],
    safetyRegulations: [
      { authority: 'NTDC & Fire Safety Standards', title: 'Daily Guest Corridor Exit Egress & Emergency Lighting Verification', progress: 99, status: 'completed', dueDate: 'Daily' },
      { authority: 'NDPA Guest Identity Privacy', title: 'Encrypted Passport/NIN Folio Handling & Clean Front-Desk Privacy Screen Policy', progress: 96, status: 'at_risk', dueDate: 'Continuous' },
      { authority: 'Leisure & Pool Safety Code', title: '3x Daily Pool Chlorine/pH Log & Wet Deck Anti-Slip Inspection', progress: 100, status: 'completed', dueDate: 'Daily' }
    ],
    taxAndStatutory: [
      { code: 'PAYE / PenCom / NSITF', title: 'Hospitality Staff PAYE + 18% PenCom + 1% NSITF Cover + 2.5% NHF', rate: 'Standard Payroll' },
      { code: 'Hotel Occupancy Tax (5%)', title: 'State Consumption & Hotel Occupancy Tax Remittance Reconciliation', rate: '5% State Levy' },
      { code: 'VAT (7.5%) & Service Pool', title: 'FIRS 7.5% VAT + Transparent Shift-Weighted 10% Service Charge Distribution', rate: '7.5% VAT + Pool' }
    ],
    suggestedIdeas: [
      { title: 'Shift-Weighted Service Charge Ledger', impact: 'Team Morale', detail: 'Distribute hospitality service charge pools proportionally by verified clocked shift hours.' },
      { title: 'PMS Checkout Surge Staggering', impact: 'Turnaround SLA', detail: 'Schedule housekeeping peak blocks at 10:30–14:30 to accelerate early check-in readiness.' },
      { title: 'Direct Maintenance Ticket Bridge', impact: 'Guest CSAT', detail: 'Route housekeeping room defect flags straight to Guest Engineering with 20-minute response targets.' }
    ]
  },

  retail: {
    key: 'retail',
    label: 'Retail, Supermarkets & Commerce',
    shortLabel: 'Retail & Commerce',
    aliases: ['retail', 'store', 'supermarket', 'shop', 'commerce', 'mall', 'mart', 'boutique', 'merchandising'],
    defaultHubName: 'Flagship Store & Inventory Floor',
    stationPlaceholder: 'Checkout Lanes & Sales Floor',
    telemetryLabel: 'POS Network & EAS Gates',
    telemetryValue: 'All Checkout Lanes Synced · EAS Security Active',
    perimeterLabel: 'Store Stockroom Check-In',
    checklistLabel: 'Till Float, Security Sweep & Floor Verified',
    skillsPlaceholder: 'e.g. POS Reconciliation, Merchandising Planogram, Shrink Control',
    defaultSkillSuggestions: [
      'POS Till Balancing', 'Loss Prevention Sweep', 'FIFO Shelf Rotation',
      'Customer Returns Desk', 'Stockroom Receiving', 'Cold Display Temp Check',
      'Cycle Stock Audit', 'Two-Person Lockup', 'VIP Clienteling'
    ],
    defaultRoleTitle: 'Store Operations Specialist',
    units: [
      { unit: 'Front-End & Cashiers', headcount: 52, attendancePercent: 96.4, overtimeHours: 22, status: 'On Track' },
      { unit: 'Sales Floor Merchandising', headcount: 48, attendancePercent: 95.8, overtimeHours: 16, status: 'On Track' },
      { unit: 'Stockroom & Receiving', headcount: 28, attendancePercent: 97.1, overtimeHours: 19, status: 'On Track' },
      { unit: 'Loss Prevention & Returns', headcount: 18, attendancePercent: 98.2, overtimeHours: 10, status: 'On Track' }
    ],
    defaultHandoverSummary: 'Opening Till Floats Balanced & High-Value Aisle Sweep Complete',
    defaultHandoverNotes: 'Cold display cases steady at 3.5°C. Opening promotional price tags verified across aisles 1–6. Zero night alarms.',
    tasks: [
      { id: 'task-ret-pos', text: 'Count Opening Till Float, Verify Receipt Rolls & POS Card Network Link', priority: 'urgent', done: true },
      { id: 'task-ret-lp', text: 'High-Shrinkage Merchandise Count & Stockroom Fire Exit Clearance Check', priority: 'urgent', done: false },
      { id: 'task-ret-exp', text: 'Chilled Aisle Temp Check & Perishable Date-Code Rotation Sweep', priority: 'normal', done: false },
      { id: 'task-ret-close', text: 'Verify Two-Person Lockup Assignment & Safe Cash Drop Envelope Log', priority: 'normal', done: false }
    ],
    handoverChecklist: {
      supervisor: [
        'I reviewed till variances, refund disputes, and stockroom safety exits.',
        'Every promotional reset, delivery check, and closing lockup has an owner.',
        'POS terminals, pricing guns, and EAS tags are verified working.',
        'The incoming floor lead has direct escalation access to the store manager.'
      ],
      incoming: [
        'I know today’s promos, delivery arrivals, and customer return escalations.',
        'I counted my starting till float and inspected my aisle safety zones.',
        'I know the shift supervisor, cash drop limit, and security escalation line.',
        'I accept responsibility for the listed shift actions.'
      ]
    },
    incidentCategories: [
      'Till Cash / POS Variance',
      'Shoplifting / Loss Prevention Event',
      'Aisle Slip / Customer Hazard',
      'Expired Stock / Pricing Error',
      'Payment Switch / Network Outage',
      'Vendor Delivery Shortage'
    ],
    zones: [
      { id: 'zone_a', name: 'Zone A · Checkout & Returns Desk', type: 'POS & Front End', tasks: ['Till float verification', 'Safe cash drop audit'], hasFlag: false },
      { id: 'zone_b', name: 'Zone B · Main Sales & Chilled Aisles', type: 'Merchandising', tasks: ['Chilled bunker 0–4°C check', 'Price label vs POS match'], hasFlag: false },
      { id: 'zone_c', name: 'Zone C · Stockroom & Back Receiving', type: 'Inventory', tasks: ['Fire exit corridor clear check', 'Vendor GRN invoice sign-off'], hasFlag: false }
    ],
    safetyRegulations: [
      { authority: 'Two-Person Closing Policy', title: 'Dual-Staff Mandatory Verification for Store Vault Drop & Perimeter Lockup', progress: 100, status: 'completed', dueDate: 'Daily Close' },
      { authority: 'FCCPC Consumer & Shelf Code', title: 'Shelf Price Transparency & Daily Expiry Date Audit on Perishable SKUs', progress: 96, status: 'at_risk', dueDate: 'Daily' },
      { authority: 'Store Fire & Stacking Standard', title: 'Unblocked Stockroom Fire Exits & Upper Rack Stability Check', progress: 98, status: 'completed', dueDate: 'Continuous' }
    ],
    taxAndStatutory: [
      { code: 'PAYE / PenCom / NSITF', title: 'Retail Staff PAYE + 18% PenCom + 1% NSITF Cover + 2.5% NHF', rate: 'Standard Payroll' },
      { code: 'FIRS VAT Zero-Rated Split', title: 'Zero-Rated Basic Food Essentials vs 7.5% Standard Taxable Retail SKUs', rate: '0% / 7.5% VAT' },
      { code: 'Lagos / Municipal Permits', title: 'Trade Premises, Signage & Weights-and-Measures Annual License', rate: 'Annual Schedule' }
    ],
    suggestedIdeas: [
      { title: 'Weekend Footfall Micro-Shifts', impact: 'Margin Control', detail: 'Shift 25% of weekday morning floor hours into Friday 16:00–21:00 and Saturday afternoon peaks.' },
      { title: 'Enforce Two-Person Closing Sign-Off', impact: 'Cash & Staff Safety', detail: 'Make closing shift completion require two co-located staff check-outs for store security.' },
      { title: 'Automated Perishable Expiry Flags', impact: 'Zero Fines', detail: 'Keep shelf-rotation checks inside daily shift handovers to prevent FCCPC expiry breaches.' }
    ]
  },

  facility: {
    key: 'facility',
    label: 'Facility Management & Building Ops',
    shortLabel: 'Facility Management',
    aliases: ['facility', 'facilities', 'cleaning', 'janitorial', 'maintenance', 'real estate', 'estate', 'building', 'property'],
    defaultHubName: 'Commercial Precinct Management Office',
    stationPlaceholder: 'Atrium & BMS Control Room',
    telemetryLabel: 'BMS, HVAC & Elevator Telemetry',
    telemetryValue: 'BMS Optimal · Lifts & Chillers Nominal',
    perimeterLabel: 'Precinct Security & Concierge Gate',
    checklistLabel: 'BMS, Chemical SDS & Zone Readiness Verified',
    skillsPlaceholder: 'e.g. BMS HVAC Ops, Contractor Permit-to-Work, Chemical SDS',
    defaultSkillSuggestions: [
      'BMS & HVAC Monitoring', 'Electrical & MEP First-Fix', 'Chemical Dilution & SDS',
      'Elevator Fault Triage', 'Permit-to-Work Audit', 'Cleanroom Sanitation',
      'Waste Compactor Ops', 'Fire Panel Inspection', 'Tenant SLA Dispatch'
    ],
    defaultRoleTitle: 'Facility & MEP Operations Specialist',
    units: [
      { unit: 'Cleaning & Sanitation', headcount: 58, attendancePercent: 95.8, overtimeHours: 22, status: 'On Track' },
      { unit: 'MEP & HVAC Engineering', headcount: 36, attendancePercent: 97.6, overtimeHours: 28, status: 'On Track' },
      { unit: 'Tenant Helpdesk & Access', headcount: 24, attendancePercent: 98.1, overtimeHours: 10, status: 'On Track' },
      { unit: 'Grounds & Waste Control', headcount: 26, attendancePercent: 96.0, overtimeHours: 14, status: 'On Track' }
    ],
    defaultHandoverSummary: 'Building BMS HVAC Nominal & Morning Janitorial Floors Cleared',
    defaultHandoverNotes: 'Chiller loops 1 & 2 holding setpoint. Elevator safety test completed at 05:30. Wet-floor signage deployed in South Lobby.',
    tasks: [
      { id: 'task-fac-bms', text: 'Building Management System (BMS) Chiller, Pump & Elevator Panel Check', priority: 'urgent', done: true },
      { id: 'task-fac-sds', text: 'Chemical Dilution Meter & Safety Data Sheet (SDS) Cart Audit', priority: 'urgent', done: false },
      { id: 'task-fac-ptw', text: 'External Contractor Permit-to-Work & Electrical Isolation Verification', priority: 'normal', done: false },
      { id: 'task-fac-lobby', text: 'Lobby Fire Doors, Wet-Floor Signage & Restroom Consumption Audit', priority: 'normal', done: false }
    ],
    handoverChecklist: {
      supervisor: [
        'I reviewed active tenant faults, chemical safety alerts, and contractor permits.',
        'Every elevator alert, sanitation block, and MEP repair has an assigned owner.',
        'Building access keys, janitorial carts, SDS binders, and spare parts are ready.',
        'The incoming facility lead has direct contact with building management.'
      ],
      incoming: [
        'I understand priority tenant work orders, isolated circuits, and wet areas.',
        'I completed my pre-shift equipment inspection and verified permit-to-work notices.',
        'I know the site engineer, repair SLA deadline, and fire alarm escalation line.',
        'I accept responsibility for the listed shift actions.'
      ]
    },
    incidentCategories: [
      'Slip / Wet-Floor Incident',
      'HVAC / Lift / Power Fault',
      'Chemical Dilution / SDS Breach',
      'Contractor Permit Violation',
      'Water Leak / Plumbing Event',
      'Fire Panel / Tenant Escalation'
    ],
    zones: [
      { id: 'zone_a', name: 'Zone A · Atrium & Tenant Lobbies', type: 'Sanitation & Concierge', tasks: ['Wet-floor signage check', 'Lobby restroom & glass polish'], hasFlag: false },
      { id: 'zone_b', name: 'Zone B · Basement MEP & BMS Vault', type: 'HVAC & Power', tasks: ['Chiller delta-T check', 'Switchgear room lock verify'], hasFlag: false },
      { id: 'zone_c', name: 'Zone C · Service Bay & Waste Zone', type: 'Logistics & Waste', tasks: ['Compactor safety interlock', 'Contractor badge sign-in'], hasFlag: false }
    ],
    safetyRegulations: [
      { authority: 'State Safety Commission (Work-at-Height)', title: 'External Contractor Permit-to-Work & Scaffolding Harness Certification', progress: 96, status: 'at_risk', dueDate: 'Per Permit' },
      { authority: 'COSHH / SDS Chemical Standard', title: 'Clearly Labeled Janitorial Concentrates & Locked Chemical Room Control', progress: 99, status: 'completed', dueDate: 'Continuous' },
      { authority: 'Statutory Lift & Fire Panel Code', title: 'Monthly Elevator Load Test & Weekly Smoke Detector Zone Test', progress: 100, status: 'completed', dueDate: 'Weekly' }
    ],
    taxAndStatutory: [
      { code: 'PAYE / PenCom / NSITF', title: 'Facility Staff PAYE + 18% PenCom + 1% NSITF Cover + 2.5% NHF', rate: 'Standard Payroll' },
      { code: 'Service-Charge WHT & VAT', title: 'Withholding Tax (5%–10%) on Subcontracted MEP Vendors & 7.5% Estate VAT', rate: '5%–10% WHT' },
      { code: 'Municipal Waste & Utility Dues', title: 'LAWMA Commercial Waste Clearance & Environmental Inspection Permits', rate: 'Quarterly Audit' }
    ],
    suggestedIdeas: [
      { title: 'Permit-to-Work Digital Lockout', impact: 'Zero Electrical Risk', detail: 'Require contractor hot-work or electrical permits to be uploaded before floor access is granted.' },
      { title: 'QR Stairwell & Restroom Proof', impact: 'SLA Evidence', detail: 'Give estate committees auditable timestamps proving hourly lobby and washroom inspections.' },
      { title: 'Separate Vendor Invoices from Payroll', impact: 'WHT Compliance', detail: 'Distinguish salaried MEP staff from third-party lift/generator service contracts automatically.' }
    ]
  },

  security: {
    key: 'security',
    label: 'Physical Security, Guarding & Patrol',
    shortLabel: 'Security & Patrol',
    aliases: ['security', 'guard', 'guarding', 'patrol', 'cctv', 'surveillance', 'protection', 'control room'],
    defaultHubName: 'Command & Control Perimeter Post',
    stationPlaceholder: 'Main Gatehouse & Command Desk',
    telemetryLabel: 'CCTV Grid & Radio Network',
    telemetryValue: '32/32 Cameras Recording · UHF Ch.4 Online',
    perimeterLabel: 'Command Post & Gate Terminal',
    checklistLabel: 'Patrol Gear, Radio & Post Readiness Verified',
    skillsPlaceholder: 'e.g. CCTV Monitoring, Access Control, Lone-Worker Patrol',
    defaultSkillSuggestions: [
      'Access Control Gate', 'CCTV NVR Surveillance', 'Roving Perimeter Patrol',
      'UHF Radio Dispatch', 'NSCDC Guard Compliance', 'Incident Chain-of-Custody',
      'VIP Escort Detail', 'Fire & Intrusion Response', 'Night Shift Vigilance'
    ],
    defaultRoleTitle: 'Perimeter Security & Control Officer',
    units: [
      { unit: 'Perimeter Gate Posts', headcount: 46, attendancePercent: 98.4, overtimeHours: 32, status: 'On Track' },
      { unit: 'Roving Night Patrol', headcount: 32, attendancePercent: 97.1, overtimeHours: 24, status: 'On Track' },
      { unit: 'CCTV Command Room', headcount: 24, attendancePercent: 99.1, overtimeHours: 16, status: 'On Track' },
      { unit: 'Access & Visitor Escort', headcount: 28, attendancePercent: 96.8, overtimeHours: 14, status: 'On Track' }
    ],
    defaultHandoverSummary: 'Perimeter Patrol Sweep Clear & CCTV Retention Nominal',
    defaultHandoverNotes: 'All 32 cameras online with 45-day NVR retention verified. Gate visitor ledger balanced and 4 UHF radios swapped.',
    tasks: [
      { id: 'task-sec-tour', text: 'Complete Perimeter QR Patrol Sweep & Fence Lighting Integrity Check', priority: 'urgent', done: true },
      { id: 'task-sec-cctv', text: 'Verify CCTV NVR Camera Feeds, Duress Button & UHF Radio Battery Swap', priority: 'urgent', done: false },
      { id: 'task-sec-vis', text: 'Audit Visitor Badge Return Ledger & Overnight Contractor Authorizations', priority: 'normal', done: false },
      { id: 'task-sec-gate', text: 'Gate Bollards, Key Box Inventory & Emergency Evacuation Muster Check', priority: 'normal', done: false }
    ],
    handoverChecklist: {
      supervisor: [
        'I reviewed active BOLO alerts, tailgating logs, and lone-worker patrol timestamps.',
        'Every gate post, CCTV console, and roving tour has a named officer assigned.',
        'UHF radios, torches, key boxes, and visitor badges are accounted for.',
        'The incoming post team knows the Control Room Commander escalation number.'
      ],
      incoming: [
        'I read the standing BOLO notes, after-hours access list, and gate status.',
        'I tested my UHF radio, duress alarm, and verified key cabinet custody.',
        'I know the shift commander, emergency police/fire contact, and patrol schedule.',
        'I accept responsibility for the listed shift actions.'
      ]
    },
    incidentCategories: [
      'Perimeter Breach / Tailgating',
      'CCTV / Access Hardware Outage',
      'Visitor / Contractor Dispute',
      'Fire / Intrusion Alarm',
      'Radio / Lone-Worker Missed Ping',
      'Property Damage / Theft Report'
    ],
    zones: [
      { id: 'zone_a', name: 'Post 01 · Main Gatehouse & Bollards', type: 'Vehicle & Visitor Access', tasks: ['Badge return reconciliation', 'Under-vehicle mirror check'], hasFlag: false },
      { id: 'zone_b', name: 'Post 02 · CCTV Command Room', type: 'Surveillance & Alarms', tasks: ['NVR recording health check', 'Access alarm log audit'], hasFlag: false },
      { id: 'zone_c', name: 'Post 03 · Perimeter Patrol Loop', type: 'Roving Tour', tasks: ['Checkpoint QR scan loop', 'Emergency exit latch check'], hasFlag: false }
    ],
    safetyRegulations: [
      { authority: 'NSCDC Private Guarding Act', title: 'Guard Licensing Verification, Approved Uniforms & Control Room Logbook Audit', progress: 99, status: 'completed', dueDate: 'Continuous' },
      { authority: 'Lone-Worker Protection Code', title: 'Hourly Control-Room Radio Check-In & 12-Hour Maximum Post Fatigue Cap', progress: 95, status: 'at_risk', dueDate: 'Daily' },
      { authority: 'Evidence Chain-of-Custody', title: 'Tamper-Evident CCTV Clip Export & Dual-Signed Key Vault Transition', progress: 100, status: 'completed', dueDate: 'Per Shift' }
    ],
    taxAndStatutory: [
      { code: 'PAYE / PenCom / NSITF', title: 'Security Officer PAYE + 18% PenCom + 1% Hazardous-Post NSITF Cover', rate: 'Standard Payroll' },
      { code: 'Guarding Retainer VAT & WHT', title: '7.5% FIRS VAT on Managed Security Services & 5%–10% Client WHT Credit Notes', rate: '7.5% VAT / WHT' },
      { code: 'NSCDC Annual License', title: 'Command Permit & Vetting Clearance Cost Tracking per Deployed Post', rate: 'Annual Schedule' }
    ],
    suggestedIdeas: [
      { title: '60-Minute Silent Patrol Ping Rule', impact: 'Officer Safety', detail: 'Alert Control Room automatically if a lone night officer misses an hourly NFC/QR checkpoint.' },
      { title: 'Enforce 12-Hour Gate Duty Ceiling', impact: 'Alertness', detail: 'Prevent consecutive 12-hour double shifts that cause gate fatigue and access-control lapses.' },
      { title: 'Dual-Signed Key Cabinet Audit', impact: 'Site Integrity', detail: 'Make incoming and outgoing gate leads confirm exact master-key counts before closing handover.' }
    ]
  },

  operations: {
    key: 'operations',
    label: 'General Enterprise & Field Operations',
    shortLabel: 'General Operations',
    aliases: ['operations', 'other', 'consulting', 'services', 'corporate', 'office', 'education', 'finance'],
    defaultHubName: 'Primary Operations & Workplace Hub',
    stationPlaceholder: 'Primary Operations Desk',
    telemetryLabel: 'Facility & Network Uptime',
    telemetryValue: 'Workplace Systems Nominal · Access Verified',
    perimeterLabel: 'HQ Reception & Geo-Fenced Check-In',
    checklistLabel: 'Workspace Security & Continuity Verified',
    skillsPlaceholder: 'e.g. Shift Coordination, Client SLA Ops, Compliance Reporting',
    defaultSkillSuggestions: [
      'Shift Coordination', 'Operational Compliance', 'Client SLA Management',
      'Incident Documentation', 'Vendor Oversight', 'Emergency Drill Lead',
      'Team Onboarding', 'Quality Assurance', 'Workforce Analytics'
    ],
    defaultRoleTitle: 'Operations Specialist',
    units: [
      { unit: 'Core Operations', headcount: 54, attendancePercent: 97.2, overtimeHours: 18, status: 'On Track' },
      { unit: 'Client Delivery', headcount: 42, attendancePercent: 96.6, overtimeHours: 22, status: 'On Track' },
      { unit: 'Quality & Compliance', headcount: 28, attendancePercent: 98.0, overtimeHours: 10, status: 'On Track' },
      { unit: 'Support & Administration', headcount: 32, attendancePercent: 95.9, overtimeHours: 12, status: 'On Track' }
    ],
    defaultHandoverSummary: 'Morning Workplace Handoff Completed & Priority Actions Assigned',
    defaultHandoverNotes: 'All workstation stations operational. Priority client SLAs assigned for morning coverage with zero open escalations.',
    tasks: [
      { id: 'task-ops-sec', text: 'Verify Workstation Access Security, Visitor Log & Emergency Exits', priority: 'urgent', done: true },
      { id: 'task-ops-sla', text: 'Review Priority Customer SLAs & Carry-Over Shift Action Owners', priority: 'urgent', done: false },
      { id: 'task-ops-tool', text: 'Confirm Shared Tools, Communications & Escalation Matrix Readiness', priority: 'normal', done: false },
      { id: 'task-ops-comp', text: 'Log Daily Attendance Exceptions & Compliance Documentation Updates', priority: 'normal', done: false }
    ],
    handoverChecklist: {
      supervisor: [
        'I reviewed open operational risks, incidents, and safety notices.',
        'Every priority action has a named owner and clear deadline.',
        'Staffing, tools, and workspace systems are ready for the next team.',
        'The incoming team has a clear escalation path to leadership.'
      ],
      incoming: [
        'I understand the shift priorities and carry-over responsibilities.',
        'I completed my pre-shift workspace readiness and access checks.',
        'I know the owner, deadline, and escalation contact for urgent items.',
        'I accept responsibility for the listed shift actions.'
      ]
    },
    incidentCategories: [
      'Operational Disruption',
      'Workplace Safety Hazard',
      'Equipment / IT Fault',
      'Security / Access Event',
      'Client SLA Escalation',
      'Near-Miss'
    ],
    zones: [
      { id: 'zone_a', name: 'Zone A · Operations Desk', type: 'Core Workflows', tasks: ['SLA queue check', 'Shift roster alignment'], hasFlag: false },
      { id: 'zone_b', name: 'Zone B · Client Service Wing', type: 'Delivery & Support', tasks: ['Escalation inbox sweep', 'Meeting readiness check'], hasFlag: false },
      { id: 'zone_c', name: 'Zone C · Admin & Compliance Vault', type: 'Records & Safety', tasks: ['Access log review', 'Fire exit clearance'], hasFlag: false }
    ],
    safetyRegulations: [
      { authority: 'Nigerian Labour Act', title: '12-Hour Minimum Rest Window & Written Employment Particulars Compliance', progress: 98, status: 'completed', dueDate: 'Continuous' },
      { authority: 'NDPA Data Protection', title: 'Personnel Records Encryption & Clean-Desk Confidentiality Standard', progress: 95, status: 'at_risk', dueDate: 'Quarterly' },
      { authority: 'Workplace Fire & First-Aid Code', title: 'Fire Assembly Wardens Appointed per Active Shift & First-Aid Box Audit', progress: 100, status: 'completed', dueDate: 'Monthly' }
    ],
    taxAndStatutory: [
      { code: 'PAYE / PenCom / NSITF', title: 'Monthly PAYE Bracket Remittance + 18% PenCom + 1% NSITF + 2.5% NHF', rate: 'Standard Payroll' },
      { code: 'FIRS VAT (7.5%) & WHT', title: 'Standard 7.5% Service VAT & 5%–10% Vendor Withholding Tax Deductions', rate: '7.5% VAT / WHT' }
    ],
    suggestedIdeas: [
      { title: 'Standardize Shift Handover Templates', impact: 'Zero Context Loss', detail: 'Assign clear single owners to every carry-over item so nothing slips between shifts.' },
      { title: 'Enforce 12-Hour Shift Recovery Caps', impact: 'Compliance', detail: 'Flag back-to-back overtime rotations early so statutory rest laws are never breached.' },
      { title: 'Automate Statutory Deduction Receipts', impact: 'Audit Trust', detail: 'Include itemised PenCom, PAYE, NSITF, and NHF lines on every worker payslip download.' }
    ]
  }
};

export const INDUSTRY_OPTIONS = Object.values(INDUSTRY_PROFILES).map((p) => ({
  key: p.key,
  label: p.label,
  shortLabel: p.shortLabel
}));

/**
 * Deterministically resolve any organisation industry string and organisation name
 * into a tailored INDUSTRY_PROFILES entry. Never defaults unrecognized companies to manufacturing.
 */
export function resolveIndustryProfile(industryInput, orgName = '') {
  const rawInd = String(industryInput || '').trim().toLowerCase();
  const rawOrg = String(orgName || '').trim().toLowerCase();

  if (rawInd && INDUSTRY_PROFILES[rawInd]) {
    return INDUSTRY_PROFILES[rawInd];
  }

  const matchesAlias = (text, alias) => {
    if (!text || !alias) return false;
    if (text === alias) return true;
    if (alias.length <= 4) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text);
    }
    return text.includes(alias);
  };

  // Exact label / shortLabel match first, then alias match in industry input
  if (rawInd && rawInd !== 'other' && rawInd !== 'operations') {
    for (const profile of Object.values(INDUSTRY_PROFILES)) {
      if (profile.key === 'operations') continue;
      if (profile.label.toLowerCase() === rawInd || profile.shortLabel.toLowerCase() === rawInd) {
        return profile;
      }
    }
    for (const profile of Object.values(INDUSTRY_PROFILES)) {
      if (profile.key === 'operations') continue;
      if (profile.aliases.some((alias) => matchesAlias(rawInd, alias))) {
        return profile;
      }
    }
  }

  // Infer from organisation name if industry is unset, "Other", or generic "Operations"
  if (rawOrg) {
    for (const profile of Object.values(INDUSTRY_PROFILES)) {
      if (profile.key === 'operations') continue;
      if (profile.aliases.some((alias) => alias.length >= 3 && matchesAlias(rawOrg, alias))) {
        return profile;
      }
    }
  }

  return INDUSTRY_PROFILES.operations;
}

export function getIndustryKey(industryInput, orgName = '') {
  return resolveIndustryProfile(industryInput, orgName).key;
}
