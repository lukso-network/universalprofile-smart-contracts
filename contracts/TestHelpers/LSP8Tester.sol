// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '../LSP8/LSP8.sol';

contract LSP8Tester is LSP8 {
    constructor(
      string memory name,
      string memory symbol,
      address newOwner
    ) LSP8(name, symbol, newOwner) {}

    function mint(address to, bytes32 tokenId, bool force, bytes memory data) public {
        _mint(to, bytes32(tokenId), force, data);
    }

    function burn(bytes32 tokenId, bytes memory data) public {
        _burn(bytes32(tokenId), data);
    }

    function buildMetadataKey(bytes32 tokenId, bool buildAddressKey) public pure returns (bytes32) {
        return _buildMetadataKey(tokenId, buildAddressKey);
    }
}
