const fs = require("fs");
const hre = require("hardhat");

// first generate the JSON artifacts to have a folder "./artifacts/{Contract}.json"
hre.run("prepare-package").then(() => {
  const swiftAbis = {};

  // 1. for each contract included in the package
  const contracts = hre.config.packager.contracts;

  for (const contract of contracts) {
    //  1.1 read the artifact file (one at a time)
    let artifact = fs.readFileSync(`./artifacts/${contract}.json`);

    //  1.2 get the abi field in the JSON file
    let abi = JSON.parse(artifact).abi;

    //  1.3 save each abi as a string in a list object
    //  escaping double quotes '\\"', so that it can be parsed correctly
    swiftAbis[contract] = JSON.stringify(abi).replace(/"/g, '\\"');
  }

  let upSwiftFile = "./ios/UPContractsAbi.swift";

  // 2. add each swift abi in the file content,
  let swiftFileContent = `//
//  UPContractsAbi.swift
//  universalprofile-ios-sdk
//
//  Created by lukso-network.
//  LUKSO Blockchain GmbH © ${new Date().getFullYear()}
//
import Foundation

public final class UPContractsAbi {

   `;

  const getAbisAsArray = () => {
    let body = [];
    for (const [key, value] of Object.entries(swiftAbis)) {
      body.push(`public static let ${key}_ABI = "${value}"`);
    }
    return body;
  };

  let variablesList = getAbisAsArray();

  let swiftFileEnd = `
    
} // end of lsp-universalprofile-smart-contract abis
  `;

  swiftFileContent = swiftFileContent.concat(variablesList.join("\n\n   "));
  swiftFileContent = swiftFileContent.concat(swiftFileEnd);

  // 3. finally, write the content inside the file
  fs.appendFile(upSwiftFile, swiftFileContent, (err) => {
    if (err) console.log(err);
    console.log(
      `\u2713 \uF8FF Successfully created Swift contract ABIs (see file: ${upSwiftFile})`
    );
  });
});
