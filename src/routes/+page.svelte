<script lang="ts">
  const appName = 'YT Viewer';
</script>

<main>
  <h1>Welcome to {appName}</h1>

  <section>
    <h2>Navigation</h2>
    <ul>
      <li><a href="/viewer/virtual-channels">Choose a Virtual Channel</a></li>
      <li><a href="/viewer">Video List</a></li>
      <li><a href="/history">History</a></li>
      <li><a href="/admin">Admin Home</a> (requires login)</li>
      <li><a href="/admin/source-channels">Admin: Source Channels</a></li>
      <li><a href="/admin/virtual-channels">Admin: Virtual Channels</a></li>
      <li><a href="/admin/assignments">Admin: Assignments</a></li>
      <li><a href="/admin/login">Admin: Login</a></li>
    </ul>
  </section>
</main>

<style>
  main { padding: 1rem; }
  ul { list-style: disc; padding-left: 1.25rem; }
  li { margin: 0.25rem 0; }
</style>
