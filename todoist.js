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
function logger( message, r ) {
	if ( that.logger.tell )		console.log( message );
	if ( that.logger.track )	that.logger.messages.push( String(message) );

	if ( arguments.length > 1 ) return r;
	else						return message;
}
this.logger = {
	tell		:	false,
	track		:	false,
	messages	:	[],
};
function ajax( paramObj, url, onloadFunc ) {
	// Validation
	if (
			typeof paramObj		!== "object" ||
			typeof url			!== "string" ||
			typeof onloadFunc	!== "function"
		) return false;

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
		if	( paramObj[ key ].toString )
			paramString += key +"="+String(paramObj[ key ]).replace(/'/g,"\"");
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
this.sync = function () {
	// Validate presence of token
	if		( !that.token ) return logger ("No Token", false);

	// Prevent too many connections
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
			"token"			: this.token,
			"sync_token"	: "*", // syncTokens.main, NOTE: Partial sync diabled until merging functionality is present
			"resource_types": "['all']",
		},
		"sync",
		loadEvent
	);

	function loadEvent( response ) {
		// Camelise response
		response = cameliseKeys( response );

		// Error handling
		// TODO: implement error handling
		if (response.error) return logger(response, false);

		// Tempory code for testing purposes, will eventually be invalidated by better code
		data = nativisor( response, true );
		if ( data ) that.dataArray = data;
		else 		return logger( data, false );

		// Optional function
		if (that.sync.oncomplete) that.sync.oncomplete( that.dataArray );

		// End of connection, decrement connection count
		countOfConn--;
	}
};
this.sync.oncomplete			= null;
that.dataArray					= null;
this.token						= null;
function nativisor( response, camelised ) {
	// Camelise response
	if ( !camelised ) response = cameliseKeys( response );

	var i, e,				// Looping variables
		key,				// Working element
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
		],
		lit = {				// Objects replace their Array counterpart
			items 				: {},
			projects			: {},
			labels 				: {},
			liveNotifications	: {},
			collaborators		: {},
			notes				: {},
		};

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
		delete project.id;
		delete project.color;
		delete project.inboxProject;

		// Build replacement object
		lit.projects[key] = project;
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
			collaborator.avatar.big		= imgUrlBase + collaborator.imageId +
																"_big.jpg";
			collaborator.avatar.medium	= imgUrlBase + collaborator.imageId +
																"_medium.jpg";
			collaborator.avatar.s640	= imgUrlBase + collaborator.imageId +
																"_s640.jpg";
			collaborator.avatar.small	= imgUrlBase + collaborator.imageId +
																"_small.jpg";
			collaborator.avatar.raw		= collaborator.imageId;
		}
		else
			collaborator.avatar 		= null;
		delete collaborator.imageId;
		delete collaborator.id;

		// Build replacement object
		lit.collaborators[ key ] = collaborator;
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
		delete label.id;
		delete label.color;

		// Build replacement object
		lit.labels[ key ] = label;
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
		delete notification.id;
		// TODO: implement more nativisation relevant to specific to special cases

		// Build replacement object
		lit.liveNotifications[key] = notification;
	} notification = key = null; // Housekkieping

	/*						Items								  */
	for( i = 0; i < response.items.length; i++ ) {
		// Set working vars
		item	= cameliseKeys(response.items[i]);
		key		= item.id;

		// Referential dataSupport
		dataSupport.projects	[ item.projectId ]	[ key ] = true;
		dataSupport.projects	[ item.projectId ]	[ key ] = true;
		dataSupport.priorities	[ item.priority ]	[ key ] = true;
		for ( e = 0; e < item.labels.length; e++ )
			{dataSupport.labels	[ item.labels[e] ]	[ item.id ] = true;}

		// Nativisation
		item.checked	= 		Boolean	( item.checked		);
		item.dateAdded	= new 	Date	( item.dateAdded	);
		item.dueDateUtc	= new 	Date	( item.dueDateUtc	);
		item.isArchived	= 		Boolean	( item.isArchived	);
		item.isDeleted	= 		Boolean	( item.isDeleted	);
		item.notes		= {};	// NOTE: Could be handled in notes iteration
		delete item.id;

		// Build replacement object
		lit.items[key] = item;
	} item = key = null; // Housekkieping

	/*						Notes								  */
	for( i = 0; i < response.notes.length; i++ ) {
		// TODO: Decide where to keep notes, in item or in notes object
		// Set working vars
		note	= cameliseKeys(response.notes[i]);
		key		= note.id;
		item	= note.itemId;

		// Nativisation
		note.posted		= new Date	(note.posted);
		note.isArchived	= Boolean	(note.isArchived);
		note.isDeleted	= Boolean	(note.isDeleted);
		delete note.id;

		// Embed notes into relevant Item
		// if ( !	lit.items[ item ].notes )
		// 		lit.items[ item ].notes = {};
		// NOTE: Handled in notes iteration ATM
		lit.items[ item ].notes[ key ] = note;

		// Build replacement object
		lit.notes[key] = note;
	} note = key = null; // Housekkieping

	// TODO: Iterator for locations
	// TODO: Iterator for projectNotes
	// TODO: Iterator for reminders
	// TODO: Iterator for collaboratorStates

	// Replacing Arrays with new litteral Objects
	response.projects				= lit.projects;
	response.collaborators			= lit.collaborators;
	response.labels					= lit.labels;
	response.liveNotifications		= lit.liveNotifications;
	response.items					= lit.items;
	response.notes					= lit.notes;
	response.notes					= lit.notes;
	lit = null;

	if (response.user){// NOTE: neu is used to simplify the code
		neu = cameliseKeys(response.user);
		neu.freeTrailExpires	= new Date(neu.freeTrailExpires);
		neu.joinDate			= new Date(neu.joinDate);
		neu.premiumUntil		= new Date(neu.premiumUntil);

		inboxProject = neu.inboxProject;
		delete neu.inboxProject;
		that.inboxProject.key = inboxProject; // TODO: set readonly

		delete neu.token; // XXX: ???

		response.user = neu;
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
this.inboxProject = function () {
	if (!inboxProject || !dataSupport.projects[inboxProject]) return null;

	var obj = {},
		keys = Object.keys(dataSupport.projects[inboxProject]);

	for (var i = 0; i < keys.length; i++) {
		// keys[i]
		obj[keys[i]] = that.dataArray.items[keys[i]];
	}

	return obj;
};
this.inboxProject.key = inboxProject;
} // END OF CLASS //
