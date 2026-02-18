<script lang="ts">
  const appName = 'YT Channel Watcher';
</script>

<main>
  <h1>Welcome to {appName}</h1>

  <section>
    <h2>Navigation</h2>
    <ul>
      <li><a href="/viewer">Viewer</a></li>
      <li><a href="/history">History</a></li>
      <li><a href="/admin">Admin Home</a> (requires login)</li>
      <li><a href="/admin/channels">Admin: Channels</a></li>
      <li><a href="/admin/channel-groups">Admin: Channel Groups</a></li>
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
