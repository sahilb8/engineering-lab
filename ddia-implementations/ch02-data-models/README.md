# ch02 — Data Models: Document vs Graph, Measured

> **The same résumé data and the same four queries, served by two data models — a
> document store and a property graph — instrumented so you can see, in numbers,
> where each one wins.** A hands-on take on DDIA Chapter 2.

Both models implement one shared interface, are proven behaviorally identical by a
shared contract test, and are then raced against each other on an identical dataset.
The result isn't the usual "graphs win at relationships" slogan — the measurements
tell a more interesting, more honest story (see [Findings](#findings)).

## The question

> Given people, their jobs, schools, skills, and connections — how much *work* does
> it take to answer "who has this skill?", "who were my colleagues?", and
> "who are my friends-of-friends?" under a document model vs a graph model?

## Architecture

```
                     ┌──────────────────────────────────┐
                     │        resume.ResumeStore         │  one model-agnostic
                     │   interface + neutral domain types │  contract; callers
                     └──────────────────┬─────────────────┘  never see internals
                             implemented by both
              ┌───────────────────────┴───────────────────────┐
              ▼                                                 ▼
   ┌──────────────────────────┐                   ┌──────────────────────────┐
   │  document.Store           │                   │  graph.Store              │
   │  • person = JSON []byte   │                   │  • person = vertex        │
   │  • refs = IDs in the blob │                   │  • refs = edges (pointers)│
   │  • side collections       │                   │  • per-label adjacency    │
   │  • reads = scan + join    │                   │  • reads = traverse       │
   └──────────────────────────┘                   └──────────────────────────┘
              ▲                                                 ▲
              └───────────────────────┬───────────────────────┘
                                      │
                 ┌────────────────────┴────────────────────┐
                 │  contract_test.go   →  same queries,      │
                 │                        same results       │
                 │  cmd/compare        →  same data,         │
                 │                        measured cost       │
                 └──────────────────────────────────────────┘
```

## Layout

```
internal/resume/
  store.go            # the ResumeStore interface + domain types + sentinel errors
  contract_test.go    # one test suite run against BOTH implementations
  document/store.go   # document model: JSON blobs + side collections
  graph/store.go      # property graph: vertices + per-label edge adjacency
cmd/compare/main.go   # loads the same dataset into both, prints the cost table
Makefile              # run / test / vet / fmt
NOTES.md              # theory, DDIA mapping, findings, Go concepts
```

## Run it

Requires Go 1.25+.

```bash
make test   # run the cross-model contract test (proves both models agree)
make run    # load 100 people into both stores and print the cost comparison
```

## Sample output

```
Dataset: 100 people, 20 companies, 10 skills, ~3 connections each

QUERY             RESULTS   DOC (docs read)   GRAPH (edges walked)   CHEAPER
GetPerson         5         1                 6                      document
PeopleWithSkill   25        100               25                     graph
Colleagues        6         100               22                     graph
SecondDegree      28        35                47                     document
```

(Cost is the *characteristic* work per model: person documents deserialized vs edges
traversed. Different units on purpose — the point is how each scales with dataset size.)

## Findings

- **`GetPerson` → document.** The whole résumé is one contiguous blob — **locality**.
  Cost stays `1` no matter how big the dataset grows.
- **`PeopleWithSkill` / `Colleagues` → graph, decisively.** The document store has no
  reverse index (`skill → people`, `company → people`), so it **scans all N** every
  time; the graph walks only the relevant edges. The gap widens linearly with N.
- **`SecondDegree` → document, surprisingly.** Per-label indexing cut the graph from
  87 → 47 hops, but the document store still won (35): it enumerates neighbor IDs for
  free from the loaded blob and fetches each **unique** person once. Locality +
  dedup-before-fetch beats naive edge-walking for bounded multi-hop.

The headline: **there is no universally better model.** Locality wins whole-entity
reads; the graph wins reverse many-to-many lookups; second-degree depends on graph
density and how you count. Full write-up in [NOTES.md](NOTES.md).

## Concepts demonstrated

Data models: locality, schema-on-read, normalization (references vs values), the
many-to-many awkwardness of documents, property-graph vertices/edges/property-bags,
and the adjacency index that powers traversal.

Go: implicit interface satisfaction (+ compile-time assertions), distinct ID types,
`sync/atomic` metering under `RWMutex`, non-reentrant locks, error wrapping with
`%w` + sentinels, `map[string]any` with type assertions, and generics.
