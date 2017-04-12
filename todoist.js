/* jshint laxbreak : true */
var Todoist = (function () {

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
	that.items				= {};
	that.projects			= {};
	that.labels				= {};
	that.liveNotifications	= {};
	that.collaborators		= {};
	that.notes				= {};
	that.user				= null;
	that.lastSync			= null;
	that.completed			= null;
	that.activities			= null;
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
	that.logger = {
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
		if ( obj.id ) {
			args.id = getId( obj.id, that.items );
			if ( !args.id ) return false;
		}

		// Propety validation and setting
		if ( obj.content		) {
			// If .content is string set command
			if ( typeof obj.content === "string" )
				args.content = obj.content;

			// If .content is string convertable, set converted string
			else if ( typeof obj.content.toString === "function" ) {
				args.content = obj.content.toString();
				logger( ".content is not a string, but is being converted" );
			}

			// Else to content settable, abort
			else return csn( ".content is not string and can't be converted" );
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
	function csn( msg ) {
		// "Computer says no" - Some bloke from the Jop Center
		return logger( msg, false );
	}
	////////		////////		Comms			////////		////////
	function ajax( paramObj, url, onloadFunc ) {
		if ( !paramObj.token ) paramObj.token = that.token;
		ajaxMain( paramObj, url, onloadFunc );
	}
	that.offline					= null;
	that.limit						= null;
	that.sync						= function () {
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
					logger( "Unexpected Sync", false );

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
	that.sync.oncomplete			= null;
	that.sync.iterator				= {
		projects			: null,
		collaborators		: null,
		labels				: null,
		liveNotifications	: null,
		items				: null,
		notes				: null,
		projectNotes		: null,
	};
	that.sync.state					= false;
	that.getCompleted				= function ( callback ) {
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
			[].push.apply(that.completed.items,response.items);

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
	that.getStats					= function () {
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
	that.getStats.oncomplete		= null;
	that.stats						= null;
	that.authenticateToken			= function ( testToken, callback ) {
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
	that.syncFresh					= function () {
		if (navigator.onLine) {
			syncTokens.main = "*";
			that.sync();
		}
		else logger( "syncFresh: offline, sync aborted" );
	};
	that.syncActivities				= function () {
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
	that.syncActivities.oncomplete	= null; // func
	that.syncActivities.save		= true; // Bool / Def-TRUE
	that.dataArray					= null;
	that.token						= null;
	that.write						= function ( obj ) {
		var cmds = [];

		if ( moveItems.go ) {
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

		if ( creates.go ) {
			Object.keys( creates ).forEach(function ( key ) {
				// Ignore go key
				if ( key === "go" ) return;

				// push non-null values to cmds array
				if ( creates [ key ] )
					cmds.push({
						"type"		: "item_add",
						"temp_id"	: creates[ key ].uuid,
						"uuid"		: creates[ key ].uuid,
						"args"		: creates[ key ].args,
					});

				// null and delete each propety
				creates [ key ] = null;
				delete creates [ key ];
			});

			creates.go = false;
		}

		// If updates.go
		if ( updates.go ) {
			Object.keys( updates ).forEach( function ( key ) {
				// Ignore go key
				if ( key === "go" ) return;

				// push non-null values to cmds array
				if ( updates[ key ] )
					cmds.push( updates[ key ] );

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
				cmds.push({
					"type": v[1],
					"uuid": v[0].uuid,
					"args": { "ids": v[0].ids },
				});
		} );

		if ( cmds.length === 0 ) return csn( "No cmds available" );

		ajax(
			{ "commands" : JSON.stringify( cmds ), },
			"sync",
			loadEvent
		);

		function loadEvent(response) {

		}
	};
	that.write.auto					= false;
	that.getBackup = function ( cb ) {
		if ( that.sync.state )
			logger( "Sync needs to be made to validate premium", false );
		if ( that.user.isPremium )
			logger( "This use does not have premium", false );
		return ajax(
			{}, "backups/get",
			function (response) {
				that.backups = response;
				if ( cb ) cb();
			}
		);
	};
	that.backups = null;
	////////		////////		Write			////////		////////
	var moveItems	= { go : false };
	var updates		= { go : false };
	var creates		= { go : false };
	var deletes		= { uuid : uuid.gen(), ids : [] };
	var completes	= { uuid : uuid.gen(), ids : [] };
	that.moveItem = function ( item, project, cancel ) {
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
	that.deleteItem = function ( item, cancel ) {
		return tinker( item, cancel, that.items, deletes );
	};
	that.completeItem = function ( item, cancel ) {
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
	that.updateItem = function ( obj, cancel ) {
		// TODO: Cancel implementation

		// Prevent writes during function calls
		pauseAutoWrite( true );

		// Validatiton
		if ( typeof obj !== "object" || !obj.id )
			return abortSelf( "Invalid command object" );

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

		if ( !args ) return abortSelf( "Invalid command object" );

		// // External calls
		function extCallUnifier ( extKey, func, msgAbort, msgWarn ) {
			exts[extKey] = func();
			logger( msgWarn );
			if ( !exts[extKey] ) return abortSelf( msgAbort );
		}
		// If .projectId, call and validate move command
		if (
			obj.projectId &&
			!extCallUnifier(
				"projectMove",
				function(){ return that.moveItem( obj, obj.projectId ); },
				"Invalid item or project ID",
				"You can also use .projectMove()"
			)
		) return false;
		// If .checked or .isCompleted, call and validate complete command
		if (
			( obj.checked || obj.isCompleted ) &&
			!extCallUnifier(
				"completeItem",
				function(){ return that.completeItem( obj ); },
				"Invalid item ID",
				"You can also use .completeItem()"
			)
		) return false;
		// If .isDeleted, call and validate complete command
		if (
			obj.isDeleted &&
			!extCallUnifier(
				"deleteItem",
				function(){ return that.deleteItem( obj ); },
				"Invalid item ID",
				"WHY ARE YOU DELETEING WITH THIS?"
			)
		) return false;

		// Update update register
		updates[ args.id ] = recipt;
		updates.go = true;

		// Resume previous auto write, and call if true
		pauseAutoWrite( false );

		// Complete function by returning recipt
		return recipt;

		// Unified function to unpause without calling .write and return false
		function abortSelf( msg ){ pauseAutoWrite(false,true); return csn( msg ); }
	};
	that.createItem = function ( obj, cancel ) {
		// TODO: Cancel implementation

		var
			wrap = {
				uuid : uuid.gen(),
				args : validateItem( obj ),
			},
			cmd = wrap.args;

		// Validation
		if ( !wrap.args )	return csn( "Invalid commands object" );
		if ( !cmd.content )	return csn( "Content is required" );
		if ( cmd.id )		return csn( ".id is not a valid argument" );

		creates.go = true;
		creates[ wrap.uuid ] = wrap;

		return wrap;
	};
	////////		////////		Ex/Im-ports		////////		////////
	that.toJSON		= function () {
		// TODO: Do more
		return JSON.stringify(that.dataArray);
	};
	that.saveState	= function () {
		// TODO: Do more
		return {
			dataArray:that.dataArray,
			token:that.token,
			sync_token:syncTokens.main
		};
	};
	that.loadState	= function (obj) {
			// TODO: Do more
			that.dataArray = obj.dataArray;
		};
	////////		////////		Unsorted		////////		////////
	that.inboxProject = function () {
		if ( !inboxProject || !dataSupport.projects[inboxProject] ) return null;

		var obj = {},
			keys = Object.keys(dataSupport.projects[inboxProject]);

		for (var i = 0; i < keys.length; i++)
			{ obj[ keys[i] ] = that.items[ keys[i] ]; }

		return obj;
	};
	that.inboxProject.key = inboxProject;
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
	function ajaxMain( paramObj, url, onloadFunc ) {
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
	Todoist.registerUser = function ( email, fullName, password ){

		var ret;
		if ( Todoist.registerUser.loadAsCurrent ) ret = new Todoist();
		else ret = true;

		ajaxMain(
			{
				"email"		: email,
				"full_name"	: fullName,
				"password"	: password,
			},
			"user/register",
			loadevent
		);

		return ret;

		function loadevent( response ) {
			var example = {
					"id": 1855589,
					"token": "0123456789abcdef0123456789abcdef01234567",
					"email": "me@xample.com",
					"full_name": "Example User",
					"inbox_project": 128501411,
					"tz_info": {
						"timezone": "GMT +1:00",
						"gmt_string": "+01:00",
						"hours": 1,
						"minutes": 0,
						"is_dst": 0
					},
					"start_page": "overdue, 7 days",
					"start_day": 1,
					"next_week": 1,
					"date_format": 0,
					"time_format": 0,
					"sort_order": 0,
					"default_reminder": null,
					"auto_reminder": 30,
					"mobile_host": null,
					"mobile_number": null,
					"completed_count": 20,
					"completed_today": 2,
					"karma": 684.0,
					"karma_trend": "-",
					"is_premium": false,
					"premium_until": null,
					"is_biz_admin": false,
					"business_account_id": null,
					"image_id": null,
					"avatar_small": "https://*.cloudfront.net/*_small.jpg",
					"avatar_medium": "https://*.cloudfront.net/*_medium.jpg",
					"avatar_big": "https://*.cloudfront.net/*_big.jpg",
					"avatar_s640": "https://*.cloudfront.net/*_s640.jpg",
					"theme": 0,
					"features": {
						"beta": 0,
						"restriction": 3,
						"has_push_reminders": false,
					},
					"join_date": "Wed 30 Apr 2014 13:24:38 +0000"
				};
			response = example;
			console.log(response);

		}
	};
	Todoist.registerUser.loadAsCurrent	= false;
	Todoist.registerUser.syncAfter		= false;
	Todoist.itemTemplate = function ( type, $input ) {
		/**
		* Produces template object as an aid
		*/
		var template = {
			dateString		: null,
			dateLang		: null,
			dueDateUtc		: null,
			prioirty		: null,
			indent			: null,
			itemOrder		: null,
			dayOrder		: null,
			collapsed		: null,
			labels			: null,
			assignedByUid	: null,
			responsibleUid	: null,
		};

		if ( type === "create" ) {
			template.content	= "";
			template.projectId	= null;
		}
		if ( type === "update" ) {
			template.id = $input
							? getId( $input, that.items )
							: template.id = "REQUIRED";
		}

		return template;
	};

	return Todoist;
})();
