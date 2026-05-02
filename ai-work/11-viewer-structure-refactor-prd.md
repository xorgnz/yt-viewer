# Product Requirements Document: 11-viewer-structure-refactor

## Overview

This feature refactors the viewer-facing portion of the codebase into clearer, class-based module boundaries so the system is easier to understand, extend, and maintain. The current viewer layer relies too heavily on floating helper functions, weakly delineated modules, and state that is not consistently attached to well-defined domain concepts.

The refactor should aggressively improve naming, file structure, and internal interfaces where needed, while preserving current product behavior. The primary target is the viewer surface, but the same structural cleanup should also be applied to other parts of the repository where similar problems are found.

## Goals

1. Replace non-trivial floating-function modules with clearer class-based structures where behavior or state represents a real concept.
2. Make each major viewer concern have one obvious owning class or module.
3. Remove broad helper grab-bags from non-trivial viewer workflows.
4. Preserve current viewer behavior while improving internal boundaries aggressively.
5. Update the shared architecture documentation so the resulting structure is understandable without re-discovering it from code.
6. Produce an explicit class inventory with a short description of each class and its responsibility.

## Scope Boundaries

### In Scope

- `src/lib/viewer/` structural refactoring
- Viewer-related components and route-facing code where responsibilities are currently blurred
- Renaming files and folders aggressively where clearer names improve understanding
- Refactoring other parts of the codebase that show the same function-sprawl and weak-boundary problems
- Server-side structural refactoring when the same modularity problems materially affect maintainability
- Replacing non-trivial helper clusters with class-based model/facade structures where appropriate
- Preserving small, clearly scoped stateless utility modules when they behave like focused function libraries
- Updating `ai-work/00-architecture.md` to explain the resulting system structure and boundaries
- Producing a class inventory document or architecture section listing all relevant classes with a 1-2 sentence description of each

### Out of Scope

- Visual redesign
- CSS cleanup
- Intentional product-behavior changes to filtering, selection, watching, or related viewer workflows except where a structural change requires behavior-preserving adjustments
- Starting this refactor before `10-timers` is complete

### Assumptions and Constraints

- `10-timers` remains the active feature and should finish first.
- Active feature work should avoid making current viewer structure more tangled.
- One class per file is the strong default, but exceptions are allowed for:
  - interfaces used in multiple places
  - related data-only types/classes, such as `ObjectFields` living with `Object`
  - small file-local utilities used only within that file
- Helpers that remain should be stateless and narrowly defined, similar in spirit to focused utility libraries rather than pseudo-state containers.
- State should live on classes representing clear domain or workflow concepts rather than on generic helper modules.

## Architectural Direction

The preferred structure should follow an MVC-like split where practical:

- `.svelte` files contain the view and much of the controller-level interaction wiring
- model-side behavior should live in entity classes, facade classes, or other explicitly named classes representing real concepts
- utilities may exist, but they should generally be stateless and narrow in purpose

This refactor should bias toward classes when a module owns:
- state
- workflow coordination
- business rules
- derived behavior tied to a named concept

This refactor should bias toward stateless utility functions only when the code is:
- conceptually generic
- side-effect free
- reusable without hidden state
- easily explained without broad knowledge of surrounding modules

## User Stories

- As a maintainer, I can identify which class owns each major viewer concern without tracing broad helper chains.
- As a maintainer, I can understand the purpose of a module with minimal knowledge of unrelated viewer code.
- As a maintainer, I can change one viewer concern without risking unrelated behavior due to weak module boundaries.
- As a maintainer, I can distinguish stateful model/facade code from stateless utility code quickly.
- As a maintainer, I can read the architecture documentation and get a concise explanation of how the refactored parts fit together.
- As a maintainer, I can review a class inventory and understand the purpose of each major class without opening every file.

## Functional Requirements

### Structural Ownership

1. Each major viewer concern must have one obvious owning class or module.
2. No non-trivial viewer workflow should depend on broad helper grab-bags.
3. Stateful viewer behavior should be attached to classes representing well-defined concepts.
4. Stateless utilities may remain only when their purpose is narrow, generic, and clearly separable from stateful concepts.

### Class And File Structure

5. One class per file should be the default for non-trivial class-based modules.
6. File and folder names should be updated aggressively when clearer names improve modular understanding.
7. Exceptions to one-class-per-file are allowed only for:
   - related data-only types/classes
   - shared interfaces
   - small file-local utilities
8. A class should be understandable in purpose with minimal need to inspect unrelated parts of the viewer layer.

### Viewer-Layer Refactoring

9. `src/lib/viewer/` should be reorganized around clear model/facade/state concepts rather than helper buckets.
10. Selection, filtering, pagination, page-state, and similar concerns should have clearer ownership boundaries than they do today.
11. Viewer route and component support code should depend on explicit classes or narrow stateless libraries rather than mixed-responsibility helper modules.

### Utility Design Rules

12. It is not sufficient to wrap individual utility functions in one-class-per-file shells and thereby replace a forest of small functions with a forest of small classes.
13. Stateless utility code that remains should be grouped by a clear, defensible purpose rather than fragmented into many tiny pseudo-object modules.
14. Utility groupings should be easy to explain in one sentence, similar to the way focused libraries organize related array, collection, or formatting functions.
15. A utility module should exist only when a real shared functional boundary exists; otherwise the behavior should belong to a concept-owning class.

### Broader Structural Cleanup

16. Other repository areas with the same floating-function and weak-boundary problems should be identified during the refactor.
17. When such areas materially affect maintainability, they may be refactored under the same standards.
18. Server-side modules may be refactored when they show the same structural problems and the change materially improves modular clarity.

### Architecture Documentation

19. `ai-work/00-architecture.md` must be updated as part of this feature.
20. The architecture update must explain the resulting structure, major boundaries, and how the refactored viewer-related classes collaborate.
21. The architecture update must describe how stateful classes, entities, facades, stateless utilities, routes, and Svelte components relate to each other in the refactored design.
22. The architecture update must be written so another agent can understand the intended system shape without rediscovering it from code alone.

### Class Inventory

23. The refactor must produce a class inventory covering the affected design.
24. Each listed class must include a 1-2 sentence description of its responsibility.
25. The class inventory may live in `ai-work/00-architecture.md` or in a dedicated companion planning document if that yields a clearer result.
26. The class inventory should focus on meaningful classes in the affected architecture rather than trivial one-off value containers.

## Non-Goals

- Rewriting the app into a formal framework-enforced MVC architecture
- Converting every small helper into a class
- Replacing simple, local, stateless utilities that are already clear
- Changing user-facing workflows for its own sake

## Refactor Heuristics

The refactor should use these heuristics consistently:

- If code owns meaningful state, it should usually become a class.
- If code coordinates a named workflow or concept, it should usually become a class or facade.
- If code is generic, stateless, and conceptually narrow, it may remain a utility library.
- If a module is hard to explain without describing multiple unrelated responsibilities, it likely has the wrong boundary.
- If a file name no longer reflects its true responsibility, rename it.
- If several small utilities share one coherent purpose, group them deliberately instead of scattering them across many tiny wrapper classes.

## Risks And Considerations

- Aggressive renaming and interface redesign will create churn and requires disciplined scope control.
- The refactor must preserve current viewer behavior even while internal structure changes significantly.
- Over-applying class abstractions where a stateless utility is clearer would create a different kind of complexity.
- The work should not leak into visual redesign or product-behavior rewriting.
- Architecture documentation must stay aligned with the implemented structure rather than becoming an aspirational sketch.

## Success Criteria

1. Each major viewer concern has one obvious owning class or module.
2. No non-trivial viewer workflow depends on broad helper grab-bags.
3. Stateful behavior is attached to well-defined concept classes rather than generic utility modules.
4. Remaining helper libraries are stateless, narrow, grouped sensibly, and easy to justify.
5. File and folder naming better reflects module responsibilities.
6. `ai-work/00-architecture.md` clearly explains how the refactored structure works.
7. The class inventory exists and gives a short, useful description of each major class.
8. Current user-visible viewer behavior remains intact.
