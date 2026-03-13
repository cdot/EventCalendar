/*Copyright (C) Crawford Currie 2023-2026 - All rights reserved*/

/**
 * An event in a calendar.
 */
class CalendarEvent {
  /**
   * Construct an event
   * @param {object} p event description
   * @param {Date} p.start start of event
   * @param {Date} p.end end of event, defaults to start
   * @param {string} p.title event title
   * @param {string} p.description event description
   */
  constructor(p) {

    /**
     * Start date/time
     * @member {Date}
     */
    this.start = p.start;

    /**
     * End date/time
     * @member {Date}
     */
    this.end = p.end;

    /**
     * Event title
     * @member {string}
     */
    this.title = p.title;

    /**
     * Event description
     * @member {string}
     */
    this.description = p.description;
  }

  /**
   * Determine if the time of this event overlaps with the
   * given range.
   * @param {Date} start start of other range
   * @param {Date} end end of other range
   */
  overlapsRange(start, end) {
    if (start instanceof CalendarEvent)
      return this.overlapsRange(start.start, start,end);
    return (this.start <= end && this.end >= start);
  }

  /**
   * Create and populate the DOM for the event
   * @param {function?} options.select function to invoke on select
   * @param {function?} options.edit function to invoke on edit
   * @return {HTMLElement} the div for the event
   */
  create(options) {
    const event = document.createElement("div");
    event.classList.add("event");
    const ss = this.start.toLocaleString().replace(/:[^:]*$/, "");
    const es = this.end.toLocaleString().replace(/:[^:]*$/, "");
    const etime = document.createElement("div");
    etime.classList.add("event-time");
    etime.textContent = `${ss}&hellip;${es}`;
    event.append(etime);
    const etext = document.createElement("div");
    etext.classList.add("event-text");
    event.textContent = `${this.title} ${this.description}`;
    event.append(etext);
    if (options.select)
      event.addEventListener("click", () => options.select(this));
    if (options.edit) {
      const butt = document.createElement("button");
      butt.classList.add('event-button');
      butt.innerHTML = "&#9998;";
      event.prepend(butt);
      butt.addEventListener("click", () => options.edit(this));
    }
    return event;
  }

  /**
   * Return a dot span reflecting the nature of this event
   * @return {HTMLElement} span containing the dot
   */
  dots() {
    const dots = document.createElement("span");
    dots.classList.add('dot');
    dots.classList.add("color-pink");
    return dots;
  }
}

export default CalendarEvent;
