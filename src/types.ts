import type { TurboMutateValue, TurboQuery, TurboQueryOptions } from 'turbo-query'
import type { Ref } from 'vue'

export interface TurboVueOptions extends TurboQueryOptions {
  /**
   * A default turbo query instance to use if any.
   */
  turbo?: TurboQuery

  /*
   * Prevent the request from firing until the `refetch` method is called
   * or the computed key changed. Only applies to non-suspense queries.
   */
  immediate?: boolean
}

export interface TurboVueResourceActions<T> {
  /**
   * Refetches the current key.
   */
  refetch(opts?: TurboQueryOptions): Promise<T | undefined>

  /**
   * Mutates the current key.
   */
  mutate(value: TurboMutateValue<T>): void

  /**
   * Usubscribes from the current key changes.
   */
  unsubscribe(): void

  /**
   * Forgets the current key from the cache.
   */
  forget(): void

  /**
   * Aborts the current key's request if any.
   */
  abort(reason?: any): void

  /**
   * Determines if an error occured.
   */
  error: Readonly<Ref<unknown>>

  /**
   * Determines if it's refetching in the background.
   */
  isRefetching: Readonly<Ref<boolean>>
}

export type TurboVueResource<T> = [
  /**
   * The resulting resource.
   */
  Readonly<Ref<T | undefined>>,

  /**
   * Available actions on that resource.
   */
  TurboVueResourceActions<T>,
]

/**
 * Determines how a Vue key looks like.
 */
export type TurboVueKey = () => string | false | null

