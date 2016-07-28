[![Build Status](https://travis-ci.org/ibm-cloud-solutions/hubot-ibmcloud-auth.svg?branch=master)](https://travis-ci.org/ibm-cloud-solutions/hubot-ibmcloud-auth)
[![Coverage Status](https://coveralls.io/repos/github/ibm-cloud-solutions/hubot-ibmcloud-auth/badge.svg?branch=master)](https://coveralls.io/github/ibm-cloud-solutions/hubot-ibmcloud-auth?branch=master)
[![Dependency Status](https://dependencyci.com/github/ibm-cloud-solutions/hubot-ibmcloud-auth/badge)](https://dependencyci.com/github/ibm-cloud-solutions/hubot-ibmcloud-auth)
[![npm](https://img.shields.io/npm/v/hubot-ibmcloud-auth.svg?maxAge=2592000)](https://www.npmjs.com/package/hubot-ibmcloud-auth)

# hubot-ibmcloud-auth

Script package that provides simple whitelist access to commands in hubot scripts for IBM Cloud.  Two levels of access, reader and power, are offered.

## Getting Started
* [Usage](#usage)
* [Access](#access)
* [Development](#development)
* [License](#license)
* [Contribute](#contribute)

## Usage

Steps for adding this to your hubot:

1. `cd` into your hubot directory
2. Install this package via `npm install hubot-ibmcloud-auth --save`
3. Add `hubot-ibmcloud-auth` to your `external-scripts.json`
4. Add the necessary environment variables:
```
HUBOT_IBMCLOUD_POWERUSERS=<comma-separated list of power-user emails -- no spaces!>
HUBOT_IBMCLOUD_READERUSERS=<comma-separated list of reader-user emails -- no spaces!>
HUBOT_IBMCLOUD_AUTHENTICATION_DISABLED=<only if desired, disables authentication and authorization if true)>
```
5. This package will always be used with hubot-bluemix so you'll want to follow all instructions for setting up hubot-bluemix as well.
6. Start up your bot & off to the races!

## Access

Reader-level users have access to the following operations:
- list apps
- show app logs
- show app status
- list containers
- show container logs
- show container status
- list container groups
- list services
- get the current space the user is looking at
- list spaces
- list services within a space
- set the current space the user is looking at
- list openwhisk actions
- list openwhisk namespaces
- get the current openwhisk namespace the user is looking at
- set the current openwhisk namespace the user is looking at
- list virtual servers

Power-level users have access to the following operations:
- remove an app
- restage an app
- scale an app
- start an app
- stop an app
- remove a container
- start a container
- stop a container
- remove a container group
- scale a container group
- bind a service instance
- create a service instance
- remove a service instance
- unbind a service instance
- deploy to github
- destroy a virtual server
- reboot a virtual servers
- start a virtual server
- stop a virtual server
- invoke an openwhisk action
- enable twitter monitoring
- disable twitter monitoring
- edit monitoring tweets

If a command is not listed, all users have access.

## Development

Please refer to the [CONTRIBUTING.md](https://github.com/ibm-cloud-solutions/hubot-ibmcloud-auth/blob/master/CONTRIBUTING.md) before starting any work.  Steps for running this script for development purposes:

### Configuration Setup

1. Create `config` folder in root of this project.
2. Create `env` in the `config` folder, with the following contents:
```
HUBOT_IBMCLOUD_POWERUSERS=<comma-separated list of power-user emails -- no spaces!>
HUBOT_IBMCLOUD_READERUSERS=<comma-separated list of reader-user emails -- no spaces!>
HUBOT_IBMCLOUD_AUTHENTICATION_DISABLED=<only if desired, disables authentication and authorization if true)>
```

## License

See [LICENSE.txt](https://github.com/ibm-cloud-solutions/hubot-ibmcloud-auth/blob/master/LICENSE.txt) for license information.

## Contribute

Please check out our [Contribution Guidelines](https://github.com/ibm-cloud-solutions/hubot-ibmcloud-auth/blob/master/CONTRIBUTING.md) for detailed information on how you can lend a hand.
