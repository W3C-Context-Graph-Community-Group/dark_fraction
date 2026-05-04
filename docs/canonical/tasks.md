# Tasks

Catalog of tasks that observatrons and spikes can be created under. Each task is referenced from `/context` as `cgp:/r/tasks#<task-name>` and resolves (per the resolution rule) to its anchor in this document.

H2 sections group related tasks into workflows. H3 sections define individual tasks.

---

## Drag-and-Drop Workflow

### csv-dropped

**Reference URL:** `cgp:/r/tasks#csv-dropped`

The task of receiving a CSV file dropped onto the observatron's watched boundary and minting one spike per column.

**Used by:**
- `cgp:/r/components#html-forms-drag-and-drop`

**Produces:**
- One observatron, minted at instantiation
- One spike per CSV column, minted when the file is dropped

**Lifecycle:**
1. The host page declares the drag-and-drop component. The observatron is minted; its first `/context` row carries this task.
2. A user drops a CSV file. For each column, a spike is minted; its first `/context` row carries this task.

This is the only task defined in alpha.
