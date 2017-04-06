/* jshint laxbreak : true */
function Todoist(){
var that = this,		// Enables sub functions to access `this`
	countOfConn = 0,	// Counts the number of open XHRs
	inboxProject,		// id of Inbox project
	dataSupport = {		// provides referential tracking of items
		projects		: {},	// One project to many items
		notes			: {},	// Many Notes to one project
		labels			: {},	// Many labels to Many items
		collaborators	: {},
		priorities		:		// One prioirty to many itmes
			{ 1 : {}, 2 : {}, 3 : {}, 4 : {} },
	},
	syncTokens = {		// Sync tokens to enable only new data is returned
		main	: "*",			// Main
	},
	imgUrlBase = "https://dcff1xvirvpfp.cloudfront.net/";
						// Base image url
////////		////////		Main Object		////////		////////
this.items				= {};
this.projects			= {};
this.labels				= {};
this.liveNotifications	= {};
this.collaborators		= {};
this.notes				= {};
this.user				= null;
this.lastSync			= null;
that.completed			= null;
////////		////////		Private funcs	////////		////////
function logger( message, r ) {
	if ( that.logger.tell  ) console.log( message );
	if ( that.logger.track ) that.logger.messages.push( message.toString() );
	// if no return value, use message
	if (
		typeof r		=== "undefined" &&
		typeof message	!== "undefined"
	)						return message;
	// if return value exists, return that
	else if ( typeof r	!== "undefined" )
							return r;
	// els return false
	else					return false;
}
this.logger = {
	tell		:	false,
	track		:	false,
	messages	:	[],
};
function nativisor( response, camelised ) {
	// Camelise response
	if ( !camelised ) response = cameliseKeys( response );

	var i, e,				// Looping variables
		key,				// Working element
		iter = that.sync.iterator,
		//Shorthand
		project,			// Individual working element
		collaborator,		// Individual working element
		label,				// Individual working element
		notification,		// Individual working element
		item,				// Individual working element
		note,				// Individual working element
		projectColours = [	// Array of colours used by projects
			"#95ef63","#ff8581","#ffc471","#f9ec75","#a8c8e4","#d2b8a3",
			"#e2a8e4","#cccccc","#fb886e","#ffcc00","#74e8d3","#3bd5fb",
			"#dc4fad","#ac193d","#d24726","#82ba00","#03b3b2","#008299",
			"#5db2ff","#0072c6","#000000","#777777",
		],
		labelColours = [	// Array of colours used by labels
			"#019412","#a39d01","#e73d02","#e702a4","#9902e7","#1d02e7",
			"#0082c5","#555555","#008299","#03b3b2","#ac193d","#82ba00",
			"#111111",
		];

	// Validation
	if 	( // TODO: eventually this should be handled by the maps
		Array.isArray(	response.collaboratorStates				)&&
		Array.isArray(	response.collaborators					)&&
		typeof			response.dayOrders 			=== "object" &&
		typeof			response.dayOrdersTimestamp	=== "string" &&
		Array.isArray(	response.filters						)&&
		typeof			response.fullSync 			=== "boolean"&&
		Array.isArray(	response.items							)&&
		Array.isArray(	response.labels							)&&
		Array.isArray(	response.liveNotifications				)&&
		typeof			response.liveNotificationsLastReadId ===
		"number" &&
		// Array.isArray(	response.locations						)&&
		// NOTE: is ommited when not needed
		Array.isArray(	response.notes							)&&
		Array.isArray(	response.projectNotes					)&&
		Array.isArray(	response.projects						)&&
		Array.isArray(	response.reminders						)&&
		typeof			response.syncToken 			=== "string" &&
		typeof			response.tempIdMapping		=== "object" &&
		// typeof			response.user				=== "object" &&
		// NOTE: is ommited when not needed
		true // HACK: enables quick editing of elems above
	)
	{ logger ( "Valid response" ); }
	else{ return logger("Invalid response", false); }// bad response

	/*						Projects							  */
	for( i = 0; i < response.projects.length; i++ ) {
		// Set working vars
		project	= cameliseKeys(response.projects[i]);
		key		= project.id;

		// Referential data support
		dataSupport.projects [ key ] = {};

		// Nativisation
		project.colourKey = project.color;
		project.colourHex = projectColours[project.color];
		delete project.color;
		delete project.inboxProject;

		// Iteration API hook
		if (iter.projects) iter.projects(project);

		// Build replacement object
		that.projects[key] = project;
	} project = key = null; // Housekeeping
	/*						Collaborators						  */
	for( i = 0; i < response.collaborators.length; i++ ) {
		// Set working vars
		collaborator	= cameliseKeys(response.collaborators[i]);
		key				= collaborator.id;

		// Referential data support
		dataSupport.collaborators[ key ] = {};

		// Nativisation
		if (collaborator.imageId) {
			collaborator.avatar			= {};
			collaborator.avatar.big		= imgUrlBase +
			collaborator.imageId + "_big.jpg";
			collaborator.avatar.medium	= imgUrlBase +
			collaborator.imageId + "_medium.jpg";
			collaborator.avatar.s640	= imgUrlBase +
			collaborator.imageId + "_s640.jpg";
			collaborator.avatar.small	= imgUrlBase +
			collaborator.imageId + "_small.jpg";
			collaborator.avatar.raw		= collaborator.imageId;
		}
		else
		collaborator.avatar 		= null;
		delete collaborator.imageId;

		// Iteration API hook
		if (iter.collaborators) iter.collaborators(collaborator);

		// Build replacement object
		that.collaborators[ key ] = collaborator;
	} collaborator = key = null; // Housekkieping
	/*						Labels								  */
	for( i = 0; i < response.labels.length; i++ ) {
		// Set working vars
		label	= cameliseKeys(response.labels[i]);
		key		= label.id;

		// Referential data support
		dataSupport.labels[ key ] = {};

		// Nativisation
		label.colourKey = label.color;
		label.colourHex = labelColours[label.color];
		label.isDeleted = Boolean(label.isDeleted);
		delete label.color;

		// Iteration API hook
		if (iter.labels) iter.labels(label);

		// Build replacement object
		that.labels[ key ] = label;
	} label = key = null; // Housekkieping
	/*						Notifications						  */
	for( i = 0; i < response.liveNotifications.length; i++ ) {
		// Set working vars
		notification= cameliseKeys(response.liveNotifications[i]);
		key			= notification.id;

		// Marking read notifications
		if 		( response.liveNotificationsLastReadId >= key ){
			notification.read = true;
		}else	notification.read = false;

		// Nativisation
		notification.isDeleted	=  Boolean(notification.isDeleted);
		notification.created	= new Date(notification.created);
		// TODO: implement more nativisation relevant to specific to special cases

		// Iteration API hook
		if (iter.liveNotifications) iter.liveNotifications(notification);

		// Build replacement object
		that.liveNotifications[key] = notification;
	} notification = key = null; // Housekkieping
	/*						Items								  */
	for( i = 0; i < response.items.length; i++ ) {
		// Camelising
		item	= cameliseKeys(response.items[i]);
		key		= item.id;

		// Referential dataSupport
		dataSupport.projects	[ item.projectId ]	[ key ] = true;
		dataSupport.projects	[ item.projectId ]	[ key ] = true;
		dataSupport.priorities	[ item.priority ]	[ key ] = true;
		for ( e = 0; e < item.labels.length; e++ )
		{dataSupport.labels	[ item.labels[e] ]	[ item.id ] = true;}

		// Nativisation
		item.checked		= 		Boolean	( item.checked		);
		item.dateAdded		= new 	Date	( item.dateAdded	);
		if (item.dueDateUtc)
		item.dueDateUtc	= new 	Date	( item.dueDateUtc	);
		item.isArchived		= 		Boolean	( item.isArchived	);
		item.isDeleted		= 		Boolean	( item.isDeleted	);
		if ( item.content.substr(0,2) === "* " )	{
			item.checkable = false;
			// item.content = item.content.replace( "* ", "" );
			// NOTE: ^^^ May remove because of end-dev choice of parser
		}
		else							item.checkable = true;
		item.notes			= {};	// NOTE: Could be handled in notes iteration

		// Iteration API hook
		if (iter.items) iter.items(item);

		// Build replacement object
		that.items[key] = item;
	} item = key = null; // Housekkieping
	/*						Notes								  */
	for( i = 0; i < response.notes.length; i++ ) {
		// TODO: Decide where to keep notes, in item or in notes object
		note	= cameliseKeys(response.notes[i]);
		key		= note.id;
		item	= note.itemId;

		// Nativisation
		note.posted		= new Date	(note.posted);
		note.isArchived	= Boolean	(note.isArchived);
		note.isDeleted	= Boolean	(note.isDeleted);

		// Embed notes into relevant Item
		// if ( !	that.items[ item ].notes )
		// 		that.items[ item ].notes = {};
		// NOTE: Handled in notes iteration ATM
		that.items[ item ].notes[ key ] = note;

		// Iteration API hook
		if (iter.notes) iter.notes(note);

		// Build replacement object
		that.notes[key] = note;
	} note = key = null; // Housekkieping

	// Replacing Arrays with new litteral Objects
	response.items					= that.items;
	response.projects				= that.projects;
	response.labels					= that.labels;
	response.liveNotifications		= that.liveNotifications;
	response.collaborators			= that.collaborators;
	response.notes					= that.notes;
	response.notes					= that.notes;

	if (response.user){// NOTE: neu is used to simplify the code
		neu = cameliseKeys(response.user);
		neu.freeTrailExpires	= new Date(neu.freeTrailExpires);
		neu.joinDate			= new Date(neu.joinDate);
		neu.premiumUntil		= new Date(neu.premiumUntil);

		inboxProject = neu.inboxProject;
		delete neu.inboxProject;
		that.inboxProject.key = inboxProject; // TODO: set readonly

		delete neu.token; // XXX: ???

		response.user = that.user = neu;
		neu = null;
	}

	// Housekeeping
	syncTokens.main = response.syncToken;
	delete response.syncToken;
	delete response.tempIdMapping;
	delete response.fullSync;
	delete response.filters;			// See readme
	delete response.dayOrdersTimestamp;
	delete response.liveNotificationsLastReadId;

	return response;
}
function cameliseKeys( obj ) {
	//	obj							// Input param
	var keys = Object.keys( obj ),	// Shorthand
		key,						// Shorthand
		neuObj = {};				// Object that is returned

	for (var i = 0; i < keys.length; i++) {
		// Shorthand
		key = keys[i];

		// If Underscored change convention
		if ( keys[i].indexOf("_") )
			neuObj	[ camelise(key) ] = obj[ key ];
		// Else copy into new obj
		else
			neuObj	[		key		] = obj[ key ];

		// Housekeeping
		key = neuKey = null;
	}

	// return object
	return neuObj;

	// Modular Underscore to camelCase function
	function camelise(str) { return str.replace(/_([a-z])/g, function (g) { return g[1].toUpperCase(); }); }
}
function validateProjectId( id, onlyExisitng ) {
	// id is project ID
	// onlyExisitng (boolean, proper)
	if (
		( Number.isInteger(id) && dataArray.projects[id] ) ||
		( typeof id === "string" && uuid.test(id) )
	) return true;
	else return false;
}
var uuid = {
	gen:function(){
		// Boilerplate code form http://stackoverflow.com/a/8809472/6539400
		var d = new Date().getTime();
		if(window.performance && typeof window.performance.now === "function")
		d += performance.now(); //use high-precision timer if available
		var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
			/[xy]/g,
			function(c) {
				var r = (d + Math.random()*16)%16 | 0;
				d = Math.floor(d/16);
				return (c=='x' ? r : (r&0x3|0x8)).toString(16);
			}
		);
		return uuid;
	},
	test:function( str ) {
		// http://stackoverflow.com/a/13653180/6539400
		if (typeof str !== "string") return false;
		return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str.toLowerCase());
	},
};
function validateItem( obj ) {
	var args = {};

	// Get, Set and Validate ID
	args.id = getId( obj.id, that.items );
	if ( !args.id ) return false;

	// Propety validation and setting
	if ( obj.content		) {
		// If .content is string set command
		if ( typeof obj.content === "string" )
			args.content = obj.content;

		// If .content is string convertable, set converted string
		else if ( typeof obj.content.toString === "function" ) {
			args.content = obj.content.toString();
			logger(".content is not a string, but is being converted");
		}

		// Else to content settable, abort
		else return logger(
			".content is not string and can't be converted",
			false
		);
	}
	if ( obj.labels			) {
		// Validate array of numbers
		if (
				// Is Array && Is not array of numbers
				! Array.isArray(obj.labels) ||
				! obj.labels.every(function( value ){
					return getId( value, that.labels ) ? true : false;
				})
			)
			return logger( "Invalid labels property", false );

		// Set lables property
		args.labels			= obj.labels;
	}

	// Auto .write call
	pauseAutoWrite();

	// Complete function
	return args;
}
////////		////////		Comms			////////		////////
function ajax( paramObj, url, onloadFunc ) {
	// Validation
	if (
			typeof paramObj		!== "object" ||
			typeof url			!== "string" ||
			typeof onloadFunc	!== "function"
		) return false;

	if ( !paramObj.token )
		paramObj.token = that.token;

	var urlString = "https://todoist.com/API/v7/" + url,
								// URL constructor
		paramString	= "",		// String to be passed to Todoist API
		keys		= Object.keys(paramObj),
								// Sorthand
		key;					// Shorthand

	// Param string construction
	for (var i = 0; i < keys.length; i++) {
		key = keys[i];
		if	( paramString.length > 1 ) paramString += "&";
		if	( paramObj[key].toString() )
			paramString += key+"="+String(paramObj[key]).replace(/'/g,"\"");
		else return logger("Unexpected data type", false);
	}

	// Calling the HTTP request
	var xhr = new XMLHttpRequest();
		xhr.onload = function() {onloadFunc( JSON.parse(xhr.response) );};
		xhr.open( "POST", urlString );
		xhr.setRequestHeader(
			"Content-type", "application/x-www-form-urlencoded" );
		xhr.send( paramString );
}
this.sync						= function () {
	// Validate presence of token
	if		( !that.token ) return logger ("No Token", false);

	// Prevent too many tokens
	if ( that.limit === countOfConn )
		return logger("connection limit reached",false);
		else countOfConn++;

	// Detect if no connection present
	if	(!navigator.onLine) {
		// TODO: Offline handling
		if (that.offline) that.offline();
		return logger( "Offline" , false);
	}

	// Start xhr
	ajax(
		{
			"sync_token"	: syncTokens.main,
			"resource_types": "['all']",
		},
		"sync",
		loadEvent
	);

	function loadEvent( response ) {
		// Camelise response
		response = cameliseKeys( response );

		var fullSync;

		// if (precom) { precom = precom(response); }
		// if (precom) { return precom; }

		// Error handling
		// TODO: implement error handling
		if (response.error) return logger(response, false);

		// SyncToken validation
		if		((syncTokens.main==="*") && response.fullSync)
				// good
				fullSync = true;
		else if	((syncTokens.main!=="*") && !response.fullSync)
				// good
				fullSync = false;
		else if	((syncTokens.main==="*") != response.fullSync)
				// using != as XOR
				return logger( "Unexpected Sync", false );

		// Tempory code for testing purposes, will eventually be invalidated by better code
		data = nativisor( response, true );
		if ( data ) that.dataArray = data;
		else 		return logger( data, false );

		// Set lastSync
		that.lastSync = new Date();

		that.sync.state = true;

		// Optional function
		if (that.sync.oncomplete) that.sync.oncomplete( that.dataArray );

		// End of connection, decrement connection count
		countOfConn--;

		// testing code
	}
};
this.sync.oncomplete			= null;
this.sync.iterator				= {
	projects			: null,
	collaborators		: null,
	labels				: null,
	liveNotifications	: null,
	items				: null,
	notes				: null,
	projectNotes		: null,
};
this.sync.state					= false;
this.getCompleted				= function ( callback ) {
	var completed,
		ajaxSet = [];

	// Validation, set counted or abort
	if		( typeof that.user.completedCount === "number" )
		completed =  that.user.completedCount;
	else if ( typeof that.stats.completed_count === "number" )
		completed =  that.stats.completed_count;
	else return logger( "Needs completed count form user or stats", false );

	// Set initial object / Destroy any previous results
	that.completed = { items : [], projects : {}, };

	// If no completed, abort
	if ( completed === 0 ) return false;

	// Loop to create array of ajax instructions
	for (var i = 0; i < completed; i+=51)
		ajaxSet.push({ limit : 50, offset : String(i), });

	// Make first ajax
	ajax( ajaxSet.pop(), "completed/get_all", loadEvent );

	function loadEvent( response ) {
		// Push items(tasks) to array
		that.completed.items.push.apply(that.completed.items,response.items);

		// Push projects to array
		Object.values(response.projects).forEach(function (item) {
			// If the project does not exist, creatte it
			if ( !that.completed.projects[item.id] )
				that.completed.projects[item.id] = cameliseKeys(item);
		});

		// If there are more AJAX to make, pop it and send
		if (ajaxSet[0]) ajax( ajaxSet.pop(), "completed/get_all", loadEvent );

		// If all AJAX are complete
		else {
			// For each item camelise it
			that.completed.items.forEach(
				function(item,i){that.completed.items[i] = cameliseKeys(item);}
			);

			// If callback exists, call it
			if ( callback ) callback( that.completed );
		}
	}
};
this.getStats					= function () {
	ajax( {}, "completed/get_stats", loadEvent );

	function loadEvent( response ) {
		var stats = that.stats = cameliseKeys(response);
			stats.goals = cameliseKeys(stats.goals);
			stats.daysItems			.forEach( keyInArray );
			stats.karmaUpdateReasons.forEach( keyInArray );
			stats.weekItems			.forEach( keyInArray );

		// that.stats = stats;

		if ( that.getCompleted.oncomplete )
			that.getCompleted.oncomplete(that.stats);

		function keyInArray( item, i, array ) {
			array[i] = cameliseKeys(item);
		}
	}
};
this.getStats.oncomplete		= null;
this.stats						= null;
this.authenticateToken			= function ( testToken, callback ) {
	if ( typeof testToken === "undefined" ) testToken = that.token;
	if ( typeof testToken !== "string" ) output({
		validity : false,
		token : testToken
	});

	ajax(
		{
			"token"			: testToken,
			"sync_token"	: "*",
			"resource_types": "['user']",
		},
		"sync",
		loadEvent
	);

	function loadEvent ( response ) {
		response.token = response.token ? response.token : testToken;
		response.validity = response.user ? true : false;
		output(response);
	}
	function output ( obj ) {
		if ( callback ) callback( obj ); else console.log( obj );
	}
};
this.syncFresh					= function () {
	if (navigator.onLine) {
		syncTokens.main = "*";
		that.sync();
	}
	else logger( "syncFresh: offline, sync aborted" );
};
this.syncActivities				= function () {
	// TODO: support for requests > 100
	if (!that.token) return false;
	if (!that.dataArray.user.isPremium) return false; // Activity feed is premium only

	// Prevent too many tokens
	if ( that.limit === countOfConn )
		return logger("connection limit reached",false);
		else countOfConn++;

	// Detect if no connection present
	if	(!navigator.onLine) {
		/* TODO: Offline handling */
		if (that.offline) that.offline();
		return logger( "Offline" , false);
	}

	var p = {},	// Shorthand: paramObj
		a = that.syncActivities,		// Shorthand: syncActivities Object
		min, max;

	// Optional Todoist API parameters
	if ( a.objectType 		) p.object_type			= a.objectType;
	if ( a.objectId 		) p.object_id			= a.objectId;
	if ( a.eventType 		) p.event_type			= a.eventType;
	if ( a.objectEventTypes	) p.object_event_types	= a.objectEventTypes;
	if ( a.parentProjectId	) p.parent_project_id	= a.parentProjectId;
	if ( a.parentItemId 	) p.parent_item_id		= a.parentItemId;
	if ( a.initiatorId 		) p.initiator_id		= a.initiatorId;
	if ( a.since 			) p.since				=
							new Date(a.since).toISOString().slice(0, 16);
	if ( a.until 			) p.until				=
							new Date(a.until).toISOString().slice(0, 16);
	if ( a.limit 			) p.limit				= a.limit;
	if ( a.offset 			) p.offset				= a.offset;

	if ( p.since && p.until && p.since > p.until ) return false;
	if ( p.since && p.since instanceof Date && !isNaN(p.since.valueOf()) )
			return false;
	if ( p.until && p.until instanceof Date && !isNaN(p.until.valueOf()) )
			return false;

	ajax( p, "activity/get", loadEvent );

	function loadEvent( response ) {
		console.log(response);
		var i,							// Looping variables
			key;						// Working element

		// Error handling
		// TODO: implement error handling
		if (response.error) return logger(response, false);

		// Validation
		if 		(Array.isArray(response)) {
				logger ( "Valid response" );
		} else	return logger("Invalid response", false); // bad response

		if (a.save && !that.activities) that.activities = {};

		min = max = new Date( response[0].event_date );

		for( i = 0; i < response.length; i++ ) {
			// Set working vars
			activity = cameliseKeys(response[i]);
			key = activity.id;

			if		( activity.eventDate < min ) min = activity.id;
			else if ( activity.eventDate > max ) max = activity.id;
			// TODO: Referential data support

			// Nativisation
			activity.eventDate = new Date(activity.eventDate);
			delete activity.id;
			// console.log(activity.extraData);

			// Optional iterator
			if (a.iterator) a.iterator( activity );

			// Build replacement object
			if (a.save) that.activities[key] = activity;
		} activity = key = null; // Housekeeping

		console.log(
			"Min: " + min.toISOString() +
			"\nMax: " + max.toISOString()
		);

		// Optional function
		if (a.oncomplete) a.oncomplete();

		// End of connection, decrement connection count
		countOfConn--;

		// testing code
	}
};
this.syncActivities.oncomplete	= null; // func
this.syncActivities.save		= true; // Bool / Def-TRUE
that.dataArray					= null;
this.token						= null;
this.write						= function ( obj ) {
	var cmds = [];

	if (moveItems.go) {
		var moveCommands = Object.values(moveItems).reduce( function(out,value){
			// Set shorthand variables
			var i = value.item,
				l = value.losing,
				g = value.gaining;

			// If value has been nulled, skip value
			if		( !value || typeof value !== "object" )
					{ return out; }

			// If losing project doesn't exists, create it
			else if ( out[ g ] && !out[ g ].args.project_items[ l ] )
					{ out[ g ].args.project_items[ l ] = [ i ]; }

			// If losing project exists, push to it
			else if	( out[ g ] && out[ g ].args.project_items[ l ] )
					{ out[ g ].args.project_items[ l ].push( i ); }

			// Else create command object
			else	{
				out[ g ] = {
					"type": "item_move",
					"uuid": uuid.gen(),
					"args": {
						"project_items"	: {},
						"to_project"	: g,
					},
				};
				out[ g ].args.project_items[ l ] = [ i ];
			}

			// Add uuid to recipt
			value.uuid = out[ g ].uuid;

			// Return Accumulator
			return out;
		}, {} );

		[].push.apply( cmds, Object.values( moveCommands ) );
	}

	// If updates.go
	if ( updates.go ) {
		Object.keys( updates ).forEach( function ( key ) {
			// push non-null values to cmds array
			if ( updates[ key ] ) cmds.push( updates[ key ] );
			// null and delete each propety
			updates[ key ] = null;
			delete updates[ key ];
		} );
		// set updates.go as false
		updates.go = false;
	}

	[	// Uniform commands map
		[ deletes,		"item_delete"	],
		[ completes,	"item_complete"	],
	]
	.forEach( function ( v ) {
		if ( v[0].ids.length > 0 )
			cmds.push(
				{ "type" : v[1],"uuid" : v[0].uuid,"args" : {"ids" : v[0].ids} }
			);
	} );

	ajax(
		{ "commands" : JSON.stringify( cmds ), },
		"sync",
		loadEvent
	);

	function loadEvent(response) {

	}
};
this.write.auto					= false;
this.getBackup = function ( cb ) {
	if ( that.sync.state )
		logger( "Sync needs to be made to validate premium", false );
	if ( that.user.isPremium )
		logger( "This use does not have premium", false );
	return ajax(
		{}, "backups/get",
		function (response) {
			this.backups = response;
			if ( cb ) cb();
		}
	);
};
this.backups = null;
////////		////////		Write			////////		////////
var moveItems	= { go : false };
var updates		= { go : false };
var deletes		= { uuid : uuid.gen(), ids : [] };
var completes	= { uuid : uuid.gen(), ids : [] };
this.moveItem = function ( item, project, cancel ) {
	// Validate and return item id
	var id = getId( item, that.items ),
		gaining = getId( project, that.projects );

	// If invalid id, abort
	if ( !id )
		return logger( "Invalid item ID or object :> " + id, false );

	// Set move record for .write()
	if		( !cancel && gaining ) {
		moveItems[ id ] = {
			item	: id,		//
			losing	: that.items[ id ].projectId,
			gaining	: gaining,	//
			uuid	: null,		// UUID will be added once converted
		};
		moveItems.go = true;

		if ( that.write.auto ) that.write();

		// Return record as recipt
		return moveItems[ id ];
	}
	else if ( !cancel && !gaining  )
		return logger( "Invalid project ID or object :> " + gaining, false );
	else if ( cancel && !moveItems[ id ] )
		return true;
	else if ( cancel && moveItems[ id ] ) {
		moveItems[ id ].item	= false;
		moveItems[ id ].losing	= false;
		moveItems[ id ].gaining	= false;
		moveItems[ id ].uuid	= false;
		moveItems[ id ]			= null;
		return true;
	}
};
this.deleteItem = function ( item, cancel ) {
	return tinker( item, cancel, that.items, deletes );
};
this.completeItem = function ( item, cancel ) {
	return tinker( item, cancel, that.items, completes );
};
function tinker( item, cancel, location, register ) {
	var id = getId( item, location ),
		ret = null;

	if (!id) return false;

	var i = register.ids.findIndex( function (a) { return a === id; } );

	if		( !cancel && i === -1 )	ret = register.ids.push(id);
	else if ( !cancel && i  >  -1 )	ret = true;
	else if (  cancel && i  >  -1 )	ret = register.ids.splice( i, 1 );
	else if (  cancel && i === -1 )	ret = true;

	if ( that.write.auto ) that.write();

	return ret;
}
this.updateItem = function ( obj, cancel ) {
	// TODO: Cancel implementation

	// Prevent writes during function calls
	pauseAutoWrite( true );

	// Validatiton
	if ( typeof obj !== "object" ) return abortSelf();

	var
		recipt = { // Recipt object that is returned
			// Update object that is sent to Todoist Servers
			"cmd" : {
				"type" : "update_item",
				"uuid" : uuid.gen(),
				"args" : validateItem( obj ),
			},
			// Addistional endpoing calls
			"exts" : {}
		},

		// Shorthand
		args = recipt.cmd.args,
		exts = recipt.exts;

	if ( !args ) return abortSelf();

	// // External calls
	// If .projectId, call and validate move command
	if ( obj.projectId		) {
		exts.projectMove	= that.moveItem( obj, obj.projectId );
		if ( !exts.projectMove )
			return logger( "Invalid item or project ID", abortSelf() );
		logger( "You can also use .projectMove()" );
	}
	// If .checked or .isCompleted, call and validate complete command
	if ( obj.checked || obj.isCompleted ) {
		exts.completeItem	= that.completeItem( obj );
		if ( !exts.completeItem )
			return logger( "Invalid item ID", abortSelf() );
		logger( "You can also use .completeItem()" );
	}
	// If .isDeleted, call and validate complete command
	if ( obj.isDeleted ) {
		exts.deleteItem	= that.deleteItem( obj );
		if ( !exts.deleteItem )
			return logger( "Invalid item ID", abortSelf() );
		logger( "WHY ARE YOU DELETEING WITH THIS?" );
	}

	// Update update register
	updates[ args.id ] = recipt.args;
	updates.go = true;

	// Resume previous auto write, and call if true
	pauseAutoWrite( false );

	// Complete function by returning recipt
	return recipt;

	// Unified function to unpause without calling .write and return false
	function abortSelf() { pauseAutoWrite( false, true ); return false; }
};
////////		////////		Ex/Im-ports		////////		////////
this.toJSON		= function () {
	// TODO: Do more
	return JSON.stringify(that.dataArray);
};
this.saveState	= function () {
	// TODO: Do more
	return {
		dataArray:that.dataArray,
		token:this.token,
		sync_token:syncTokens.main
	};
};
this.loadState	= function (obj) {
		// TODO: Do more
		that.dataArray = obj.dataArray;
	};
////////		////////		Unsorted		////////		////////
var convention = "camelCase";
this.toConvention = function (type) {
	var shorthand = { "cC":"camelCase", "CC":"CamelCase", "_" :"underscore", };

	if (shorthand[type]) type = shorthand[type];
	if ( convention === type ) return logger ( "Already done", true );

	if ( type === "CamelCase" ) {}
	if ( type === "camelCase" ) {}
	if ( type === "underscore" ) {}
	if ( type === "lowercase" ) {}
	if ( type === "UPPERCASE" ) {}

	convention = type;
};
this.inboxProject = function () {
	if ( !inboxProject || !dataSupport.projects[inboxProject] ) return null;

	var obj = {},
		keys = Object.keys(dataSupport.projects[inboxProject]);

	for (var i = 0; i < keys.length; i++)
		{ obj[ keys[i] ] = that.items[ keys[i] ]; }

	return obj;
};
this.inboxProject.key = inboxProject;
function getId( item, location ) {
	var type = typeof item;
	if ( type === "object" && location[ item.id ] )
		return item.id;
	if ( ( type === "string" || type === "number" ) && location[ item ] )
		return item;

	return false;
}
var holdingAuto = null;
function pauseAutoWrite( bool, dnr ) {
	// If bool returns
	//	TRUE	: pause
	//	FALSE	: unpause
	// If dnr returns
	//	TRUE	: do not call .write()
	//	FALSE	: call .write()

	if ( bool ) {
		holdingAuto = that.write.auto;
		that.write.auto = false;
		return holdingAuto;
	}
	else {
		that.write.auto = holdingAuto;
		if ( that.write.auto && !dnr )
			return that.write();
	}
}
} // END OF CLASS //
