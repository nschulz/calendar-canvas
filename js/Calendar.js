 // !Document Information
/**
 *	Canvas Calendar
 *
 *	@author Nate Schulz (nate@nateschulz.com)
 *	@version 1.0
 */

// Debug mode? set to true for some addition console output
// and randomized event colors to test for overlap.
var DEBUG_MODE = false;

/**
 * Lays out events for a single day
 * This function handles all event layout. It has been tested and known to 
 * correctly layout at least 6 simultaneous events. The fundamental algorithm
 * is a recursive search to the left for simultaneous conflicting events. If a
 * conflict is found, both events are resized and positioned so that they do not
 * overlap on the canvas.
 *
 * @see checkLeft - for recursive definition
 *
 * @param array events
 * Array of event objects, each event has start time, end time
 * and unique id. Start time will be less than end time.
 *
 * @return array
 * returns array of event objects with width, left, and top set
 * in addition to the start and end times and unique id.
 *
**/
function layOutDay(events){
	for (var e = 0; e < events.length; e++) {
		var _event 		= events[e];
		_event.left		= 10;
		_event.top		= _event.start;
		_event.width	= 200;
		_event.duration = _event.end-_event.start;
		_event.overlap  = 0;
		_event.position = 0;
		_event.collisions = [];
		_event.columns  = 1;
		
		/**
		 * registerCollision()
		 * This is a method attached to each event which enables
		 * storage of collision information in an array attached
		 * to each event. This data is later used to modify all
		 * colliding events at the same time. 
		 * It allows a collision to be "registered" multiple
		 * times but only really "adds" it to the collision
		 * array if it is a new collision.
		 *
		 * @param int id - collision event index
		**/
		_event.registerCollision = function(id) {
			var newCollision = true;
			for (var i = 0; i < this.collisions.length; i++) {
				if (this.collisions[i] == id){
					newCollision = false;
					break;
				}
			}
			if (newCollision) {
				this.collisions[this.collisions.length] = id;
			}
		};
	};
	events.sort(sortByDuration);
	for (var e = 0; e < events.length; e++) {
		// begin recursive collision check
		events[e].position = checkLeft(events[e], e);
		// slide single collision events back to left
		if (events[e].position > 1 && events[e].collisions.length < 2) events[e].position = 0;
	};
	for (var e = 0; e < events.length; e++) {
		// map to events[e] to event for simplicity
		var event = events[e];

		// Prepare debugging output
		var _collisions = "";

		// Calculate the required number of columns to determine width
		for (var i = event.collisions.length-1; i>=0; i--) {
			_collisions += event.collisions[i]+", ";											// Used for debugging purposes only
			event.columns = Math.max(event.columns, events[event.collisions[i]].position+1);	// check for max columns then set all matching collisions
			events[event.collisions[i]].columns = event.columns;								// to same number of columns
		}
		event.width = parseInt(600/(event.columns));											// set event box width
		event.left = (event.position)*event.width+10;											// set event box left position
		
		// If DEBUG_MODEL global is true output some additional event information to the console via log method
		if (DEBUG_MODE) log("event "+e+" has "+event.columns+" columns and "+event.collisions.length+" collisions: "+_collisions);
	};
	// return the events array.		
	return events;	
};
/**
 * checkLeft()
 * This is the recursive helper function for the main layOutDay function.
 * If a collision is detected, it recursively checks for additional collisions
 * by searching through the remaining events. When collisions are found they
 * are "registered" with both events.
 *
 * @see _event.registerCollision() in layOutDay()
 * @param object event
 * @return int event.position - column position as integer
**/
function checkLeft(event, index){
	for (var i = 0; i < events.length; i++) {
		if (events[i].id == event.id) break;
		if (event.start < events[i].end && event.end > events[i].start) {
			event.registerCollision(i);
			//console.log("collision detected:" +event.id+ " and "+events[i].id);
			event.position = checkLeft(events[i], i) + 1;
			events[i].registerCollision(index);
		} else {
			continue;
		}
	};
	return event.position;
};
/**
 * Calendar constructor
 * Constructor for calendar canvas object.
 * The calendar object constructor automatically calls sub-methods
 * to initialize, and 
 * @params object array defaultEvents - array of event objects
**/
var Calendar = function(defaultEvents) {
	// Initialize canvas element and draw hour labels
	this.init();
	// Initialize events using layOutDay function
	events = layOutDay(defaultEvents);
	// draw the canvas
	this.drawEvents(events);
};
// Calendar prototype - contains additions calendar methods
Calendar.prototype = {
	/**
	 * Calendar.init()
	 * initializes the calendar container, timeline
	 * and canvas element. The whole container is then
	 * appended to the document body.
	 * @param none
	 * @return none
	**/
	init: function() {
		// Create container element
		this.container = document.createElement("div");
		this.container.setAttribute("class", "calendarContainer");
		this.container.setAttribute("className", "calendarContainer");
		// Create timeline element
		this.timeline  = document.createElement("ul");
		this.timeline.setAttribute("class", "timeline");
		this.timeline.setAttribute("className", "timeline");
		this.createTimeline();
		this.container.appendChild(this.timeline);
		// Create canvas element
		this.canvas = document.createElement("canvas");
		this.canvas.setAttribute("width","620");
		this.canvas.setAttribute("height","720");
		this.canvas.setAttribute("id", "CalendarView");
		this.container.appendChild(this.canvas);
		// Append calendar container to body
		document.body.appendChild(this.container);
		// Get 2D drawing context
		this.canvas.ctx = this.canvas.getContext('2d');
		// Clear drawing contect
		this.canvas.ctx.clearRect(0,0,620,720);
		// Draw background color
		this.canvas.ctx.fillStyle = "#ececec";
		this.canvas.ctx.fillRect(0, 0, 620, 720);
	},
	/**
	 * Calendar.createTimeline()
	 * Creates TimelineStops for each hour and half-hour
	 * then appends them to the the timeline.
	 * @param none
	 * @return none
	**/
	createTimeline: function() {
		this.timeline.stops = [];
		for (var h = 9; h <= 21; h++){
			this.timeline.appendChild(new TimelineStop(h, "00", false));
			if (h < 21)
			this.timeline.appendChild(new TimelineStop(h, "30", false));
		}
	},
	/**
	 * Calendar.drawEvents()
	 * This calendar method takes the events with position and width already set
	 * and lays them out on the canvas. Creates the necessary shape and text elements
	 * to create the event boxes.
	 * 
	 * @param object array events - array of event objects with positions and width set
	 * @return none
	**/
	drawEvents: function(events) {
		var canvas = this.canvas;
		for (var e = 0; e < events.length; e++) {
			var _evt = events[e];
			canvas.ctx.strokeStyle = "#aaa";
			canvas.ctx.strokeRect(_evt.left+3, _evt.start+1, _evt.width-3, _evt.duration-2);

			canvas.ctx.fillStyle = "rgba(255,255,255,1.0)";
			canvas.ctx.fillRect(_evt.left, _evt.start+1, _evt.width, (_evt.duration-2));

			if (DEBUG_MODE){
				canvas.ctx.fillStyle = "rgb("+parseInt(255*Math.random())+","+parseInt(150*Math.random())+","+parseInt(100*Math.random())+")";
			} else {
				canvas.ctx.fillStyle = "#4b6ea9";	
			}
			canvas.ctx.fillRect(_evt.left, _evt.start, 3, _evt.duration);

			canvas.ctx.fillStyle = "#4b6ea9";
			canvas.ctx.font = "bold 12px 'Lucida Grande', Arial";
			_left = _evt.left+13;
			_top  = _evt.start+22;
			if (DEBUG_MODE){
				canvas.ctx.fillText("Sample Item ("+e+") id "+_evt.id, _left, _top);
			} else {
				canvas.ctx.fillText("Sample Item", _left, _top);
			}
			canvas.ctx.fillStyle = "#797979";
			canvas.ctx.font = "9px Lucida Grande";
			if (DEBUG_MODE){
				canvas.ctx.fillText("width "+_evt.width+" location "+_evt.position+" with " + _evt.collisions.length+" collisions", _evt.left+13, (_evt.start+35));
			} else {
				canvas.ctx.fillText("Sample Location", _evt.left+13, (_evt.start+35));
			}
		};
	}
};
/**
 * returnEarlierEvent(e1, e2)
 * simple compares start times and returns the earlier event.
 * @param event object e1
 * @param event object e2
 * @return event object
**/
function returnEarlierEvent(e1,e2){
	if (e1.start <= e2.start) return e1;
	return e2;
};
/**
 * returnLaterEvent(e1, e2)
 * simple compares start times and returns the later event.
 * @param event object e1
 * @param event object e2
 * @return event object
**/
function returnLaterEvent(e1,e2){
	if (e1.start >= e2.start) return e1;
	return e2;
};
/**
 * sortByStart(e1, e2)
 * javascript sort method helper to sort by event start time
 * @param event object e1
 * @param event object e2
 * @return int result
**/
function sortByStart(e1,e2){
	var x = e1.start;
	var y = e2.start;
	var result = ((x < y) ? -1: ((x > y) ? 1: 0));
	return result;
};
/**
 * sortByDuration(e1, e2)
 * javascript sort method helper to sort by event duration
 * @param event object e1
 * @param event object e2
 * @return int result
**/
function sortByDuration(e1,e2){
	var y = e1.end-e1.start;
	var x = e2.end-e2.start;
	var result = ((x < y) ? -1: ((x > y) ? 1: 0));
	return result;
};
/**
 * log(str)
 * helper method to check for console availability in debug mode
 * @param string str - string to be logged
**/
function log(str) {
	try {
		console.log(str);
	} catch(e) {}
};
/**
 * TimelineStop constructor
 * Creates a timeline stop based on supplied params
 * Determines major or minor stop based on 00 minutes
 * @param int hr
 * @param int min
 * @param bool milTime
 * @return HTMLDivElement element - returns the stop as a <li> element
**/
var TimelineStop = function(hr, min, milTime){
	if (min == "00") var type = "major";
	else var type = "minor";
	this.elem = document.createElement("li");
	this.elem.setAttribute("class", type);
	this.elem.timeField = document.createElement("span");
	this.elem.timeField.setAttribute("class", type);
	
	if (milTime == false && hr > 12){
		this.elem.timeField.innerHTML = (hr-12)+":"+min;
	} else {
		this.elem.timeField.innerHTML = hr+":"+min;
	}
		this.elem.appendChild(this.elem.timeField);
		
	if (type == "major" && milTime == false) {
		this.elem.meridian = document.createElement("span");
		this.elem.meridian.setAttribute("class", "meridian");
		if (hr >= 12) {
			this.elem.meridian.innerHTML = " pm";
		} else {
			this.elem.meridian.innerHTML = " am";
		}
		this.elem.appendChild(this.elem.meridian);
	}
	return this.elem;
};