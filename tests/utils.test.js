import * as util from '../common/utils.js'

describe('utils test', () => {
  it('tests price formatting', () => {
    expect(util.priceFormat('$100.99') === '100.99').toBeTruthy()
    expect(util.priceFormat('€100,99') === '100.99').toBeTruthy()

    expect(util.priceFormat('$1,000.99') === '1000.99').toBeTruthy()
    expect(util.priceFormat('€1.000,99') === '1000.99').toBeTruthy()

    expect(util.priceFormat('$100') === '100.00').toBeTruthy()
  })

  it('tests string trimming', () => {
    expect(util.trim('12345', 10).length === 5).toBeTruthy()
    expect(util.trim('123456', 5).length === 5).toBeTruthy()
  })

  it('tests URLParams', () => {
    const params = {
      'one': '1',
      'two': '2'
    }

    expect(util.parseParams(params) === '?one=1&two=2&').toBeTruthy()
  })

  // Complex stuff I have yet to do goes here
})