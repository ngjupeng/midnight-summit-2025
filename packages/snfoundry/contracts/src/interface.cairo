pub mod events;
pub mod struct_hash;
use starknet::ContractAddress;

#[derive(Drop, Serde, starknet::Store, Debug)]
pub struct Order {
    pub is_fulfilled: bool,
    pub initiator: ContractAddress,
    pub redeemer_miden: ByteArray,
    pub redeemer_starknet: ContractAddress,
    pub initiated_at: u128,
    pub timelock: u128,
    pub amount: u256,
}

#[starknet::interface]
pub trait IHTLC<TContractState> {
    fn token(self: @TContractState) -> ContractAddress;

    fn initiate(
        ref self: TContractState,
        redeemer_miden: ByteArray,
        redeemer_starknet: ContractAddress,
        timelock: u128,
        amount: u256,
        secret_hash: [u32; 8],
    );

    fn redeem(ref self: TContractState, order_id: felt252, secret: Array<u32>);

    fn get_order(ref self: TContractState, order_id: felt252) -> Order;

    fn get_order_destination_address(ref self: TContractState, order_id: felt252) -> ByteArray;

    fn refund(ref self: TContractState, order_id: felt252);
}
