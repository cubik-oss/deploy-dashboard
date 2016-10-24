// Boring stuff in here

import React = require("react");

export function h<P extends React.DOMAttributes<T>, T extends Element>(
    type: React.ComponentClass<P> | string,
    props: P & React.ClassAttributes<T>,
    children: (React.ReactNode|string)[]): React.DOMElement<P, T> | React.ReactElement<P> {
    if (typeof type === 'string') {
        return React.createElement(type, props, ...children)
    } else {
        return React.createElement(type, props, ...children)
    }
}

export class Failure {
    readonly success: false = false
    constructor(public readonly reason: string) {}
}
export class Success<Value> {
    readonly success: true = true
    constructor(public readonly value: Value) {}
}
export type Result<Value> = Success<Value> | Failure

export const mapResult = <T, A>(result: Result<T>, mapper: (t: T) => A): Result<A> => (
    result.success ? new Success(mapper(result.value)) : result
)

export const mapHeadEntry = <K,V>(map: Map<K,V>): [ K, V ] => Array.from(map.entries())[0]
export const patch = <O, P>(o: O, p: P): O & P => Object.assign({}, o, p);
