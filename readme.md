#APP CONTENT library

###Using for fetch i18n translates for microservice APP with file fallback.

##Install:
package.json

```javascript
    {
        dependencies: {
            "wap3-app-content": "git+https://github.com/nvvetal/raks-app-i18n.git#v1.0.5"
        }
    }
```

#Requirements

##node.js v6.9.0 or upper


###Example with full config when init:

```javascript
let APP = require('wap3-app-content').Wap3AppContent;

let app = new APP({
    appKey: 'XXXXX-XXXX-XXXX-XXXX-XXXX',
    appSecret: 'some_secret',
    appType: 'alexa',
    url: 'https://HOST',
    filename: '/YOUR/APP/DIR/i18n.json',
    strategy: 'all',
    timeout: 500,
    pubnub: {
        publishKey: 'pub-X-XXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        subscribeKey: 'sub-X-XXXXXXXXXXXXXXXXXXXXXXXXXX'
    },
    locale: 'en-US',
    debug: false
});
```

#Options 

## appKey (**required**)

## appSecret (**required**)

##appType (default: general)
Allowed - general, google, alexa or custom

##url (**required**)
Using for fetch i18n from APP Content Microservice. 
Using in strategy 'all' or 'url' (in method **load**). 
Also method **loadUrl** using this param 

##filename
Using for store and load i18n from local file in case when strategy is 'all' 
or 'file' (in method **load**).
Also methods **loadFile**, exportToFile using this param.

##strategy (default: all)
Can be all, url, file - when all - this is url and file, but url is in 
higher priority than file (method **load**). 
Otherwise using only specific methods.

##timeout (default: 300)
Using in method **load**, **loadUrl**. 
This is **MAX** time for any strategy after which 
templates will not loaded if all **load*** not worked. 
But usually for strategy 'all' loadFile is faster and success.
This param also using for max timeout in URL fetch request.

##pubnub
Object using in **listen** method. 
Properties are **publishKey** and **subscribeKey**
 
##locale (default: en)
In case 'en-XX', first will be 'en-XX' 
in **getContent** method by type **appType**, 
then if **appType** not equal to **general** - by **general**.
Then if not found 'en' - same flow.

##debug (default: false)
Default - false. Using to show more information about library operations such as 
time to success or fail fetch data by URL or/and filename. 

#Methods

##getContent(key, params = [])
Where **params** - array of objects {name: 'name', data: 'some data'}
Getting translation by locale and appType.

```javascript
    let text = app.getContent('app.name');
    let welcomeText = app.getContent('welcome', [
        {
            name: 'app.name',
            data: 'My Favourite APP'
        }
    ]);
```

##load(callback)
loading data by **strategy**.
```javascript
app.load(function(err){
    //SOME STUFF with err processing
});
```

##listen(callback)
Listening for CRUD changes and reloading data by **strategy** (if possible).

Each time will call your callback if some happen
```javascript
app.listen((err) => {
    //SOME STUFF with err processing
    //SOME STUFF with app reaction on refresh
});
```

##exportToFile(callback)
Exports fetched data from **url** by loadUrl to filename set.
```javascript
    app.exportToFile((err) => {
        //SOME STUFF with err processing
    });
```

##setAppType(appType)
Setting appType instead of type which is used in constructor
```javascript
    app.setAppType('alexa');
```

##setLocale(locale)
Setting locale instead of locale which is used in constructor
```javascript
    app.setLocale('en-CA');
```

##setTimeout(timeout)
Setting max timeout in milliseconds instead of timeout which is used in constructor
```javascript
    app.setTimeout(500);
```


#Version change:

**v1.0.5** Added list for translate by staring key

**v1.0.4** Added schema

**v1.0.3** Added requirements in readme.md

**v1.0.2** Added setTimeout

**v1.0.1** Doc update

**v1.0.0** Init