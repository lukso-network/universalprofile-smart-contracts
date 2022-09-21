// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// interfaces
import {ILSP14Ownable2Step} from "./ILSP14Ownable2Step.sol";
import {ILSP1UniversalReceiver} from "../LSP1UniversalReceiver/ILSP1UniversalReceiver.sol";

// modules
import {OwnableUnset} from "@erc725/smart-contracts/contracts/custom/OwnableUnset.sol";
import {ERC165Checker} from "../Custom/ERC165Checker.sol";

// constants
import {
    LSP14OwnershipTransferStarted,
    LSP14OwnershipTransferred_SenderNotification,
    LSP14OwnershipTransferred_RecipientNotification
} from "./LSP14Constants.sol";
import {_INTERFACEID_LSP1} from "../LSP1UniversalReceiver/LSP1Constants.sol";

/**
 * @dev reverts when trying to renounce ownership before the initial confirmation delay
 */
error NotInRenounceOwnershipInterval(uint256 renounceOwnershipStart, uint256 renounceOwnershipEnd);

/**
 * @dev reverts when trying to transfer ownership to the address(this)
 */
error CannotTransferOwnershipToSelf();

/**
 * @title LSP14Ownable2Step
 * @author Fabian Vogelsteller <fabian@lukso.network>, Jean Cavallera (CJ42), Yamen Merhi (YamenMerhi), Daniel Afteni (B00ste)
 * @dev This contract is a modified version of the OwnableUnset implementation, where transferring and renouncing ownership
 *      works as a 2 steps process. This can be used as a confirmation mechanism to prevent potential mistakes when
 *      transferring ownership of the contract, where the control of the contract could be lost forever.
 */
abstract contract LSP14Ownable2Step is ILSP14Ownable2Step, OwnableUnset {
    /**
     * @dev The number of block that need to pass before one is able to
     *  confirm renouncing ownership
     */
    uint256 private constant _RENOUNCE_OWNERSHIP_CONFIRMATION_DELAY = 100;

    /**
     * @dev The number of blocks during which one can renounce ownership
     */
    uint256 private constant _RENOUNCE_OWNERSHIP_CONFIRMATION_PERIOD = 100;

    /**
     * @dev The block number saved when initiating the process of
     * renouncing ownerhsip
     */
    uint256 private _renounceOwnershipStartedAt;

    /**
     * @dev The address that may use `acceptOwnership()`
     */
    address private _pendingOwner;

    // --- General Methods

    /**
     * @dev Returns the address of the current pending owner.
     */
    function pendingOwner() public view virtual returns (address) {
        return _pendingOwner;
    }

    function transferOwnership(address newOwner) public virtual override onlyOwner {
        _transferOwnership(newOwner);
    }

    function acceptOwnership() public virtual override {
        _acceptOwnership();
    }

    function renounceOwnership() public virtual override onlyOwner {
        _renounceOwnership();
    }

    // --- Internal methods

    /**
     * @dev Start the process of transferring ownership of the contract
     * and notify the receiver about it.
     */
    function _transferOwnership(address newOwner) internal virtual {
        if (newOwner == address(this)) revert CannotTransferOwnershipToSelf();
        _pendingOwner = newOwner;

        address currentOwner = owner();
        _notifyRecipient(newOwner, LSP14OwnershipTransferStarted);
        require(currentOwner == owner());

        emit OwnershipTransferStarted(owner(), newOwner);
    }

    /**
     * @dev Accept ownership of the contract and notifiy
     * previous owner and the new owner about the process.
     */
    function _acceptOwnership() internal virtual {
        require(msg.sender == pendingOwner(), "Ownable2Step: caller is not the pendingOwner");

        address previousOwner = owner();
        _setOwner(_pendingOwner);
        delete _pendingOwner;

        _notifySender(previousOwner, LSP14OwnershipTransferred_SenderNotification);
        _notifyRecipient(msg.sender, LSP14OwnershipTransferred_RecipientNotification);
    }

    /**
     * @dev This method is used to initiate or confirm the process of
     * renouncing ownership.
     */
    function _renounceOwnership() internal virtual {
        uint256 currentBlock = block.number;
        uint256 confirmationPeriodStart = _renounceOwnershipStartedAt +
            _RENOUNCE_OWNERSHIP_CONFIRMATION_DELAY;
        uint256 confirmationPeriodEnd = confirmationPeriodStart +
            _RENOUNCE_OWNERSHIP_CONFIRMATION_PERIOD;

        if (currentBlock > confirmationPeriodEnd) {
            _renounceOwnershipStartedAt = currentBlock;
            emit RenounceOwnershipInitiated();
            return;
        }

        if (currentBlock < confirmationPeriodStart) {
            revert NotInRenounceOwnershipInterval(confirmationPeriodStart, confirmationPeriodEnd);
        }

        _setOwner(address(0));
        delete _renounceOwnershipStartedAt;
        delete _pendingOwner;
    }

    // --- URD Hooks

    /**
     * @dev Calls the universalReceiver function of the sender if supports LSP1 InterfaceId
     */
    function _notifySender(address sender, bytes32 typeId) internal virtual {
        if (ERC165Checker.supportsERC165Interface(sender, _INTERFACEID_LSP1)) {
            ILSP1UniversalReceiver(sender).universalReceiver(typeId, "");
        }
    }

    /**
     * @dev Calls the universalReceiver function of the owner if supports LSP1 InterfaceId
     */
    function _notifyRecipient(address receiver, bytes32 typeId) internal virtual {
        if (ERC165Checker.supportsERC165Interface(receiver, _INTERFACEID_LSP1)) {
            ILSP1UniversalReceiver(receiver).universalReceiver(typeId, "");
        }
    }
}
