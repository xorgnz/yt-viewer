<script lang="ts">
    import { enhance } from '$app/forms';
    import type { PageData, SubmitFunction } from './$types';
    import type { SourceChannelSFO } from '$lib/entities/sourceChannel';
    import type { VirtualChannelAssignmentFields } from '$lib/entities/virtualChannelAssignment';
    import type { VirtualChannelSFO } from '$lib/entities/virtualChannel';

    export let data: PageData;

    type InlineAssociationRow = {
        assignment: VirtualChannelAssignmentFields;
        sourceChannel: SourceChannelSFO | null;
    };
    type VirtualChannelRow = {
        virtualChannel: VirtualChannelSFO;
        associatedSourceChannels: InlineAssociationRow[];
        availableSourceChannels: SourceChannelSFO[];
    };
    type InlineStatus = { type: 'success' | 'error'; text: string };
    type VirtualChannelId = string | number;
    type InlineAssociationActionData = {
        virtualChannelRow: VirtualChannelRow;
        message?: string;
        virtualChannelId?: VirtualChannelId | null;
    };
    type InlineAssociationFailureData = {
        message?: string;
        virtualChannelId?: VirtualChannelId | null;
    };

    function isInlineAssociationActionData(value: unknown): value is InlineAssociationActionData
    {
        if (!value || typeof value !== 'object' || !('virtualChannelRow' in value)) {
            return false;
        }

        const virtualChannelRow = value.virtualChannelRow;
        return Boolean(virtualChannelRow && typeof virtualChannelRow === 'object' && 'virtualChannel' in virtualChannelRow);
    }

    function readFailureVirtualChannelId(value: unknown, fallbackVirtualChannelId: VirtualChannelId): VirtualChannelId
    {
        if (!value || typeof value !== 'object' || !('virtualChannelId' in value)) {
            return fallbackVirtualChannelId;
        }

        const failureData = value as InlineAssociationFailureData;
        return Number(failureData.virtualChannelId ?? fallbackVirtualChannelId);
    }

    function readFailureMessage(value: unknown, fallbackMessage: string): string
    {
        if (!value || typeof value !== 'object' || !('message' in value)) {
            return fallbackMessage;
        }

        const failureData = value as InlineAssociationFailureData;
        return String(failureData.message || fallbackMessage);
    }

    let virtualChannels: VirtualChannelRow[] = data.virtualChannels as VirtualChannelRow[];
    let newName = '';
    let inlineStatusByVirtualChannelId: Record<string, InlineStatus> = {};

    function updateInlineVirtualChannelRow(nextVirtualChannelRow: VirtualChannelRow)
    {
        // Replace only the affected row so inline actions do not trigger a full reload.
        virtualChannels = virtualChannels.map((virtualChannelRow) => (
            virtualChannelRow.virtualChannel.id === nextVirtualChannelRow.virtualChannel.id ? nextVirtualChannelRow : virtualChannelRow
        ));
    }

    function setInlineStatus(virtualChannelId: VirtualChannelId | null | undefined, type: 'success' | 'error', text: string)
    {
        if (virtualChannelId == null) {
            return;
        }

        inlineStatusByVirtualChannelId = {
            ...inlineStatusByVirtualChannelId,
            [String(virtualChannelId)]: { type, text }
        };
    }

    function clearInlineStatus(virtualChannelId: VirtualChannelId)
    {
        const nextStatus = { ...inlineStatusByVirtualChannelId };
        delete nextStatus[String(virtualChannelId)];
        inlineStatusByVirtualChannelId = nextStatus;
    }

    function enhanceInlineAdd(virtualChannelId: VirtualChannelId): SubmitFunction
    {
        return ({ formElement }: { formElement: HTMLFormElement }) => {
            clearInlineStatus(virtualChannelId);

            return async ({ result }) => {
                if (result.type === 'success' && isInlineAssociationActionData(result.data)) {
                    updateInlineVirtualChannelRow(result.data.virtualChannelRow);
                    setInlineStatus(virtualChannelId, 'success', String(result.data.message || 'Source channel added.'));
                    formElement.reset();
                    return;
                }

                if (result.type === 'failure' && result.data) {
                    setInlineStatus(
                        readFailureVirtualChannelId(result.data, virtualChannelId),
                        'error',
                        readFailureMessage(result.data, 'Failed to add source channel.')
                    );
                }
            };
        };
    }

    function enhanceInlineRemove(virtualChannelId: VirtualChannelId): SubmitFunction
    {
        return () => {
            clearInlineStatus(virtualChannelId);

            return async ({ result }) => {
                if (result.type === 'success' && isInlineAssociationActionData(result.data)) {
                    updateInlineVirtualChannelRow(result.data.virtualChannelRow);
                    setInlineStatus(virtualChannelId, 'success', String(result.data.message || 'Source channel removed.'));
                    return;
                }

                if (result.type === 'failure' && result.data) {
                    setInlineStatus(
                        readFailureVirtualChannelId(result.data, virtualChannelId),
                        'error',
                        readFailureMessage(result.data, 'Failed to remove source channel.')
                    );
                }
            };
        };
    }
</script>

<div class="page stack">
    <section class="panel">
        <h1>Virtual Channels</h1>
        <h2>Create Virtual Channel</h2>
        <form method="post" action="?/create" class="fields">
            <label>
                Name
                <input name="name" bind:value={newName} required />
            </label>
            <div class="inline-actions">
                <button type="submit">Create</button>
            </div>
        </form>
    </section>

    <section class="panel">
        <h2>Existing Virtual Channels</h2>
        {#if virtualChannels.length === 0}
            <p class="muted">No virtual channels yet.</p>
        {:else}
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Inline Assignments</th>
                            <th class="th-actions">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each virtualChannels as g}
                            <tr>
                                <td>
                                    <input name="name" form={`rename-${g.virtualChannel.id}`} value={g.virtualChannel.name} />
                                </td>
                                <td>
                                    <div class="stack">
                                        <div>
                                            <div class="muted">Current source channels</div>

                                            {#if g.associatedSourceChannels.length === 0}
                                                <p class="muted">No source channels assigned yet.</p>
                                            {:else}
                                                <div class="stack">
                                                    {#each g.associatedSourceChannels as item}
                                                        <div class="inline-actions">
                                                            <span>
                                                                {item.sourceChannel?.title || 'Unknown source channel'}
                                                                {#if item.sourceChannel}
                                                                    <span class="muted">({item.sourceChannel.id})</span>
                                                                {/if}
                                                            </span>
                                                            <form
                                                                method="post"
                                                                action="?/removeAssociationInline"
                                                                class="inline-form"
                                                                use:enhance={enhanceInlineRemove(g.virtualChannel.id)}
                                                            >
                                                                <input type="hidden" name="virtual_channel_id" value={g.virtualChannel.id} />
                                                                <input type="hidden" name="source_channel_id" value={item.assignment.source_channel_id} />
                                                                <button
                                                                    type="submit"
                                                                    class="btn-danger"
                                                                    on:click={(event) => {
                                                                        if (!confirm('Remove this source channel from the virtual channel?')) {
                                                                            event.preventDefault();
                                                                        }
                                                                    }}
                                                                >
                                                                    Remove
                                                                </button>
                                                            </form>
                                                        </div>
                                                    {/each}
                                                </div>
                                            {/if}
                                        </div>

                                        <div>
                                            <div class="muted">Add source channel</div>

                                            {#if g.availableSourceChannels.length === 0}
                                                <p class="muted">No imported source channels remaining.</p>
                                            {:else}
                                                    <form
                                                        method="post"
                                                        action="?/addAssociationInline"
                                                        class="inline-actions"
                                                        use:enhance={enhanceInlineAdd(g.virtualChannel.id)}
                                                    >
                                                        <input type="hidden" name="virtual_channel_id" value={g.virtualChannel.id} />
                                                        <select name="source_channel_id" required>
                                                        <option value="" selected disabled>Select source channel</option>
                                                        {#each g.availableSourceChannels as channel}
                                                            <option value={channel.id}>{channel.title} ({channel.id})</option>
                                                        {/each}
                                                    </select>
                                                    <button type="submit">Add</button>
                                                </form>
                                            {/if}
                                        </div>

                                        {#if inlineStatusByVirtualChannelId[g.virtualChannel.id]}
                                            <p class={inlineStatusByVirtualChannelId[g.virtualChannel.id].type === 'error' ? 'error-text' : 'status'}>
                                                {inlineStatusByVirtualChannelId[g.virtualChannel.id].text}
                                            </p>
                                        {/if}
                                    </div>
                                </td>
                                <td class="td-actions">
                                    <div class="inline-actions">
                                        <a
                                            href={`/admin/virtual-channels/${g.virtualChannel.id}`}
                                            class="btn btn-secondary icon-action"
                                            title="Manage"
                                        >
                                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                                <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"></path>
                                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.4 1.08V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.08-.4H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .4-1.08V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.38.37.72.6 1 .3.25.68.4 1.08.4H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51.6Z"></path>
                                            </svg>
                                            <span class="sr-only">Manage</span>
                                        </a>
                                        <form method="post" action="?/rename" id={`rename-${g.virtualChannel.id}`} class="inline-form">
                                            <input type="hidden" name="id" value={g.virtualChannel.id} />
                                            <button type="submit" class="icon-action" title="Save">
                                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"></path>
                                                    <path d="M17 21v-8H7v8"></path>
                                                    <path d="M7 3v5h8"></path>
                                                </svg>
                                                <span class="sr-only">Save</span>
                                            </button>
                                        </form>
                                        <form method="post" action="?/delete" class="inline-form">
                                            <input type="hidden" name="id" value={g.virtualChannel.id} />
                                            <button
                                                type="submit"
                                                class="icon-action btn-danger"
                                                title="Delete"
                                                on:click={(event) => {
                                                    if (!confirm('Delete this virtual channel?')) {
                                                        event.preventDefault();
                                                    }
                                                }}
                                            >
                                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                                    <path d="M3 6h18"></path>
                                                    <path d="M8 6V4h8v2"></path>
                                                    <path d="M19 6l-1 14H6L5 6"></path>
                                                    <path d="M10 11v5"></path>
                                                    <path d="M14 11v5"></path>
                                                </svg>
                                                <span class="sr-only">Delete</span>
                                            </button>
                                        </form>
                                    </div>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </section>
</div>

<style>
    .th-actions,
    .td-actions {
        width: 148px;
        max-width: 148px;
        min-width: 148px;
    }
</style>
<!-- apply-patch-anchor - do not delete -->
