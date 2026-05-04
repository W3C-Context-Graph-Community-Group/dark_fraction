# CANONICAL SPIKE

## Spikes: Four Facet Model Objects

### Facet #1 - Data

#### `/data`

`{ "value": <payload> }` when a payload has crossed, where `<payload>` is any JSON value


- `/data` contains only what crossed the boundary as a payload.
- `/data` is null if no payload has crossed.
- `/data` is `{ "value": <payload> }` when populated (including empty), and `null` prior to data crossing a boundary.
- HTML element instantiating an observatron is a boundary crossing — its parameters are a legitimate payload.
- The intent map can live in `/data` (since it's the instantiation payload). Future versions will enable for centralized or I/O intent map updating aligned with local intent maps.
- One boundary event = one payload
- Payload shape is unconstrained, `/structure` validates it.


### Facet #2 - Meaning

#### `/meaning`

- MUST have exactly two columns: `key` and `value`
- MUST contain only human-readable definitions 
- MAY have any number of rows: zero, one, or many
- MUST NOT contain tags, schemas, or any other column

**Example**
```json
{
  "/meaning": {
    "key": [
      "peanut butter",
      "chocolate",
      "peanut butter & chocolate"
    ],
    "value": [
      "A spread made from ground roasted peanuts.",
      "A confection made from cacao beans.",
      "A classic flavor pairing — the salty richness of peanut butter complements the sweetness of chocolate."
    ]
  }
}
```

This shape supports:

- A single term being defined (one row)
- Multiple unrelated terms in the same entry (many rows, no relationship)
- Atoms plus their composition (rows for parts, plus a row for the whole)

### Facet #3 - Structure

```json
"/structure": {
  "key":   ["json-schema-2020-12"],
  "value": ["<schema as string>"]
}
```

Empty (data present, no constraints declared):

```json
"/structure": {
  "key":   [],
  "value": []
}
```

Null (no data has crossed):

```json
"/structure": null
```

**Instantiation**
- /data null → /structure null
- /data populated → /structure is an empty columnar table (the columns exist, the arrays are empty)
