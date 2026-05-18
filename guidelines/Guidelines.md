# AuditNode Project Guidelines

This file enforces coding standards, UI design tokens, and architectural rules for the AuditNode infrastructure management system. AI must strictly follow these rules for every generation.

## 1. Tech Stack & Architecture
- **Core:** React (TypeScript), Vite, Tailwind CSS, React Router.
- **File Structure:**
  - UI Components: `src/app/components/`
  - Page Screens: `src/app/pages/`
  - Global Styles: `src/styles/`
- **Clean Code:** Keep components modular. Separate complex logic into custom hooks if a file exceeds 200 lines.
- **Styling:** Use Tailwind utility classes exclusively. Avoid raw CSS or inline styles.

## 2. Design Tokens (Figma Export Specs)
- **Color Palette:**
  - Deep Background: `bg-[#020617]` (Slate-950)
  - Card / Table Container: `bg-[#0f172a]` (Slate-900)
  - Layout Borders: `border-[#1e293b]` (Slate-800)
  - Primary Action Button: `bg-[#2563eb]` (Blue-600)
  - Text Muted: `text-[#94a3b8]` (Slate-400)
- **Layout Constraints:**
  - Main content padding must be strictly `p-8` for clean whitespace economics.
  - Cards and Modals must use `rounded-xl` border radius.
  - Technical items like IP addresses and Ports must use a Monospace font (`font-mono`).

## 3. UI/UX Functional Requirements (G1 & G3)
- **Infrastructure Inventory (G1):**
  - The Server table must support **Expandable Rows**. Clicking a server row expands to show a nested table of its bound Applications and Ports.
  - Action columns must include: [Edit | View Dependency (Network Icon) | Delete].
  - Clicking "View Dependency" must route the user to the Dependency Manager tab with the specific application context.
- **Register New Entity Modal:**
  - Must feature a toggle/switch between two forms:
    1. *New Infrastructure Registry* (DataCenter, IP, Hostname, OS).
    2. *Application Deployment* (Select Existing Server Dropdown, App Code, App Name, Port, Protocol).

## 4. Data & State Management
- Use standard React `useState` and `useEffect` for handling local states (Tab toggles, modal open/close).
- Data mock fields must match the PostgreSQL schema fields (`ip_address`, `app_code`, `dest_port_id`).