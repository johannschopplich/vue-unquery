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

## License

[MIT](./LICENSE) License © 2022 [Johann Schopplich](https://github.com/johannschopplich)

[MIT](./LICENSE) License © 2022 [Erik C. Forés](https://github.com/ConsoleTVs)
