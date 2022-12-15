// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.5;

// interface
import {ILSP19Module} from "./ILSP19Module.sol";

// module
import {LSP6OwnershipModule} from "../../LSP6KeyManager/LSP6Modules/LSP6OwnershipModule.sol";

contract LSP19OwnershipModule is ILSP19Module, LSP6OwnershipModule {
    /**
     * @inheritdoc ILSP19Module
     */
    function verifyMethodLogic(
        address,
        address from,
        bytes32 permissions,
        bytes calldata payload
    ) external pure {
        _verifyOwnershipPermissions(from, permissions, payload);
    }
}
