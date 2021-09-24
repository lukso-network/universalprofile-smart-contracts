// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '../LSP8/extensions/LSP8CompatibilityForERC721.sol';

contract LSP8CompatibilityForERC721Tester is LSP8CompatibilityForERC721 {
    constructor(
      string memory name,
      string memory symbol
    ) LSP8(name, symbol) {}

    function mint(address to, uint256 tokenId) public {
        // NOTE: using force=true so we can send to EOA in test
        _mint(to, bytes32(tokenId), true, "compatible token printer go brrr");
    }
}
