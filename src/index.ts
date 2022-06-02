import { abort, forget, mutate, query, subscribe } from 'turbo-query'
import { computed, getCurrentInstance, inject, onUnmounted, readonly, ref, watch } from 'vue'
import type { TurboMutateValue, TurboQueryOptions } from 'turbo-query'
import type { InjectionKey } from 'vue'
import type { TurboVueKey, TurboVueOptions, TurboVueResource } from './types'

export * from './types'

export const injectionKey = Symbol(
  'vue-unquery-context',
) as InjectionKey<TurboVueOptions>

export function injectQueryOptions(value?: TurboVueOptions) {
  return inject(injectionKey, value)
}

/**
 * Creates a new query resource with the given key and options
 * for suspense usage.
 */
export async function useAsyncQuery<T = any>(
  key: TurboVueKey,
  options?: TurboVueOptions,
): Promise<TurboVueResource<T>> {
  const contextOptions = injectQueryOptions()
  const turboQuery = options?.turbo?.query ?? contextOptions?.turbo?.query ?? query
  const turboMutate = options?.turbo?.mutate ?? contextOptions?.turbo?.mutate ?? mutate
  const turboSubscribe = options?.turbo?.subscribe ?? contextOptions?.turbo?.subscribe ?? subscribe
  const turboForget = options?.turbo?.forget ?? contextOptions?.turbo?.forget ?? forget
  const turboAbort = options?.turbo?.abort ?? contextOptions?.turbo?.abort ?? abort

  const computedKey = computed(() => {
    try {
      return key()
    }
    catch {
      return null
    }
  })

  const resource = ref<T | undefined>()
  const error = ref<unknown>()
  const isRefetching = ref<boolean>(false)

  /**
   * We force a throw if there's an error.
   * This needs to be in a watcher for `onCaptureError`
   * to be able to capture it.
   */
  watch(error, (e) => {
    if (e !== undefined)
      throw e
  })

  /**
   * Initially resolve the key if needed.
   */
  if (computedKey.value) {
    resource.value = await turboQuery<T>(computedKey.value, {
      stale: true,
      ...options,
    })
  }

  async function refetch(opts?: TurboQueryOptions): Promise<T | undefined> {
    if (!computedKey.value)
      return
    return await turboQuery<T>(computedKey.value, {
      stale: false,
      ...options,
      ...opts,
    })
  }

  function localMutate(item: TurboMutateValue<T>): void {
    if (!computedKey.value)
      return
    turboMutate(computedKey.value, item)
  }

  function localForget(): void {
    if (!computedKey.value)
      return
    turboForget(computedKey.value)
  }

  function localAbort(reason?: any): void {
    if (!computedKey.value)
      return
    turboAbort(computedKey.value, reason)
  }

  const unsubscribe = watch(
    computedKey,
    async (key, _old, onCleanup) => {
      isRefetching.value = false
      if (!key)
        return

      const unsubscribeMutate = turboSubscribe<T>(
        key,
        'mutated',
        (item) => {
          resource.value = item
        },
      )

      const unsubscribeRefetching = turboSubscribe<T>(
        key,
        'refetching',
        () => {
          isRefetching.value = true
        },
      )

      const unsubscribeResolved = turboSubscribe<T>(
        key,
        'resolved',
        (item) => {
          isRefetching.value = false
          resource.value = item
        },
      )

      const unsubscribeErrors = turboSubscribe<unknown>(
        key,
        'error',
        (e) => {
          isRefetching.value = false
          error.value = e
        },
      )

      resource.value = await turboQuery<T>(key, {
        stale: true,
        ...options,
      })

      onCleanup(() => {
        unsubscribeMutate()
        unsubscribeRefetching()
        unsubscribeResolved()
        unsubscribeErrors()
      })
    },
    { immediate: true },
  )

  // Unmount automatically if we're inside a component.
  if (getCurrentInstance())
    onUnmounted(() => unsubscribe())

  return [
    // readonly(resource),
    resource,
    {
      refetch,
      mutate: localMutate,
      forget: localForget,
      abort: localAbort,
      unsubscribe,
      error: readonly(error),
      isRefetching: readonly(isRefetching),
    },
  ]
}

/**
 * Creates a new query resource with the given key and options.
 */
export function useQuery<T = any>(
  key: TurboVueKey,
  options?: TurboVueOptions,
): TurboVueResource<T> {
  const contextOptions = injectQueryOptions()
  const turboQuery = options?.turbo?.query ?? contextOptions?.turbo?.query ?? query
  const turboMutate = options?.turbo?.mutate ?? contextOptions?.turbo?.mutate ?? mutate
  const turboSubscribe = options?.turbo?.subscribe ?? contextOptions?.turbo?.subscribe ?? subscribe
  const turboForget = options?.turbo?.forget ?? contextOptions?.turbo?.forget ?? forget
  const turboAbort = options?.turbo?.abort ?? contextOptions?.turbo?.abort ?? abort
  const immediate = options?.immediate ?? contextOptions?.immediate ?? true

  const computedKey = computed(() => {
    try {
      return key()
    }
    catch {
      return null
    }
  })

  const resource = ref<T | undefined>()
  const error = ref<unknown>()
  const isRefetching = ref<boolean>(false);

  /**
   * Initially resolve the key if needed.
   */
  (async () => {
    if (!computedKey.value || !immediate)
      return
    resource.value = await turboQuery<T>(computedKey.value, {
      stale: true,
      ...options,
    })
  })()

  async function refetch(opts?: TurboQueryOptions): Promise<T | undefined> {
    if (!computedKey.value)
      return
    return await turboQuery<T>(computedKey.value, {
      stale: false,
      ...options,
      ...opts,
    })
  }

  function localMutate(item: TurboMutateValue<T>): void {
    if (!computedKey.value)
      return
    turboMutate(computedKey.value, item)
  }

  function localForget(): void {
    if (!computedKey.value)
      return
    turboForget(computedKey.value)
  }

  function localAbort(reason?: any): void {
    if (!computedKey.value)
      return
    turboAbort(computedKey.value, reason)
  }

  const unsubscribe = watch(
    computedKey,
    async (key, _old, onCleanup) => {
      isRefetching.value = false
      if (!key)
        return

      const unsubscribeMutate = turboSubscribe<T>(
        key,
        'mutated',
        (item) => {
          resource.value = item
        },
      )

      const unsubscribeRefetching = turboSubscribe<T>(
        key,
        'refetching',
        () => {
          isRefetching.value = true
        },
      )

      const unsubscribeResolved = turboSubscribe<T>(
        key,
        'resolved',
        (item) => {
          isRefetching.value = false
          resource.value = item
        },
      )

      const unsubscribeErrors = turboSubscribe<unknown>(
        key,
        'error',
        (e) => {
          isRefetching.value = false
          error.value = e
        },
      )

      resource.value = await turboQuery<T>(key, {
        stale: true,
        ...options,
      })

      onCleanup(() => {
        unsubscribeMutate()
        unsubscribeRefetching()
        unsubscribeResolved()
        unsubscribeErrors()
      })
    },
    { immediate },
  )

  // Unmount automatically if we're inside a component.
  if (getCurrentInstance())
    onUnmounted(() => unsubscribe())

  return [
    // readonly(resource),
    resource,
    {
      refetch,
      mutate: localMutate,
      forget: localForget,
      abort: localAbort,
      unsubscribe,
      error: readonly(error),
      isRefetching: readonly(isRefetching),
    },
  ]
}
