## Relevant Files

- `src/lib/daos/_schema.ts` - Database schema definition that will be replaced to support per-association modes and per-video review state.
- `src/lib/daos/sourceChannelDAO.ts` - Source channel queries used when attaching existing imported channels to a virtual channel.
- `src/lib/daos/virtualChannelDAO.ts` - Virtual channel queries that will need manage-page and association-aware support.
- `src/lib/daos/videoDAO.ts` - Video lookup queries used to list included and reviewable videos for each association mode.
- `src/lib/daos/shared/DatabaseWrapper.ts` - Shared database initialization that may need schema reset handling for the replacement database shape.
- `src/lib/entities/sourceChannel.ts` - Source channel entity definitions used by admin flows.
- `src/lib/entities/video.ts` - Video entity definitions that may need explicit long/short/unknown classification support.
- `src/lib/entities/virtualChannel.ts` - Virtual channel entity definitions for the manage page and associations.
- `src/lib/entities/virtualChannelAssignment.ts` - Existing virtual channel assignment model that will likely be replaced or expanded for association-mode behavior.
- `src/lib/youtube/mapper.ts` - Mapping layer that may need to preserve YouTube long/short classification metadata.
- `src/lib/youtube/importer.ts` - Import flow that may need to carry through classification fields used by admin filtering.
- `src/routes/admin/+layout.svelte` - Admin navigation that may need an updated entry point or label for the manage virtual channel flow.
- `src/routes/admin/virtual-channels/+page.server.ts` - Existing virtual channel admin page server logic that may link to the new management page.
- `src/routes/admin/virtual-channels/+page.svelte` - Existing virtual channel list/create UI that may add manage links.
- `src/routes/admin/virtual-channels/[virtualChannelId]/+page.server.ts` - New manage-virtual-channel data loading and form actions.
- `src/routes/admin/virtual-channels/[virtualChannelId]/+page.svelte` - New manage-virtual-channel UI with association panels and bulk selection tools.
- `src/app.css` - Shared styles for dense admin list layouts, expandable panels, and thumbnail rows.
- `scripts/create_database.ts` - Database creation script that should align with the replacement schema.
- `tests/lib/youtube/mapper.test.ts` - Mapper tests for any stored long/short classification behavior.
- `tests/lib/youtube/importer.test.ts` - Import tests for persisted classification metadata.
- `tests/lib/daos/virtualChannelDAO.test.ts` - New DAO tests for association modes and selected-only review state.
- `tests/lib/daos/videoDAO.test.ts` - New DAO tests for included-video queries and selected-only filtering.

### Notes

- Unit tests should typically be placed alongside the code files they are testing.
- Consult `/ai-work/00-master-techstack.md` for the approved shared stack and tooling choices.
- Use Windows-compatible, non-interactive commands in this repository, consistent with `AGENTS.md`.
- Avoid long-running commands such as development servers unless explicitly requested.
- This task list is being prepared for planned feature `02-vchannel-mgmt` as a documentation exception before branch activation.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, update this markdown file by changing `- [ ]` to `- [x]`. Update the file after completing each sub-task, not only after completing a parent task.

## Tasks

- [ ] 1.0 Replace the data model to support virtual-channel source associations with per-association mode and review state
  - [x] 1.1 Redesign the schema for virtual-channel/source-channel associations to store per-association mode, timestamps, and uniqueness constraints
  - [x] 1.2 Add storage for per-association selected-only video review state with `included`, `ignored`, and `not yet reviewed`
  - [ ] 1.3 Update entity and DAO types to represent association modes, review states, and long/short/unknown video classification
  - [ ] 1.4 Update database creation/reset scripts to use the replacement schema without requiring migration compatibility
- [ ] 2.0 Add admin routes and server actions for managing a single virtual channel's source-channel associations
  - [ ] 2.1 Add a dedicated admin route for managing an existing virtual channel by ID
  - [ ] 2.2 Load the virtual channel, existing source associations, and available imported source channels for the manage page
  - [ ] 2.3 Implement server actions to add a source-channel association to a virtual channel
  - [ ] 2.4 Implement server actions to update an association mode and remove an association from a virtual channel
  - [ ] 2.5 Implement server actions to persist per-video selected-only review changes and bulk updates for the current filtered result set
- [ ] 3.0 Build the manage-virtual-channel UI for association lists, expandable video panels, and ternary selection state
  - [ ] 3.1 Add manage links from the virtual channel admin list into the dedicated manage page
  - [ ] 3.2 Build the manage page layout showing virtual channel details, associated source channels, and add-source controls
  - [ ] 3.3 Add per-association mode selectors and row-level actions for removing associations
  - [ ] 3.4 Build expandable panels for `all` and `long only` associations that display automatically included videos
  - [ ] 3.5 Build the `selected only` panel with dense long-list presentation, small thumbnails, and clear row metadata
  - [ ] 3.6 Add row-level ternary controls for setting video state to included, ignored, or not yet reviewed
- [ ] 4.0 Implement filtering and temporary bulk-selection tools for selected-only video review
  - [ ] 4.1 Add a review-state filter that can isolate not-yet-reviewed videos
  - [ ] 4.2 Add regex filtering against video title and description within the selected-only list
  - [ ] 4.3 Add video-type filtering for long, short, and unknown classification where available
  - [ ] 4.4 Add temporary bulk actions for the currently shown rows, including select-all-shown and select-none-shown behavior
  - [ ] 4.5 Add bulk actions for setting shown rows to ignored and for resetting shown rows back to not yet reviewed if supported by the final UI
- [ ] 5.0 Extend import and query behavior so YouTube long/short classification and selected-only defaults are represented correctly
  - [ ] 5.1 Identify the best available YouTube metadata source in the current codebase for distinguishing long, short, and unknown video status
  - [ ] 5.2 Update mapping and import logic to persist long/short/unknown classification on videos
  - [ ] 5.3 Update included-video queries so `all`, `long only`, and `selected only` associations return the correct effective video set
  - [ ] 5.4 Ensure newly imported videos in selected-only associations default to not yet reviewed and remain excluded until reviewed
  - [ ] 5.5 Surface unknown video-type classification clearly in admin query results and page rendering
- [ ] 6.0 Validate the new admin management flow with targeted automated tests
  - [ ] 6.1 Add DAO tests for association creation, mode changes, uniqueness, and selected-only review persistence
  - [ ] 6.2 Add DAO or query tests for effective inclusion behavior across `all`, `long only`, `selected only`, and unknown classification cases
  - [ ] 6.3 Add mapper/import tests for persisted long/short/unknown metadata behavior
  - [ ] 6.4 Add route or server-action tests for manage-page updates and bulk-review operations where practical
  - [ ] 6.5 Run targeted validation for the new admin management flow without starting long-running processes
