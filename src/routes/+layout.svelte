<script lang="ts">
  import '../app.css';
  import SideNav from '$lib/components/SideNav.svelte';
  const appName = 'YT Channel Watcher';
</script>

<div class="app-layout">
  <SideNav {appName} />
  <div class="app-content">
    <slot />
  </div>
  </div>

<style>
  .app-layout {
    display: flex;
    min-height: 100vh;
    background: #0f0f0f;
    color: #fff;
  }
  .app-content {
    flex: 1;
    padding: 1rem;
    box-sizing: border-box;
  }
</style>
