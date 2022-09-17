import { abort, expiration, forget, mutate, query, subscribe } from 'turbo-query'
import { computed, getCurrentInstance, inject, onUnmounted, readonly, ref, watch } from 'vue'
import type { TurboMutateValue } from 'turbo-query'
import type { InjectionKey, Ref } from 'vue'
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
  const refetchOnFocus = options?.refetchOnFocus ?? contextOptions?.refetchOnFocus ?? true
  const refetchOnConnect = options?.refetchOnConnect ?? contextOptions?.refetchOnConnect ?? true
  const focusInterval = options?.focusInterval ?? contextOptions?.focusInterval ?? 5000
  const turboExpiration = options?.turbo?.expiration ?? contextOptions?.turbo?.expiration ?? expiration
  const clearOnForget = options?.clearOnForget ?? contextOptions?.clearOnForget ?? false

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
      ...contextOptions,
      ...options,
    })
  }

  async function refetch(): Promise<T | undefined> {
    if (!computedKey.value)
      return
    return await turboQuery<T>(computedKey.value, {
      stale: false,
      ...contextOptions,
      ...options,
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

  const lastFocus = ref(new Date())

  function onFocus(listener: () => void): () => void {
    if (!refetchOnFocus || typeof window === 'undefined')
      return () => {}

    const rawHandler = () => {
      const last = lastFocus.value
      const now = new Date()

      if (now.getTime() - last.getTime() > focusInterval) {
        lastFocus.value = new Date()
        listener()
      }
    }

    window.addEventListener('focus', rawHandler)
    return () => window.removeEventListener('focus', rawHandler)
  }

  function onConnect(listener: () => void): () => void {
    if (refetchOnConnect && typeof window !== 'undefined') {
      window.addEventListener('online', listener)
      return () => window.removeEventListener('online', listener)
    }
    return () => {}
  }

  function createFocusAvailable(
    precision: number,
  ): [Readonly<Ref<boolean>>, Readonly<Ref<number>>] {
    const isAvailable = ref(new Date().getTime() - lastFocus.value.getTime() > focusInterval)
    const availableIn = ref(focusInterval)

    const interval = setInterval(() => {
      const last = lastFocus.value
      const now = new Date()
      const availability = focusInterval - (now.getTime() - last.getTime())
      if (availability >= 0)
        availableIn.value = availability
      else if (availability < 0 && availableIn.value > 0)
        availableIn.value = 0
      isAvailable.value = now.getTime() - last.getTime() > focusInterval
    }, precision)

    onUnmounted(() => {
      clearInterval(interval)
    })

    return [isAvailable, availableIn]
  }

  /**
   * Returns the expiration date of the current key.
   * If the item is not in the cache, it will return undefined.
   */
  function localExpiration(): Date | undefined {
    const key = computedKey.value
    if (!key)
      return undefined

    return turboExpiration(key)
  }

  /**
   * Creates a signal that every given pricesion interval
   * will determine if the current key is currently expired / stale
   * and how many time needs to pass till its considered expired / stale.
   * This function helps creating
   * the controlled sigal on demand rather than creating
   * arbitrary signals ourselves just in case.
   * Return value is [isStale, staleIn]
   */
  function createStale(precision: number): [Readonly<Ref<boolean>>, Readonly<Ref<number>>] {
    const now = new Date()
    const initialKey = computedKey.value

    let initialIsStale = true
    let initialStaleIn = 0

    if (initialKey) {
      const expiresAt = expiration(initialKey)
      if (expiresAt) {
        const expirationIn = expiresAt.getTime() - now.getTime()
        if (expirationIn >= 0)
          initialStaleIn = expirationIn
        initialIsStale = expiresAt.getTime() < now.getTime()
      }
    }

    const isStale = ref(initialIsStale)
    const staleIn = ref(initialStaleIn)

    const unsubscribe = watch(computedKey, (key, _old, onCleanup) => {
      const interval = setInterval(() => {
        if (!key)
          return
        const expiresAt = expiration(key)
        if (expiresAt) {
          const now = new Date()
          const expirationIn = expiresAt.getTime() - now.getTime()
          if (expirationIn >= 0)
            staleIn.value = expirationIn
          else if (expirationIn < 0 && staleIn.value > 0)
            staleIn.value = 0
          isStale.value = expiresAt.getTime() < now.getTime()
        }
      }, precision)

      onCleanup(() => {
        clearInterval(interval)
      })
    })

    onUnmounted(() => {
      unsubscribe()
    })

    return [isStale, staleIn]
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

      const unsubscribeForgotten = turboSubscribe<T>(key, 'forgotten', () => {
        if (clearOnForget)
          resource.value = undefined
      })

      /**
       * Subscribe to focus changes if needed.
       */
      const unsubscribeFocusRefetch = onFocus(() => {
        refetch()
      })

      /**
       * Subscribe to network connect changes if needed.
       */
      const unsubscribeConnectRefetch = onConnect(() => {
        refetch()
      })

      resource.value = await turboQuery<T>(key, {
        stale: true,
        ...contextOptions,
        ...options,
      })

      onCleanup(() => {
        unsubscribeMutate()
        unsubscribeRefetching()
        unsubscribeResolved()
        unsubscribeErrors()
        unsubscribeForgotten()
        unsubscribeFocusRefetch()
        unsubscribeConnectRefetch()
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
      lastFocus: readonly(lastFocus),
      createFocusAvailable,
      expiration: localExpiration,
      createStale,
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
  const refetchOnFocus = options?.refetchOnFocus ?? contextOptions?.refetchOnFocus ?? true
  const refetchOnConnect = options?.refetchOnConnect ?? contextOptions?.refetchOnConnect ?? true
  const focusInterval = options?.focusInterval ?? contextOptions?.focusInterval ?? 5000
  const turboExpiration = options?.turbo?.expiration ?? contextOptions?.turbo?.expiration ?? expiration
  const clearOnForget = options?.clearOnForget ?? contextOptions?.clearOnForget ?? false
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
      ...contextOptions,
      ...options,
    })
  })()

  async function refetch(): Promise<T | undefined> {
    if (!computedKey.value)
      return
    return await turboQuery<T>(computedKey.value, {
      stale: false,
      ...contextOptions,
      ...options,
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

  const lastFocus = ref(new Date())

  function onFocus(listener: () => void): () => void {
    if (!refetchOnFocus || typeof window === 'undefined')
      return () => {}

    const rawHandler = () => {
      const last = lastFocus.value
      const now = new Date()

      if (now.getTime() - last.getTime() > focusInterval) {
        lastFocus.value = new Date()
        listener()
      }
    }

    window.addEventListener('focus', rawHandler)
    return () => window.removeEventListener('focus', rawHandler)
  }

  function onConnect(listener: () => void): () => void {
    if (refetchOnConnect && typeof window !== 'undefined') {
      window.addEventListener('online', listener)
      return () => window.removeEventListener('online', listener)
    }
    return () => {}
  }

  function createFocusAvailable(
    precision: number,
  ): [Readonly<Ref<boolean>>, Readonly<Ref<number>>] {
    const isAvailable = ref(new Date().getTime() - lastFocus.value.getTime() > focusInterval)
    const availableIn = ref(focusInterval)

    const interval = setInterval(() => {
      const last = lastFocus.value
      const now = new Date()
      const availability = focusInterval - (now.getTime() - last.getTime())
      if (availability >= 0)
        availableIn.value = availability
      else if (availability < 0 && availableIn.value > 0)
        availableIn.value = 0
      isAvailable.value = now.getTime() - last.getTime() > focusInterval
    }, precision)

    onUnmounted(() => {
      clearInterval(interval)
    })

    return [isAvailable, availableIn]
  }

  /**
   * Returns the expiration date of the current key.
   * If the item is not in the cache, it will return undefined.
   */
  function localExpiration(): Date | undefined {
    const key = computedKey.value
    if (!key)
      return undefined

    return turboExpiration(key)
  }

  /**
   * Creates a signal that every given pricesion interval
   * will determine if the current key is currently expired / stale
   * and how many time needs to pass till its considered expired / stale.
   * This function helps creating
   * the controlled sigal on demand rather than creating
   * arbitrary signals ourselves just in case.
   * Return value is [isStale, staleIn]
   */
  function createStale(precision: number): [Readonly<Ref<boolean>>, Readonly<Ref<number>>] {
    const now = new Date()
    const initialKey = computedKey.value

    let initialIsStale = true
    let initialStaleIn = 0

    if (initialKey) {
      const expiresAt = expiration(initialKey)
      if (expiresAt) {
        const expirationIn = expiresAt.getTime() - now.getTime()
        if (expirationIn >= 0)
          initialStaleIn = expirationIn
        initialIsStale = expiresAt.getTime() < now.getTime()
      }
    }

    const isStale = ref(initialIsStale)
    const staleIn = ref(initialStaleIn)

    const unsubscribe = watch(computedKey, (key, _old, onCleanup) => {
      const interval = setInterval(() => {
        if (!key)
          return
        const expiresAt = expiration(key)
        if (expiresAt) {
          const now = new Date()
          const expirationIn = expiresAt.getTime() - now.getTime()
          if (expirationIn >= 0)
            staleIn.value = expirationIn
          else if (expirationIn < 0 && staleIn.value > 0)
            staleIn.value = 0
          isStale.value = expiresAt.getTime() < now.getTime()
        }
      }, precision)

      onCleanup(() => {
        clearInterval(interval)
      })
    })

    onUnmounted(() => {
      unsubscribe()
    })

    return [isStale, staleIn]
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

      const unsubscribeForgotten = turboSubscribe<T>(key, 'forgotten', () => {
        if (clearOnForget)
          resource.value = undefined
      })

      /**
       * Subscribe to focus changes if needed.
       */
      const unsubscribeFocusRefetch = onFocus(() => {
        refetch()
      })

      /**
       * Subscribe to network connect changes if needed.
       */
      const unsubscribeConnectRefetch = onConnect(() => {
        refetch()
      })

      resource.value = await turboQuery<T>(key, {
        stale: true,
        ...contextOptions,
        ...options,
      })

      onCleanup(() => {
        unsubscribeMutate()
        unsubscribeRefetching()
        unsubscribeResolved()
        unsubscribeErrors()
        unsubscribeForgotten()
        unsubscribeFocusRefetch()
        unsubscribeConnectRefetch()
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
      lastFocus: readonly(lastFocus),
      createFocusAvailable,
      expiration: localExpiration,
      createStale,
    },
  ]
}
