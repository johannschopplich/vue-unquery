<script lang="ts" setup>
import { useAsyncQuery } from 'vue-unquery'

const props = defineProps<{
  id: number
}>()

interface Post {
  id: number
  title: string
  body: string
}

const [post, { isRefetching, refetch, mutate }] = await useAsyncQuery<Post>(
  // The `suspense=true` query is added for different query key than the non-supense one
  () => `https://jsonplaceholder.typicode.com/posts/${props.id}?suspense=true`,
)
</script>

<template>
  <div>
    <h2>{{ post?.title }}</h2>
    <p>{{ post?.body }}</p>
    <button :disabled="isRefetching" @click="refetch()">
      {{ isRefetching ? 'Refetching...' : 'Refetch' }}
    </button>
    <button @click="() => mutate((current) => ({ ...current!, title: 'Random title here' }))">
      Force title change
    </button>
  </div>
</template>
