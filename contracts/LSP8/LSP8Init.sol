// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.0;

// modules
import "./LSP8Core.sol";
import "../../submodules/ERC725/implementations/contracts/ERC725/ERC725YInit.sol";

/**
 * @dev Implementation of a LSP8 compliant contract.
 */
contract LSP8Init is Initializable, ERC725YInit, LSP8Core {
    //
    // --- Initialize
    //

    function initialize(
        string memory name_,
        string memory symbol_,
        address newOwner_
    )  public virtual initializer {
        ERC725YInit.initialize(newOwner_);

        // TODO: when ERC725Y has been updated
        // bytes32[] keys = new bytes32[](2);
        // bytes[] values = new bytes[](2);
        //
        // keys.push(LSP4_METADATA_TOKEN_NAME_KEY);
        // values.push(bytes(name_));
        //
        // keys.push(LSP4_METADATA_TOKEN_SYMBOL_KEY);
        // values.push(bytes(symbol_));
        //
        // setDataFromMemory(keys, values);
        setDataFromMemory(_LSP4_METADATA_TOKEN_NAME_KEY, bytes(name_));
        setDataFromMemory(_LSP4_METADATA_TOKEN_SYMBOL_KEY, bytes(symbol_));
    }

    //
    // --- Metadata functionality
    //

    /**
     * @dev Create a ERC725Y contract to be used for metadata storage of `tokenId`.
     */
    function _createMetadataFor(bytes32 tokenId)
        internal
        virtual
        returns (address)
    {
        require(
            _exists(tokenId),
            "LSP8: metadata creation for nonexistent token"
        );

        bytes32 metadataKeyForTokenId = _buildMetadataKey(tokenId);

        bytes memory existingMetadataValue = ERC725Utils.getDataSingle(this, metadataKeyForTokenId);
        address existingMetadataAddress = abi.decode(existingMetadataValue, (address));
        if (existingMetadataAddress != address(0)) {
            return existingMetadataAddress;
        }

        // TODO: can use a proxy pattern here
        address metadataAddress = address(new ERC725Y(_msgSender()));

        bytes memory metadataAddressBytes = abi.encodePacked(metadataAddress);
        setDataFromMemory(metadataKeyForTokenId, metadataAddressBytes);

        return metadataAddress;
    }

    //
    // --- Overrides
    //

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC165Storage, IERC165)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _msgData()
        internal
        view
        virtual
        override(Context, ContextUpgradeable)
        returns (bytes calldata)
    {
        return super._msgData();
    }

    function _msgSender()
        internal
        view
        virtual
        override(Context, ContextUpgradeable)
        returns (address)
    {
        return super._msgSender();
    }
}
