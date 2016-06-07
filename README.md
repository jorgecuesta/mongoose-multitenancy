## mongoose-multitenancy

[![Build Status](https://travis-ci.org/jorgecuesta/mongoose-multitenancy.svg?branch=master)](https://travis-ci.org/jorgecuesta/mongoose-multitenancy)
[![Coverage Status](https://coveralls.io/repos/github/jorgecuesta/mongoose-multitenancy/badge.svg?branch=master)](https://coveralls.io/github/jorgecuesta/mongoose-multitenancy?branch=master)
[![npm version](https://badge.fury.io/js/mongoose-multitenancy.svg)](https://badge.fury.io/js/mongoose-multitenancy)
[![Dependency Status](https://david-dm.org/jorgecuesta/mongoose-multitenancy.svg)](https://david-dm.org/jorgecuesta/mongoose-multitenancy)
[![peerDependency Status](https://david-dm.org/jorgecuesta/mongoose-multitenancy/peer-status.svg)](https://david-dm.org/jorgecuesta/mongoose-multitenancy#info=peerDependencies)
[![devDependency Status](https://david-dm.org/jorgecuesta/mongoose-multitenancy/dev-status.svg)](https://david-dm.org/jorgecuesta/mongoose-multitenancy#info=devDependencies)

The best of both worlds [Mongoose.discriminator](http://mongoosejs.com/docs/discriminators.html) &amp; [mongoose-multitenant](https://github.com/rosshinkley/mongoose-multitenant)
This package uses the mongoose discriminator functionality to extend schemas and uses the logic of mongoose-multitenant to create the models.
Right now multitenancy just works with collections.

Installation

npm install mongoose-multitenancy

@NOTE: It requires mongoose as peerDependency.
Usage

var mongoose = require('mongoose');

// It automatically adds logic to mongoose.
require('mongoose-multitenancy');

Tests

npm test