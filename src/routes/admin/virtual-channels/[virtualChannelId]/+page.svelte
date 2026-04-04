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

    const associatedSourceChannelIds = new Set(
        data.associatedSourceChannels.map((item) => item.assignment.source_channel_id)
    );

    const availableForAssociation = data.availableSourceChannels.filter(
        (channel) => !associatedSourceChannelIds.has(channel.id)
    );
</script>

<div class="page stack">
    <section class="panel">
        <a href="/admin/virtual-channels" class="text-link">Back to Virtual Channels</a>
        <h1>Manage Virtual Channel</h1>
        <p class="muted">Use this page to review the current setup and attach imported source channels to this virtual channel.</p>
    </section>

    <section class="panel stack">
        <div class="row">
            <div>
                <h2>{data.virtualChannel.name}</h2>
                <p class="muted">Virtual channel ID: {data.virtualChannel.id}</p>
            </div>
            <div>
                <h3>Current Setup</h3>
                <p class="muted">{data.associatedSourceChannels.length} source channel(s) currently associated.</p>
            </div>
            <div>
                <h3>Available Imports</h3>
                <p class="muted">{availableForAssociation.length} imported source channel(s) ready to attach.</p>
            </div>
        </div>
    </section>

    <section class="panel stack">
        <div>
            <h2>Add Source Channel</h2>
            <p class="muted">Choose one imported source channel and the initial association mode.</p>
        </div>

        {#if availableForAssociation.length === 0}
            <p class="muted">All imported source channels are already associated with this virtual channel.</p>
        {:else}
            <form method="post" action="?/addAssociation" class="fields">
                <label>
                    Source channel
                    <select name="source_channel_id" required>
                        <option value="" disabled selected>Select a source channel</option>
                        {#each availableForAssociation as channel}
                            <option value={channel.id}>{channel.title} ({channel.youtube_id})</option>
                        {/each}
                    </select>
                </label>

                <label>
                    Initial mode
                    <select name="mode">
                        <option value="all">All videos</option>
                        <option value="long_only">Long videos only</option>
                        <option value="selected_only">Selected only</option>
                    </select>
                </label>

                <div class="inline-actions">
                    <button type="submit">Add Source Channel</button>
                </div>
            </form>
        {/if}
    </section>

    <section class="panel stack">
        <div>
            <h2>Associated Source Channels</h2>
            <p class="muted">Review the source channels currently attached to this virtual channel.</p>
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
            <p class="muted">These imported source channels can be attached here once they are not already associated.</p>
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
