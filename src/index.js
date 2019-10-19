/*
 Multi-tenancy for Mongoose

 See readme for examples and info
 @author Jorge S. Cuesta <jckpo2@gmail.com>
 @co-author Jeffrey Soriano <jeffreysoriano5@gmail.com>
 */
let mongoose, _, discriminator, modelFn, debug,uuidV4 ;

// Dependencies
mongoose = require('mongoose');
_ = require('lodash');
debug = require('debug')('multitenancy');
uuidV4 = require('uuid/v4');

// Modules
discriminator = require('./discriminator');
modelFn = require('./model');

const COLLECTION_DELIMITER = '__',
      MODEL_DELIMITER      = '.';

module.exports = {
  collectionDelimiter: null,
  modelDelimiter: null,
  connection: mongoose,
  setup: function(options) {
    if (!options) options = {};

    if (_.isString(options.collectionDelimiter)) {
      this.collectionDelimiter = options.collectionDelimiter;
    } else this.collectionDelimiter = COLLECTION_DELIMITER;

    if (_.isString(options.modelDelimiter)) {
      this.modelDelimiter = options.modelDelimiter;
    } else this.modelDelimiter = MODEL_DELIMITER;

    if (options.connection) {
      this.connection = options.connection;
    } else this.connection = mongoose;

    debug('model delimiter %o', this.modelDelimiter);

    if (this.connection.version !== mongoose.version) {
      debug(
        [
          'You have more than one Mongoose Version. Be careful to setup',
          'same that you use on this plugin. \n',
          'Current Version: %o',
        ].join(''),
        this.connection.version);
    }

    if (this.connection.Model.discriminator !== discriminator) {
      debug('Replacing default discriminator to ensure this plugin to work');
      this.connection.Model.discriminator = discriminator;
    }

    if (this.connection.Model.prototype.model !== modelFn) {
      debug('Wrapping default mongoose.model to ensure this plugin to work');
      this.connection.Model.prototype.model = modelFn;
    }

    let connection          = this.connection,
        collectionDelimiter = this.collectionDelimiter,
        modelDelimiter      = this.modelDelimiter;

    connection.mtModel = function(name, schema, collectionName) {
      let args, extendPathWithTenantId, extendSchemaWithTenantId, make, fetchModel,
          modelName, multitenantSchemaPlugin, parts, precompile = [], tenantId,
          tenants;

      extendPathWithTenantId = function(tenantId, path) {
        let key, newPath, val, _ref;

        if (path.instance !== 'ObjectID' &&
          path.instance !== connection.Schema.Types.ObjectId) {
          return false;
        }

        if ((path.options.$tenant === null) || path.options.$tenant !== true) {
          return false;
        }

        newPath = {
          type: connection.Schema.Types.ObjectId,
        };

        _ref = path.options;

        for (key in _ref) {
          if (!_ref.hasOwnProperty(key)) continue;

          val = _ref[key];

          if (key !== 'type') {
            newPath[key] = _.clone(val, true);
          }
        }

        newPath.ref = tenantId + modelDelimiter + path.options.ref;
        precompile.push(tenantId + modelDelimiter + path.options.ref);

        return newPath;
      };

      extendSchemaWithTenantId = function(tenantId, schema) {
        let config, newPath, newSchema = this, prop, _ref, isArray;

        _ref = schema.paths;

        for (prop in _ref) {
          if (!_ref.hasOwnProperty(prop)) continue;

          config = _ref[prop];

          isArray = (config.options.type instanceof Array);

          /*
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
            newPath = extendPathWithTenantId(tenantId,
              isArray ? config.caster : config);
            if (newPath) {
              newSchema.path(prop, isArray ? [newPath] : newPath);
            }
          }
        }
      };

      multitenantSchemaPlugin = function(schema) {
        schema.statics.getTenantId = schema.methods.getTenantId = function() {
          return this.schema.$tenantId;
        };
        schema.statics.getModel = schema.methods.getModel = function(name) {
          return connection.mtModel(
            this.getTenantId() + modelDelimiter + name);
        };
      };

      fetchModel = function(tenantModel,options = null){

        tenants = _.sortBy(connection.mtModel.tenants, function (tenant) {
          return tenant.length;
        });

        tenants.reverse();
        args = arguments;

        tenantId = _.find(tenants, function (tenant) {
          return new RegExp('^' + tenant + modelDelimiter).test(args[0]);
        });

        if (!tenantId) {
          parts = tenantModel.split(modelDelimiter);
          modelName = parts.pop();
          tenantId = parts.join(modelDelimiter);
          return make.call(this, tenantId, modelName,options);
        } else {
          modelName = arguments[0].slice(tenantId.length + 1);
          return make.call(this, tenantId, modelName,options);
        }
      };

      make = function(tenantId, modelName, options = null) {
        let model, pre, preModelName, tenantCollectionName, tenantModelName,
            uniq, _i, _len, newSchema, newModel;

        if (connection.mtModel.tenants.indexOf(tenantId) === -1) {
          connection.mtModel.tenants.push(tenantId);
        }

        // if we already build this model last time only return it.
        tenantModelName = tenantId + modelDelimiter + modelName;
        if (connection.models[tenantModelName]) {
          return connection.models[tenantModelName];
        }

        model = this.model(modelName);
        tenantCollectionName = tenantId + collectionDelimiter +
          model.collection.name;

        
        if(options != null){
          switch (options.id){
            case 'String':
                newSchema = new connection.Schema({_id: { type: String, default: uuidV4 }}, {
                  collection: tenantCollectionName,
                });
                break;
            case 'Number':
                newSchema = new connection.Schema({_id: { type: Number}}, {
                  collection: tenantCollectionName, 
                });
                break;
          }
        } else {
        newSchema = new connection.Schema({}, {
          collection: tenantCollectionName,
        });
      }

        extendSchemaWithTenantId.call(newSchema, tenantId, model.schema);

        newSchema.$tenantId = tenantId;
        newSchema.plugin(multitenantSchemaPlugin);

        newModel = model.discriminator(tenantModelName, newSchema);

        // Prevent duplicated hooks.
        _.forOwn(newModel.hooks, function(value, outerKey) {
          _.forOwn(newModel.hooks[outerKey], function(val, key) {
            newModel.hooks[outerKey][key] = _.difference(val,
              model.hooks[outerKey][key]);
          });
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

            if ((connection.models[preModelName] === null) &&
              connection.mtModel.goingToCompile.indexOf(preModelName) < 0) {
              connection.mtModel(tenantId, pre);
            }
          }
        }

        return newModel;
      };

      if (arguments.length === 1) {
        return fetchModel.call(this,arguments[0]);
      } else if (arguments.length === 2) {
        if(arguments[1].id && (arguments[1].id === 'String' || arguments[1].id === 'Number')){
          return fetchModel.call(this,arguments[0],arguments[1]);
        } else if (arguments[1] instanceof connection.Schema ||
          _.isPlainObject(arguments[1])) {
          let baseSchema, model, schema = arguments[1];

          if (arguments[1].options.tenantPlugins) {
            baseSchema = schema.clone();
            baseSchema.virtuals = schema.virtuals;
            schema.options.tenantPlugins.forEach(function(plugin) {
              schema.plugin(plugin.register, plugin.options);
            });
          }

          model = this.model(arguments[0], schema);
          model.baseSchema = baseSchema;
          return model;
         
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

    return connection.mtModel.addTenant = function(tenantId) {
      return connection.mtModel.tenants.push(tenantId);
    };
  },
};
