<script lang="ts">
    import { enhance } from '$app/forms';

    export let data: {
        groups: Array<{
            id: number;
            name: string;
            associatedSourceChannels: Array<{
                assignment: {
                    id: number;
                    source_channel_id: number;
                    virtual_channel_id: number;
                    mode: 'all' | 'long_only' | 'selected_only';
                    created_at: number;
                    updated_at: number;
                };
                sourceChannel: {
                    id: number;
                    youtube_id: string;
                    title: string;
                    description?: string;
                    thumbnail_url?: string | null;
                    published_at?: number | null;
                    last_refreshed_at?: number | null;
                } | null;
            }>;
            availableSourceChannels: Array<{
                id: number;
                youtube_id: string;
                title: string;
                description?: string;
                thumbnail_url?: string | null;
                published_at?: number | null;
                last_refreshed_at?: number | null;
            }>;
        }>;
    };

    type VirtualChannelGroup = (typeof data.groups)[number];

    let groups = data.groups;
    let newName = '';
    let inlineStatusByGroupId: Record<number, { type: 'success' | 'error'; text: string }> = {};

    function updateInlineGroup(nextGroup: VirtualChannelGroup)
    {
        // Replace only the affected row so inline actions do not trigger a full reload.
        groups = groups.map((group) => (group.id === nextGroup.id ? nextGroup : group));
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

    function enhanceInlineAdd(groupId: number)
    {
        return ({ formElement }: { formElement: HTMLFormElement }) => {
            clearInlineStatus(groupId);

            return async ({ result }: { result: { type: string; data?: Record<string, any> } }) => {
                if (result.type === 'success' && result.data?.group) {
                    updateInlineGroup(result.data.group as VirtualChannelGroup);
                    setInlineStatus(groupId, 'success', String(result.data.message || 'Source channel added.'));
                    formElement.reset();
                    return;
                }

                if (result.type === 'failure') {
                    setInlineStatus(
                        Number(result.data?.virtualChannelId ?? groupId),
                        'error',
                        String(result.data?.message || 'Failed to add source channel.')
                    );
                }
            };
        };
    }

    function enhanceInlineRemove(groupId: number)
    {
        return () => {
            clearInlineStatus(groupId);

            return async ({ result }: { result: { type: string; data?: Record<string, any> } }) => {
                if (result.type === 'success' && result.data?.group) {
                    updateInlineGroup(result.data.group as VirtualChannelGroup);
                    setInlineStatus(groupId, 'success', String(result.data.message || 'Source channel removed.'));
                    return;
                }

                if (result.type === 'failure') {
                    setInlineStatus(
                        Number(result.data?.virtualChannelId ?? groupId),
                        'error',
                        String(result.data?.message || 'Failed to remove source channel.')
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
                                    <input name="name" form={`rename-${g.id}`} value={g.name} />
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
                                                                use:enhance={enhanceInlineRemove(g.id)}
                                                            >
                                                                <input type="hidden" name="virtual_channel_id" value={g.id} />
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
                                                    use:enhance={enhanceInlineAdd(g.id)}
                                                >
                                                    <input type="hidden" name="virtual_channel_id" value={g.id} />
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

                                        {#if inlineStatusByGroupId[g.id]}
                                            <p class={inlineStatusByGroupId[g.id].type === 'error' ? 'error-text' : 'status'}>
                                                {inlineStatusByGroupId[g.id].text}
                                            </p>
                                        {/if}
                                    </div>
                                </td>
                                <td>
                                    <div class="inline-actions">
                                        <a href={`/admin/virtual-channels/${g.id}`} class="btn btn-secondary">Manage</a>
                                        <form method="post" action="?/rename" id={`rename-${g.id}`} class="inline-form">
                                            <input type="hidden" name="id" value={g.id} />
                                            <button type="submit">Save</button>
                                        </form>
                                        <form method="post" action="?/delete" class="inline-form">
                                            <input type="hidden" name="id" value={g.id} />
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
