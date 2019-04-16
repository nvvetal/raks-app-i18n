'use strict';
let self;
let wap3AlexaTextModel = require('wap3-alexa-lib').wap3AlexaTextModel;

/**
 *
 * @param {Object} data
 * @constructor
 */
let MessageTemplate = function (data) {
    this.data = data || {};
    self = this;
};

MessageTemplate.prototype.data = {};

/**
 *
 * @param key
 * @param appType
 * @param locale
 * @returns {*}
 */
MessageTemplate.prototype.getKeysByAppAndLocale = function (appType, locale) {
    if (!this.data[appType]) {
        return {};
    }
    if (!this.data[appType][locale]) {
        return {};
    }
    return this.data[appType][locale];
};


/**
 *
 * @param key
 * @param appType
 * @param locale
 * @returns {*}
 */
MessageTemplate.prototype.getByKey = function (key, appType, locale) {
    let keys = this.getKeysByAppAndLocale(appType, locale);
    if (!keys[key]) {
        return undefined;
    }
    return keys[key];
};

/**
 *
 * @param key
 * @param appType {String} GENERAL, alexa, google, custom...
 * @param locale {String} en, en-gb, en-ca, de...
 * @param val
 */
MessageTemplate.prototype.set = function (key, appType, locale, val) {
    if (!this.data[appType]) {
        this.data[appType] = {};
    }

    if (!this.data[appType][locale]) {
        this.data[appType][locale] = {};
    }
    this.data[appType][locale][key] = val;
};

/**
 *
 * @param {String} key
 * @param appType
 * @param locale
 * @param {Array} values
 */
MessageTemplate.prototype.getContent = function (key, appType, locale, values) {
    values = values || [];
    let template = this.getByKey(key, appType, locale);
    if (!template) {
        //console.log('ERROR: NO TEMPLATE MESSAGE IN DB by key ' + key + ' app ' + appType + ' locale ' + locale);
        //console.log(this.data);
        return '';
    }
    let text = template.template;
    text = wap3AlexaTextModel.replaceAll(text, "\r", '');
    text = wap3AlexaTextModel.replaceAll(text, "\n", '');
    let templateData = template.data;
    //console.log(template, templateData);
    for (let i = 0; i < templateData.params.length; i++) {
        let param = templateData.params[i];
        if (param.required && !this.isValuesKeyExist(param.name, values)) {
            console.log('ERROR: TEMPLATE MESSAGE PARAM NOT FOUND: ' + param.name, values);
            text = wap3AlexaTextModel.replaceAll(text, '{' + param.name + '}', '');
        }
    }
    if (values.length === 0) return text;
    for (let i = 0; i < values.length; i++) {
        let replace = '{' + values[i].name + '}';
        text = wap3AlexaTextModel.replaceAll(text, replace, values[i].data);
    }
    return text;
};

/**
 *
 * @param key
 * @param values
 * @returns {boolean}
 */
MessageTemplate.prototype.isValuesKeyExist = function (key, values) {
    values = values || [];
    if (values.length === 0) return false;
    for (let i = 0; i < values.length; i++) {
        if (key === values[i].name) return true;
    }
    return false;
};

/**
 *
 * @param {String} key
 * @param appType
 * @param locale
 */
MessageTemplate.prototype.getSuggestions = function (key, appType, locale) {
    let template = this.getByKey(key, appType, locale);
    return template.data.suggestions;
};

/**
 *
 * @param prefix
 */
MessageTemplate.prototype.getKeysByPrefix = function (prefix, appType, locale) {
    let allKeys = this.getKeysByAppAndLocale(appType, locale);
    let keys = [];
    for (let i = 0; i < Object.keys(allKeys).length; i++) {
        let key = Object.keys(allKeys)[i];
        if(key.search(prefix) === 0){
            keys.push(key);
        }
    }
    return keys;
};

/**
 *
 * @param keyPrefix
 * @param {Array} values
 */
MessageTemplate.prototype.getContentsByPrefix = function (keyPrefix, appType, locale, values) {
    let contents = new Map();
    let keys = this.getKeysByPrefix(keyPrefix, appType, locale);
    for(let i = 0; i < keys.length; i++){
        contents.set(keys[i], this.getContent(keys[i], appType, locale, values));
    }
    return contents;
};

MessageTemplate.prototype.getAll = function (k
    return this.data;
};

module.exports = MessageTemplate;