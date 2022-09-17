import type {
  TurboMutateValue,
  TurboQuery,
  TurboQueryOptions,
} from 'turbo-query'
import type { Ref } from 'vue'

export interface TurboVueOptions extends TurboQueryOptions {
  /**
   * A default turbo query instance to use if any.
   */
  readonly turbo?: TurboQuery

  /**
   * Determines if it should refetch keys when
   * the window regains focus. You can also
   * set the desired `focusInterval`.
   * @default true
   */
  readonly refetchOnFocus?: boolean

  /**
   * Determines if it should refetch keys when
   * the window regains focus.
   * @default true
   */
  readonly refetchOnConnect?: boolean

  /**
   * Determines a throttle interval for the
   * `refetchOnFocus`.
   * @default 5000
   */
  readonly focusInterval?: number

  /**
   * Clears the resource signal by setting it to
   * undefined when the key is forgotten from the cache.
   * @default false
   */
  readonly clearOnForget?: boolean

  /*
   * Prevent the request from firing until the `refetch` method is called
   * or the computed key changed. Only applies to non-suspense queries.
   */
  readonly immediate?: boolean
}

export interface TurboVueResourceActions<T> {
  /**
   * Refetches the current key.
   */
  readonly refetch: () => Promise<T | undefined>

  /**
   * Mutates the current key.
   */
  readonly mutate: (value: TurboMutateValue<T>) => void

  /**
   * Usubscribes from the current key changes.
   */
  readonly unsubscribe: () => void

  /**
   * Forgets the current key from the cache.
   */
  readonly forget: () => void

  /**
   * Aborts the current key's request if any.
   */
  readonly abort: (reason?: any) => void

  /**
   * Determines if an error occured.
   */
  readonly error: Readonly<Ref<unknown>>

  /**
   * Determines if it's refetching in the background.
   */
  readonly isRefetching: Readonly<Ref<boolean>>

  /**
   * Determines the date of the last window focus.
   * Useful to calculate how many time is left
   * for the next available focus refetching.
   */
  readonly lastFocus: Readonly<Ref<Date>>

  /**
   * Creates a ref that every given precision interval
   * will determine if the current key is available
   * to refetch via focus and how many time needs to pass till
   * it's available to refetch by focus. This function helps creating
   * the controlled ref on demand rather than creating
   * arbitrary refs ourselves just in case.
   * Return value is [`isAvailable` (readonly ref), `availableIn` (readonly ref)]
   */
  readonly createFocusAvailable: (
    precision: number
  ) => [Readonly<Ref<boolean>>, Readonly<Ref<number>>]

  /**
   * Determines when the current key expires if
   * it's currently in the cache.
   */
  readonly expiration: () => Date | undefined

  /**
   * Creates a signal that every given pricesion interval
   * will determine if the current key is currently expired / stale
   * and how many time needs to pass till its considered expired / stale.
   * This function helps creating
   * the controlled ref on demand rather than creating
   * arbitrary refs ourselves just in case.
   * Return value is [isStale (readonly ref), staleIn (readonly ref)]
   */
  readonly createStale: (
    precision: number
  ) => [Readonly<Ref<boolean>>, Readonly<Ref<number>>]
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
