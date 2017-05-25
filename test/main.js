let mongoose = require('mongoose');

describe('Test Suite', function() {

  describe('Tenant Commons', function() {
    require('./tenant');
    after(function() {
      mongoose._models = {};
    });
  });

  describe('Model Delimiter', function() {
    after(function() {
      mongoose._models = {};
    });
    require('./modelDelimiter');
  });
});
