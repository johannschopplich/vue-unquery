import { createApp } from 'vue'
import { configure } from 'turbo-query'
import App from './App.vue'

configure({
  async fetcher(key, { signal }) {
    await new Promise(resolve => setTimeout(resolve, 2000))
    const response = await fetch(key, { signal })
    if (!response.ok)
      throw new Error('There was an error')
    return await response.json()
  },
})

createApp(App).mount('#app')
