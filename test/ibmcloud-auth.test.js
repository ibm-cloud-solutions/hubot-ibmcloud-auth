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

ibmcloudAuth.ldapInit = ibmcloudAuthAPI.__get__('ldapInit');
ibmcloudAuth.reportError = ibmcloudAuthAPI.__get__('reportError');
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
		beforeEach(function(done){
			ibmcloudAuth.ldapInit().then(connected => {
				done();
			});
			let bot = {
				logger: {
					debug: () => {},
					info: () => {},
					error: () => {},
					warning: () => {}
				}
			};
			ibmcloudAuthAPI.__set__('bot', bot);
		});

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
			fakeContext.response.message.user.profile.email = 'toddstsm@us.ibm.com';
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

		it('authorized for recognized reader email from LDAP group on valid reader command', function(done) {
			fakeContext.listener.options.id = 'bluemix.app.list';
			fakeContext.response.message.user.profile.email = 'galieleo@ldap.forumsys.com';
			fakeContext.response.reply = function(message) {
				expect(message).to.not.be.undefined;
				assert.typeOf(message, 'string', 'message is a string');
			};
			ibmcloudAuth.checkAuthorization(fakeContext, function() {
				expect(false).to.be.false;
				done();
			}, function() {
				expect(true).to.be.false;
				done();
			});
		}).timeout(10000);

		it('authorized for recognized power email from LDAP group on valid power command', function(done) {
			fakeContext.listener.options.id = 'bluemix.app.remove';
			fakeContext.response.message.user.profile.email = 'riemann@ldap.forumsys.com';
			fakeContext.response.reply = function(message) {
				expect(message).to.not.be.undefined;
				assert.typeOf(message, 'string', 'message is a string');
			};
			ibmcloudAuth.checkAuthorization(fakeContext, function() {
				expect(false).to.be.false;
				done();
			}, function() {
				expect(true).to.be.false;
				done();
			});
		}).timeout(10000);

		it('unauthorized for recognized reader email from LDAP group on valid power command', function(done) {
			fakeContext.listener.options.id = 'bluemix.app.remove';
			fakeContext.response.message.user.profile.email = 'galieleo@ldap.forumsys.com';
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

		it('unauthorized for unrecognized reader email from LDAP on valid reader command', function(done) {
			fakeContext.listener.options.id = 'bluemix.app.list';
			fakeContext.response.message.user.profile.email = 'curie@ldap.forumsys.com';
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

		it('test error reporting', function(){
			ibmcloudAuth.reportError('error message', {});
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
			let res = { message: {user: {id: 'mimiron'}}, response: room };
			setTimeout(() => {
				room.robot.emit('ibmcloud-auth-to-nlc', res, { emitTarget: 'command.unkown' });
			}, 600);
		}).timeout(10000);

		it('emit - reader user is authorized', function(done){
			// A TIMEOUT means that the test failed.
			room.robot.on('bluemix.app.list', function(){
				done();
			});
			let res = { message: {user: {id: 'mimiron', profile: {email: 'myReaderUser@us.ibm.com'}}}, response: room };
			setTimeout(() => {
				room.robot.emit('ibmcloud-auth-to-nlc', res, { emitTarget: 'bluemix.app.list' });
			}, 600);
		}).timeout(10000);

		it('should test emit - reader user is denied', function(done){
			let replyFn = function(msg){
				expect(msg).to.be.eql('I\'m sorry, but you don\'t have access to that command.');
				done();
			};
			let res = { message: {user: {id: 'mimiron', profile: {email: 'myReaderUser@us.ibm.com'}}}, response: room, reply: replyFn };
			setTimeout(() => {
				room.robot.emit('ibmcloud-auth-to-nlc', res, { emitTarget: 'bluemix.app.start' });
			}, 600);
		}).timeout(10000);

		it('should test emit - power user is authorized', function(done){
			// A TIMEOUT means that the test failed.
			room.robot.on('bluemix.app.start', function(){
				done();
			});
			let res = { message: {user: {id: 'mimiron', profile: {email: 'myPowerUser@us.ibm.com'}}}, response: room };
			setTimeout(() => {
				room.robot.emit('ibmcloud-auth-to-nlc', res, { emitTarget: 'bluemix.app.start' });
			}, 600);
		}).timeout(10000);

		it('should test emit - connamdID is undefined', function(done){
			let res = { message: {user: {id: 'mimiron', profile: {email: 'myPowerUser@us.ibm.com'}}}, response: room };
			room.robot.emit('ibmcloud-auth-to-nlc', res, {});
			// Test pass if no errors are thrown.
			done();
		}).timeout(10000);
	});


	context('Test permission methods - Not authorized', function() {
		it('isAuthorizedReader does not find authorized reader email', function() {
			ibmcloudAuth.isAuthorizedReader('toddstsm@us.ibm.com').then(auth => {
				expect(auth).to.be.false;
			});
		}).timeout(10000);

		it('isAuthorizedPowerUser does not find authorized power email', function() {
			ibmcloudAuth.isAuthorizedPowerUser('toddstsm@us.ibm.com').then(auth => {
				expect(auth).to.be.false;
			});
		}).timeout(10000);

		it('isReaderCommand does not find reader command', function() {
			expect(ibmcloudAuth.isReaderCommand('awesomeCommand')).to.be.false;
		}).timeout(10000);

		it('isPowerCommand does not find power command', function() {
			expect(ibmcloudAuth.isPowerCommand('awesomeCommand')).to.be.false;
		}).timeout(10000);
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
			ibmcloudAuth.isAuthorizedReader('toddstsm@us.ibm.com').then(auth => {
				expect(auth).to.be.true;
			});
		}).timeout(10000);

		it('isAuthorizedPowerUser finds authorized power email', function() {
			ibmcloudAuth.isAuthorizedPowerUser('toddstsm@us.ibm.com').then(auth => {
				expect(auth).to.be.true;
			});
		}).timeout(10000);

		it('isReaderCommand finds reader command', function() {
			expect(ibmcloudAuth.isReaderCommand('bluemix.app.list')).to.be.true;
		}).timeout(10000);

		it('isPowerCommand finds power command', function() {
			expect(ibmcloudAuth.isPowerCommand('bluemix.app.remove')).to.be.true;
		}).timeout(10000);
	});
});
