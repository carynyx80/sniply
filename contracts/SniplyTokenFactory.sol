// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Sniply token factory — minimal, auditable launch contract.
 *
 * STATUS: UNAUDITED. NOT DEPLOYED. Testnet only until a security review is complete.
 *
 * Design:
 *  - Mints a fixed-supply, plain BEP-20 (no mint/burn/blacklist/tax/owner functions)
 *    entirely to the creator (msg.sender). No hidden allocations.
 *  - Optional flat creation fee in native BNB sent to an immutable fee recipient; fee is
 *    public (`creationFee`) and displayed in the UI before signing.
 *  - Emits TokenCreated(token, creator, name, symbol, clipRef) which the Sniply backend
 *    verifies against the reviewed draft before recording a launch.
 *  - Liquidity provisioning is a separate, explicit creator action (e.g. PancakeSwap V2 addLiquidity).
 */
contract SniplyToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public immutable totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory name_, string memory symbol_, uint256 supply, address to) {
        name = name_;
        symbol = symbol_;
        totalSupply = supply;
        balanceOf[to] = supply;
        emit Transfer(address(0), to, supply);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 a = allowance[from][msg.sender];
        if (a != type(uint256).max) {
            require(a >= value, "allowance");
            allowance[from][msg.sender] = a - value;
        }
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(to != address(0), "zero");
        uint256 b = balanceOf[from];
        require(b >= value, "balance");
        unchecked {
            balanceOf[from] = b - value;
        }
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }
}

contract SniplyTokenFactory {
    uint256 public constant SUPPLY = 1_000_000_000 ether;
    uint256 public immutable creationFee;
    address public immutable feeRecipient;
    mapping(bytes32 => address) public tokenForClip; // one token per clip

    event TokenCreated(address indexed token, address indexed creator, string name, string symbol, bytes32 clipRef);

    constructor(uint256 fee, address recipient) {
        require(recipient != address(0) || fee == 0, "recipient");
        creationFee = fee;
        feeRecipient = recipient;
    }

    function createToken(string calldata name, string calldata symbol, bytes32 clipRef) external payable returns (address token) {
        require(msg.value == creationFee, "fee");
        require(bytes(name).length >= 2 && bytes(name).length <= 32, "name");
        require(bytes(symbol).length >= 2 && bytes(symbol).length <= 10, "symbol");
        require(tokenForClip[clipRef] == address(0), "clip already tokenized");
        token = address(new SniplyToken(name, symbol, SUPPLY, msg.sender));
        tokenForClip[clipRef] = token;
        emit TokenCreated(token, msg.sender, name, symbol, clipRef);
        if (msg.value > 0) {
            (bool ok, ) = feeRecipient.call{value: msg.value}("");
            require(ok, "fee transfer");
        }
    }
}
