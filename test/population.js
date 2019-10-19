/**
 * Created by jorgecuesta on 6/6/16.
 */
/**
 * Created by jorgecuesta on 3/6/16.
 */
var dbURI        = 'mongodb://localhost/tenant',
    chai         = require('chai'),
    expect       = chai.expect,
    async        = require('async'),
    mongoose     = require('mongoose'),
    multitenancy = require('../src/index'),
    clearDB      = require('mocha-mongoose')(dbURI),
    ObjectId     = mongoose.Schema.Types.ObjectId;

describe('Multitenancy', function() {
  before(function() {
    multitenancy.setup();

    var ASchema = new mongoose.Schema({
      text: String,
      b: {type: ObjectId, ref: 'B', $tenant: true},
    }), BSchema = new mongoose.Schema({
      text: String,
      c: [{type: ObjectId, ref: 'C', $tenant: true}],
    }), CSchema = new mongoose.Schema({
      text: String,
      a: {type: ObjectId, ref: 'A', $tenant: true},
    });

    mongoose.mtModel('A', ASchema);
    mongoose.mtModel('B', BSchema);
    mongoose.mtModel('C', CSchema);
  });

  beforeEach(function(done) {
    if (mongoose.connection.db) return done();

    mongoose.connect(dbURI, done);
  });

  it(
    'Should create different models for same tenant with Reference between models. A -> B -> C -> A',
    function(done) {
      var ATenant1 = mongoose.mtModel('tenant1.A'),
          BTenant1 = mongoose.mtModel('tenant1.B'),
          CTenant1 = mongoose.mtModel('tenant1.C');

      // Model can be read.
      expect(ATenant1).to.exist;
      expect(BTenant1).to.exist;
      expect(CTenant1).to.exist;

      // Statics getTenantId return right values.
      expect(ATenant1.getTenantId()).to.be.equal('tenant1');
      expect(BTenant1.getTenantId()).to.be.equal('tenant1');
      expect(CTenant1.getTenantId()).to.be.equal('tenant1');

      // Static getModel return right models.
      expect(ATenant1.getModel('A')).to.be.equal(ATenant1);
      expect(BTenant1.getModel('B')).to.be.equal(BTenant1);
      expect(CTenant1.getModel('C')).to.be.equal(CTenant1);

      done();
    });

  it('Should create documents of each model without errors (no referenced)',
    function(finish) {
      var ATenant1 = mongoose.mtModel('tenant1.A'),
          BTenant1 = mongoose.mtModel('tenant1.B'),
          CTenant1 = mongoose.mtModel('tenant1.C');

      async.auto({
        a: function createA(done) {
          ATenant1.create({
            text: 'a',
          }, function(error, a) {
            expect(error).to.not.exist;
            expect(a).to.be.a('object');
            done(null, a);
          });
        },
        b: function createB(done) {
          BTenant1.create({
            text: 'b',
          }, function(error, b) {
            expect(error).to.not.exist;
            expect(b).to.be.a('object');
            done(null, b);
          });
        },
        c: function createC(done) {
          CTenant1.create({
            text: 'c',
          }, function(error, c) {
            expect(error).to.not.exist;
            expect(c).to.be.a('object');
            done(null, c);
          });
        },
      }, function onTenantCreationComplete(error, results) {
        expect(error).to.not.exist;

        var valid = Object.keys(results).every(function(key) {
          return (results[key]);
        });
        // all records on each results array position.q
        expect(valid).to.be.true;

        var a = results.a, b = results.b, c = results.c;

        async.auto({
          a_b: function(done) {
            a.b = b._id;
            a.save(done);
          },
          b_c: [
            'a_b', function(results, done) {
              b.c = c._id;
              b.save(done);
            },
          ],
          c_a: [
            'b_c', function(results, done) {
              c.a = a._id;
              c.save(done);
            },
          ],
        }, 1, function(error, results) {
          expect(error).to.not.exist;

          async.parallel([
            function(finish) {
              var ATenant1 = mongoose.mtModel('tenant1.A');

              ATenant1.find({}, function(error, as) {
                expect(error).to.not.exist;

                as[0].populate('b', function(error, a) {
                  expect(error).to.not.exist;
                  expect(a.populated('b')).to.exist;
                  finish();
                });
              });
            },
            function(finish) {
              var BTenant1 = mongoose.mtModel('tenant1.B');

              BTenant1.find({}, function(error, bs) {
                expect(error).to.not.exist;

                bs[0].populate('c', function(error, b) {
                  expect(error).to.not.exist;
                  expect(b.populated('c')).to.exist;
                  finish();
                });
              });
            },
            function(finish) {
              var CTenant1 = mongoose.mtModel('tenant1.C');

              CTenant1.find({}, function(error, cs) {
                expect(error).to.not.exist;

                cs[0].populate('a', function(error, c) {
                  expect(error).to.not.exist;
                  expect(c.populated('a')).to.exist;
                  finish();
                });
              });
            },
          ], function(error, results) {
            expect(error).to.not.exist;

            finish();
          });
        });
      });
    });

  after(function(done) {
    clearDB(function(err) {
      done(err);
    });
  });
});

