/**
 * Created by jorgecuesta on 6/6/16.
 */
/**
 * Created by jorgecuesta on 3/6/16.
 */
var dbURI = 'mongodb://localhost/tenant',
    chai = require('chai'),
    expect = chai.expect,
    async = require('async'),
    mongoose = require('mongoose'),
    multitenancy = require('../src/index'),
    clearDB = require('mocha-mongoose')(dbURI),
    locale = require('mongoose-locale');

multitenancy.setup();

var FooSchema = new mongoose.Schema({
    text: {
        type: String,
        locale: true,
        required: true
    }
});

FooSchema.plugin(locale, {
    recursive: false
});

mongoose.mtModel('Foo', FooSchema);

describe('MultitenancyLocale', function () {

    beforeEach(function (done) {
        if (mongoose.connection.db) return done();

        mongoose.connect(dbURI, done);
    });

    it('Should create model for different tenants', function (done) {
        var FooTenant1 = mongoose.mtModel('tenant1.Foo');

        // Model can be read.
        expect(FooTenant1).to.exist;

        // Statics getTenantId return right values.
        expect(FooTenant1.getTenantId()).to.be.equal('tenant1');

        // Static getModel return right model.
        expect(FooTenant1.getModel('Foo')).to.be.equal(FooTenant1);

        done();
    });

    it('Should create doc', function (finish) {
        var FooTenant1 = mongoose.mtModel('tenant1.Foo');

        FooTenant1.create({
            text: [{lg: 'en-US', value: 'Foo on tenant 1'}]
        }, function (error, foo) {
            expect(error).to.not.exist;
            expect(foo).to.be.a('object');
            expect(foo.getPropertyLocalised('text', 'en-US')).to.be.equal('Foo on tenant 1');
            expect(foo.collection.collectionName).to.be.equal('tenant1__foos');

            finish();
        });

    });

    it("can clear the DB on demand", function (done) {
        clearDB(function (err) {
            done(err);
        });
    });
});

