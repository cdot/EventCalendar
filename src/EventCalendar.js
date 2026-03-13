/*Copyright (C) Crawford Currie 2023-2026 - All rights reserved*/

import CalendarEvent from "./CalendarEvent.js";
import EditEventDialog from "./EditEventDialog.js";

/**
 * Get the first instant of the day that the date falls in
 * @param {Date} date date of interest
 * @return {Date} first ms of the day
 * @private
 */
function startOfDay(date) {
  const s = new Date(date);
  s.setHours(0);
  s.setMinutes(0);
  s.setSeconds(0);
  s.setMilliseconds(0);
  return s;
}

/**
 * Get the last instant of the day that the date falls in
 * @param {Date} date date of interest
 * @return {Date} one ms before midnight
 * @private
 */
function endOfDay(date) {
  const s = new Date(date);
  s.setHours(23);
  s.setMinutes(59);
  s.setSeconds(59);
  s.setMilliseconds(999);
  return s;
}

/**
 * Get the first instant of the month that the date falls in
 * @param {Date} date date of interest
 * @return {Date} first ms of the month
 * @private
 */
function startOfMonth(date) {
  const s = new Date(date);
  s.setDate(1);
  s.setHours(0);
  s.setMinutes(0);
  s.setSeconds(0);
  s.setMilliseconds(0);
  return s;
}

/**
 * Get the last instant of the month that the date falls in
 * @param {Date} date date of interest
 * @return {Date} last instant in the month
 * @return {Date} one ms before midnight on the last day of the month
 * @private
 */
function endOfMonth(date) {
  const s = new Date(date);
  s.setDate(lengthOfMonth(date.getFullYear(), date.getMonth()));
  s.setHours(23);
  s.setMinutes(59);
  s.setSeconds(59);
  s.setMilliseconds(999);
  return s;
}

/**
 * Work out the length of the month
 * @param {number} y year
 * @param {number} m month
 * @return { number} number of days in the month
 * @private
 */
function lengthOfMonth(y, m) {
  const nMonth = (m + 1) % 12;
  const nYear = m === 11 ? y + 1 : y;
  return new Date(nYear, nMonth, 0).getDate();
}

/**
 * UI for a simple visual event calendar with a list of events,
 * each of which has a title and a description.
 */
class EventCalendar {

  /**
   * A calendar is constructed in an element. The UI is created asynchronously.
   * @param {HTMLElement} element element to create the calendar in.
   * @param {object} options options
   * @param {CalendarEvent[]} options.events optional list of events, may
   * be simple objects that just look like `CalendarEvent`.
   * @param {boolean} options.future_only only allow creation of events today
   * and on future days. default: false
   */
  constructor(element, options) {
    /**
     * Element the calendar is sitting in
     * @member {HTMLElement}
     */
    this.element = element;

    /**
     * Options
     * @member {object}
     */
    this.options = options || {};

    if (options.events)
      /**
       * List of events in the calendar
       * @member {CalendarEvent[]}
       */
      this.events = options.events.map(e => new CalendarEvent(e));
    else
      this.events = [];

    const today = new Date();

    /**
     * Currently displayed (selected) year
     * @member {number}
     */
    this.selectedYear = today.getFullYear();

    /**
     * Currently displayed (selected) month
     * @member {number}
     */
    this.selectedMonth = today.getMonth();

    /**
     * Currently displayed (selected) year
     * @member {number}
     */
    this.selectedDate = today.getDate();

    /**
     * Event editing dialog
     * @member {number}
     * @private
     */
    this.event_dialog = new EditEventDialog();

    this.open();
  }

  /**
   * Load a list of events from a URL.
   * @return {Promise} promise that resolves when the events have
   * been loaded and the UI refreshed.
   */
  load(url) {
    return fetch(url)
    .then(response => {
      if (!response.ok)
        throw new Error(`Response status: ${response.status}`);
      return response.json();
    })
    .then(events => {
      this.events = events.map(e => new CalendarEvent(e));
      this.refresh();
    });
  }

  /**
   * Post the events to a URL.
   * @return {Promise} promise that resolves when the events have
   * been saved.
   */
  save(url) {
    fetch(url, {
      method: "POST",
      body: JSON.stringify(this.events)
    });
  }

  /**
   * Add an event to the calendar. Does not refresh the UI.
   * @param {object} event CalendarEvent-like thing to add
   */
  addEvent(event) {
    // sort in by start date?
    this.events.push(event);
  }

  /**
   * Delete an event
   * @param {CalendarEvent} event event to remove
   */
  deleteEvent(event) {
    for (let i = 0; i < this.events.length; i++) {
      if (this.events[i] === event) {
        this.events.splice(i, 1);
        return;
      }
    }
  }

  /**
   * Determine the list of events overlapping a day
   * @param {Date} date a Date representing a date/time that falls on the
   * requisite day
   * @return {CalendarEvent[]} list of events that overlap that day
   */
  eventsOnDay(date) {
    return this.intersect(startOfDay(date), endOfDay(date));
  }

  /**
   * Determine the list of events overlapping a month
   * @param {Date} date a Date representing a date/time that falls in the
   * requisite month
   * @return {CalendarEvent[]} list of events that overlap that month
   */
  eventsInMonth(date) {
    return this.intersect(startOfMonth(date), endOfMonth(date));
  }

  /**
   * Determine the list of events that intersect the given range
   * @param {Date} start a Date representing the start of the range
   * @param {Date} end a Date representing the endof the range
   * @return {CalendarEvent[]} list of events that overlap
   */
  intersect(start, end) {
    const matched = [];
    for (const e of this.events) {
      if (e.overlapsRange(start, end))
        matched.push(e);
    }
    return matched;
  }

  /**
   * Change the calendar to display the same month of the previous year
   */
  selectLastYear() {
    this.selectedYear--;
    this.selectedDate = undefined;
    this.refresh();
  }

  /**
   * Change the calendar to display the same month of the following year
   */
  selectNextYear() {
    this.selectedYear++;
    this.selectedDate = undefined;
    this.refresh();
  }

  /**
   * Change the calendar to display the previous month
   */
  selectLastMonth() {
    if (this.selectedMonth === 0) {
      this.selectedMonth = 11;
      this.selectedYear--;
    } else
      this.selectedMonth--;
    this.selectedDate = undefined;
    this.refresh();
  }

  /**
   * Change the calendar to display the next month
   */
  selectNextMonth() {
    if (this.selectedMonth === 11) {
      this.selectedMonth = 0;
      this.selectedYear++;
    } else
      this.selectedMonth++;
    this.selectedDate = undefined;
    this.refresh();
  }

  /**
   * Show the current month on the calendar.
   * @private
   */
  refreshCalendar() {
    const first = new Date(this.selectedYear, this.selectedMonth, 1);
    this.element.querySelector(".this-month").textContent =
    first.toLocaleDateString(undefined, {
      month: "long", year: "numeric"
    });
    const dayList = this.element.querySelector(".day-list");
    dayList.innerHTML = "";

    // Calculate last day of previous month
    const prevMonthLength =
          new Date(this.selectedYear, this.selectedMonth, 0).getDate();

    // And last day of this month (0th day of next month)
    const monthLength = lengthOfMonth(this.selectedYear, this.selectedMonth);

    // Offset start days by first day of week to get a day-of-month
    let dom = 1 - first.getDay();

    // Get today's date
    let today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    today = new Date(todayYear, todayMonth, todayDay);

    // 7 columns by 5 rows = 35 total.
    for (let row = 0; row < 5; row++) {
      const row = document.createElement("div");
      row.classList.add('day-row');
      for (let dow = 0; dow < 7; dow++) {
        let date = dom;
        if (dom <= 0)
          date = prevMonthLength + dom;
        else if (dom > monthLength)
          date = dom - monthLength;
        const span = document.createElement("span");
        span.textContent = date;
        const a = document.createElement("a");
        if (dom <= 0) {
          span.classList.add("out-day");
          a.addEventListener("click", () => this.selectLastMonth());

        } else if (dom > monthLength) {
          span.classList.add("out-day");
          a.addEventListener("click", () => this.selectNextMonth());

        } else {
           if (todayYear === this.selectedYear
               && todayMonth === this.selectedMonth) {
             if (todayDay === dom)
               a.classList.add("current-day");
             if (this.selectedDate === dom)
               a.classList.add("selected");
           }

          const dots = document.createElement("span");
          dots.classList.add('dots');
          this.eventsOnDay(
            new Date(this.selectedYear, this.selectedMonth, dom))
          .forEach(e => {
            dots.append(e.dots());
            return true;
          });
          span.append(dots);

          if (this.options.future_only
              && new Date(this.selectedYear, this.selectedMonth, dom) < today)
            a.classList.add("past-day");

          const day = dom;
          a.addEventListener("click", () => {
            const alsel = this.element.querySelectorAll(".selected");
            alsel.forEach(e => e.classList.remove("selected"));
            a.classList.add("selected");
            this.selectedDate = day;
            //console.debug("Selected", this.selectedDate);
            this.refresh();
          });
        }

        a.append(span);
        row.append(a);
        dom++;
      }
      dayList.append(row);
    }
    return dayList;
  }

  /**
   * Display the given set of events in the event display area.
   * @private
   */
  refreshEvents() {
    const events = (typeof this.selectedDate === "undefined")
          ? this.eventsInMonth(
            new Date(this.selectedYear, this.selectedMonth, 1))
          : this.eventsOnDay(
            new Date(this.selectedYear, this.selectedMonth, this.selectedDate));
    const info = this.element.querySelector(".events-list");
    info.innerHTML = "";
    events.forEach(e => {
      const event = e.create({
        edit: event => {
          this.event_dialog.open(e)
          .then(async ne => {
            if (typeof ne === "object") {
              event.start = ne.start;
              event.end = ne.end;
              event.title = ne.title;
              event.description = ne.description;
              if (this.options.change)
                await this.options.change(event);
            } else if (ne === "DELETE") {
              if (this.options.delete)
                await this.options.delete(event);
              this.deleteEvent(event);
            }
            this.refresh();
          });
        }
      });
      info.append(event);
    });
  }

  /**
   * Refresh the calendar. May be required after events have been loaded.
   * @private
   */
  refresh() {
    this.refreshCalendar();
    this.refreshEvents();
  }

  /**
   * Construct the calendar UI. Loads the UI from an external HTML file.
   * @private
   */
  open() {
    const url = new URL("../html/EventCalendar.html", import.meta.url);
    return fetch(url)
    .then(response => response.text())
    .then(html => {
      this.element.innerHTML = html;
      const titel = this.element.querySelector("h1");
      if (this.options.title) {
        titel.textContent = this.options.title;
        titel.style.display = "block";
      } else {
        titel.style.display = "none";
      }

      this.element.querySelector(".prev-year")
      .addEventListener("click", () => this.selectLastYear());
      this.element.querySelector(".next-year")
      .addEventListener("click", () => this.selectNextYear());
      this.element.querySelector(".prev-month")
      .addEventListener("click", () => this.selectLastMonth());
      this.element.querySelector(".next-month")
      .addEventListener("click", () => this.selectNextMonth());

      // Configure the "Add" button
      this.element.querySelector(".add-event")
      .addEventListener("click", () =>
        this.event_dialog.open()
        .then(spec => {
          if (typeof spec === "object") {
            const e = new CalendarEvent(spec);
            if (this.options.add)
              this.options.add(e);
            this.addEvent(e);
            this.refresh();
          }
        }));

      this.refresh();
    });
  }
}

export default EventCalendar;
