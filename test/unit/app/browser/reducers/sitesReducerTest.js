/* global describe, it, before, after */
const Immutable = require('immutable')
const mockery = require('mockery')
const assert = require('assert')
const sinon = require('sinon')

const appConstants = require('../../../../../js/constants/appConstants')
const siteTags = require('../../../../../js/constants/siteTags')
const { makeImmutable } = require('../../../../../app/common/state/immutableUtil')
require('../../../braveUnit')

const initState = Immutable.fromJS({
  sites: {},
  windows: [],
  tabs: []
})

/**
 * Most of the site related tests are in siteUtilTest.
 * This just tests that things are hooked up to siteUtil properly.
 */
describe('sitesReducerTest', function () {
  let sitesReducer
  before(function () {
    this.fakeFiltering = {
      clearHistory: () => {}
    }
    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false,
      useCleanCache: true
    })
    mockery.registerMock('../../filtering', this.fakeFiltering)
    sitesReducer = require('../../../../../app/browser/reducers/sitesReducer')
  })

  after(function () {
  })

  describe('APP_ON_CLEAR_BROWSING_DATA', function () {
    before(function () {
      this.action = {
        actionType: appConstants.APP_ON_CLEAR_BROWSING_DATA,
        clearDataDetail: {browserHistory: true}
      }
      this.clearHistory = sinon.stub(this.fakeFiltering, 'clearHistory')
      this.state = sitesReducer(initState, this.action, makeImmutable(this.action))
    })

    after(function () {
      this.clearHistory.restore()
    })

    it('calls `filtering.clearHistory`', function () {
      assert.ok(this.clearHistory.calledOnce)
    })
  })

  describe('APP_ADD_SITE', function () {
    it('adds a single site to sites map', function () {
      const url = 'https://www.brave.com'
      const state = initState
      const action = {
        actionType: appConstants.APP_ADD_SITE,
        siteDetail: Immutable.fromJS({
          location: url,
          tag: siteTags.BOOKMARK
        }),
        skipSync: true
      }
      const newState = sitesReducer(state, action).toJS()
      assert.equal(Object.keys(newState.sites).length, 1)
      assert.equal(Object.values(newState.sites)[0].location, url)
    })
    it('adds multiple site to sites map', function () {
      const url = 'https://www.brave.com'
      const url2 = 'https://www.brave.com/about'
      const state = initState
      const action = {
        actionType: appConstants.APP_ADD_SITE,
        siteDetail: Immutable.fromJS([{
          location: url,
          tag: siteTags.BOOKMARK
        }, {
          location: url2,
          tag: siteTags.BOOKMARK
        }]),
        skipSync: true
      }
      const newState = sitesReducer(state, action).toJS()
      assert.equal(Object.keys(newState.sites).length, 2)
      assert.equal(Object.values(newState.sites)[0].location, url)
      assert.equal(Object.values(newState.sites)[1].location, url2)
    })
  })
  describe('APP_REMOVE_SITE', function () {
    it('Removes the specified site', function () {
      const url = 'https://www.brave.com'
      let state = initState
      let action = {
        actionType: appConstants.APP_ADD_SITE,
        siteDetail: Immutable.fromJS({
          location: url
        }),
        skipSync: true
      }
      let newState = sitesReducer(state, action)
      action.actionType = appConstants.APP_REMOVE_SITE
      newState = sitesReducer(newState, action).toJS()
      assert.equal(Object.keys(newState.sites).length, 1)
      assert.equal(Object.keys(newState.sites)[0].lastAccessedTime, undefined)
    })
  })
  describe('APP_MOVE_SITE', function () {
    it('Moves the specified site', function () {
      const url = 'https://www.brave.com'
      const url2 = 'https://www.brave.com/3'
      let state = initState
      let addAction = {
        actionType: appConstants.APP_ADD_SITE,
        siteDetail: Immutable.fromJS({
          location: url,
          order: 1
        }),
        skipSync: true
      }

      let moveAction = {
        actionType: appConstants.APP_MOVE_SITE,
        sourceKey: `${url}|0|0`,
        destinationKey: `${url2}|0|0`
      }

      // Add sites
      let newState = sitesReducer(state, addAction)
      addAction.siteDetail = addAction.siteDetail.set('location', 'https://www.brave.com/2')
      newState = sitesReducer(newState, addAction)
      addAction.siteDetail = addAction.siteDetail.set('location', 'https://www.brave.com/3')
      newState = sitesReducer(newState, addAction)
      assert.equal(Object.keys(newState.get('sites').toJS()).length, 3)

      // sites are sorted after #8075 landed
      // sites[0] will be order 0, sites[1] will be order 1...etc

      // Move the site to the 2nd position
      newState = sitesReducer(newState, moveAction).toJS()
      assert.equal(Object.keys(newState.sites).length, 3)
      assert.equal(Object.values(newState.sites)[2].location, url)
      assert.equal(Object.values(newState.sites)[2].order, 2)

      // Move the site to the 3rd position
      moveAction.prepend = true
      newState = sitesReducer(Immutable.fromJS(newState), moveAction).toJS()
      assert.equal(Object.keys(newState.sites).length, 3)
      assert.equal(Object.values(newState.sites)[1].location, url)
      assert.equal(Object.values(newState.sites)[1].order, 1)
    })
  })
})
