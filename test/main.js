let mongoose = require('mongoose');

describe('Test Suite', function() {

  describe('Tenant Commons', function() {
    require('./tenant');
  });

  describe('Model Concurrency', function() {
    require('./concurrency');
  });

  describe('Model Population', function() {
    require('./population');
  });

  describe('Model With locale plugin', function() {
    require('./locale');
  });

  describe('Model Delimiter', function() {
    require('./modelDelimiter');
  });
});
