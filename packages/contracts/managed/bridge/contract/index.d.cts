import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<T> = {
}

export type ImpureCircuits<T> = {
  initiateBridge(context: __compactRuntime.CircuitContext<T>,
                 secretHashed_0: Uint8Array,
                 amount_0: bigint,
                 coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): __compactRuntime.CircuitResults<T, []>;
  completeBridge(context: __compactRuntime.CircuitContext<T>,
                 secret_0: Uint8Array): __compactRuntime.CircuitResults<T, []>;
}

export type PureCircuits = {
}

export type Circuits<T> = {
  initiateBridge(context: __compactRuntime.CircuitContext<T>,
                 secretHashed_0: Uint8Array,
                 amount_0: bigint,
                 coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): __compactRuntime.CircuitResults<T, []>;
  completeBridge(context: __compactRuntime.CircuitContext<T>,
                 secret_0: Uint8Array): __compactRuntime.CircuitResults<T, []>;
}

export type Ledger = {
  bridgingIntentsState: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): number;
    [Symbol.iterator](): Iterator<[Uint8Array, number]>
  };
  bridgingIntentsAmount: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  readonly bridgeCoin: { nonce: Uint8Array,
                         color: Uint8Array,
                         value: bigint,
                         mt_index: bigint
                       };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<T, W extends Witnesses<T> = Witnesses<T>> {
  witnesses: W;
  circuits: Circuits<T>;
  impureCircuits: ImpureCircuits<T>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<T>): __compactRuntime.ConstructorResult<T>;
}

export declare function ledger(state: __compactRuntime.StateValue): Ledger;
export declare const pureCircuits: PureCircuits;
