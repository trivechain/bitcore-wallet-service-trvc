'use strict';

var _ = require('lodash');
var $ = require('preconditions').singleton();
var async = require('async');
var log = require('npmlog');
log.debug = log.verbose;
var request = require('request');
var LZString = require('./lzstring');

var Common = require('./common');
var Defaults = Common.Defaults;

var Storage = require('./storage');
var Model = require('./model');

function BizAppService() { };

BizAppService.prototype.init = function (opts, cb) {
    var self = this;

    opts = opts || {};

    self.request = opts.request || request;
    self.providerAddress = opts.providerAddress || "";

    async.parallel([

        function (done) {
            if (opts.storage) {
                self.storage = opts.storage;
                done();
            } else {
                self.storage = new Storage();
                self.storage.connect(opts.storageOpts, done);
            }
        },
    ], function (err) {
        if (err) {
            log.error(err);
        }
        return cb(err);
    });
};

function convert_formated_hex_to_bytes(hex_str) {
    var count = 0,
        hex_arr,
        hex_data = [],
        hex_len,
        i;
    
    if (hex_str.trim() == "") return [];
    
    /// Check for invalid hex characters.
    if (/[^0-9a-fA-F\s]/.test(hex_str)) {
      return false;
    }
    
    hex_arr = hex_str.split(/([0-9a-fA-F]+)/g);
    hex_len = hex_arr.length;
    
    for (i = 0; i < hex_len; ++i) {
      if (hex_arr[i].trim() == "") {
        continue;
      }
      hex_data[count++] = parseInt(hex_arr[i], 16);
    }
    
    return hex_data;
  }
function convert_formated_hex_to_string(s) {
    var byte_arr = convert_formated_hex_to_bytes(s);
    var res = "";
    for (var i = 0 ; i<byte_arr.length ; i+=2) {
      res += String.fromCharCode(byte_arr[i] | (byte_arr[i+1]<<8));
    }
    return res;
  }

function extractBizApp(asm, name)
{
    let result = false;
    /*[{
        "d": "Air Asia Sdn Bhd",
        "a": "yh8yEwdsNzkicunRBGYfFenzhPc4d6mdxx",
        "i": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/AirAsia_New_Logo.svg/150px-AirAsia_New_Logo.svg.png",
        "s": "The AirAsia Loyalty Programme"
    }]*/
    const regex = /OP_RETURN 23626123(.*?)23(.*)/g;
    const regResults = regex.exec(asm);
    
    if(regResults.length == 3)
    {
        const app_name = Buffer.from(regResults[1], 'hex').toString('utf8');
        if(app_name.toLowerCase().indexOf(name.toLowerCase()) >= 0)
        {
            const compressed = regResults[2].match(/.{1,2}/g).join(" ");
            const decompressed = LZString.decompress(convert_formated_hex_to_string(compressed));
            if(decompressed)
            {
                let obj = JSON.parse(decompressed);
                if(obj)
                {
                    obj.n = app_name;
                    result = obj;
                }
            }
        }
    }

    return result;
}

BizAppService.prototype.getApps = function (opts, cb) {
    var self = this;

    $.shouldBeFunction(cb);

    opts = opts || {};
    opts.bc.getTransactionsWithAsm([opts.repo], 0, 0, function (err, transactions) {
        if (err) return cb(err, null);
        let results = [];
        for(let i = 0; i < transactions.length; i++)
        {
            try
            {
                let tx = transactions[i];
                let app = extractBizApp(tx.vout[0].scriptPubKey.asm, opts.name);
                if(app)
                {
                    app.a = tx.vout[1].scriptPubKey.addresses[0];
                    results.push(app);
                }
            }
            catch(ex){}
        }

        return cb(null, results);
    });
};

BizAppService.prototype.getLatest = function (opts, cb) {
    var self = this;
    $.shouldBeFunction(cb);
    // KW TODO
    opts = opts || {};
    opts.bc.getTransactions([opts.address], 0, 0, function (err, res) {
        if (err) return cb(err, null);
        return cb(null, [{
            "hash": "216b98eb548751e33abb73c353c38c28",
            "url": "https://raw.githubusercontent.com/bitpay/insight-api/master/README.md",
        }]);
    });


};

module.exports = BizAppService;
