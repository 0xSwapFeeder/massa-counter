import { Address, call, callerHasWriteAccess } from '@massalabs/massa-as-sdk';
import { Args } from '@massalabs/as-types';

/**
 * This function is meant to be called only one time: when the contract is deployed.
 *
 * @param _ - not used
 */
export function constructor(_: StaticArray<u8>): StaticArray<u8> {
  // This line is important. It ensure that this function can't be called in the future.
  // If you remove this check someone could call your constructor function and reset your SC.
  if (!callerHasWriteAccess) {
    return [];
  }
  main([]);
  return [];
}

/**
 * @param _ - not used
 * @returns empty array
 */
export function main(_: StaticArray<u8>): StaticArray<u8> {
  const address = new Address(
    'A1231h17jYujF2XdScmJu5hC2LRvmcckCQtRNhte3NDy9fTx9z1s',
  );
  call(
    address,
    'increment',
    new Args().add(1 as u32),
    0
  );
  return [];
}
