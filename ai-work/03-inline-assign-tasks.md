## Relevant Files

- `src/routes/admin/virtual-channels/+page.server.ts` - Virtual-channel admin page data loading and server actions that will need inline assignment support.
- `src/routes/admin/virtual-channels/+page.svelte` - Virtual-channel admin UI where inline assignment lists and controls will be added.
- `src/lib/daos/assignmentDAO.ts` - Assignment persistence used by inline add/remove actions.
- `src/lib/daos/sourceChannelDAO.ts` - Source-channel queries needed to populate available inline add options.
- `src/lib/daos/virtualChannelDAO.ts` - Virtual-channel loading used to render list-level assignment summaries.
- `src/routes/admin/assignments/+page.server.ts` - Existing standalone assignments backend retained for now and potentially affected by shared assignment behavior.
- `src/routes/admin/assignments/+page.svelte` - Existing standalone assignments UI retained for now and useful as reference.
- `tests/admin/` - Route or interaction tests for new inline assignment behavior where practical.
- `tests/lib/assignment-dao.test.ts` - DAO tests that may need extension if inline flows uncover assignment edge cases.

### Notes

- Unit tests should typically be placed alongside the code files they are testing.
- Consult `/ai-work/00-master-techstack.md` for the approved shared stack and tooling choices.
- Use Windows-compatible, non-interactive commands in this repository, consistent with `AGENTS.md`.
- Avoid long-running commands such as development servers unless explicitly requested.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, update this markdown file by changing `- [ ]` to `- [x]`. Update the file after completing each sub-task, not only after completing a parent task.

## Tasks

- [x] 1.0 Extend the virtual-channels page data model to support inline assignment display and available-add options
  - [x] 1.1 Load current source-channel associations for each virtual channel on the virtual-channels admin page
  - [x] 1.2 Load the set of already imported source channels that can be attached inline
  - [x] 1.3 Shape the server data so each virtual channel has both associated source channels and remaining available add options
- [x] 2.0 Add inline assignment display and controls to the virtual-channels admin UI
  - [x] 2.1 Show associated source-channel names inline for each virtual channel row
  - [x] 2.2 Add an inline add-association control for each virtual channel using a dropdown of remaining available source channels
  - [x] 2.3 Add inline remove buttons for each associated source channel with confirmation
  - [x] 2.4 Preserve the existing `Manage` link while integrating the new inline assignment UI cleanly
- [ ] 3.0 Implement inline add/remove behavior that updates in place without a full page reload
  - [ ] 3.1 Add server actions on the virtual-channels page for inline add-association requests
  - [ ] 3.2 Add server actions on the virtual-channels page for inline remove-association requests
  - [ ] 3.3 Enhance the inline add/remove forms so successful actions update the local page state without a full page reload
  - [ ] 3.4 Surface inline add/remove failures clearly enough for the admin to recover
- [ ] 4.0 Validate the inline assignment workflow with targeted automated tests and checks
  - [ ] 4.1 Add route or server-action tests for inline add/remove assignment behavior on the virtual-channels page
  - [ ] 4.2 Add or extend DAO-level tests if the inline workflow exposes assignment edge cases not already covered
  - [ ] 4.3 Run targeted validation for the new inline assignment flow without starting long-running processes
