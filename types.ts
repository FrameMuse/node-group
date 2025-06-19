export type ValueOf<T> = T[keyof T];
export type Simplify<T> = {[KeyType in keyof T]: T[KeyType]} & {};
export type Split<
	S extends string,
	Delimiter extends string,
> = S extends `${infer Head}${Delimiter}${infer Tail}`
	? [Head, ...Split<Tail, Delimiter>]
	: S extends Delimiter
		? []
		: [S];


type TrimLeftSlash<S extends string> = S extends `/${infer T}` ? TrimLeftSlash<T> : S
type TrimRightSlash<S extends string> = S extends `${infer T}/` ? TrimRightSlash<T> : S
/**
 * Removes `/` from start and end of a endpoint.
 */
export type TrimSlash<T extends string> = TrimLeftSlash<TrimRightSlash<T>>
