# Chapter 2 — Data Models & Query Languages

The thesis of DDIA Chapter 2 is that **the same data and the same questions can be
served by very different data models, and the model you pick changes what's cheap
and what's expensive.** This lab makes that concrete: one dataset (LinkedIn-style
résumés), one set of queries, and **two independent implementations** — a document
store and a property graph — measured side by side.

Everything here was built to be *felt and measured*, not just described.

---

## 1. The experiment

A single model-agnostic contract, [`resume.ResumeStore`](internal/resume/store.go),
defines the vocabulary: create entities, record relationships, run four queries.
Two packages implement it with radically different internals:

| | `document.Store` | `graph.Store` |
|---|---|---|
| A person is… | one JSON blob (`[]byte`) | a vertex with a property bag |
| A relationship is… | a reference ID inside the blob | an edge between two vertices |
| Names resolved by… | look-up in a side collection | following an edge pointer |
| Cross-cutting query | scan every blob | traverse the relevant edges |

Because both satisfy the *same* interface, a caller can't tell them apart — proven
by a **shared contract test** ([`contract_test.go`](internal/resume/contract_test.go))
that runs the identical assertions against both. That behavioral equivalence is what
makes the cost comparison fair.

## 2. The domain and the queries

Entities: **Person, Company, School, Location, Skill.**
Relationships: employment, education, skills, location, and person↔person connections
(the relationship attributes — job title, skill level, connection date — belong to
the *relationship*, not to either endpoint).

The four queries were chosen to exercise different axes of Chapter 2:

| Query | Exercises |
|---|---|
| `GetPerson` | **data locality** — assemble one whole entity |
| `PeopleWithSkill` | **reverse many-to-many** — skill → people |
| `Colleagues` | **self-join + interval overlap** — company → people, overlapping tenure |
| `SecondDegreeConnections` | **graph reach** — friends-of-friends, bounded multi-hop |

---

## 3. Model 1 — the document store

Each person is stored as **actual JSON bytes** (`map[PersonID][]byte`), with the
reference entities held in small **side collections** (`map[CompanyID]string`, etc.).

### Why JSON bytes and not a struct-in-a-map?
Storing `[]byte` (rather than `*personDoc`) was a deliberate choice to make three
Chapter 2 properties *real* instead of hand-wavy:

- **Locality** — the whole résumé is one contiguous blob, read/written as a unit.
- **Schema-on-read** — the store holds opaque bytes; structure exists only after
  *you* `json.Unmarshal`. No schema is enforced on write.
- **Whole-document rewrite on update** — to add one job, `RecordEmployment` must
  load → unmarshal → append → **re-marshal the entire document** → store. You can't
  patch a nested field in place.

### References, not values
Company/School/Location/Skill are stored as **IDs only** inside the document, never
denormalized names. This keeps a rename (`Google → Alphabet`) a single write, and it
means every read must **hand-write the join**: resolve each ID against its side
collection. `GetPerson` doing this is cheap (one blob + O(1) lookups); the
cross-cutting queries are not.

### The pain, made literal
`PeopleWithSkill` and `Colleagues` have **no reverse index** (nothing maps
`skill → people` or `company → people`). The only way to answer is to **scan every
person document and deserialize it** — O(N) in the dataset size.

`Connect` shows the document model's many-to-many awkwardness: a symmetric edge
requires **two whole-document rewrites** (write the connection into *both* people's
blobs).

## 4. Model 2 — the property graph

A generic property graph: **vertices** (`{ID, Label, Props, Out, In}`) and **edges**
(`{Label, From, To, Props}`), with a `map[ID]*Vertex` index.

### The adjacency index is the whole point
Every vertex holds **direct pointers to its own edges**, in both directions
(`Out`/`In`). That's what turns relationship questions into pointer-follows:

- "Who has skill X?" → walk the Skill vertex's **`In["HAS_SKILL"]`** edges.
- "Ada's employers?" → walk Ada's **`Out["WORKED_AT"]`** edges.
- The reference "join" is free: an edge already *points at* the resolved vertex, so
  `edge.To.Props["name"]` needs no side-collection lookup.

### Edge props vs vertex props
A recurring mental model: **`edge.Props`** holds the *relationship* (title, level,
since); **`edge.From/To.Props`** holds the *entity* (name, headline). You follow
`From`/`To` from an edge to read the endpoint's bag.

### One edge for a symmetric connection
Unlike the document store's dual-write, `Connect` adds **one** `CONNECTED_TO` edge —
`addEdge` records it in A's `Out` *and* B's `In`, so both directions are queryable
from a single write. (Reads therefore consult both `Out` and `In`.)

### Per-label adjacency index (the optimization)
`Out`/`In` are `map[label][]*Edge`, not a flat slice. This came directly from a
**measured** finding (below): a flat list forced traversals to scan irrelevant edge
types. Indexing by label makes each hop selective — `connectionsOf` visits only
`CONNECTED_TO` edges, not a person's jobs and skills too.

---

## 5. The measured comparison

`cmd/compare` loads the **same** 100-person dataset into both stores and counts the
characteristic work per query: **documents deserialized** (document) vs **edges
traversed** (graph). The units differ on purpose — the point is *how cost scales*.

```
QUERY             DOC (docs read)   GRAPH (edges walked)   CHEAPER
GetPerson         1                 6                      document
PeopleWithSkill   100               25                     graph
Colleagues        100               22                     graph
SecondDegree      35                47                     document
```

### Interpretation
- **`GetPerson` → document wins.** The whole résumé is one blob (locality). The
  document cost is `1` *regardless of dataset size*; the graph must visit every edge
  to reassemble the entity.
- **`PeopleWithSkill` / `Colleagues` → graph wins decisively.** The document store
  has no reverse index, so it hits `N` (100) every time — this grows linearly with
  the dataset (10,000 people → 10,000 reads), while the graph stays at the
  neighborhood size.
- **`SecondDegreeConnections` → document wins — the surprise.** Even after per-label
  indexing cut the graph from **87 → 47** hops, the document store still won at 35.
  Why: the graph walks *every* connection edge in the 2-hop frontier, including
  back-edges and edges to already-seen people; the document store enumerates neighbor
  IDs **for free** from the loaded blob and *fetches each unique person once*
  (dedup-before-fetch). **Locality + dedup is hard to beat for bounded multi-hop.**

### The meta-lesson
Two predictions about `SecondDegree` were wrong before the numbers came in. The lab's
real value is the loop: *build → measure → hypothesize → optimize → re-measure*, and
let the data overrule intuition. "Graphs always win at traversal" is a myth; it
depends on the query, the graph's density, and how the adjacency index is structured.

---

## 6. DDIA concept → where it lives

| Chapter 2 concept | Where you see it |
|---|---|
| Object-relational mismatch / loading | the `Add*` / `Record*` write path |
| Locality | `GetPerson` cost = 1 doc |
| Schema-on-read | document store holds opaque `[]byte` |
| Whole-document update cost | `RecordEmployment` re-marshals the whole doc |
| Normalization (references vs values) | IDs-only in the document + side collections |
| Many-to-many is awkward in documents | `Connect` dual-write; `PeopleWithSkill` full scan |
| Property graph model | `graph.Vertex` / `graph.Edge` |
| Adjacency index / traversal | `Out`/`In` per-label edge maps |
| Declarative vs imperative | (stretch — not yet built) |

## 7. Go concepts encountered

- **Nil maps panic on write** → constructors `make()` every map (bit us in both
  `New()` and the per-label `addVertex` refactor).
- **`sync.RWMutex` is not reentrant** → helpers (`addVertex`, `addEdge`, `loadDoc`)
  are lock-free; the public methods own the lock.
- **`RLock` for reads, `Lock` for writes** → concurrent reads don't block each other.
- **Error wrapping** — `%w` preserves the chain for `errors.Is`; sentinel errors
  (`resume.Err*NotFound`) are the matchable contract.
- **Type assertions** — reading the graph's `Props map[string]any` (schema-on-read,
  graph edition).
- **Generics** — `collect[T any](...)` DRYs the edge→typed-slice mapping; note that
  **methods can't have type parameters**, so it's a package-level function.
- **Compile-time interface assertion** — `var _ resume.ResumeStore = (*Store)(nil)`
  proves each store satisfies the contract at build time.
- **Distinct ID types** — `type PersonID string` etc. so the compiler rejects passing
  a `CompanyID` where a `PersonID` is expected.
