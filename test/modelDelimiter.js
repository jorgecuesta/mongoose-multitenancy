let dbURI        = 'mongodb://localhost/tenant',
    chai         = require('chai'),
    expect       = chai.expect,
    async        = require('async'),
    mongoose     = require('mongoose'),
    multitenancy = require('../src/index'),
    clearDB      = require('mocha-mongoose')(dbURI),
    LogSchema, FooSchema;

const MODEL_DELIMITER = '_';

describe('Multitenancy', function() {

  before(function() {
    multitenancy.setup({
      connection: mongoose,
      modelDelimiter: MODEL_DELIMITER,
    });

    LogSchema = new mongoose.Schema({
      entry: {
        type: String,
        required: true,
      },
      user: {
        type: new mongoose.Schema({
          username: {
            type: String,
            required: true,
          },
        }),
      },
    });

    FooSchema = new mongoose.Schema({
      text: String,
    });

    mongoose.mtModel('ShortLog', LogSchema);
    mongoose.mtModel('DogFoo', FooSchema);
  });

  beforeEach(function(done) {
    mongoose._models = {};

    if (mongoose.connection.db) return done();

    mongoose.connect(dbURI, done);
  });

  it('Should create model for different tenants with different model delimiter',
    function(done) {
      let LogTenant1 = mongoose.mtModel('tenant1_ShortLog'),
          LogTenant2 = mongoose.mtModel('tenant2_ShortLog');

      // Model can be read.
      expect(LogTenant1).to.exist;
      expect(LogTenant2).to.exist;

      // Statics getTenantId return right values.
      expect(LogTenant1.getTenantId()).to.be.equal('tenant1');
      expect(LogTenant2.getTenantId()).to.be.equal('tenant2');

      // Static getModel return right models.
      expect(LogTenant1.getModel('ShortLog')).to.be.equal(LogTenant1);
      expect(LogTenant2.getModel('ShortLog')).to.be.equal(LogTenant2);

      done();
    });

  it('can clear the DB on demand', function(done) {
    clearDB(function(err) {
      done(err);
    });
  });
});

