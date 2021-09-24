// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '../LSP4/LSP4Compatibility.sol';

contract LSP4CompatibilityTester is LSP4Compatibility {
    constructor(
      string memory name,
      string memory symbol
    ) ERC725Y(msg.sender) {
        // TODO: when ERC725Y has been updated
        // bytes32[] keys = new bytes32[](2);
        // keys.push(LSP4_METADATA_TOKEN_NAME_KEY);
        // keys.push(LSP4_METADATA_TOKEN_SYMBOL_KEY);
        //
        // bytes[] values = new bytes[](2);
        // values.push(bytes(name));
        // values.push(bytes(symbol));
        //
        // setDataFromMemory(keys, values);
        setDataFromMemory(_LSP4_METADATA_TOKEN_NAME_KEY, bytes(name));
        setDataFromMemory(_LSP4_METADATA_TOKEN_SYMBOL_KEY, bytes(symbol));
    }
}
