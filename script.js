/* DOKUWIKI:include_once raphael.js */
/* DOKUWIKI:include_once jquery.qtip.js */

jQuery(function () {
	console.log('---------------------');
	console.log('ADVRack Plugin v0.0.2');
        console.log('jQuery ' + jQuery().jquery);
	console.log('---------------------');

	jQuery('div.advrack').each(function () {
		console.log('ADVRack: parsing advrack stanza');
		drawRack(this);
	});
});

// define a few global variables
var drawing_wscale = 2.5, drawing_hscale = 1.5;
var h_regexp = /^(\d{1,2})([u|in|cm])*/i, w_regexp = /^(\d{1,2})([in|cm])/i;

Raphael.fn.roundedRectangle = function (x, y, w, h, r1, r2, r3, r4){
  var array = [];
  array = array.concat(["M",x,r1+y, "Q",x,y, x+r1,y]); //A
  array = array.concat(["L",x+w-r2,y, "Q",x+w,y, x+w,y+r2]); //B
  array = array.concat(["L",x+w,y+h-r3, "Q",x+w,y+h, x+w-r3,y+h]); //C
  array = array.concat(["L",x+r4,y+h, "Q",x,y+h, x,y+h-r4, "Z"]); //D

  return this.path(array);
};

function drawRack (el) {
	var racks = jQuery.parseJSON(jQuery.text(el));
	el.innerHTML = ""; // hide syntax from page.


	// define the Raphael paper object
	var paper = Raphael(el,0,0);
	paper.setViewBox(0,0,400,300,true);
	paper.setSize('100%', '100%');

	// iterate over how many racks we have defined.
	jQuery.each(racks, function(idx, rack) {
		if (! rack['options']['height']) {
			drawError({'paper': paper, msg: "No height property found at rack index: " + rack['options']['index']});
		}

		var rack_height = rack['options']['height'].match(h_regexp);
		var rack_width = rack['options']['width'].match(w_regexp);
		
		// calculate total height
		var servers_height = calcHeight(rack['servers']);
		var cages_height = calcHeight(rack['cages']);
		
		if ((servers_height['errors'].length > 0) || (cages_height['errors'].length > 0)) {
			var errors = new Array();
			jQuery.each(servers_height['errors'], function(idx, server_err) {
				errors.push({"msg": server_err['error']});
			});

			jQuery.each(cages_height['errors'], function(idx,cage_err) {
				errors.push({"msg": cage_err['error']});
			});

			if (! jQuery.isEmptyObject(errors))
				drawError(errors);
		}

		if ((servers_height['height'] + cages_height['height']) <= rack_height[1] * 4.445) {
			// draw the rack first: we're scaling 1:1 cm to pixel, we're also converting in to cm for the width and u to cm for the height
			var raph_rack = paper.rect(6,6, rack_width[1] * 2.54 * drawing_wscale, rack_height[1] * 4.445 * drawing_hscale);
			raph_rack.attr({"stroke-width": 4});

			// index the equipment from top to bottom
			var equipment = new Array(Number(rack_height[1]));
			e_length = equipment.length;
			for (var i = 0; i < e_length; i++) {
				equipment[i] = {'type': 'FILLER', 'index': 1+i, 'height': '1U'};
			}

			jQuery.each(rack['servers'], function(idx, server) {
				server['type'] = 'SERVER'; // stamp equipment as type: 'SERVER'
				equipment = deleteFillerPanels(server, equipment);
			});

			jQuery.each(rack['cages'], function(idx, cage) {
				cage['type'] = 'CAGE'; // stamp equipment as type: 'CAGE'
				equipment = deleteFillerPanels(cage, equipment);
			});

			// draw each equipment
			jQuery.each(equipment, function(idx, item) {
				if (item)
					drawEquipment(paper, raph_rack, item);
			});
		} else {
			drawError({'paper': paper, 'msg': 'Sum of servers and cages height is more than rack ' + rack['options']['index'] + '\'s U space!'});
		}
	});
}

function drawEquipment(paper, rack, equipment) {
	if (equipment['type']) {
		switch (equipment['type']) {
			case "SERVER":
				var boundaries = rack.getBBox();
				var h = equipment['height'].match(h_regexp);
				var equipment_height = h[1] * 4.445 * drawing_hscale;
				var server = paper.set();
				var server_block = paper.rect(boundaries.x, boundaries.y + ((equipment['index']-1) * 4.445 * drawing_hscale), boundaries.width, equipment_height, 2.0);
				// set server attributes
				var attributes = {'fill': 'white'};
				if (equipment['fill-color'])
					attributes['fill'] = equipment['fill-color'];
				server_block.attr(attributes);

				// create cosmetic effects
				setupGlowEffect(server_block);

				// set server description
				if (equipment['tooltip'])
					setupTooltip(server_block, equipment['tooltip']);

				// bundle stuff into one raphael object
				server.push(server_block);

				// set server label
				if (equipment['label']) {
					var boundaries = server_block.getBBox();
					var text = paper.text(boundaries.width/2+6, boundaries.y + boundaries.height/2, equipment['label']).attr({'font-size': 4, 'fill': 'black', 'text-anchor': 'middle'});
					server.push(text);
				}
				break;
			case "CAGE":
				var boundaries = rack.getBBox();
				var h = equipment['height'].match(h_regexp);
				var equipment_height = h[1] * 4.445 * drawing_hscale;
				var cage = paper.set();
				var cage_block = paper.rect(boundaries.x, boundaries.y + ((equipment['index']-1) * 4.445 * drawing_hscale), boundaries.width, equipment_height, 2.0);
				// set cage attributes
				var attributes = {'fill': 'white'};
				if (equipment['fill-color'])
					attributes['fill'] = equipment['fill-color'];
				cage_block.attr(attributes);

				// set cage label: might be overwritten by modules
				if (equipment['label']) {
					var boundaries = cage_block.getBBox();
					var text = paper.text(boundaries.width/2+6, boundaries.y + boundaries.height/2, equipment['label']).attr({'font-size': 4, 'fill': 'black', 'text-anchor': 'middle'});
					cage.push(text);
				}

				// draw cage decks
				if (equipment['decks']) {
					var previous_deck_height = 0;
					var dl = equipment['decks'];
					for (var d = 0; d < dl.length; d++) {
						var deck = equipment['decks'][d];
						var boundaries = cage_block.getBBox();
						if (! deck['height'])
							drawError({'paper': paper, 'msg': 'Height not defined in one of cage ' + equipment['index'] + ' decks'});
						var h = deck['height'].match(h_regexp);
						var deck_height = h[1] * 4.445 * drawing_hscale;
						var raph_deck = paper.set();
						var deck_block, corner = [0,0,0,0];
						if (d == 0) {
							deck_block = paper.roundedRectangle(boundaries.x, boundaries.y + previous_deck_height, boundaries.width, deck_height, 2,2,0,0);
							// set cornors for later use within sub-modules
							corner = [2,2,0,0];
						} else if (d < dl.length - 1) { 
							deck_block = paper.roundedRectangle(boundaries.x, boundaries.y + previous_deck_height, boundaries.width, deck_height, 0,0,0,0);
							// set cornors for later use within sub-modules
							corner = [0,0,0,0];
						} else {
							deck_block = paper.roundedRectangle(boundaries.x, boundaries.y + previous_deck_height, boundaries.width, deck_height, 0,0,2,2);
							// set cornors for later use within sub-modules
							corner = [0,0,2,2];
						}
						
						// fill the deck with white so mouse hover would have the correct effect
						deck_block.attr('fill', 'white');

						// setup the deck's tooltip
						if (deck['tooltip'])
							setupTooltip(deck_block, deck['tooltip']);

						// set the deck's label
						if (deck['label']) {
							var boundaries = deck_block.getBBox();
							var text = paper.text(boundaries.width/2+6, boundaries.y + boundaries.height/2, deck['label']).attr({'font-size': 4, 'fill': 'black', 'text-anchor': 'middle'});
							raph_deck.push(text);
						}
							
						// create cosmetic effects
						setupGlowEffect(deck_block);

						// draw blocks and blades
						if (deck['type'] === 'block') {
							if (deck['blocks'])
								drawDeckModules(paper, boundaries, corner, previous_deck_height, deck_height, deck['blocks'], deck, equipment);
						} else if (deck['type'] === 'blade') {
							if (deck['blades'])
								drawDeckModules(paper, boundaries, corner, previous_deck_height, deck_height, deck['blades'], deck, equipment);
						} else {
							drawError({'paper': paper, 'msg': 'Invalid equipment type! Decks can have type \'block\' or \'blade\' only.'});
						}

						raph_deck.push(deck_block);
						previous_deck_height += deck_height;
					}
				}

				// create cosmetic effects
				setupGlowEffect(cage_block);

				cage.push(cage_block);
				break;
			case "FILLER":
				var boundaries = rack.getBBox();
				var h = equipment['height'].match(h_regexp);
				var equipment_height = h[1] * 4.445 * drawing_hscale;
				var panel = paper.set();
				var filler = paper.rect(boundaries.x, boundaries.y + ((equipment['index']-1) * 4.445 * drawing_hscale), boundaries.width, equipment_height * 0.95).attr('fill','grey');
				boundaries = filler.getBBox();
				var text1 = paper.text(boundaries.x + boundaries.width - 6, boundaries.y + equipment_height/2, equipment['index']).attr({'text-anchor': 'start', 'font-size': 4, 'fill': '#ffffff'});
				var text2 = paper.text(boundaries.x + 2, boundaries.y + boundaries.height/2, 'filler panel').attr({'text-anchor': 'start', 'font-size': 4, 'fill': '#ffffff'});
				panel.push(filler, text1, text2);
				break;
			default:
				drawError({'paper': paper, 'msg': 'Invalid equipment type! This is a possible bug in the ADVRack plugin.'});
		}
	} else {
		drawError({'paper': paper, 'msg': 'No equipment type specified!'});
	}
}

function calcHeight (items) {
	var height = 0;
	var errors = new Array();
	jQuery.each(items, function(idx, item) {
		if (! item['height']) {
			errors.push({"error": "No height property found in item index: " + item['index']});
		} else if (! h_regexp.test(item['height'])) {
			errors.push({"error": "No height value specified or incorrect value. Item index: " + item['index']});
		} else {
			var h = item['height'].match(h_regexp);
			switch (h[2].toLowerCase()) {
				case "in":
					h[1] *= 2.54; // convert to Centimeters
					break;
				case "cm":
					break; // cm is the default measurement, we use 1:1 cm to px scale.
				case "u":
					h[1] *= 4.445; // convert from rack units to centimeters
					break;
				default:
					// we'll assume rack units if nothing is defined
					h[1] *= 4.445;
			}
			height += Number(h[1]);
		}
	});
	return {"errors": errors, "height": height};
}

function deleteFillerPanels(unit, equipment) {
	var unit_height = unit['height'].match(h_regexp);
	unit_height = Number(unit_height[1]);
	if (unit_height > 1) {
		for (var h = (unit['index']-1); h < (unit['index'] - 1 + unit_height); h++) {
			delete equipment[h];
		}
		equipment[unit['index']-1] = unit;
	} else {
		equipment[unit['index']-1] = unit;
	}
	return equipment;
}

function setupGlowEffect(unit) {
	unit.hover(function(){ // hover in
		this.glow_effect = this.glow({ width: 1, color: "blue" });
		this.glow_effect.toFront();
	}, function() { // hover out 
		this.glow_effect.remove();
	});
}

function setupTooltip(raph_obj, tooltip) {
	if (tooltip)
		jQuery(raph_obj.node).qtip(tooltip);
}

function drawDeckModules(paper, rack_boundaries, corner, previous_deck_height, deck_height, modules, deck, equipment) {
	// calculate module width
	var module_width = (rack_boundaries.width)/(modules.length);
	var previous_module_width = 0;
	for (var b = 0; b < modules.length; b++) {
		var module;
		if (b == 0) {
			module = paper.roundedRectangle(rack_boundaries.x + previous_module_width, rack_boundaries.y + previous_deck_height, module_width, deck_height, corner[0],0,0,corner[3]);
			// draw a thin border around the module; useful to define our module edges if it has a fill color.
			paper.roundedRectangle(rack_boundaries.x + previous_module_width, rack_boundaries.y + previous_deck_height, module_width, deck_height, corner[0],0,0,corner[3]).attr({'stroke-width': 0.2, 'stroke': 'black'});
		} else if (b < modules.length - 1) {
			module = paper.rect(rack_boundaries.x + previous_module_width, rack_boundaries.y + previous_deck_height, module_width, deck_height, 0,0,0,0);
			// draw a thin border around the module; useful to define our module edges if it has a fill color.
			paper.roundedRectangle(rack_boundaries.x + previous_module_width, rack_boundaries.y + previous_deck_height, module_width, deck_height,0,0,0,0).attr({'stroke-width': 0.2, 'stroke': 'black'});
		} else {
			module = paper.roundedRectangle(rack_boundaries.x + previous_module_width, rack_boundaries.y + previous_deck_height, module_width, deck_height, 0,corner[1],corner[2],0);
			// draw a thin border around the module; useful to define our module edges if it has a fill color.
			paper.roundedRectangle(rack_boundaries.x + previous_module_width, rack_boundaries.y + previous_deck_height, module_width, deck_height,0,corner[1],corner[2],0).attr({'stroke-width': 0.2, 'stroke': 'black'});
		}

		// a few cosmetic touches
		if (modules[b]['fill-color']) {
			module.attr('fill', modules[b]['fill-color']);
		} else {
			module.attr('fill', 'white');
		}
		if (modules[b]['tooltip']) {
			setupTooltip(module, modules[b]['tooltip']);
		} else if (deck['tooltip']) {
			setupTooltip(module, deck['tooltip']);
		} else {
			if (equipment['tooltip'])
				setupTooltip(module, equipment['tooltip']);
		}

		// set the deck's label
		if (modules[b]['label']) {
				
			var boundaries = module.getBBox();
			var text = paper.text(boundaries.x + boundaries.width/2, boundaries.y + boundaries.height/2, modules[b]['label']).attr({'font-size': 4, 'fill': 'black', 'text-anchor': 'middle'});
			if (deck['type'] === 'blade')
				text.transform('r-90');
		}
		
		// add glow effect to modules
		setupGlowEffect(module);

		previous_module_width += module_width;
	}
}

function drawError (error) {
	// a function to show error messasge, instead of rack drawing
	var paper = error.paper;
	paper.clear();
	var msg = error.msg;
	paper.text(10,10, 'ERROR: ' + msg).attr('text-anchor', 'start');
	exit();
}
