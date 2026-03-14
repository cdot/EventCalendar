# Event Calendar
Zero dependency UI for a simple browser event calendar application.

[Try it here](https://cdot.github.io/EventCalendar/test/EventCalendar.html)

Events are simple, having just a start and an end, a title, and a description.

For example:
```
{
   start: new Date(2023, 0, 1, 0, 0, 0),
   end: new Date(2023, 0, 1, 23, 59, 59),
   title: "New Year's Day",
   description: "A time for reflection"
}
```
The calendar supports adding, removing and editing events.

At time of writing, recurring events are not supported.

## Usage
```
const cal_el = document.getElementById("container");
new EventCalendar(cal_el, { title: "Public Holidays" })
```
## Options
Options are passed in the second parameter.

### add
Function that will be called when an event is added to the calendar. Will be passed a structure describing the event `{ start: end: title: description: }` and should return a Promise. The event structure can be modified (e.g. to add a unique id for the event) and any modifications will be retained in the `events` structure passed to the widget.

### change
Function that will be called when an event is modified. Will be passed a structure descriping the event `{ start: end: title: description: }` and should return a Promise. The event structure can be modified (e.g. to add a unique id for the event) and any modifications will be retained in the `events` structure passed to the widget.

### delete
Function that will be called when an event is deleted. Should return a Promise.

### events
Array of pre-existing events. Each entry in the array must be an object with fields as follows:
* `start` Date object giving the start time for the event.
* `end` Date object giving the end time of the event.
* `title` string title of the event
* `description` string description of the event

### future_only
If `true`, dates in the past are shown greyed out.

### title
Optional string title displayed above the calendar.

An example is given in the `test` directory.
