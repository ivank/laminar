import { ansiRegex, findMediaType } from '../src/helpers';

describe('Helper Tests', () => {
  it.each`
    text
    ${'foo\u001B[4mcake\u001B[0m'}
    ${'\u001B[4mcake\u001B[0m'}
    ${'\u001B[0m\u001B[4m\u001B[42m\u001B[31mfoo\u001B[39m\u001B[49m\u001B[24mfoo\u001B[0m'}
    ${'foo\u001B[mfoo'}
  `('Test $text matches ansiRegex', async ({ text }) => {
    expect(text).toMatch(ansiRegex);
  });

  it.each`
    mediaType             | resources                                                        | expected
    ${'application/json'} | ${undefined}                                                     | ${undefined}
    ${'text/plain'}       | ${{ 'text/plain': { r: 1 } }}                                    | ${{ r: 1 }}
    ${'text/plain'}       | ${{ 'text/*': { r: 1 } }}                                        | ${{ r: 1 }}
    ${'text/plain'}       | ${{ '*/*': { r: 1 } }}                                           | ${{ r: 1 }}
    ${'text/plain'}       | ${{ 'text/other+plain': { r: 1 } }}                              | ${{ r: 1 }}
    ${'application/json'} | ${{ 'text/plain': { r: 2 } }}                                    | ${undefined}
    ${'application/json'} | ${{ 'application/json': { r: 1 }, 'text/plain': { r: 2 } }}      | ${{ r: 1 }}
    ${'application/json'} | ${{ 'text/plain': { r: 2 }, 'application/json': { r: 1 } }}      | ${{ r: 1 }}
    ${'application/json'} | ${{ 'application/test+json': { r: 1 }, 'text/plain': { r: 2 } }} | ${{ r: 1 }}
    ${'application/json'} | ${{ 'text/plain': { r: 2 }, 'application/*': { r: 1 } }}         | ${{ r: 1 }}
    ${'application/json'} | ${{ 'text/plain': { r: 2 }, '*/*': { r: 1 } }}                   | ${{ r: 1 }}
  `('Test $mediaType can find $expected in $resources', async ({ mediaType, resources, expected }) => {
    expect(findMediaType(mediaType, resources)).toEqual(expected);
  });
});
