# 🪺 vue-unquery

[![NPM version](https://img.shields.io/npm/v/vue-unquery?color=a1b858&label=)](https://www.npmjs.com/package/vue-unquery)

> Lightweight data management for Vue in suspense & non-suspense contexts.

Basically an identical fork of [TurboVue](https://github.com/StudioLambda/TurboVue), but also suited for non-suspense setups.

All the credits to [Erik C. Forés](https://github.com/ConsoleTVs) for his amazing work.

## Key Features

- 🎠 Create a query resource:
  - Suspense contexts: `useAsyncQuery`
  - Non-suspense contexts: `useQuery`
- ⛲️ Support for lazy fetching via `immediate: false` option in non-suspense environments

## Usage

### Suspense Context

```ts
const [post, { isRefetching, refetch, mutate, error }] = await useAsyncQuery<Post>(
  () => `https://jsonplaceholder.typicode.com/posts/${props.id}`,
)
```

### Non-Suspense Context

```ts
const [post, { isRefetching, refetch, mutate, error }] = useQuery<Post>(
  () => `https://jsonplaceholder.typicode.com/posts/${props.id}`,
)
```

Prevent initial data fetching with `immediate: false`:

```ts
const [post, { isRefetching, refetch, mutate, error }] = useQuery<Post>(
  () => `https://jsonplaceholder.typicode.com/posts/${props.id}`,
  { immediate: false }
)

// Later, call:
refetch()
```

### Configuration

> **Note**
>
> All options from [Turbo Query](./src/turbo-query/README.md) apply.

```ts
import { configure } from 'vue-unquery'

configure({
  async fetcher(key, { signal }) {
    const response = await fetch(key, { signal })
    if (!response.ok)
      throw new Error('Fetch request failed')
    return await response.json()
  },
})
```

## 💻 Development

1. Clone this repository
2. Enable [Corepack](https://github.com/nodejs/corepack) using `corepack enable`
3. Install dependencies using `pnpm install`
4. Start development server using `pnpm run dev` inside `playground`

## License

[MIT](./LICENSE) License © 2022-2023 [Johann Schopplich](https://github.com/johannschopplich)

[MIT](./LICENSE) License © 2022 [Erik C. Forés](https://github.com/ConsoleTVs)
