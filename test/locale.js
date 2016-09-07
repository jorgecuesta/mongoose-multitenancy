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

var LocaleSchema = new mongoose.Schema({
    text: {
        type: String,
        locale: true,
        required: true
    }
});

LocaleSchema.plugin(locale, {
    recursive: false
});

mongoose.mtModel('Locale', LocaleSchema);

describe('MultitenancyLocale', function () {

    beforeEach(function (done) {
        if (mongoose.connection.db) return done();

        mongoose.connect(dbURI, done);
    });

    it('Should create model for different tenants', function (done) {


        var LocaleTenant1 = mongoose.mtModel('tenant1.Locale');

        // Model can be read.
        expect(LocaleTenant1).to.exist;

        // Statics getTenantId return right values.
        expect(LocaleTenant1.getTenantId()).to.be.equal('tenant1');

        // Static getModel return right model.
        expect(LocaleTenant1.getModel('Locale')).to.be.equal(LocaleTenant1);

        done();
    });

    it('Should create doc', function (finish) {
        var LocaleTenant1 = mongoose.mtModel('tenant1.Locale');

        LocaleTenant1.create({
            text: [{lg: 'en-US', value: 'Locale on tenant 1'}]
        }, function (error, foo) {
            expect(error).to.not.exist;
            expect(foo).to.be.a('object');
            expect(foo.getPropertyLocalised('text', 'en-US')).to.be.equal('Locale on tenant 1');
            expect(foo.collection.collectionName).to.be.equal('tenant1__locales');

            finish();
        });

    });

    it("can clear the DB on demand", function (done) {
        clearDB(function (err) {
            done(err);
        });
    });
});

