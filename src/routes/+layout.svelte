<script lang="ts">
  import '../app.css';
  import SideNav from '$lib/components/SideNav.svelte';
  const appName = 'YT Viewer';
  let isMobileNavOpen = false;

  export let data: {
    profiles: Array<{ id: string | number; key: string; name: string; splitTimerModeEnabled: boolean }>;
    activeProfileKey: string;
    activeProfileName: string;
    activeProfileSplitTimerModeEnabled: boolean;
    isAdminLoggedIn: boolean;
  };
</script>

<div
  class="app-layout"
  class:mobile-nav-open={isMobileNavOpen}
  data-profile-tone={data.activeProfileKey === 'child' ? 'child' : 'adult'}
>
  <button
    type="button"
    class="mobile-nav-toggle"
    aria-label={isMobileNavOpen ? 'Close navigation' : 'Open navigation'}
    aria-expanded={isMobileNavOpen}
    on:click={() => isMobileNavOpen = !isMobileNavOpen}
  >
    <span aria-hidden="true"></span>
    <span aria-hidden="true"></span>
    <span aria-hidden="true"></span>
  </button>
  <SideNav
    {appName}
    profiles={data.profiles}
    activeProfileKey={data.activeProfileKey}
    activeProfileName={data.activeProfileName}
    activeProfileSplitTimerModeEnabled={data.activeProfileSplitTimerModeEnabled}
    isAdminLoggedIn={data.isAdminLoggedIn}
  />
  <div class="app-content">
    <slot />
  </div>
</div>
<!-- apply-patch-anchor - do not delete -->
