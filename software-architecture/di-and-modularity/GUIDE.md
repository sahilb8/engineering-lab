# The DI & Modularity Learning Guide

## A Practitioner's Path from Express-Style MVC to NestJS Modular Architecture

This guide is for experienced Node.js/Express developers who can build production apps but have never worked with dependency injection containers, interface tokens, or module-boundary patterns. You know how to build things. You don't yet know how to *wire* things so they stay maintainable at scale.

The philosophy: **you must feel the pain of the wrong approach before the right approach makes sense.** Every stage begins with something that works and ends with something that hurts. The hurt is the curriculum.

---

## What You're Building

A multi-tenant personal finance tracker. Not because finance is interesting — because multi-tenancy forces every architectural question that matters in SaaS:

- **Tenant isolation** — every query must be scoped. Who enforces that? Where?
- **Feature gating** — not every tenant gets every module. How do you enable/disable entire feature areas cleanly?
- **Pluggable integrations** — different tenants connect to different banks. How do you register, dispatch, and extend adapters?
- **Authorization + delegation** — who can do what, and who can *grant* the ability to do what?

### Domain Model

```
Household (tenant)
  ├── User (role: owner | member | viewer)
  ├── Account (a bank account — Chase checking, Wells Fargo savings, etc.)
  │     └── Transaction (amount, date, description, category)
  ├── Category (groceries, rent, salary — household-scoped)
  ├── Budget (optional module — monthly spending targets per category)
  ├── Investment (optional module — portfolio tracking)
  └── BillReminder (optional module — recurring payment alerts)
```

### Access Levels

```
NO_ACCESS → cannot see or interact
READ      → can view data
EDIT      → can create and modify data
FULL      → can do everything including delete and manage permissions
```

### Tech Stack

- **NestJS** — the framework under study
- **Prisma** — ORM, because schema-first modeling keeps the focus on architecture, not SQL
- **SQLite** — zero-config database, no server to manage
- **No frontend** — curl/HTTPie only
- **No auth library** — hardcoded fake user middleware (auth is not the lesson here)

---

## The Mental Model Shift

If you come from Express, your instinct is:

```
require the thing → call the thing → pass data through function arguments
```

NestJS inverts this:

```
declare what you need → the container resolves it → you receive it in your constructor
```

This feels like overhead at first. The entire exercise exists to show you *when and why* that overhead pays for itself — and to give you the judgment to know when it doesn't.

### Key Concepts You'll Internalize

| Concept | Where You'll Feel It |
|---|---|
| DI Container & provider registration | Stage 1 (by its absence), Stage 2 (first token) |
| Module boundaries & exports | Stage 1 (direct imports break encapsulation) |
| Interface tokens (Symbol-based injection) | Stage 2 |
| Module descriptors & registry pattern | Stage 3 |
| Decorators & Guards | Stage 4 |
| Multi-provider pattern | Stage 5 |
| Metadata-driven authorization | Stage 6 |

---

## Stage 1 — Do It Wrong On Purpose

### Goal

Build a working multi-tenant CRUD app using patterns you already know from Express — but in NestJS. Direct imports, central config files, manual data threading. Make it work. Then notice what's wrong.

### Estimated Time: 6-8 hours

(Includes NestJS project setup, learning Prisma basics, and writing all CRUD endpoints.)

### What You Build

**Prisma Schema:**
- Household, User, Account, Transaction, Category models
- All relations defined, household_id as the tenant key on every tenant-scoped entity
- Seed script with at least 2 households, each with users, accounts, transactions, categories

**NestJS Modules (5):**
- `UsersModule` — CRUD for users within a household
- `HouseholdsModule` — household management
- `AccountsModule` — bank account CRUD, scoped to household
- `TransactionsModule` — transaction CRUD, scoped to account (and therefore household)
- `CategoriesModule` — category CRUD, scoped to household

**Each module contains:**
- A controller with REST endpoints (GET list, GET by id, POST create, PATCH update, DELETE)
- A service with business logic and direct Prisma calls
- Every service method takes `householdId` as an explicit parameter

**Cross-cutting concerns:**
- `FakeAuthMiddleware` — reads nothing from the request, just attaches a hardcoded user object (with `id`, `householdId`, `role`) to `req.user`
- `permissions.constants.ts` — a single file defining all permission constants (e.g., `ACCOUNTS_READ`, `ACCOUNTS_EDIT`, `TRANSACTIONS_FULL`) that every module imports

**Validation:**
- Curl every endpoint for both households
- Confirm tenant isolation works (household A cannot see household B's data)
- Confirm the fake user middleware is applied globally

### What You Should Feel By The End

- **`householdId` fatigue** — every single service method takes it as a parameter. You're threading the same value through 5 modules, 25+ methods. If you rename it or change how it's resolved, you touch *everything*.
- **Central constants coupling** — `permissions.constants.ts` is imported by every module. Adding a new module means editing this central file and touching imports across the codebase. The file grows linearly with every feature.
- **Direct import fragility** — if `TransactionsService` imports `AccountsService` directly (not through the module system), you've created a hidden dependency. NestJS won't enforce boundaries for you if you bypass them. You'll feel this when you try to refactor or reorder modules.
- **No encapsulation** — any module can reach into any other module's internals. There's no gate, no contract, no boundary. It works, but it's a house of cards.

### Key NestJS Docs to Read Before Starting

- [First Steps](https://docs.nestjs.com/first-steps) — project scaffolding, bootstrap
- [Controllers](https://docs.nestjs.com/controllers) — decorators, route handling, request object
- [Providers](https://docs.nestjs.com/providers) — services, @Injectable, constructor injection
- [Modules](https://docs.nestjs.com/modules) — @Module decorator, imports/exports/providers/controllers
- [Middleware](https://docs.nestjs.com/middleware) — implementing and applying middleware
- [Prisma recipe](https://docs.nestjs.com/recipes/prisma) — integrating Prisma with NestJS

### Decisions You'll Face

These are real decision points that will come up. Don't read ahead for answers — make a choice, live with it, and see what happens:

1. Where does the `PrismaService` live? In its own module? In a shared folder? Imported everywhere directly?
2. How do controllers get the current user? From `@Req()` directly, or do you create a param decorator?
3. Do you validate that a user belongs to the household they're requesting data for? Where does that check live?
4. How do you handle the case where a transaction references a category — do you validate the category belongs to the same household?

---

## Stage 2 — Extract Your First Interface Token

### Goal

Take the most-coupled service from Stage 1 and hide it behind an interface token. Feel the overhead of doing it for the first service. Then add a second consumer and feel the payoff.

### Estimated Time: 3-4 hours

### What You Build

**Core contracts directory:**
- `core/contracts/` folder — this is where interface definitions and their associated tokens live
- Pick the service that's imported by the most other modules (probably `AccountsService` or `PermissionsService` if you extracted one)
- Define a TypeScript interface describing its public API
- Create a `Symbol` token: `export const I_ACCOUNTS_SERVICE = Symbol('IAccountsService')`

**Provider wiring:**
- In the owning module, register the concrete class against the token using a custom provider (`useClass`)
- Export the token, not the class

**Consumer migration:**
- Refactor one consumer to inject via `@Inject(I_ACCOUNTS_SERVICE)` instead of importing the concrete class
- Then refactor a second consumer the same way

### What You Should Feel By The End

- **First token overhead** — defining the interface, creating the symbol, wiring the custom provider, updating the consumer's constructor — it feels like *a lot* of ceremony for one service. Your Express instinct screams "just import the file."
- **Second token payoff** — when you wire the second consumer, you do zero work in the provider module. You just inject the token. The contract is stable. The consumer doesn't know or care what class implements it. *This* is where DI earns its keep.
- **Refactoring safety** — imagine replacing the concrete `AccountsService` with a completely different implementation (say, one that calls an external API instead of Prisma). With the token pattern, you change *one line* in the provider module. Every consumer is untouched. With direct imports, you'd be updating every file that imports the class.
- **The type gap** — TypeScript interfaces vanish at runtime. The Symbol is the runtime anchor. This feels weird if you've never encountered it. Sit with it — understanding *why* this is necessary deepens your understanding of TypeScript's type system.

### Key NestJS Docs to Read

- [Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers) — useClass, useValue, useFactory, injection tokens
- [Injection Scopes](https://docs.nestjs.com/fundamentals/injection-scopes) — default singleton behavior, when scoping matters

### The "Aha" Moment to Watch For

When you change the second consumer, you should feel something click: **the module that owns the service decides what the implementation is. Consumers just declare what shape they need.** This is inversion of control. You've probably read that phrase before. Now you've felt it.

---

## Stage 3 — Module Descriptor Pattern

### Goal

Eliminate the central `permissions.constants.ts` file. Each module describes its own permissions via a descriptor. A registry in core assembles the full catalog at application bootstrap. Adding a new module means zero edits to existing files.

### Estimated Time: 4-5 hours

### What You Build

**Module descriptors:**
- Each module (Accounts, Transactions, Categories, etc.) defines a descriptor object that declares its permissions, display name, and metadata
- The descriptor is co-located with the module — it lives *inside* the module's folder

**Permission registry:**
- `core/PermissionRegistry` — a service that collects all module descriptors
- Uses NestJS lifecycle hook `OnApplicationBootstrap` to assemble the full permission catalog after all modules are initialized
- Exposes methods to query the catalog: "give me all permissions," "give me permissions for this module," etc.

**New module — Budgets:**
- Build a `BudgetsModule` with basic CRUD (budget has: household_id, category_id, monthly_limit, current_spent)
- Add its own descriptor with its own permissions
- Register it in AppModule
- Confirm the PermissionRegistry includes Budgets permissions *without editing any file outside of `modules/budgets/`*

### What You Should Feel By The End

- **Open/Closed principle made real** — the system is open for extension (add a new module with its descriptor) and closed for modification (you don't edit the registry, constants file, or any other module). You've read this in textbooks. Now you've built it.
- **The descriptor as a contract** — the shape of the descriptor object *is* the interface between modules and the registry. If you change the shape, TypeScript tells you which modules need updating. The compiler is doing architectural enforcement for you.
- **Bootstrap lifecycle clarity** — you now understand *when* things happen in a NestJS app: construction (providers created), then `onModuleInit` (per-module setup), then `onApplicationBootstrap` (everything is wired, safe to aggregate). Timing matters.
- **The central file is gone** — delete `permissions.constants.ts`. It feels good. That file was a magnet for merge conflicts and a violation of module boundaries. Its replacement is distributed, type-safe, and self-assembling.

### Key NestJS Docs to Read

- [Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events) — onModuleInit, onApplicationBootstrap, and the order they fire
- [Dynamic Modules](https://docs.nestjs.com/fundamentals/dynamic-modules) — forRoot/forFeature patterns (you may not use these yet, but understanding them contextualizes the descriptor pattern)

### Decisions You'll Face

1. How do modules register their descriptors with the registry? Do they push into it, or does the registry pull from them? (Hint: think about who should depend on whom.)
2. What happens if two modules declare the same permission key? Crash at startup? Last-one-wins? How do you want to handle this?
3. Should the descriptor include just permissions, or also metadata like display name, description, enabled-by-default? Think about what Stage 4 will need.

---

## Stage 4 — Per-Tenant Feature Flags and a Global Guard

### Goal

Not every household gets every module. Budgets, Investments, and BillReminders are optional features enabled per-household via a feature flag table. A global guard and custom decorator gate HTTP access. Then you discover that non-HTTP flows (event handlers) also need gating — and that's a different problem.

### Estimated Time: 5-7 hours

### What You Build

**Feature flag infrastructure:**
- `FeatureFlag` model in Prisma (household_id, module_name, is_enabled)
- `FeatureFlagService` — checks whether a module is enabled for a given household
- Seed data: enable Budgets for Household A, disable it for Household B

**Declarative gating:**
- `@RequiresModule('budgets')` — a custom decorator that attaches metadata to a controller or handler
- `ModuleEnabledGuard` — a global guard that reads the decorator metadata, extracts the household from the request, checks the feature flag, and returns 403 if the module is disabled

**Validation:**
- Household A can hit `/budgets/*` endpoints — 200s
- Household B hits `/budgets/*` — clean 403 with a meaningful error message
- All non-flagged routes (accounts, transactions, etc.) work for both households

**The event trap:**
- Add a simple domain event: when a Transaction is created, emit a `TransactionCreated` event
- Budgets module subscribes to it (e.g., to update `current_spent` on a matching budget)
- Now create a transaction for Household B (where Budgets is disabled)
- Watch the subscriber fire anyway — because events aren't HTTP requests, the guard doesn't apply
- Sit with this problem. Think about where the feature flag check should live for event-driven flows.

### What You Should Feel By The End

- **Declarative > imperative** — instead of `if (featureEnabled)` checks scattered through controllers, you put a decorator on the class and a guard handles it globally. Adding feature gating to a new module is one decorator, not a code change in every handler.
- **The guard pattern** — guards in NestJS run before the handler and can kill the request. They have access to the execution context, which means they can read decorator metadata. This metadata + guard combination is a core NestJS pattern you'll use constantly.
- **The event/HTTP boundary problem** — HTTP has a request context with a user, a household, a guard pipeline. Events don't. The NestJS execution context is different for events. This is a real architectural problem in any modular system: edge gating doesn't protect internal message flows. You need to think about where the boundary *actually* is.
- **Request-scoped vs. application-scoped** — the feature flag check needs the current household, which comes from the request. Events don't have a request. This forces you to think about scope in a new way.

### Key NestJS Docs to Read

- [Guards](https://docs.nestjs.com/guards) — canActivate, execution context, global guards
- [Custom Decorators](https://docs.nestjs.com/custom-decorators) — SetMetadata, creating and reading metadata
- [Events](https://docs.nestjs.com/techniques/events) — EventEmitter2, @OnEvent

### Decisions You'll Face

1. Does the guard check the feature flag on every request, or do you cache it? What are the trade-offs?
2. When the guard rejects a request, what does the 403 response body look like? Just "Forbidden," or something more informative?
3. For the event problem — do you check the feature flag inside the event handler? In a decorator on the handler? In a middleware around the event bus? Each choice has different coupling implications.

---

## Stage 5 — Pluggable Adapter Pattern

### Goal

Define an interface for bank integrations. Build two fake adapters. Register them using the multi-provider pattern. A dispatch service picks the right adapter at runtime based on the bank name. Adding a new bank adapter means zero changes to existing code.

### Estimated Time: 4-5 hours

### What You Build

**Core contract:**
- `IBankAdapter` interface in `core/contracts/` — methods like `fetchAccounts()`, `fetchTransactions(accountId, dateRange)`
- `BANK_ADAPTER` injection token

**Two fake adapters:**
- `ChaseAdapter` — returns hardcoded Chase-flavored data (account names, transaction descriptions that look like Chase)
- `WellsFargoAdapter` — same interface, different fake data
- Both implement `IBankAdapter`

**Multi-provider registration:**
- Both adapters registered against the same `BANK_ADAPTER` token using the multi-provider pattern (`useClass` with `multi: true` or provide an array via a factory)
- A `BankAdapterRegistry` or `BankSyncService` that injects all adapters and dispatches by bank name

**Integration endpoints:**
- `POST /accounts/:id/sync` — picks the right adapter based on the account's bank name, calls `fetchTransactions()`, upserts the results
- Works for both Chase and Wells Fargo accounts

### What You Should Feel By The End

- **The plugin pattern** — adapters are plugins. They implement a contract, register themselves, and the core system dispatches to them without knowing their internals. Adding a third adapter is: write the class, implement the interface, register it. No other file changes.
- **Multi-provider mechanics** — NestJS can inject an *array* of providers for the same token. This is the mechanical basis for any plugin system: register many, inject all, dispatch by criteria.
- **Dispatch strategy** — you have to decide *how* the registry picks the right adapter. By name? By a method on the adapter itself (`adapter.supports(bankName)`)? Each approach has different extension properties. The `supports()` pattern is more flexible — think about why.
- **Interface as architecture** — the `IBankAdapter` interface is doing real architectural work now. It's the contract between "core platform" and "bank integrations." If a new adapter violates the contract, TypeScript catches it at compile time. The interface isn't documentation — it's enforcement.

### Key NestJS Docs to Read

- [Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers) — revisit, focusing on factory providers and multi-providers
- [Dynamic Modules](https://docs.nestjs.com/fundamentals/dynamic-modules) — forRoot/forFeature, useful if you want adapters to self-register

### Decisions You'll Face

1. Does each adapter know its own bank name, or is the name assigned externally during registration?
2. What happens when someone requests a sync for a bank with no registered adapter? Error? No-op? How do you make this failure mode obvious?
3. Should adapters be stateless (pure functions of input) or can they hold configuration (API keys, rate limits)? What does each choice imply for testing and registration?

---

## Stage 6 — Delegation

### Goal

Add role management endpoints. Discover that without delegation checks, a member can escalate themselves to owner-level access. Fix it by adding delegation metadata to module descriptors — the same descriptors from Stage 3 now carry authorization semantics.

### Estimated Time: 5-7 hours

### What You Build

**Role management:**
- Endpoints to create and assign roles within a household
- A role is a named collection of permissions (e.g., "Accountant" role has TRANSACTIONS_FULL + ACCOUNTS_READ + BUDGETS_EDIT)
- Users are assigned roles. Their effective permissions are the union of all their roles' permissions.

**The exploit:**
- Create a user with the "member" role that has limited permissions
- Use that user to create a new role with FULL access on everything
- Assign that role to themselves
- Confirm it works — you just escalated yourself. This is a real vulnerability in any RBAC system that doesn't check delegation.

**Delegation metadata:**
- Extend the module descriptors from Stage 3 with delegation rules: `grantableBy` specifies which access levels are required to grant each permission
- Example: to grant `BUDGETS_EDIT` to someone else, you must have `BUDGETS_FULL`

**Delegation check:**
- When a user creates or modifies a role, check every permission in that role against the user's own permissions and the delegation rules
- If the user tries to grant a permission they aren't authorized to delegate, reject the operation
- Try the exploit again — blocked

### What You Should Feel By The End

- **Descriptors as the single source of truth** — the same descriptor object that declares permissions (Stage 3) and informs feature flags (Stage 4) now also carries delegation rules (Stage 6). The descriptor is doing real architectural work — it's the module's self-description that the platform reads.
- **Authorization vs. delegation** — these are different problems. Authorization: "can you do this action?" Delegation: "can you give someone else the ability to do this action?" Most tutorials conflate them. You now understand the difference viscerally because you built one without the other and saw the exploit.
- **The full pattern** — stand back and look at what you've built: modules that self-describe, a registry that assembles them, guards that enforce them, adapters that extend them, and delegation rules that govern them. This is the kernel/module/plugin architecture. You didn't learn it from a diagram — you built it from the pain of not having it.

### Key NestJS Docs to Read

- [Authorization](https://docs.nestjs.com/security/authorization) — role-based and claims-based, guards for authorization
- Revisit [Guards](https://docs.nestjs.com/guards) — layering multiple guards (module enabled + permission check + delegation check)

### Decisions You'll Face

1. When checking delegation, do you check at the role-creation endpoint or in a service that any endpoint can use? What if role mutations can come from multiple places?
2. What does the error message look like when delegation fails? "Forbidden" is useless. What information helps an admin understand *why* they can't grant a specific permission?
3. Can an owner always grant everything? Or should even owners be subject to delegation rules? This is a real product decision with security implications.

---

## Time Summary

| Stage | Core Focus | Estimated Time | Cumulative |
|---|---|---|---|
| 1 | Wrong on purpose — working CRUD, feel the coupling | 6-8 hours | 6-8 hours |
| 2 | First interface token — feel overhead, then payoff | 3-4 hours | 9-12 hours |
| 3 | Module descriptors — open/closed, self-assembly | 4-5 hours | 13-17 hours |
| 4 | Feature flags + guard — declarative gating, event trap | 5-7 hours | 18-24 hours |
| 5 | Pluggable adapters — multi-provider, dispatch | 4-5 hours | 22-29 hours |
| 6 | Delegation — authorization vs. delegation, exploit and fix | 5-7 hours | 27-36 hours |

**Total: 27-36 hours of focused work across all stages.**

This is not "time to type the code." This includes reading docs, making wrong choices, debugging, feeling the pain, backing up, and redoing things. The learning *is* the process. Rushing through defeats the purpose.

---

## The Architectural Arc

Zooming out, here's what the six stages teach you in sequence:

```
Stage 1: Build it coupled.
         → Learn what coupling feels like in practice.

Stage 2: Introduce one abstraction boundary.
         → Learn the cost of abstraction AND its payoff.

Stage 3: Make modules self-describing.
         → Learn the open/closed principle through lived experience.

Stage 4: Add runtime conditional behavior.
         → Learn where declarative gating works and where it breaks.

Stage 5: Make the system extensible by third parties.
         → Learn the plugin pattern through the adapter contract.

Stage 6: Add governance to the flexibility.
         → Learn that power without delegation checks is a vulnerability.
```

Each stage answers a specific question:

| Stage | Question Answered |
|---|---|
| 1 | What goes wrong when everything knows about everything? |
| 2 | What does it cost to draw one boundary? What does it save? |
| 3 | How do modules contribute to the whole without knowing the whole? |
| 4 | How do you conditionally enable/disable entire feature areas? |
| 5 | How do you let new integrations plug in without changing core code? |
| 6 | How do you prevent flexibility from becoming a security hole? |

---

## Principles That Emerge

By Stage 6, you will have internalized these principles — not because someone told you, but because you violated them and felt the consequence:

1. **Depend on abstractions, not concretions.** (Stage 2) Importing a concrete class couples you to its implementation. Injecting a token couples you to a contract. Contracts are stable. Implementations aren't.

2. **Modules should be open for extension, closed for modification.** (Stage 3) Adding a feature should not require editing the files that define other features. Descriptors and registries make this possible.

3. **Gating belongs at the edge, but not only at the edge.** (Stage 4) HTTP guards are necessary but insufficient. Any flow that bypasses the HTTP pipeline (events, cron jobs, queues) needs its own gating strategy.

4. **Interfaces are architectural boundaries, not just type annotations.** (Stage 5) An interface that multiple modules depend on is a contract. Changing it is a negotiation, not a refactor. Treat it accordingly.

5. **Authorization and delegation are separate concerns.** (Stage 6) "Can you do X?" and "Can you grant X?" are different questions with different enforcement points.

6. **Pain is signal.** (All stages) If something feels tedious, repetitive, or fragile, that feeling is pointing you at a design problem. Don't numb it with boilerplate — fix the design.

---

## How to Use This Guide

**If you're the developer doing this exercise:**
- Follow the stages in order. Seriously. Stage N+1 doesn't make sense without the pain from Stage N.
- Type every line yourself. Copy-pasting teaches your clipboard, not your brain.
- When you're stuck, describe what you tried and what happened. Then ask for help.
- Keep a learning log. After each stage, write down: what you built, what hurt, what clicked, and what you'd do differently.

**If you're a coach guiding someone through this:**
- Ask before explaining. When they hit a decision point, ask what they think and why.
- Let them make suboptimal choices if those choices aren't destructive. The pain is the lesson.
- Only intervene when they're about to learn the *wrong* thing or get stuck in a way that wastes hours without insight.
- When they ask "why," give the reasoning, not the rule. "Because if you import the concrete class, any refactor in the provider module ripples into every consumer" teaches. "Because that's the pattern" doesn't.

**If you're evaluating whether this exercise is right for you:**
- Prerequisites: you can build a REST API in Node.js/Express. You understand TypeScript basics. You've heard of dependency injection but haven't used it in a container-managed framework.
- Time commitment: ~30 hours of focused work over 2-4 weeks.
- Outcome: working intuition for DI, module boundaries, the descriptor/registry pattern, declarative gating, plugin architecture, and delegation-safe RBAC. These patterns transfer to any framework — Spring, ASP.NET, Angular — not just NestJS.

---

## What This Exercise Is NOT

- **Not a NestJS tutorial.** The NestJS docs are the tutorial. This exercise is a sequence of problems that force you to understand what the docs are teaching.
- **Not a finance app.** The domain is deliberately simple so architectural decisions stay in focus. If you're spending more than 20% of your time on business logic, you're overthinking the domain.
- **Not a production template.** The code you write here is a learning artifact. It demonstrates patterns in isolation. A real SaaS app would layer in authentication, observability, testing, CI/CD, and a hundred other concerns. Don't ship this. Learn from it.
- **Not the only way.** These patterns are one school of thought. Other approaches (functional composition, effect systems, service mesh) solve similar problems differently. This exercise gives you *a* foundation, not *the* foundation. Build on it.
