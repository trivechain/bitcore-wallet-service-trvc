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

const VOP_PUBLISH = 0.00011;
const VOP_META = 0.00010;
const VOP_DESCRIPTION = 0.00012;
const VOP_CATEGORIES = 0.00020;

const ADDR_TX_PAGE_SIZE = 50;

function TriveAppService() { };

TriveAppService.prototype.init = function (opts, cb) {
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
    for (var i = 0; i < byte_arr.length; i += 2) {
        res += String.fromCharCode(byte_arr[i] | (byte_arr[i + 1] << 8));
    }
    return res;
}

function extractTriveApp(hex, name) {
    let result = false;
    const regex = /(.*?)23747323(([0-9A-Fa-f][0-9A-Fa-f])+?23)(.*)/g;
    const regResults = regex.exec(hex);

    if (regResults.length == 5) {
        let obj = {};
	obj.n = Buffer.from(regResults[2], 'hex').toString('utf8').slice(0,-1);
	obj.d = Buffer.from(regResults[4], 'hex').toString('utf8');
	result = obj;
    }

    return result;
}

function extractTriveAppMeta(hex) {
    let result = false;
    const regex = /(.*?)23747323(([0-9A-Fa-f][0-9A-Fa-f])+?23)(.*)/g;
    const regResults = regex.exec(hex);
    console.log(regResults);
    if (regResults.length == 5) {
	const version = Buffer.from(regResults[2], 'hex').toString('utf8').slice(0,-1);
        const hash = Buffer.from(regResults[4], 'hex').toString('utf8');
	const meta = { "v": version, "h": hash }
	result = meta;
    }
    return result;
}

function extractTriveAppDescription(hex) {
    let result = false;
    const regex = /(.*?)23747323(.*)/g;
    const regResults = regex.exec(hex);
    if (regResults.length == 3) {
        const description = Buffer.from(regResults[2], 'hex').toString('utf8');
        const meta = { "s": description }
        result = meta;
    }
    return result;
}

TriveAppService.prototype.getApps = function (opts, cb) {
    var self = this;

    $.shouldBeFunction(cb);
    opts = opts || {};
    let completed = false;
    let from = 0;
    let to = ADDR_TX_PAGE_SIZE;
    let app_list = [];
    async.whilst(
        function() { return to != -1; },
        function(callback) {
            opts.bc.getTransactionsWithSpendingInfo([opts.repo], from, to, function (err, transactions, total) {
                if (err) return callback(err);
                if(to > total)
                {
                    to = -1;
                }
                else
                {
                    from = to;
                    to += ADDR_TX_PAGE_SIZE;
                }
                for (let i = 0; i < transactions.length; i++) {
                    try {
                        let tx = transactions[i];
                        if (tx.vout[1].spentTxId === null && tx.vout.length > 1 && parseFloat(tx.vout[1].value) === VOP_PUBLISH) {
                            let app = extractTriveApp(tx.vout[0].scriptPubKey.hex, opts.name);
                            if (app) {
                                app.a = tx.vout[1].scriptPubKey.addresses[0];
                                app_list.push(app);
                            }
                        }
                    }
                    catch (ex) { }
                }
                callback();
            });
        },
        function (err) {
            if (err) return cb(err, null);
            return cb(null, app_list);
        }
    );
};

TriveAppService.prototype.getLatest = function (opts, cb) {
    var self = this;
    $.shouldBeFunction(cb);

    opts = opts || {};
    let from = 0;
    let to = ADDR_TX_PAGE_SIZE;
    let results = {};

    async.whilst(
        function() { return to != -1; },
        function(callback) {
            opts.bc.getTransactionsWithSpendingInfo(opts.addresses, from, to, function (err, transactions, total) {
                if (err) return callback(err);
                if(to > total)
                {
                    to = -1;
                }
                else
                {
                    from = to;
                    to += ADDR_TX_PAGE_SIZE;
                }
                for (let i = 0; i < transactions.length; i++) {
                    try {
                        let tx = transactions[i];
                        let addr = tx.vout[1].scriptPubKey.addresses[0];
                        if (tx.vout[1].spentTxId === null && tx.vout.length > 1 && parseFloat(tx.vout[1].value) === VOP_META) {
			    if (results[addr]) {
                                let meta = extractTriveAppMeta(tx.vout[0].scriptPubKey.hex);
				let currentMeta = results[addr];
                                if (meta) {
				    currentMeta.h = meta.h;
				    currentMeta.v = meta.v;
                                    results[addr] = currentMeta;
                                }
                            } else {
				let meta = extractTriveAppMeta(tx.vout[0].scriptPubKey.hex);
				if (meta) {
				    results[addr] = meta;
				}
			    }
                        }
			if (tx.vout[1].spentTxId === null && tx.vout.length > 1 && parseFloat(tx.vout[1].value) === VOP_DESCRIPTION) {
			    if (results[addr]) {
                                let description = extractTriveAppDescription(tx.vout[0].scriptPubKey.hex);
                                let currentMeta = results[addr];
				if (description) {
				    currentMeta.s = description.s;
                                    results[addr] = currentMeta;
                                }
                            } else {
				let description = extractTriveAppDescription(tx.vout[0].scriptPubKey.hex);
				if (description) {
                                    results[addr] = description;
                                }
			    }
                        }
                    }
                    catch (ex) { }
                }
                callback();
            });
        },
        function (err) {
            if (err) return cb(err, null);
            return cb(null, results);
        }
    );
};

TriveAppService.prototype.getCategories = function (opts, cb) {
    var self = this;
    $.shouldBeFunction(cb);

    opts = opts || {};
    opts.bc.getTransactionsWithSpendingInfo(opts.repo, 0, 0, function (err, transactions) {
        if (err) return cb(err, null);
        let results = [];
        for (let i = 0; i < transactions.length; i++) {
            try {
                let tx = transactions[i];
                let addr = tx.vout[1].scriptPubKey.addresses[0];
                if (tx.vout[1].spentTxId === null && tx.vout.length > 1 && parseFloat(tx.vout[1].value) === VOP_CATEGORIES) {
                    let res = Buffer.from(tx.vout[0].scriptPubKey.hex, 'hex').toString('utf8');
                    res = res.substring(res.indexOf('#ts#')).substring(4);
                    results = JSON.parse(res);
                }
            }
            catch (ex) { }
        }

        return cb(null, results);
    });
};

module.exports = TriveAppService;
