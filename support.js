/* jshint esversion: 6 */
evalMap = {				//	i/o/f	type	cmt	key map
	"limit"					:[ "in",	"string",	"If set with number, limits the number of xhr calls that can be made",	],
	// .sync()
	"token"					:[ "in",	"string",	"Set token with property",	],
	"items"					:[ "out",	"object",	"Output from .sync()",	"Dynamic" ],
	"projects"				:[ "out",	"object",	"Output from .sync()",	"Dynamic" ],
	"labels"				:[ "out",	"object",	"Output from .sync()",	"Dynamic" ],
	"liveNotifications"		:[ "out",	"object",	"Output from .sync()",	"Dynamic" ],
	"collaborators"			:[ "out",	"object",	"Output from .sync()",	"Dynamic" ],
	"notes"					:[ "out",	"object",	"Output from .sync()",	"Dynamic" ],
	"user"					:[ "out",	"object",	"Output from .sync()",	"Dynamic" ],
	"dataArray"				:[ "out",	"object",	"Output from .sync()",	"Dynamic" ],
	"lastSync"				:[ "out",	"date",		"Last time .sync() was completed",	],

	// .getCompleted()
	"completed"				:[ "out",	"object",	"Output from .getCompleted()",	{
		"items"					:[],
		"projects"				:[],
	}],
	// .getBackup()
	"backups"				:[ "out",	"object",	"Output from .getBackup()",	],
	// .syncActivities()
	"activities"			:[ "out",	"object",	"Output from .syncActivities()",	],
	// .getStats()
	"stats"					:[ "out",	"object",	"Output from .getStats()",	],

	// Internal-logger settings
	"logger"				:[ "in",	"object",	"Manage log",	{
		"tell"		:[], "track"		:[], "messages"	:[],
	}],

	// Functions
	"sync"					:[ "func",	"function",	"Syncs data with Todoist",	{
		"oncomplete"			:[],
		"iterator"				:[],
		"state"					:[],
	}],
	"getCompleted"			:[ "func",	"function",	"Gets completed tasks",	],
	"getStats"				:[ "func",	"function",	"Gets statistics",	{
		"oncomplete"			:[],
	}],
	"authenticateToken"		:[ "func",	"function",	"Autentecates token by calling sync endpoint without resource request",	],
	"syncFresh"				:[ "func",	"function",	"WIP: clears existing data and makes a fresh sync",	],
	"syncActivities"		:[ "func",	"function",	"Gets activity data",	{
		"oncomplete"			:[],
		"save"					:[],
	}],
	"write"					:[ "func",	"function",	"Sends wite commands to Todoist based on what has been registered",	{
		"auto"					:[ "in", "bool", "If set to true, calling registraion funtions will call .write(). Default: false", ],
	}],
	"getBackup"				:[ "func",	"function",	"Gets backup object from Todoist (NOTE: this does not download backups)",	],
	"moveItem"				:[ "func",	"function",	"Registers command instructions for .write()",	],
	"deleteItem"			:[ "func",	"function",	"Registers command instructions for .write()",	],
	"completeItem"			:[ "func",	"function",	"Registers command instructions for .write()",	],
	"updateItem"			:[ "func",	"function",	"Registers command instructions for .write()",	],
	"inboxProject"			:[ "func",	"function",	"Returns an array of items in the Inbox",	{
		"key"					:[], // ID of inbox project
	}],


	// No work made
	"toJSON"				:[ "in",	"function",	"",	],
	"saveState"				:[ "in",	"function",	"",	],
	"loadState"				:[ "in",	"function",	"",	],
	"toConvention"			:[ "in",	"function",	"",	],
};

// Object.keys(todoist).forEach( key => {
// 	var x = [ key, typeof todoist[key] ];
// 	if ( todoist[key] && (
// 			typeof todoist[key] === "function" ||
// 			typeof todoist[key] === "object"
// 		) ) {
// 		x.push( Object.keys( todoist[key] ));
//     }
// 	array.push(x);
// } );

function returnMarkdown() {
	var string = "";
	Object.keys( evalMap ).forEach( key => {
		var item		= evalMap [key],
			name		= key,
			interaction	= item[0],
			type		= item[1],
			note		= item[2],
			subProps	= item[3],

			title = interaction === "func" ? "." + name + "()" : name;

		string += "##### " + title + "\n" +
				"`" + interaction + "` " + note + "\n";
	} );
	return string;
}
