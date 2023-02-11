// The entry file of your WebAssembly module.

import { generateEvent, Storage } from '@massalabs/massa-as-sdk';

import { Args } from '@massalabs/as-types';


export function increment(binaryArgs: StaticArray<u8>): StaticArray<u8> {

  const counterKey = new Args().add('counter');
  const incrementValue = new Args(binaryArgs).nextU32().expect('Increment value is invalid or missing');
  const storeValue = Storage.get(counterKey).nextU32();
  
  if (storeValue.isErr()) {
    Storage.set(counterKey, new Args().add(incrementValue));
  }
  else {
    const newValue = storeValue.unwrap() + incrementValue;
    const newStoreValue = new Args().add(newValue);
    Storage.set(counterKey, newStoreValue);
    generateEvent(`Incremented value by: ${incrementValue}`);
    return newStoreValue.serialize();
  }

  generateEvent(`Incremented value by: ${incrementValue}`);
  return new Args().add(incrementValue).serialize();
}

export function triggerValue(_: StaticArray<u8>): StaticArray<u8> {
  const counterKey = new Args().add('counter');
  const storeValue = Storage.get(counterKey).nextU32();
  if (storeValue.isErr()) {
    generateEvent('Counter value = 0');
    return  new Args().add('0').serialize();
  }
  generateEvent(`Counter value = ${storeValue.unwrap().toString()}`);
  return new Args().add(storeValue.unwrap()).serialize();
}