// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../../submodules/ERC725/implementations/contracts/ERC725/IERC725Y.sol";

/**
 * @dev LSP4 extension, for compatibility with clients & tools that expect ERC20/721.
 */
interface ILSP4Compatibility is IERC725Y {
    /**
     * @dev Returns the name of the token.
     */
    function name() external view returns (string memory);

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the name.
     */
    function symbol() external view returns (string memory);
}
