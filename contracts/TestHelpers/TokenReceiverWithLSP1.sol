// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

// constants
import "../LSP1/LSP1Constants.sol";

// interfaces
import "../_LSPs/ILSP1_UniversalReceiver.sol";

// modules
import "@openzeppelin/contracts/utils/introspection/ERC165Storage.sol";

contract TokenReceiverWithLSP1 is ERC165Storage, ILSP1 {

    event UniversalReceiverCalled(bytes32 typeId, bytes data);

    constructor() {
        _registerInterface(_LSP1_INTERFACE_ID);
    }

    function universalReceiver(bytes32 typeId, bytes memory data)
        external
        override
        returns (bytes32 returnValue)
    {
        emit UniversalReceiverCalled(typeId, data);

        return "thanks for calling";
    }

    receive() external payable {}
    fallback() external payable {}
}
