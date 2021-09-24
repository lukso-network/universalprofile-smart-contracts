// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.0;

// constants
import "../LSP4/LSP4Constants.sol";

// libraries
import "../Utils/ERC725Utils.sol";

// interfaces
import "../_LSPs/ILSP1_UniversalReceiver.sol";
import "./ILSP8.sol";

// modules
// TODO: only here to satisfy LSP4DigitalCertificate `_tokenHolders`, possibly drops for mainnet
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "../../submodules/ERC725/implementations/contracts/ERC725/ERC725Y.sol";

// library
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

/**
 * @dev Implementation of a LSP8 compliant contract.
 */
abstract contract LSP8Core is Context, ILSP8 {
    // TODO: only here to satisfy LSP4DigitalCertificate `_tokenHolders`, possibly drops for mainnet
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using Address for address;

    //
    // --- Storage: Fixed
    //

    // TODO: we should change this to something unique like `keccak256("ERC721TokensRecipient")`.
    //
    // We are including this so we can use the existing `UniversalReceiverAddressStore` which only
    // works with `ERC777UniversalReceiver`.. so we spoof it
    //
    // keccak256("ERC777TokensRecipient")
    bytes32 internal constant _TOKENS_RECIPIENT_INTERFACE_HASH =
        0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b;

    // TODO: we should change this to something unique like `keccak256("ERC721TokensSender")`.
    //
    // We are including this as a placeholder until `UniversalReceiverAddressStore` can handle more
    // than one hardcoded `typeId`.
    //
    // keccak256("ERC777TokensRecipient")
    bytes32 internal constant _TOKENS_SENDER_INTERFACE_HASH =
        0x29ddb589b1fb5fc7cf394961c1adf5f8c6454761adf795e67fe149f658abe895; // keccak256("ERC777TokensSender")

    bytes4 private constant _INTERFACE_ID_LSP1 = 0x6bb56a14;

    uint256 private _mintedTokens;

    //
    // --- Storage: Dynamic
    //

    // TODO: only here to satisfy LSP4DigitalCertificate `_tokenHolders`, possibly drops for mainnet
    EnumerableSet.AddressSet private _tokenHolders;

    // Mapping from `tokenId` to `tokenOwner`
    mapping(bytes32 => address) private _tokenOwners;

    // Mapping `tokenOwner` to owned tokenIds
    mapping(address => EnumerableSet.Bytes32Set) private _ownedTokens;

    // Mapping a `tokenId` to its authorized operator addresses.
    mapping(bytes32 => EnumerableSet.AddressSet) internal _operators;

    // Mapping a `tokenId` to its index in the _tokenIdOperatorsList;
    mapping(bytes32 => uint256) private _tokenIdOperatorIndex;

    // A list of AddressSet, one per existing tokenId;
    EnumerableSet.AddressSet[] private _tokenIdOperatorsList;

    //
    // --- Token queries
    //

    /**
     * @dev Returns the number of tokens minted by the contract.
     */
    function totalSupply()
        public
        view
        override
        returns (uint256)
    {
        return _mintedTokens;
    }

    /**
     * @dev Returns a bytes32 array of all token holder addresses
     */
    function allTokenHolders()
        public
        view
        returns (bytes32[] memory)
    {
        // TODO: only here to satisfy LSP4DigitalCertificate `_tokenHolders`, possibly drops for mainnet
        // as its marked in implementation with "TODO remove in main chain makes transfers to expensive"
        return _tokenHolders._inner._values;
    }

    //
    // --- Token owner queries
    //

    /**
     * @dev Returns the number of tokens in ``tokenOwner``'s account.
     *
     * * Requirements:
     *
     * - `tokenOwner` cannot be the zero address.
     */
    function balanceOf(address tokenOwner)
        public
        view
        override
        returns (uint256)
    {
        require(
            tokenOwner != address(0),
            "LSP8: balance query for the zero address"
        );

        return _ownedTokens[tokenOwner].length();
    }

    /**
     * @dev Returns the `tokenOwner` of the `tokenId`.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     */
    function tokenOwnerOf(bytes32 tokenId)
        public
        view
        override
        returns (address)
    {
        address tokenOwner = _tokenOwners[tokenId];
        require(
            tokenOwner != address(0),
            "LSP8: tokenOwner query for nonexistent token"
        );

        return tokenOwner;
    }

    function tokenIdsOf(address tokenOwner)
        public
        view
        override
        returns(bytes32[] memory)
    {
        require(
            tokenOwner != address(0),
            "LSP8: tokenIdsOf query for the zero address"
        );

        return _ownedTokens[tokenOwner].values();
    }

    function _buildMetadataKey(bytes32 tokenId)
        internal
        pure
        returns (bytes32)
    {
        return bytes32(abi.encodePacked(
            bytes8(keccak256("LSP8MetaData")),
            bytes4(0),
            bytes20(keccak256(abi.encodePacked(tokenId)))
        ));
    }

    //
    // --- Operator functionality
    //

    /**
     * @dev Makes `operator` address an operator of `tokenId`.
     *
     * See {isOperatorFor}.
     *
     * Emits an {AuthorizedOperator} event.
     *
     * Requirements
     *
     * - `tokenId` must exist.
     * - caller must be current `tokenOwner` of `tokenId`.
     * - `operator` cannot be calling address.
     */
    function authorizeOperator(address operator, bytes32 tokenId)
        public
        virtual
        override
    {
        address tokenOwner = tokenOwnerOf(tokenId);
        require(tokenOwner == _msgSender(), "LSP8: authorize caller not token owner");

        require(tokenOwner != operator, "LSP8: authorizing self as operator");

        _operators[tokenId].add(operator);

        emit AuthorizedOperator(operator, tokenOwner, tokenId);
    }

    /**
     * @dev Revoke `operator` address operator status for the `tokenId`.
     *
     * See {isOperatorFor}.
     *
     * Emits a {RevokedOperator} event.
     *
     * Requirements
     *
     * - `tokenId` must exist.
     * - caller must be current `tokenOwner` of `tokenId`.
     * - `operator` cannot be calling address.
     */
    function revokeOperator(address operator, bytes32 tokenId)
        public
        virtual
        override
    {
        address tokenOwner = tokenOwnerOf(tokenId);
        require(tokenOwner == _msgSender(), "LSP8: revoke caller not token owner");

        require(operator != tokenOwner, "LSP8: revoking self as operator");

        _revokeOperator(operator, tokenOwner, tokenId);
    }

    function _revokeOperator(address operator, address tokenOwner, bytes32 tokenId)
        internal
        virtual
    {
        _operators[tokenId].remove(operator);

        emit RevokedOperator(operator, tokenOwner, tokenId);
    }

    function _clearOperators(address tokenOwner, bytes32 tokenId)
        internal
        virtual
    {
        // TODO: here is a good exmaple of why having multiple operators will be expensive.. we
        // need to clear them on token transfer
        //
        // NOTE: this may cause a tx to fail if there is too many operators to clear, in which case
        // the tokenOwner needs to call `revokeOperator` until there is less operators to clear and
        // the desired `transfer` or `burn` call can succeed.
        EnumerableSet.AddressSet storage operatorsForTokenId = _operators[tokenId];

        uint256 operatorListLength = operatorsForTokenId.length();
        for(uint256 i=0; i < operatorListLength; i++) {
            // we are emptying the list, always remove from index 0
            address operator = operatorsForTokenId.at(0);
            _revokeOperator(operator, tokenOwner, tokenId);
        }
    }

    /**
     * @dev Returns whether `operator` address is an operator of `tokenId`.
     * Operators can send and burn tokens on behalf of their owners. The tokenOwner is their own
     * operator.
     */
    function isOperatorFor(address operator, bytes32 tokenId)
        public
        view
        virtual
        override
        returns (bool)
    {
        require(
            _exists(tokenId),
            "LSP8: operator query for nonexistent token"
        );

        return _isOperatorOrOwner(operator, tokenId);
    }

    /**
     * @dev Returns all `operator` addresses of `tokenId`.
     */
    function getOperatorsOf(bytes32 tokenId)
        public
        view
        virtual
        override
        returns (address[] memory)
    {
        require(
            _exists(tokenId),
            "LSP8: operator query for nonexistent token"
        );

        return _operators[tokenId].values();
    }

    function _isOperatorOrOwner(address caller, bytes32 tokenId)
        internal
        view
        virtual
        returns(bool)
    {
        address tokenOwner = tokenOwnerOf(tokenId);

        return (caller == tokenOwner || _operators[tokenId].contains(caller));
    }

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
     * - If the caller is not `from`, it must be an `operator` address for this `tokenId`.
     *
     * Emits a {Transfer} event.
     */
    function transfer(
        address from,
        address to,
        bytes32 tokenId,
        bool force,
        bytes memory data
    )
        public
        virtual
        override
    {
        require(
            _isOperatorOrOwner(_msgSender(), tokenId),
            "LSP8: transfer caller is not owner or operator of tokenId"
        );
        _transfer(from, to, tokenId, force, data);
    }

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
    )
        external
        virtual
        override
    {
        require (
            from.length == to.length && from.length == tokenId.length && from.length == data.length,
            'LSP8: transferBatch list length mismatch'
        );

        for(uint256 i=0; i < from.length; i++) {
            transfer(from[i], to[i], tokenId[i], force, data[i]);
        }
    }

    /**
     * @dev Returns whether `tokenId` exists.
     *
     * Tokens start existing when they are minted (`_mint`), and stop existing when they are burned
     * (`_burn`).
     */
    function _exists(bytes32 tokenId) internal view virtual returns (bool) {
        return _tokenOwners[tokenId] != address(0);
    }

    /**
     * @dev Mints `tokenId` and transfers it to `to`.
     *
     * Requirements:
     *
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
    )
        internal
        virtual
    {
        require(to != address(0), "LSP8: mint to the zero address");
        require(!_exists(tokenId), "LSP8: tokenId already minted");

        address operator = _msgSender();

        _beforeTokenTransfer(address(0), to, tokenId);

        _ownedTokens[to].add(tokenId);
        _tokenOwners[tokenId] = to;

        _notifyTokenReceiver(address(0), to, tokenId, force, data);

        // TODO: only here to satisfy LSP4DigitalCertificate `_tokenHolders`, possibly drops for mainnet
        _tokenHolders.add(to);

        emit Transfer(operator, address(0), to, tokenId, data);
    }

    /**
     * @dev Destroys `tokenId`.
     * The approval is cleared when the token is burned.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     *
     * Emits a {Transfer} event.
     */
    function _burn(bytes32 tokenId, bytes memory data)
        internal
        virtual
    {
        address tokenOwner = tokenOwnerOf(tokenId);
        address operator = _msgSender();

        _notifyTokenOwner(tokenOwner, address(0), tokenId, data);

        _beforeTokenTransfer(tokenOwner, address(0), tokenId);

        // Clear operators
        _clearOperators(tokenOwner, tokenId);

        _ownedTokens[tokenOwner].remove(tokenId);
        delete _tokenOwners[tokenId];

        // TODO: only here to satisfy LSP4DigitalCertificate `_tokenHolders`, possibly drops for mainnet
        if (balanceOf(tokenOwner) == 0) {
            _tokenHolders.remove(tokenOwner);
        }

        emit Transfer(operator, tokenOwner, address(0), tokenId, data);
    }

    /**
     * @dev Transfers `tokenId` from `from` to `to`.
     *
     * Requirements:
     *
     * - `to` cannot be the zero address.
     * - `tokenId` token must be owned by `from`.
     *
     * Emits a {Transfer} event.
     */
    function _transfer(
        address from,
        address to,
        bytes32 tokenId,
        bool force,
        bytes memory data
    )
        internal
        virtual
    {
        require(
            tokenOwnerOf(tokenId) == from,
            "LSP8: transfer of tokenId from incorrect owner"
        );
        require(to != address(0), "LSP8: transfer to the zero address");

        address operator = _msgSender();

        _notifyTokenOwner(from, to, tokenId, data);

        _beforeTokenTransfer(from, to, tokenId);

        // Clear operators from the previous owner
        _clearOperators(from, tokenId);

        _ownedTokens[from].remove(tokenId);
        _ownedTokens[to].add(tokenId);
        _tokenOwners[tokenId] = to;

        _notifyTokenReceiver(from, to, tokenId, force, data);

        // TODO: only here to satisfy LSP4DigitalCertificate `_tokenHolders`, possibly drops for mainnet
        _tokenHolders.add(to);
        if (balanceOf(from) == 0) {
            _tokenHolders.remove(from);
        }

        emit Transfer(operator, from, to, tokenId, data);
    }

    /**
     * @dev Hook that is called before any token transfer. This includes minting
     * and burning.
     *
     * Calling conditions:
     *
     * - When `from` and `to` are both non-zero, ``from``'s `tokenId` will be
     * transferred to `to`.
     * - When `from` is zero, `tokenId` will be minted for `to`.
     * - When `to` is zero, ``from``'s `tokenId` will be burned.
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        bytes32 tokenId
    )
        internal
        virtual
    {
        // silence compiler warning about unused variable
        tokenId;

        // token being minted
        if (from == address(0)) {
            _mintedTokens += 1;
        }

        // token being burned
        if (to == address(0)) {
            _mintedTokens -= 1;
        }
    }

    /**
     * @dev We are using this hook from ERC777 to provide some parity for checks. The usual ERC721
     * hook `_beforeTokenTransfer` doesn't seem correct for this use case as it is not called when
     * receiver is address(0) in ERC777.
     *
     */
    function _notifyTokenOwner(
        address from,
        address to,
        bytes32 tokenId,
        bytes memory data
    )
        private
    {
        if (
            ERC165Checker.supportsERC165(from) &&
            ERC165Checker.supportsInterface(from, _INTERFACE_ID_LSP1)
        ) {
            bytes memory packedData = abi.encodePacked(from, to, tokenId, data);
            ILSP1(from).universalReceiver(
                _TOKENS_SENDER_INTERFACE_HASH,
                packedData
            );
        }
    }

    /**
     * @dev We are using this hook from ERC777 to provide some parity for hooks. The usual ERC721
     * hook `_beforeTokenTransfer` doesn't seem correct for this use case, as this hook is run
     * after the transfer of tokens has occured & is not called when receiver is address(0) in
     * ERC777.
     */
    function _notifyTokenReceiver(
        address from,
        address to,
        bytes32 tokenId,
        bool force,
        bytes memory data
    )
        private
    {
        if (
            ERC165Checker.supportsERC165(to) &&
            ERC165Checker.supportsInterface(to, _INTERFACE_ID_LSP1)
        ) {
            bytes memory packedData = abi.encodePacked(from, to, tokenId, data);
            ILSP1(to).universalReceiver(
                _TOKENS_RECIPIENT_INTERFACE_HASH,
                packedData
            );
        } else if (!force) {
            if (!to.isContract()) {
                revert('LSP8: token receiver is EOA');
            } else {
                revert('LSP8: token receiver contract missing LSP1 interface');
            }
        }
    }
}
