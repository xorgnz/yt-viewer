# Code Smells

## Objects Instantiated Just To Call One Method Then Discarded

*You built a tool, used it once for one tiny thing, and threw it away every time. That usually means it should not be a full tool.*

If code repeatedly creates an object, calls a single method, and immediately discards the object, that is usually a design smell.

Why this is a smell:
It adds ceremony without adding useful state or behavior. It also hides whether the code should be a plain function, static method, or long-lived dependency.

It often means one of these is true:
- The behavior should be a static or plain function.
- The object boundary is misplaced and state does not belong to an instance.
- The caller needs a longer-lived dependency (injected once) instead of per-call construction.

## God Class (Too Many Responsibilities)

*One class is trying to do everyone’s job on the team.*

A class that owns unrelated concerns (validation, persistence, mapping, side effects, transport) is hard to test and change safely.

Why this is a smell:
Changes in one concern can break others, test setup becomes heavy, and ownership gets unclear. This slows down delivery and increases regression risk.

Common fix:
- Split into focused collaborators and keep one orchestration layer thin.

## Anemic Model + Service Dump

*The important objects are empty shells, and one giant service does all the thinking.*

When domain objects are just data bags and all behavior lives in broad `*Service` classes, invariants spread and duplicate.

Why this is a smell:
Rules are easy to copy wrong in multiple places. The data type stops protecting itself, so invalid states slip through.

Common fix:
- Move core invariants and transformations closer to the data they govern.

## Inheritance Used For Reuse Instead Of Subtyping

*You said "is-a" when it is really just "uses-a."*

If a subclass exists mainly to reuse implementation but is not truly substitutable, inheritance is the wrong tool.

Why this is a smell:
It creates brittle coupling and fake type relationships. Overridden behavior can violate expectations in subtle ways.

Common fix:
- Prefer composition and small helper objects/functions.

## Deep Inheritance Hierarchies

*You have to climb a family tree of classes to understand one method.*

Many inheritance levels increase hidden coupling and make behavior hard to trace.

Why this is a smell:
Behavior is split across ancestors, so debugging requires jumping between files and mental merging of overrides.

Common fix:
- Flatten hierarchy and favor explicit composition.

## Boolean Flag Explosion In Methods

*A function call looks like a mystery code of true/false switches.*

Methods like `process(x, true, false, true)` hide intent and create branch-heavy behavior.

Why this is a smell:
Call sites are unreadable, test combinations explode, and behavior is easy to misunderstand without opening implementation details.

Common fix:
- Split into explicit methods or use a typed options object with meaningful names.

## Primitive Obsession

*Everything is just plain strings and numbers, even when meanings are very different.*

Passing raw `string`/`number` values for important concepts (IDs, keys, status) causes mix-ups and weak validation.

Why this is a smell:
Type checks cannot prevent accidental swaps. Validation gets duplicated at many call sites instead of living in one place.

Common fix:
- Introduce small value objects or branded types for critical primitives.

## Stringly Typed Protocols

*Important rules depend on "magic words" typed as strings everywhere.*

Heavy reliance on ad-hoc string keys/status values without central types leads to silent drift.

Why this is a smell:
Typos and naming drift become runtime bugs. Refactoring becomes risky because there is no single contract to update.

Common fix:
- Use literal unions, enums, and shared typed contracts.

## `any` As Boundary Glue

*You turned off the type checker exactly where safety matters most.*

Using `any` at module boundaries bypasses contracts and lets invalid states move through the system.

Why this is a smell:
Errors spread far from the source and appear later in unrelated code paths, making defects harder to locate.

Common fix:
- Parse unknown input once at the boundary, then use narrowed typed shapes internally.

## Leaky Abstractions

*Your wrapper still makes everyone deal with messy internals.*

A wrapper that repeatedly exposes underlying implementation details (`db`, HTTP details, framework internals) provides little value.

Why this is a smell:
The abstraction does not reduce complexity, so you pay extra indirection cost without gaining isolation or replaceability.

Common fix:
- Either narrow and enforce the abstraction or remove it.

## Constructor Over-Injection

*The class needs a huge shopping list of stuff just to start.*

Constructors with many dependencies are often a signal of unclear boundaries and mixed concerns.

Why this is a smell:
It usually means the class does too much. It also makes tests noisy and increases accidental coupling between modules.

Common fix:
- Split the class or group related dependencies behind smaller interfaces.

## Temporal Coupling

*The code only works if you do steps in the exact right order, but the API does not clearly enforce that.*

Objects that require calls in a strict hidden order (`init` before `run`, `setX` before `save`) are fragile.

Why this is a smell:
Order mistakes become runtime bugs. New contributors can call methods correctly by type but still break behavior.

Common fix:
- Enforce valid state transitions through the API shape.

## Side-Effectful Getters

*A method that looks like "just reading" secretly changes things.*

Getters that mutate state, call network/DB, or depend on ambient mutable state are surprising and error-prone.

Why this is a smell:
It violates developer expectations, making code harder to reason about and causing hidden performance or behavior issues.

Common fix:
- Keep getters pure and move side effects to explicit methods.

## Silent Catch + Fallback

*Something fails, but the code pretends everything is fine.*

Catching broad errors and returning generic success/fallback values hides faults and complicates debugging.

Why this is a smell:
Real defects are masked and later show up as inconsistent data or confusing behavior far from the original failure.

Common fix:
- Preserve error context and return typed failure results.

## Mutable Shared State Across Requests

*One user’s request can accidentally affect another user.*

Keeping request-specific state in long-lived singletons creates cross-request leakage bugs.

Why this is a smell:
State leaks create nondeterministic bugs and security risks. These issues are difficult to reproduce and diagnose.

Common fix:
- Keep request state request-scoped and pass it explicitly.
