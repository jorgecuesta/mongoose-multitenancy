/**
 * Created by jorgecuesta on 6/6/16.
 */
/**
 * Created by jorgecuesta on 3/6/16.
 */
var dbURI = 'mongodb://localhost/tenant',
    should = require('chai').should(),
    async = require('async'),
    mongoose = require('mongoose'),
    multitenancy = require('../src/index'),
    clearDB = require('mocha-mongoose')(dbURI);

multitenancy.setup();

var LogSchema = new mongoose.Schema({
    entry: String,
    date: {
        type: Date,
        default: Date.now
    }
});

mongoose.mtModel('Log', LogSchema);

describe('Multitenancy', function () {

    beforeEach(function (done) {
        if (mongoose.connection.db) return done();

        mongoose.connect(dbURI, done);
    });

    it('Should create model for different tenants', function (done) {
        var LogTenant1 = mongoose.mtModel('tenant1.Log'), LogTenant2 = mongoose.mtModel('tenant2.Log');

        LogTenant1.getTenantId().should.equal('tenant1');
        LogTenant2.getTenantId().should.equal('tenant2');

        done();
    });

    it('Should create docs in different collections', function (finish) {
        var LogTenant1 = mongoose.mtModel('tenant1.Log'), LogTenant2 = mongoose.mtModel('tenant2.Log');

        async.parallel([
            function createTenant1(done) {
                LogTenant1.create({
                    entry: 'Log on tenant 1'
                }, function (error, log) {
                    (error === null).should.be.true;
                    log.entry.should.equal('Log on tenant 1');
                    done(null, true);
                });
            },
            function createTenant2(done) {
                LogTenant2.create({
                    entry: 'Log on tenant 2'
                }, function (error, log) {
                    (error === null).should.be.true;
                    log.entry.should.equal('Log on tenant 2');
                    done(null, true);
                });
            }
        ], function onTenantCreationComplete(error, results) {
            (error === null).should.be.true;
            results.every(function (v) {
                return v
            }).should.ok;

            async.parallel([
                function countLogsTenant1(done) {
                    LogTenant1.count(function (error, count) {
                        (error === null).should.be.true;
                        count.should.equal(1);
                        done(null, true);
                    });
                },
                function countLogsTenant2(done) {
                    LogTenant2.count(function (error, count) {
                        (error === null).should.be.true;
                        count.should.equal(1);
                        done(null, true);
                    });
                }
            ], function (error, results) {
                (error === null).should.be.true;
                results.every(function (v) {
                    return v
                }).should.ok;

                finish();
            });
        });
    });

    it("can clear the DB on demand", function (done) {
        clearDB(function (err) {
            done(err);
        });
    });
});

