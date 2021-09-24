// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

// interfaces
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "../../submodules/ERC725/implementations/contracts/ERC725/IERC725Y.sol";

/**
 * @dev Required interface of a LSP8 compliant contract.
 */
interface ILSP8 is IERC165, IERC725Y {
    //
    // --- Events
    //

    /**
     * @dev Emitted when `tokenId` token is transferred from `from` to `to`.
     */
    event Transfer(
        address operator,
        address indexed from,
        address indexed to,
        bytes32 indexed tokenId,
        bytes data
    );

    /**
     * @dev Emitted when `tokenOwner` enables `operator` for `tokenId`.
     */
    event AuthorizedOperator(
        address indexed operator,
        address indexed tokenOwner,
        bytes32 indexed tokenId
    );

    /**
     * @dev Emitted when `tokenOwner` disables `operator` for `tokenId`.
     */
    event RevokedOperator(
        address indexed operator,
        address indexed tokenOwner,
        bytes32 indexed tokenId
    );

    //
    // --- Token queries
    //

    /**
     * @dev Returns the number of tokens minted by the contract.
     */
    function totalSupply() external view returns (uint256);

    //
    // --- Token owner queries
    //

    /**
     * @dev Returns the number of tokens owned by `tokenOwner`.
     *
     * * Requirements:
     *
     * - `tokenOwner` cannot be the zero address.
     */
    function balanceOf(address tokenOwner) external view returns (uint256);

    /**
     * @dev Returns the `tokenOwner` address of the `tokenId` token.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     */
    function tokenOwnerOf(bytes32 tokenId) external view returns (address);

    /**
     * @dev Returns the list of `tokenIds` for the `tokenOwner` address.
     */
    function tokenIdsOf(address tokenOwner) external view returns (bytes32[] memory);

    //
    // --- Operator functionality
    //

    /**
     * @dev Makes `operator` address an operator of `tokenId`.
     *
     * See {isOperatorFor}.
     *
     * Requirements
     *
     * - `tokenId` must exist.
     * - caller must be current `tokenOwner` of `tokenId`.
     * - `operator` cannot be calling address.
     *
     * Emits an {AuthorizedOperator} event.
     */
    function authorizeOperator(address operator, bytes32 tokenId) external;

    /**
     * @dev Removes `operator` address as an operator of `tokenId`.
     *
     * See {isOperatorFor}.
     *
     * Requirements
     *
     * - `tokenId` must exist.
     * - caller must be current `tokenOwner` of `tokenId`.
     * - `operator` cannot be calling address.
     *
     * Emits a {RevokedOperator} event.
     */
    function revokeOperator(address to, bytes32 tokenId) external;

    /**
     * @dev Returns whether `operator` address is an operator of `tokenId`.
     * Operators can send and burn tokens on behalf of their owners. The tokenOwner is their own
     * operator.
     *
     * Requirements
     *
     * - `tokenId` must exist.
     */
    function isOperatorFor(address operator, bytes32 tokenId) external view returns (bool);

    /**
     * @dev Returns whether `operator` address is an operator of `tokenId`.
     * Operators can send and burn tokens on behalf of their owners. The tokenOwner is their own
     * operator.
     *
     * Requirements
     *
     * - `tokenId` must exist.
     */
    function getOperatorsOf(bytes32 tokenId) external view returns (address[] memory);

    //
    // --- Transfer functionality
    //

    /**
     * @dev Transfers `tokenId` token from `from` to `to`.
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `tokenId` token must be owned by `from`.
     * - If the caller is not `from`, it must be an operator of `tokenId`.
     *
     * Emits a {Transfer} event.
     */
    function transfer(
        address from,
        address to,
        bytes32 tokenId,
        bool force,
        bytes calldata data
    ) external;

    /**
     * @dev Transfers many tokens based on the list `from`, `to`, `tokenId`.
     *
     * Requirements:
     *
     * - `from`, `to`, `tokenId` lists are the same length.
     * - no values in `from` can be the zero address.
     * - no values in `to` can be the zero address.
     * - each `tokenId` token must be owned by `from`.
     * - If the caller is not `from`, it must be an operator of `tokenId`.
     *
     * Emits {Transfer} events.
     */
    function transferBatch(
        address[] calldata from,
        address[] calldata to,
        bytes32[] calldata tokenId,
        bool force,
        bytes[] calldata data
    ) external;

}
