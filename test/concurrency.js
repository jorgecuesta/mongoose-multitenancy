/**
 * Created by jorgecuesta on 6/6/16.
 */
var dbURI = 'mongodb://localhost/tenant',
    chai = require('chai'),
    expect = chai.expect,
    async = require('async'),
    mongoose = require('mongoose'),
    multitenancy = require('../src/index'),
    clearDB = require('mocha-mongoose')(dbURI);

multitenancy.setup();

var DummySchema = new mongoose.Schema({
    entry: {
        type: String,
        required: true
    }
});

mongoose.mtModel('Dummy', DummySchema);

describe('Multitenancy', function () {

    beforeEach(function (done) {
        if (mongoose.connection.db) return done();

        mongoose.connect(dbURI, done);
    });

    it('Should not break', function (finish) {
        var fn, tasks = [];

        const TOTAL = 20;

        fn = function (done) {
            "use strict";
            var model = mongoose.mtModel('tenant1.Dummy');

            expect(model).to.exist;
            expect(model.getTenantId()).to.be.equal('tenant1');
            expect(model.collection.collectionName).to.be.equal('tenant1__dummies');

            model.create({
                entry: 'Foo'
            }, done);
        };

        for (var i = 0; i < TOTAL; i++) {
            tasks.push(fn.bind(i));
        }

        async.parallel(tasks, function (error, results) {
            expect(error).to.not.exist;
            expect(results).to.be.instanceof(Array);
            expect(results.length).to.be.equal(TOTAL);

            var model = mongoose.mtModel('tenant1.Dummy');

            model.count(function(error, count){
                expect(error).to.not.exist;
                expect(count).to.be.a('number');
                expect(count).to.be.equal(TOTAL);

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

