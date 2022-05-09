<script lang="ts" setup>
import { ref } from 'vue'
import Post from './Post.vue'

const current = ref(1)
</script>

<template>
  <div>
    <h1>All posts</h1>
    <input v-model="current" type="number" min="0">
    <Post :id="current" />
  </div>
</template>
