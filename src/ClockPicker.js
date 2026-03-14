/*!
 * ClockPicker v0.0.7 (http://weareoutman.github.io/clockpicker/)
 * Copyright 2014 Wang Shenwei.
 * Licensed under MIT (https://github.com/weareoutman/clockpicker/blob/gh-pages/LICENSE)
 * Converted to ESM, made scalable by font size by Crawford Currie 2023
 */

// Can I use inline svg?
const SVG_NS = 'http://www.w3.org/2000/svg';
const HAVE_SVG = 'SVGAngle' in window
      && (() => {
				const el = document.createElement('div');
			  el.innerHTML = '<svg/>';
			  const supported = (el.firstChild
                           && el.firstChild.namespaceURI) == SVG_NS;
			  el.innerHTML = '';
			  return supported;
		  })();

// Can I use transition?
const HAVE_TRANSITION = (() => {
	const style = document.createElement('div').style;
	return 'transition' in style ||
	'WebkitTransition' in style ||
	'MozTransition' in style ||
	'msTransition' in style ||
	'OTransition' in style;
})();

const DOWN_EVENTS = [ 'mousedown' ];
const	MOVE_EVENTS = [ 'mousemove.clockpicker' ];
const UP_EVENTS   = [ 'mouseup.clockpicker' ];

// Listen to touch events in touch screen device, as well as mouse events
// in desktop.
const HAVE_TOUCH = 'ontouchstart' in window;
if (HAVE_TOUCH) {
  DOWN_EVENTS.push('touchstart');
  MOVE_EVENTS.push('touchmove.clockpicker');
  UP_EVENTS.push('touchend.clockpicker');
}

// Vibrate the device if supported
const VIBRATE = navigator.vibrate
      ? 'vibrate' : navigator.webkitVibrate ? 'webkitVibrate' : null;

// Get a unique id
let idCounter = 0;
function uniqueId(prefix) {
	const id = ++idCounter + '';
	return prefix ? prefix + id : id;
}

const TRANSITION_TIME = HAVE_TRANSITION ? 350 : 1;

/**
 * A modal dialog that supports input of a time using a graphical interface.
 * A ClockPicker instance is associated with an element, and then methods
 * of the class can be called on the attached instance.
 */
class ClockPicker {

	// Default options
	static DEFAULTS = {
		default:          '',
		fromnow:          0,
		placement:        'bottom',
		align:            'left',
		donetext:         'Done',
		autoclose:        true,
		twelvehour:       false,
		vibrate:          true
  };

  /**
   * Add an event handler for an event to an element. An event name
   * can be qualified by event namespaces that simplify removing or
   * triggering the event. For example, "click.clockpicker" defines
   * the clockpicker namespace for this particular click event. A
   * click event handler attached via that string can be removed with
   * unlisten(element, "click.clockpicker") without disturbing other
   * click handlers attached to the element.
   * @param {HTMLElement} el the element
   * @param {string|string[]} events the event name(s)
   * @param {function} func the event handler
   * @private
   */
  listen(el, events, func) {
    if (typeof events === "string")
      events = [ events ];
    for (const ev of events) {
      //console.debug("listen", el, events);
      if (!this.listeners[el])
        this.listeners[el] = {};
      if (!this.listeners[el][ev])
        this.listeners[el][ev] = [];
      this.listeners[el][ev].push(func);
      //console.debug(`\t+${ev.replace(/\..*$/, "")}`);
      el.addEventListener(ev.replace(/\..*$/, ""), func);
    }
    return this;
  }

  /**
   * @private
   */
  unlisten(el, events) {
    if (typeof events === "string")
      events = [ events ];
    for (const ev of events) {
      //console.debug("unlisten", el, ev);
      if (this.listeners[el] && this.listeners[el][ev]) {
        for (const func of Object.values(this.listeners[el][ev])) {
          //console.debug(`\t-${ev.replace(/\..*$/, "")}`);
          el.removeEventListener(ev.replace(/\..*$/, ""), func);
        }
        delete this.listeners[el][ev];
      } //else console.debug(`\t${ev} listener not found`);
    }
    return this;
  }

  /**
   * @param {HTMLElement} element element to attach the picker to.
   * @param {object} options interaction and layout options.
   * @param {number} options.default default time, 'now' or '13:14' default: ''
   * @param {string} options.placement popover placement, default: 'bottom'
   * @param {string} options.align popover arrow align, default: 'left'
   * @param {string} options.donetext done button text, default: 'Done'
   * @param {boolean} options.autoclose auto close when minute is
   * selected default: true
   * @param {boolean} options.twelvehour enables twelve hour mode with
   * AM & PM buttons default: false
   * @param {boolean} options.vibrate vibrate the device when dragging
   * clock hand default: true
   * @param {number} options.fromnow set default time to * milliseconds
   * from now (using with default = 'now') default: 0
   * @param {function} options.init callback function called after
   * the colorpicker has been initiated
   * @param {function} options.beforeShow callback function called
   * before popup is shown
   * @param {function} options.afterShow callback function called
   * after popup is shown
   * @param {function} options.beforeHide callback function called
   * before popup is hidden Note:will be called between beforeDone
   * and afterDone
   * @param {function} options.afterHide callback function called
   * after popup is hidden Note: will be called between beforeDone
   * and afterDone
   * @param {function} options.beforeHourSelect callback function
   * called before user makes an hour selection
   * @param {function} options.afterHourSelect callback function
   * called after user makes an hour selection
   * @param {function} options.beforeDone callback function called
   * before time is written to input
   * @param {function} options.afterDone callback function called
   * after time is written to input
   */
  constructor(element, options) {
    this.listeners = {};
		this.element = element;
		this.options = {};

    Object.keys(ClockPicker.DEFAULTS)
    .forEach(k => this.options[k] = ClockPicker.DEFAULTS[k]);
    if (element.dataset) {
      Object.keys(element.dataset)
      .forEach(k => this.options[k] = element.dataset[k]);
    }
    if (options) {
      Object.keys(options)
      .forEach(k => this.options[k] = options[k]);
    }
    options = this.options;

    this.listeners = {};

		this.id = uniqueId('cp');

    function createElement(type, cssClasses, appendTo) {
		  const el = document.createElement(type);
      for (const c of cssClasses.split(" "))
        el.classList.add(c);
      if (appendTo)
        appendTo.append(el);
      return el;
    }

		this.popover = createElement("div", "clockpicker-popover");
    this.popover.style.fontSize = "smaller";

    createElement("div", "arrow", this.popover);
    const title = createElement("div", "popover-title", this.popover);
	  this.spanHours = createElement(
      "span", "clockpicker-span-hours clockpicker-state-highlight", title);
	  title.append(":");
	  this.spanMinutes = createElement("span", "clockpicker-span-minutes", title);
    this.spanAmPm = createElement("span", "clockpicker-span-am-pm", title);

    const content = createElement("div", "popover-content", this.popover);
    this.plate = createElement("div", 'clockpicker-plate', content);
    this.canvas = createElement("div", "clockpicker-canvas", this.plate);
		this.hoursView = createElement(
      "div", 'clockpicker-hours clockpicker-dial', this.canvas);
		this.minutesView = createElement(
      "div", 'clockpicker-minutes clockpicker-dial clockpicker-dial-out',
      this.canvas);
		const amPmBlock = createElement("span", "clockpicker-am-pm-block", content);
		this.isInput = element.tagName === 'INPUT';
		if (this.isInput)
      this.input = element;
    else {
      this.input = document.createElement('input');
      element.append(this.input);
    }
		// LOST this.addon = element.querySelector('.input-group-addon');

		this.isAppended = false;
		this.isShown = false;
		this.currentView = 'hours';
		this.amOrPm = "PM";

    // Get the font size in px
    const fs = window.getComputedStyle(element).getPropertyValue('font-size');
    // Layout is calculated on the basis of a 24px font in a 200px
    // dial.
    const font_factor = parseFloat(fs) / 18;

    this.outerRadius = 80 * font_factor;
    // innerRadius = 80 on 12 hour clock
    this.innerRadius = 54 * font_factor;
    this.dialRadius = 100 * font_factor;
    this.tickRadius = 13 * font_factor;

		// Setup for for 12 hour clock if option is selected
		if (options.twelvehour) {
      const amBut = document.createElement("button");
			amBut.type = "button";
      amBut.classList.add("btn");
      amBut.classList.add("btn-sm");
      amBut.classList.add("btn-default");
      amBut.classList.add("clockpicker-button");
      amBut.classList.add("am-button");
      amBut.textContent = "AM";
			this.listen(amBut, "click", () => {
				this.amOrPm = "AM";
				this.spanAmPm.textContent = 'AM';
			});
      amPmBlock.append(amBut);

      const pmBut = document.createElement("button");
			pmBut.classList.add("btn");
      pmBut.classList.add("btn-sm");
      pmBut.classList.add("btn-default");
      pmBut.classList.add("clockpicker-button");
      pmBut.classList.add("pm-button");
      pmBut.textContent = "PM";
			this.listen(pmBut, "click", () => {
				this.amOrPm = 'PM';
				this.spanAmPm.textContent = 'PM';
			});
      amPmBlock.append(pmBut);
		}

		if (!options.autoclose) {
			// If autoclose is not set, append a button
      const closeBut = document.createElement("button");
			closeBut.classList.add("btn");
      closeBut.classList.add("btn-sm");
      closeBut.classList.add("btn-default");
      closeBut.classList.add("btn-block");
      closeBut.classList.add("clockpicker-button");
      closeBut.textContent = options.donetext;
      this.listen(closeBut, "click", () => this.done());
			this.popover.append(closeBut);
		}

		// Placement and arrow align - make sure they make sense.
		if ((options.placement === 'top' || options.placement === 'bottom')
        && (options.align === 'top' || options.align === 'bottom'))
      options.align = 'left';
		if ((options.placement === 'left' || options.placement === 'right')
        && (options.align === 'left' || options.align === 'right'))
      options.align = 'top';
		this.popover.classList.add(options.placement);
		this.popover.classList.add(`arrow-${options.align}`);

		this.listen(this.spanHours, "click", () => this.toggleView('hours'));
		this.listen(this.spanMinutes, "click", () => this.toggleView('minutes'));

		// Show or toggle
    this.showEventHandler = () => this.show();
	  this.listen(this.input, "focus.clockpicker", this.showEventHandler);
    this.listen(this.input, "click.clockpicker", this.showEventHandler);

	  // Build ticks
	  const tickTpl = createElement("div", "clockpicker-tick");

	  // Hours view
	  if (options.twelvehour) {
		  for (let i = 1; i < 13; i += 1) {
			  const tick = tickTpl.cloneNode();
			  const radian = i / 6 * Math.PI;
			  const radius = this.outerRadius;
			  tick.style.fontSize = '120%';
				tick.style.left = `${this.dialRadius + Math.sin(radian) * radius
        - this.tickRadius}px`;
				tick.style.top = `${this.dialRadius - Math.cos(radian) * radius
        - this.tickRadius}px`;
				tick.textContent = i;
				this.hoursView.append(tick);
				this.listen(tick, DOWN_EVENTS, e => this.handleMouseDown(e));
			}
		} else {
			for (let i = 0; i < 24; i += 1) {
				const tick = tickTpl.cloneNode();
				const radian = i / 6 * Math.PI;
				const inner = i > 0 && i < 13;
				const radius = inner ? this.innerRadius : this.outerRadius;
				tick.style.left = `${this.dialRadius + Math.sin(radian) * radius
        - this.tickRadius}px`;
				tick.style.top = `${this.dialRadius - Math.cos(radian) * radius
        - this.tickRadius}px`;
				if (inner) {
					tick.style.fontSize = '120%';
				}
				tick.textContent = (i === 0 ? '00' : i);
				this.hoursView.append(tick);
				this.listen(tick, DOWN_EVENTS, e => this.handleMouseDown(e));
			}
		}

		// Minutes view
		for (let i = 0; i < 60; i += 5) {
			const tick = tickTpl.cloneNode();
			const radian = i / 30 * Math.PI;
			tick.style.left = `${this.dialRadius + Math.sin(radian) * this.outerRadius - this.tickRadius}px`;
			tick.style.top = `${this.dialRadius - Math.cos(radian) * this.outerRadius - this.tickRadius}px`;
			//tick.style.fontSize = '120%';
			tick.textContent = `${i}`.padStart(2, "0");
			this.minutesView.append(tick);
			this.listen(tick, DOWN_EVENTS, e => this.handleMouseDown(e));
		}

		// Clicking on minutes view space
		this.listen(this.plate, DOWN_EVENTS, e => {
			if (!e.target.closest('.clockpicker-tick')) {
				this.handleMouseDown(e, true);
			}
		});

		if (HAVE_SVG) {
			// Draw clock hands and others
      const diameter = this.dialRadius * 2;
      this.plate.style.width = `${diameter}px`;
      this.plate.style.height = `${diameter}px`;
			const svg = document.createElementNS(SVG_NS, 'svg');
			svg.setAttribute('class', 'clockpicker-svg');
			svg.setAttribute('width', diameter);
			svg.setAttribute('height', diameter);
			const g = document.createElementNS(SVG_NS, 'g');
			g.setAttribute('transform', 'translate('
                     + this.dialRadius + ',' + this.dialRadius + ')');
			var bearing = document.createElementNS(SVG_NS, 'circle');
			bearing.setAttribute('class', 'clockpicker-canvas-bearing');
			bearing.setAttribute('cx', 0);
			bearing.setAttribute('cy', 0);
			bearing.setAttribute('r', 2);
			const hand = document.createElementNS(SVG_NS, 'line');
			hand.setAttribute('x1', 0);
			hand.setAttribute('y1', 0);
			const bg = document.createElementNS(SVG_NS, 'circle');
			bg.setAttribute('class', 'clockpicker-canvas-bg');
			bg.setAttribute('r', this.tickRadius);
			const fg = document.createElementNS(SVG_NS, 'circle');
			fg.setAttribute('class', 'clockpicker-canvas-fg');
			fg.setAttribute('r', 3.5);
			g.appendChild(hand);
			g.appendChild(bg);
			g.appendChild(fg);
			g.appendChild(bearing);
			svg.appendChild(g);
			this.canvas.append(svg);

			this.hand = hand;
			this.bg = bg;
			this.fg = fg;
			this.bearing = bearing;
			this.g = g;
		}

		if (typeof this.options.init === "function")
      this.options.init();
	}

  /**
   * @param {Event} e
   * @param {boolean} space
   * @private
   */
  handleMouseDown(e, space) {
    //console.debug("handleMouseDown", e.type);
    const bcr = this.plate.getBoundingClientRect();
		const isTouch = /^touch/.test(e.type);
		const x0 = bcr.left + window.scrollX + this.dialRadius;
		const y0 = bcr.top + window.scrollY + this.dialRadius;
		const dx = (isTouch ? e.originalEvent.touches[0] : e).pageX - x0;
		const dy = (isTouch ? e.originalEvent.touches[0] : e).pageY - y0;
		const z = Math.sqrt(dx * dx + dy * dy);
		let moved = false;

		// When clicking on minutes view space, check the mouse position
		if (space && (z < this.outerRadius - this.tickRadius || z > this.outerRadius + this.tickRadius)) {
			return;
		}
		e.preventDefault();

		// Set cursor style of body after 200ms
		const movingTimer = setTimeout(
      () => document.querySelector("body")
      .classList.add('clockpicker-moving'), 200);

		// Place the canvas to top
		if (HAVE_SVG)
			this.plate.append(this.canvas);

		// Clock
		this.setHand(dx, dy, ! space, true);

    const handleMouseMove = e => {
      //console.debug("handleMouseMove", e.type);
			e.preventDefault();
			const isTouch = /^touch/.test(e.type);
			const x = (isTouch ? e.originalEvent.touches[0] : e).pageX - x0;
			const y = (isTouch ? e.originalEvent.touches[0] : e).pageY - y0;
			if (! moved && x === dx && y === dy) {
				// Clicking in chrome on windows will trigger a mousemove event
				return;
			}
			moved = true;
			this.setHand(x, y, false, true);
		};

    this.unlisten(document, MOVE_EVENTS);
    this.listen(document, MOVE_EVENTS, handleMouseMove);

    const handleMouseUp = e => {
      //console.debug("handleMouseUp", e.type);
			this.unlisten(document, UP_EVENTS);
			e.preventDefault();
			const isTouch = /^touch/.test(e.type);
			const x = (isTouch ? e.originalEvent.changedTouches[0] : e).pageX - x0;
			const y = (isTouch ? e.originalEvent.changedTouches[0] : e).pageY - y0;
			if ((space || moved) && x === dx && y === dy) {
				this.setHand(x, y);
			}
			if (this.currentView === 'hours') {
				this.toggleView('minutes', TRANSITION_TIME / 2);
			} else {
				if (this.options.autoclose) {
					this.minutesView.classList.add('clockpicker-dial-out');
					setTimeout(() => this.done(), TRANSITION_TIME / 2);
				}
			}
			this.plate.prepend(this.canvas);

			// Reset cursor style of body
			clearTimeout(movingTimer);
			document.querySelector("body").classList.remove('clockpicker-moving');

			// Unbind mousemove event
			this.unlisten(document, MOVE_EVENTS);
		};

 		this.unlisten(document, UP_EVENTS);
    this.listen(document, UP_EVENTS, handleMouseUp);
  }

	/**
   * Set popover position
   * @private
   */
	locate() {
    const bcr = this.input.getBoundingClientRect();
		const offset = {
      top: bcr.top + window.scrollY,
      left: bcr.left + window.scrollX
    };
		const width = this.element.offsetWidth;
		const height = this.element.offsetHeight;

    this.popover.style.display = 'block';

		// Place the popover
		switch (this.options.placement) {
		case 'bottom':
			this.popover.style.top = `${offset.top + height}px`;
			break;
		case 'right':
			this.popover.style.left = `${offset.left + width}px`;
			break;
		case 'top':
			this.popover.style.top = `${offset.top - this.popover.offsetHeight}px`;
			break;
		case 'left':
			this.popover.style.left = `${offset.left - this.popover.offsetWidth}px`;
			break;
		}

		// Align the popover arrow
		switch (this.options.align) {
		case 'left':
			this.popover.style.left = `${offset.left}px`;
			break;
		case 'right':
			this.popover.style.left =
      `${offset.left + width - this.popover.offsetWidth}px`;
			break;
		case 'top':
			this.popover.style.top = `${offset.top}px`;
			break;
		case 'bottom':
			this.popover.style.top =
      `${offset.top + height - this.popover.offsetHeight}px`;
			break;
		}
	}

	/**
   * Show the picker
   */
	show() {
		if (this.isShown)
			return;

		if (typeof this.options.beforeShow === "function")
      this.options.beforeShow();

		// Initialize
		if (!this.isAppended) {
			document.querySelector("body").append(this.popover);

			// Reset position when resize
			this.listen(window, `resize.clockpicker${this.id}`, () => {
				if (this.isShown)
					this.locate();
			});

			this.isAppended = true;
		}

		// Get the time
		let value = ((this.input.value
                    || this.options.default
                    || '') + '').split(':');
		if (value[0] === 'now') {
			const now = new Date(+ new Date() + this.options.fromnow);
			value = [
				now.getHours(),
				now.getMinutes()
			];
		}
		this.hours = +value[0] || 0;
		this.minutes = +value[1] || 0;
		this.spanHours.textContent = `${this.hours}`.padStart(2, "0");
		this.spanMinutes.textContent = `${this.minutes}`.padStart(2, "0");

		// Toggle to hours view
		this.toggleView('hours');

		// Set position
		this.locate();

		this.isShown = true;
    function isDescendant(ancestor, el) {
      let parent = el;
      while (parent) {
        if (parent === ancestor)
          return true;
        parent = parent.parentElement;
      }
      return false;
    }
		// Hide when clicking or tabbing on any element except the clock,
    // input and addon
    this.hider = e => {
			const target = e.target;
			if (!isDescendant(this.popover, target)
				  // LOST && !isDescendant(this.addon, target)
					&& !isDescendant(this.input, target)) {
				this.popover.style.display = "none";
			}
		};
		this.listen(document, `click.clockpicker.${this.id}`, this.hider);
    this.listen(document, `focusin.clockpicker.${this.id}`, this.hider);

		// Hide when ESC is pressed
		this.listen(document, `keyup.clockpicker.${this.id}`, e => {
			if (e.keyCode === 27) {
				this.hide();
			}
		});

		if (typeof this.options.afterShow === "function")
		  this.options.afterShow();
	}

	/**
   * Hide the picker
   */
	hide() {
		if (typeof this.options.beforeHide === "function")
		this.options.beforeHide();

		this.isShown = false;

		// Unbinding events on document
		this.unlisten(document, `click.clockpicker.${this.id}`);
    this.unlisten(document, `focusin.clockpicker.${this.id}`);
		this.unlisten(document, `keyup.clockpicker.${this.id}`);

		this.popover.style.display = 'none';

		if (typeof this.options.afterHide === "function")
		  this.options.afterHide();
	}

	/**
   * Change to hours view
   */
  hours() {
    this.toggleView('hours');
  }

	/**
   * Change to hours view
   */
  minutes() {
    this.toggleView('minutes');
  }

	/**
   * Toggle to hours or minutes view
   * @param {string} view "hours" or "minutes"
   * @param {number?} delay optional transition delay
   */
	toggleView(view, delay) {
	  let raiseAfterHourSelect = false;
    const v = window.getComputedStyle(this.hoursView)
          .getPropertyValue("visibility");
		if (view === 'minutes' && v === "visible") {
		  if (typeof this.options.beforeHourSelect === "function")
			  this.options.beforeHourSelect();
			raiseAfterHourSelect = true;
		}
		const isHours = view === 'hours';
		const nextView = isHours ? this.hoursView : this.minutesView;
		const hideView = isHours ? this.minutesView : this.hoursView;

		this.currentView = view;

		this.spanHours.classList.toggle('clockpicker-state-highlight', isHours);
		this.spanMinutes.classList.toggle('clockpicker-state-highlight', !isHours);

		// Let's make transitions
		hideView.classList.add('clockpicker-dial-out');
		nextView.style.visibility = 'visible';
    nextView.classList.remove('clockpicker-dial-out');

		// Reset clock hand
		this.resetClock(delay);

		// After transitions ended
		clearTimeout(this.toggleViewTimer);
		this.toggleViewTimer =
    setTimeout(() => hideView.style.visibility = 'hidden', TRANSITION_TIME);

		if (raiseAfterHourSelect
        && typeof this.options.afterHourSelect === "function")
			this.options.afterHourSelect();
	}

	/**
   * Reset clock hand
   * @private
   */
	resetClock(delay) {
		const view = this.currentView;
		const value = this[view];
		const isHours = view === 'hours';
		const unit = Math.PI / (isHours ? 6 : 30);
		const radian = value * unit;
		const radius = isHours && value > 0 && value < 13 ? this.innerRadius : this.outerRadius;
		const x = Math.sin(radian) * radius;
		const y = - Math.cos(radian) * radius;
		if (HAVE_SVG && delay) {
			this.canvas.classList.add('clockpicker-canvas-out');
			setTimeout(() => {
				this.canvas.classList.remove('clockpicker-canvas-out');
				this.setHand(x, y);
			}, delay);
		} else {
			this.setHand(x, y);
		}
	}

	/**
   * Set clock hand to (x, y)
   * @private
   */
	setHand(x, y, roundBy5, dragging) {
		let radian = Math.atan2(x, - y);
		const isHours = this.currentView === 'hours';
		const unit = Math.PI / (isHours || roundBy5 ? 6 : 30);
		const z = Math.sqrt(x * x + y * y);
		const options = this.options;
		const inner = isHours && z < (this.outerRadius + this.innerRadius) / 2;
		let radius = inner ? this.innerRadius : this.outerRadius;
		let value;

		if (options.twelvehour) {
			radius = this.outerRadius;
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
			if (VIBRATE && this.options.vibrate) {
				// Do not vibrate too frequently
				if (! this.vibrateTimer) {
					navigator[VIBRATE](10);
					this.vibrateTimer = setTimeout(() => this.vibrateTimer = null, 100);
				}
			}
		}

		this[this.currentView] = value;
		this[isHours ? 'spanHours' : 'spanMinutes']
    .textContent = `${value}`.padStart(2, "0");

		// If svg is not supported, just add an active class to the tick
		if (!HAVE_SVG) {
			this[isHours ? 'hoursView' : 'minutesView']
      .querySelectorAll('.clockpicker-tick')
      .forEach(() => {
				this.classList.toggle('active', value === + this.innerHTML);
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

	/**
   * Hours and minutes are selected
   * @private
   */
	done() {
		if (typeof this.options.beforeDone === "function")
		  this.options.beforeDone();
		this.hide();
		const last = this.input.value;
		let value = `${this.hours}`.padStart(2, "0") + ':' + `${this.minutes}`.padStart(2, "0");
		if  (this.options.twelvehour) {
			value = value + this.amOrPm;
		}

		this.input.value = value;
		if (value !== last) {
			this.input.dispatchEvent(new Event('change', { bubbles: false }));
			if (!this.isInput) {
			  this.element.dispatchEvent(new Event('change', { bubbles: false }));
			}
		}

		if (this.options.autoclose) {
			this.input.dispatchEvent(new Event('blur'));
		}

		if (typeof this.options.afterDone === "function")
      this.options.afterDone();
	}

	/**
   * Remove clockpicker and all associated events
   */
	remove() {
		delete this.element.dataset.clockpicker;
    this.unlisten(this.input, 'focus.clockpicker');
		this.unlisten(this.input, 'click.clockpicker');
		// LOST this.unlisten(this.addon, 'click.clockpicker');
		if (this.isShown) {
			this.style.display = "none";
		}
		if (this.isAppended) {
			this.unlisten(window, `resize.clockpicker${this.id}`);
			this.popover.remove();
		}
	}

  /**
   * Get the clockpicker attached to the element.
   * @return {ClockPicker} the ClockPicker attached (if any).
   */
  static instance(element) {
	  return element.dataset ? element.dataset.clockpicker : undefined;
  }
}

export default ClockPicker;
