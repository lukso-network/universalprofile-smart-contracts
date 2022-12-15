// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.5;

// modules
import {LSP19ModularKeyManagerCore} from "./LSP19ModularKeyManagerCore.sol";
import {InvalidLSP6Target} from "../LSP6KeyManager/LSP6Errors.sol";

/**
 * @title Implementation of a contract acting as a controller of an ERC725 Account, using permissions stored in the ERC725Y storage
 * @author Fabian Vogelsteller <frozeman>, Jean Cavallera (CJ42), Yamen Merhi (YamenMerhi)
 * @dev all the permissions can be set on the ERC725 Account using `setData(...)` with the keys constants below
 */
contract LSP19ModularKeyManager is LSP19ModularKeyManagerCore {
    /**
     * @notice Initiate the account with the address of the ERC725Account contract and sets LSP6KeyManager InterfaceId
     * @param target_ The address of the ER725Account to control
     */
    constructor(address target_) {
        if (target_ == address(0)) revert InvalidLSP6Target();
        target = target_;
        _setupLSP6ReentrancyGuard();
    }
}
