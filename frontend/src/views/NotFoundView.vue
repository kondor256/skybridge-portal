<template>
  <div class="empty">
    <h1>Page not found</h1>
    <p>The page you asked for does not exist or has been moved.</p>
    <RouterLink :to="{ name: 'catalogue' }" class="btn btn-primary">Back to all services</RouterLink>
  </div>
</template>
