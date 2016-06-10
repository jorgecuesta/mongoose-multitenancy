/**
 * Created by jorgecuesta on 6/6/16.
 */
var dbURI = 'mongodb://localhost/concurrency',
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

var BarSchema = new mongoose.Schema({
    text: String
});

mongoose.mtModel('Dummy', DummySchema);
mongoose.mtModel('Bar', BarSchema);

describe('Multitenancy', function () {

    beforeEach(function (done) {
        if (mongoose.connection.db) return done();

        mongoose.connect(dbURI, done);
    });

    it('Should not break', function (finish) {
        this.slow(200);

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

    it('Read models from models.', function(finish){
        this.slow(200);
        var fn, tasks = [];

        const TOTAL = 20;

        fn = function (done) {
            "use strict";
            var Dummy = mongoose.mtModel('a.Dummy'),
                Bar = mongoose.mtModel('a.Bar');

            expect(Bar).to.be.equal(Dummy.model('Bar'));
            expect(Dummy).to.be.equal(Bar.model('Dummy'));

            done();
        };

        for (var i = 0; i < TOTAL; i++) {
            tasks.push(fn.bind(i));
        }

        async.parallel(tasks, function (error, results) {
            expect(error).to.not.exist;
            expect(results).to.be.instanceof(Array);
            expect(results.length).to.be.equal(TOTAL);

            finish();
        });
    });

    it('Should return model with right tenant using document.model methodology', function (finish) {
        var fn, tasks = [];

        const TOTAL = 20;

        fn = function (done) {
            "use strict";
            mongoose.mtModel('b.Dummy').create({
                entry: 'b'
            }, function (error, document) {
                expect(error).to.not.exist;

                var Bar = document.model('Bar');

                expect(Bar).to.exist;

                Bar.create({text: 'b'}, function (error, barDoc) {
                    expect(error).to.not.exist;
                    expect(barDoc).to.exist;

                    expect(barDoc.text).to.be.a('string');
                    expect(barDoc.text).to.be.equal('b');

                    barDoc.model('Dummy').find({entry: 'b'}, function (error, docs) {
                        expect(error).to.not.exist;
                        expect(docs).to.be.a('array');
                        expect(docs.length).to.be.equal(TOTAL);
                        expect(docs[0].entry).to.be.equal('b');

                        docs[0].model('Bar').find({text: 'b'}, function (error, docs) {
                            expect(error).to.not.exist;
                            expect(docs).to.be.a('array');
                            expect(docs.length).to.be.equal(TOTAL);
                            expect(docs[0].text).to.be.equal('b');

                            done();
                        });
                    });
                });
            });
        };

        for (var i = 0; i < TOTAL; i++) {
            tasks.push(fn.bind(i));
        }

        async.parallel(tasks, function (error, results) {
            expect(error).to.not.exist;
            expect(results).to.be.instanceof(Array);
            expect(results.length).to.be.equal(TOTAL);

            finish();
        });


    });

    it("can clear the DB on demand", function (done) {
        clearDB(function (err) {
            done(err);
        });
    });
});

