// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

// interfaces
import "../ILSP8.sol";

/**
 * @dev LSP8 extension, adds token supply cap.
 */
interface ILSP8CappedSupply is ILSP8 {
  /**
   * @dev Returns the number of tokens that have been minted.
   */
  function tokenSupplyCap() external view returns (uint256);

  /**
   * @dev Returns the number of tokens available to be minted.
   */
  function mintableSupply() external view returns (uint256);
}
