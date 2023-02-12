<script lang="ts" setup>
import { onErrorCaptured, ref } from 'vue'
import Post from './Post.vue'
import PostSuspense from './PostSuspense.vue'

const error = ref<unknown>()
const current = ref(1)

onErrorCaptured((err) => {
  error.value = err
  return false
})

function retry() {
  error.value = undefined
}
</script>

<template>
  <div>
    <h1>All posts</h1>
    <input v-model="current" type="number" min="0">
    <hr>

    <h2>Suspense</h2>
    <Suspense>
      <template #fallback>
        <div>Loading post...</div>
      </template>
      <div v-if="error">
        <div>There was an error...</div>
        <button @click="retry">
          Retry
        </button>
      </div>
      <div v-else>
        <PostSuspense :id="current" />
      </div>
    </Suspense>
    <hr>

    <h2>Non-Suspense</h2>
    <Post :id="current" />
  </div>
</template>
