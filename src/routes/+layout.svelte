<script lang="ts">
  import '../app.css';
  import SideNav from '$lib/components/SideNav.svelte';
  const appName = 'YT Viewer';
</script>

<div class="app-layout">
  <SideNav {appName} />
  <div class="app-content">
    <slot />
  </div>
</div>
