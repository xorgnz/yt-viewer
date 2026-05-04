<script lang="ts">
    import { enhance } from '$app/forms';
    import type { PageData, SubmitFunction } from './$types';

    export let data: PageData;

    type VirtualChannelGroup = (typeof data.groups)[number];
    type InlineStatus = { type: 'success' | 'error'; text: string };
    type InlineAssociationActionData = {
        group: VirtualChannelGroup;
        message?: string;
        virtualChannelId?: number | null;
    };
    type InlineAssociationFailureData = {
        message?: string;
        virtualChannelId?: number | null;
    };

    function isInlineAssociationActionData(value: unknown): value is InlineAssociationActionData
    {
        if (!value || typeof value !== 'object' || !('group' in value)) {
            return false;
        }

        const group = value.group;
        return Boolean(group && typeof group === 'object' && 'virtualChannel' in group);
    }

    function readFailureGroupId(value: unknown, fallbackGroupId: number): number
    {
        if (!value || typeof value !== 'object' || !('virtualChannelId' in value)) {
            return fallbackGroupId;
        }

        const failureData = value as InlineAssociationFailureData;
        return Number(failureData.virtualChannelId ?? fallbackGroupId);
    }

    function readFailureMessage(value: unknown, fallbackMessage: string): string
    {
        if (!value || typeof value !== 'object' || !('message' in value)) {
            return fallbackMessage;
        }

        const failureData = value as InlineAssociationFailureData;
        return String(failureData.message || fallbackMessage);
    }

    let groups = data.groups;
    let newName = '';
    let inlineStatusByGroupId: Record<number, InlineStatus> = {};

    function updateInlineGroup(nextGroup: VirtualChannelGroup)
    {
        // Replace only the affected row so inline actions do not trigger a full reload.
        groups = groups.map((group) => (group.virtualChannel.id === nextGroup.virtualChannel.id ? nextGroup : group));
    }

    function setInlineStatus(groupId: number | null | undefined, type: 'success' | 'error', text: string)
    {
        if (!groupId) {
            return;
        }

        inlineStatusByGroupId = {
            ...inlineStatusByGroupId,
            [groupId]: { type, text }
        };
    }

    function clearInlineStatus(groupId: number)
    {
        const nextStatus = { ...inlineStatusByGroupId };
        delete nextStatus[groupId];
        inlineStatusByGroupId = nextStatus;
    }

    function enhanceInlineAdd(groupId: number): SubmitFunction
    {
        return ({ formElement }: { formElement: HTMLFormElement }) => {
            clearInlineStatus(groupId);

            return async ({ result }) => {
                if (result.type === 'success' && isInlineAssociationActionData(result.data)) {
                    updateInlineGroup(result.data.group);
                    setInlineStatus(groupId, 'success', String(result.data.message || 'Source channel added.'));
                    formElement.reset();
                    return;
                }

                if (result.type === 'failure' && result.data) {
                    setInlineStatus(
                        readFailureGroupId(result.data, groupId),
                        'error',
                        readFailureMessage(result.data, 'Failed to add source channel.')
                    );
                }
            };
        };
    }

    function enhanceInlineRemove(groupId: number): SubmitFunction
    {
        return () => {
            clearInlineStatus(groupId);

            return async ({ result }) => {
                if (result.type === 'success' && isInlineAssociationActionData(result.data)) {
                    updateInlineGroup(result.data.group);
                    setInlineStatus(groupId, 'success', String(result.data.message || 'Source channel removed.'));
                    return;
                }

                if (result.type === 'failure' && result.data) {
                    setInlineStatus(
                        readFailureGroupId(result.data, groupId),
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
        {#if groups.length === 0}
            <p class="muted">No virtual channels yet.</p>
        {:else}
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Inline Assignments</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each groups as g}
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
                                                                    <span class="muted">({item.sourceChannel.youtube_id})</span>
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
                                                            <option value={channel.id}>{channel.title} ({channel.youtube_id})</option>
                                                        {/each}
                                                    </select>
                                                    <button type="submit">Add</button>
                                                </form>
                                            {/if}
                                        </div>

                                        {#if inlineStatusByGroupId[g.virtualChannel.id]}
                                            <p class={inlineStatusByGroupId[g.virtualChannel.id].type === 'error' ? 'error-text' : 'status'}>
                                                {inlineStatusByGroupId[g.virtualChannel.id].text}
                                            </p>
                                        {/if}
                                    </div>
                                </td>
                                <td>
                                    <div class="inline-actions">
                                        <a href={`/admin/virtual-channels/${g.virtualChannel.id}`} class="btn btn-secondary">Manage</a>
                                        <form method="post" action="?/rename" id={`rename-${g.virtualChannel.id}`} class="inline-form">
                                            <input type="hidden" name="id" value={g.virtualChannel.id} />
                                            <button type="submit">Save</button>
                                        </form>
                                        <form method="post" action="?/delete" class="inline-form">
                                            <input type="hidden" name="id" value={g.virtualChannel.id} />
                                            <button
                                                type="submit"
                                                class="btn-danger"
                                                on:click={(event) => {
                                                    if (!confirm('Delete this virtual channel?')) {
                                                        event.preventDefault();
                                                    }
                                                }}
                                            >
                                                Delete
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
<!-- apply-patch-anchor - do not delete -->
