// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

// interfaces
import "./ILSP8CompatibilityForERC721.sol";

// modules
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "../LSP8.sol";

/**
 * @dev LSP8 extension, for compatibility for clients / tools that expect ERC20/721.
 */
abstract contract LSP8CompatibilityForERC721 is ILSP8CompatibilityForERC721, LSP8 {
  using EnumerableSet for EnumerableSet.AddressSet;

  /*
   * @dev Compatible with ERC721 ownerOf.
   */
  function ownerOf(uint256 tokenId) external view virtual override returns (address) {
    return tokenOwnerOf(bytes32(tokenId));
  }

  /*
   * @dev Compatible with ERC721 approve.
   */
  function approve(address operator, uint256 tokenId) external virtual override {
      authorizeOperator(operator, bytes32(tokenId));
  }

  /*
   * @dev Compatible with ERC721 getApproved.
   */
  function getApproved(uint256 tokenId) external view virtual override returns (address) {
      require(
          _exists(bytes32(tokenId)),
          "LSP8: operator query for nonexistent token"
      );

      EnumerableSet.AddressSet storage operatorsForTokenId = _operators[bytes32(tokenId)];
      uint256 operatorListLength = operatorsForTokenId.length();

      if (operatorListLength == 0) {
        return address(0);
      } else {
        // Read the last added operator authorized to provide "best" compatibility.
        // In ERC721 there is one operator address at a time for a tokenId, so multiple calls to
        // `approve` would cause `getApproved` to return the last added operator. In this
        // compatibility version the same is true, when the authorized operators were not previously
        // authorized. If addresses are removed, then `getApproved` returned address can change due
        // to implementation of `EnumberableSet._remove`.
        return operatorsForTokenId.at(operatorListLength - 1);
      }
  }

  /*
   * @dev Compatible with ERC721 tranferFrom.
   * Using force=true, meaning EOA and any contract may receive the tokenId.
   */
  function transferFrom(address from, address to, uint256 tokenId) external virtual override {
      return transfer(from, to, bytes32(tokenId), true, "compat-transferFrom");
  }

  /*
   * @dev Compatible with ERC721 safeTranferFrom.
   * Using force=false, no EOA and only contracts supporting LSP1 interface may receive the tokenId.
   */
  function safeTransferFrom(address from, address to, uint256 tokenId) external virtual override {
      return transfer(from, to, bytes32(tokenId), false, "compat-safeTransferFrom");
  }
}
