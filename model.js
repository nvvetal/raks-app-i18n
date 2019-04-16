'use strict';

let self;

let MessageTemplate = require('./data');
let messageTemplate = new MessageTemplate({});
const request = require('request');
let mkdirp = require('mkdirp');
let path = require('path');
let PubNub = require('pubnub');
let fs = require('fs');


const appTypes = {
    GENERAL: 'general',
    ALEXA: 'alexa',
    GOOGLE: 'google',
    CUSTOM: 'custom'
};

const strategies = ['all', 'file', 'url'];

class Model{

    constructor(params){
        self = this;
        if (!params.url) throw 'Please set url';
        if (!params.appKey) throw 'Please set appKey';
        if (!params.appSecret) throw 'Please set appSecret';
        this.appKey = params.appKey;
        this.appSecret = params.appSecret;
        this.appType = params.appType || appTypes.GENERAL;
        this.locale = params.locale || 'en';
        this.url = params.url;
        this.filename = params.filename;
        this.timeout = params.timeout || 300;
        this.pubnub = params.pubnub || {};
        this.debug = (params.debug === true);
        this.strategy = params.strategy || 'all';
        if (strategies.indexOf(this.strategy) === -1) throw 'Please use correct strategy: ' + strategies.join(', ');
    }

    /**
     * Loading by url or by file data if possible
     * @param callback
     */
    load(callback) {
        function process(type) {
            if (!canProcess) return;
            canProcess = false;
            if ((self.strategy === 'all' || self.strategy === 'url') && loads.url.status === 'success') {
                return self._refreshUrlData(loads.url.data, (err) => {
                    console.log('[i18n loaded from url]', err);
                    callback && callback(err);
                });
            }
            if ((self.strategy === 'all' || self.strategy === 'file') && loads.file.status === 'success') {
                return self._refreshFileData(loads.file.data, (err) => {
                    console.log('[i18n loaded from file]', err);
                    callback && callback(err);
                });
            }
            let errors = [];
            if (loads.url.status === 'fail') errors.push('[ERROR URL][' + loads.url.err + ']');
            if (loads.file.status === 'fail') errors.push('[ERROR FILE]' + loads.file.err + ']');
            let err = '';
            switch (type) {
                case 'timeout':
                    err = '[FAIL TIMEOUT][timeout ' + self.timeout + ', errors: ' + errors.join(";") + ']';
                    break;

                case 'promise':
                    err = '[FAIL PROMISE][errors ' + errors.join(";") + ']';
                    break;

                default:
                    err = '[errors ' + errors.join(";") + ']';
            }
            return callback && callback(err);
        }

        let canProcess = true;
        let p = [];
        let loads = {
            url: {
                status: 'new',
                data: undefined,
                err: undefined,
            },
            file: {
                status: 'new',
                data: undefined,
                err: undefined,
            }
        };

        setTimeout(() => {
            process('timeout');
        }, self.timeout);

        if(self.strategy === 'all' || self.strategy === 'url') {
            p.push(new Promise((resolve, reject) => {
                self._fetchUrl((err, rows) => {
                    loads.url.status = err ? 'fail' : 'success';
                    loads.url.err = err;
                    loads.url.data = rows;
                    resolve();
                });
            }));
        }

        if(self.strategy === 'all' || self.strategy === 'file') {
            p.push(new Promise((resolve, reject) => {
                self._fetchFile((err, data) => {
                    loads.file.status = err ? 'fail' : 'success';
                    loads.file.data = data;
                    loads.file.err = err;
                    resolve();
                });
            }));
        }

        Promise.all(p).then(() => {
            process('promise');
        }).catch((err) => {
            if (!canProcess) return;
            return callback && callback(err);
        });
    }

    /**
     * Using for RELOAD translates. Callback using for informing
     * @param callback
     */
    listen(callback) {
        if (!self.pubnub.publishKey || !self.pubnub.subscribeKey) {
            console.log('[ERR NO PUBNUB]', self.pubnub);
            return callback && callback('no pubnub config');
        }
        let listener = new PubNub({
            publishKey: self.pubnub.publishKey,
            subscribeKey: self.pubnub.subscribeKey
        });

        listener.addListener({
            status: function (statusEvent) {
                //console.log(statusEvent);
            },
            message: function (message) {
                if (message.message === 'crud.content') {
                    self.loadUrl((err) => {
                        if (err) {
                            callback && callback(err);
                            console.log('APP CONTENT NOT RELOADED', err);
                        } else {
                            callback && callback(undefined);
                            console.log('APP CONTENT RELOADED');
                        }

                    });
                }
            },
            presence: function (presenceEvent) {
                // handle presence
            }
        });
        if (self.debug) console.log("Subscribing APP Content", [self.appKey]);
        listener.subscribe({
            channels: [self.appKey]
        });
    }

    /**
     *
     * @param callback
     */
    _fetchUrl(callback) {
        let t1 = Date.now();
        request.get(self.url + '/api/content/app/?app_id=' + self.appKey + '&app_secret=' + self.appSecret, {
            timeout: self.timeout,
            strictSSL: false
        }, (err, res, body) => {
            if (err) {
                if (self.debug) console.log('[fail fetch url time]', (Date.now() - t1) / 1000);
                return callback && callback(err);
            }
            if (body.error) {
                if (self.debug) console.log('[fail fetch url time]', (Date.now() - t1) / 1000);
                return callback && callback(body.error);
            }
            let r = JSON.parse(body);
            let rows = r.data;
            if (rows.length === 0) {
                if (self.debug) console.log('[fail fetch url time]', (Date.now() - t1) / 1000);
                return callback && callback('no url data');
            }
            if (self.debug) console.log('[fetch url time]', (Date.now() - t1) / 1000);
            callback && callback(undefined, rows);
        });
    }

     /**
     * Loading translations from URL
     * @param callback
     */
     loadUrl(callback) {
        this._fetchUrl((err, rows) => {
            if (err) return callback && callback(err);
            this._refreshUrlData(rows, (err) => {
                callback && callback(err);
            });
        });
    }

    /**
     * Storing translations from URL rows
     * @param rows
     * @param callback
     */
     _refreshUrlData(rows, callback) {
        for (let i = 0; i < rows.length; i++) {
            let d = rows[i].data;
            d.params = d.params || [];
            d.suggestions = d.suggestions || [];
            messageTemplate.set(rows[i].key, rows[i].appType.toLowerCase(), rows[i].lang.toLowerCase(), {
                id: rows[i].id,
                key: rows[i].key,
                appType: rows[i].appType.toLowerCase(),
                locale: rows[i].lang.toLowerCase(),
                template: rows[i].template || '',
                data: rows[i].data,
                created: rows[i].created
            });
        }
        callback && callback(undefined);
    }

    /**
     *
     * @param data
     * @param callback
     * @returns {*}
     */
    _refreshFileData(data, callback) {
        try {
            messageTemplate.data = JSON.parse(data);
        } catch (e) {
            console.log('[ERR refreshFileData]', e);
            return callback && callback(e);
        }
        callback && callback(undefined);
    }

    /**
     * Loading from file
     * @param callback
     */
    loadFile(callback) {
        this._fetchFile((err, data) => {
            if (err) return callback && callback(err);
            this._refreshFileData(data, (err) => {
                callback && callback(err);
            });
        });
    };

    /**
     * Loading from file
     * @param callback
     */
    _fetchFile(callback) {
        let t1 = Date.now();
        if (!self.filename) {
            if (self.debug) console.log('[fail load file time]', (Date.now() - t1) / 1000);
            return callback && callback('no file: ' + self.filename);
        }
        let data;
        try {
            if (!fs.existsSync(self.filename)) throw 'no file ' + self.filename;
            data = fs.readFileSync(self.filename);
        } catch (e) {
            console.log('[ERR loadFromFile]', e);
            if (self.debug) console.log('[fail load file time]', (Date.now() - t1) / 1000);
            return callback && callback(e);
        }
        if (self.debug) console.log('[load file time]', (Date.now() - t1) / 1000);
        callback && callback(undefined, data);
    };

    /**
     * Exporting data in JSON format to params.filename
     * @param callback
     */
    exportToFile(callback) {
        let dir = path.dirname(self.filename);
        if (!fs.existsSync(dir)) {
            mkdirp.sync(dir);
        }
        self.loadUrl((err) => {
            if (err) return callback && callback(err);
            fs.writeFileSync(self.filename, JSON.stringify(messageTemplate.data));
            callback && callback(undefined);
        });
    }

    /**
     *
     * @param {String} key
     * @param {Array} values
     */
    getContent(key, values = []) {
        let content = messageTemplate.getContent(key, self.appType, self.locale, values);
        if (content) return content;
        if (self.appType !== appTypes.GENERAL) {
            content = messageTemplate.getContent(key, appTypes.GENERAL, self.locale, values);
        }
        if (content) return content;
        let reg = /(\w+)-(\w+)$/;
        let m = self.locale.match(reg);
        try {
            if (!m || !m[1]) throw 'no lang ' + self.locale;
            let lang = m[1].toLowerCase();
            content = messageTemplate.getContent(key, self.appType, lang, values);
            if (content) return content;
            if (self.appType !== appTypes.GENERAL) {
                content = messageTemplate.getContent(key, appTypes.GENERAL, lang, values);
            }
        } catch (err) {
            console.log('[ERR LOCALE]', err, self.locale);
        }
        return content;
    }

    /**
     *
     * @param {String} key
     */
    getSuggestions(key) {
        return messageTemplate.getSuggestions(key, self.locale);
    }

    /**
     *
     * @param appType
     */
    setAppType(appType) {
        this.appType = appType;
    }

    /**
     *
     * @param locale
     */
    setLocale(locale) {
        this.locale = locale;
    }

    /**
     *
     * @param timeout {Number}
     */
    setTimeout(timeout) {
        this.timeout = timeout;
    }


    /**
     *
     * @param {String} keyPrefix
     * @param {Array} values
     * @returns {Map}
     */
    getContentsByPrefix(keyPrefix, values = []) {
        let contents = messageTemplate.getContentsByPrefix(keyPrefix, self.appType, self.locale, values);
        if (contents.length > 0) return contents;
        if (self.appType !== appTypes.GENERAL) {
            contents = messageTemplate.getContentsByPrefix(keyPrefix, appTypes.GENERAL, self.locale, values);
        }
        if (contents.length > 0) return contents;
        let reg = /(\w+)-(\w+)$/;
        let m = self.locale.match(reg);
        try {
            if (!m || !m[1]) throw 'no lang ' + self.locale;
            let lang = m[1].toLowerCase();
            contents = messageTemplate.getContentsByPrefix(keyPrefix, self.appType, lang, values);
            if (contents.length > 0) return content;
            if (self.appType !== appTypes.GENERAL) {
                contents = messageTemplate.getContentsByPrefix(keyPrefix, appTypes.GENERAL, lang, values);
            }
        } catch (err) {
            console.log('[ERR LOCALE]', err, self.locale);
        }
        return contents;
    }

    getAll() {
	return messageTemplate.getAll();
    }
}

module.exports = Model;