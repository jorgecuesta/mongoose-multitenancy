/**
 * Created by jorgecuesta on 10/6/16.
 */
var mongoose = require('mongoose');

/**
 * Returns another Model instance.
 *
 * ####Example:
 *
 *     var doc = new Tank;
 *     doc.model('User').findById(id, callback);
 *
 * @param {String} name model name
 * @api public
 */

mongoose.Model.prototype.model = function model(name) {
    var self = this;

    // check if model incoming be working under multi tenant approach.
    if(self.$tenantId && self.getModel && typeof self.getModel === 'function'){
        // in this case return a tenancy model. ;)
        return self.getModel(name);
    }

    // Sometimes self has a bad assignation and be Global scope, for this reason
    // we assign mongoose as self an try to return required model.
    if(!self.db){
        self = mongoose;

        return self.model(name);
    }

    // Normal flow should return model as is.
    return this.db.model(name);
};