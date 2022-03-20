import * as util from '../common/util'
import pup from 'puppeteer'

describe('utils test', () => {
  it('tests price formatting', () => {
    expect(util.priceFormat('$100.99') === '100.99').toBeTruthy()
    expect(util.priceFormat('€100,99') === '100.99').toBeTruthy()

    expect(util.priceFormat('$1,000.99') === '1000.99').toBeTruthy()
    expect(util.priceFormat('€1.000,99') === '1000.99').toBeTruthy()

    expect(util.priceFormat('$100') === '100.00').toBeTruthy()
  })

  it('tests argument parser', () => {
    let argsObj = {
      link: ''
    }

    expect(util.argParser(['--link', 'one'], argsObj).link === 'one').toBeTruthy()
    expect(util.argParser(['-l', 'two'], argsObj).link === 'two').toBeTruthy()
  })

  it('tests string trimming', () => {
    expect(util.trim('12345', 10).length === 5).toBeTruthy()
    expect(util.trim('123456', 2).length === 5).toBeTruthy()
  })

  it('tests URLParams', () => {
    const params = {
      'one': '1',
      'two': '2'
    }

    expect(util.parseParams(params) === '?one=1&two=2&').toBeTruthy()
  })

  it('tests startPup', () => {
    pup.launch = jest.fn()

    util.startPup()

    expect(pup.launch).toHaveBeenCalled()
  })

  // Complex stuff I have yet to do goes here
})