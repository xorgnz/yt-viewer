<script lang="ts">
    import { page } from '$app/stores';

    // Simple side navigation used across all pages
    export let appName: string = 'YT Viewer';
    export let profiles: Array<{ id: number; key: string; name: string }> = [];
    export let activeProfileKey: string = 'default';
    export let activeProfileName: string = 'Adult';
    export let isAdminLoggedIn: boolean = false;

    function profileTone(profileKey: string): 'adult' | 'child'
    {
        return profileKey === 'child' ? 'child' : 'adult';
    }
</script>

<aside class="side-nav" aria-label="Primary Navigation">
    <div class="brand">{appName}</div>

    <nav>
        <a href="/">Home</a>
        <a href="/viewer/virtual-channels">Channels</a>
        <a href="/history">History</a>
        <div class="sep" aria-hidden="true"></div>
        {#if isAdminLoggedIn}
            <a href="/admin">Admin Home</a>
            <a href="/admin/source-channels">Source Channels</a>
            <a href="/admin/virtual-channels">Virtual Channels</a>
            <form method="POST" action="/admin/logout" class="nav-logout">
                <button type="submit" class="btn btn-secondary">Logout</button>
            </form>
        {:else}
            <a href="/admin/login">Admin</a>
        {/if}
    </nav>

    <details class="profile-switcher" data-profile-tone={profileTone(activeProfileKey)}>
        <summary class="profile-chip">
            <span class="profile-chip-label">Profile</span>
            <span class="profile-chip-value">{activeProfileName}</span>
        </summary>

        <div class="profile-panel">
            {#each profiles as profile}
                <form method="post" action="/profile">
                    <input type="hidden" name="profile" value={profile.key} />
                    <input type="hidden" name="returnTo" value={$page.url.pathname + $page.url.search} />
                    <button
                        type="submit"
                        class:profile-option={true}
                        class:btn-secondary={profile.key !== activeProfileKey}
                        data-profile-tone={profileTone(profile.key)}
                        aria-pressed={profile.key === activeProfileKey}
                    >
                        {profile.name}
                    </button>
                </form>
            {/each}
        </div>
    </details>
</aside>
<!-- apply-patch-anchor - do not delete -->