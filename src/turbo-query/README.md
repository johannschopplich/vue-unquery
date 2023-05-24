# Turbo Query

> Lightweight asynchronous data management

> **Note**
>
> Forked from [StudioLambda/TurboQuery](https://github.com/StudioLambda/TurboQuery) without any changes to enable `moduleResolution: "bundler"`.

Turbo Query is a library created to manage asynchronous data on your code. This is generally used when you have to fetch data asynchronously for a given resource. Turbo Query allows you to manage this data by using an internal cache. It is very similar to how vercel's swr work. Turbo Query is also build to support arbitrary cache and event system, making it possible to create your own implementations.

## Installation

To install Turbo Query just install the `turbo-query` npm package:

```sh
npm i turbo-query
```

Turbo Query does not have any dependencies, and it's packed at around 1.5KB (compressed).

## Getting Started

Start using Turbo Query by creating an instance of it. Turbo Query accepts a bunch of options
on its constructor, allowing to tune and set up the internal configuration, caches and event system.

```ts
import { createTurboQuery } from 'turbo-query'

// Create the configuration object.
const options = {
  // Example isomorphic fetcher, requires node 17.5+.
  async fetcher(key, { signal }) {
    const response = await fetch(key, { signal })
    if (!response.ok)
      throw new Error('Not a 4XX response')
    return await response.json()
  },
}

// Create the Turbo Query instsance.
const instance = createTurboQuery(options)

// Start querying!
const result = await instance.query('/posts')
```

## Configuration Options

The **Configuration options** available are the following:

- **expiration**: A `function` that takes in the resolved item and returns the number of `ms` to cache it for.

  ```ts
  const options = {
    /**
     * Cache for 1 second if item is foo, otherwise 2 seconds.
     */
    expiration(item) {
      return item === 'foo' ? 1000 : 2000
    },
  }
  ```

- **fetcher**: A fetcher `function` that takes in the current cache key and additional options. The additional options is an object that currently have an [abortion signal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) on its property named `signal`.

  ```ts
  const options = {
    /**
     * Generic fetching using `fetch` and the key as URL.
     */
    async fetcher(key, { signal }) {
      const response = await fetch(key, { signal })
      if (!response.ok)
        throw new Error('Not a 4XX response')
      return await response.json()
    },
  }
  ```

- **stale**: A `boolean` that determines if a stale value can be returned from a query when a value has already expired. If a stale value is returned, a refetching will be triggered in the background to ensure a fresh data when possible, and an event will be emitted when it happens.

  ```ts
  const options = {
    stale: true, // or false
  }
  ```

- **removeOnError**: A `boolean` indicating if the stored cached item should be removed upon a refetching causes an error. The fetching resolver is always removed.

  ```ts
  const options = {
    removeOnError: false, // or true
  }
  ```

- **fresh**: A `boolean` indicating if a query result should always be a fresh fetched instance regardless of any cached value or its expiration time.

  ```ts
  const options = {
    fresh: false, // or true
  }
  ```

### Additional Instance Configuration

Additionally, the instance itself also accepts the specific configurations found below:

- **itemsCache**: A `TurboCache<ItemsCacheItem>` indicating the cache to use for the items.

  ```ts
  import { createTurboCache } from 'turbo-query'

  const options = {
    itemsCache: createTurboCache(),
  }
  ```

- **resolversCache**: A `TurboCache<ResolversCacheItem<any>>` indicating the cache to use for the resolvers.

  ```ts
  import { createTurboCache } from 'turbo-query'

  const options = {
    resolversCache: createTurboCache(),
  }
  ```

- **events**: A `TurboEvents` indicating the event system to use.

  ```ts
  import { createTurboEvents } from 'turbo-query'

  const options = {
    resolversCache: createTurboEvents(),
  }
  ```

## Lazy Configuration or Re-Configuration

You can re-configure a Turbo Query instance by calling the `configure` function provided
by the instance and passing it the exact same options as the original constructor, however, the options will be merged with the current instance options rather than replaced, therefore there's no need to pass in the whole configuration, you can just give it the options you wish to replace.

```ts
instance.configure(options)
```

## Query Asynchronous Data

You can use the `query` function provided by the instance to start querying for async data. This method takes in a cache key that will be passed to the fetcher and some specific options that will replace the instance options for that specific call.

The result of a query call will always be a promise that will be resolved to the
acual data.

```ts
// Using the URL as cache key.
const result = await instance.query('/posts')

// Custom cache key and fetcher for this query.
const result2 = await instance.query('my-posts', {
  fetcher: () => fetch('/posts').then(r => r.json()),
})
```

## Subscribe to Changes

You can subscribe to different events happening on Turbo Query by using the `subscribe`
function in an instance. The return value of a subscribe is an unsubscriber that can be
called to terminate the subscription.

```ts
const unsubscribe = instance.subscribe('event-name', (payload) => {
  // ...
})

// When the subscription is no longer needed...
unsubscribe()
```

The following are the available events that you can subscribe to, and each have a diferent payload available.

- **refetching**: Fired when a value is refetched. The `payload` parameter is a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) that will resolve to the fetched data.

- **resolved**: Fired when a value is resolved, this means it was successfully fetched or refetched. The `payload` is the resolved item.

- **mutated**: Fired when a value has been manually mutated. The `payload` is the mutated item.

- **aborted**: Fired when a value has been manually aborted either by calling `abort` or by calling `forget` when a resolver is pending. The `payload` is the promise's result, usually if the abort signal has been used this means it's either what it returns when it's aborted or in case of throw, what the `.catch` returns (the throwing reason).

- **forgotten**: Fired when a value has been forgotten from the cache, probably because of a call to `forget`. The `payload` is the item that has been forgotten from the cache.

- **error**: Fired when a refetching has failed, this means the promise of the fetcher has been rejected. The `payload` is the error returned by it.

## Optimistic Mutations

You can perform optimistic mutations of the items in the cache by using the `mutate` function on an instance. This function does not return anything.

```ts
// Mutating a specific item.
instance.mutate('/user', user)

// Mutating an item based on the current value.
// For example, appending an item to a list.
instance.mutate('/posts', posts => [...posts, post])
```

## Aborting Pending Operations

You can abort any pending async operations by using the `abort` function on an instance.
This will cause all pending fetchers to be aborted using the internal [AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController), and therefore, the signal passed to the fetcher will be used. Make sure to be using that signal to gracefully
teardown your async operations. After the functions have been aborted, their resolvers will be removed from the cache, therefore never resolving to its value. This function does not return anything.

```ts
// Abort without any reason.
instance.abort('/posts')

// Abort with a specific reason.
instance.abort('/posts', reason)
```

## Invalidate or Forget Cached Items

You can invalidate or forget certain cache items by key using the `forget` function provided on an instance. This function does not return anything.

```ts
// Forget a single key.
instance.forget('/user')

// Forget multiple keys.
instance.forget(['/user', '/posts'])
```

## Inspect Current Cached Keys

You can inspect the current cached keys of both, the `resolvers` cache and the `items` cache by using the `keys` function on an instance. This will return an [Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) with the given keys.

```ts
// Get the resolver keys.
const resolverKeys = instance.keys('resolvers')

// Get the item keys.
const itemKeys = instance.keys('items')
```

## Check Expiration Date For Items

You can check the expiration date for the given keys by using the `expiration` function.
The return value is undefined if that key is not in the items cache, otherwise, a [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) object is returned.

```ts
const expirationDate = expiration('/user')
```

## Global Instance

Turbo Query provides a global instance created already, allowing you quick access to all the methods of an instance with a single import.

```ts
import { abort, configure, expiration, forget, keys, mutate, query, subscribe } from 'turbo-query'
```

This is actually suprisingly usefull and still allows you to customize the instance in some initialization function by using the `configure` function.

## Custom Cache Implementation

You can use any cache implementation as long as it corresponds to the `TurboCache` interface. You can use the `itemsCache` and `resolversCache` options on a Turbo Query instance to tell Turbo Query about the cache to use.

```ts
export interface TurboCache<T = any> {
  /**
   * Gets an item from the cache.
   */
  get<D extends T = T>(key: string): D

  /**
   * Sets an item to the cache.
   */
  set<D extends T = T>(key: string, value: D): void

  /**
   * Determines if the cache has a given key.
   */
  has(key: string): boolean

  /**
   * Removes a key-value pair from the cache.
   */
  remove(key: string): void

  /**
   * Removes all the key-value pairs from the cache.
   */
  clear(): void

  /**
   * Returns the current cached keys.
   */
  keys(): string[]
}
```

## Custom Event System Implementation

You can use any event system implementation as long as it corresponds to the `TurboEvents` interface. You can use the `events` option on a Turbo Query instance to tell Turbo Query about the event system to use.

```ts
export interface TurboEvents<E = string> {
  /**
   * Subscribes a given listener.
   */
  subscribe<T = any>(key: E, listener: TurboListener<T>): void

  /**
   * Unsubscribes the given listener.
   */
  unsubscribe<T = any>(key: E, listener: TurboListener<T>): void

  /**
   * Emits an event to all active listeners.
   */
  emit<T = any>(key: E, payload: T): void
}
```

## License

MIT License © 2022 Erik C. Forés
