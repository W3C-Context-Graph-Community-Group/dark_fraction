 <!-- keys.md -->

Catalog of key kinds used in `/context.key`. Each key is referenced from `/context` as `cgp:/r/keys#<key-name>` and resolves to the H1 anchor in this document with that name.

A `key` names *what kind of property* a `/context` row is asserting. The `value` column carries the property's content.

Entries below are alphabetical.

---

# component-type

**Reference URL:** `cgp:/r/keys#component-type`

The component that produced the entry. The `value` for this row is a `cgp:/r/components#<component-name>` reference.

Example row:

| key | value |
|---|---|
| `cgp:/r/keys#component-type` | `cgp:/r/components#html-forms-drag-and-drop` |

---

# task

**Reference URL:** `cgp:/r/keys#task`

The task under which the entry was created. The `value` for this row is a `cgp:/r/tasks#<task-name>` reference.

Example row:

| key | value |
|---|---|
| `cgp:/r/keys#task` | `cgp:/r/tasks#csv-dropped` |