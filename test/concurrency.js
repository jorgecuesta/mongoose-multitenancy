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

var LogSchema = new mongoose.Schema({
    entry: {
        type: String,
        required: true
    }
});

mongoose.mtModel('Log', LogSchema);

describe('Multitenancy', function () {

    beforeEach(function (done) {
        if (mongoose.connection.db) return done();

        mongoose.connect(dbURI, done);
    });

    it('Should not break', function (finish) {
        var fn, tasks = [];

        fn = function (done) {
            "use strict";
            var model = mongoose.mtModel('tenant1.Log');

            expect(model).to.exist;
            expect(model.getTenantId()).to.be.equal('tenant1');
            expect(model.collection.collectionName).to.be.equal('tenant1__logs');

            model.create({
                entry: 'Foo'
            }, done);
        };

        for (var i = 0; i < 200; i++) {
            tasks.push(fn.bind(i));
        }

        async.parallel(tasks, function (error, results) {
            expect(error).to.not.exist;
            expect(results).to.be.instanceof(Array);
            expect(results.length).to.be.equal(200);

            var model = mongoose.mtModel('tenant1.Log');

            model.count(function(error, count){
                expect(error).to.not.exist;
                expect(count).to.be.a('number');
                expect(count).to.be.equal(200);

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

