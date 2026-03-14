/*Copyright (C) Crawford Currie 2023-2026 - All rights reserved*/

import Modal from "./Modal.js";
import ClockPicker from "./ClockPicker.js";

/**
 * Parse a server local time HH[:MM[:SS]][am|pm] string
 * Times must be in the range 00:00:00..23:59:59
 * @param {string} s time string
 * @return {number[]} array of [ h, m, s ]
 * @private
 */
function parseTime(str) {
  let pm = false;
  str = str.replace(/(am|pm)$/i, () => { pm = true; return ""; });
  const hms = str.split(":");
  let h = Number.parseInt(hms.shift()), m = 0, s = 0;
  if (h < 0 || h > 23) throw Error("Hours out of range 0..23");
  if (pm && h < 13) h += 12;
  if (hms.length > 0) {
    m = Number.parseInt(hms.shift());
    if (m < 0 || m > 59) throw Error("Minutes out of range 0..59");
    if (hms.length > 0) {
      const s = Number.parseFloat(hms.shift());
      if (s < 0 || s > 59) throw Error("Minutes out of range 0..59");
    }
    if (hms.length > 0) throw Error("Time format error");
  }
  return [ h, m, s ];
}

class EditEventDialog {

  constructor() {

    /**
     * `resolve` function for the open() promise
     */
    this.resolve = undefined;

    /**
     * Container element
     * @member {HTMLElement}
     */
    this.element = undefined;
  }

  /**
   * Populate the dialog fields for the given event
   * @param {object} event (or event-like thing)
   */
  populate(spec) {
    const element = this.element;

    element.querySelector("[name=start-date]").value =
    spec.start.toISOString().replace(/T.*$/, "");
    element.querySelector("[name=start-time]").value =
    spec.start.toLocaleTimeString();
    element.querySelector("[name=end-date]").value =
    spec.end.toISOString().replace(/T.*$/, "");
    element.querySelector("[name=end-time]").value =
    spec.end.toLocaleTimeString();
    element.querySelector("[name=title]").value = spec.title;
    element.querySelector("[name=description]").value = spec.description;
  }

  /**
   * @private
   */
  create() {
    const url = new URL("../html/EditEventDialog.html", import.meta.url);
    return fetch(url)
    .then(response => response.text())
    .then(html => {
      const dialog = document.createElement("div");
      dialog.classList.add("edit-event-dialog");
      dialog.classList.add("modal-overlay");
      dialog.innerHTML = html;
      this.element = dialog;
      this.modal = new Modal(dialog);

      const times = dialog.querySelectorAll("input[type=time]");
      for (const tel of times) {
        tel.addEventListener("click", function() {
          let inst = ClockPicker.instance(this);
          if (!inst)
            inst = new ClockPicker(this);
          inst.show();
        });
      }
      
      document.querySelector("body").append(dialog);

      dialog.querySelector("[name=start-date]")
      .addEventListener("change", function() {
        dialog.querySelector("[name=end-date]").min = this.value;
      });

      dialog.querySelector("[name=start-time]")
      .addEventListener("change", function() {
        dialog.querySelector("[name=end-time]").min = this.value;
      });

      dialog.querySelector("button.save-button")
      .addEventListener("click", () => {
        try {
          const stds = dialog.querySelector("[name=start-date]").value;
          const st = new Date(stds);
          const stts = parseTime(dialog.querySelector("[name=start-time]").value);
          st.setHours(parseInt(stts[0]));
          st.setMinutes(parseInt(stts[1]));
          st.setSeconds(parseInt(stts[2]));

          const ets = dialog.querySelector("[name=end-date]").value;
          const et = new Date(ets ? ets : stds);
          const etts = parseTime(dialog.querySelector("[name=end-time]").value);
          et.setHours(parseInt(etts[0]));
          et.setMinutes(parseInt(etts[1]));
          et.setSeconds(parseInt(etts[2]));

          if (st >= et)
            throw Error("'Start' must be before 'End'");

          this.modal.close();
          this.resolve({
            start: st,
            end: et,
            title: dialog.querySelector("[name=title]").value,
            description: dialog.querySelector("[name=description]").value
          });
        } catch (e) {
          console.error(e);
        }
      });

      dialog.querySelector("button.delete-button")
      .addEventListener("click", () => {
        this.modal.close();
        this.resolve("DELETE");
      });

      dialog.querySelector("button.modal-close")
      .addEventListener("click", () => {
        this.modal.close();
        this.resolve("ABORT");
      });
    });
  }

  /**
   * Open the dialog on the given event (if defined)
   * @param {CalendarEvent} spec the event to edit (undefined to create)
   * @return {Promise<HTMLElement>} that resolves when the dialog is saved, or
   * rejects when it is closed.
   */
  open(spec) {
    let promise;
    if (this.element)
      promise = Promise.resolve();
    else
      promise = this.create();

    return promise
    .then(() => {
      let title;
      if (spec) {
        this.populate(spec);
        this.element.querySelector("button.delete-button")
        .style.display = "block";
        title = "Edit";
      } else {
        this.element.querySelector("button.delete-button")
        .style.display = "none";
        title = "Add";
      }
      this.element.querySelector("h1").textContent = `${title} Event`;
      return new Promise(resolve => {
        this.resolve = resolve;
        this.modal.open();
      });
    });
  }
}

export default EditEventDialog;
