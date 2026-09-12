# Executive Compass

Build a fully interactive, full-stack Executive Management System. I have limited credits, so please follow these constraints strictly in this first iteration:

1. NO AUTH GUARD: Do NOT add any login, signup, or email confirmation screens. The app must open directly to the main dashboard so I can interact with it immediately.

2. FULL ARABIC & RTL: The entire user interface (menus, buttons, placeholders, labels) MUST be in professional Arabic. The layout MUST be RTL (Right-to-Left) by default.

3. REAL INTERACTIVITY (CRUD) & NO STATIC MOCK DATA: Do not use read-only dummy data. Connect the app to Supabase. Create the necessary tables (Employees, Tasks, Branches, Hierarchy). Ensure every page has working forms/modals to Add, Edit, Delete, and Save data.

4. BEHANCE-STYLE HIERARCHY TREE: Design the organizational structure as an interactive, visual Tree Diagram (inspired by Behance UI). It should NOT be a simple list. Use node-based design where each box represents a role/department. Crucially, under or beside each box, include an expandable "Notes/Comments" section where I can type and save explanations for that specific node.

5. INTERACTIVE MAP: Integrate a fully functional Leaflet map. Allow me to click on regions, add new branch pins, and view dynamic data panels for each branch.

6. MODULES REQUIRED: 

- Dashboard (Charts and KPIs)

- Hierarchy Tree (Behance style with notes)

- Employees (Table with Add/Edit/Delete functionality)

- Tasks (Kanban board where cards can be dragged and dropped)

- Map (Interactive regions)

Please generate the complete, working code for this system now.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://arabesque-tree-map.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/84779b6d-2ef2-4375-ad27-d0864524fdb8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
