<script lang="ts">
    import type { ActionData, PageData } from './$types';
    import type { AdminSelectedOnlyVideoViewModel } from '$lib/server/admin/AdminVirtualChannelTypes';
    import {
        AdminReviewStateFilter,
        AdminVideoTypeFilter
    } from '$lib/server/admin/AdminVirtualChannelTypes';
    import { VirtualChannelAssignmentMode } from '$lib/entities/virtualChannelAssignment';
    import { VirtualChannelAssignmentVideoReviewState as ReviewState } from '$lib/entities/virtualChannelAssignmentVideoSelection';
    import { VideoLengthClassification } from '$lib/entities/video';

    export let data: PageData;
    export let form: ActionData;

    type TimerFormState = {
        action?: string;
        message?: string;
        timerMode?: 'unlimited' | 'capped';
        dailyTimerMaxInput?: string;
    };

    let timerFormState: TimerFormState | null = null;
    let timerFormMode: 'unlimited' | 'capped' = 'unlimited';
    let timerFormInput = '';

    $: timerFormState = form && typeof form === 'object' ? form as TimerFormState : null;
    $: timerFormMode = timerFormState?.action === 'saveTimerSettings'
        ? (timerFormState.timerMode ?? 'unlimited')
        : (data.virtualChannel.dailyTimerMax == null ? 'unlimited' : 'capped');
    $: timerFormInput = timerFormState?.action === 'saveTimerSettings'
        ? (timerFormState.dailyTimerMaxInput ?? '')
        : (data.virtualChannel.dailyTimerMax == null ? '' : String(data.virtualChannel.dailyTimerMax));

    const associatedSourceChannelIds = new Set(
        data.associatedSourceChannels.map((item) => item.assignment.sourceChannelId)
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

    function formatLengthClassification(lengthClassification: VideoLengthClassification): string
    {
        if (lengthClassification === VideoLengthClassification.Long) {
            return 'Long';
        }

        if (lengthClassification === VideoLengthClassification.Short) {
            return 'Short';
        }

        return 'Unknown - review manually';
    }

    function selectedOnlyQueryString(item: {
        assignment: { id: number };
        reviewStateFilter: AdminReviewStateFilter;
        regexFilter: string;
        videoTypeFilter: AdminVideoTypeFilter;
    }): string
    {
        const params = new URLSearchParams();
        params.set(`reviewStateFilter-${item.assignment.id}`, item.reviewStateFilter);

        if (item.regexFilter) {
            params.set(`regexFilter-${item.assignment.id}`, item.regexFilter);
        }

        if (item.videoTypeFilter !== AdminVideoTypeFilter.All) {
            params.set(`videoTypeFilter-${item.assignment.id}`, item.videoTypeFilter);
        }

        return params.toString();
    }

    function filteredSelectedOnlyVideos(
        videos: AdminSelectedOnlyVideoViewModel[],
        reviewStateFilter: AdminReviewStateFilter,
        regexFilter: string,
        videoTypeFilter: AdminVideoTypeFilter
    )
    {
        // Apply the review-state filter first so later bulk tools can target the shown rows.
        let filteredVideos = reviewStateFilter === AdminReviewStateFilter.NotYetReviewed
            ? videos.filter((video) => video.reviewState === ReviewState.NotYetReviewed)
            : videos;

        // Apply the video classification filter before regex matching.
        if (videoTypeFilter !== AdminVideoTypeFilter.All) {
            filteredVideos = filteredVideos.filter((video) => {
                return matchesVideoTypeFilter(video.video.length_classification, videoTypeFilter);
            });
        }

        // Apply the title/description regex filter when provided.
        if (!regexFilter) {
            return { videos: filteredVideos, hasInvalidRegex: false };
        }

        try {
            const pattern = new RegExp(regexFilter, 'i');

            filteredVideos = filteredVideos.filter((video) => {
                const title = video.video.title || '';
                const description = video.video.description || '';
                return pattern.test(title) || pattern.test(description);
            });

            return { videos: filteredVideos, hasInvalidRegex: false };
        } catch {
            return { videos: filteredVideos, hasInvalidRegex: true };
        }
    }

    function matchesVideoTypeFilter(
        classification: VideoLengthClassification,
        videoTypeFilter: AdminVideoTypeFilter
    ): boolean
    {
        return (
            (videoTypeFilter === AdminVideoTypeFilter.Long && classification === VideoLengthClassification.Long) ||
            (videoTypeFilter === AdminVideoTypeFilter.Short && classification === VideoLengthClassification.Short) ||
            classification === VideoLengthClassification.Unknown
        );
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
            <h2>Timer Settings</h2>
            <p class="muted">Leave the channel uncapped or set a daily playback allowance in whole seconds.</p>
        </div>

        <form method="post" action="?/saveTimerSettings" class="fields">
            <label>
                Timer mode
                <select name="timer_mode">
                    <option value="unlimited" selected={timerFormMode === 'unlimited'}>Unlimited</option>
                    <option value="capped" selected={timerFormMode === 'capped'}>Daily limit</option>
                </select>
            </label>

            <label>
                Daily seconds
                <input
                    type="number"
                    name="daily_timer_max"
                    min="1"
                    step="1"
                    value={timerFormInput}
                    placeholder="Leave blank for unlimited"
                />
            </label>

            {#if timerFormState?.action === 'saveTimerSettings' && timerFormState.message}
                <p class="error-text">{timerFormState.message}</p>
            {:else if data.virtualChannel.dailyTimerMax == null}
                <p class="muted">This virtual channel is currently unlimited.</p>
            {:else}
                <p class="muted">Current daily limit: {data.virtualChannel.dailyTimerMax} second(s).</p>
            {/if}

            <div class="inline-actions">
                <button type="submit">Save Timer Settings</button>
            </div>
        </form>
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
                        <option value={VirtualChannelAssignmentMode.All}>All videos</option>
                        <option value={VirtualChannelAssignmentMode.LongOnly}>Long videos only</option>
                        <option value={VirtualChannelAssignmentMode.SelectedOnly}>Selected only</option>
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
                                            <option value={VirtualChannelAssignmentMode.All}>All videos</option>
                                            <option value={VirtualChannelAssignmentMode.LongOnly}>Long videos only</option>
                                            <option value={VirtualChannelAssignmentMode.SelectedOnly}>Selected only</option>
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
                            {#if item.assignment.mode === VirtualChannelAssignmentMode.All || item.assignment.mode === VirtualChannelAssignmentMode.LongOnly}
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

                                            {#if item.assignment.mode === VirtualChannelAssignmentMode.LongOnly}
                                                <p class="muted">Videos with unknown type are excluded here until you review them manually in selected-only mode.</p>
                                            {/if}
                                        </details>
                                    </td>
                                </tr>
                            {/if}
                            {#if item.assignment.mode === VirtualChannelAssignmentMode.SelectedOnly}
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
                                                            value={AdminReviewStateFilter.All}
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
                                                            value={AdminReviewStateFilter.NotYetReviewed}
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
                                                                ({item.selectedOnlyCounts.notYetReviewed})
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
                                                            <option value={AdminVideoTypeFilter.All} selected={item.videoTypeFilter === AdminVideoTypeFilter.All}>All types</option>
                                                            <option value={AdminVideoTypeFilter.Long} selected={item.videoTypeFilter === AdminVideoTypeFilter.Long}>Long</option>
                                                            <option value={AdminVideoTypeFilter.Short} selected={item.videoTypeFilter === AdminVideoTypeFilter.Short}>Short</option>
                                                            <option value={AdminVideoTypeFilter.Unknown} selected={item.videoTypeFilter === AdminVideoTypeFilter.Unknown}>Unknown / needs review</option>
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
                                                            value={visibleSelectedOnlyVideos.map((video) => video.video.id).join(',')}
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
                                                        <input type="hidden" name="review_state" value="notYetReviewed" />
                                                        <input
                                                            type="hidden"
                                                            name="video_ids"
                                                            value={visibleSelectedOnlyVideos.map((video) => video.video.id).join(',')}
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
                                                            value={visibleSelectedOnlyVideos.map((video) => video.video.id).join(',')}
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
                                                        <input type="hidden" name="review_state" value="notYetReviewed" />
                                                        <input
                                                            type="hidden"
                                                            name="video_ids"
                                                            value={visibleSelectedOnlyVideos.map((video) => video.video.id).join(',')}
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
                                                                            {#if video.video.thumbnail_url}
                                                                                <img
                                                                                    src={video.video.thumbnail_url}
                                                                                    alt=""
                                                                                    width="96"
                                                                                    height="54"
                                                                                />
                                                                            {/if}
                                                                            <div>
                                                                                <div>{video.video.title}</div>
                                                                                <div class="muted">
                                                                                    {video.video.description || 'No description available.'}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <div class="muted">Published: {formatTimestamp(video.video.published_at)}</div>
                                                                        <div class="muted">Length: {formatDuration(video.video.duration_seconds)}</div>
                                                                        <div class="muted">
                                                                            Type: <code>{formatLengthClassification(video.video.length_classification)}</code>
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <div class="stack">
                                                                            <div><code>{video.reviewState}</code></div>
                                                                            <div class="inline-actions">
                                                                                <form method="post" action="?/setVideoReviewState" class="inline-form">
                                                                                    <input type="hidden" name="assignment_id" value={item.assignment.id} />
                                                                                    <input type="hidden" name="video_id" value={video.video.id} />
                                                                                    <input type="hidden" name="review_state" value="included" />
                                                                                    <button type="submit">Include</button>
                                                                                </form>
                                                                                <form method="post" action="?/setVideoReviewState" class="inline-form">
                                                                                    <input type="hidden" name="assignment_id" value={item.assignment.id} />
                                                                                    <input type="hidden" name="video_id" value={video.video.id} />
                                                                                    <input type="hidden" name="review_state" value="ignored" />
                                                                                    <button type="submit" class="btn-secondary">Ignore</button>
                                                                                </form>
                                                                                <form method="post" action="?/setVideoReviewState" class="inline-form">
                                                                                    <input type="hidden" name="assignment_id" value={item.assignment.id} />
                                                                                    <input type="hidden" name="video_id" value={video.video.id} />
                                                                                    <input type="hidden" name="review_state" value="notYetReviewed" />
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
<!-- apply-patch-anchor - do not delete -->
