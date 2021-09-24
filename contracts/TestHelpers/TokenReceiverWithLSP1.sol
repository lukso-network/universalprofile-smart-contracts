// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

// interfaces
import "../_LSPs/ILSP1_UniversalReceiver.sol";

// modules
import "@openzeppelin/contracts/utils/introspection/ERC165Storage.sol";

contract TokenReceiverWithLSP1 is ERC165Storage, ILSP1 {

    event UniversalReceiverCalled(bytes32 typeId, bytes data);

    bytes4 constant _INTERFACE_ID_LSP1 = 0x6bb56a14;

    constructor() {
        _registerInterface(_INTERFACE_ID_LSP1);
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
