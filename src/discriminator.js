/**
 * Created by jorgecuesta on 6/6/16.
 */
let mongoose = require('mongoose'),
    utils    = require('mongoose/lib/utils');

mongoose.Model.discriminator = function discriminator(name, schema) {
  // Using this because if you want register tenant plugins we need know
  // base schema before register same plugin to root level model.
  // This baseSchema is just an schema.clone() native of mongoose.
  // Is set on mongoose.mtModel('Foo', schema);
  let baseSchema = this.baseSchema ? this.baseSchema : this.schema;

  if (!(schema && schema.instanceOfSchema)) {
    throw new Error('You must pass a valid discriminator Schema');
  }

  if (baseSchema.discriminatorMapping &&
    !baseSchema.discriminatorMapping.isRoot) {
    throw new Error('Discriminator "' + name +
      '" can only be a discriminator of the root model');
  }

  let key = baseSchema.options.discriminatorKey;
  if (schema.path(key)) {
    throw new Error('Discriminator "' + name +
      '" cannot have field with name "' + key + '"');
  }

  function clean(a, b) {
    a = utils.clone(a);
    b = utils.clone(b);
    delete a.toJSON;
    delete a.toObject;
    delete b.toJSON;
    delete b.toObject;
    // Prevent errors by collection option.
    delete a.collection;
    delete b.collection;
    delete a._id;
    delete b._id;

    if (!utils.deepEqual(a, b)) {
      throw new Error('Discriminator options are not customizable ' +
        '(except toJSON, toObject, _id)');
    }
  }

  function merge(schema, baseSchema) {
    utils.merge(schema, baseSchema);

    var obj = {};
    obj[key] = {type: String, default: name};
    schema.add(obj);
    schema.discriminatorMapping = {key: key, value: name, isRoot: false};

    var col = schema.options.collection || baseSchema.options.collection;

    // Prevent baseSchema collection name override on new schema.
    // if (baseSchema.options.collection && !schema.options.collection) {
    //   schema.options.collection = baseSchema.options.collection;
    // }

    // throws error if options are invalid
    clean(schema.options, baseSchema.options);

    var toJSON = schema.options.toJSON;
    var toObject = schema.options.toObject;
    var _id = schema.options._id;

    schema.options = utils.clone(baseSchema.options);

    if (toJSON) schema.options.toJSON = toJSON;
    if (toObject) schema.options.toObject = toObject;

    // Set collection again or add new collection name.
    schema.options.collection = col;

    if (typeof _id !== 'undefined') {
      schema.options._id = _id;
    }

    schema.callQueue = baseSchema.callQueue.concat(
      schema.callQueue.slice(schema._defaultMiddleware.length));
    schema._requiredpaths = undefined; // reset just in case
                                       // Schema#requiredPaths() was called on
                                       // either schema
  }

  // merges base schema into new discriminator schema and sets new type field.
  merge(schema, baseSchema);

  if (!this.discriminators) {
    this.discriminators = {};
  }

  if (!baseSchema.discriminatorMapping) {
    baseSchema.discriminatorMapping = {key: key, value: null, isRoot: true};
  }

  if (this.discriminators[name]) {
    throw new Error('Discriminator with name "' + name + '" already exists');
  }
  if (this.db.models[name]) {
    throw new mongoose.MongooseError.OverwriteModelError(name);
  }

  // Use schema collection name set on merge process.
  this.discriminators[name] = this.db.model(name, schema,
    schema.options.collection);
  this.discriminators[name].prototype.__proto__ = this.prototype;
  Object.defineProperty(this.discriminators[name], 'baseModelName', {
    value: this.modelName,
    configurable: true,
    writable: false,
  });

  // apply methods and statics
  applyMethods(this.discriminators[name], schema);
  applyStatics(this.discriminators[name], schema);

  return this.discriminators[name];
};

/*
 * Register methods for this model
 *
 * @param {Model} model
 * @param {Schema} schema
 */
var applyMethods = function(model, schema) {
  function apply(method, schema) {
    Object.defineProperty(model.prototype, method, {
      get: function() {
        var h = {};
        for (var k in schema.methods[method]) {
          h[k] = schema.methods[method][k].bind(this);
        }
        return h;
      },
      configurable: true,
    });
  }

  for (var method in schema.methods) {
    if (typeof schema.methods[method] === 'function') {
      model.prototype[method] = schema.methods[method];
    } else {
      apply(method, schema);
    }
  }
};

/*
 * Register statics for this model
 * @param {Model} model
 * @param {Schema} schema
 */
var applyStatics = function(model, schema) {
  for (var i in schema.statics) {
    model[i] = schema.statics[i];
  }
};

module.exports = mongoose.Model.discriminator;
