# Cross chain settlement private banking

## Problem

Despite major advances in blockchain privacy, privacy in crypto is still fundamentally broken. There are more than 700 privacy-related projects today, yet nearly all of them operate in isolation, creating a fragmented, inconsistent experience for users and developers.

Privacy does not travel across chains, liquidity is siloed, and the moment a user moves assets between ecosystems, their privacy breaks. Midnight provides a powerful foundation for compliant and programmable privacy, but on its own it cannot solve the broader problem of cross-chain interoperability.

What the ecosystem lacks is a seamless, chain-agnostic way for users to transact privately without abandoning their preferred environments.

## Solution

We connects Midnight to the rest of the crypto world and makes privacy truly cross-chain. Instead of forcing users to switch ecosystems, Qash allows them to send and receive payments directly from their preferred chain or protocol, whether that's Starknet, EVM, Solana, or even a privacy pool on Ethereum while still benefiting from Midnight’s compliant and programmable privacy environment.

Payments settle privately on Midnight, where compliance rules, attestations, and programmable logic can run in Midnight environment. Once settlement is complete, the funds can be released to any destination chain chosen by the recipient. Users never have to leave the chains they love, and developers can rely on a consistent privacy layer across all ecosystems.

## What We Are Building

We build a cross-chain private banking platform that supports private payments across chains, using Midnight as settlement layer for compliant privacy and programmable privacy. Currently we supported creating payment link, and allow user to pay in tDust in Midnight, or pay in Strk and under the hood we bridge it to tDust and settle payment compliantly on Midnight.

Future we can enable people making payment from any chain, or even privacy protocols such as railgun, where people can pay from railgun, and move fund from railgun to Midnight for programmability and later send to other chain from Midnight.

## Quick Run

1. Install dependencies by running `yarn`
2. Open new terminal, run `yarn start`
3. Open another terminal, run `yarn wallet-server`



Demo: https://www.canva.com/design/DAG5DuyX8gk/2556rErKXaOhBU7zjVZw1g/watch?utm_content=DAG5DuyX8gk&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h3ed3a468bf
