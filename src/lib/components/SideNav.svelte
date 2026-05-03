<script lang="ts">
    import { page } from '$app/stores';

    type NavVirtualChannel = {
        id: number;
        name: string;
        dailyTimerMax: number | null;
        timerState: 'unlimited' | 'available' | 'capped';
        timerUsageSeconds: number;
        timerRemainingSeconds: number | null;
        timerWindowStartMs: number;
        timerWindowEndMs: number;
    };

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

    function requiresAdultPassword(profileKey: string): boolean
    {
        return activeProfileKey === 'child' && profileKey === 'default';
    }

    function readActiveVirtualChannel(value: unknown): NavVirtualChannel | null
    {
        if (!value || typeof value !== 'object') {
            return null;
        }

        const candidate = value as Partial<NavVirtualChannel>;

        if (
            typeof candidate.id !== 'number' ||
            typeof candidate.name !== 'string' ||
            (candidate.dailyTimerMax !== null && typeof candidate.dailyTimerMax !== 'number') ||
            (candidate.timerState !== 'unlimited' && candidate.timerState !== 'available' && candidate.timerState !== 'capped') ||
            typeof candidate.timerUsageSeconds !== 'number' ||
            (candidate.timerRemainingSeconds !== null && typeof candidate.timerRemainingSeconds !== 'number') ||
            typeof candidate.timerWindowStartMs !== 'number' ||
            typeof candidate.timerWindowEndMs !== 'number'
        ) {
            return null;
        }

        return candidate as NavVirtualChannel;
    }

    $: activeVirtualChannel = readActiveVirtualChannel($page.data.activeVirtualChannel);
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

    {#if activeVirtualChannel}
        <section class="nav-virtual-channel" aria-label="Active virtual channel">
            <div class="nav-virtual-channel-label">Virtual Channel</div>
            <div class="nav-virtual-channel-name">{activeVirtualChannel.name}</div>
        </section>
    {/if}

    <details class="profile-switcher" data-profile-tone={profileTone(activeProfileKey)}>
        <summary class="profile-chip">
            <span class="profile-chip-label">Profile</span>
            <span class="profile-chip-value">{activeProfileName}</span>
        </summary>

        <div class="profile-panel">
            {#if $page.url.searchParams.get('profileSwitchError') === 'adult-password'}
                <div class="profile-switch-error" role="alert">Adult profile password required.</div>
            {/if}

            {#each profiles as profile}
                <form method="post" action="/profile">
                    <input type="hidden" name="profile" value={profile.key} />
                    <input type="hidden" name="returnTo" value={$page.url.pathname + $page.url.search} />
                    {#if requiresAdultPassword(profile.key)}
                        <input
                            type="password"
                            name="password"
                            placeholder="Adult password"
                            autocomplete="current-password"
                            required
                        />
                    {/if}
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
