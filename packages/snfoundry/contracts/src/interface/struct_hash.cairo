use starknet::ContractAddress;

#[derive(Drop, Copy, Hash, Serde, Debug)]
pub struct Initiate {
    pub redeemer: ContractAddress,
    pub amount: u256,
    pub timelock: u128,
    pub secretHash: [u32; 8],
}

#[derive(Drop, Copy, Hash, Serde, Debug)]
pub struct instantRefund {
    pub orderID: felt252,
}