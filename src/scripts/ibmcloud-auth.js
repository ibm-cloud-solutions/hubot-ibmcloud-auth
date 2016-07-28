// Description:
//	Adds middleware to authenticate user commands.
//
// Configuration:
//	 HUBOT_IBMCLOUD_POWERUSERS=<comma-separated list of power-user emails -- no spaces!>
//   HUBOT_IBMCLOUD_READERUSERS=<comma-separated list of reader-user emails -- no spaces!>
//   HUBOT_IBMCLOUD_AUTHENTICATION_DISABLED=<only if desired, disables authentication and authorization if true)>
//
/*
* Licensed Materials - Property of IBM
* (C) Copyright IBM Corp. 2016. All Rights Reserved.
* US Government Users Restricted Rights - Use, duplication or
* disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
*/
'use strict';

var path = require('path');
var TAG = path.basename(__filename);
const env = require(path.resolve(__dirname, 'env'));

// --------------------------------------------------------------
// i18n (internationalization)
// It will read from a peer messages.json file.  Later, these
// messages can be referenced throughout the module.
// --------------------------------------------------------------
const i18n = require('i18n');
var i18nConfig = {
	// Add more languages to the list of locales when the files are created.
	locales: ['en'],
	directory: __dirname + '/../locales',
	// Prevent messages file from being overwritten in error conditions (like poor JSON).
	updateFiles: false
};
i18n.configure(i18nConfig);
// At some point we need to toggle this setting based on some user input.
i18n.setLocale('en');

var bot = null;

var READER_COMMANDS = [
	'bluemix.app.list',
	'bluemix.app.logs',
	'bluemix.app.status',
	'bluemix.container.list',
	'bluemix.container.logs',
	'bluemix.container.status',
	'bluemix.containergroup.list',
	'bluemix.service.list',
	'bluemix.space.get',
	'bluemix.space.list',
	'bluemix.space.service.list',
	'bluemix.space.set',
	'bluemix.vs.list',
	'bluemix.app.problems',
	'objectstorage.container.list',
	'objectstorage.container.details',
	'openwhisk.action.list',
	'openwhisk.namespace.list',
	'openwhisk.namespace.get',
	'openwhisk.namespace.set',
	'twitter.tweet.list'
];

var POWER_COMMANDS = [
	'bluemix.app.remove',
	'bluemix.app.restage',
	'bluemix.app.scale',
	'bluemix.app.start',
	'bluemix.app.stop',
	'bluemix.container.remove',
	'bluemix.container.start',
	'bluemix.container.stop',
	'bluemix.containergroup.remove',
	'bluemix.containergroup.scale',
	'bluemix.service.bind',
	'bluemix.service.create',
	'bluemix.service.remove',
	'bluemix.service.unbind',
	'bluemix.vs.destroy',
	'bluemix.vs.reboot',
	'bluemix.vs.start',
	'bluemix.vs.stop',
	'github.deploy',
	'objectstorage.retrieve.object',
	'openwhisk.action.invoke',
	'twitter.monitoring.enable',
	'twitter.monitoring.disable',
	'twitter.tweet.edit'
];

var POWER_EMAILS = [];
var READER_EMAILS = [];
var HUBOT_IBMCLOUD_AUTHENTICATION_DISABLED = env.authenticationDisabled ? env.authenticationDisabled : false;

if (env.powerUsers) {
	POWER_EMAILS = env.powerUsers.split(',');
}

if (env.readerUsers) {
	READER_EMAILS = env.readerUsers.split(',');
}

function checkAuthorization(context, next, done) {
	if (HUBOT_IBMCLOUD_AUTHENTICATION_DISABLED) {
		if (bot) {
			bot.logger.info(`${TAG}: HUBOT_IBMCLOUD_AUTHENTICATION_DISABLED is true`);
		}
		next();
		return;
	}

	var commandId;
	if (!context ||
		(!context.commandId && (!context.listener || !context.listener.options || !context.listener.options.id))){
		bot.logger.warning(`${TAG}: The 'context' object doesn't contain a 'commandId' or 'listener.options_id' key. Unrecognized commands are authorized.`);
	} else {
		commandId = context.commandId || context.listener.options.id;
	}

	var emailAddress = context.response.message.user.email_address;
	var unauthorized = false;

	if (isReaderCommand(commandId) && (!isAuthorizedReader(emailAddress) && !isAuthorizedPowerUser(
		emailAddress))) {
		unauthorized = true;
	} else if (isPowerCommand(commandId) && !isAuthorizedPowerUser(emailAddress)) {
		unauthorized = true;
	}

	if (unauthorized) {
		if (bot) {
			bot.logger.info(`${TAG}: User ${emailAddress} is not authorized to use command ${commandId}.`);
		}
		let msg = i18n.__('no.access');
		context.response.reply(msg);
		done();
	} else {
		next();
	}
}

module.exports = function(robot) {
	bot = robot;
	robot.listenerMiddleware(checkAuthorization);
	robot.on('ibmcloud-auth-to-nlc', (res, authEmitParams) => {
		checkAuthorization({response: res, commandId: authEmitParams.emitTarget}, function next(){
			// Forward the request to the given emit target with the given parameters
			bot.emit(authEmitParams.emitTarget, res, authEmitParams.emitParameters);
		}, function done() {
		});
	});
};

function isAuthorizedReader(email) {
	return (READER_EMAILS.indexOf(email) !== -1);
}

function isAuthorizedPowerUser(email) {
	return (POWER_EMAILS.indexOf(email) !== -1);
}

function isReaderCommand(commandId) {
	return (READER_COMMANDS.indexOf(commandId) !== -1);
}

function isPowerCommand(commandId) {
	return (POWER_COMMANDS.indexOf(commandId) !== -1);
}
