#[starknet::contract]
mod ERC20 {
    use core::num::traits::{Bounded, Zero};
    use openzeppelin::token::erc20::interface::IERC20Mixin;
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_caller_address};

    #[storage]
    struct Storage {
        pub ERC20_name: ByteArray,
        pub ERC20_symbol: ByteArray,
        pub ERC20_total_supply: u256,
        pub ERC20_balances: Map<ContractAddress, u256>,
        pub ERC20_allowances: Map<(ContractAddress, ContractAddress), u256>,
        pub ERC20_decimals: u8,
    }

    #[event]
    #[derive(Drop, Debug, PartialEq, starknet::Event)]
    pub enum Event {
        Transfer: Transfer,
        Approval: Approval,
    }

    /// Emitted when tokens are moved from address `from` to address `to`.
    #[derive(Drop, Debug, PartialEq, starknet::Event)]
    pub struct Transfer {
        #[key]
        pub from: ContractAddress,
        #[key]
        pub to: ContractAddress,
        pub value: u256,
    }

    /// Emitted when the allowance of a `spender` for an `owner` is set by a call
    /// to `approve`. `value` is the new allowance.
    #[derive(Drop, Debug, PartialEq, starknet::Event)]
    pub struct Approval {
        #[key]
        pub owner: ContractAddress,
        #[key]
        pub spender: ContractAddress,
        pub value: u256,
    }

    pub mod Errors {
        pub const APPROVE_FROM_ZERO: felt252 = 'ERC20: approve from 0';
        pub const APPROVE_TO_ZERO: felt252 = 'ERC20: approve to 0';
        pub const TRANSFER_FROM_ZERO: felt252 = 'ERC20: transfer from 0';
        pub const TRANSFER_TO_ZERO: felt252 = 'ERC20: transfer to 0';
        pub const BURN_FROM_ZERO: felt252 = 'ERC20: burn from 0';
        pub const MINT_TO_ZERO: felt252 = 'ERC20: mint to 0';
        pub const INSUFFICIENT_BALANCE: felt252 = 'ERC20: insufficient balance';
        pub const INSUFFICIENT_ALLOWANCE: felt252 = 'ERC20: insufficient allowance';
        pub const EXPIRED_PERMIT_SIGNATURE: felt252 = 'ERC20: expired permit signature';
        pub const INVALID_PERMIT_SIGNATURE: felt252 = 'ERC20: invalid permit signature';
    }

    #[constructor]
    fn constructor(ref self: ContractState, name: ByteArray, symbol: ByteArray, decimals: u8) {
        self.ERC20_name.write(name);
        self.ERC20_symbol.write(symbol);
        self.ERC20_decimals.write(decimals);
    }

    #[abi(embed_v0)]
    impl ERC20Impl of IERC20Mixin<ContractState> {
        fn total_supply(self: @ContractState) -> u256 {
            self.ERC20_total_supply.read()
        }

        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
            self.ERC20_balances.read(account)
        }

        fn allowance(
            self: @ContractState, owner: ContractAddress, spender: ContractAddress,
        ) -> u256 {
            self.ERC20_allowances.read((owner, spender))
        }

        fn transfer(ref self: ContractState, recipient: ContractAddress, amount: u256) -> bool {
            let sender = get_caller_address();
            self._transfer(sender, recipient, amount);
            true
        }

        fn transfer_from(
            ref self: ContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: u256,
        ) -> bool {
            let caller = get_caller_address();
            self._spend_allowance(sender, caller, amount);
            self._transfer(sender, recipient, amount);
            true
        }

        fn approve(ref self: ContractState, spender: ContractAddress, amount: u256) -> bool {
            let caller = get_caller_address();
            self._approve(caller, spender, amount);
            true
        }

        fn name(self: @ContractState) -> ByteArray {
            self.ERC20_name.read()
        }

        fn symbol(self: @ContractState) -> ByteArray {
            self.ERC20_symbol.read()
        }

        fn decimals(self: @ContractState) -> u8 {
            self.ERC20_decimals.read()
        }

        fn totalSupply(self: @ContractState) -> u256 {
            self.ERC20_total_supply.read()
        }

        fn balanceOf(self: @ContractState, account: ContractAddress) -> u256 {
            self.ERC20_balances.read(account)
        }

        fn transferFrom(
            ref self: ContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: u256,
        ) -> bool {
            let caller = get_caller_address();
            self._spend_allowance(sender, caller, amount);
            self._transfer(sender, recipient, amount);
            true
        }
    }

    #[external(v0)]
    fn mint(ref self: ContractState, recipient: ContractAddress, amount: u256) {
        self._mint(recipient, amount);
    }

    #[generate_trait]
    impl InternalFunctions of InternalFunctionsTrait {
        fn _mint(ref self: ContractState, recipient: ContractAddress, amount: u256) {
            assert(!recipient.is_zero(), Errors::MINT_TO_ZERO);
            self._update(Zero::zero(), recipient, amount);
        }

        fn _burn(ref self: ContractState, account: ContractAddress, amount: u256) {
            assert(!account.is_zero(), Errors::BURN_FROM_ZERO);
            self._update(account, Zero::zero(), amount);
        }

        fn _update(
            ref self: ContractState, from: ContractAddress, to: ContractAddress, amount: u256,
        ) {
            if from.is_zero() {
                self.ERC20_total_supply.write(self.ERC20_total_supply.read() + amount);
            } else {
                let from_balance = self.ERC20_balances.read(from);
                assert(from_balance >= amount, Errors::INSUFFICIENT_BALANCE);
                self.ERC20_balances.write(from, from_balance - amount);
            }

            if to.is_zero() {
                let total_supply = self.ERC20_total_supply.read();
                self.ERC20_total_supply.write(total_supply - amount);
            } else {
                let to_balance = self.ERC20_balances.read(to);
                self.ERC20_balances.write(to, to_balance + amount);
            }

            self.emit(Transfer { from, to, value: amount });
        }

        fn _transfer(
            ref self: ContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: u256,
        ) {
            assert(!sender.is_zero(), Errors::TRANSFER_FROM_ZERO);
            assert(!recipient.is_zero(), Errors::TRANSFER_TO_ZERO);
            self._update(sender, recipient, amount);
        }

        fn _approve(
            ref self: ContractState, owner: ContractAddress, spender: ContractAddress, amount: u256,
        ) {
            assert(!owner.is_zero(), Errors::APPROVE_FROM_ZERO);
            assert(!spender.is_zero(), Errors::APPROVE_TO_ZERO);
            self.ERC20_allowances.write((owner, spender), amount);
            self.emit(Approval { owner, spender, value: amount });
        }

        fn _spend_allowance(
            ref self: ContractState, owner: ContractAddress, spender: ContractAddress, amount: u256,
        ) {
            let current_allowance = self.ERC20_allowances.read((owner, spender));
            if current_allowance != Bounded::MAX {
                assert(current_allowance >= amount, Errors::INSUFFICIENT_ALLOWANCE);
                self._approve(owner, spender, current_allowance - amount);
            }
        }
    }
}
