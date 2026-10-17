// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title 3B Token Prototype
/// @notice Technical prototype only. No public deployment or commercial value.
/// @dev Supply is minted exactly once. No owner, external mint, burn or upgrade.
contract ThreeBTokenPrototype is ERC20 {
    /// @param initialRecipient Address receiving the entire initial supply.
    /// @param supplyBaseUnits Exact supply in base units, without multiplication.
    constructor(address initialRecipient, uint256 supplyBaseUnits)
        ERC20("3B Token Prototype", "T3B")
    {
        _mint(initialRecipient, supplyBaseUnits);
    }
}
