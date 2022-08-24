// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

// interfaces
import {ILSP8Mintable} from "./ILSP8Mintable.sol";
// modules
import {
    LSP8IdentifiableDigitalAssetInitAbstract
} from "../LSP8IdentifiableDigitalAssetInitAbstract.sol";
import {ReentrancyGuard} from "../..//Utils/ReentrancyGuard.sol";

/**
 * @dev LSP8 extension.
 */
abstract contract LSP8MintableInitAbstract is
    LSP8IdentifiableDigitalAssetInitAbstract,
    ILSP8Mintable,
    ReentrancyGuard
{
    function _initialize(
        string memory name_,
        string memory symbol_,
        address newOwner_
    ) internal virtual override onlyInitializing {
        LSP8IdentifiableDigitalAssetInitAbstract._initialize(name_, symbol_, newOwner_);
    }

    /**
     * @inheritdoc ILSP8Mintable
     */
    function mint(
        address to,
        bytes32 tokenId,
        bool force,
        bytes memory data
    ) public virtual override onlyOwner nonReentrant {
        _mint(to, tokenId, force, data);
    }
}
