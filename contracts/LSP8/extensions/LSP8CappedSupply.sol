// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

// interfaces
import "./ILSP8CappedSupply.sol";

// modules
import "../LSP8.sol";

/**
 * @dev LSP8 extension, adds token supply cap.
 */
abstract contract LSP8CappedSupply is ILSP8CappedSupply, LSP8 {
    //
    // --- Storage: Fixed
    //

    uint256 private _tokenSupplyCap;

    //
    // --- Initialize
    //

    constructor(uint256 tokenSupplyCap_) {
      require(tokenSupplyCap_ > 0, "LSP8CappedSupply: tokenSupplyCap is zero");
      _tokenSupplyCap = tokenSupplyCap_;
    }

    //
    // --- Token queries
    //

    /**
     * @dev Returns the number of tokens that have been minted.
     */
    function tokenSupplyCap() public view virtual override returns (uint256) {
        return _tokenSupplyCap;
    }

    /**
     * @dev Returns the number of tokens available to be minted.
     */
    function mintableSupply() public view virtual override returns (uint256) {
        return tokenSupplyCap() - totalSupply();
    }

    //
    // --- Transfer functionality
    //

    /**
     * @dev Mints `tokenId` and transfers it to `to`.
     *
     * Requirements:
     *
     * - `mintableSupply()` must be greater than zero.
     * - `tokenId` must not exist.
     * - `to` cannot be the zero address.
     *
     * Emits a {Transfer} event.
     */
    function _mint(
        address to,
        bytes32 tokenId,
        bool force,
        bytes memory data
    ) internal virtual override {
        require(mintableSupply() > 0, "LSP8CappedSupply: mintableSupply is zero");
        super._mint(to, tokenId, force, data);
    }
}
