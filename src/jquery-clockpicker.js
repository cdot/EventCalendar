/*!
 * Derived from:
 * ClockPicker v0.0.7 (http://weareoutman.github.io/clockpicker/)
 * Copyright 2014 Wang Shenwei.
 * Licensed under MIT (https://github.com/weareoutman/clockpicker/blob/gh-pages/LICENSE)
 */
/* eslint-env browser, jquery */

// Can I use inline svg ?
const svgNS = 'http://www.w3.org/2000/svg';
const svgSupported = 'SVGAngle' in window
      && (function(){
				const el = document.createElement('div');
			  el.innerHTML = '<svg/>';
			  const supported = (el.firstChild
                           && el.firstChild.namespaceURI) == svgNS;
			  el.innerHTML = '';
			  return supported;
		  })();

// Can I use transition ?
const transitionSupported = (function(){
	const style = document.createElement('div').style;
	return 'transition' in style ||
	'WebkitTransition' in style ||
	'MozTransition' in style ||
	'msTransition' in style ||
	'OTransition' in style;
})();

// Listen to touch events in touch screen device, instead of mouse events
// in desktop (touch-punch may already have redirected them?)
const touchSupported = 'ontouchstart' in window;
const mousedownEvent = 'mousedown' + ( touchSupported ? ' touchstart' : '');
const	mousemoveEvent = 'mousemove.clockpicker'
      + ( touchSupported ? ' touchmove.clockpicker' : '');
const mouseupEvent = 'mouseup.clockpicker'
      + ( touchSupported ? ' touchend.clockpicker' : '');

// Vibrate the device if supported
const vibrate = navigator.vibrate
      ? 'vibrate' : navigator.webkitVibrate ? 'webkitVibrate' : null;

function createSvgElement(name) {
	return document.createElementNS(svgNS, name);
}

function leadingZero(num) {
	return (num < 10 ? '0' : '') + num;
}

// Get a unique id
let idCounter = 0;
function uniqueId(prefix) {
	const id = ++idCounter + '';
	return prefix ? prefix + id : id;
}

// Clock size
const dialRadius = 100;
const outerRadius = 80;
// innerRadius = 80 on 12 hour clock
const innerRadius = 54;
const tickRadius = 13;
const diameter = dialRadius * 2;
const duration = transitionSupported ? 350 : 1;

// Popover template
const tpl = [
	'<div class="clockpicker-popover ui-widget">',
	'<div class="arrow"></div>',
	'<div class="popover-title">',
	'<span class="clockpicker-span-hours ui-state-highlight"></span>',
	' : ',
	'<span class="clockpicker-span-minutes"></span>',
	'<span class="clockpicker-span-am-pm"></span>',
	'</div>',
	'<div class="popover-content">',
	'<div class="clockpicker-plate">',
	'<div class="clockpicker-canvas"></div>',
	'<div class="clockpicker-dial clockpicker-hours"></div>',
	'<div class="clockpicker-dial clockpicker-minutes clockpicker-dial-out"></div>',
	'</div>',
	'<span class="clockpicker-am-pm-block">',
	'</span>',
	'</div>',
	'</div>'
].join('');

function raiseCallback(callbackFunction) {
	if (callbackFunction && typeof callbackFunction === "function") {
		callbackFunction();
	}
}

class ClockPicker {
  constructor(element, options) {
		const $popover = $(tpl);
		const plate = $('.clockpicker-plate', $popover);
		const hoursView = $('.clockpicker-hours', $popover);
		const minutesView = $('.clockpicker-minutes', $popover);
		const amPmBlock = $('.clockpicker-am-pm-block', $popover);
		const isInput = element.prop('tagName') === 'INPUT';
		const input = isInput ? element : element.find('input');
		const addon = element.find('.input-group-addon');
		const self = this;

		this.id = uniqueId('cp');
		this.element = element;
		this.options = options;
		this.isAppended = false;
		this.isShown = false;
		this.currentView = 'hours';
		this.isInput = isInput;
		this.input = input;
		this.addon = addon;
		this.popover = $popover;
		this.plate = plate;
		this.hoursView = hoursView;
		this.minutesView = minutesView;
		this.amPmBlock = amPmBlock;
		this.spanHours = $('.clockpicker-span-hours', $popover);
		this.spanMinutes = $('.clockpicker-span-minutes', $popover);
		this.spanAmPm = $('.clockpicker-span-am-pm', $popover);
		this.amOrPm = "PM";

		// Setup for for 12 hour clock if option is selected
		if (options.twelvehour) {
			$('<button type="button" class="btn btn-sm btn-default clockpicker-button am-button">' + "AM" + '</button>')
			.on("click", function() {
				self.amOrPm = "AM";
				$('.clockpicker-span-am-pm').empty().append('AM');
			}).appendTo(this.amPmBlock);

			$('<button type="button" class="btn btn-sm btn-default clockpicker-button pm-button">' + "PM" + '</button>')
			.on("click", function() {
				self.amOrPm = 'PM';
				$('.clockpicker-span-am-pm').empty().append('PM');
			}).appendTo(this.amPmBlock);
		}

		if (!options.autoclose) {
			// If autoclose is not set, append a button
			$('<button type="button" class="btn btn-sm btn-default btn-block clockpicker-button">' + options.donetext + '</button>')
			.click($.proxy(this.done, this))
			.appendTo($popover);
		}

		// Placement and arrow align - make sure they make sense.
		if ((options.placement === 'top' || options.placement === 'bottom') && (options.align === 'top' || options.align === 'bottom')) options.align = 'left';
		if ((options.placement === 'left' || options.placement === 'right') && (options.align === 'left' || options.align === 'right')) options.align = 'top';

		$popover.addClass(options.placement);
		$popover.addClass('clockpicker-align-' + options.align);

		this.spanHours.click($.proxy(this.toggleView, this, 'hours'));
		this.spanMinutes.click($.proxy(this.toggleView, this, 'minutes'));

		// Show or toggle
		input.on('focus.clockpicker click.clockpicker', $.proxy(this.show, this));
		addon.on('click.clockpicker', $.proxy(this.toggle, this));

		// Build ticks
		const tickTpl = $('<div class="clockpicker-tick"></div>');
		let i, tick, radian, radius;

		// Hours view
		if (options.twelvehour) {
			for (i = 1; i < 13; i += 1) {
				tick = tickTpl.clone();
				radian = i / 6 * Math.PI;
				radius = outerRadius;
				tick.css('font-size', '120%');
				tick.css({
					left: dialRadius + Math.sin(radian) * radius - tickRadius,
					top: dialRadius - Math.cos(radian) * radius - tickRadius
				});
				tick.html(i === 0 ? '00' : i);
				hoursView.append(tick);
				tick.on(mousedownEvent, mousedown);
			}
		} else {
			for (i = 0; i < 24; i += 1) {
				tick = tickTpl.clone();
				radian = i / 6 * Math.PI;
				const inner = i > 0 && i < 13;
				radius = inner ? innerRadius : outerRadius;
				tick.css({
					left: dialRadius + Math.sin(radian) * radius - tickRadius,
					top: dialRadius - Math.cos(radian) * radius - tickRadius
				});
				if (inner) {
					tick.css('font-size', '120%');
				}
				tick.html(i === 0 ? '00' : i);
				hoursView.append(tick);
				tick.on(mousedownEvent, mousedown);
			}
		}

		// Minutes view
		for (i = 0; i < 60; i += 5) {
			tick = tickTpl.clone();
			radian = i / 30 * Math.PI;
			tick.css({
				left: dialRadius + Math.sin(radian) * outerRadius - tickRadius,
				top: dialRadius - Math.cos(radian) * outerRadius - tickRadius
			});
			tick.css('font-size', '120%');
			tick.html(leadingZero(i));
			minutesView.append(tick);
			tick.on(mousedownEvent, mousedown);
		}

		// Clicking on minutes view space
		plate.on(mousedownEvent, function(e){
			if ($(e.target).closest('.clockpicker-tick').length === 0) {
				mousedown(e, true);
			}
		});

		// Mousedown or touchstart
		function mousedown(e, space) {
			const offset = plate.offset();
			const isTouch = /^touch/.test(e.type);
			const x0 = offset.left + dialRadius;
			const y0 = offset.top + dialRadius;
			const dx = (isTouch ? e.originalEvent.touches[0] : e).pageX - x0;
			const dy = (isTouch ? e.originalEvent.touches[0] : e).pageY - y0;
			const z = Math.sqrt(dx * dx + dy * dy);
			let moved = false;

			// When clicking on minutes view space, check the mouse position
			if (space && (z < outerRadius - tickRadius || z > outerRadius + tickRadius)) {
				return;
			}
			e.preventDefault();

			// Set cursor style of body after 200ms
			const movingTimer = setTimeout(function(){
				$("body").addClass('clockpicker-moving');
			}, 200);

			// Place the canvas to top
			if (svgSupported) {
				plate.append(self.canvas);
			}

			// Clock
			self.setHand(dx, dy, ! space, true);

			// Mousemove on document
			$(document).off(mousemoveEvent).on(mousemoveEvent, function(e){
				e.preventDefault();
				const isTouch = /^touch/.test(e.type);
				const x = (isTouch ? e.originalEvent.touches[0] : e).pageX - x0;
				const y = (isTouch ? e.originalEvent.touches[0] : e).pageY - y0;
				if (! moved && x === dx && y === dy) {
					// Clicking in chrome on windows will trigger a mousemove event
					return;
				}
				moved = true;
				self.setHand(x, y, false, true);
			});

			// Mouseup on document
			$(document).off(mouseupEvent).on(mouseupEvent, function(e){
				$(document).off(mouseupEvent);
				e.preventDefault();
				const isTouch = /^touch/.test(e.type);
				const x = (isTouch ? e.originalEvent.changedTouches[0] : e).pageX - x0;
				const y = (isTouch ? e.originalEvent.changedTouches[0] : e).pageY - y0;
				if ((space || moved) && x === dx && y === dy) {
					self.setHand(x, y);
				}
				if (self.currentView === 'hours') {
					self.toggleView('minutes', duration / 2);
				} else {
					if (options.autoclose) {
						self.minutesView.addClass('clockpicker-dial-out');
						setTimeout(function(){
							self.done();
						}, duration / 2);
					}
				}
				plate.prepend(self.canvas);

				// Reset cursor style of body
				clearTimeout(movingTimer);
				$("body").removeClass('clockpicker-moving');

				// Unbind mousemove event
				$(document).off(mousemoveEvent);
			});
		}

		if (svgSupported) {
			// Draw clock hands and others
			const canvas = $('.clockpicker-canvas', $popover);
			const svg = createSvgElement('svg');
			svg.setAttribute('class', 'clockpicker-svg');
			svg.setAttribute('width', diameter);
			svg.setAttribute('height', diameter);
			const g = createSvgElement('g');
			g.setAttribute('transform', 'translate(' + dialRadius + ',' + dialRadius + ')');
			var bearing = createSvgElement('circle');
			bearing.setAttribute('class', 'clockpicker-canvas-bearing');
			bearing.setAttribute('cx', 0);
			bearing.setAttribute('cy', 0);
			bearing.setAttribute('r', 2);
			const hand = createSvgElement('line');
			hand.setAttribute('x1', 0);
			hand.setAttribute('y1', 0);
			const bg = createSvgElement('circle');
			bg.setAttribute('class', 'clockpicker-canvas-bg');
			bg.setAttribute('r', tickRadius);
			const fg = createSvgElement('circle');
			fg.setAttribute('class', 'clockpicker-canvas-fg');
			fg.setAttribute('r', 3.5);
			g.appendChild(hand);
			g.appendChild(bg);
			g.appendChild(fg);
			g.appendChild(bearing);
			svg.appendChild(g);
			canvas.append(svg);

			this.hand = hand;
			this.bg = bg;
			this.fg = fg;
			this.bearing = bearing;
			this.g = g;
			this.canvas = canvas;
		}

		raiseCallback(this.options.init);
	}

	// Default options
	static DEFAULTS = {
		'default': '',       // default time, 'now' or '13:14' e.g.
		fromnow: 0,          // set default time to * milliseconds from now (using with default = 'now')
		placement: 'bottom', // clock popover placement
		align: 'left',       // popover arrow align
		donetext: 'Done',    // done button text
		autoclose: false,    // auto close when minute is selected
		twelvehour: false, // change to 12 hour AM/PM clock from 24 hour
		vibrate: true        // vibrate the device when dragging clock hand
	};

	// Show or hide popover
	toggle(){
		this[this.isShown ? 'hide' : 'show']();
	}

	// Set popover position
	locate() {
		const element = this.element;
		const popover = this.popover;
		const offset = element.offset();
		const width = element.outerWidth();
		const height = element.outerHeight();
		const placement = this.options.placement;
		const align = this.options.align;
		const styles = {};

		popover.show();

		// Place the popover
		switch (placement) {
		case 'bottom':
			styles.top = offset.top + height;
			break;
		case 'right':
			styles.left = offset.left + width;
			break;
		case 'top':
			styles.top = offset.top - popover.outerHeight();
			break;
		case 'left':
			styles.left = offset.left - popover.outerWidth();
			break;
		}

		// Align the popover arrow
		switch (align) {
		case 'left':
			styles.left = offset.left;
			break;
		case 'right':
			styles.left = offset.left + width - popover.outerWidth();
			break;
		case 'top':
			styles.top = offset.top;
			break;
		case 'bottom':
			styles.top = offset.top + height - popover.outerHeight();
			break;
		}

		popover.css(styles);
	}

	// Show popover
	show() {
		// Not show again
		if (this.isShown) {
			return;
		}

		raiseCallback(this.options.beforeShow);

		const self = this;

		// Initialize
		if (! this.isAppended) {
			$("body").append(this.popover);

			// Reset position when resize
			$(window).on('resize.clockpicker' + this.id, function(){
				if (self.isShown) {
					self.locate();
				}
			});

			this.isAppended = true;
		}

		// Get the time
		let value = ((this.input.prop('value')
                    || this.options.default
                    || '') + '').split(':');
		if (value[0] === 'now') {
			const now = new Date(+ new Date() + this.options.fromnow);
			value = [
				now.getHours(),
				now.getMinutes()
			];
		}
		this.hours = + value[0] || 0;
		this.minutes = + value[1] || 0;
		this.spanHours.html(leadingZero(this.hours));
		this.spanMinutes.html(leadingZero(this.minutes));

		// Toggle to hours view
		this.toggleView('hours');

		// Set position
		this.locate();

		this.isShown = true;

		// Hide when clicking or tabbing on any element except the clock, input and addon
		$(document).on('click.clockpicker.' + this.id + ' focusin.clockpicker.' + this.id, function(e){
			const target = $(e.target);
			if (target.closest(self.popover).length === 0 &&
					target.closest(self.addon).length === 0 &&
					target.closest(self.input).length === 0) {
				self.hide();
			}
		});

		// Hide when ESC is pressed
		$(document).on('keyup.clockpicker.' + this.id, function(e){
			if (e.keyCode === 27) {
				self.hide();
			}
		});

		raiseCallback(this.options.afterShow);
	}

	// Hide popover
	hide() {
		raiseCallback(this.options.beforeHide);

		this.isShown = false;

		// Unbinding events on document
		$(document).off('click.clockpicker.' + this.id + ' focusin.clockpicker.' + this.id);
		$(document).off('keyup.clockpicker.' + this.id);

		this.popover.hide();

		raiseCallback(this.options.afterHide);
	}

	// Toggle to hours or minutes view
	toggleView(view, delay) {
	  let raiseAfterHourSelect = false;
		if (view === 'minutes' && $(this.hoursView).css("visibility") === "visible") {
			raiseCallback(this.options.beforeHourSelect);
			raiseAfterHourSelect = true;
		}
		const isHours = view === 'hours';
		const nextView = isHours ? this.hoursView : this.minutesView;
		const hideView = isHours ? this.minutesView : this.hoursView;

		this.currentView = view;

		this.spanHours.toggleClass('ui-state-highlight', isHours);
		this.spanMinutes.toggleClass('ui-state-highlight', ! isHours);

		// Let's make transitions
		hideView.addClass('clockpicker-dial-out');
		nextView.css('visibility', 'visible').removeClass('clockpicker-dial-out');

		// Reset clock hand
		this.resetClock(delay);

		// After transitions ended
		clearTimeout(this.toggleViewTimer);
		this.toggleViewTimer = setTimeout(function(){
			hideView.css('visibility', 'hidden');
		}, duration);

		if (raiseAfterHourSelect) {
			raiseCallback(this.options.afterHourSelect);
		}
	}

	// Reset clock hand
	resetClock(delay) {
		const view = this.currentView;
		const value = this[view];
		const isHours = view === 'hours';
		const unit = Math.PI / (isHours ? 6 : 30);
		const radian = value * unit;
		const radius = isHours && value > 0 && value < 13 ? innerRadius : outerRadius;
		const x = Math.sin(radian) * radius;
		const y = - Math.cos(radian) * radius;
		const self = this;
		if (svgSupported && delay) {
			self.canvas.addClass('clockpicker-canvas-out');
			setTimeout(function(){
				self.canvas.removeClass('clockpicker-canvas-out');
				self.setHand(x, y);
			}, delay);
		} else {
			this.setHand(x, y);
		}
	}

	// Set clock hand to (x, y)
	setHand(x, y, roundBy5, dragging) {
		let radian = Math.atan2(x, - y);
		const isHours = this.currentView === 'hours';
		const unit = Math.PI / (isHours || roundBy5 ? 6 : 30);
		const z = Math.sqrt(x * x + y * y);
		const options = this.options;
		const inner = isHours && z < (outerRadius + innerRadius) / 2;
		let radius = inner ? innerRadius : outerRadius;
		let value;

		if (options.twelvehour) {
			radius = outerRadius;
		}

		// Radian should in range [0, 2PI]
		if (radian < 0) {
			radian = Math.PI * 2 + radian;
		}

		// Get the round value
		value = Math.round(radian / unit);

		// Get the round radian
		radian = value * unit;

		// Correct the hours or minutes
		if (options.twelvehour) {
			if (isHours) {
				if (value === 0) {
					value = 12;
				}
			} else {
				if (roundBy5) {
					value *= 5;
				}
				if (value === 60) {
					value = 0;
				}
			}
		} else {
			if (isHours) {
				if (value === 12) {
					value = 0;
				}
				value = inner ? (value === 0 ? 12 : value) : value === 0 ? 0 : value + 12;
			} else {
				if (roundBy5) {
					value *= 5;
				}
				if (value === 60) {
					value = 0;
				}
			}
		}

		// Once hours or minutes changed, vibrate the device
		if (this[this.currentView] !== value) {
			if (vibrate && this.options.vibrate) {
				// Do not vibrate too frequently
				if (! this.vibrateTimer) {
					navigator[vibrate](10);
					this.vibrateTimer = setTimeout($.proxy(function(){
						this.vibrateTimer = null;
					}, this), 100);
				}
			}
		}

		this[this.currentView] = value;
		this[isHours ? 'spanHours' : 'spanMinutes'].html(leadingZero(value));

		// If svg is not supported, just add an active class to the tick
		if (! svgSupported) {
			this[isHours ? 'hoursView' : 'minutesView'].find('.clockpicker-tick').each(function(){
				const tick = $(this);
				tick.toggleClass('active', value === + tick.html());
			});
			return;
		}

		// Place clock hand at the top when dragging
		if (dragging || (! isHours && value % 5)) {
			this.g.insertBefore(this.hand, this.bearing);
			this.g.insertBefore(this.bg, this.fg);
			this.bg.setAttribute('class', 'clockpicker-canvas-bg clockpicker-canvas-bg-trans');
		} else {
			// Or place it at the bottom
			this.g.insertBefore(this.hand, this.bg);
			this.g.insertBefore(this.fg, this.bg);
			this.bg.setAttribute('class', 'clockpicker-canvas-bg');
		}

		// Set clock hand and others' position
		const cx = Math.sin(radian) * radius;
		const cy = - Math.cos(radian) * radius;
		this.hand.setAttribute('x2', cx);
		this.hand.setAttribute('y2', cy);
		this.bg.setAttribute('cx', cx);
		this.bg.setAttribute('cy', cy);
		this.fg.setAttribute('cx', cx);
		this.fg.setAttribute('cy', cy);
	}

	// Hours and minutes are selected
	done() {
		raiseCallback(this.options.beforeDone);
		this.hide();
		const last = this.input.prop('value');
		let value = leadingZero(this.hours) + ':' + leadingZero(this.minutes);
		if  (this.options.twelvehour) {
			value = value + this.amOrPm;
		}

		this.input.prop('value', value);
		if (value !== last) {
			this.input.triggerHandler('change');
			if (! this.isInput) {
				this.element.trigger('change');
			}
		}

		if (this.options.autoclose) {
			this.input.trigger('blur');
		}

		raiseCallback(this.options.afterDone);
	}

	// Remove clockpicker from input
	remove() {
		this.element.removeData('clockpicker');
		this.input.off('focus.clockpicker click.clockpicker');
		this.addon.off('click.clockpicker');
		if (this.isShown) {
			this.hide();
		}
		if (this.isAppended) {
			$(window).off('resize.clockpicker' + this.id);
			this.popover.remove();
		}
	}
}

/**
 * | Name | Default | Description |
 * | default | '' | default time, 'now' or '13:14' e.g. |
 * | placement | 'bottom' | popover placement |
 * | align | 'left' | popover arrow align |
 * | donetext | 'Done' | done button text |
 * | autoclose | false | auto close when minute is selected |
 * | twelvehour | false | enables twelve hour mode with AM & PM buttons |
 * | vibrate | true | vibrate the device when dragging clock hand |
 * | fromnow | 0 | set default time to * milliseconds from now (using with default = 'now') |
 * | init | | callback function triggered after the colorpicker has been initiated |
 * | beforeShow | | callback function triggered before popup is shown |
 * | afterShow | | callback function triggered after popup is shown |
 * | beforeHide | | callback function triggered before popup is hidden Note:will be triggered between a beforeDone and afterDone |
 * | afterHide | | callback function triggered after popup is hidden Note:will be triggered between a beforeDone and afterDone |
 * | beforeHourSelect | | callback function triggered before user makes an hour selection |
 * | afterHourSelect | | callback function triggered after user makes an hour selection |
 * | beforeDone | | callback function triggered before time is written to input |
 * | afterDone | | callback function triggered after time is written to input |
 */
$.fn.clockpicker = function(...args){
  const option = args[0];
	return this.each(function(){
		const $this = $(this);
		const data = $this.data('clockpicker');
		if (!data) {
			const options = $.extend(
        {}, ClockPicker.DEFAULTS, $this.data(),
        typeof option == 'object' && option);
			$this.data('clockpicker', new ClockPicker($this, options));
		} else {
			// Manual operations. show, hide, remove, e.g.
			if (typeof data[option] === 'function') {
				data[option].apply(data, args);
			}
		}
	});
};
