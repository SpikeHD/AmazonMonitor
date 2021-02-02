const util = require('../common/util')

describe('utils test', () => {
  it('tests price formatting', () => {
    expect(util.priceFormat('$100.99') === '100.99').toBeTruthy()
    expect(util.priceFormat('€100,99') === '100.99').toBeTruthy()

    expect(util.priceFormat('$1,000.99') === '1000.99').toBeTruthy()
    expect(util.priceFormat('€1.000,99') === '1000.99').toBeTruthy()
  })
})