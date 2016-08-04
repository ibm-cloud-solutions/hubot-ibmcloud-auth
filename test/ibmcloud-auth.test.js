/*
* Licensed Materials - Property of IBM
* (C) Copyright IBM Corp. 2016. All Rights Reserved.
* US Government Users Restricted Rights - Use, duplication or
* disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
*/
'use strict';

const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
const rewire = require('rewire');
const ibmcloudAuthAPI = rewire('../src/scripts/ibmcloud-auth');
const Helper = require('hubot-test-helper');
const helper = new Helper('../src/scripts/ibmcloud-auth.js');

const ibmcloudAuth = {};
ibmcloudAuth.checkAuthorization = ibmcloudAuthAPI.__get__('checkAuthorization');
ibmcloudAuth.isAuthorizedReader = ibmcloudAuthAPI.__get__('isAuthorizedReader');
ibmcloudAuth.isAuthorizedPowerUser = ibmcloudAuthAPI.__get__('isAuthorizedPowerUser');
ibmcloudAuth.isReaderCommand = ibmcloudAuthAPI.__get__('isReaderCommand');
ibmcloudAuth.isPowerCommand = ibmcloudAuthAPI.__get__('isPowerCommand');

// Passing arrow functions to mocha is discouraged: https://mochajs.org/#arrow-functions
// return promises from mocha tests rather than calling done() - http://tobyho.com/2015/12/16/mocha-with-promises/
describe('Test IBM Cloud auth function', function() {

	let fakeContext;

	beforeEach(function() {
		fakeContext = {
			listener: {
				options: {}
			},
			response: {
				message: {
					user: {
						profile: {
						}
					}
				}
			}
		};
	});

	context('checkAuthorization', function() {
		it('authorized for unrecognized command', function(done) {
			fakeContext.listener.options.id = 'InvalidId';
			fakeContext.response.message.user.profile.email = 'toddstsm@us.ibm.com';
			ibmcloudAuth.checkAuthorization(fakeContext, function() {
				expect(false).to.be.false;
				done();
			}, function() {
				expect(true).to.be.false;
				done();
			});

		});

		it('unauthorized for unrecognized reader email on valid reader command', function(done) {
			fakeContext.listener.options.id = 'bluemix.app.list';
			fakeContext.response.message.user.profile.email = 'toddstsm@us.ibm.com';
			fakeContext.response.reply = function(message) {
				expect(message).to.not.be.undefined;
				assert.typeOf(message, 'string', 'message is a string');
			};

			ibmcloudAuth.checkAuthorization(fakeContext, function() {
				expect(true).to.be.false;
				done();
			}, function() {
				expect(false).to.be.false;
				done();
			});

		});

		it('authorized for recognized reader email on valid reader command', function(done) {
			ibmcloudAuthAPI.__get__('READER_EMAILS').push('toddstsm@us.ibm.com');
			fakeContext.listener.options.id = 'bluemix.app.list';
			fakeContext.response.message.user.profile.email = 'toddstsm@us.ibm.com';

			ibmcloudAuth.checkAuthorization(fakeContext, function() {
				expect(false).to.be.false;
				ibmcloudAuthAPI.__get__('READER_EMAILS').pop();
				done();
			}, function() {
				expect(true).to.be.false;
				ibmcloudAuthAPI.__get__('READER_EMAILS').pop();
				done();
			});
		});

		it('unauthorized for recognized reader email on valid power command', function(done) {
			ibmcloudAuthAPI.__get__('READER_EMAILS').push('toddstsm@us.ibm.com');
			fakeContext.listener.options.id = 'bluemix.app.remove';
			fakeContext.response.message.user.email = 'toddstsm@us.ibm.com';
			fakeContext.response.reply = function(message) {
				expect(message).to.not.be.undefined;
				assert.typeOf(message, 'string', 'message is a string');
			};

			ibmcloudAuth.checkAuthorization(fakeContext, function() {
				expect(true).to.be.false;
				ibmcloudAuthAPI.__get__('READER_EMAILS').pop();
				done();
			}, function() {
				expect(false).to.be.false;
				ibmcloudAuthAPI.__get__('READER_EMAILS').pop();
				done();
			});
		});

		it('authorized for recognized power email on valid power command', function(done) {
			ibmcloudAuthAPI.__get__('POWER_EMAILS').push('toddstsm@us.ibm.com');
			fakeContext.listener.options.id = 'bluemix.app.remove';
			fakeContext.response.message.user.profile.email = 'toddstsm@us.ibm.com';

			ibmcloudAuth.checkAuthorization(fakeContext, function() {
				expect(false).to.be.false;
				ibmcloudAuthAPI.__get__('POWER_EMAILS').pop();
				done();
			}, function() {
				expect(true).to.be.false;
				ibmcloudAuthAPI.__get__('POWER_EMAILS').pop();
				done();
			});
		});
	});

	context('Test emit entry point (used for natural language)', function(){
		let room;
		beforeEach(function(){
			room = helper.createRoom();
		});

		afterEach(function(){
			room.destroy();
		});


		it('emit - authorized for unrecognized command', function(done){
			// A TIMEOUT means that the test failed.
			room.robot.on('command.unkown', function(){
				done();
			});
			var res = { message: {user: {id: 'mimiron'}}, response: room };
			room.robot.emit('ibmcloud-auth-to-nlc', res, { emitTarget: 'command.unkown' });
		});


		it('emit - reader user is authorized', function(done){
			// A TIMEOUT means that the test failed.
			room.robot.on('bluemix.app.list', function(){
				done();
			});
			var res = { message: {user: {id: 'mimiron', email_address: 'myReaderUser@us.ibm.com'}}, response: room };
			room.robot.emit('ibmcloud-auth-to-nlc', res, { emitTarget: 'bluemix.app.list' });
		});


		it('should test emit - reader user is denied', function(done){
			var replyFn = function(msg){
				expect(msg).to.be.eql('I\'m sorry, but you don\'t have access to that command');
				done();
			};
			var res = { message: {user: {id: 'mimiron', email_address: 'myReaderUser@us.ibm.com'}}, response: room, reply: replyFn };
			room.robot.emit('ibmcloud-auth-to-nlc', res, { emitTarget: 'bluemix.app.start' });
		});

		it('should test emit - power user is authorized', function(done){
			// A TIMEOUT means that the test failed.
			room.robot.on('bluemix.app.start', function(){
				done();
			});
			var res = { message: {user: {id: 'mimiron', email_address: 'myPowerUser@us.ibm.com'}}, response: room };
			room.robot.emit('ibmcloud-auth-to-nlc', res, { emitTarget: 'bluemix.app.start' });
		});

		it('should test emit - connamdID is undefined', function(done){
			var res = { message: {user: {id: 'mimiron', email_address: 'myPowerUser@us.ibm.com'}}, response: room };
			room.robot.emit('ibmcloud-auth-to-nlc', res, {});
			// Test pass if no errors are thrown.
			done();
		});
	});


	context('Test permission methods - Not authorized', function() {
		it('isAuthorizedReader does not find authorized reader email', function() {
			expect(ibmcloudAuth.isAuthorizedReader('toddstsm@us.ibm.com')).to.be.false;
		});

		it('isAuthorizedPowerUser does not find authorized power email', function() {
			expect(ibmcloudAuth.isAuthorizedPowerUser('toddstsm@us.ibm.com')).to.be.false;
		});

		it('isReaderCommand does not find reader command', function() {
			expect(ibmcloudAuth.isReaderCommand('awesomeCommand')).to.be.false;
		});

		it('isPowerCommand does not find power command', function() {
			expect(ibmcloudAuth.isPowerCommand('awesomeCommand')).to.be.false;
		});
	});

	context('Test permission methods - Authorized', function() {
		before(function() {
			ibmcloudAuthAPI.__get__('READER_EMAILS').push('toddstsm@us.ibm.com');
			ibmcloudAuthAPI.__get__('POWER_EMAILS').push('toddstsm@us.ibm.com');
		});

		after(function() {
			ibmcloudAuthAPI.__get__('READER_EMAILS').pop();
			ibmcloudAuthAPI.__get__('POWER_EMAILS').pop();
		});

		it('isAuthorizedReader finds authorized reader email', function() {
			expect(ibmcloudAuth.isAuthorizedReader('toddstsm@us.ibm.com')).to.be.true;
		});

		it('isAuthorizedPowerUser finds authorized power email', function() {
			expect(ibmcloudAuth.isAuthorizedPowerUser('toddstsm@us.ibm.com')).to.be.true;
		});

		it('isReaderCommand finds reader command', function() {
			expect(ibmcloudAuth.isReaderCommand('bluemix.app.list')).to.be.true;
		});

		it('isPowerCommand finds power command', function() {
			expect(ibmcloudAuth.isPowerCommand('bluemix.app.remove')).to.be.true;
		});
	});
});
