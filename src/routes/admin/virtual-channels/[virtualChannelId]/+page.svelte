<script lang="ts">
    export let data: {
        virtualChannel: {
            id: number;
            name: string;
        };
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
    };
</script>

<div class="page stack">
    <section class="panel">
        <a href="/admin/virtual-channels" class="text-link">Back to Virtual Channels</a>
        <h1>Manage Virtual Channel</h1>
        <p class="muted">This page is the dedicated management route for an existing virtual channel.</p>
    </section>

    <section class="panel stack">
        <div>
            <h2>{data.virtualChannel.name}</h2>
            <p class="muted">Virtual channel ID: {data.virtualChannel.id}</p>
        </div>

        <p class="muted">
            This page now loads the current source-channel associations and the available imported source channels.
        </p>
    </section>

    <section class="panel stack">
        <div>
            <h2>Associated Source Channels</h2>
            <p class="muted">{data.associatedSourceChannels.length} association(s) currently attached.</p>
        </div>

        {#if data.associatedSourceChannels.length === 0}
            <p class="muted">No source channels are associated with this virtual channel yet.</p>
        {:else}
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Source Channel</th>
                            <th>Mode</th>
                            <th>YouTube ID</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each data.associatedSourceChannels as item}
                            <tr>
                                <td>{item.sourceChannel?.title || 'Unknown source channel'}</td>
                                <td><code>{item.assignment.mode}</code></td>
                                <td><code>{item.sourceChannel?.youtube_id || 'missing'}</code></td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </section>

    <section class="panel stack">
        <div>
            <h2>Available Imported Source Channels</h2>
            <p class="muted">{data.availableSourceChannels.length} imported source channel(s) available.</p>
        </div>

        {#if data.availableSourceChannels.length === 0}
            <p class="muted">Add source channels first before creating associations here.</p>
        {:else}
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>YouTube ID</th>
                            <th>Last Refreshed</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each data.availableSourceChannels as channel}
                            <tr>
                                <td>{channel.title}</td>
                                <td><code>{channel.youtube_id}</code></td>
                                <td>{channel.last_refreshed_at ?? 'Never'}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </section>
</div>
