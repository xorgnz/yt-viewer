<script lang="ts">
    import type {
        ViewerVisiblePage
    } from '$lib/viewer/types';

    export let totalCount = 0;
    export let totalPages = 1;
    export let currentPage = 1;
    export let visiblePages: ViewerVisiblePage[] = [];
    export let buildPageHref: (page: number) => string = () => '#';
</script>

{#if totalCount > 0 && totalPages > 1}
    <div class="toolbar">
        <div class="pager" aria-label="Pagination">
            {#each visiblePages as page}
                {#if page === 'ellipsis'}
                    <span class="pager-ellipsis">..</span>
                {:else if page === currentPage}
                    <span class="pager-link pager-link-current" aria-current="page">{page}</span>
                {:else}
                    <a class="pager-link" href={buildPageHref(page)}>{page}</a>
                {/if}
            {/each}
        </div>
    </div>
{/if}

<style>
    .toolbar {
        justify-content: center;
    }

    .pager {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.45rem;
        flex-wrap: wrap;
        margin-inline: auto;
    }

    .pager-link,
    .pager-ellipsis {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 2.5rem;
        min-height: 2.5rem;
        padding: 0.45rem 0.65rem;
        border-radius: var(--radius-sm);
    }

    .pager-link {
        border: 1px solid var(--border);
        background: var(--bg-soft);
        color: var(--text);
        text-decoration: none;
    }

    .pager-link-current {
        border: 2px solid var(--accent);
        background: var(--accent);
        color: white;
        font-weight: 700;
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 24%, transparent);
    }

    .pager-ellipsis {
        color: var(--text-muted);
    }
</style>
<!-- apply-patch-anchor - do not delete -->