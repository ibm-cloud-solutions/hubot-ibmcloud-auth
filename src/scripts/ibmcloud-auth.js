// Description:
//	Adds middleware to authenticate user commands.
//
// Configuration:
//   HUBOT_IBMCLOUD_POWERUSERS=<comma-separated list of power-user emails -- no spaces!>
//   HUBOT_IBMCLOUD_READERUSERS=<comma-separated list of reader-user emails -- no spaces!>
//   HUBOT_IBMCLOUD_LDAP_PROTOCOL=<ldap or ldaps>
//   HUBOT_IBMCLOUD_LDAP_SERVER=<LDAP server name>
//   HUBOT_IBMCLOUD_LDAP_PORT=<LDAP port -- 1389>
//   HUBOT_IBMCLOUD_LDAP_BIND_USER=<LDAP login user>
//   HUBOT_IBMCLOUD_LDAP_BIND_PASSWORD=<LDAP login user password>
//   HUBOT_IBMCLOUD_LDAP_ORG_ROOT=<LDAP organization root -- "dc=example,dc=com">
//   HUBOT_IBMCLOUD_LDAP_EMAIL_FIELD=<LDAP user email field name -- mail>
//   HUBOT_IBMCLOUD_LDAP_GROUP_MEMBERSHIP_FIELD=<LDAP group member field -- uniqueMember or memberuid>
//   HUBOT_IBMCLOUD_LDAP_POWERUSERS_GROUP_DN_LIST=<semi-colon separated list of LDAP group distinguished names -- no spaces!>
//   HUBOT_IBMCLOUD_LDAP_READERUSERS_GROUP_DN_LIST=<semi-colon separated list of LDAP group distinguished names -- no spaces!>
//   HUBOT_IBMCLOUD_AUTHENTICATION_DISABLED=<only if desired, disables authentication and authorization if true)>
//
/*
* Licensed Materials - Property of IBM
* (C) Copyright IBM Corp. 2016. All Rights Reserved.
* US Government Users Restricted Rights - Use, duplication or
* disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
*/
'use strict';

var ldap = require('ldapjs');
var path = require('path');
var TAG = path.basename(__filename);
const env = require(path.resolve(__dirname, '..', 'lib', 'env'));

// --------------------------------------------------------------
// i18n (internationalization)
// It will read from a peer messages.json file.  Later, these
// messages can be referenced throughout the module.
// --------------------------------------------------------------
var i18n = new (require('i18n-2'))({
	// Add more languages to the list of locales when the files are created.
	locales: ['en'],
	extension: '.json',
	directory: __dirname + '/../locales',
	defaultLocale: 'en',
	// Prevent messages file from being overwritten in error conditions (like poor JSON).
	updateFiles: false
});
// At some point we need to toggle this setting based on some user input.
i18n.setLocale('en');

var bot = null;

var READER_COMMANDS = [
	'bluemix.app.list',
	'bluemix.app.logs',
	'bluemix.app.status',
	'bluemix.cloudant.listdatabases',
	'bluemix.cloudant.databaseinfo',
	'bluemix.cloudant.listviews',
	'bluemix.cloudant.runview',
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
	'nlc.status',
	'nlc.list',
	'nlc.data',
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
	'bluemix.app.restart',
	'bluemix.cloudant.createdatabase',
	'bluemix.cloudant.setpermissions',
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
	'nlc.train',
	'nlc.auto.approve',
	'objectstorage.retrieve.object',
	'objectstorage.search.object',
	'openwhisk.action.invoke',
	'twitter.monitoring.enable',
	'twitter.monitoring.disable',
	'twitter.tweet.edit'
];

var POWER_EMAILS = [];
var READER_EMAILS = [];
var POWER_GROUPS = [];
var READER_GROUPS = [];
var HUBOT_IBMCLOUD_AUTHENTICATION_DISABLED = env.authenticationDisabled ? env.authenticationDisabled : false;

var ldapClient = null;
var ldapConnected = false;

if (env.powerUsers) {
	POWER_EMAILS = env.powerUsers.split(',');
}

if (env.readerUsers) {
	READER_EMAILS = env.readerUsers.split(',');
}

function ldapInit() {
	var promise = new Promise((resolve, reject) => {
		if (env.ldapServer && env.ldapPort && env.ldapBindUser && env.ldapBindPassword) {
			var ldapUrl = `${env.ldapProtocol}://${env.ldapServer}:${env.ldapPort}`;
			POWER_GROUPS = env.ldapPowerGroups.split(';');
			READER_GROUPS = env.ldapReaderGroups.split(';');
			if (bot) {
				bot.logger.debug(`${TAG}: LDAP POWER_GROUPS=${POWER_GROUPS}`);
				bot.logger.debug(`${TAG}: LDAP READER_GROUPS=${READER_GROUPS}`);
				bot.logger.info(`${TAG}: Attemping to connect to LDAP at ${ldapUrl}.`);
			}
			ldapClient = ldap.createClient({
				url: ldapUrl,
				connectTimeout: 5000,
				timeout: 10000
			});
			ldapClient.bind(env.ldapBindUser, env.ldapBindPassword, function(err) {
				if (err) {
					reportError(`${TAG}: An error was hit during LDAP binding. Cannot connect to ldap at ${ldapUrl}`, err);
				} else {
					ldapConnected = true;
					if (bot) {
						bot.logger.info(`${TAG}: Connected to LDAP at ${ldapUrl} sucessfully.`);
					}
				}
				resolve(ldapConnected);
			});
		} else {
			resolve(true);
		}
	});
	return promise;
};

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
		bot.logger.warning(`${TAG}: Authorization was requested for a script without a valid id. Authorization is granted for unrecognized commands. You should provide an id in your scripts.`);
	} else {
		commandId = context.commandId || context.listener.options.id;
	}


	var emailAddress;

	if (context.response.message.user.profile) {
		emailAddress = context.response.message.user.profile.email;
	}

	var unauthorized = false;
	var authorizedReader = false;
	var authorizedPower = false;
	isAuthorizedReader(emailAddress).then(authReader => {
		authorizedReader = authReader;
		return isAuthorizedPowerUser(emailAddress);
	}).then(authPower => {
		authorizedPower = authPower;
		if (isReaderCommand(commandId) && (!authorizedReader && !authorizedPower)) {
			unauthorized = true;
		} else if (isPowerCommand(commandId) && !authorizedPower) {
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
	})
	.catch(err => {
		reportError(`${TAG}: An error occurred during authorization checks:`, err);
		let msg = i18n.__('no.access');
		context.response.reply(msg);
		done();
	});
};

module.exports = function(robot) {
	bot = robot;
	ldapInit().then(connected => {
		robot.listenerMiddleware(checkAuthorization);
		robot.on('ibmcloud-auth-to-nlc', (res, authEmitParams) => {
			checkAuthorization({response: res, commandId: authEmitParams.emitTarget}, function next(){
				// Forward the request to the given emit target with the given parameters
				bot.logger.debug(`Auth granted for NLC command. Emitting to ${authEmitParams.emitTarget} with params ${authEmitParams.emitParameters}`);
				bot.emit(authEmitParams.emitTarget, res, authEmitParams.emitParameters);
			}, function done() {
			});
		});
	})
	.catch(err => {
		reportError(`${TAG}: An error occurred during authorization initialization:`, err);
	});
};

function reportError(message, err) {
	if (bot) {
		bot.logger.error(message);
		bot.logger.error(err);
	}
};

function ldapSearch(query, filter) {
	if (bot) {
		bot.logger.debug(`${TAG}: ldapSearch(${query}, ${filter})`);
	}
	var promise = new Promise((resolve, reject) => {
		var entryFound = false;
		var opts = {
			filter: filter,
			scope: 'sub'
		};
		ldapClient.search(query, opts, function(err, res) {
			if (err) {
				reportError(`${TAG}: An error was hit during LDAP search.`, err);
				throw err;
			}
			res.on('searchEntry', function(entry) {
				if (bot) {
					bot.logger.debug(`${TAG}: ldap filter ${filter} was matched for query ${query}`);
				}
				entryFound = true;
				resolve(entry);
			});
			res.on('error', function(err) {
				reportError(`${TAG}: An error was hit during LDAP search.`, err);
				reject(err);
			});
			res.on('end', function(result) {
				if (!entryFound) {
					if (bot) {
						bot.logger.debug(`${TAG}: ldap filter ${filter} was not matched for query ${query}`);
					}
					resolve(null);
				}
			});
		});
	});
	return promise;

}

function getDistinguishedName(email) {
	var filter = `(${env.ldapEmailField}=${email})`;
	return ldapSearch(env.ldapOrgRoot, filter).then(entry => {
		if (entry === null) {
			return Promise.resolve(null);
		} else {
			return Promise.resolve(entry.objectName);
		}
	});
};

function isMemberOfGroup(email, group) {
	return getDistinguishedName(email).then(dn => {
		if (dn === null) {
			return Promise.resolve(false);
		} else {
			var filter = `(${env.ldapGroupMembershipField}=${dn})`;
			return ldapSearch(group, filter);
		}
	}).catch(err => {
		reportError(`${TAG}: An error was hit during getting the distinguished name.`, err);
		return Promise.reject(err);
	});
};

function isMemberOfAGroup(email, groupArray) {
	if (bot) {
		bot.logger.debug(`${TAG}: Test if ${email} is a member of groupArray:` + JSON.stringify(groupArray));
	}
	var promise = new Promise((resolve, reject) => {
		if (!Array.isArray(groupArray)) {
			resolve(false);
		} else {
			if (groupArray.length <= 0) {
				resolve(false);
			} else {
				var promiseArray = [];
				groupArray.forEach((group, index) => {
					promiseArray.push(isMemberOfGroup(email, group));
				});
				Promise.all(promiseArray).then(values => {
					var result = false;
					values.forEach((val, idx) => {
						if (val !== null && val !== false) {
							result = true;
						}
					});
					if (bot) {
						bot.logger.debug(`${TAG}: ${email} group membership test is ${result} for groupArray:` + JSON.stringify(groupArray));
					}
					resolve(result);
				})
				.catch(err => {
					reportError(`${TAG}: An error occured while testing group membership.`, err);
					resolve(false);
				});
			}
		}
	});
	return promise;
};

function isAuthorizedReader(email) {
	var promise = new Promise((resolve, reject) => {
		if (READER_EMAILS.indexOf(email) !== -1) {
			resolve(true);
		} else {
			if (ldapConnected) {
				isMemberOfAGroup(email, READER_GROUPS).then(result => {
					resolve(result);
				}).catch(err => {
					reportError(`${TAG}: An error was hit during LDAP group membership lookup.`, err);
					resolve(false);
				});
			} else {
				resolve(false);
			}
		}
	});
	return promise;
}

function isAuthorizedPowerUser(email) {
	var promise = new Promise((resolve, reject) => {
		if (POWER_EMAILS.indexOf(email) !== -1) {
			resolve(true);
		} else {
			if (ldapConnected) {
				isMemberOfAGroup(email, POWER_GROUPS).then(result => {
					resolve(result);
				}).catch(err => {
					reportError(`${TAG}: An error was hit during LDAP group membership lookup.`, err);
					resolve(false);
				});
			} else {
				resolve(false);
			}
		}
	});
	return promise;
}

function isReaderCommand(commandId) {
	return (READER_COMMANDS.indexOf(commandId) !== -1);
}

function isPowerCommand(commandId) {
	return (POWER_COMMANDS.indexOf(commandId) !== -1);
}
