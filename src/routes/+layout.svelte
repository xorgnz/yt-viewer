<script lang="ts">
  import '../app.css';
  import SideNav from '$lib/components/SideNav.svelte';
  const appName = 'YT Viewer';

  export let data: {
    profiles: Array<{ id: string | number; key: string; name: string; splitTimerModeEnabled: boolean }>;
    activeProfileKey: string;
    activeProfileName: string;
    isAdminLoggedIn: boolean;
  };
</script>

<div class="app-layout" data-profile-tone={data.activeProfileKey === 'child' ? 'child' : 'adult'}>
  <SideNav
    {appName}
    profiles={data.profiles}
    activeProfileKey={data.activeProfileKey}
    activeProfileName={data.activeProfileName}
    isAdminLoggedIn={data.isAdminLoggedIn}
  />
  <div class="app-content">
    <slot />
  </div>
</div>
<!-- apply-patch-anchor - do not delete -->
