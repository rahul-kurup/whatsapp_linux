type Prev = [never, 0, 1, 2, 3, 4, 5];

type IsPrimitive<T> = T extends
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  ? true
  : false;

type IsGeneric<T> = unknown extends T ? true : false;

type IsFunction<T> = T extends (...args: any[]) => any ? true : false;

type IsArray<T> = T extends (infer _U)[] ? true : false;

/**
 * Recursively generate all possible paths in an object
 * Includes support for objects, arrays, and functions
 */
type PossiblePaths<T, Depth extends number = 3> = Depth extends 0
  ? []
  : IsGeneric<T> extends true
    ? []
    : IsPrimitive<T> extends true
      ? []
      : IsArray<T> extends true
        ? // For arrays, include numeric indices [0], [1], etc.
          [
            `[${number}]`,
            ...PossiblePaths<T extends (infer U)[] ? U : never, Prev[Depth]>,
          ]
        : IsFunction<T> extends true
          ? // Functions get () suffix
            []
          : {
              [K in Extract<keyof T, string>]: IsFunction<T[K]> extends true
                ? // Function property - add () suffix
                  [`${K}()`]
                : [K, ...PossiblePaths<T[K], Prev[Depth]>];
            }[Extract<keyof T, string>];

/**
 * Merge path array into dot-notation string
 * Handles array indices like [0] and object properties like .prop
 */
type MergePath<T extends string[]> = T extends []
  ? never
  : T extends [infer F]
    ? F
    : T extends [infer F, ...infer R]
      ? F extends string
        ? R extends string[]
          ? F extends `[${string}]`
            ? // Array index - no dot before bracket
              `${F}${MergePath<R>}`
            : // Object property - add dot
              MergePath<R> extends `[${string}]${string}`
              ? // Next is array index
                `${F}${MergePath<R>}`
              : // Next is property
                `${F}.${MergePath<R>}`
          : never
        : never
      : string;

/**
 * Generate all possible dot-notation paths for a type
 */
export type AllPossiblePaths<T> = MergePath<PossiblePaths<T>>;

/**
 * Split a dot-notation path into segments
 * Handles both property access and array indices
 * Example: 'window.items[0].name' -> ['window', 'items', '[0]', 'name']
 */
export type Split<S extends string> = S extends `${infer First}.${infer Rest}`
  ? [First, ...Split<Rest>]
  : S extends `${infer First}[${infer Index}]${infer Rest}`
    ? Rest extends ''
      ? [First, `[${Index}]`]
      : [First, `[${Index}]`, ...Split<Rest>]
    : [S];

/**
 * Detect if a type is a function at runtime
 */

/**
 * Generate all optional chaining combinations for a path
 *
 * Supports:
 * - Objects: obj.prop, obj?.prop
 * - Arrays: arr[0], arr?.[0]
 * - Functions: func(), func?.()
 * - Mixed: obj.arr[0].method()
 *
 * For each segment in the path, it can be:
 * - segment (normal access)
 * - segment? (optional chaining)
 *
 * For arrays:
 * - [index] (normal access)
 * - ?.[index] (optional chaining)
 *
 * For functions (detected by parentheses):
 * - method() (normal call)
 * - method?.() (optional call)
 *
 * For properties (default):
 * - prop (normal access)
 * - ?.prop (optional chaining)
 *
 * Examples:
 * - 'a.b.c' (property) -> a.b.c, a?.b.c, a.b?.c, a?.b?.c
 * - 'a.b()' (function) -> a.b(), a?.b(), a.b?.(), a?.b?.()
 * - 'a[0].b' (array) -> a[0].b, a?.[0].b, a[0]?.b, a?.[0]?.b
 */
export type OptionalChainingCombinations<
  Segments extends string[],
  Accumulated extends string = '',
  IsFirstSegment extends boolean = true,
> = Segments extends [
  infer First extends string,
  ...infer Rest extends string[],
]
  ? First extends `[${infer Index}]`
    ? // Array index access
      Rest extends []
      ? // Last segment is array index
          `${Accumulated}[${Index}]` | `${Accumulated}?.[${Index}]`
      : // Not last, continue recursion
          | OptionalChainingCombinations<
              Rest,
              `${Accumulated}[${Index}]`,
              false
            >
          | OptionalChainingCombinations<
              Rest,
              `${Accumulated}?.[${Index}]`,
              false
            >
    : Rest extends []
      ? // Last segment - check if it's a function (has parentheses in First)
        First extends `${infer Name}()`
        ? // It's a function call (has parentheses)
            | `${Accumulated}${IsFirstSegment extends true ? '' : '.'}${Name}()`
            | `${Accumulated}${IsFirstSegment extends true ? '' : '.'}${Name}?.()`
            | `${Accumulated}${IsFirstSegment extends true ? '' : '?.'}${Name}()`
            | `${Accumulated}${IsFirstSegment extends true ? '' : '?.'}${Name}?.()`
        : // It's a property access (no parentheses) - also generate with () for backward compatibility
            | `${Accumulated}${IsFirstSegment extends true ? '' : '.'}${First}`
            | `${Accumulated}${IsFirstSegment extends true ? '' : '?.'}${First}`
            | `${Accumulated}${IsFirstSegment extends true ? '' : '.'}${First}()`
            | `${Accumulated}${IsFirstSegment extends true ? '' : '?.'}${First}()`
      : // Not last segment - recurse with both normal and optional chaining
          | OptionalChainingCombinations<
              Rest,
              `${Accumulated}${IsFirstSegment extends true ? '' : '.'}${First}`,
              false
            >
          | OptionalChainingCombinations<
              Rest,
              `${Accumulated}${IsFirstSegment extends true ? '' : '?.'}${First}`,
              false
            >
  : never;

/**
 * Smart path type that adds appropriate suffix based on the value type
 * - Functions get ()
 * - Arrays get [number] option
 * - Objects get plain property access
 */
export type SmartPath<T, BasePath extends string = ''> = {
  [K in Extract<keyof T, string>]: IsFunction<T[K]> extends true
    ? // Function - add () suffix
      BasePath extends ''
      ? `${K}()`
      : `${BasePath}.${K}()`
    : IsArray<T[K]> extends true
      ? // Array - add [number] option and continue recursion
          | (BasePath extends ''
              ? `${K}[${number}]`
              : `${BasePath}.${K}[${number}]`)
          | SmartPath<
              T[K] extends (infer U)[] ? U : never,
              BasePath extends ''
                ? `${K}[${number}]`
                : `${BasePath}.${K}[${number}]`
            >
      : IsPrimitive<T[K]> extends true
        ? // Primitive - terminal node
          BasePath extends ''
          ? K
          : `${BasePath}.${K}`
        : // Object - continue recursion
            | (BasePath extends '' ? K : `${BasePath}.${K}`)
            | SmartPath<T[K], BasePath extends '' ? K : `${BasePath}.${K}`>;
}[Extract<keyof T, string>];
