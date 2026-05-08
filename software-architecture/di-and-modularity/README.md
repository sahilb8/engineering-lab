# Dependency Injection & Modularity

Learning project for developing intuition about dependency injection, module boundaries, and the kernel/module/plugin pattern in a multi-tenant SaaS context.

## Why this exists

I have ~10 years of Node.js + Express + MVC experience. I'm starting to work on a NestJS modular-monolith SaaS codebase at work and realized my mental model for "how an application wires itself together" is stuck in the middleware-and-handlers shape Express teaches. This project is the bridge — small enough to finish, structurally similar enough to the work codebase that the lessons transfer.

The goal is *not* to build a finance tracker. The goal is to feel, in my hands, the difference between:
- importing a concrete class vs. injecting through an interface token
- a central constants file vs. per-module contributions to a registry
- inline feature-flag checks vs. declarative edge gating
- authorization vs. delegation in RBAC

The finance tracker is just the vehicle that makes these questions concrete.

## The vehicle

A multi-tenant personal finance tracker. Tenants are households. Users have roles (owner / member / viewer) with access levels (NO_ACCESS / READ / EDIT / FULL). Per-household feature flags enable optional modules. Fake "bank adapters" stand in for pluggable third-party integrations.

Stack: NestJS, Prisma, SQLite. No frontend. Auth faked via middleware. Tested with curl.

Code lives in [./finance-tracker/](./finance-tracker/).

## The stages

Each stage ends with something running *and* something that hurts. The hurt sets up the next stage.

1. **Wrong on purpose** — one app, central constants, direct imports, manual tenant threading. Feel the pain of adding a new module.
2. **First interface token** — extract one contract, feel the overhead, then feel the payoff on the second consumer.
3. **Module descriptor pattern** — per-module permission contributions assembled at bootstrap. Add a module without editing a central file.
4. **Feature flags + global guard** — per-tenant module gating via decorator and global guard. Discover that event handlers also need gating.
5. **Pluggable adapter pattern** — IBankAdapter, multi-provider registration, runtime dispatch.
6. **Delegation** — add role management. Exploit the escalation path. Fix it architecturally by adding delegation metadata to descriptors.

## Current status

_Update this as you go. Keep it short — one line per stage._

- [ ] Stage 1 — Wrong on purpose
- [ ] Stage 2 — First interface token
- [ ] Stage 3 — Module descriptors
- [ ] Stage 4 — Feature flags
- [ ] Stage 5 — Pluggable adapters
- [ ] Stage 6 — Delegation

## Rules I set for myself

1. Type every line. No copy-paste, not even from AI responses.
2. Try first, ask second. Describe what I tried and what happened before asking for help.
3. Don't skip ahead. Stage N+1 doesn't exist until stage N runs and hurts.
4. Precise confusion gets precise help. "I'm confused about X" beats "help."
5. Read the linked doc section *before* asking the follow-up.

## Log

See [LEARNING_LOG.md](./LEARNING_LOG.md) for per-session notes. The log is the point. Don't skip the log.

## References

_Add as you actually use them. Don't front-load._