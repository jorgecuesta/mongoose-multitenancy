## mongoose-multitenancy

badges

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