### Usage

Download the `todoist.js` file and add it to your page
```html
<script type="text/javascript" src="todist.js"></script>
```
Then initiate with the following code
```javascript
var test = new Todoist();
	test.token = "yourTokenHere";
	// To get a token go to the Account tab in the Todoist settings
	test.sync.oncomplete = function( data ){ console.log( data ); };
	// Function to be called once the API data has been received and processed
	test.sync();
	// Call the sync function
```

[See reference.md for list of object propeties](refernce.md)

### Upcoming Functionality

### Compatibility

This script has been developed and tested in Chrome. No effort has been made to test or develop for other environments. Any support otherwise is welcome!

### Differences to API proper

#### Naming conventions

The Todoist V7 API is delivered with an underscore naming convention  but in line with JavaScript conventions this script uses camelCase
For example Todoist:`live_notifications_last_read_id` turns into: `liveNotificationsLastReadId`

<!-- But it is possible to change this with the `.toConvention( string )` method. passing one of the following:

* `CamelCase` or `CC`
* `camelCase` or `cC`
* `_` or `underscore`
* `lowercase`
* `UPPERCASE` -->

#### Non-accessible data

In the some cases data from the Todoist API will not be accessible (eg `sync_key`/`syncKey`) to protect against errors or to reduce memory cost

#### Lacking API support

In the case of `filters`, it is removed as there is no API support to use

### Necessary URLs

Type | URL
--- | ---
API endpoints | `https://todoist.com/API/v7/*`
Avatar Images | `https://dcff1xvirvpfp.cloudfront.net/*_small.jpg`, `https://dcff1xvirvpfp.cloudfront.net/*_medium.jpg`, `https://dcff1xvirvpfp.cloudfront.net/*_big.jpg` `https://dcff1xvirvpfp.cloudfront.net/*_s640.jpg`
Oauth API | `https://todoist.com/oauth/*`
Token API | `https://todoist.com/api/access_tokens/*`
Templates | `https://todoist.com/importFromTemplate?t_url=*`
Imports/Exports | `https://*.cloudfront.net/*.csv`
Karma Chart | `https://todoist.com/chart?`
Backups | `https://s3.amazonaws.com/user_backups.todoist.com/*`

### Legal

 This is an unofficial repository that receives no support from and is not endorsed by Doist (the makers of Todoist)
