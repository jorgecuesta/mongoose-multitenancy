let dbURI        = 'mongodb://localhost/tenant',
    chai         = require('chai'),
    expect       = chai.expect,
    async        = require('async'),
    mongoose     = require('mongoose'),
    multitenancy = require('../src/index'),
    clearDB      = require('mocha-mongoose')(dbURI),
    LogSchema, FooSchema;

describe('Multitenancy', function() {

  before(function() {
    multitenancy.setup({
      connection: mongoose,
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

    mongoose.mtModel('Log', LogSchema);
    mongoose.mtModel('Foo', FooSchema);
  });

  beforeEach(function(done) {
    if (mongoose.connection.db) return done();

    mongoose.connect(dbURI, done);
  });

  it('Should create model for different tenants', function(done) {
    var LogTenant1 = mongoose.mtModel('tenant1.Log'),
        LogTenant2 = mongoose.mtModel('tenant2.Log');

    // Model can be read.
    expect(LogTenant1).to.exist;
    expect(LogTenant2).to.exist;

    // Statics getTenantId return right values.
    expect(LogTenant1.getTenantId()).to.be.equal('tenant1');
    expect(LogTenant2.getTenantId()).to.be.equal('tenant2');

    // Static getModel return right models.
    expect(LogTenant1.getModel('Log')).to.be.equal(LogTenant1);
    expect(LogTenant2.getModel('Log')).to.be.equal(LogTenant2);

    done();
  });

  it('Should create docs in different collections', function(finish) {
    var LogTenant1 = mongoose.mtModel('tenant1.Log'),
        LogTenant2 = mongoose.mtModel('tenant2.Log');

    async.parallel([
      function createTenant1(done) {
        LogTenant1.create({
          entry: 'Log on tenant 1',
          user: {
            username: 'foo@bar.io',
          },
        }, function(error, log) {
          expect(error).to.not.exist;
          expect(log).to.be.a('object');
          expect(log.entry).to.be.equal('Log on tenant 1');
          expect(log.user).to.be.a('object');
          expect(log.user).
            to.
            have.
            property('username').
            that.
            is.
            an('string').
            that.
            is.
            equal('foo@bar.io');
          expect(log.collection.collectionName).to.be.equal('tenant1__logs');
          done(null, true);
        });
      },
      function createTenant2(done) {
        LogTenant2.create({
          entry: 'Log on tenant 2',
          user: {
            username: 'bar@simpson.io',
          },
        }, function(error, log) {
          expect(error).to.not.exist;
          expect(log).to.be.a('object');
          expect(log.entry).to.be.equal('Log on tenant 2');
          expect(log.user).to.be.a('object');
          expect(log.user).
            to.
            have.
            property('username').
            that.
            is.
            an('string').
            that.
            is.
            equal('bar@simpson.io');
          expect(log.collection.collectionName).to.be.equal('tenant2__logs');
          done(null, true);
        });
      },
    ], function onTenantCreationComplete(error, results) {
      expect(error).to.not.exist;

      var valid = results.every(function(v) {
        return v;
      });

      expect(valid).to.be.true;

      async.parallel([
        function countLogsTenant1(done) {
          LogTenant1.count(function(error, count) {
            expect(error).to.not.exist;
            expect(count).to.be.equal(1);
            done(null, true);
          });
        },
        function countLogsTenant2(done) {
          LogTenant2.count(function(error, count) {
            expect(error).to.not.exist;
            expect(count).to.be.equal(1);
            done(null, true);
          });
        },
      ], function(error, results) {
        expect(error).to.not.exist;

        var valid = results.every(function(v) {
          return v;
        });

        expect(valid).to.be.true;

        finish();
      });
    });
  });

  it('Should return models with right tenant using Model.model methodology.',
    function(finish) {
      var Log = mongoose.mtModel('a.Log'),
          Foo = mongoose.mtModel('a.Foo');

      expect(Foo).to.be.equal(Log.model('Foo'));
      expect(Log).to.be.equal(Foo.model('Log'));

      finish();
    });

  it('Should return model with right tenant using document.model methodology',
    function(finish) {
      var Log = mongoose.mtModel('b.Log');

      Log.create({
        entry: 'Log on tenant 1',
        user: {
          username: 'foo@bar.io',
        },
      }, function(error, document) {
        expect(error).to.not.exist;

        var Foo = document.model('Foo');

        expect(Foo).to.exist;

        Foo.create({text: 'a'}, function(error, fooDoc) {
          expect(error).to.not.exist;
          expect(fooDoc).to.exist;

          expect(fooDoc.text).to.be.a('string');
          expect(fooDoc.text).to.be.equal('a');

          fooDoc.model('Foo').find({text: 'a'}, function(error, docs) {
            expect(error).to.not.exist;
            expect(docs).to.be.a('array');
            expect(docs.length).to.be.equal(1);
            expect(docs[0].text).to.be.equal('a');
            finish();
          });
        });
      });
    });

  it('can clear the DB on demand', function(done) {
    clearDB(function(err) {
      done(err);
    });
  });
});

