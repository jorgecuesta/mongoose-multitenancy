/*
 Multi-tenancy for Mongoose

 See readme for examples and info
 @author Jorge S. Cuesta <jckpo2@gmail.com>
 @co-author Jeffrey Soriano <jeffreysoriano5@gmail.com>
 */

var mongoose, _, discriminator, modelFn;

mongoose = require('mongoose');

_ = require('lodash');

discriminator = require('./discriminator');
modelFn = require('./model');

const MODEL_DELIMITER = '.';

module.exports = {
    collectionDelimiter: '__',
    connection: mongoose,
    setup: function () {

        var collectionDelimiter, connection, self;
        self = this;
        if (arguments.length === 1 && arguments[0]) {
            if (_.isString(arguments[0])) {
                this.collectionDelimiter = arguments[0];
            } else {
                this.connection = arguments[0];
            }
        }
        if (arguments.length === 2) {
            if (arguments[0] && _.isString(arguments[0])) {
                this.collectionDelimiter = arguments[0];
            } else if (arguments[0]) {
                this.connection = arguments[0];
            }
            if (arguments[1] && _.isString(arguments[1])) {
                this.collectionDelimiter = arguments[1];
            } else if (arguments[1]) {
                this.connection = arguments[1];
            }
        }

        if (this.connection.version !== mongoose.version) {
            console.warn('MULTIPLE VERSIONS OF MONGOOSE CAN GET UNPREDICTABLE ERRORS.');
            console.log('USING', this.connection.version);
        }

        if (this.connection.Model.discriminator !== discriminator) {
            console.warn('REPLACING DEFAULT DISCRIMINATOR TO FORCE MULTITENANCY FUNCTIONALITY.');
            this.connection.Model.discriminator = discriminator;
        }

        if (this.connection.Model.prototype.model !== modelFn) {
            console.warn('WRAPPING DEFAULT mongoose.model TO FORCE MULTITENANCY FUNCTIONALITY.');
            this.connection.Model.prototype.model = modelFn;
        }

        connection = this.connection;
        collectionDelimiter = this.collectionDelimiter;
        connection.mtModel = function (name, schema, collectionName) {
            var args, extendPathWithTenantId, extendSchemaWithTenantId, make, modelName, multitenantSchemaPlugin, parts, precompile, tenantId, tenants;
            precompile = [];

            extendPathWithTenantId = function (tenantId, path) {
                var key, newPath, val, _ref;
                if (path.instance !== 'ObjectID' && path.instance !== connection.Schema.Types.ObjectId) {
                    return false;
                }
                if ((path.options.$tenant == null) || path.options.$tenant !== true) {
                    return false;
                }
                newPath = {
                    type: connection.Schema.Types.ObjectId
                };
                _ref = path.options;
                for (key in _ref) {
                    if (!_ref.hasOwnProperty(key)) continue;
                    val = _ref[key];
                    if (key !== 'type') {
                        newPath[key] = _.clone(val, true);
                    }
                }
                newPath.ref = tenantId + MODEL_DELIMITER + path.options.ref;
                precompile.push(tenantId + MODEL_DELIMITER + path.options.ref);

                return newPath;
            };

            extendSchemaWithTenantId = function (tenantId, schema) {
                var config, newPath, newSchema = this, prop, _ref, isArray;

                _ref = schema.paths;

                for (prop in _ref) {
                    if (!_ref.hasOwnProperty(prop)) continue;

                    config = _ref[prop];

                    isArray = (config.options.type instanceof Array);

                    /**
                     * This is what is searched
                     * {
                     *  user: [{
                     *      type: ObjectId,
                     *      ref: 'User',
                     *      $tenant: true
                     *  }],
                     *  account: {
                     *      type: ObjectId,
                     *      ref: 'Account',
                     *      $tenant: true
                     *  },
                     *  rol: {
                     *      type: ObjectId,
                     *      ref: 'Rol'
                     *  }
                     * }
                     */

                    if (config.schema) {
                        extendSchemaWithTenantId.call(newSchema, tenantId, config.schema);
                    } else {
                        newPath = extendPathWithTenantId(tenantId, isArray ? config.caster : config);
                        if (newPath) {
                            newSchema.path(prop, isArray ? [newPath] : newPath);
                        }
                    }
                }
            };

            multitenantSchemaPlugin = function (schema, options) {
                schema.statics.getTenantId = schema.methods.getTenantId = function () {
                    return this.schema.$tenantId;
                };
                schema.statics.getModel = schema.methods.getModel = function (name) {
                    return connection.mtModel(this.getTenantId() + MODEL_DELIMITER + name);
                };
            };
            make = function (tenantId, modelName) {

                var model, pre, preModelName, tenantCollectionName, tenantModelName, uniq, _i, _len, newSchema,
                    discName, newModel;

                if (connection.mtModel.tenants.indexOf(tenantId) === -1) {
                    connection.mtModel.tenants.push(tenantId);
                }
                // if we already build this model last time only return it.
                tenantModelName = tenantId + MODEL_DELIMITER + modelName;
                if (connection.models[tenantModelName] != null) {
                    return connection.models[tenantModelName];
                }

                model = this.model(modelName);
                tenantCollectionName = tenantId + collectionDelimiter + model.collection.name;

                newSchema = connection.Schema({}, {
                    collection: tenantCollectionName
                });

                extendSchemaWithTenantId.call(newSchema, tenantId, model.schema);

                newSchema.$tenantId = tenantId;
                newSchema.plugin(multitenantSchemaPlugin);

                var newModel = model.discriminator(tenantModelName, newSchema);

                // Prevent duplicated hooks.
                _.forOwn(newModel.hooks, function (value, outerKey) {
                    _.forOwn(newModel.hooks[outerKey], function (val, key) {
                        newModel.hooks[outerKey][key] = _.difference(val, model.hooks[outerKey][key]);
                    })
                });

                if (connection.mtModel.goingToCompile.indexOf(tenantModelName) < 0) {
                    connection.mtModel.goingToCompile.push(tenantModelName);
                }

                if (precompile.length) {
                    uniq = _.uniq(precompile);
                    for (_i = 0, _len = uniq.length; _i < _len; _i++) {
                        pre = uniq[_i];
                        pre = pre.slice(tenantId.length + 1);
                        preModelName = tenantId + collectionDelimiter + pre;
                        if ((connection.models[preModelName] == null) && connection.mtModel.goingToCompile.indexOf(preModelName) < 0) {
                            connection.mtModel(tenantId, pre);
                        }
                    }
                }

                return newModel;
            };
            if (arguments.length === 1) {
                tenants = _.sortBy(connection.mtModel.tenants, function (tenant) {
                    return tenant.length;
                });
                tenants.reverse();
                args = arguments;
                tenantId = _.find(tenants, function (tenant) {
                    return new RegExp('^' + tenant + MODEL_DELIMITER).test(args[0]);
                });
                if (!tenantId) {
                    parts = arguments[0].split(MODEL_DELIMITER);
                    modelName = parts.pop();
                    tenantId = parts.join(MODEL_DELIMITER);

                    return make.call(this, tenantId, modelName);
                } else {
                    modelName = arguments[0].slice(tenantId.length + 1);
                    return make.call(this, tenantId, modelName);
                }

            } else if (arguments.length === 2) {

                if (arguments[1] instanceof connection.Schema || _.isPlainObject(arguments[1])) {
                    return this.model(arguments[0], arguments[1]);
                } else {
                    return make.call(this, arguments[0], arguments[1]);
                }
            } else if (arguments.length === 3) {
                return this.model(arguments[0], arguments[1], arguments[2]);
            } else {
                throw new Error('invalid arguments');
            }
        };
        connection.mtModel.goingToCompile = [];
        connection.mtModel.tenants = [];
        return connection.mtModel.addTenant = function (tenantId) {
            return connection.mtModel.tenants.push(tenantId);
        };
    }
};
