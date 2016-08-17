/*
* Licensed Materials - Property of IBM
* (C) Copyright IBM Corp. 2016. All Rights Reserved.
* US Government Users Restricted Rights - Use, duplication or
* disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
*/
'use strict';

var _ = require('lodash');
var HUBOT_IBMCLOUD_POWERUSERS = process.env.HUBOT_IBMCLOUD_POWERUSERS;
var HUBOT_IBMCLOUD_READERUSERS = process.env.HUBOT_IBMCLOUD_READERUSERS;
var HUBOT_IBMCLOUD_AUTHENTICATION_DISABLED = process.env.HUBOT_IBMCLOUD_AUTHENTICATION_DISABLED;

if (_.isString(HUBOT_IBMCLOUD_POWERUSERS)) {
	HUBOT_IBMCLOUD_POWERUSERS = HUBOT_IBMCLOUD_POWERUSERS.trim();
}
if (_.isString(HUBOT_IBMCLOUD_READERUSERS)) {
	HUBOT_IBMCLOUD_READERUSERS = HUBOT_IBMCLOUD_READERUSERS.trim();
}

const settings = {
	powerUsers: HUBOT_IBMCLOUD_POWERUSERS,
	readerUsers: HUBOT_IBMCLOUD_READERUSERS,
	authenticationDisabled: HUBOT_IBMCLOUD_AUTHENTICATION_DISABLED
};

module.exports = settings;
