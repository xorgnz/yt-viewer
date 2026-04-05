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
            automaticVideos: Array<{
                id: number;
                youtube_id: string;
                channel_id: number;
                title: string;
                description?: string;
                published_at?: number | null;
                duration_seconds?: number | null;
                thumbnail_url?: string | null;
                length_classification?: 'long' | 'short' | 'unknown' | null;
            }>;
            selectedOnlyVideos: Array<{
                id: number;
                youtube_id: string;
                channel_id: number;
                title: string;
                description?: string;
                published_at?: number | null;
                duration_seconds?: number | null;
                thumbnail_url?: string | null;
                length_classification?: 'long' | 'short' | 'unknown' | null;
                review_state: 'included' | 'ignored' | 'not_yet_reviewed';
            }>;
            selectedOnlyCounts: {
                included: number;
                ignored: number;
                not_yet_reviewed: number;
            } | null;
            reviewStateFilter: 'all' | 'not_yet_reviewed';
            regexFilter: string;
            videoTypeFilter: 'all' | 'long' | 'short' | 'unknown';
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

    function formatTimestamp(timestamp?: number | null): string
    {
        if (!timestamp) {
            return 'Unknown';
        }

        return new Date(timestamp).toLocaleDateString();
    }

    function formatDuration(durationSeconds?: number | null): string
    {
        if (!durationSeconds || durationSeconds <= 0) {
            return 'Unknown';
        }

        const minutes = Math.floor(durationSeconds / 60);
        const seconds = durationSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    function formatLengthClassification(lengthClassification?: 'long' | 'short' | 'unknown' | null): string
    {
        if (lengthClassification === 'long') {
            return 'Long';
        }

        if (lengthClassification === 'short') {
            return 'Short';
        }

        return 'Unknown - review manually';
    }

    function selectedOnlyQueryString(item: {
        assignment: { id: number };
        reviewStateFilter: 'all' | 'not_yet_reviewed';
        regexFilter: string;
        videoTypeFilter: 'all' | 'long' | 'short' | 'unknown';
    }): string
    {
        const params = new URLSearchParams();
        params.set(`reviewStateFilter-${item.assignment.id}`, item.reviewStateFilter);

        if (item.regexFilter) {
            params.set(`regexFilter-${item.assignment.id}`, item.regexFilter);
        }

        if (item.videoTypeFilter !== 'all') {
            params.set(`videoTypeFilter-${item.assignment.id}`, item.videoTypeFilter);
        }

        return params.toString();
    }

    function filteredSelectedOnlyVideos(
        videos: Array<{
            id: number;
            youtube_id: string;
            channel_id: number;
            title: string;
            description?: string;
            published_at?: number | null;
            duration_seconds?: number | null;
            thumbnail_url?: string | null;
            length_classification?: 'long' | 'short' | 'unknown' | null;
            review_state: 'included' | 'ignored' | 'not_yet_reviewed';
        }>,
        reviewStateFilter: 'all' | 'not_yet_reviewed',
        regexFilter: string,
        videoTypeFilter: 'all' | 'long' | 'short' | 'unknown'
    )
    {
        // Apply the review-state filter first so later bulk tools can target the shown rows.
        let filteredVideos = reviewStateFilter === 'not_yet_reviewed'
            ? videos.filter((video) => video.review_state === 'not_yet_reviewed')
            : videos;

        // Apply the video classification filter before regex matching.
        if (videoTypeFilter !== 'all') {
            filteredVideos = filteredVideos.filter((video) => {
                const classification = video.length_classification ?? 'unknown';
                return classification === videoTypeFilter;
            });
        }

        // Apply the title/description regex filter when provided.
        if (!regexFilter) {
            return { videos: filteredVideos, hasInvalidRegex: false };
        }

        try {
            const pattern = new RegExp(regexFilter, 'i');

            filteredVideos = filteredVideos.filter((video) => {
                const title = video.title || '';
                const description = video.description || '';
                return pattern.test(title) || pattern.test(description);
            });

            return { videos: filteredVideos, hasInvalidRegex: false };
        } catch {
            return { videos: filteredVideos, hasInvalidRegex: true };
        }
    }
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
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each data.associatedSourceChannels as item}
                            <tr>
                                <td>{item.sourceChannel?.title || 'Unknown source channel'}</td>
                                <td>
                                    <form
                                        method="post"
                                        action="?/updateAssociationMode"
                                        class="inline-actions"
                                    >
                                        <input type="hidden" name="assignment_id" value={item.assignment.id} />
                                        <select name="mode" value={item.assignment.mode}>
                                            <option value="all">All videos</option>
                                            <option value="long_only">Long videos only</option>
                                            <option value="selected_only">Selected only</option>
                                        </select>
                                        <button type="submit">Update Mode</button>
                                    </form>
                                </td>
                                <td><code>{item.sourceChannel?.youtube_id || 'missing'}</code></td>
                                <td>
                                    <form method="post" action="?/removeAssociation" class="inline-form">
                                        <input type="hidden" name="assignment_id" value={item.assignment.id} />
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
                                </td>
                            </tr>
                            {#if item.assignment.mode === 'all' || item.assignment.mode === 'long_only'}
                                <tr>
                                    <td colspan="4">
                                        <details>
                                            <summary>
                                                Included videos
                                                <span class="muted">({item.automaticVideos.length})</span>
                                            </summary>

                                            {#if item.automaticVideos.length === 0}
                                                <p class="muted">No videos are currently auto-included for this association.</p>
                                            {:else}
                                                <div class="table-wrap">
                                                    <table>
                                                        <thead>
                                                            <tr>
                                                                <th>Title</th>
                                                                <th>Length</th>
                                                                <th>Published</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {#each item.automaticVideos as video}
                                                                <tr>
                                                                    <td>{video.title}</td>
                                                                    <td><code>{formatLengthClassification(video.length_classification)}</code></td>
                                                                    <td>{video.published_at ?? 'Unknown'}</td>
                                                                </tr>
                                                            {/each}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            {/if}

                                            {#if item.assignment.mode === 'long_only'}
                                                <p class="muted">Videos with unknown type are excluded here until you review them manually in selected-only mode.</p>
                                            {/if}
                                        </details>
                                    </td>
                                </tr>
                            {/if}
                            {#if item.assignment.mode === 'selected_only'}
                                <tr>
                                    <td colspan="4">
                                        <details>
                                            <summary>
                                                Review videos
                                                <span class="muted">({item.selectedOnlyVideos.length})</span>
                                            </summary>

                                            {#if item.selectedOnlyVideos.length === 0}
                                                <p class="muted">No source videos are available for review yet.</p>
                                            {:else}
                                                <div class="inline-actions">
                                                    <form method="get" class="inline-form">
                                                        <input
                                                            type="hidden"
                                                            name={`reviewStateFilter-${item.assignment.id}`}
                                                            value="all"
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name={`videoTypeFilter-${item.assignment.id}`}
                                                            value={item.videoTypeFilter}
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name={`regexFilter-${item.assignment.id}`}
                                                            value={item.regexFilter}
                                                        />
                                                        <button type="submit" class="btn btn-secondary">Show all</button>
                                                    </form>
                                                    <form method="get" class="inline-form">
                                                        <input
                                                            type="hidden"
                                                            name={`reviewStateFilter-${item.assignment.id}`}
                                                            value="not_yet_reviewed"
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name={`videoTypeFilter-${item.assignment.id}`}
                                                            value={item.videoTypeFilter}
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name={`regexFilter-${item.assignment.id}`}
                                                            value={item.regexFilter}
                                                        />
                                                        <button type="submit" class="btn btn-secondary">
                                                            Not yet reviewed
                                                            {#if item.selectedOnlyCounts}
                                                                ({item.selectedOnlyCounts.not_yet_reviewed})
                                                            {/if}
                                                        </button>
                                                    </form>
                                                </div>

                                                <form method="get" class="fields">
                                                    <input
                                                        type="hidden"
                                                        name={`reviewStateFilter-${item.assignment.id}`}
                                                        value={item.reviewStateFilter}
                                                    />
                                                    <input
                                                        type="hidden"
                                                        name={`videoTypeFilter-${item.assignment.id}`}
                                                        value={item.videoTypeFilter}
                                                    />
                                                    <label>
                                                        Regex filter
                                                        <input
                                                            type="text"
                                                            name={`regexFilter-${item.assignment.id}`}
                                                            value={item.regexFilter}
                                                            placeholder="title|description pattern"
                                                        />
                                                    </label>
                                                    <div class="inline-actions">
                                                        <button type="submit">Apply Filter</button>
                                                        <a
                                                            href={`?reviewStateFilter-${item.assignment.id}=${item.reviewStateFilter}`}
                                                            class="btn btn-secondary"
                                                        >
                                                            Clear Regex
                                                        </a>
                                                    </div>
                                                    <p class="muted">Matches video title and description using a case-insensitive regular expression.</p>
                                                </form>

                                                <form method="get" class="fields">
                                                    <input
                                                        type="hidden"
                                                        name={`reviewStateFilter-${item.assignment.id}`}
                                                        value={item.reviewStateFilter}
                                                    />
                                                    <input
                                                        type="hidden"
                                                        name={`regexFilter-${item.assignment.id}`}
                                                        value={item.regexFilter}
                                                    />
                                                    <label>
                                                        Video type
                                                        <select name={`videoTypeFilter-${item.assignment.id}`}>
                                                            <option value="all" selected={item.videoTypeFilter === 'all'}>All types</option>
                                                            <option value="long" selected={item.videoTypeFilter === 'long'}>Long</option>
                                                            <option value="short" selected={item.videoTypeFilter === 'short'}>Short</option>
                                                            <option value="unknown" selected={item.videoTypeFilter === 'unknown'}>Unknown / needs review</option>
                                                        </select>
                                                    </label>
                                                    <div class="inline-actions">
                                                        <button type="submit">Apply Type Filter</button>
                                                        <a
                                                            href={`?reviewStateFilter-${item.assignment.id}=${item.reviewStateFilter}&regexFilter-${item.assignment.id}=${encodeURIComponent(item.regexFilter)}`}
                                                            class="btn btn-secondary"
                                                        >
                                                            Clear Type Filter
                                                        </a>
                                                    </div>
                                                </form>

                                                {@const filteredResult = filteredSelectedOnlyVideos(
                                                    item.selectedOnlyVideos,
                                                    item.reviewStateFilter,
                                                    item.regexFilter,
                                                    item.videoTypeFilter
                                                )}

                                                {#if filteredResult.hasInvalidRegex}
                                                    <p class="muted">The current regex is invalid. Showing the review-state filtered rows only.</p>
                                                {/if}

                                                {@const visibleSelectedOnlyVideos = filteredResult.videos}

                                                {#if visibleSelectedOnlyVideos.length === 0}
                                                    <p class="muted">No videos match the current filters.</p>
                                                {:else}
                                                <div class="inline-actions">
                                                    <form method="post" action="?/bulkUpdateVideoReviewState" class="inline-form">
                                                        <input type="hidden" name="assignment_id" value={item.assignment.id} />
                                                        <input type="hidden" name="review_state" value="included" />
                                                        <input
                                                            type="hidden"
                                                            name="video_ids"
                                                            value={visibleSelectedOnlyVideos.map((video) => video.id).join(',')}
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name="return_query"
                                                            value={selectedOnlyQueryString(item)}
                                                        />
                                                        <button type="submit">Select All Shown</button>
                                                    </form>
                                                    <form method="post" action="?/bulkUpdateVideoReviewState" class="inline-form">
                                                        <input type="hidden" name="assignment_id" value={item.assignment.id} />
                                                        <input type="hidden" name="review_state" value="not_yet_reviewed" />
                                                        <input
                                                            type="hidden"
                                                            name="video_ids"
                                                            value={visibleSelectedOnlyVideos.map((video) => video.id).join(',')}
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name="return_query"
                                                            value={selectedOnlyQueryString(item)}
                                                        />
                                                        <button type="submit" class="btn-secondary">Select None Shown</button>
                                                    </form>
                                                    <form method="post" action="?/bulkUpdateVideoReviewState" class="inline-form">
                                                        <input type="hidden" name="assignment_id" value={item.assignment.id} />
                                                        <input type="hidden" name="review_state" value="ignored" />
                                                        <input
                                                            type="hidden"
                                                            name="video_ids"
                                                            value={visibleSelectedOnlyVideos.map((video) => video.id).join(',')}
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name="return_query"
                                                            value={selectedOnlyQueryString(item)}
                                                        />
                                                        <button type="submit" class="btn-secondary">Ignore Shown</button>
                                                    </form>
                                                    <form method="post" action="?/bulkUpdateVideoReviewState" class="inline-form">
                                                        <input type="hidden" name="assignment_id" value={item.assignment.id} />
                                                        <input type="hidden" name="review_state" value="not_yet_reviewed" />
                                                        <input
                                                            type="hidden"
                                                            name="video_ids"
                                                            value={visibleSelectedOnlyVideos.map((video) => video.id).join(',')}
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name="return_query"
                                                            value={selectedOnlyQueryString(item)}
                                                        />
                                                        <button type="submit" class="btn-secondary">Reset Shown</button>
                                                    </form>
                                                </div>

                                                <div class="table-wrap">
                                                    <table>
                                                        <thead>
                                                            <tr>
                                                                <th>Video</th>
                                                                <th>Metadata</th>
                                                                <th>Review State</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {#each visibleSelectedOnlyVideos as video}
                                                                <tr>
                                                                    <td>
                                                                        <div class="inline-actions">
                                                                            {#if video.thumbnail_url}
                                                                                <img
                                                                                    src={video.thumbnail_url}
                                                                                    alt=""
                                                                                    width="96"
                                                                                    height="54"
                                                                                />
                                                                            {/if}
                                                                            <div>
                                                                                <div>{video.title}</div>
                                                                                <div class="muted">
                                                                                    {video.description || 'No description available.'}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <div class="muted">Published: {formatTimestamp(video.published_at)}</div>
                                                                        <div class="muted">Length: {formatDuration(video.duration_seconds)}</div>
                                                                        <div class="muted">
                                                                            Type: <code>{formatLengthClassification(video.length_classification)}</code>
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <div class="stack">
                                                                            <div><code>{video.review_state}</code></div>
                                                                            <div class="inline-actions">
                                                                                <form method="post" action="?/setVideoReviewState" class="inline-form">
                                                                                    <input type="hidden" name="assignment_id" value={item.assignment.id} />
                                                                                    <input type="hidden" name="video_id" value={video.id} />
                                                                                    <input type="hidden" name="review_state" value="included" />
                                                                                    <button type="submit">Include</button>
                                                                                </form>
                                                                                <form method="post" action="?/setVideoReviewState" class="inline-form">
                                                                                    <input type="hidden" name="assignment_id" value={item.assignment.id} />
                                                                                    <input type="hidden" name="video_id" value={video.id} />
                                                                                    <input type="hidden" name="review_state" value="ignored" />
                                                                                    <button type="submit" class="btn-secondary">Ignore</button>
                                                                                </form>
                                                                                <form method="post" action="?/setVideoReviewState" class="inline-form">
                                                                                    <input type="hidden" name="assignment_id" value={item.assignment.id} />
                                                                                    <input type="hidden" name="video_id" value={video.id} />
                                                                                    <input type="hidden" name="review_state" value="not_yet_reviewed" />
                                                                                    <button type="submit" class="btn-secondary">Reset</button>
                                                                                </form>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            {/each}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                {/if}
                                            {/if}
                                        </details>
                                    </td>
                                </tr>
                            {/if}
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
