// javascripts/t2r/storage.ts
var LocalStorage = class {
  constructor(prefix) {
    this._prefix = prefix;
    if (typeof window["localStorage"] === "undefined") {
      throw new Error("Missing browser feature: localStorage");
    }
  }
  get prefix() {
    return this._prefix;
  }
  get(key, fallback = void 0) {
    const value = window.localStorage.getItem(this.prefix + key);
    if (value !== null) {
      return value;
    }
    return fallback;
  }
  set(key, value) {
    if (value === null || typeof value === "undefined") {
      return this.delete(key);
    }
    try {
      window.localStorage.setItem(this.prefix + key, value.toString());
      return value;
    } catch (e) {
      console.error("Value not representable as string", value);
      throw "Value could not be stored";
    }
  }
  delete(key) {
    const value = this.get(key);
    window.localStorage.removeItem(this.prefix + key);
    return value;
  }
};
var TemporaryStorage = class {
  constructor() {
    this.data = {};
  }
  get(key, fallback = void 0) {
    if (typeof this.data[key] !== "undefined") {
      return this.data[key];
    }
    return fallback;
  }
  set(key, value) {
    if (value === null || typeof value === "undefined") {
      this.delete(key);
      return value;
    }
    this.data[key] = value;
    return this.data[key];
  }
  delete(key) {
    const value = this.get(key);
    if (key in this.data) {
      delete this.data[key];
    }
    return value;
  }
};

// javascripts/t2r/i18n.ts
function translate(key, vars = {}) {
  if (typeof T2R_TRANSLATIONS[key] === "undefined") {
    const lang = $("html").attr("lang") || "??";
    return `translation missing: ${lang}.${key}`;
  }
  let result = T2R_TRANSLATIONS[key];
  for (const name in vars) {
    result = result.replace("@" + name, vars[name]);
  }
  return result;
}

// javascripts/t2r/datetime.ts
var DateTime = class _DateTime {
  constructor(date = void 0) {
    this.date = date || /* @__PURE__ */ new Date();
  }
  /**
   * Format date as YYYY-MM-DD.
   *
   * @param {Date} date
   *   A date.
   *
   * @returns {String}
   *   HTML-friendly date, e.g. 2021-02-28.
   */
  toHTMLDateString() {
    const yyyy = this.date.getFullYear();
    const mm = (this.date.getMonth() + 1).toString().padStart(2, "0");
    const dd = this.date.getDate().toString().padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  /**
   * Format date in ISO format.
   *
   * Example: 2021-08-28T10:32:43.144Z
   *
   * @param zeroTime
   *   Whether time should be set to 00:00:00.
   */
  toISOString(zeroTime = false) {
    if (!zeroTime) {
      return this.date.toISOString();
    }
    return this.date.toISOString().split("T")[0] + "T00:00:00.000Z";
  }
  /**
   * Creates an instance from a date string.
   *
   * @param {string} date
   *   The string to parse as a date.
   *
   * @returns {DateTime|undefined}
   *   The date as an object.
   */
  static fromString(date) {
    const dateParts = date.split(/[^\d]/).map((part) => {
      return parseInt(part);
    });
    if (dateParts.length < 3) {
      throw `Invalid date: ${date}`;
    }
    for (let i = 3; i <= 6; i++) {
      if (typeof dateParts[i] === "undefined") {
        dateParts[i] = 0;
      }
    }
    for (let i = 1; i <= 6; i++) {
      if (isNaN(dateParts[i])) throw `Invalid date: ${date}`;
    }
    if (dateParts[1] < 1 || dateParts[1] > 12) {
      throw `Invalid date: ${date}`;
    }
    try {
      return new _DateTime(new Date(
        dateParts[0],
        dateParts[1] - 1,
        dateParts[2],
        dateParts[3],
        dateParts[4],
        dateParts[5],
        dateParts[6]
      ));
    } catch (e) {
      console.error("Invalid date", date);
      throw `Invalid date: ${date}`;
    }
  }
};
var Duration = class _Duration {
  /**
   * Creates a Duration object.
   *
   * @param duration [Optional] A duration.
   *
   * @example d = Duration(90)
   * @example d = Duration('90')
   * @example d = Duration('1:30')
   */
  constructor(duration = 0) {
    this._seconds = 0;
    duration = duration || 0;
    if ("number" === typeof duration) {
      this.seconds = duration;
      return;
    }
    if (duration.match(/^\d+$/)) {
      this.seconds = parseInt(duration);
      return;
    }
    try {
      this.setHHMM(duration);
    } catch (e) {
      throw 'Error: "' + duration + '" is not a number or an hh:mm string.';
    }
  }
  get hours() {
    return Math.floor(this._seconds / 3600);
  }
  get minutes() {
    return Math.floor(this._seconds / 60);
  }
  get seconds() {
    return this._seconds;
  }
  set seconds(value) {
    if (value < 0) {
      throw `Value cannot be negative: ${value}`;
    }
    this._seconds = value;
  }
  /**
   * Sets duration from hours and minutes.
   *
   * Supported formats:
   *   - 2 = 2h 00m
   *   - 2:30 = 2h 30m
   *   - :5 = 0h 5m
   *   - :30 = 0h 30m
   *   - 2.50 = 2h 30m
   *   - .5 = 0h 30m
   *
   * @param {string} hhmm
   */
  setHHMM(hhmm) {
    let parts = [];
    let pattern;
    let hh;
    let mm;
    const error2 = `Invalid hh:mm format: ${hhmm}`;
    pattern = /^(\d{0,2})$/;
    if (hhmm.match(pattern)) {
      const matches = hhmm.match(pattern);
      hh = parseInt(matches.pop());
      this.seconds = hh * 60 * 60;
      return;
    }
    pattern = /^(\d{0,2}):(\d{0,2})$/;
    if (hhmm.match(pattern)) {
      const matches = hhmm.match(pattern);
      parts = matches.slice(-2);
      mm = parseInt(parts.pop() || "0");
      hh = parseInt(parts.pop() || "0");
      if (mm > 59) throw error2;
      this.seconds = hh * 60 * 60 + mm * 60;
      return;
    }
    pattern = /^(\d{0,2})\.(\d{1,2})$/;
    if (hhmm.match(pattern)) {
      const matches = hhmm.match(pattern);
      parts = matches.slice(-2);
      hh = parseInt(parts[0] || "0");
      hh = Math.round(hh);
      mm = parseInt(parts[1] || "0");
      mm = 60 * mm / Math.pow(10, parts[1].length);
      this.seconds = hh * 60 * 60 + mm * 60;
      return;
    }
    throw error2;
  }
  /**
   * Gets the duration as hours and minutes.
   *
   * @return string
   *   Time in hh:mm format.
   */
  asHHMM() {
    const hh = this.hours.toString().padStart(2, "0");
    const mm = (this.minutes % 60).toString().padStart(2, "0");
    return `${hh}:${mm}`;
  }
  /**
   * Gets the duration as hours in decimals.
   *
   * @return string
   *   Time in hours (decimal). Ex: 1.5 for 1 hr 30 min.
   */
  asDecimal() {
    const hours = this.minutes / 60;
    const output = hours.toFixed(3);
    return output.substr(0, output.length - 1);
  }
  add(other) {
    this.seconds = this.seconds + other.seconds;
  }
  sub(other) {
    this.seconds = Math.max(this.seconds - other.seconds, 0);
  }
  /**
   * Rounds to the nearest minutes.
   *
   * @param {*} minutes
   *   Number of minutes to round to. Ex: 5, 10 or 15.
   * @param {DurationRoundingMethod} method
   *   Rounding logic.
   */
  roundTo(minutes, method) {
    if (0 === minutes) return;
    const seconds = minutes * 60;
    const correction = this.seconds % seconds;
    if (correction === 0) return;
    switch (method) {
      case "R" /* Regular */:
        if (correction >= seconds / 2) {
          this.roundTo(minutes, "U" /* Up */);
        } else {
          this.roundTo(minutes, "D" /* Down */);
        }
        break;
      case "U" /* Up */:
        this.add(new _Duration(seconds - correction));
        break;
      case "D" /* Down */:
        this.sub(new _Duration(correction));
        break;
      default:
        throw "Invalid rounding method.";
    }
  }
};

// javascripts/t2r/flash.ts
function message(text, type = "notice" /* Notice */) {
  $("#content").prepend(`<div class="flash t2r ${type}">${text.trim()}</div>`);
}
function error(text) {
  message(text, "error" /* Error */);
}
function clear() {
  $(".t2r.flash").remove();
}

// javascripts/t2r/request.ts
var RequestQueue = class {
  constructor() {
    this._items = [];
    this._requestInProgress = false;
  }
  /**
   * Number of requests currently in the queue.
   */
  get length() {
    return this._items.length;
  }
  /**
   * Adds an AJAX request to the execution queue.
   *
   * Requests be executed one after the other until all items in the queue have
   * been processed.
   */
  addItem(opts) {
    this._items.push(opts);
    this.processItem();
  }
  /**
   * Processes the next request.
   */
  processItem() {
    if (this.length === 0 || this._requestInProgress) return;
    this._requestInProgress = true;
    const that = this;
    const opts = this._items.shift();
    if (opts === void 0) {
      return;
    }
    console.debug("Processing AJAX queue (" + this.length + " remaining).", opts);
    const originalCallback = opts.complete;
    opts.complete = function(xhr, status) {
      if (typeof originalCallback !== "undefined") {
        originalCallback.call(this, xhr, status);
      }
      that._requestInProgress = false;
      that.processItem();
    };
    $.ajax(opts);
  }
};

// javascripts/t2r/services.ts
var RedmineAPIService = class {
  constructor(apiKey) {
    this._baseUrl = window.location.origin;
    this._apiKey = apiKey;
    this._cache = new TemporaryStorage();
    this.requestQueue = new RequestQueue();
  }
  /**
   * Sends an AJAX request to Redmine with the given options.
   *
   * Automatically injects auth headers.
   *
   * @param opts
   *   Request options.
   */
  request(opts) {
    if (!opts.url) throw "Missing required parameter: url";
    if (opts.url.match(/^\//)) {
      opts.url = this._baseUrl + opts.url;
    }
    opts.headers = opts.headers || {};
    opts.headers["X-Redmine-API-Key"] = this._apiKey;
    opts.timeout = opts.timeout || 3e3;
    this.requestQueue.addItem(opts);
  }
  handleRequestSuccess(type, data) {
    console.debug(`Request succeeded: ${type}`, data);
  }
  handleRequestError(type) {
    error(translate("t2r.error.ajax_load"));
    console.error(`Request failed: ${type}`);
  }
  /**
   * Fetches Redmine time entries.
   *
   * @param {object} params
   *   Query parameters.
   * @param {function} callback
   *   Receives time entries or null.
   */
  getTimeEntries(params, callback) {
    const that = this;
    this.request({
      async: true,
      method: "get",
      url: "/toggl2redmine/redmine/time_entries",
      data: {
        from: params.from.toISOString(true),
        till: params.till.toISOString(true)
      },
      success: function(data) {
        if (typeof data.time_entries === "undefined") {
          that.handleRequestError("Redmine time entries");
          callback(null);
          return;
        }
        that.handleRequestSuccess("Redmine time entries", data);
        const time_entries = data.time_entries.map((entry) => {
          entry.duration = new Duration(
            Math.floor(parseFloat(entry.hours) * 3600)
          );
          return entry;
        });
        callback(time_entries);
      },
      error: () => {
        that.handleRequestError("Redmine time entries");
        callback(null);
      }
    });
  }
  /**
   * Fetches and caches time entry activities.
   *
   * @param callback
   *   function (activities, null) {}
   */
  getTimeEntryActivities(callback) {
    const activities = this._cache.get("redmine.activities");
    if (activities) {
      callback(activities);
      return;
    }
    const that = this;
    this.request({
      url: "/enumerations/time_entry_activities.json",
      success: (data) => {
        that.handleRequestSuccess("Time entry activities", data);
        that._cache.set("redmine.activities", data.time_entry_activities);
        callback(data.time_entry_activities);
      },
      error: () => {
        that.handleRequestError("Time entry activities");
        callback(null);
      }
    });
  }
  /**
   * Fetches the last date on which time entries were found for the current user.
   *
   * Time entries for future dates are ignored.
   *
   * @param {GetLastExportDateCallback} callback
   *   Receives a Date object or null.
   */
  getLastImportDate(callback) {
    const opts = {};
    opts.url = "/time_entries.json";
    opts.data = {
      user_id: "me",
      limit: 1,
      // Ignore entries made in the future.
      to: new DateTime().toHTMLDateString()
    };
    const that = this;
    opts.success = (data) => {
      this.handleRequestSuccess("Last import date", data);
      if (data.time_entries.length === 0) {
        callback(null);
        return;
      }
      const lastTimeEntry = data.time_entries.pop();
      const lastImportDate = DateTime.fromString(`${lastTimeEntry.spent_on} 00:00:00`);
      callback(lastImportDate);
    };
    opts.error = () => {
      that.handleRequestError("Last import date");
      callback(null);
    };
    this.request(opts);
  }
  /**
   * Fetches Toggl time entries.
   *
   * @param {object} params
   *   Query parameters.
   * @param {function} callback
   *   Receives Toggl time entry groups or null.
   */
  getTogglTimeEntries(params, callback) {
    const data = {
      from: params.from.toISOString(),
      till: params.till.toISOString(),
      workspace_id: params.workspaceId || null
    };
    this.request({
      url: "/toggl2redmine/toggl/time_entries",
      data,
      success: (time_entries) => {
        this.handleRequestSuccess("Toggl time entries", time_entries);
        callback(time_entries);
      },
      error: () => {
        this.handleRequestError("Toggl time entries");
        callback({});
      }
    });
  }
  /**
   * Fetches and caches Toggl workspaces.
   *
   * @param {function} callback
   *   Receives workspaces or null.
   */
  getTogglWorkspaces(callback) {
    const workspaces = this._cache.get("toggl.workspaces");
    if (workspaces) {
      callback(workspaces);
      return;
    }
    const that = this;
    this.request({
      url: "/toggl2redmine/toggl/workspaces",
      success: (workspaces2) => {
        that.handleRequestSuccess("Toggl workspaces", workspaces2);
        that._cache.set("toggl.workspaces", workspaces2);
        callback(workspaces2);
      },
      error: () => {
        that.handleRequestError("Toggl workspaces");
        callback(null);
      }
    });
  }
  /**
   * Attempts to create a Time Entry on Redmine.
   *
   * @param {PostTimeEntryParams} params
   *   Time entry data.
   * @param {PostTimeEntryCallback} callback
   *   Receives an array of error messages, which is empty on success.
   */
  postTimeEntry(params, callback) {
    const that = this;
    this.request({
      async: true,
      url: "/toggl2redmine/import",
      method: "post",
      data: JSON.stringify(params),
      contentType: "application/json",
      success: (data) => {
        that.handleRequestSuccess("Time entry import", data);
        callback([]);
      },
      error: function(xhr) {
        that.handleRequestError("Time entry import");
        let errors;
        try {
          const oResponse = JSON.parse(xhr.responseText);
          errors = typeof oResponse.errors === "undefined" ? ["Unknown error"] : oResponse.errors;
        } catch (e) {
          errors = ["The server returned an unexpected response"];
        }
        callback(errors);
      }
    });
  }
};

// javascripts/t2r/widgets.ts
var redmineService = new RedmineAPIService(T2R_REDMINE_API_KEY);
function buildDropdownFromDictionary(data) {
  const $el = $("<select />");
  const placeholder = data.placeholder || null;
  const attributes = data.attributes || null;
  if (placeholder) {
    $el.append(`<option value="">${placeholder}</option>`);
  }
  if (attributes) {
    $el.attr(attributes);
  }
  for (const value in data.options) {
    const label = data.options[value];
    $el.append(`<option value="${value}">${label}</option>`);
  }
  return $el;
}
function buildDropdownFromRecords(data) {
  const options = {};
  for (const record of data.records) {
    options[record.id.toString()] = record.name;
  }
  return buildDropdownFromDictionary({
    options,
    attributes: data.attributes,
    placeholder: data.placeholder
  });
}
function initialize(el = document.body) {
  $(el).find("[data-t2r-widget]").each(function() {
    const widgetList = this.getAttribute("data-t2r-widget");
    if (!widgetList) return;
    for (const widget of widgetList.split(" ")) {
      const flag = `Widget${widget}Ready`;
      if (this.dataset[flag] == "true") {
        continue;
      }
      let initializer;
      switch (widget) {
        case "Tooltip":
          initializer = initTooltip;
          break;
        case "TogglRow":
          initializer = initTogglRow;
          break;
        case "DurationInput":
          initializer = initDurationInput;
          break;
        case "DurationRoundingMethodDropdown":
          initializer = initDurationRoundingMethodDropdown;
          break;
        case "RedmineActivityDropdown":
          initializer = initRedmineActivityDropdown;
          break;
        case "TogglWorkspaceDropdown":
          initializer = initTogglWorkspaceDropdown;
          break;
        default:
          throw `Unrecognized widget: ${widget}`;
      }
      this.dataset[flag] = "true";
      this.classList.add(`t2r-widget-${widget}`);
      initializer(this);
    }
  });
}
function initTooltip(el) {
  $(el).tooltip();
}
function initTogglRow(el) {
  const $el = $(el);
  $el.find(".cb-import").on("change", function() {
    const $checkbox = $(this);
    const $tr = $checkbox.closest("tr");
    if ($checkbox.is(":checked")) {
      $tr.find(":input").not(".cb-import").removeAttr("disabled").attr("required", "required");
    } else {
      $tr.find(":input").not(".cb-import").removeAttr("required").attr("disabled", "disabled");
    }
  }).trigger("change");
  $el.find(":input").tooltip();
}
function initDurationInput(el) {
  const input = el;
  const $el = $(el);
  $el.on("input", function() {
    const val = $el.val();
    try {
      new Duration(val);
      input.setCustomValidity("");
    } catch (e) {
      if (e instanceof Error) {
        input.setCustomValidity(e.toString());
      } else {
        throw e;
      }
    }
  }).on("keyup", function(e) {
    const $input = $(this);
    const dur = new Duration();
    try {
      dur.setHHMM($input.val());
    } catch (e2) {
      return;
    }
    const mm = dur.minutes % 60;
    const step = e.shiftKey ? 15 : 5;
    let delta = 0;
    if (e.key === "ArrowUp") {
      delta = step - mm % step;
      dur.add(new Duration(delta * 60));
    } else if (e.key === "ArrowDown") {
      delta = mm % step || step;
      dur.sub(new Duration(delta * 60));
    } else {
      return;
    }
    $(this).val(dur.asHHMM()).trigger("input").trigger("select");
  }).on("change", function() {
    const $input = $(this);
    const value = $input.val();
    const dur = new Duration();
    try {
      dur.setHHMM(value);
    } catch (e) {
      console.debug(`Could not understand time: ${value}`);
    }
    $input.val(dur.asHHMM());
  });
}
function initDurationRoundingMethodDropdown(el) {
  const $el = $(el);
  const options = {};
  options["R" /* Regular */] = "Round off";
  options["U" /* Up */] = "Round up";
  options["D" /* Down */] = "Round down";
  const $select = buildDropdownFromDictionary({
    placeholder: "Don't round",
    options
  });
  $el.append($select.find("option"));
}
function initRedmineActivityDropdown(el) {
  const $el = $(el);
  redmineService.getTimeEntryActivities((activities) => {
    if (activities === null) return;
    const $select = buildDropdownFromRecords({
      placeholder: $el.data("placeholder"),
      records: activities
    });
    $el.append($select.find("option")).val("");
    const value = $el.data("selected") || "";
    $el.val(value).removeData("selected");
  });
}
function initTogglWorkspaceDropdown(el) {
  const $el = $(el);
  redmineService.getTogglWorkspaces((workspaces) => {
    if (workspaces === null) return;
    const $select = buildDropdownFromRecords({
      placeholder: $el.data("placeholder"),
      records: workspaces
    });
    $el.append($select.find("option"));
    const value = $el.data("selected");
    if ("undefined" !== typeof value) {
      $el.val(value).data("selected", null);
    }
  });
}

// javascripts/t2r/utils.ts
function htmlEntityEncode(str) {
  return $("<div />").text(str).text().replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function getDateFromLocationHash() {
  const matches = window.location.hash.match(/^#?([\d]{4}-[\d]{2}-[\d]{2})$/);
  if (!matches) return;
  const match = matches.pop();
  try {
    return DateTime.fromString(match).toHTMLDateString();
  } catch (e) {
    console.debug("Date not detected in URL fragment");
  }
}
var EventManager = class {
  constructor() {
    this.listeners = {};
  }
  on(eventName, callback) {
    if (typeof this.listeners[eventName] === "undefined") {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
  }
  trigger(eventName) {
    if (typeof this.listeners[eventName] === "undefined") return;
    for (const listener of this.listeners[eventName]) {
      listener();
    }
  }
};

// javascripts/t2r/renderers.ts
function renderRedmineProjectLabel(project) {
  const classes = ["project"];
  if (project.status != 1) {
    classes.push("closed");
  }
  return '<a href="' + project.path + '" class="' + classes.join(" ") + '" target="_blank"><strong>' + htmlEntityEncode(project.name) + "</strong></a>";
}
function renderRedmineProjectStubLabel() {
  return '<span class="project"><strong>-</strong></span>';
}
function renderRedmineIssueLabel(issue) {
  const classes = ["issue"];
  if (issue.is_closed) {
    classes.push("closed");
  }
  return '<a href="' + issue.path + '" class="' + classes.join(" ") + '" target="_blank">' + htmlEntityEncode(issue ? issue.tracker.name : "-") + htmlEntityEncode(issue ? " #" + issue.id : "") + htmlEntityEncode(issue.subject ? ": " + issue.subject : "") + "</a>";
}
function renderRedmineIssueStubLabel(issueId) {
  if (!issueId) {
    return "Unknown";
  }
  return "#" + issueId.toString() + ": -";
}
function renderTogglRow(data) {
  const issue = data.issue;
  const issueLabel = issue ? renderRedmineIssueLabel(issue) : renderRedmineIssueStubLabel(data.issue_id);
  const project = data.project || null;
  const projectLabel = project ? renderRedmineProjectLabel(project) : renderRedmineProjectStubLabel();
  const oDuration = data.duration;
  const rDuration = data.roundedDuration;
  const markup = '<tr data-t2r-widget="TogglRow"><td class="checkbox"><input class="cb-import" type="checkbox" value="1" title="Check this box if you want to import this entry." /></td><td class="status"></td><td class="issue"><input data-property="issue_id" type="hidden" data-value="' + htmlEntityEncode(issue ? issue.id.toString() : "") + '" value="' + htmlEntityEncode(issue ? issue.id.toString() : "") + '" />' + projectLabel + "<br />" + issueLabel + '</td><td class="comments"><input data-property="comments" type="text" value="' + htmlEntityEncode(data.comments) + '" maxlength="255" /></td><td class="activity"><select data-property="activity_id" required="required" data-placeholder="-" data-t2r-widget="RedmineActivityDropdown"></select></td><td class="hours"><input data-property="hours" required="required" data-t2r-widget="DurationInput" type="text" title="Value as on Toggl is ' + oDuration.asHHMM() + '." value="' + rDuration.asHHMM() + '" size="6" maxlength="5" /></td></tr>';
  const $tr = $(markup);
  $tr.data("t2r.entry", data);
  let statusLabel = null;
  switch (data.status) {
    case "pending":
      if (data.errors.length > 0) {
        $tr.addClass("t2r-error");
        $tr.find(":input").attr("disabled", "disabled");
        statusLabel = renderImportStatusLabel("Invalid", data.errors.join("\n"), "error");
      }
      break;
    case "imported":
      $tr.find(".cb-import").removeAttr("checked");
      $tr.addClass("t2r-success");
      $tr.find(":input").attr("disabled", "disabled");
      statusLabel = renderImportStatusLabel("Imported");
      break;
    case "running":
      $tr.addClass("t2r-running");
      $tr.find(":input").attr("disabled", "disabled");
      statusLabel = renderImportStatusLabel(
        "Running",
        "The timer is still running on Toggl.",
        "error"
      );
      break;
    default:
      throw `Unrecognized status: ${data.status}.`;
  }
  if (statusLabel) {
    $tr.find("td.status").html(statusLabel);
  }
  return $tr;
}
function renderRedmineRow(data) {
  const issue = data.issue;
  const issueLabel = renderRedmineIssueLabel(issue);
  const project = data.project;
  const projectLabel = renderRedmineProjectLabel(project);
  const oDuration = data.duration;
  oDuration.roundTo(1, "U" /* Up */);
  const markup = '<tr id="time-entry-' + data.id + '"  class="time-entry hascontextmenu"><td class="subject">' + projectLabel + "<br />" + issueLabel + '<input type="checkbox" name="ids[]" value="' + data.id + '" hidden /></td><td class="comments">' + htmlEntityEncode(data.comments) + '</td><td class="activity">' + htmlEntityEncode(data.activity.name) + '</td><td class="hours">' + oDuration.asHHMM() + '</td><td class="buttons">' + T2R_BUTTON_ACTIONS + "</td></tr>";
  const $tr = $(markup);
  $tr.find(".js-contextmenu").on("click", contextMenuRightClick);
  return $tr;
}
function renderImportStatusLabel(label, description = null, icon = "checked") {
  const el = document.createElement("span");
  el.innerHTML = label;
  el.dataset.t2rWidget = "Tooltip";
  el.classList.add("icon", `icon-${icon}`);
  if (description) {
    el.setAttribute("title", description);
  }
  return el;
}

// javascripts/t2r.ts
var ImportForm = class {
  constructor(element, filterForm, redmineAPI, redmineReport, togglReport) {
    const that = this;
    this.element = $(element);
    this.importButton = this.element.find("#btn-import");
    this.filterForm = filterForm;
    this.redmineAPI = redmineAPI;
    this.redmineReport = redmineReport;
    this.togglReport = togglReport;
    this.filterForm.eventManager.on("preSubmit", function() {
      that.disable();
    });
    this.filterForm.eventManager.on("postSubmit", function() {
      that.enable();
    });
    this.element.on("submit", () => {
      that.onSubmit();
      return false;
    });
  }
  onSubmit() {
    const that = this;
    const filterFormValues = this.filterForm.getValues();
    if (!confirm(translate("t2r.import_confirmation"))) {
      return;
    }
    this.disable();
    clear();
    if (this.togglReport.element.find("tbody input.cb-import").filter(":checked").length === 0) {
      error(translate("t2r.error.no_entries_selected"));
      this.enable();
      return;
    }
    console.info("Sending time entries to Redmine.");
    this.togglReport.element.find("tbody tr").each(function() {
      const $tr = $(this);
      if (!$tr.find("input.cb-import").prop("checked")) {
        return;
      }
      const timeEntry = {
        spent_on: filterFormValues["date"],
        issue_id: parseInt($tr.find('[data-property="issue_id"]').val()),
        comments: $tr.find('[data-property="comments"]').val(),
        activity_id: parseInt($tr.find('[data-property="activity_id"]').val()),
        hours: "0.00"
      };
      const dur = new Duration();
      try {
        dur.setHHMM($tr.find('[data-property="hours"]').val());
        timeEntry.hours = dur.asDecimal();
      } catch (e) {
        console.warn("Entry ignored: Invalid duration.", timeEntry);
        return;
      }
      if (dur.seconds < 30) {
        console.warn("Entry ignored: Duration is less than 30 seconds.", timeEntry);
        return;
      }
      that.redmineAPI.postTimeEntry({
        time_entry: timeEntry,
        toggl_ids: $tr.data("t2r.entry").ids
      }, (errors) => {
        if (that.redmineAPI.requestQueue.length === 0) {
          that.enable();
          that.redmineReport.update();
        }
        if (errors.length !== 0) {
          $tr.addClass("t2r-error");
          const statusLabel2 = renderImportStatusLabel("Failed", errors.join("\n"), "error");
          $tr.find("td.status").html(statusLabel2);
          return;
        }
        $tr.addClass("t2r-success");
        $tr.find(":input").attr("disabled", "disabled");
        $tr.find("input.cb-import").removeAttr("checked");
        const statusLabel = renderImportStatusLabel("Imported");
        $tr.find("td.status").html(statusLabel);
      });
    });
  }
  /**
   * Disables form submission.
   */
  disable() {
    this.importButton.attr("disabled", "disabled");
  }
  /**
   * Enables form submission.
   */
  enable() {
    this.importButton.removeAttr("disabled");
  }
};
var FilterForm = class {
  constructor(element, localStorage) {
    const that = this;
    this.element = $(element);
    this.localStorage = localStorage;
    this.eventManager = new EventManager();
    this.element.find("#btn-apply-filters").on("click", () => {
      return that.onSubmit();
    });
    this.element.find("#btn-reset-filters").on("click", () => {
      that.reset();
      return false;
    });
    this.element.on("submit", (e) => {
      e.preventDefault();
      return that.onSubmit();
    });
  }
  getDefaults() {
    const values = {};
    values["date"] = new DateTime().toHTMLDateString();
    const workspaceId = this.localStorage.get("toggl-workspace-id");
    if (workspaceId) {
      values["toggl-workspace-id"] = parseInt(workspaceId);
    }
    const defaultActivityId = this.localStorage.get("default-activity-id");
    if (defaultActivityId) {
      values["default-activity-id"] = parseInt(defaultActivityId);
    }
    const roundingValue = this.localStorage.get("rounding-value") || "0";
    values["rounding-value"] = parseInt(roundingValue);
    const roundingMethod = this.localStorage.get("rounding-method");
    if (roundingMethod) {
      values["rounding-method"] = roundingMethod;
    }
    return values;
  }
  getValues() {
    const values = {};
    const $defaultActivityId = $("select#default-activity-id");
    const defaultActivityId = $defaultActivityId.val() || $defaultActivityId.data("selected");
    if (defaultActivityId) {
      values["default-activity-id"] = parseInt(defaultActivityId);
    }
    const $togglWorkspaceId = $("select#toggl-workspace-id");
    const togglWorkspaceId = $togglWorkspaceId.val() || $togglWorkspaceId.data("selected");
    if (togglWorkspaceId) {
      values["toggl-workspace-id"] = togglWorkspaceId;
    }
    const sRoundingValue = $("input#rounding-value").val();
    const nRoundingValue = parseInt(sRoundingValue);
    if (sRoundingValue && !isNaN(nRoundingValue)) {
      values["rounding-value"] = parseInt(sRoundingValue);
    }
    const roundingMethod = $("select#rounding-method").val();
    if (roundingMethod) {
      values["rounding-method"] = roundingMethod;
    }
    const sDate = $("#date").val();
    try {
      DateTime.fromString(sDate);
      values["date"] = sDate;
    } catch (e) {
      console.error(e);
    }
    return values;
  }
  setValues(values) {
    this.element.find(":input").each(function() {
      const $field = $(this);
      const name = $field.attr("name");
      if (!name) return;
      switch (name) {
        case "date":
          if (!values["date"]) return;
          $field.val(values["date"]);
          break;
        case "default-activity-id":
          if (!values["default-activity-id"]) return;
          $field.data("selected", values["default-activity-id"]).val(values["default-activity-id"]);
          break;
        case "toggl-workspace-id":
          if (!values["toggl-workspace-id"]) return;
          $field.data("selected", values["toggl-workspace-id"]).val(values["toggl-workspace-id"]);
          break;
        case "rounding-method":
          if (!values["rounding-method"]) return;
          $field.val(values["rounding-method"]);
          break;
        case "rounding-value":
          if (!values["rounding-value"]) return;
          $field.val(values["rounding-value"]);
          break;
        default:
          throw `Unexpected field: ${name}`;
      }
    });
  }
  reset(values = {}) {
    const defaults = this.getDefaults();
    if (!values["date"]) {
      values["date"] = defaults["date"];
    }
    if (!values["default-activity-id"]) {
      values["default-activity-id"] = defaults["default-activity-id"];
    }
    if (!values["toggl-workspace-id"]) {
      values["toggl-workspace-id"] = defaults["toggl-workspace-id"];
    }
    if (!values["rounding-method"]) {
      values["rounding-method"] = defaults["rounding-method"];
    }
    if (!values["rounding-value"]) {
      values["rounding-value"] = defaults["rounding-value"];
    }
    this.element.find(":input").val("");
    this.setValues(values);
    this.onSubmit();
  }
  onSubmit() {
    this.eventManager.trigger("preSubmit");
    const values = this.getValues();
    if (!values["date"]) {
      this.element.find("#date").trigger("focus");
      return false;
    }
    const oDate = DateTime.fromString(values["date"]);
    if (!oDate) {
      error(translate("t2r.error.date_invalid"));
      this.element.find("#date").trigger("focus");
      return false;
    }
    this.localStorage.set("default-activity-id", values["default-activity-id"]);
    this.localStorage.set("toggl-workspace-id", values["toggl-workspace-id"]);
    this.localStorage.set("rounding-value", values["rounding-value"]);
    this.localStorage.set("rounding-method", values["rounding-method"]);
    console.info("Filter updated", values);
    window.location.hash = oDate.toHTMLDateString();
    $("h2 .date").html("(" + oDate.date.toLocaleDateString() + ")");
    this.eventManager.trigger("postSubmit");
    return false;
  }
};
var RedmineReport = class {
  constructor(element, filterForm, redmineAPI) {
    const that = this;
    this.element = $(element);
    this.lastImported = $("#last-imported");
    this.filterForm = filterForm;
    this.redmineAPI = redmineAPI;
    this.filterForm.eventManager.on("postSubmit", function() {
      that.update();
    });
  }
  update() {
    const that = this;
    this.showLoader();
    this.makeEmpty();
    const sDate = this.filterForm.getValues()["date"];
    const oDate = DateTime.fromString(sDate);
    this.updateLink(oDate);
    this.updateLastImportDate();
    const query = { from: oDate, till: oDate };
    this.redmineAPI.getTimeEntries(query, (entries) => {
      if (entries === null) {
        entries = [];
      }
      if (entries.length === 0) {
        that.showEmptyMessage();
      }
      for (const time_entry of entries) {
        const markup = renderRedmineRow(time_entry);
        that.element.find("tbody").append(markup);
      }
      that.updateTotal();
      that.hideLoader();
    });
  }
  /**
   * Updates the link to the Redmine report page.
   *
   * @param date
   *   Report date.
   */
  updateLink(date) {
    const url = `/time_entries?utf8=\u2713&set_filter=1&sort=spent_on:desc&f[]=spent_on&op[spent_on]=%3D&v[spent_on][]=[${date.toHTMLDateString()}]&f[]=user_id&op[user_id]=%3D&v[user_id][]=me&c[]=project&c[]=spent_on&c[]=user&c[]=activity&c[]=issue&c[]=comments&c[]=hours&group_by=spent_on&t[]=hours&t[]=`;
    $("#redmine-report-link").attr("href", url);
  }
  updateTotal() {
    const total = new Duration();
    this.element.find("tbody tr .hours").each(function() {
      const hours = $(this).text().trim();
      if (hours.length > 0) {
        total.add(new Duration(hours));
      }
    });
    this.element.find('[data-property="total-hours"]').html(total.asHHMM());
  }
  /**
   * Updates the date of the latest time entry on Redmine.
   */
  updateLastImportDate() {
    const that = this;
    this.lastImported.html("&nbsp;").addClass("t2r-loading");
    this.redmineAPI.getLastImportDate((lastImportDate) => {
      const sDate = lastImportDate ? lastImportDate.date.toLocaleDateString() : "Unknown";
      that.lastImported.text(sDate).removeClass("t2r-loading");
    });
  }
  showEmptyMessage() {
    const colspan = this.element.find("thead tr:first th").length;
    const message2 = translate("t2r.error.list_empty");
    const markup = `<tr><td colspan="${colspan}">${message2}</td></tr>`;
    this.element.find("tbody").html(markup);
  }
  makeEmpty() {
    this.element.find("tbody").html("");
  }
  showLoader() {
    this.element.addClass("t2r-loading");
  }
  hideLoader() {
    this.element.removeClass("t2r-loading");
  }
};
var TogglReport = class {
  constructor(element, filterForm, redmineAPI) {
    const that = this;
    this.element = $(element);
    this.checkAll = this.element.find("input.check-all");
    this.filterForm = filterForm;
    this.redmineAPI = redmineAPI;
    this.filterForm.eventManager.on("postSubmit", function() {
      that.update();
    });
    this.checkAll.on("change", () => {
      const checked = $(that.checkAll).prop("checked");
      that.element.find("tbody input.cb-import:enabled").prop("checked", checked).trigger("change");
    });
  }
  update() {
    const that = this;
    const filterFormValues = this.filterForm.getValues();
    this.showLoader();
    this.makeEmpty();
    const sDate = filterFormValues["date"];
    const oDate = DateTime.fromString(sDate);
    const workspaceId = filterFormValues["toggl-workspace-id"];
    this.updateLink(oDate, workspaceId);
    this.checkAll.prop("checked", false).attr("disabled", "disabled");
    const query = {
      from: DateTime.fromString(sDate + " 00:00:00"),
      till: DateTime.fromString(sDate + " 23:59:59"),
      workspaceId
    };
    this.redmineAPI.getTogglTimeEntries(query, (entries) => {
      let pendingEntriesExist = false;
      const roundingValue = filterFormValues["rounding-value"];
      const roundingMethod = filterFormValues["rounding-method"];
      for (const key in entries) {
        const entry = entries[key];
        entry.duration = new Duration(Math.max(0, entry.duration));
        entry.roundedDuration = new Duration(entry.duration.seconds);
        if (roundingMethod && roundingValue > 0) {
          entry.roundedDuration.roundTo(roundingValue, roundingMethod);
        } else {
          entry.roundedDuration.roundTo(1, "R" /* Regular */);
        }
        entries[key] = entry;
      }
      if (Object.keys(entries).length === 0) {
        this.showEmptyMessage();
      }
      for (const key in entries) {
        const entry = entries[key];
        if (entry.status === "running") {
          const $tr = renderTogglRow(entry);
          that.element.find("tbody").append($tr);
          delete entries[key];
        }
      }
      const sDefaultActivityId = filterFormValues["default-activity-id"] ? filterFormValues["default-activity-id"].toString() : "";
      for (const key in entries) {
        const entry = entries[key];
        if (entry.status === "pending" && entry.errors.length === 0) {
          const $tr = renderTogglRow(entry);
          that.element.find("tbody").append($tr);
          pendingEntriesExist = true;
          $tr.find("input[data-property=hours]").on("input change", () => {
            that.updateTotal();
          });
          $tr.find("select[data-property=activity_id]").attr("data-selected", sDefaultActivityId);
          $tr.find(".cb-import").on("change", () => {
            that.updateTotal();
          });
        }
      }
      for (const key in entries) {
        const entry = entries[key];
        if (entry.status === "pending" && entry.errors.length > 0) {
          const $tr = renderTogglRow(entry);
          that.element.find("tbody").append($tr);
        }
      }
      for (const key in entries) {
        const entry = entries[key];
        if (entry.status === "imported") {
          const $tr = renderTogglRow(entry);
          that.element.find("tbody").append($tr);
        }
      }
      that.updateTotal();
      initialize(that.element[0]);
      that.hideLoader();
      if (!pendingEntriesExist) {
        return;
      }
      that.checkAll.removeAttr("disabled");
      if (that.filterForm.element.has(":focus").length > 0) {
        that.checkAll.trigger("focus");
      }
    });
  }
  /**
   * Updates the link to the Toggl report page.
   *
   * @param date
   *   Report date.
   * @param workspaceId
   *   Toggl workspace ID.
   */
  updateLink(date, workspaceId) {
    if ($("#toggl-report-link").data("source") !== "track") return;
    workspaceId = workspaceId || 0;
    const url = `https://track.toggl.com/reports/summary/${workspaceId}/from/${date.toHTMLDateString()}/to/${date.toHTMLDateString()}`;
    $("#toggl-report-link").attr("href", url);
  }
  /**
   * Updates the total in the Redmine report footer.
   */
  updateTotal() {
    const total = new Duration();
    this.element.find("tbody tr").each(function() {
      const $tr = $(this);
      const dur = new Duration();
      if ($tr.hasClass("t2r-error")) {
        return;
      }
      if (!$tr.find(".cb-import").is(":checked")) {
        return;
      }
      const hours = $tr.find('[data-property="hours"]').val();
      try {
        dur.setHHMM(hours);
        total.add(dur);
      } catch (e) {
        console.error(e);
      }
    });
    this.element.find('[data-property="total-hours"]').html(total.asHHMM());
  }
  showEmptyMessage() {
    const colspan = this.element.find("thead tr:first th").length;
    const message2 = translate("t2r.error.list_empty");
    const markup = `<tr><td colspan="${colspan}">${message2}</td></tr>`;
    this.element.find("tbody").html(markup);
  }
  makeEmpty() {
    this.element.find("tbody").html("");
  }
  showLoader() {
    this.element.addClass("t2r-loading");
  }
  hideLoader() {
    this.element.removeClass("t2r-loading");
  }
};
var Application = class _Application {
  constructor(redmineAPI, localStorage = void 0, filterForm = void 0, redmineReport = void 0, togglReport = void 0, importForm = void 0) {
    this.redmineAPI = redmineAPI;
    this.localStorage = localStorage || new LocalStorage("toggl2redmine.");
    this.filterForm = filterForm || new FilterForm(
      document.getElementById("filter-form"),
      this.localStorage
    );
    this.redmineReport = redmineReport || new RedmineReport(
      document.getElementById("redmine-report"),
      this.filterForm,
      this.redmineAPI
    );
    this.togglReport = togglReport || new TogglReport(
      document.getElementById("toggl-report"),
      this.filterForm,
      this.redmineAPI
    );
    this.importForm = importForm || new ImportForm(
      document.getElementById("import-form"),
      this.filterForm,
      this.redmineAPI,
      this.redmineReport,
      this.togglReport
    );
  }
  static instance() {
    if (!_Application._instance) {
      _Application._instance = new _Application(
        new RedmineAPIService(T2R_REDMINE_API_KEY)
      );
    }
    return _Application._instance;
  }
  initialize() {
    this.filterForm.reset({ date: getDateFromLocationHash() });
  }
};
$(() => {
  initialize();
  Application.instance().initialize();
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vYXNzZXRzLnNyYy9qYXZhc2NyaXB0cy90MnIvc3RvcmFnZS50cyIsICIuLi8uLi9hc3NldHMuc3JjL2phdmFzY3JpcHRzL3Qyci9pMThuLnRzIiwgIi4uLy4uL2Fzc2V0cy5zcmMvamF2YXNjcmlwdHMvdDJyL2RhdGV0aW1lLnRzIiwgIi4uLy4uL2Fzc2V0cy5zcmMvamF2YXNjcmlwdHMvdDJyL2ZsYXNoLnRzIiwgIi4uLy4uL2Fzc2V0cy5zcmMvamF2YXNjcmlwdHMvdDJyL3JlcXVlc3QudHMiLCAiLi4vLi4vYXNzZXRzLnNyYy9qYXZhc2NyaXB0cy90MnIvc2VydmljZXMudHMiLCAiLi4vLi4vYXNzZXRzLnNyYy9qYXZhc2NyaXB0cy90MnIvd2lkZ2V0cy50cyIsICIuLi8uLi9hc3NldHMuc3JjL2phdmFzY3JpcHRzL3Qyci91dGlscy50cyIsICIuLi8uLi9hc3NldHMuc3JjL2phdmFzY3JpcHRzL3Qyci9yZW5kZXJlcnMudHMiLCAiLi4vLi4vYXNzZXRzLnNyYy9qYXZhc2NyaXB0cy90MnIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qIGVzbGludCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55OiAwICovXG5cbi8qKlxuICogV3JhcHBlciBhcm91bmQgdGhlIGJyb3dzZXIncyBsb2NhbCBzdG9yYWdlLlxuICovXG5leHBvcnQgY2xhc3MgTG9jYWxTdG9yYWdlIHtcbiAgcHJpdmF0ZSByZWFkb25seSBfcHJlZml4OiBzdHJpbmdcblxuICBjb25zdHJ1Y3RvcihwcmVmaXg6IHN0cmluZykge1xuICAgIHRoaXMuX3ByZWZpeCA9IHByZWZpeFxuXG4gICAgaWYgKHR5cGVvZiB3aW5kb3dbJ2xvY2FsU3RvcmFnZSddID09PSAndW5kZWZpbmVkJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyBicm93c2VyIGZlYXR1cmU6IGxvY2FsU3RvcmFnZVwiKTtcbiAgICB9XG4gIH1cblxuICBnZXQgcHJlZml4KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX3ByZWZpeFxuICB9XG5cbiAgZ2V0PFR5cGU+KGtleTogc3RyaW5nLCBmYWxsYmFjazogVHlwZSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZCk6IHN0cmluZyB8IFR5cGUgfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IHZhbHVlID0gd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKHRoaXMucHJlZml4ICsga2V5KVxuICAgIGlmICh2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHZhbHVlXG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbGxiYWNrXG4gIH1cblxuICBzZXQ8VHlwZT4oa2V5OiBzdHJpbmcsIHZhbHVlOiBUeXBlKTogVHlwZSB7XG4gICAgaWYgKHZhbHVlID09PSBudWxsIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJldHVybiB0aGlzLmRlbGV0ZShrZXkpXG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSh0aGlzLnByZWZpeCArIGtleSwgKHZhbHVlIGFzIGFueSkudG9TdHJpbmcoKSlcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1ZhbHVlIG5vdCByZXByZXNlbnRhYmxlIGFzIHN0cmluZycsIHZhbHVlKVxuICAgICAgdGhyb3cgJ1ZhbHVlIGNvdWxkIG5vdCBiZSBzdG9yZWQnXG4gICAgfVxuICB9XG5cbiAgZGVsZXRlKGtleTogc3RyaW5nKTogYW55IHtcbiAgICBjb25zdCB2YWx1ZSA9IHRoaXMuZ2V0KGtleSlcbiAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0odGhpcy5wcmVmaXggKyBrZXkpXG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cbn1cblxuLyoqXG4gKiBBIHN0b3JhZ2UgaGFuZGxlciB0byBzdG9yZSBkYXRhIGluIHRlbXBvcmFyeSBtZW1vcnkuXG4gKlxuICogQWxsIGRhdGEgaXMgbG9zdCB3aGVuIHRoZSBwYWdlIGlzIHJlbG9hZGVkXG4gKi9cbmV4cG9ydCBjbGFzcyBUZW1wb3JhcnlTdG9yYWdlIHtcbiAgZGF0YTogYW55XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuZGF0YSA9IHt9XG4gIH1cblxuICBnZXQoa2V5OiBzdHJpbmcsIGZhbGxiYWNrOiBhbnkgPSB1bmRlZmluZWQpOiBhbnkge1xuICAgIGlmICh0eXBlb2YgdGhpcy5kYXRhW2tleV0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm4gdGhpcy5kYXRhW2tleV1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsbGJhY2tcbiAgfVxuXG4gIHNldDxUeXBlPihrZXk6IHN0cmluZywgdmFsdWU6IFR5cGUpOiBUeXBlIHtcbiAgICBpZiAodmFsdWUgPT09IG51bGwgfHwgdHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgdGhpcy5kZWxldGUoa2V5KVxuICAgICAgcmV0dXJuIHZhbHVlXG4gICAgfVxuXG4gICAgdGhpcy5kYXRhW2tleV0gPSB2YWx1ZVxuICAgIHJldHVybiB0aGlzLmRhdGFba2V5XVxuICB9XG5cbiAgZGVsZXRlKGtleTogc3RyaW5nKTogYW55IHtcbiAgICBjb25zdCB2YWx1ZSA9IHRoaXMuZ2V0KGtleSlcblxuICAgIGlmIChrZXkgaW4gdGhpcy5kYXRhKSB7XG4gICAgICBkZWxldGUgdGhpcy5kYXRhW2tleV1cbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWVcbiAgfVxufVxuIiwgImludGVyZmFjZSBTdHJpbmdNYXAgeyBbaW5kZXg6c3RyaW5nXTogc3RyaW5nIH1cblxuLy8gVUkgdHJhbnNsYXRpb25zLlxuZGVjbGFyZSBjb25zdCBUMlJfVFJBTlNMQVRJT05TOiBTdHJpbmdNYXBcblxuLyoqXG4gKiBFcXVpdmFsZW50IG9mIEkxOG4udCgpLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXlcbiAqICAgU3RyaW5nIElELlxuICogQHBhcmFtIHt7fX0gdmFyc1xuICogICBLZXktdmFsdWUgcGFpciBvZiB2YXJpYWJsZXMgdG8gcmVwbGFjZS5cbiAqXG4gKiBAZXhhbXBsZVxuICogICBUMlIudCgnaGVsbG8nLCB7IG5hbWU6ICdKdW5pb3InIH0pO1xuICpcbiAqICAgVGhpcyByZXBsYWNlcyAnQG5hbWUnIHdpdGggJ0p1bmlvcicuXG4gKlxuICogQHJldHVybnMge3N0cmluZ31cbiAqICAgVHJhbnNsYXRlZCBzdHJpbmcgaWYgYXZhaWxhYmxlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNsYXRlKGtleTogc3RyaW5nLCB2YXJzOiBTdHJpbmdNYXAgPSB7fSk6IHN0cmluZyB7XG4gIGlmICh0eXBlb2YgVDJSX1RSQU5TTEFUSU9OU1trZXldID09PSAndW5kZWZpbmVkJykge1xuICAgIGNvbnN0IGxhbmcgPSAkKCdodG1sJykuYXR0cignbGFuZycpIHx8ICc/PydcbiAgICByZXR1cm4gYHRyYW5zbGF0aW9uIG1pc3Npbmc6ICR7bGFuZ30uJHtrZXl9YFxuICB9XG5cbiAgbGV0IHJlc3VsdDogc3RyaW5nID0gVDJSX1RSQU5TTEFUSU9OU1trZXldO1xuICBmb3IgKGNvbnN0IG5hbWUgaW4gdmFycykge1xuICAgIHJlc3VsdCA9IHJlc3VsdC5yZXBsYWNlKCdAJyArIG5hbWUsIHZhcnNbbmFtZV0pXG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuIiwgIi8qKlxuICogQSB3cmFwcGVyIGZvciBKYXZhU2NyaXB0J3MgRGF0ZSBvYmplY3QuXG4gKi9cbmV4cG9ydCBjbGFzcyBEYXRlVGltZSB7XG5cbiAgcmVhZG9ubHkgZGF0ZTogRGF0ZTtcblxuICBjb25zdHJ1Y3RvcihkYXRlOiBEYXRlIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5kYXRlID0gZGF0ZSB8fCBuZXcgRGF0ZSgpXG4gIH1cblxuICAvKipcbiAgICogRm9ybWF0IGRhdGUgYXMgWVlZWS1NTS1ERC5cbiAgICpcbiAgICogQHBhcmFtIHtEYXRlfSBkYXRlXG4gICAqICAgQSBkYXRlLlxuICAgKlxuICAgKiBAcmV0dXJucyB7U3RyaW5nfVxuICAgKiAgIEhUTUwtZnJpZW5kbHkgZGF0ZSwgZS5nLiAyMDIxLTAyLTI4LlxuICAgKi9cbiAgdG9IVE1MRGF0ZVN0cmluZygpOiBzdHJpbmcge1xuICAgIGNvbnN0IHl5eXkgPSB0aGlzLmRhdGUuZ2V0RnVsbFllYXIoKTtcbiAgICBjb25zdCBtbSA9ICh0aGlzLmRhdGUuZ2V0TW9udGgoKSArIDEpLnRvU3RyaW5nKCkucGFkU3RhcnQoMiwgJzAnKVxuICAgIGNvbnN0IGRkID0gdGhpcy5kYXRlLmdldERhdGUoKS50b1N0cmluZygpLnBhZFN0YXJ0KDIsICcwJylcblxuICAgIHJldHVybiBgJHt5eXl5fS0ke21tfS0ke2RkfWBcbiAgfVxuXG4gIC8qKlxuICAgKiBGb3JtYXQgZGF0ZSBpbiBJU08gZm9ybWF0LlxuICAgKlxuICAgKiBFeGFtcGxlOiAyMDIxLTA4LTI4VDEwOjMyOjQzLjE0NFpcbiAgICpcbiAgICogQHBhcmFtIHplcm9UaW1lXG4gICAqICAgV2hldGhlciB0aW1lIHNob3VsZCBiZSBzZXQgdG8gMDA6MDA6MDAuXG4gICAqL1xuICB0b0lTT1N0cmluZyh6ZXJvVGltZSA9IGZhbHNlKTogc3RyaW5nIHtcbiAgICBpZiAoIXplcm9UaW1lKSB7XG4gICAgICByZXR1cm4gdGhpcy5kYXRlLnRvSVNPU3RyaW5nKClcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5kYXRlLnRvSVNPU3RyaW5nKCkuc3BsaXQoJ1QnKVswXSArICdUMDA6MDA6MDAuMDAwWidcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIGluc3RhbmNlIGZyb20gYSBkYXRlIHN0cmluZy5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGRhdGVcbiAgICogICBUaGUgc3RyaW5nIHRvIHBhcnNlIGFzIGEgZGF0ZS5cbiAgICpcbiAgICogQHJldHVybnMge0RhdGVUaW1lfHVuZGVmaW5lZH1cbiAgICogICBUaGUgZGF0ZSBhcyBhbiBvYmplY3QuXG4gICAqL1xuICBzdGF0aWMgZnJvbVN0cmluZyhkYXRlOiBzdHJpbmcpOiBEYXRlVGltZSB7XG4gICAgLy8gRG9uJ3QgdXNlIERhdGUucGFyc2UoKSBhcyBpdCB3b3JrcyBkaWZmZXJlbnRseSBkZXBlbmRpbmcgb24gdGhlIGJyb3dzZXIuXG4gICAgY29uc3QgZGF0ZVBhcnRzOiBudW1iZXJbXSA9IGRhdGUuc3BsaXQoL1teXFxkXS8pLm1hcCgocGFydCkgPT4ge1xuICAgICAgcmV0dXJuIHBhcnNlSW50KHBhcnQpXG4gICAgfSk7XG5cbiAgICAvLyBNdXN0IGhhdmUgYXQgbGVhc3QgdGhlIFwiZGF0ZVwiIHBhcnQuXG4gICAgaWYgKGRhdGVQYXJ0cy5sZW5ndGggPCAzKSB7XG4gICAgICB0aHJvdyBgSW52YWxpZCBkYXRlOiAke2RhdGV9YFxuICAgIH1cblxuICAgIC8vIEFzc3VtZSB0aW1lIHBhcnRzIHRvIGJlIDAwIGlmIG5vdCBkZWZpbmVkLlxuICAgIGZvciAobGV0IGkgPSAzOyBpIDw9IDY7IGkrKykge1xuICAgICAgaWYgKHR5cGVvZiBkYXRlUGFydHNbaV0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGRhdGVQYXJ0c1tpXSA9IDA7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTm8gcGFydCBvZiB0aGUgZGF0ZSBjYW4gYmUgbm9uLW51bWVyaWMuXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPD0gNjsgaSsrKSB7XG4gICAgICBpZiAoaXNOYU4oZGF0ZVBhcnRzW2ldKSkgdGhyb3cgYEludmFsaWQgZGF0ZTogJHtkYXRlfWBcbiAgICB9XG5cbiAgICBpZiAoZGF0ZVBhcnRzWzFdIDwgMSB8fCBkYXRlUGFydHNbMV0gPiAxMikge1xuICAgICAgdGhyb3cgYEludmFsaWQgZGF0ZTogJHtkYXRlfWBcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgcmV0dXJuIG5ldyBEYXRlVGltZShuZXcgRGF0ZShcbiAgICAgICAgZGF0ZVBhcnRzWzBdLFxuICAgICAgICBkYXRlUGFydHNbMV0gLSAxLFxuICAgICAgICBkYXRlUGFydHNbMl0sXG4gICAgICAgIGRhdGVQYXJ0c1szXSxcbiAgICAgICAgZGF0ZVBhcnRzWzRdLFxuICAgICAgICBkYXRlUGFydHNbNV0sXG4gICAgICAgIGRhdGVQYXJ0c1s2XVxuICAgICAgKSk7XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdJbnZhbGlkIGRhdGUnLCBkYXRlKVxuICAgICAgdGhyb3cgYEludmFsaWQgZGF0ZTogJHtkYXRlfWBcbiAgICB9XG4gIH1cblxufVxuXG5leHBvcnQgZW51bSBEdXJhdGlvblJvdW5kaW5nTWV0aG9kIHtcbiAgVXAgPSAnVScsXG4gIERvd24gPSAnRCcsXG4gIFJlZ3VsYXIgPSAnUidcbn1cblxuLyoqXG4gKiBUb2dnbCB0byBSZWRtaW5lIHRpbWUgZHVyYXRpb24uXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9XG4gKiAgIEEgZHVyYXRpb24gYXMgaGg6bW0gb3Igc2Vjb25kcy5cbiAqL1xuZXhwb3J0IGNsYXNzIER1cmF0aW9uIHtcblxuICAvLyBOdW1iZXIgb2Ygc2Vjb25kcyBpbiB0aGUgZHVyYXRpb24uXG4gIHByaXZhdGUgX3NlY29uZHM6IG51bWJlcjtcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIER1cmF0aW9uIG9iamVjdC5cbiAgICpcbiAgICogQHBhcmFtIGR1cmF0aW9uIFtPcHRpb25hbF0gQSBkdXJhdGlvbi5cbiAgICpcbiAgICogQGV4YW1wbGUgZCA9IER1cmF0aW9uKDkwKVxuICAgKiBAZXhhbXBsZSBkID0gRHVyYXRpb24oJzkwJylcbiAgICogQGV4YW1wbGUgZCA9IER1cmF0aW9uKCcxOjMwJylcbiAgICovXG4gIGNvbnN0cnVjdG9yKGR1cmF0aW9uOiBudW1iZXIgfCBzdHJpbmcgPSAwKSB7XG4gICAgdGhpcy5fc2Vjb25kcyA9IDBcbiAgICBkdXJhdGlvbiA9IGR1cmF0aW9uIHx8IDA7XG5cbiAgICBpZiAoJ251bWJlcicgPT09IHR5cGVvZiBkdXJhdGlvbikge1xuICAgICAgdGhpcy5zZWNvbmRzID0gZHVyYXRpb247XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBpZiAoZHVyYXRpb24ubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICB0aGlzLnNlY29uZHMgPSBwYXJzZUludChkdXJhdGlvbilcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICB0aGlzLnNldEhITU0oZHVyYXRpb24pO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHRocm93ICdFcnJvcjogXCInICsgZHVyYXRpb24gKyAnXCIgaXMgbm90IGEgbnVtYmVyIG9yIGFuIGhoOm1tIHN0cmluZy4nO1xuICAgIH1cbiAgfVxuXG4gIGdldCBob3VycygpOiBudW1iZXIge1xuICAgIHJldHVybiBNYXRoLmZsb29yKHRoaXMuX3NlY29uZHMgLyAzNjAwKVxuICB9XG5cbiAgZ2V0IG1pbnV0ZXMoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gTWF0aC5mbG9vcih0aGlzLl9zZWNvbmRzIC8gNjApXG4gIH1cblxuICBnZXQgc2Vjb25kcygpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9zZWNvbmRzXG4gIH1cblxuICBzZXQgc2Vjb25kcyh2YWx1ZTogbnVtYmVyKSB7XG4gICAgaWYgKHZhbHVlIDwgMCkge1xuICAgICAgdGhyb3cgYFZhbHVlIGNhbm5vdCBiZSBuZWdhdGl2ZTogJHt2YWx1ZX1gXG4gICAgfVxuXG4gICAgdGhpcy5fc2Vjb25kcyA9IHZhbHVlXG4gIH1cblxuICAvKipcbiAgICogU2V0cyBkdXJhdGlvbiBmcm9tIGhvdXJzIGFuZCBtaW51dGVzLlxuICAgKlxuICAgKiBTdXBwb3J0ZWQgZm9ybWF0czpcbiAgICogICAtIDIgPSAyaCAwMG1cbiAgICogICAtIDI6MzAgPSAyaCAzMG1cbiAgICogICAtIDo1ID0gMGggNW1cbiAgICogICAtIDozMCA9IDBoIDMwbVxuICAgKiAgIC0gMi41MCA9IDJoIDMwbVxuICAgKiAgIC0gLjUgPSAwaCAzMG1cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGhobW1cbiAgICovXG4gIHNldEhITU0oaGhtbTogc3RyaW5nKTogdm9pZCB7XG4gICAgbGV0IHBhcnRzOiBzdHJpbmdbXSA9IFtdXG4gICAgbGV0IHBhdHRlcm46IFJlZ0V4cFxuICAgIGxldCBoaDogbnVtYmVyIHwgbnVsbFxuICAgIGxldCBtbTogbnVtYmVyIHwgbnVsbFxuICAgIGNvbnN0IGVycm9yID0gYEludmFsaWQgaGg6bW0gZm9ybWF0OiAke2hobW19YFxuXG4gICAgLy8gUGFyc2UgaGggb25seS4gRXg6IDIgPSAyaCAwMG0uXG4gICAgcGF0dGVybiA9IC9eKFxcZHswLDJ9KSQvXG4gICAgaWYgKGhobW0ubWF0Y2gocGF0dGVybikpIHtcbiAgICAgIGNvbnN0IG1hdGNoZXMgPSBoaG1tLm1hdGNoKHBhdHRlcm4pIGFzIFJlZ0V4cE1hdGNoQXJyYXlcbiAgICAgIGhoID0gcGFyc2VJbnQobWF0Y2hlcy5wb3AoKSBhcyBzdHJpbmcpXG4gICAgICB0aGlzLnNlY29uZHMgPSBoaCAqIDYwICogNjBcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFBhcnNlIGhoOm1tIGR1cmF0aW9uLiBFeDogMjozMCA9IDJoIDMwbS5cbiAgICBwYXR0ZXJuID0gL14oXFxkezAsMn0pOihcXGR7MCwyfSkkLztcbiAgICBpZiAoaGhtbS5tYXRjaChwYXR0ZXJuKSkge1xuICAgICAgY29uc3QgbWF0Y2hlcyA9IGhobW0ubWF0Y2gocGF0dGVybikgYXMgUmVnRXhwTWF0Y2hBcnJheVxuICAgICAgcGFydHMgPSBtYXRjaGVzLnNsaWNlKC0yKVxuICAgICAgbW0gPSBwYXJzZUludChwYXJ0cy5wb3AoKSB8fCAnMCcpXG4gICAgICBoaCA9IHBhcnNlSW50KHBhcnRzLnBvcCgpIHx8ICcwJylcblxuICAgICAgaWYgKG1tID4gNTkpIHRocm93IGVycm9yXG5cbiAgICAgIHRoaXMuc2Vjb25kcyA9IGhoICogNjAgKiA2MCArIG1tICogNjBcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFBhcnNlIGhoLm1tIGFzIGRlY2ltYWwuIEV4OiAyLjUgPSAyaCAzMG0uXG4gICAgcGF0dGVybiA9IC9eKFxcZHswLDJ9KVxcLihcXGR7MSwyfSkkL1xuICAgIGlmIChoaG1tLm1hdGNoKHBhdHRlcm4pKSB7XG4gICAgICBjb25zdCBtYXRjaGVzID0gaGhtbS5tYXRjaChwYXR0ZXJuKSBhcyBSZWdFeHBNYXRjaEFycmF5XG4gICAgICBwYXJ0cyA9IG1hdGNoZXMuc2xpY2UoLTIpXG4gICAgICBoaCA9IHBhcnNlSW50KHBhcnRzWzBdIHx8ICcwJylcbiAgICAgIGhoID0gTWF0aC5yb3VuZChoaClcbiAgICAgIG1tID0gcGFyc2VJbnQocGFydHNbMV0gfHwgJzAnKVxuICAgICAgbW0gPSAoNjAgKiBtbSkgLyBNYXRoLnBvdygxMCwgcGFydHNbMV0ubGVuZ3RoKVxuXG4gICAgICB0aGlzLnNlY29uZHMgPSBoaCAqIDYwICogNjAgKyBtbSAqIDYwXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB0aHJvdyBlcnJvclxuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIGR1cmF0aW9uIGFzIGhvdXJzIGFuZCBtaW51dGVzLlxuICAgKlxuICAgKiBAcmV0dXJuIHN0cmluZ1xuICAgKiAgIFRpbWUgaW4gaGg6bW0gZm9ybWF0LlxuICAgKi9cbiAgYXNISE1NKCk6IHN0cmluZyB7XG4gICAgY29uc3QgaGg6IHN0cmluZyA9IHRoaXMuaG91cnMudG9TdHJpbmcoKS5wYWRTdGFydCgyLCAnMCcpXG4gICAgY29uc3QgbW06IHN0cmluZyA9ICh0aGlzLm1pbnV0ZXMgJSA2MCkudG9TdHJpbmcoKS5wYWRTdGFydCgyLCAnMCcpXG5cbiAgICByZXR1cm4gYCR7aGh9OiR7bW19YFxuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIGR1cmF0aW9uIGFzIGhvdXJzIGluIGRlY2ltYWxzLlxuICAgKlxuICAgKiBAcmV0dXJuIHN0cmluZ1xuICAgKiAgIFRpbWUgaW4gaG91cnMgKGRlY2ltYWwpLiBFeDogMS41IGZvciAxIGhyIDMwIG1pbi5cbiAgICovXG4gIGFzRGVjaW1hbCgpOiBzdHJpbmcge1xuICAgIC8vIE9ubHkgY29uc2lkZXIgZnVsbCBtaW51dGVzLlxuICAgIGNvbnN0IGhvdXJzOiBudW1iZXIgPSB0aGlzLm1pbnV0ZXMgLyA2MFxuICAgIC8vIENvbnZlcnQgdG8gaG91cnMuIEV4OiAwaCAyNW0gYmVjb21lcyAwLjQxNi5cbiAgICBjb25zdCBvdXRwdXQ6IHN0cmluZyA9IGhvdXJzLnRvRml4ZWQoMylcbiAgICAvLyBTaW5jZSB0b0ZpeGVkIHJvdW5kcyBvZmYgdGhlIGxhc3QgZGlnaXQsIHdlIGlnbm9yZSBpdC5cbiAgICByZXR1cm4gb3V0cHV0LnN1YnN0cigwLCBvdXRwdXQubGVuZ3RoIC0gMSk7XG4gIH1cblxuICBhZGQob3RoZXI6IER1cmF0aW9uKTogdm9pZCB7XG4gICAgdGhpcy5zZWNvbmRzID0gdGhpcy5zZWNvbmRzICsgb3RoZXIuc2Vjb25kc1xuICB9XG5cbiAgc3ViKG90aGVyOiBEdXJhdGlvbik6IHZvaWQge1xuICAgIC8vIER1cmF0aW9uIGNhbm5vdCBiZSBuZWdhdGl2ZS5cbiAgICB0aGlzLnNlY29uZHMgPSBNYXRoLm1heCh0aGlzLnNlY29uZHMgLSBvdGhlci5zZWNvbmRzLCAwKVxuICB9XG5cbiAgLyoqXG4gICAqIFJvdW5kcyB0byB0aGUgbmVhcmVzdCBtaW51dGVzLlxuICAgKlxuICAgKiBAcGFyYW0geyp9IG1pbnV0ZXNcbiAgICogICBOdW1iZXIgb2YgbWludXRlcyB0byByb3VuZCB0by4gRXg6IDUsIDEwIG9yIDE1LlxuICAgKiBAcGFyYW0ge0R1cmF0aW9uUm91bmRpbmdNZXRob2R9IG1ldGhvZFxuICAgKiAgIFJvdW5kaW5nIGxvZ2ljLlxuICAgKi9cbiAgcm91bmRUbyhtaW51dGVzOiBudW1iZXIsIG1ldGhvZDogRHVyYXRpb25Sb3VuZGluZ01ldGhvZCk6IHZvaWQge1xuICAgIGlmICgwID09PSBtaW51dGVzKSByZXR1cm5cbiAgICBjb25zdCBzZWNvbmRzOiBudW1iZXIgPSBtaW51dGVzICogNjA7XG5cbiAgICAvLyBEbyBub3RoaW5nIGlmIG5vIGNvcnJlY3Rpb24gLyByb3VuZGluZyBpcyByZXF1aXJlZC5cbiAgICBjb25zdCBjb3JyZWN0aW9uOiBudW1iZXIgPSB0aGlzLnNlY29uZHMgJSBzZWNvbmRzO1xuICAgIGlmIChjb3JyZWN0aW9uID09PSAwKSByZXR1cm5cblxuICAgIC8vIFJvdW5kIGFjY29yZGluZyB0byByb3VuZGluZyBtZXRob2QuXG4gICAgc3dpdGNoIChtZXRob2QpIHtcbiAgICAgIGNhc2UgRHVyYXRpb25Sb3VuZGluZ01ldGhvZC5SZWd1bGFyOlxuICAgICAgICBpZiAoY29ycmVjdGlvbiA+PSBzZWNvbmRzIC8gMikge1xuICAgICAgICAgIHRoaXMucm91bmRUbyhtaW51dGVzLCBEdXJhdGlvblJvdW5kaW5nTWV0aG9kLlVwKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICB0aGlzLnJvdW5kVG8obWludXRlcywgRHVyYXRpb25Sb3VuZGluZ01ldGhvZC5Eb3duKTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBEdXJhdGlvblJvdW5kaW5nTWV0aG9kLlVwOlxuICAgICAgICB0aGlzLmFkZChuZXcgRHVyYXRpb24oc2Vjb25kcyAtIGNvcnJlY3Rpb24pKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgRHVyYXRpb25Sb3VuZGluZ01ldGhvZC5Eb3duOlxuICAgICAgICB0aGlzLnN1YihuZXcgRHVyYXRpb24oY29ycmVjdGlvbikpO1xuICAgICAgICBicmVhaztcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgJ0ludmFsaWQgcm91bmRpbmcgbWV0aG9kLic7XG4gICAgfVxuICB9XG59XG4iLCAiZW51bSBUeXBlIHtcbiAgTm90aWNlID0gJ25vdGljZScsXG4gIEVycm9yID0gJ2Vycm9yJyxcbiAgV2FybmluZyA9ICd3YXJuaW5nJ1xufVxuXG4vKipcbiAqIERpc3BsYXlzIGEgcmFpbHMtc3R5bGUgZmxhc2ggbWVzc2FnZS5cbiAqL1xuZnVuY3Rpb24gbWVzc2FnZSh0ZXh0OiBzdHJpbmcsIHR5cGU6IFR5cGUgPSBUeXBlLk5vdGljZSk6IHZvaWQge1xuICAkKCcjY29udGVudCcpLnByZXBlbmQoYDxkaXYgY2xhc3M9XCJmbGFzaCB0MnIgJHt0eXBlfVwiPiR7dGV4dC50cmltKCl9PC9kaXY+YCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBlcnJvcih0ZXh0OiBzdHJpbmcpOiB2b2lkIHtcbiAgbWVzc2FnZSh0ZXh0LCBUeXBlLkVycm9yKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gd2FybmluZyh0ZXh0OiBzdHJpbmcpOiB2b2lkIHtcbiAgbWVzc2FnZSh0ZXh0LCBUeXBlLldhcm5pbmcpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub3RpY2UodGV4dDogc3RyaW5nKTogdm9pZCB7XG4gIG1lc3NhZ2UodGV4dCwgVHlwZS5Ob3RpY2UpXG59XG5cbi8qKlxuICogQ2xlYXJzIGFsbCBmbGFzaCBtZXNzYWdlcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsZWFyKCk6IHZvaWQge1xuICAkKCcudDJyLmZsYXNoJykucmVtb3ZlKCk7XG59XG4iLCAiLyoqXG4gKiBSZXF1ZXN0IFF1ZXVlLlxuICpcbiAqIFNlcXVlbnRpYWxseSBleGVjdXRlcyBBSkFYIHJlcXVlc3RzLlxuICovXG5leHBvcnQgY2xhc3MgUmVxdWVzdFF1ZXVlIHtcblxuICAvKipcbiAgICogUmVxdWVzdHMgdG8gYmUgcHJvY2Vzc2VkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgcHJpdmF0ZSBfaXRlbXM6IEpRdWVyeS5BamF4U2V0dGluZ3NbXVxuXG4gIC8qKlxuICAgKiBXaGV0aGVyIGEgcmVxdWVzdCBpcyBpbiBwcm9ncmVzcy5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIHByaXZhdGUgX3JlcXVlc3RJblByb2dyZXNzOiBib29sZWFuXG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5faXRlbXMgPSBbXVxuICAgIHRoaXMuX3JlcXVlc3RJblByb2dyZXNzID0gZmFsc2VcbiAgfVxuXG4gIC8qKlxuICAgKiBOdW1iZXIgb2YgcmVxdWVzdHMgY3VycmVudGx5IGluIHRoZSBxdWV1ZS5cbiAgICovXG4gIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5faXRlbXMubGVuZ3RoXG4gIH1cblxuICAvKipcbiAgICogQWRkcyBhbiBBSkFYIHJlcXVlc3QgdG8gdGhlIGV4ZWN1dGlvbiBxdWV1ZS5cbiAgICpcbiAgICogUmVxdWVzdHMgYmUgZXhlY3V0ZWQgb25lIGFmdGVyIHRoZSBvdGhlciB1bnRpbCBhbGwgaXRlbXMgaW4gdGhlIHF1ZXVlIGhhdmVcbiAgICogYmVlbiBwcm9jZXNzZWQuXG4gICAqL1xuICBhZGRJdGVtKG9wdHM6IEpRdWVyeS5BamF4U2V0dGluZ3MpOiB2b2lkIHtcbiAgICB0aGlzLl9pdGVtcy5wdXNoKG9wdHMpXG4gICAgdGhpcy5wcm9jZXNzSXRlbSgpXG4gIH1cblxuICAvKipcbiAgICogUHJvY2Vzc2VzIHRoZSBuZXh0IHJlcXVlc3QuXG4gICAqL1xuICBwcm9jZXNzSXRlbSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5sZW5ndGggPT09IDAgfHwgdGhpcy5fcmVxdWVzdEluUHJvZ3Jlc3MpIHJldHVyblxuICAgIHRoaXMuX3JlcXVlc3RJblByb2dyZXNzID0gdHJ1ZTtcblxuICAgIGNvbnN0IHRoYXQgPSB0aGlzXG4gICAgY29uc3Qgb3B0cyA9IHRoaXMuX2l0ZW1zLnNoaWZ0KClcbiAgICBpZiAob3B0cyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjb25zb2xlLmRlYnVnKCdQcm9jZXNzaW5nIEFKQVggcXVldWUgKCcgKyB0aGlzLmxlbmd0aCArICcgcmVtYWluaW5nKS4nLCBvcHRzKVxuXG4gICAgY29uc3Qgb3JpZ2luYWxDYWxsYmFjayA9IG9wdHMuY29tcGxldGUgYXMgSlF1ZXJ5LkFqYXguQ29tcGxldGVDYWxsYmFjazxFbGVtZW50PlxuICAgIG9wdHMuY29tcGxldGUgPSBmdW5jdGlvbiAoeGhyOiBKUXVlcnkuanFYSFIsIHN0YXR1czogSlF1ZXJ5LkFqYXguVGV4dFN0YXR1cykge1xuICAgICAgaWYgKHR5cGVvZiBvcmlnaW5hbENhbGxiYWNrICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAob3JpZ2luYWxDYWxsYmFjaykuY2FsbCh0aGlzLCB4aHIsIHN0YXR1cylcbiAgICAgIH1cblxuICAgICAgLy8gUHJvY2VzcyB0aGUgbmV4dCBpdGVtIGluIHRoZSBxdWV1ZSwgaWYgYW55LlxuICAgICAgdGhhdC5fcmVxdWVzdEluUHJvZ3Jlc3MgPSBmYWxzZVxuICAgICAgdGhhdC5wcm9jZXNzSXRlbSgpXG4gICAgfTtcblxuICAgIC8vIFByb2Nlc3MgY3VycmVudCBpdGVtLlxuICAgICQuYWpheChvcHRzKTtcbiAgfVxuXG59XG4iLCAiaW1wb3J0ICogYXMgZGF0ZXRpbWUgZnJvbSBcIi4vZGF0ZXRpbWUuanNcIlxuaW1wb3J0ICogYXMgbW9kZWxzIGZyb20gXCIuL21vZGVscy5qc1wiXG5pbXBvcnQgKiBhcyBmbGFzaCBmcm9tIFwiLi9mbGFzaC5qc1wiXG5pbXBvcnQge3RyYW5zbGF0ZSBhcyB0fSBmcm9tIFwiLi9pMThuLmpzXCJcbmltcG9ydCB7UmVxdWVzdFF1ZXVlfSBmcm9tIFwiLi9yZXF1ZXN0LmpzXCJcbmltcG9ydCB7VGVtcG9yYXJ5U3RvcmFnZX0gZnJvbSBcIi4vc3RvcmFnZS5qc1wiXG5pbXBvcnQge1RpbWVFbnRyeUFjdGl2aXR5fSBmcm9tIFwiLi9tb2RlbHMuanNcIlxuXG5pbnRlcmZhY2UgR2V0TGFzdEV4cG9ydERhdGVDYWxsYmFjayB7XG4gIChkYXRlOiBkYXRldGltZS5EYXRlVGltZSB8IG51bGwpOiB2b2lkXG59XG5cbmludGVyZmFjZSBHZXRUaW1lRW50cmllc1BhcmFtcyB7XG4gIGZyb206IGRhdGV0aW1lLkRhdGVUaW1lXG4gIHRpbGw6IGRhdGV0aW1lLkRhdGVUaW1lXG59XG5cbmludGVyZmFjZSBHZXRUaW1lRW50cmllc1Jlc3BvbnNlIHtcbiAgdGltZV9lbnRyaWVzOiBtb2RlbHMuVGltZUVudHJ5W11cbn1cblxuaW50ZXJmYWNlIEdldFRpbWVFbnRyaWVzQ2FsbGJhY2sge1xuICAoZW50cmllczogbW9kZWxzLlRpbWVFbnRyeVtdIHwgbnVsbCk6IHZvaWRcbn1cblxuaW50ZXJmYWNlIEdldFRpbWVFbnRyeUFjdGl2aXRpZXNSZXNwb25zZSB7XG4gIHRpbWVfZW50cnlfYWN0aXZpdGllczogbW9kZWxzLlRpbWVFbnRyeUFjdGl2aXR5W11cbn1cblxuaW50ZXJmYWNlIEdldFRpbWVFbnRyeUFjdGl2aXRpZXNDYWxsYmFjayB7XG4gIChhY3Rpdml0aWVzOiBUaW1lRW50cnlBY3Rpdml0eVtdIHwgbnVsbCk6IHZvaWRcbn1cblxuaW50ZXJmYWNlIEdldFRvZ2dsVGltZUVudHJpZXNQYXJhbXMge1xuICBmcm9tOiBkYXRldGltZS5EYXRlVGltZVxuICB0aWxsOiBkYXRldGltZS5EYXRlVGltZVxuICB3b3Jrc3BhY2VJZDogbnVtYmVyIHwgbnVsbFxufVxuXG5pbnRlcmZhY2UgR2V0VG9nZ2xUaW1lRW50cmllc0NhbGxiYWNrIHtcbiAgKGVudHJpZXM6IG1vZGVscy5LZXllZFRvZ2dsVGltZUVudHJ5Q29sbGVjdGlvbik6IHZvaWRcbn1cblxuaW50ZXJmYWNlIEdldFRvZ2dsV29ya3NwYWNlc0NhbGxiYWNrIHtcbiAgKHdvcmtzcGFjZXM6IG1vZGVscy5Ub2dnbFdvcmtzcGFjZVtdIHwgbnVsbCk6IHZvaWRcbn1cblxuaW50ZXJmYWNlIFBvc3RUaW1lRW50cnlQYXJhbXMge1xuICB0aW1lX2VudHJ5OiB7XG4gICAgc3BlbnRfb246IHN0cmluZ1xuICAgIGlzc3VlX2lkOiBudW1iZXJcbiAgICBjb21tZW50czogc3RyaW5nXG4gICAgYWN0aXZpdHlfaWQ6IG51bWJlciB8IG51bGxcbiAgICBob3Vyczogc3RyaW5nXG4gIH0sXG4gIHRvZ2dsX2lkczogbnVtYmVyW11cbn1cblxuaW50ZXJmYWNlIFBvc3RUaW1lRW50cnlDYWxsYmFjayB7XG4gIChlcnJvcnM6IHN0cmluZ1tdKTogdm9pZFxufVxuXG4vKipcbiAqIFNlbmRzIHJlcXVlc3RzIHRvIFJlZG1pbmUgQVBJIGVuZHBvaW50cy5cbiAqL1xuZXhwb3J0IGNsYXNzIFJlZG1pbmVBUElTZXJ2aWNlIHtcbiAgcmVhZG9ubHkgX2FwaUtleTogc3RyaW5nXG4gIHJlYWRvbmx5IF9iYXNlVXJsOiBzdHJpbmdcbiAgcmVhZG9ubHkgX2NhY2hlOiBUZW1wb3JhcnlTdG9yYWdlXG4gIHB1YmxpYyByZXF1ZXN0UXVldWU6IFJlcXVlc3RRdWV1ZVxuXG4gIGNvbnN0cnVjdG9yKGFwaUtleTogc3RyaW5nKSB7XG4gICAgdGhpcy5fYmFzZVVybCA9IHdpbmRvdy5sb2NhdGlvbi5vcmlnaW5cbiAgICB0aGlzLl9hcGlLZXkgPSBhcGlLZXlcbiAgICB0aGlzLl9jYWNoZSA9IG5ldyBUZW1wb3JhcnlTdG9yYWdlKClcbiAgICB0aGlzLnJlcXVlc3RRdWV1ZSA9IG5ldyBSZXF1ZXN0UXVldWUoKVxuICB9XG5cbiAgLyoqXG4gICAqIFNlbmRzIGFuIEFKQVggcmVxdWVzdCB0byBSZWRtaW5lIHdpdGggdGhlIGdpdmVuIG9wdGlvbnMuXG4gICAqXG4gICAqIEF1dG9tYXRpY2FsbHkgaW5qZWN0cyBhdXRoIGhlYWRlcnMuXG4gICAqXG4gICAqIEBwYXJhbSBvcHRzXG4gICAqICAgUmVxdWVzdCBvcHRpb25zLlxuICAgKi9cbiAgcmVxdWVzdChvcHRzOiBKUXVlcnkuQWpheFNldHRpbmdzKTogdm9pZCB7XG4gICAgaWYgKCFvcHRzLnVybCkgdGhyb3cgJ01pc3NpbmcgcmVxdWlyZWQgcGFyYW1ldGVyOiB1cmwnXG5cbiAgICBpZiAob3B0cy51cmwubWF0Y2goL15cXC8vKSkge1xuICAgICAgb3B0cy51cmwgPSB0aGlzLl9iYXNlVXJsICsgb3B0cy51cmxcbiAgICB9XG5cbiAgICBvcHRzLmhlYWRlcnMgPSBvcHRzLmhlYWRlcnMgfHwge31cbiAgICBvcHRzLmhlYWRlcnNbJ1gtUmVkbWluZS1BUEktS2V5J10gPSB0aGlzLl9hcGlLZXlcbiAgICBvcHRzLnRpbWVvdXQgPSBvcHRzLnRpbWVvdXQgfHwgMzAwMFxuXG4gICAgdGhpcy5yZXF1ZXN0UXVldWUuYWRkSXRlbShvcHRzKVxuICB9XG5cbiAgaGFuZGxlUmVxdWVzdFN1Y2Nlc3M8VHlwZT4odHlwZTogc3RyaW5nLCBkYXRhOiBUeXBlKTogdm9pZCB7XG4gICAgY29uc29sZS5kZWJ1ZyhgUmVxdWVzdCBzdWNjZWVkZWQ6ICR7dHlwZX1gLCBkYXRhKVxuICB9XG5cbiAgaGFuZGxlUmVxdWVzdEVycm9yKHR5cGU6IHN0cmluZyk6IHZvaWQge1xuICAgIGZsYXNoLmVycm9yKHQoJ3Qyci5lcnJvci5hamF4X2xvYWQnKSlcbiAgICBjb25zb2xlLmVycm9yKGBSZXF1ZXN0IGZhaWxlZDogJHt0eXBlfWApXG4gIH1cblxuICAvKipcbiAgICogRmV0Y2hlcyBSZWRtaW5lIHRpbWUgZW50cmllcy5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IHBhcmFtc1xuICAgKiAgIFF1ZXJ5IHBhcmFtZXRlcnMuXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrXG4gICAqICAgUmVjZWl2ZXMgdGltZSBlbnRyaWVzIG9yIG51bGwuXG4gICAqL1xuICBnZXRUaW1lRW50cmllcyhwYXJhbXM6IEdldFRpbWVFbnRyaWVzUGFyYW1zLCBjYWxsYmFjazogR2V0VGltZUVudHJpZXNDYWxsYmFjayk6IHZvaWQge1xuICAgIGNvbnN0IHRoYXQgPSB0aGlzXG4gICAgdGhpcy5yZXF1ZXN0KHtcbiAgICAgIGFzeW5jOiB0cnVlLFxuICAgICAgbWV0aG9kOiAnZ2V0JyxcbiAgICAgIHVybDogJy90b2dnbDJyZWRtaW5lL3JlZG1pbmUvdGltZV9lbnRyaWVzJyxcbiAgICAgIGRhdGE6IHtcbiAgICAgICAgZnJvbTogcGFyYW1zLmZyb20udG9JU09TdHJpbmcodHJ1ZSksXG4gICAgICAgIHRpbGw6IHBhcmFtcy50aWxsLnRvSVNPU3RyaW5nKHRydWUpXG4gICAgICB9LFxuICAgICAgc3VjY2VzczogZnVuY3Rpb24gKGRhdGE6IEdldFRpbWVFbnRyaWVzUmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRhLnRpbWVfZW50cmllcyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICB0aGF0LmhhbmRsZVJlcXVlc3RFcnJvcignUmVkbWluZSB0aW1lIGVudHJpZXMnKVxuICAgICAgICAgIGNhbGxiYWNrKG51bGwpXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cblxuICAgICAgICB0aGF0LmhhbmRsZVJlcXVlc3RTdWNjZXNzKCdSZWRtaW5lIHRpbWUgZW50cmllcycsIGRhdGEpXG5cbiAgICAgICAgY29uc3QgdGltZV9lbnRyaWVzOiBtb2RlbHMuVGltZUVudHJ5W10gPSBkYXRhLnRpbWVfZW50cmllcy5tYXAoKGVudHJ5OiBtb2RlbHMuVGltZUVudHJ5KSA9PiB7XG4gICAgICAgICAgZW50cnkuZHVyYXRpb24gPSBuZXcgZGF0ZXRpbWUuRHVyYXRpb24oXG4gICAgICAgICAgICBNYXRoLmZsb29yKHBhcnNlRmxvYXQoZW50cnkuaG91cnMpICogMzYwMClcbiAgICAgICAgICApXG4gICAgICAgICAgcmV0dXJuIGVudHJ5XG4gICAgICAgIH0pXG5cbiAgICAgICAgY2FsbGJhY2sodGltZV9lbnRyaWVzKTtcbiAgICAgIH0sXG4gICAgICBlcnJvcjogKCkgPT4ge1xuICAgICAgICB0aGF0LmhhbmRsZVJlcXVlc3RFcnJvcignUmVkbWluZSB0aW1lIGVudHJpZXMnKVxuICAgICAgICBjYWxsYmFjayhudWxsKVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEZldGNoZXMgYW5kIGNhY2hlcyB0aW1lIGVudHJ5IGFjdGl2aXRpZXMuXG4gICAqXG4gICAqIEBwYXJhbSBjYWxsYmFja1xuICAgKiAgIGZ1bmN0aW9uIChhY3Rpdml0aWVzLCBudWxsKSB7fVxuICAgKi9cbiAgZ2V0VGltZUVudHJ5QWN0aXZpdGllcyhjYWxsYmFjazogR2V0VGltZUVudHJ5QWN0aXZpdGllc0NhbGxiYWNrKTogdm9pZCB7XG4gICAgY29uc3QgYWN0aXZpdGllczogVGltZUVudHJ5QWN0aXZpdHlbXSA9IHRoaXMuX2NhY2hlLmdldCgncmVkbWluZS5hY3Rpdml0aWVzJylcbiAgICBpZiAoYWN0aXZpdGllcykge1xuICAgICAgY2FsbGJhY2soYWN0aXZpdGllcylcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNvbnN0IHRoYXQgPSB0aGlzXG4gICAgdGhpcy5yZXF1ZXN0KHtcbiAgICAgIHVybDogJy9lbnVtZXJhdGlvbnMvdGltZV9lbnRyeV9hY3Rpdml0aWVzLmpzb24nLFxuICAgICAgc3VjY2VzczogKGRhdGE6IEdldFRpbWVFbnRyeUFjdGl2aXRpZXNSZXNwb25zZSkgPT4ge1xuICAgICAgICB0aGF0LmhhbmRsZVJlcXVlc3RTdWNjZXNzKCdUaW1lIGVudHJ5IGFjdGl2aXRpZXMnLCBkYXRhKVxuICAgICAgICB0aGF0Ll9jYWNoZS5zZXQoJ3JlZG1pbmUuYWN0aXZpdGllcycsIGRhdGEudGltZV9lbnRyeV9hY3Rpdml0aWVzKVxuICAgICAgICBjYWxsYmFjayhkYXRhLnRpbWVfZW50cnlfYWN0aXZpdGllcylcbiAgICAgIH0sXG4gICAgICBlcnJvcjogKCkgPT4ge1xuICAgICAgICB0aGF0LmhhbmRsZVJlcXVlc3RFcnJvcignVGltZSBlbnRyeSBhY3Rpdml0aWVzJylcbiAgICAgICAgY2FsbGJhY2sobnVsbClcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGZXRjaGVzIHRoZSBsYXN0IGRhdGUgb24gd2hpY2ggdGltZSBlbnRyaWVzIHdlcmUgZm91bmQgZm9yIHRoZSBjdXJyZW50IHVzZXIuXG4gICAqXG4gICAqIFRpbWUgZW50cmllcyBmb3IgZnV0dXJlIGRhdGVzIGFyZSBpZ25vcmVkLlxuICAgKlxuICAgKiBAcGFyYW0ge0dldExhc3RFeHBvcnREYXRlQ2FsbGJhY2t9IGNhbGxiYWNrXG4gICAqICAgUmVjZWl2ZXMgYSBEYXRlIG9iamVjdCBvciBudWxsLlxuICAgKi9cbiAgZ2V0TGFzdEltcG9ydERhdGUoY2FsbGJhY2s6IEdldExhc3RFeHBvcnREYXRlQ2FsbGJhY2spOiB2b2lkIHtcbiAgICBjb25zdCBvcHRzOiBKUXVlcnkuQWpheFNldHRpbmdzID0ge31cbiAgICBvcHRzLnVybCA9ICcvdGltZV9lbnRyaWVzLmpzb24nXG4gICAgb3B0cy5kYXRhID0ge1xuICAgICAgdXNlcl9pZDogJ21lJyxcbiAgICAgIGxpbWl0OiAxLFxuICAgICAgLy8gSWdub3JlIGVudHJpZXMgbWFkZSBpbiB0aGUgZnV0dXJlLlxuICAgICAgdG86IChuZXcgZGF0ZXRpbWUuRGF0ZVRpbWUoKSkudG9IVE1MRGF0ZVN0cmluZygpXG4gICAgfVxuXG4gICAgY29uc3QgdGhhdCA9IHRoaXNcbiAgICBvcHRzLnN1Y2Nlc3MgPSAoZGF0YTogR2V0VGltZUVudHJpZXNSZXNwb25zZSkgPT4ge1xuICAgICAgdGhpcy5oYW5kbGVSZXF1ZXN0U3VjY2VzcygnTGFzdCBpbXBvcnQgZGF0ZScsIGRhdGEpXG4gICAgICBpZiAoZGF0YS50aW1lX2VudHJpZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGNhbGxiYWNrKG51bGwpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICBjb25zdCBsYXN0VGltZUVudHJ5ID0gZGF0YS50aW1lX2VudHJpZXMucG9wKCkgYXMgbW9kZWxzLlRpbWVFbnRyeVxuICAgICAgY29uc3QgbGFzdEltcG9ydERhdGUgPSBkYXRldGltZS5EYXRlVGltZS5mcm9tU3RyaW5nKGAke2xhc3RUaW1lRW50cnkuc3BlbnRfb259IDAwOjAwOjAwYClcbiAgICAgIGNhbGxiYWNrKGxhc3RJbXBvcnREYXRlKVxuICAgIH1cbiAgICBvcHRzLmVycm9yID0gKCkgPT4ge1xuICAgICAgdGhhdC5oYW5kbGVSZXF1ZXN0RXJyb3IoJ0xhc3QgaW1wb3J0IGRhdGUnKVxuICAgICAgY2FsbGJhY2sobnVsbClcbiAgICB9XG5cbiAgICB0aGlzLnJlcXVlc3Qob3B0cylcbiAgfVxuXG4gIC8qKlxuICAgKiBGZXRjaGVzIFRvZ2dsIHRpbWUgZW50cmllcy5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IHBhcmFtc1xuICAgKiAgIFF1ZXJ5IHBhcmFtZXRlcnMuXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrXG4gICAqICAgUmVjZWl2ZXMgVG9nZ2wgdGltZSBlbnRyeSBncm91cHMgb3IgbnVsbC5cbiAgICovXG4gIGdldFRvZ2dsVGltZUVudHJpZXMocGFyYW1zOiBHZXRUb2dnbFRpbWVFbnRyaWVzUGFyYW1zLCBjYWxsYmFjazogR2V0VG9nZ2xUaW1lRW50cmllc0NhbGxiYWNrKTogdm9pZCB7XG4gICAgY29uc3QgZGF0YSA9IHtcbiAgICAgIGZyb206IHBhcmFtcy5mcm9tLnRvSVNPU3RyaW5nKCksXG4gICAgICB0aWxsOiBwYXJhbXMudGlsbC50b0lTT1N0cmluZygpLFxuICAgICAgd29ya3NwYWNlX2lkOiBwYXJhbXMud29ya3NwYWNlSWQgfHwgbnVsbFxuICAgIH1cblxuICAgIHRoaXMucmVxdWVzdCh7XG4gICAgICB1cmw6ICcvdG9nZ2wycmVkbWluZS90b2dnbC90aW1lX2VudHJpZXMnLFxuICAgICAgZGF0YTogZGF0YSxcbiAgICAgIHN1Y2Nlc3M6ICh0aW1lX2VudHJpZXM6IG1vZGVscy5LZXllZFRvZ2dsVGltZUVudHJ5Q29sbGVjdGlvbikgPT4ge1xuICAgICAgICB0aGlzLmhhbmRsZVJlcXVlc3RTdWNjZXNzKCdUb2dnbCB0aW1lIGVudHJpZXMnLCB0aW1lX2VudHJpZXMpXG4gICAgICAgIGNhbGxiYWNrKHRpbWVfZW50cmllcylcbiAgICAgIH0sXG4gICAgICBlcnJvcjogKCkgPT4ge1xuICAgICAgICB0aGlzLmhhbmRsZVJlcXVlc3RFcnJvcignVG9nZ2wgdGltZSBlbnRyaWVzJylcbiAgICAgICAgY2FsbGJhY2soe30pXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBGZXRjaGVzIGFuZCBjYWNoZXMgVG9nZ2wgd29ya3NwYWNlcy5cbiAgICpcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2tcbiAgICogICBSZWNlaXZlcyB3b3Jrc3BhY2VzIG9yIG51bGwuXG4gICAqL1xuICBnZXRUb2dnbFdvcmtzcGFjZXMoY2FsbGJhY2s6IEdldFRvZ2dsV29ya3NwYWNlc0NhbGxiYWNrKTogdm9pZCB7XG4gICAgY29uc3Qgd29ya3NwYWNlcyA9IHRoaXMuX2NhY2hlLmdldCgndG9nZ2wud29ya3NwYWNlcycpXG4gICAgaWYgKHdvcmtzcGFjZXMpIHtcbiAgICAgIGNhbGxiYWNrKHdvcmtzcGFjZXMpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjb25zdCB0aGF0ID0gdGhpc1xuICAgIHRoaXMucmVxdWVzdCh7XG4gICAgICB1cmw6ICcvdG9nZ2wycmVkbWluZS90b2dnbC93b3Jrc3BhY2VzJyxcbiAgICAgIHN1Y2Nlc3M6ICh3b3Jrc3BhY2VzOiBtb2RlbHMuVG9nZ2xXb3Jrc3BhY2VbXSkgPT4ge1xuICAgICAgICB0aGF0LmhhbmRsZVJlcXVlc3RTdWNjZXNzKCdUb2dnbCB3b3Jrc3BhY2VzJywgd29ya3NwYWNlcylcbiAgICAgICAgdGhhdC5fY2FjaGUuc2V0KCd0b2dnbC53b3Jrc3BhY2VzJywgd29ya3NwYWNlcylcbiAgICAgICAgY2FsbGJhY2sod29ya3NwYWNlcylcbiAgICAgIH0sXG4gICAgICBlcnJvcjogKCkgPT4ge1xuICAgICAgICB0aGF0LmhhbmRsZVJlcXVlc3RFcnJvcignVG9nZ2wgd29ya3NwYWNlcycpXG4gICAgICAgIGNhbGxiYWNrKG51bGwpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRlbXB0cyB0byBjcmVhdGUgYSBUaW1lIEVudHJ5IG9uIFJlZG1pbmUuXG4gICAqXG4gICAqIEBwYXJhbSB7UG9zdFRpbWVFbnRyeVBhcmFtc30gcGFyYW1zXG4gICAqICAgVGltZSBlbnRyeSBkYXRhLlxuICAgKiBAcGFyYW0ge1Bvc3RUaW1lRW50cnlDYWxsYmFja30gY2FsbGJhY2tcbiAgICogICBSZWNlaXZlcyBhbiBhcnJheSBvZiBlcnJvciBtZXNzYWdlcywgd2hpY2ggaXMgZW1wdHkgb24gc3VjY2Vzcy5cbiAgICovXG4gIHBvc3RUaW1lRW50cnkocGFyYW1zOiBQb3N0VGltZUVudHJ5UGFyYW1zLCBjYWxsYmFjazogUG9zdFRpbWVFbnRyeUNhbGxiYWNrKTogdm9pZCB7XG4gICAgY29uc3QgdGhhdCA9IHRoaXNcbiAgICB0aGlzLnJlcXVlc3Qoe1xuICAgICAgYXN5bmM6IHRydWUsXG4gICAgICB1cmw6ICcvdG9nZ2wycmVkbWluZS9pbXBvcnQnLFxuICAgICAgbWV0aG9kOiAncG9zdCcsXG4gICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeShwYXJhbXMpLFxuICAgICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgIHN1Y2Nlc3M6IChkYXRhOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgICB0aGF0LmhhbmRsZVJlcXVlc3RTdWNjZXNzKCdUaW1lIGVudHJ5IGltcG9ydCcsIGRhdGEpXG4gICAgICAgIGNhbGxiYWNrKFtdKVxuICAgICAgfSxcbiAgICAgIGVycm9yOiBmdW5jdGlvbih4aHI6IEpRdWVyeS5qcVhIUikge1xuICAgICAgICB0aGF0LmhhbmRsZVJlcXVlc3RFcnJvcignVGltZSBlbnRyeSBpbXBvcnQnKVxuICAgICAgICBsZXQgZXJyb3JzOiBzdHJpbmdbXVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3Qgb1Jlc3BvbnNlID0gSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KVxuICAgICAgICAgIGVycm9ycyA9ICh0eXBlb2Ygb1Jlc3BvbnNlLmVycm9ycyA9PT0gJ3VuZGVmaW5lZCcpID8gWydVbmtub3duIGVycm9yJ10gOiBvUmVzcG9uc2UuZXJyb3JzXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBlcnJvcnMgPSBbJ1RoZSBzZXJ2ZXIgcmV0dXJuZWQgYW4gdW5leHBlY3RlZCByZXNwb25zZSddXG4gICAgICAgIH1cblxuICAgICAgICBjYWxsYmFjayhlcnJvcnMpXG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxufVxuIiwgImltcG9ydCAqIGFzIG1vZGVscyBmcm9tIFwiLi9tb2RlbHMuanNcIlxuaW1wb3J0ICogYXMgZGF0ZXRpbWUgZnJvbSBcIi4vZGF0ZXRpbWUuanNcIlxuaW1wb3J0IHtSZWRtaW5lQVBJU2VydmljZX0gZnJvbSBcIi4vc2VydmljZXMuanNcIjtcblxuZGVjbGFyZSBjb25zdCBUMlJfUkVETUlORV9BUElfS0VZOiBzdHJpbmc7XG5cbi8vIFJlZG1pbmUgc2VydmljZS5cbmNvbnN0IHJlZG1pbmVTZXJ2aWNlID0gbmV3IFJlZG1pbmVBUElTZXJ2aWNlKFQyUl9SRURNSU5FX0FQSV9LRVkpXG5cbmludGVyZmFjZSBEcm9wZG93bk9wdGlvbiB7XG4gIGlkOiBudW1iZXIgfCBzdHJpbmcsXG4gIG5hbWU6IHN0cmluZ1xufVxuXG5pbnRlcmZhY2UgRHJvcGRvd25PcHRpb25EaWN0aW9uYXJ5IHtcbiAgW2luZGV4OnN0cmluZ106IHN0cmluZ1xufVxuXG5mdW5jdGlvbiBidWlsZERyb3Bkb3duRnJvbURpY3Rpb25hcnkoZGF0YToge1xuICBvcHRpb25zOiBEcm9wZG93bk9wdGlvbkRpY3Rpb25hcnksXG4gIGF0dHJpYnV0ZXM/OiB7IFtpbmRleDpzdHJpbmddOiBzdHJpbmcgfVxuICBwbGFjZWhvbGRlcj86IHN0cmluZ1xufSk6IEpRdWVyeTxIVE1MRWxlbWVudD4ge1xuICBjb25zdCAkZWwgPSAkKCc8c2VsZWN0IC8+JylcbiAgY29uc3QgcGxhY2Vob2xkZXIgPSBkYXRhLnBsYWNlaG9sZGVyIHx8IG51bGxcbiAgY29uc3QgYXR0cmlidXRlcyA9IGRhdGEuYXR0cmlidXRlcyB8fCBudWxsXG5cbiAgaWYgKHBsYWNlaG9sZGVyKSB7XG4gICAgJGVsLmFwcGVuZChgPG9wdGlvbiB2YWx1ZT1cIlwiPiR7cGxhY2Vob2xkZXJ9PC9vcHRpb24+YClcbiAgfVxuXG4gIGlmIChhdHRyaWJ1dGVzKSB7XG4gICAgJGVsLmF0dHIoYXR0cmlidXRlcylcbiAgfVxuXG4gIGZvciAoY29uc3QgdmFsdWUgaW4gZGF0YS5vcHRpb25zKSB7XG4gICAgY29uc3QgbGFiZWwgPSBkYXRhLm9wdGlvbnNbdmFsdWVdXG4gICAgJGVsLmFwcGVuZChgPG9wdGlvbiB2YWx1ZT1cIiR7dmFsdWV9XCI+JHtsYWJlbH08L29wdGlvbj5gKVxuICB9XG5cbiAgcmV0dXJuICRlbFxufVxuXG5mdW5jdGlvbiBidWlsZERyb3Bkb3duRnJvbVJlY29yZHMoZGF0YToge1xuICByZWNvcmRzOiBEcm9wZG93bk9wdGlvbltdLFxuICBhdHRyaWJ1dGVzPzogeyBbaW5kZXg6c3RyaW5nXTogc3RyaW5nIH0sXG4gIHBsYWNlaG9sZGVyPzogc3RyaW5nXG59KSB7XG4gIGNvbnN0IG9wdGlvbnMgPSB7fSBhcyBEcm9wZG93bk9wdGlvbkRpY3Rpb25hcnlcbiAgZm9yIChjb25zdCByZWNvcmQgb2YgZGF0YS5yZWNvcmRzKSB7XG4gICAgb3B0aW9uc1tyZWNvcmQuaWQudG9TdHJpbmcoKV0gPSByZWNvcmQubmFtZVxuICB9XG5cbiAgcmV0dXJuIGJ1aWxkRHJvcGRvd25Gcm9tRGljdGlvbmFyeSh7XG4gICAgb3B0aW9uczogb3B0aW9ucyxcbiAgICBhdHRyaWJ1dGVzOiBkYXRhLmF0dHJpYnV0ZXMsXG4gICAgcGxhY2Vob2xkZXI6IGRhdGEucGxhY2Vob2xkZXJcbiAgfSlcbn1cblxuaW50ZXJmYWNlIFdpZGdldEluaXRDYWxsYmFjayB7XG4gIChlbDogSFRNTEVsZW1lbnQgfCBIVE1MSW5wdXRFbGVtZW50KTogdm9pZFxufVxuXG4vKipcbiAqIEluaXRpYWxpemVzIGFsbCB3aWRnZXRzIGluIHRoZSBnaXZlbiBlbGVtZW50LlxuICpcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbml0aWFsaXplKGVsID0gZG9jdW1lbnQuYm9keSk6IHZvaWQge1xuICAkKGVsKS5maW5kKCdbZGF0YS10MnItd2lkZ2V0XScpXG4gICAgLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgY29uc3Qgd2lkZ2V0TGlzdCA9IHRoaXMuZ2V0QXR0cmlidXRlKCdkYXRhLXQyci13aWRnZXQnKVxuICAgICAgaWYgKCF3aWRnZXRMaXN0KSByZXR1cm5cblxuICAgICAgZm9yIChjb25zdCB3aWRnZXQgb2Ygd2lkZ2V0TGlzdC5zcGxpdCgnICcpKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgb25lIHdpZGdldCBvbmx5IG9uY2UgcGVyIGVsZW1lbnQuXG4gICAgICAgIGNvbnN0IGZsYWcgPSBgV2lkZ2V0JHt3aWRnZXR9UmVhZHlgXG4gICAgICAgIGlmICh0aGlzLmRhdGFzZXRbZmxhZ10gPT0gJ3RydWUnKSB7XG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG5cbiAgICAgICAgbGV0IGluaXRpYWxpemVyOiBXaWRnZXRJbml0Q2FsbGJhY2tcbiAgICAgICAgc3dpdGNoICh3aWRnZXQpIHtcbiAgICAgICAgICBjYXNlICdUb29sdGlwJzpcbiAgICAgICAgICAgIGluaXRpYWxpemVyID0gaW5pdFRvb2x0aXBcbiAgICAgICAgICAgIGJyZWFrXG5cbiAgICAgICAgICBjYXNlICdUb2dnbFJvdyc6XG4gICAgICAgICAgICBpbml0aWFsaXplciA9IGluaXRUb2dnbFJvd1xuICAgICAgICAgICAgYnJlYWtcblxuICAgICAgICAgIGNhc2UgJ0R1cmF0aW9uSW5wdXQnOlxuICAgICAgICAgICAgaW5pdGlhbGl6ZXIgPSBpbml0RHVyYXRpb25JbnB1dFxuICAgICAgICAgICAgYnJlYWtcblxuICAgICAgICAgIGNhc2UgJ0R1cmF0aW9uUm91bmRpbmdNZXRob2REcm9wZG93bic6XG4gICAgICAgICAgICBpbml0aWFsaXplciA9IGluaXREdXJhdGlvblJvdW5kaW5nTWV0aG9kRHJvcGRvd25cbiAgICAgICAgICAgIGJyZWFrXG5cbiAgICAgICAgICBjYXNlICdSZWRtaW5lQWN0aXZpdHlEcm9wZG93bic6XG4gICAgICAgICAgICBpbml0aWFsaXplciA9IGluaXRSZWRtaW5lQWN0aXZpdHlEcm9wZG93blxuICAgICAgICAgICAgYnJlYWtcblxuICAgICAgICAgIGNhc2UgJ1RvZ2dsV29ya3NwYWNlRHJvcGRvd24nOlxuICAgICAgICAgICAgaW5pdGlhbGl6ZXIgPSBpbml0VG9nZ2xXb3Jrc3BhY2VEcm9wZG93blxuICAgICAgICAgICAgYnJlYWtcblxuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBgVW5yZWNvZ25pemVkIHdpZGdldDogJHt3aWRnZXR9YFxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5kYXRhc2V0W2ZsYWddID0gJ3RydWUnXG4gICAgICAgIHRoaXMuY2xhc3NMaXN0LmFkZChgdDJyLXdpZGdldC0ke3dpZGdldH1gKVxuICAgICAgICBpbml0aWFsaXplcih0aGlzKVxuICAgICAgfVxuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBpbml0VG9vbHRpcChlbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgJChlbCkudG9vbHRpcCgpO1xufVxuXG5mdW5jdGlvbiBpbml0VG9nZ2xSb3coZWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gIGNvbnN0ICRlbCA9ICQoZWwpO1xuXG4gIC8vIElmIGNoZWNrYm94IGNoYW5nZXMsIHVwZGF0ZSB0b3RhbHMuXG4gICRlbC5maW5kKCcuY2ItaW1wb3J0JylcbiAgICAub24oJ2NoYW5nZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQodGhpcyk7XG4gICAgICBjb25zdCAkdHIgPSAkY2hlY2tib3guY2xvc2VzdCgndHInKTtcblxuICAgICAgLy8gSWYgdGhlIHJvdyBpcyBtYXJrZWQgZm9yIGltcG9ydCwgbWFrZSBmaWVsZHMgcmVxdWlyZWQuXG4gICAgICBpZiAoJGNoZWNrYm94LmlzKCc6Y2hlY2tlZCcpKSB7XG4gICAgICAgICR0ci5maW5kKCc6aW5wdXQnKVxuICAgICAgICAgIC5ub3QoJy5jYi1pbXBvcnQnKVxuICAgICAgICAgIC5yZW1vdmVBdHRyKCdkaXNhYmxlZCcpXG4gICAgICAgICAgLmF0dHIoJ3JlcXVpcmVkJywgJ3JlcXVpcmVkJyk7XG4gICAgICB9XG4gICAgICAvLyBPdGhlcndpc2UsIHRoZSBmaWVsZHMgYXJlIGRpc2FibGVkLlxuICAgICAgZWxzZSB7XG4gICAgICAgICR0ci5maW5kKCc6aW5wdXQnKVxuICAgICAgICAgIC5ub3QoJy5jYi1pbXBvcnQnKVxuICAgICAgICAgIC5yZW1vdmVBdHRyKCdyZXF1aXJlZCcpXG4gICAgICAgICAgLmF0dHIoJ2Rpc2FibGVkJywgJ2Rpc2FibGVkJylcbiAgICAgIH1cbiAgICB9KVxuICAgIC50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICRlbC5maW5kKCc6aW5wdXQnKS50b29sdGlwKClcbn1cblxuZnVuY3Rpb24gaW5pdER1cmF0aW9uSW5wdXQoZWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gIGNvbnN0IGlucHV0ID0gZWwgYXMgSFRNTElucHV0RWxlbWVudFxuICBjb25zdCAkZWwgPSAkKGVsKTtcblxuICAkZWxcbiAgICAub24oJ2lucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgICBjb25zdCB2YWwgPSAkZWwudmFsKCkgYXMgc3RyaW5nXG4gICAgICB0cnkge1xuICAgICAgICAvLyBJZiBhIGR1cmF0aW9uIG9iamVjdCBjb3VsZCBiZSBjcmVhdGVkLCB0aGVuIHRoZSB0aW1lIGlzIHZhbGlkLlxuICAgICAgICBuZXcgZGF0ZXRpbWUuRHVyYXRpb24odmFsKVxuICAgICAgICBpbnB1dC5zZXRDdXN0b21WYWxpZGl0eSgnJylcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgaWYgKGUgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICAgIGlucHV0LnNldEN1c3RvbVZhbGlkaXR5KGUudG9TdHJpbmcoKSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBlXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICAgIC8vIFVwZGF0ZSB0b3RhbHMgYXMgdGhlIHVzZXIgdXBkYXRlcyBob3Vycy5cbiAgICAub24oJ2tleXVwJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgIGNvbnN0ICRpbnB1dCA9ICQodGhpcylcbiAgICAgIGNvbnN0IGR1ciA9IG5ldyBkYXRldGltZS5EdXJhdGlvbigpXG5cbiAgICAgIC8vIERldGVjdCBjdXJyZW50IGR1cmF0aW9uLlxuICAgICAgdHJ5IHtcbiAgICAgICAgZHVyLnNldEhITU0oKCRpbnB1dC52YWwoKSBhcyBzdHJpbmcpKTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIFJvdW5kIHRvIHRoZSBuZWFyZXN0IDUgbWludXRlcyBvciAxNSBtaW51dGVzLlxuICAgICAgY29uc3QgbW0gPSBkdXIubWludXRlcyAlIDYwXG4gICAgICBjb25zdCBzdGVwID0gZS5zaGlmdEtleSA/IDE1IDogNVxuICAgICAgbGV0IGRlbHRhID0gMFxuXG4gICAgICAvLyBPbiBcIlVwXCIgcHJlc3MuXG4gICAgICBpZiAoZS5rZXkgPT09ICdBcnJvd1VwJykge1xuICAgICAgICBkZWx0YSA9IHN0ZXAgLSAobW0gJSBzdGVwKTtcbiAgICAgICAgZHVyLmFkZChuZXcgZGF0ZXRpbWUuRHVyYXRpb24oZGVsdGEgKiA2MCkpO1xuICAgICAgfVxuICAgICAgLy8gT24gXCJEb3duXCIgcHJlc3MuXG4gICAgICBlbHNlIGlmIChlLmtleSA9PT0gJ0Fycm93RG93bicpIHtcbiAgICAgICAgZGVsdGEgPSAobW0gJSBzdGVwKSB8fCBzdGVwO1xuICAgICAgICBkdXIuc3ViKG5ldyBkYXRldGltZS5EdXJhdGlvbihkZWx0YSAqIDYwKSk7XG4gICAgICB9XG4gICAgICAvLyBEbyBub3RoaW5nLlxuICAgICAgZWxzZSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICAvLyBVcGRhdGUgdmFsdWUgaW4gdGhlIGlucHV0IGZpZWxkLlxuICAgICAgJCh0aGlzKS52YWwoZHVyLmFzSEhNTSgpKS50cmlnZ2VyKCdpbnB1dCcpLnRyaWdnZXIoJ3NlbGVjdCcpO1xuICAgIH0pXG4gICAgLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBjb25zdCAkaW5wdXQgPSAkKHRoaXMpXG4gICAgICBjb25zdCB2YWx1ZSA9ICRpbnB1dC52YWwoKVxuICAgICAgY29uc3QgZHVyID0gbmV3IGRhdGV0aW1lLkR1cmF0aW9uKClcblxuICAgICAgLy8gRGV0ZXJtaW5lIHRoZSB2aXNpYmxlIHZhbHVlLlxuICAgICAgdHJ5IHtcbiAgICAgICAgZHVyLnNldEhITU0odmFsdWUgYXMgc3RyaW5nKVxuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIGNvbnNvbGUuZGVidWcoYENvdWxkIG5vdCB1bmRlcnN0YW5kIHRpbWU6ICR7dmFsdWV9YClcbiAgICAgIH1cblxuICAgICAgLy8gVXBkYXRlIHRoZSB2aXNpYmxlIHZhbHVlIGFuZCB0aGUgdG90YWxzLlxuICAgICAgJGlucHV0LnZhbChkdXIuYXNISE1NKCkpXG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGluaXREdXJhdGlvblJvdW5kaW5nTWV0aG9kRHJvcGRvd24oZWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gIGNvbnN0ICRlbCA9ICQoZWwpO1xuXG4gIC8vIFByZXBhcmUgcm91bmRpbmcgb3B0aW9ucy5cbiAgY29uc3Qgb3B0aW9uczogRHJvcGRvd25PcHRpb25EaWN0aW9uYXJ5ID0ge31cbiAgb3B0aW9uc1tkYXRldGltZS5EdXJhdGlvblJvdW5kaW5nTWV0aG9kLlJlZ3VsYXJdID0gJ1JvdW5kIG9mZidcbiAgb3B0aW9uc1tkYXRldGltZS5EdXJhdGlvblJvdW5kaW5nTWV0aG9kLlVwXSA9ICdSb3VuZCB1cCdcbiAgb3B0aW9uc1tkYXRldGltZS5EdXJhdGlvblJvdW5kaW5nTWV0aG9kLkRvd25dID0gJ1JvdW5kIGRvd24nXG5cbiAgLy8gR2VuZXJhdGUgYSBTRUxFQ1QgZWxlbWVudCBhbmQgdXNlIGl0J3Mgb3B0aW9ucy5cbiAgY29uc3QgJHNlbGVjdCA9IGJ1aWxkRHJvcGRvd25Gcm9tRGljdGlvbmFyeSh7XG4gICAgcGxhY2Vob2xkZXI6ICdEb25cXCd0IHJvdW5kJyxcbiAgICBvcHRpb25zOiBvcHRpb25zXG4gIH0pO1xuXG4gICRlbC5hcHBlbmQoJHNlbGVjdC5maW5kKCdvcHRpb24nKSk7XG59XG5cbmZ1bmN0aW9uIGluaXRSZWRtaW5lQWN0aXZpdHlEcm9wZG93bihlbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgY29uc3QgJGVsID0gJChlbClcbiAgcmVkbWluZVNlcnZpY2UuZ2V0VGltZUVudHJ5QWN0aXZpdGllcygoYWN0aXZpdGllczogRHJvcGRvd25PcHRpb25bXSB8IG51bGwpID0+IHtcbiAgICBpZiAoYWN0aXZpdGllcyA9PT0gbnVsbCkgcmV0dXJuXG5cbiAgICAvLyBHZW5lcmF0ZSBhIFNFTEVDVCBlbGVtZW50IGFuZCB1c2UgaXRzIG9wdGlvbnMuXG4gICAgY29uc3QgJHNlbGVjdCA9IGJ1aWxkRHJvcGRvd25Gcm9tUmVjb3Jkcyh7XG4gICAgICBwbGFjZWhvbGRlcjogJGVsLmRhdGEoJ3BsYWNlaG9sZGVyJyksXG4gICAgICByZWNvcmRzOiBhY3Rpdml0aWVzXG4gICAgfSk7XG5cbiAgICAkZWwuYXBwZW5kKCRzZWxlY3QuZmluZCgnb3B0aW9uJykpLnZhbCgnJyk7XG5cbiAgICBjb25zdCB2YWx1ZSA9ICRlbC5kYXRhKCdzZWxlY3RlZCcpIHx8ICcnO1xuICAgICRlbC52YWwodmFsdWUpLnJlbW92ZURhdGEoJ3NlbGVjdGVkJyk7XG4gIH0pXG59XG5cbmZ1bmN0aW9uIGluaXRUb2dnbFdvcmtzcGFjZURyb3Bkb3duKGVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICBjb25zdCAkZWwgPSAkKGVsKTtcbiAgcmVkbWluZVNlcnZpY2UuZ2V0VG9nZ2xXb3Jrc3BhY2VzKCh3b3Jrc3BhY2VzOiBtb2RlbHMuVG9nZ2xXb3Jrc3BhY2VbXSB8IG51bGwpID0+IHtcbiAgICBpZiAod29ya3NwYWNlcyA9PT0gbnVsbCkgcmV0dXJuXG5cbiAgICAvLyBHZW5lcmF0ZSBhIFNFTEVDVCBlbGVtZW50IGFuZCB1c2UgaXRzIG9wdGlvbnMuXG4gICAgY29uc3QgJHNlbGVjdCA9IGJ1aWxkRHJvcGRvd25Gcm9tUmVjb3Jkcyh7XG4gICAgICBwbGFjZWhvbGRlcjogJGVsLmRhdGEoJ3BsYWNlaG9sZGVyJykgYXMgc3RyaW5nLFxuICAgICAgcmVjb3Jkczogd29ya3NwYWNlcyBhcyBEcm9wZG93bk9wdGlvbltdXG4gICAgfSlcblxuICAgICRlbC5hcHBlbmQoJHNlbGVjdC5maW5kKCdvcHRpb24nKSlcblxuICAgIGNvbnN0IHZhbHVlID0gJGVsLmRhdGEoJ3NlbGVjdGVkJylcbiAgICBpZiAoJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiB2YWx1ZSkge1xuICAgICAgJGVsLnZhbCh2YWx1ZSkuZGF0YSgnc2VsZWN0ZWQnLCBudWxsKVxuICAgIH1cbiAgfSk7XG59XG4iLCAiaW1wb3J0ICogYXMgZGF0ZXRpbWUgZnJvbSBcIi4vZGF0ZXRpbWUuanNcIlxuXG4vKipcbiAqIFJlcGxhY2VzIGNlcnRhaW4gY2hhcmFjdGVycyB3aXRoIEhUTUwgZW50aXRpZXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBodG1sRW50aXR5RW5jb2RlKHN0cjogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuICQoJzxkaXYgLz4nKVxuICAgIC50ZXh0KHN0cilcbiAgICAudGV4dCgpXG4gICAgLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKVxuICAgIC5yZXBsYWNlKC8nL2csICcmYXBvczsnKVxuICAgIC5yZXBsYWNlKC88L2csICcmbHQ7JylcbiAgICAucmVwbGFjZSgvPi9nLCAnJmd0OycpO1xufVxuXG4vKipcbiAqIEdldHMgZGF0ZSBmcm9tIHdpbmRvdy5sb2NhdGlvbi5oYXNoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGF0ZUZyb21Mb2NhdGlvbkhhc2goKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgbWF0Y2hlcyA9IHdpbmRvdy5sb2NhdGlvbi5oYXNoLm1hdGNoKC9eIz8oW1xcZF17NH0tW1xcZF17Mn0tW1xcZF17Mn0pJC8pO1xuICBpZiAoIW1hdGNoZXMpIHJldHVyblxuXG4gIGNvbnN0IG1hdGNoOiBzdHJpbmcgPSBtYXRjaGVzLnBvcCgpIGFzIHN0cmluZ1xuICB0cnkge1xuICAgIHJldHVybiBkYXRldGltZS5EYXRlVGltZS5mcm9tU3RyaW5nKG1hdGNoKS50b0hUTUxEYXRlU3RyaW5nKClcbiAgfSBjYXRjaChlKSB7XG4gICAgY29uc29sZS5kZWJ1ZygnRGF0ZSBub3QgZGV0ZWN0ZWQgaW4gVVJMIGZyYWdtZW50JylcbiAgfVxufVxuXG4vKipcbiAqIEV2ZW50IENhbGxiYWNrLlxuICpcbiAqIENhbGxiYWNrcyBmb3IgY3VzdG9tIGV2ZW50cy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFdmVudExpc3RlbmVyIHsgKCk6IHZvaWQgfVxuXG4vKipcbiAqIEV2ZW50IE1hbmFnZXIuXG4gKlxuICogSGFuZGxlcyByZWdpc3RyeSBhbmQgZGlzcGF0Y2ggb2YgZXZlbnRzLlxuICovXG5leHBvcnQgY2xhc3MgRXZlbnRNYW5hZ2VyIHtcbiAgcmVhZG9ubHkgbGlzdGVuZXJzOiB7IFtpbmRleDogc3RyaW5nXTogRXZlbnRMaXN0ZW5lcltdIH1cblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLmxpc3RlbmVycyA9IHt9XG4gIH1cblxuICBwdWJsaWMgb24oZXZlbnROYW1lOiBzdHJpbmcsIGNhbGxiYWNrOiBFdmVudExpc3RlbmVyKTogdm9pZCB7XG4gICAgaWYgKHR5cGVvZiB0aGlzLmxpc3RlbmVyc1tldmVudE5hbWVdID09PSAndW5kZWZpbmVkJykge1xuICAgICAgdGhpcy5saXN0ZW5lcnNbZXZlbnROYW1lXSA9IFtdXG4gICAgfVxuXG4gICAgdGhpcy5saXN0ZW5lcnNbZXZlbnROYW1lXS5wdXNoKGNhbGxiYWNrKVxuICB9XG5cbiAgcHVibGljIHRyaWdnZXIoZXZlbnROYW1lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAodHlwZW9mIHRoaXMubGlzdGVuZXJzW2V2ZW50TmFtZV0gPT09ICd1bmRlZmluZWQnKSByZXR1cm5cblxuICAgIGZvciAoY29uc3QgbGlzdGVuZXIgb2YgdGhpcy5saXN0ZW5lcnNbZXZlbnROYW1lXSkge1xuICAgICAgbGlzdGVuZXIoKVxuICAgIH1cbiAgfVxufVxuIiwgImltcG9ydCAqIGFzIG1vZGVscyBmcm9tICcuL21vZGVscy5qcydcbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gJy4vdXRpbHMuanMnXG5pbXBvcnQgKiBhcyBkYXRldGltZSBmcm9tICcuL2RhdGV0aW1lLmpzJ1xuXG5kZWNsYXJlIGNvbnN0IFQyUl9CVVRUT05fQUNUSU9OUzogc3RyaW5nXG5kZWNsYXJlIGNvbnN0IGNvbnRleHRNZW51UmlnaHRDbGljazogeyAoKTogdm9pZCB9XG5cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJSZWRtaW5lUHJvamVjdExhYmVsKHByb2plY3Q6IG1vZGVscy5Qcm9qZWN0KTogc3RyaW5nIHtcbiAgY29uc3QgY2xhc3NlcyA9IFsncHJvamVjdCddO1xuICBpZiAocHJvamVjdC5zdGF0dXMgIT0gMSkge1xuICAgIGNsYXNzZXMucHVzaCgnY2xvc2VkJylcbiAgfVxuXG4gIHJldHVybiAnPGEgaHJlZj1cIicgKyBwcm9qZWN0LnBhdGggKyAnXCIgY2xhc3M9XCInICsgY2xhc3Nlcy5qb2luKCcgJykgKyAnXCIgdGFyZ2V0PVwiX2JsYW5rXCI+PHN0cm9uZz4nXG4gICAgKyB1dGlscy5odG1sRW50aXR5RW5jb2RlKHByb2plY3QubmFtZSlcbiAgICArICc8L3N0cm9uZz48L2E+Jztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlclJlZG1pbmVQcm9qZWN0U3R1YkxhYmVsKCk6IHN0cmluZyB7XG4gIHJldHVybiAnPHNwYW4gY2xhc3M9XCJwcm9qZWN0XCI+PHN0cm9uZz4tPC9zdHJvbmc+PC9zcGFuPidcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlclJlZG1pbmVJc3N1ZUxhYmVsKGlzc3VlOiBtb2RlbHMuSXNzdWUpOiBzdHJpbmcge1xuICBjb25zdCBjbGFzc2VzID0gWydpc3N1ZSddXG4gIGlmIChpc3N1ZS5pc19jbG9zZWQpIHtcbiAgICBjbGFzc2VzLnB1c2goJ2Nsb3NlZCcpXG4gIH1cblxuICByZXR1cm4gJzxhIGhyZWY9XCInICsgaXNzdWUucGF0aCArICdcIiBjbGFzcz1cIicgKyBjbGFzc2VzLmpvaW4oJyAnKSArICdcIiB0YXJnZXQ9XCJfYmxhbmtcIj4nXG4gICAgKyB1dGlscy5odG1sRW50aXR5RW5jb2RlKGlzc3VlID8gaXNzdWUudHJhY2tlci5uYW1lIDogJy0nKVxuICAgICsgdXRpbHMuaHRtbEVudGl0eUVuY29kZShpc3N1ZSA/ICcgIycgKyBpc3N1ZS5pZCA6ICcnKVxuICAgICsgdXRpbHMuaHRtbEVudGl0eUVuY29kZShpc3N1ZS5zdWJqZWN0ID8gJzogJyArIGlzc3VlLnN1YmplY3QgOiAnJylcbiAgICArICc8L2E+J1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyUmVkbWluZUlzc3VlU3R1YkxhYmVsKGlzc3VlSWQ6IG51bWJlciB8IG51bGwpOiBzdHJpbmcge1xuICBpZiAoIWlzc3VlSWQpIHtcbiAgICByZXR1cm4gJ1Vua25vd24nXG4gIH1cblxuICByZXR1cm4gJyMnICsgaXNzdWVJZC50b1N0cmluZygpICsgJzogLSdcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlclRvZ2dsUm93KGRhdGE6IG1vZGVscy5Ub2dnbFRpbWVFbnRyeSk6IEpRdWVyeTxIVE1MRWxlbWVudD4ge1xuICBjb25zdCBpc3N1ZSA9IGRhdGEuaXNzdWVcbiAgY29uc3QgaXNzdWVMYWJlbDogc3RyaW5nID0gaXNzdWUgPyByZW5kZXJSZWRtaW5lSXNzdWVMYWJlbChpc3N1ZSkgOiByZW5kZXJSZWRtaW5lSXNzdWVTdHViTGFiZWwoZGF0YS5pc3N1ZV9pZClcbiAgY29uc3QgcHJvamVjdCA9IGRhdGEucHJvamVjdCB8fCBudWxsXG4gIGNvbnN0IHByb2plY3RMYWJlbCA9IHByb2plY3QgPyByZW5kZXJSZWRtaW5lUHJvamVjdExhYmVsKHByb2plY3QpIDogcmVuZGVyUmVkbWluZVByb2plY3RTdHViTGFiZWwoKVxuICBjb25zdCBvRHVyYXRpb24gPSBkYXRhLmR1cmF0aW9uIGFzIGRhdGV0aW1lLkR1cmF0aW9uXG4gIGNvbnN0IHJEdXJhdGlvbiA9IGRhdGEucm91bmRlZER1cmF0aW9uIGFzIGRhdGV0aW1lLkR1cmF0aW9uXG5cbiAgY29uc3QgbWFya3VwID0gJzx0ciBkYXRhLXQyci13aWRnZXQ9XCJUb2dnbFJvd1wiPidcbiAgICArICc8dGQgY2xhc3M9XCJjaGVja2JveFwiPjxpbnB1dCBjbGFzcz1cImNiLWltcG9ydFwiIHR5cGU9XCJjaGVja2JveFwiIHZhbHVlPVwiMVwiIHRpdGxlPVwiQ2hlY2sgdGhpcyBib3ggaWYgeW91IHdhbnQgdG8gaW1wb3J0IHRoaXMgZW50cnkuXCIgLz48L3RkPidcbiAgICArICc8dGQgY2xhc3M9XCJzdGF0dXNcIj48L3RkPidcbiAgICArICc8dGQgY2xhc3M9XCJpc3N1ZVwiPidcbiAgICArICc8aW5wdXQgZGF0YS1wcm9wZXJ0eT1cImlzc3VlX2lkXCIgdHlwZT1cImhpZGRlblwiICdcbiAgICArICdkYXRhLXZhbHVlPVwiJyArIHV0aWxzLmh0bWxFbnRpdHlFbmNvZGUoaXNzdWUgPyBpc3N1ZS5pZC50b1N0cmluZygpIDogJycpICsgJ1wiICdcbiAgICArICd2YWx1ZT1cIicgKyB1dGlscy5odG1sRW50aXR5RW5jb2RlKGlzc3VlID8gaXNzdWUuaWQudG9TdHJpbmcoKSA6ICcnKSArICdcIiAvPidcbiAgICArIHByb2plY3RMYWJlbCArICc8YnIgLz4nICsgaXNzdWVMYWJlbFxuICAgICsgJzwvdGQ+J1xuICAgICsgJzx0ZCBjbGFzcz1cImNvbW1lbnRzXCI+J1xuICAgICsgJzxpbnB1dCBkYXRhLXByb3BlcnR5PVwiY29tbWVudHNcIiB0eXBlPVwidGV4dFwiIHZhbHVlPVwiJyArIHV0aWxzLmh0bWxFbnRpdHlFbmNvZGUoZGF0YS5jb21tZW50cykgKyAnXCIgbWF4bGVuZ3RoPVwiMjU1XCIgLz4nXG4gICAgKyAnPC90ZD4nXG4gICAgKyAnPHRkIGNsYXNzPVwiYWN0aXZpdHlcIj4nXG4gICAgKyAnPHNlbGVjdCBkYXRhLXByb3BlcnR5PVwiYWN0aXZpdHlfaWRcIiByZXF1aXJlZD1cInJlcXVpcmVkXCIgZGF0YS1wbGFjZWhvbGRlcj1cIi1cIiBkYXRhLXQyci13aWRnZXQ9XCJSZWRtaW5lQWN0aXZpdHlEcm9wZG93blwiPjwvc2VsZWN0PidcbiAgICArICc8L3RkPidcbiAgICArICc8dGQgY2xhc3M9XCJob3Vyc1wiPidcbiAgICArICc8aW5wdXQgZGF0YS1wcm9wZXJ0eT1cImhvdXJzXCIgcmVxdWlyZWQ9XCJyZXF1aXJlZFwiIGRhdGEtdDJyLXdpZGdldD1cIkR1cmF0aW9uSW5wdXRcIiB0eXBlPVwidGV4dFwiIHRpdGxlPVwiVmFsdWUgYXMgb24gVG9nZ2wgaXMgJyArIG9EdXJhdGlvbi5hc0hITU0oKSArICcuXCIgdmFsdWU9XCInICsgckR1cmF0aW9uLmFzSEhNTSgpICsgJ1wiIHNpemU9XCI2XCIgbWF4bGVuZ3RoPVwiNVwiIC8+J1xuICAgICsgJzwvdGQ+J1xuICAgICsgJzwvdHI+JztcblxuICAvLyBBdHRhY2ggdGhlIGVudHJ5IGZvciByZWZlcmVuY2UuXG4gIGNvbnN0ICR0ciA9ICQobWFya3VwKTtcbiAgJHRyLmRhdGEoJ3Qyci5lbnRyeScsIGRhdGEpO1xuXG4gIGxldCBzdGF0dXNMYWJlbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbFxuXG4gIHN3aXRjaCAoZGF0YS5zdGF0dXMpIHtcbiAgICBjYXNlICdwZW5kaW5nJzpcbiAgICAgIGlmIChkYXRhLmVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICR0ci5hZGRDbGFzcygndDJyLWVycm9yJyk7XG4gICAgICAgICR0ci5maW5kKCc6aW5wdXQnKS5hdHRyKCdkaXNhYmxlZCcsICdkaXNhYmxlZCcpO1xuICAgICAgICBzdGF0dXNMYWJlbCA9IHJlbmRlckltcG9ydFN0YXR1c0xhYmVsKCdJbnZhbGlkJywgZGF0YS5lcnJvcnMuam9pbihcIlxcblwiKSwgJ2Vycm9yJylcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnaW1wb3J0ZWQnOlxuICAgICAgJHRyLmZpbmQoJy5jYi1pbXBvcnQnKS5yZW1vdmVBdHRyKCdjaGVja2VkJyk7XG4gICAgICAkdHIuYWRkQ2xhc3MoJ3Qyci1zdWNjZXNzJyk7XG4gICAgICAkdHIuZmluZCgnOmlucHV0JykuYXR0cignZGlzYWJsZWQnLCAnZGlzYWJsZWQnKTtcbiAgICAgIHN0YXR1c0xhYmVsID0gcmVuZGVySW1wb3J0U3RhdHVzTGFiZWwoJ0ltcG9ydGVkJylcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAncnVubmluZyc6XG4gICAgICAkdHIuYWRkQ2xhc3MoJ3Qyci1ydW5uaW5nJyk7XG4gICAgICAkdHIuZmluZCgnOmlucHV0JykuYXR0cignZGlzYWJsZWQnLCAnZGlzYWJsZWQnKTtcbiAgICAgIHN0YXR1c0xhYmVsID0gcmVuZGVySW1wb3J0U3RhdHVzTGFiZWwoXG4gICAgICAgICdSdW5uaW5nJyxcbiAgICAgICAgJ1RoZSB0aW1lciBpcyBzdGlsbCBydW5uaW5nIG9uIFRvZ2dsLicsXG4gICAgICAgICdlcnJvcidcbiAgICAgIClcbiAgICAgIGJyZWFrO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IGBVbnJlY29nbml6ZWQgc3RhdHVzOiAke2RhdGEuc3RhdHVzfS5gXG4gIH1cblxuICBpZiAoc3RhdHVzTGFiZWwpIHtcbiAgICAkdHIuZmluZCgndGQuc3RhdHVzJykuaHRtbChzdGF0dXNMYWJlbClcbiAgfVxuXG4gIHJldHVybiAkdHI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJSZWRtaW5lUm93KGRhdGE6IG1vZGVscy5UaW1lRW50cnkpOiBKUXVlcnk8SFRNTEVsZW1lbnQ+IHtcbiAgY29uc3QgaXNzdWUgPSBkYXRhLmlzc3VlXG4gIGNvbnN0IGlzc3VlTGFiZWwgPSByZW5kZXJSZWRtaW5lSXNzdWVMYWJlbChpc3N1ZSlcbiAgY29uc3QgcHJvamVjdCA9IGRhdGEucHJvamVjdFxuICBjb25zdCBwcm9qZWN0TGFiZWwgPSByZW5kZXJSZWRtaW5lUHJvamVjdExhYmVsKHByb2plY3QpXG4gIGNvbnN0IG9EdXJhdGlvbiA9IGRhdGEuZHVyYXRpb25cbiAgb0R1cmF0aW9uLnJvdW5kVG8oMSwgZGF0ZXRpbWUuRHVyYXRpb25Sb3VuZGluZ01ldGhvZC5VcClcblxuICBjb25zdCBtYXJrdXAgPSAnPHRyIGlkPVwidGltZS1lbnRyeS0nICsgZGF0YS5pZCArICdcIiAgY2xhc3M9XCJ0aW1lLWVudHJ5IGhhc2NvbnRleHRtZW51XCI+J1xuICAgICsgJzx0ZCBjbGFzcz1cInN1YmplY3RcIj4nXG4gICAgKyBwcm9qZWN0TGFiZWwgKyAnPGJyIC8+JyArIGlzc3VlTGFiZWxcbiAgICArICc8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgbmFtZT1cImlkc1tdXCIgdmFsdWU9XCInICsgZGF0YS5pZCArICdcIiBoaWRkZW4gLz4nXG4gICAgKyAnPC90ZD4nXG4gICAgKyAnPHRkIGNsYXNzPVwiY29tbWVudHNcIj4nICsgdXRpbHMuaHRtbEVudGl0eUVuY29kZShkYXRhLmNvbW1lbnRzKSArICc8L3RkPidcbiAgICArICc8dGQgY2xhc3M9XCJhY3Rpdml0eVwiPicgKyB1dGlscy5odG1sRW50aXR5RW5jb2RlKGRhdGEuYWN0aXZpdHkubmFtZSkgKyAnPC90ZD4nXG4gICAgKyAnPHRkIGNsYXNzPVwiaG91cnNcIj4nICsgb0R1cmF0aW9uLmFzSEhNTSgpICsgJzwvdGQ+J1xuICAgICsgJzx0ZCBjbGFzcz1cImJ1dHRvbnNcIj4nICsgVDJSX0JVVFRPTl9BQ1RJT05TICsgJzwvdGQ+J1xuICAgICsgJzwvdHI+JztcblxuICBjb25zdCAkdHIgPSAkKG1hcmt1cClcbiAgJHRyLmZpbmQoJy5qcy1jb250ZXh0bWVudScpLm9uKCdjbGljaycsIGNvbnRleHRNZW51UmlnaHRDbGljaylcblxuICByZXR1cm4gJHRyXG59XG5cbi8qKlxuICogUmV0dXJucyBhbiBpbXBvcnQgc3RhdHVzIGxhYmVsIGVsZW1lbnQuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGxhYmVsXG4gKiAgIEEgbGFiZWwuXG4gKiBAcGFyYW0ge3N0cmluZ30gZGVzY3JpcHRpb25cbiAqICAgQSBkZXNjcmlwdGlvbiAoZGlzcGxheWVkIGFzIHRvb2x0aXApLlxuICogQHBhcmFtIHtzdHJpbmd9IGljb25cbiAqICAgQW4gaWNvbi4gT25lIG9mIGNoZWNrZWQsIGVycm9yLCB3YXJuLlxuICpcbiAqIEByZXR1cm4ge0hUTUxFbGVtZW50fVxuICogICBBIHNwYW4gZWxlbWVudC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlckltcG9ydFN0YXR1c0xhYmVsKFxuICBsYWJlbDogc3RyaW5nLFxuICBkZXNjcmlwdGlvbjogc3RyaW5nIHwgbnVsbCA9IG51bGwsXG4gIGljb24gPSAnY2hlY2tlZCdcbik6IEhUTUxFbGVtZW50IHtcbiAgY29uc3QgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJylcblxuICBlbC5pbm5lckhUTUwgPSBsYWJlbFxuICBlbC5kYXRhc2V0LnQycldpZGdldCA9ICdUb29sdGlwJ1xuICBlbC5jbGFzc0xpc3QuYWRkKCdpY29uJywgYGljb24tJHtpY29ufWApXG4gIGlmIChkZXNjcmlwdGlvbikge1xuICAgIGVsLnNldEF0dHJpYnV0ZSgndGl0bGUnLCBkZXNjcmlwdGlvbilcbiAgfVxuXG4gIHJldHVybiBlbFxufVxuIiwgImRlY2xhcmUgY29uc3QgVDJSX1JFRE1JTkVfQVBJX0tFWTogc3RyaW5nXG5cbmltcG9ydCB7TG9jYWxTdG9yYWdlfSBmcm9tIFwiLi90MnIvc3RvcmFnZS5qc1wiXG5pbXBvcnQge3RyYW5zbGF0ZSBhcyB0fSBmcm9tIFwiLi90MnIvaTE4bi5qc1wiXG5pbXBvcnQge1JlZG1pbmVBUElTZXJ2aWNlfSBmcm9tIFwiLi90MnIvc2VydmljZXMuanNcIlxuaW1wb3J0ICogYXMgd2lkZ2V0IGZyb20gXCIuL3Qyci93aWRnZXRzLmpzXCJcbmltcG9ydCAqIGFzIG1vZGVscyBmcm9tIFwiLi90MnIvbW9kZWxzLmpzXCJcbmltcG9ydCAqIGFzIHJlbmRlcmVycyBmcm9tIFwiLi90MnIvcmVuZGVyZXJzLmpzXCJcbmltcG9ydCAqIGFzIGRhdGV0aW1lIGZyb20gXCIuL3Qyci9kYXRldGltZS5qc1wiXG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tIFwiLi90MnIvdXRpbHMuanNcIlxuaW1wb3J0ICogYXMgZmxhc2ggZnJvbSBcIi4vdDJyL2ZsYXNoLmpzXCJcblxuLyoqXG4gKiBUaGUgJ0ltcG9ydCB0byBSZWRtaW5lJyBmb3JtLlxuICovXG5jbGFzcyBJbXBvcnRGb3JtIHtcbiAgcmVhZG9ubHkgZWxlbWVudDogSlF1ZXJ5PEhUTUxFbGVtZW50PlxuICByZWFkb25seSBpbXBvcnRCdXR0b246IEpRdWVyeTxIVE1MRWxlbWVudD5cbiAgcHJpdmF0ZSBmaWx0ZXJGb3JtOiBGaWx0ZXJGb3JtXG4gIHByaXZhdGUgcmVkbWluZUFQSTogUmVkbWluZUFQSVNlcnZpY2VcbiAgcHJpdmF0ZSByZWRtaW5lUmVwb3J0OiBSZWRtaW5lUmVwb3J0XG4gIHByaXZhdGUgdG9nZ2xSZXBvcnQ6IFRvZ2dsUmVwb3J0XG5cbiAgcHVibGljIGNvbnN0cnVjdG9yKFxuICAgIGVsZW1lbnQ6IEhUTUxFbGVtZW50LFxuICAgIGZpbHRlckZvcm06IEZpbHRlckZvcm0sXG4gICAgcmVkbWluZUFQSTogUmVkbWluZUFQSVNlcnZpY2UsXG4gICAgcmVkbWluZVJlcG9ydDogUmVkbWluZVJlcG9ydCxcbiAgICB0b2dnbFJlcG9ydDogVG9nZ2xSZXBvcnRcbiAgKSB7XG4gICAgY29uc3QgdGhhdCA9IHRoaXNcbiAgICB0aGlzLmVsZW1lbnQgPSAkKGVsZW1lbnQpXG4gICAgdGhpcy5pbXBvcnRCdXR0b24gPSB0aGlzLmVsZW1lbnQuZmluZCgnI2J0bi1pbXBvcnQnKVxuXG4gICAgdGhpcy5maWx0ZXJGb3JtID0gZmlsdGVyRm9ybVxuICAgIHRoaXMucmVkbWluZUFQSSA9IHJlZG1pbmVBUElcbiAgICB0aGlzLnJlZG1pbmVSZXBvcnQgPSByZWRtaW5lUmVwb3J0XG4gICAgdGhpcy50b2dnbFJlcG9ydCA9IHRvZ2dsUmVwb3J0XG5cbiAgICB0aGlzLmZpbHRlckZvcm0uZXZlbnRNYW5hZ2VyLm9uKCdwcmVTdWJtaXQnLCBmdW5jdGlvbigpIHtcbiAgICAgIHRoYXQuZGlzYWJsZSgpXG4gICAgfSlcblxuICAgIHRoaXMuZmlsdGVyRm9ybS5ldmVudE1hbmFnZXIub24oJ3Bvc3RTdWJtaXQnLCBmdW5jdGlvbigpIHtcbiAgICAgIHRoYXQuZW5hYmxlKClcbiAgICB9KVxuXG4gICAgdGhpcy5lbGVtZW50Lm9uKCdzdWJtaXQnLCAoKSA9PiB7XG4gICAgICB0aGF0Lm9uU3VibWl0KClcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH0pXG4gIH1cblxuICBwdWJsaWMgb25TdWJtaXQoKSB7XG4gICAgY29uc3QgdGhhdCA9IHRoaXNcbiAgICBjb25zdCBmaWx0ZXJGb3JtVmFsdWVzID0gdGhpcy5maWx0ZXJGb3JtLmdldFZhbHVlcygpXG5cbiAgICBpZiAoIWNvbmZpcm0odCgndDJyLmltcG9ydF9jb25maXJtYXRpb24nKSkpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHRoaXMuZGlzYWJsZSgpXG4gICAgZmxhc2guY2xlYXIoKVxuXG4gICAgLy8gSWYgbm8gZW50cmllcyBhcmUgc2VsZWN0ZWQgZm9yIGltcG9ydC5cbiAgICBpZiAodGhpcy50b2dnbFJlcG9ydC5lbGVtZW50LmZpbmQoJ3Rib2R5IGlucHV0LmNiLWltcG9ydCcpLmZpbHRlcignOmNoZWNrZWQnKS5sZW5ndGggPT09IDApIHtcbiAgICAgIGZsYXNoLmVycm9yKHQoJ3Qyci5lcnJvci5ub19lbnRyaWVzX3NlbGVjdGVkJykpO1xuICAgICAgdGhpcy5lbmFibGUoKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY29uc29sZS5pbmZvKCdTZW5kaW5nIHRpbWUgZW50cmllcyB0byBSZWRtaW5lLicpXG4gICAgdGhpcy50b2dnbFJlcG9ydC5lbGVtZW50LmZpbmQoJ3Rib2R5IHRyJykuZWFjaChmdW5jdGlvbiAodGhpczogSFRNTEVsZW1lbnQpIHtcbiAgICAgIGNvbnN0ICR0ciA9ICQodGhpcylcblxuICAgICAgLy8gSWYgdGhlIGl0ZW0gaXMgbm90IG1hcmtlZCBmb3IgaW1wb3J0LCBpZ25vcmUgaXQuXG4gICAgICBpZiAoISR0ci5maW5kKCdpbnB1dC5jYi1pbXBvcnQnKS5wcm9wKCdjaGVja2VkJykpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHRpbWVFbnRyeSA9IHtcbiAgICAgICAgc3BlbnRfb246IGZpbHRlckZvcm1WYWx1ZXNbJ2RhdGUnXSBhcyBzdHJpbmcsXG4gICAgICAgIGlzc3VlX2lkOiBwYXJzZUludCgkdHIuZmluZCgnW2RhdGEtcHJvcGVydHk9XCJpc3N1ZV9pZFwiXScpLnZhbCgpIGFzIHN0cmluZyksXG4gICAgICAgIGNvbW1lbnRzOiAkdHIuZmluZCgnW2RhdGEtcHJvcGVydHk9XCJjb21tZW50c1wiXScpLnZhbCgpIGFzIHN0cmluZyxcbiAgICAgICAgYWN0aXZpdHlfaWQ6IHBhcnNlSW50KCR0ci5maW5kKCdbZGF0YS1wcm9wZXJ0eT1cImFjdGl2aXR5X2lkXCJdJykudmFsKCkgYXMgc3RyaW5nKSxcbiAgICAgICAgaG91cnM6ICcwLjAwJ1xuICAgICAgfVxuXG4gICAgICAvLyBDb252ZXJ0IHRpbWUgdG8gUmVkbWluZS1mcmllbmRseSBmb3JtYXQsIGkuZS4gaGg6bW0uXG4gICAgICBjb25zdCBkdXIgPSBuZXcgZGF0ZXRpbWUuRHVyYXRpb24oKVxuICAgICAgdHJ5IHtcbiAgICAgICAgZHVyLnNldEhITU0oJHRyLmZpbmQoJ1tkYXRhLXByb3BlcnR5PVwiaG91cnNcIl0nKS52YWwoKSBhcyBzdHJpbmcpXG4gICAgICAgIHRpbWVFbnRyeS5ob3VycyA9IGR1ci5hc0RlY2ltYWwoKVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjb25zb2xlLndhcm4oJ0VudHJ5IGlnbm9yZWQ6IEludmFsaWQgZHVyYXRpb24uJywgdGltZUVudHJ5KVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgLy8gSWdub3JlIGVudHJpZXMgd2l0aCAwIGR1cmF0aW9uLlxuICAgICAgaWYgKGR1ci5zZWNvbmRzIDwgMzApIHtcbiAgICAgICAgY29uc29sZS53YXJuKCdFbnRyeSBpZ25vcmVkOiBEdXJhdGlvbiBpcyBsZXNzIHRoYW4gMzAgc2Vjb25kcy4nLCB0aW1lRW50cnkpO1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgdGhhdC5yZWRtaW5lQVBJLnBvc3RUaW1lRW50cnkoe1xuICAgICAgICB0aW1lX2VudHJ5OiB0aW1lRW50cnksXG4gICAgICAgIHRvZ2dsX2lkczogJHRyLmRhdGEoJ3Qyci5lbnRyeScpLmlkc1xuICAgICAgfSwgKGVycm9yczogc3RyaW5nW10pID0+IHtcbiAgICAgICAgLy8gSWYgYWxsIHJlcXVlc3RzIGhhdmUgYmVlbiBwcm9jZXNzZWQuXG4gICAgICAgIGlmICh0aGF0LnJlZG1pbmVBUEkucmVxdWVzdFF1ZXVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIHRoYXQuZW5hYmxlKClcbiAgICAgICAgICB0aGF0LnJlZG1pbmVSZXBvcnQudXBkYXRlKClcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChlcnJvcnMubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgICAgJHRyLmFkZENsYXNzKCd0MnItZXJyb3InKVxuICAgICAgICAgIGNvbnN0IHN0YXR1c0xhYmVsID0gcmVuZGVyZXJzLnJlbmRlckltcG9ydFN0YXR1c0xhYmVsKCdGYWlsZWQnLCBlcnJvcnMuam9pbihcIlxcblwiKSwgJ2Vycm9yJylcbiAgICAgICAgICAkdHIuZmluZCgndGQuc3RhdHVzJykuaHRtbChzdGF0dXNMYWJlbClcblxuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG5cbiAgICAgICAgJHRyLmFkZENsYXNzKCd0MnItc3VjY2VzcycpXG4gICAgICAgICR0ci5maW5kKCc6aW5wdXQnKS5hdHRyKCdkaXNhYmxlZCcsICdkaXNhYmxlZCcpXG4gICAgICAgICR0ci5maW5kKCdpbnB1dC5jYi1pbXBvcnQnKS5yZW1vdmVBdHRyKCdjaGVja2VkJylcblxuICAgICAgICBjb25zdCBzdGF0dXNMYWJlbCA9IHJlbmRlcmVycy5yZW5kZXJJbXBvcnRTdGF0dXNMYWJlbCgnSW1wb3J0ZWQnKVxuICAgICAgICAkdHIuZmluZCgndGQuc3RhdHVzJykuaHRtbChzdGF0dXNMYWJlbClcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBEaXNhYmxlcyBmb3JtIHN1Ym1pc3Npb24uXG4gICAqL1xuICBwdWJsaWMgZGlzYWJsZSgpIHtcbiAgICB0aGlzLmltcG9ydEJ1dHRvbi5hdHRyKCdkaXNhYmxlZCcsICdkaXNhYmxlZCcpXG4gIH1cblxuICAvKipcbiAgICogRW5hYmxlcyBmb3JtIHN1Ym1pc3Npb24uXG4gICAqL1xuICBwdWJsaWMgZW5hYmxlKCkge1xuICAgIHRoaXMuaW1wb3J0QnV0dG9uLnJlbW92ZUF0dHIoJ2Rpc2FibGVkJylcbiAgfVxufVxuXG4vKipcbiAqIFRoZSBmaWx0ZXIvb3B0aW9ucyBmb3JtLlxuICovXG5pbnRlcmZhY2UgRmlsdGVyRm9ybVZhbHVlcyB7XG4gIGRhdGU/OiBzdHJpbmcsXG4gICdkZWZhdWx0LWFjdGl2aXR5LWlkJz86IG51bWJlcixcbiAgJ3RvZ2dsLXdvcmtzcGFjZS1pZCc/OiBudW1iZXIsXG4gICdyb3VuZGluZy12YWx1ZSc/OiBudW1iZXIsXG4gICdyb3VuZGluZy1tZXRob2QnPzogZGF0ZXRpbWUuRHVyYXRpb25Sb3VuZGluZ01ldGhvZFxufVxuXG5jbGFzcyBGaWx0ZXJGb3JtIHtcbiAgcmVhZG9ubHkgZWxlbWVudDogSlF1ZXJ5PEhUTUxFbGVtZW50PlxuICByZWFkb25seSBldmVudE1hbmFnZXI6IHV0aWxzLkV2ZW50TWFuYWdlclxuICBwcml2YXRlIGxvY2FsU3RvcmFnZTogTG9jYWxTdG9yYWdlXG5cbiAgcHVibGljIGNvbnN0cnVjdG9yKGVsZW1lbnQ6IEhUTUxFbGVtZW50LCBsb2NhbFN0b3JhZ2U6IExvY2FsU3RvcmFnZSkge1xuICAgIGNvbnN0IHRoYXQgPSB0aGlzXG4gICAgdGhpcy5lbGVtZW50ID0gJChlbGVtZW50KVxuICAgIHRoaXMubG9jYWxTdG9yYWdlID0gbG9jYWxTdG9yYWdlXG4gICAgdGhpcy5ldmVudE1hbmFnZXIgPSBuZXcgdXRpbHMuRXZlbnRNYW5hZ2VyKClcblxuICAgIC8vIEluaXRpYWxpemUgYXBwbHkgZmlsdGVycyBidXR0b24uXG4gICAgdGhpcy5lbGVtZW50LmZpbmQoJyNidG4tYXBwbHktZmlsdGVycycpXG4gICAgICAub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICByZXR1cm4gdGhhdC5vblN1Ym1pdCgpXG4gICAgICB9KVxuXG4gICAgLy8gSW5pdGlhbGl6ZSByZXNldCBmaWx0ZXJzIGJ1dHRvbi5cbiAgICB0aGlzLmVsZW1lbnQuZmluZCgnI2J0bi1yZXNldC1maWx0ZXJzJylcbiAgICAgIC5vbignY2xpY2snLCgpID0+IHtcbiAgICAgICAgdGhhdC5yZXNldCgpXG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfSlcblxuICAgIC8vIEhhbmRsZSBmaWx0ZXIgZm9ybSBzdWJtaXNzaW9uLlxuICAgIHRoaXMuZWxlbWVudC5vbignc3VibWl0JywoZSkgPT4ge1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICByZXR1cm4gdGhhdC5vblN1Ym1pdCgpXG4gICAgfSk7XG4gIH1cblxuICBwdWJsaWMgZ2V0RGVmYXVsdHMoKTogRmlsdGVyRm9ybVZhbHVlcyB7XG4gICAgY29uc3QgdmFsdWVzOiBGaWx0ZXJGb3JtVmFsdWVzID0ge31cblxuICAgIHZhbHVlc1snZGF0ZSddID0gKG5ldyBkYXRldGltZS5EYXRlVGltZSkudG9IVE1MRGF0ZVN0cmluZygpXG5cbiAgICBjb25zdCB3b3Jrc3BhY2VJZCA9IHRoaXMubG9jYWxTdG9yYWdlLmdldCgndG9nZ2wtd29ya3NwYWNlLWlkJylcbiAgICBpZiAod29ya3NwYWNlSWQpIHtcbiAgICAgIHZhbHVlc1sndG9nZ2wtd29ya3NwYWNlLWlkJ10gPSBwYXJzZUludCh3b3Jrc3BhY2VJZCBhcyBzdHJpbmcpXG4gICAgfVxuXG4gICAgY29uc3QgZGVmYXVsdEFjdGl2aXR5SWQgPSB0aGlzLmxvY2FsU3RvcmFnZS5nZXQoJ2RlZmF1bHQtYWN0aXZpdHktaWQnKVxuICAgIGlmIChkZWZhdWx0QWN0aXZpdHlJZCkge1xuICAgICAgdmFsdWVzWydkZWZhdWx0LWFjdGl2aXR5LWlkJ10gPSBwYXJzZUludChkZWZhdWx0QWN0aXZpdHlJZCBhcyBzdHJpbmcpXG4gICAgfVxuXG4gICAgY29uc3Qgcm91bmRpbmdWYWx1ZSA9IHRoaXMubG9jYWxTdG9yYWdlLmdldCgncm91bmRpbmctdmFsdWUnKSBhcyBzdHJpbmcgfHwgJzAnXG4gICAgdmFsdWVzWydyb3VuZGluZy12YWx1ZSddID0gcGFyc2VJbnQocm91bmRpbmdWYWx1ZSlcblxuICAgIGNvbnN0IHJvdW5kaW5nTWV0aG9kID0gdGhpcy5sb2NhbFN0b3JhZ2UuZ2V0KCdyb3VuZGluZy1tZXRob2QnKSBhcyBkYXRldGltZS5EdXJhdGlvblJvdW5kaW5nTWV0aG9kXG4gICAgaWYgKHJvdW5kaW5nTWV0aG9kKSB7XG4gICAgICB2YWx1ZXNbJ3JvdW5kaW5nLW1ldGhvZCddID0gcm91bmRpbmdNZXRob2QgYXMgZGF0ZXRpbWUuRHVyYXRpb25Sb3VuZGluZ01ldGhvZFxuICAgIH1cblxuICAgIHJldHVybiB2YWx1ZXNcbiAgfVxuXG4gIHB1YmxpYyBnZXRWYWx1ZXMoKTogRmlsdGVyRm9ybVZhbHVlcyB7XG4gICAgY29uc3QgdmFsdWVzOiBGaWx0ZXJGb3JtVmFsdWVzID0ge31cblxuICAgIGNvbnN0ICRkZWZhdWx0QWN0aXZpdHlJZCA9ICQoJ3NlbGVjdCNkZWZhdWx0LWFjdGl2aXR5LWlkJylcbiAgICBjb25zdCBkZWZhdWx0QWN0aXZpdHlJZCA9ICRkZWZhdWx0QWN0aXZpdHlJZC52YWwoKSB8fCAkZGVmYXVsdEFjdGl2aXR5SWQuZGF0YSgnc2VsZWN0ZWQnKVxuICAgIGlmIChkZWZhdWx0QWN0aXZpdHlJZCkge1xuICAgICAgdmFsdWVzWydkZWZhdWx0LWFjdGl2aXR5LWlkJ10gPSBwYXJzZUludChkZWZhdWx0QWN0aXZpdHlJZCBhcyBzdHJpbmcpXG4gICAgfVxuXG4gICAgY29uc3QgJHRvZ2dsV29ya3NwYWNlSWQgPSAkKCdzZWxlY3QjdG9nZ2wtd29ya3NwYWNlLWlkJylcbiAgICBjb25zdCB0b2dnbFdvcmtzcGFjZUlkID0gJHRvZ2dsV29ya3NwYWNlSWQudmFsKCkgfHwgJHRvZ2dsV29ya3NwYWNlSWQuZGF0YSgnc2VsZWN0ZWQnKVxuICAgIGlmICh0b2dnbFdvcmtzcGFjZUlkKSB7XG4gICAgICB2YWx1ZXNbJ3RvZ2dsLXdvcmtzcGFjZS1pZCddID0gdG9nZ2xXb3Jrc3BhY2VJZFxuICAgIH1cblxuICAgIGNvbnN0IHNSb3VuZGluZ1ZhbHVlID0gJCgnaW5wdXQjcm91bmRpbmctdmFsdWUnKS52YWwoKSBhcyBzdHJpbmdcbiAgICBjb25zdCBuUm91bmRpbmdWYWx1ZSA9IHBhcnNlSW50KHNSb3VuZGluZ1ZhbHVlKVxuICAgIGlmIChzUm91bmRpbmdWYWx1ZSAmJiAhaXNOYU4oblJvdW5kaW5nVmFsdWUpKSB7XG4gICAgICB2YWx1ZXNbJ3JvdW5kaW5nLXZhbHVlJ10gPSBwYXJzZUludChzUm91bmRpbmdWYWx1ZSlcbiAgICB9XG5cbiAgICBjb25zdCByb3VuZGluZ01ldGhvZCA9ICQoJ3NlbGVjdCNyb3VuZGluZy1tZXRob2QnKS52YWwoKSBhcyBkYXRldGltZS5EdXJhdGlvblJvdW5kaW5nTWV0aG9kXG4gICAgaWYgKHJvdW5kaW5nTWV0aG9kKSB7XG4gICAgICB2YWx1ZXNbJ3JvdW5kaW5nLW1ldGhvZCddID0gcm91bmRpbmdNZXRob2QgYXMgZGF0ZXRpbWUuRHVyYXRpb25Sb3VuZGluZ01ldGhvZFxuICAgIH1cblxuICAgIGNvbnN0IHNEYXRlOiBzdHJpbmcgPSAkKCcjZGF0ZScpLnZhbCgpIGFzIHN0cmluZ1xuICAgIHRyeSB7XG4gICAgICBkYXRldGltZS5EYXRlVGltZS5mcm9tU3RyaW5nKHNEYXRlKVxuICAgICAgdmFsdWVzWydkYXRlJ10gPSBzRGF0ZVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZSlcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWVzXG4gIH1cblxuICBwdWJsaWMgc2V0VmFsdWVzKHZhbHVlczogRmlsdGVyRm9ybVZhbHVlcykge1xuICAgIHRoaXMuZWxlbWVudFxuICAgICAgLmZpbmQoJzppbnB1dCcpXG4gICAgICAuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnN0ICRmaWVsZCA9ICQodGhpcylcbiAgICAgICAgY29uc3QgbmFtZSA9ICRmaWVsZC5hdHRyKCduYW1lJykgYXMgc3RyaW5nXG5cbiAgICAgICAgaWYgKCFuYW1lKSByZXR1cm5cblxuICAgICAgICBzd2l0Y2ggKG5hbWUpIHtcbiAgICAgICAgICBjYXNlICdkYXRlJzpcbiAgICAgICAgICAgIGlmICghdmFsdWVzWydkYXRlJ10pIHJldHVyblxuXG4gICAgICAgICAgICAkZmllbGQudmFsKHZhbHVlc1snZGF0ZSddIGFzIHN0cmluZylcbiAgICAgICAgICAgIGJyZWFrXG5cbiAgICAgICAgICBjYXNlICdkZWZhdWx0LWFjdGl2aXR5LWlkJzpcbiAgICAgICAgICAgIGlmICghdmFsdWVzWydkZWZhdWx0LWFjdGl2aXR5LWlkJ10pIHJldHVyblxuXG4gICAgICAgICAgICAkZmllbGRcbiAgICAgICAgICAgICAgLmRhdGEoJ3NlbGVjdGVkJywgdmFsdWVzWydkZWZhdWx0LWFjdGl2aXR5LWlkJ10gYXMgbnVtYmVyKVxuICAgICAgICAgICAgICAudmFsKHZhbHVlc1snZGVmYXVsdC1hY3Rpdml0eS1pZCddIGFzIG51bWJlcilcbiAgICAgICAgICAgIGJyZWFrXG5cbiAgICAgICAgICBjYXNlICd0b2dnbC13b3Jrc3BhY2UtaWQnOlxuICAgICAgICAgICAgaWYgKCF2YWx1ZXNbJ3RvZ2dsLXdvcmtzcGFjZS1pZCddKSByZXR1cm5cblxuICAgICAgICAgICAgJGZpZWxkXG4gICAgICAgICAgICAgIC5kYXRhKCdzZWxlY3RlZCcsIHZhbHVlc1sndG9nZ2wtd29ya3NwYWNlLWlkJ10gYXMgbnVtYmVyKVxuICAgICAgICAgICAgICAudmFsKHZhbHVlc1sndG9nZ2wtd29ya3NwYWNlLWlkJ10gYXMgbnVtYmVyKVxuICAgICAgICAgICAgYnJlYWtcblxuICAgICAgICAgIGNhc2UgJ3JvdW5kaW5nLW1ldGhvZCc6XG4gICAgICAgICAgICBpZiAoIXZhbHVlc1sncm91bmRpbmctbWV0aG9kJ10pIHJldHVyblxuXG4gICAgICAgICAgICAkZmllbGQudmFsKHZhbHVlc1sncm91bmRpbmctbWV0aG9kJ10gYXMgc3RyaW5nKVxuICAgICAgICAgICAgYnJlYWtcblxuICAgICAgICAgIGNhc2UgJ3JvdW5kaW5nLXZhbHVlJzpcbiAgICAgICAgICAgIGlmICghdmFsdWVzWydyb3VuZGluZy12YWx1ZSddKSByZXR1cm5cblxuICAgICAgICAgICAgJGZpZWxkLnZhbCh2YWx1ZXNbJ3JvdW5kaW5nLXZhbHVlJ10gYXMgbnVtYmVyKVxuICAgICAgICAgICAgYnJlYWtcblxuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBgVW5leHBlY3RlZCBmaWVsZDogJHtuYW1lfWBcbiAgICAgICAgfVxuICAgICAgfSlcbiAgfVxuXG4gIHB1YmxpYyByZXNldCh2YWx1ZXM6IEZpbHRlckZvcm1WYWx1ZXMgPSB7fSkge1xuICAgIGNvbnN0IGRlZmF1bHRzID0gdGhpcy5nZXREZWZhdWx0cygpXG5cbiAgICBpZiAoIXZhbHVlc1snZGF0ZSddKSB7XG4gICAgICB2YWx1ZXNbJ2RhdGUnXSA9IGRlZmF1bHRzWydkYXRlJ11cbiAgICB9XG5cbiAgICBpZiAoIXZhbHVlc1snZGVmYXVsdC1hY3Rpdml0eS1pZCddKSB7XG4gICAgICB2YWx1ZXNbJ2RlZmF1bHQtYWN0aXZpdHktaWQnXSA9IGRlZmF1bHRzWydkZWZhdWx0LWFjdGl2aXR5LWlkJ11cbiAgICB9XG5cbiAgICBpZiAoIXZhbHVlc1sndG9nZ2wtd29ya3NwYWNlLWlkJ10pIHtcbiAgICAgIHZhbHVlc1sndG9nZ2wtd29ya3NwYWNlLWlkJ10gPSBkZWZhdWx0c1sndG9nZ2wtd29ya3NwYWNlLWlkJ11cbiAgICB9XG5cbiAgICBpZiAoIXZhbHVlc1sncm91bmRpbmctbWV0aG9kJ10pIHtcbiAgICAgIHZhbHVlc1sncm91bmRpbmctbWV0aG9kJ10gPSBkZWZhdWx0c1sncm91bmRpbmctbWV0aG9kJ11cbiAgICB9XG5cbiAgICBpZiAoIXZhbHVlc1sncm91bmRpbmctdmFsdWUnXSkge1xuICAgICAgdmFsdWVzWydyb3VuZGluZy12YWx1ZSddID0gZGVmYXVsdHNbJ3JvdW5kaW5nLXZhbHVlJ11cbiAgICB9XG5cbiAgICB0aGlzLmVsZW1lbnQuZmluZCgnOmlucHV0JykudmFsKCcnKVxuICAgIHRoaXMuc2V0VmFsdWVzKHZhbHVlcylcbiAgICB0aGlzLm9uU3VibWl0KClcbiAgfVxuXG4gIHB1YmxpYyBvblN1Ym1pdCgpIHtcbiAgICB0aGlzLmV2ZW50TWFuYWdlci50cmlnZ2VyKCdwcmVTdWJtaXQnKVxuICAgIGNvbnN0IHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKClcblxuICAgIGlmICghdmFsdWVzWydkYXRlJ10pIHtcbiAgICAgIHRoaXMuZWxlbWVudC5maW5kKCcjZGF0ZScpLnRyaWdnZXIoJ2ZvY3VzJylcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cblxuICAgIC8vIFN0b3JlIGRhdGUgYW5kIHVwZGF0ZSBVUkwgaGFzaC5cbiAgICBjb25zdCBvRGF0ZSA9IGRhdGV0aW1lLkRhdGVUaW1lLmZyb21TdHJpbmcodmFsdWVzWydkYXRlJ10pXG4gICAgaWYgKCFvRGF0ZSkge1xuICAgICAgZmxhc2guZXJyb3IodCgndDJyLmVycm9yLmRhdGVfaW52YWxpZCcpKVxuICAgICAgdGhpcy5lbGVtZW50LmZpbmQoJyNkYXRlJykudHJpZ2dlcignZm9jdXMnKVxuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgdGhpcy5sb2NhbFN0b3JhZ2Uuc2V0KCdkZWZhdWx0LWFjdGl2aXR5LWlkJywgdmFsdWVzWydkZWZhdWx0LWFjdGl2aXR5LWlkJ10pXG4gICAgdGhpcy5sb2NhbFN0b3JhZ2Uuc2V0KCd0b2dnbC13b3Jrc3BhY2UtaWQnLCB2YWx1ZXNbJ3RvZ2dsLXdvcmtzcGFjZS1pZCddKVxuICAgIHRoaXMubG9jYWxTdG9yYWdlLnNldCgncm91bmRpbmctdmFsdWUnLCB2YWx1ZXNbJ3JvdW5kaW5nLXZhbHVlJ10pXG4gICAgdGhpcy5sb2NhbFN0b3JhZ2Uuc2V0KCdyb3VuZGluZy1tZXRob2QnLCB2YWx1ZXNbJ3JvdW5kaW5nLW1ldGhvZCddKVxuXG4gICAgY29uc29sZS5pbmZvKCdGaWx0ZXIgdXBkYXRlZCcsIHZhbHVlcyk7XG5cbiAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9IG9EYXRlLnRvSFRNTERhdGVTdHJpbmcoKVxuICAgICQoJ2gyIC5kYXRlJykuaHRtbCgnKCcgKyBvRGF0ZS5kYXRlLnRvTG9jYWxlRGF0ZVN0cmluZygpICsgJyknKVxuXG4gICAgdGhpcy5ldmVudE1hbmFnZXIudHJpZ2dlcigncG9zdFN1Ym1pdCcpXG5cbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG4vKipcbiAqIFRoZSBSZWRtaW5lIHJlcG9ydCB0YWJsZS5cbiAqL1xuY2xhc3MgUmVkbWluZVJlcG9ydCB7XG4gIHJlYWRvbmx5IGVsZW1lbnQ6IEpRdWVyeTxIVE1MRWxlbWVudD5cbiAgcmVhZG9ubHkgbGFzdEltcG9ydGVkOiBKUXVlcnk8SFRNTEVsZW1lbnQ+XG4gIHN0YXRpYyBfaW5zdGFuY2U6IFJlZG1pbmVSZXBvcnQgfCBudWxsXG4gIHByaXZhdGUgZmlsdGVyRm9ybTogRmlsdGVyRm9ybVxuICBwcml2YXRlIHJlZG1pbmVBUEk6IFJlZG1pbmVBUElTZXJ2aWNlXG5cbiAgcHVibGljIGNvbnN0cnVjdG9yKGVsZW1lbnQ6IEhUTUxFbGVtZW50LCBmaWx0ZXJGb3JtOiBGaWx0ZXJGb3JtLCByZWRtaW5lQVBJOiBSZWRtaW5lQVBJU2VydmljZSkge1xuICAgIGNvbnN0IHRoYXQgPSB0aGlzXG4gICAgdGhpcy5lbGVtZW50ID0gJChlbGVtZW50KVxuICAgIHRoaXMubGFzdEltcG9ydGVkID0gJCgnI2xhc3QtaW1wb3J0ZWQnKVxuICAgIHRoaXMuZmlsdGVyRm9ybSA9IGZpbHRlckZvcm1cbiAgICB0aGlzLnJlZG1pbmVBUEkgPSByZWRtaW5lQVBJXG5cbiAgICB0aGlzLmZpbHRlckZvcm0uZXZlbnRNYW5hZ2VyLm9uKCdwb3N0U3VibWl0JywgZnVuY3Rpb24oKSB7XG4gICAgICB0aGF0LnVwZGF0ZSgpXG4gICAgfSlcbiAgfVxuXG4gIHB1YmxpYyB1cGRhdGUoKSB7XG4gICAgY29uc3QgdGhhdCA9IHRoaXNcblxuICAgIHRoaXMuc2hvd0xvYWRlcigpXG4gICAgdGhpcy5tYWtlRW1wdHkoKVxuXG4gICAgY29uc3Qgc0RhdGU6IHN0cmluZyA9IHRoaXMuZmlsdGVyRm9ybS5nZXRWYWx1ZXMoKVsnZGF0ZSddIGFzIHN0cmluZ1xuICAgIGNvbnN0IG9EYXRlID0gZGF0ZXRpbWUuRGF0ZVRpbWUuZnJvbVN0cmluZyhzRGF0ZSlcblxuICAgIHRoaXMudXBkYXRlTGluayhvRGF0ZSlcbiAgICB0aGlzLnVwZGF0ZUxhc3RJbXBvcnREYXRlKClcblxuICAgIGNvbnN0IHF1ZXJ5ID0geyBmcm9tOiBvRGF0ZSwgdGlsbDogb0RhdGUgfVxuICAgIHRoaXMucmVkbWluZUFQSS5nZXRUaW1lRW50cmllcyhxdWVyeSwgKGVudHJpZXM6IG1vZGVscy5UaW1lRW50cnlbXSB8IG51bGwpID0+IHtcbiAgICAgIGlmIChlbnRyaWVzID09PSBudWxsKSB7XG4gICAgICAgIGVudHJpZXMgPSBbXVxuICAgICAgfVxuXG4gICAgICBpZiAoZW50cmllcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdGhhdC5zaG93RW1wdHlNZXNzYWdlKClcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCB0aW1lX2VudHJ5IG9mIGVudHJpZXMpIHtcbiAgICAgICAgY29uc3QgbWFya3VwID0gcmVuZGVyZXJzLnJlbmRlclJlZG1pbmVSb3codGltZV9lbnRyeSlcbiAgICAgICAgdGhhdC5lbGVtZW50LmZpbmQoJ3Rib2R5JykuYXBwZW5kKG1hcmt1cClcbiAgICAgIH1cblxuICAgICAgdGhhdC51cGRhdGVUb3RhbCgpXG4gICAgICB0aGF0LmhpZGVMb2FkZXIoKVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgdGhlIGxpbmsgdG8gdGhlIFJlZG1pbmUgcmVwb3J0IHBhZ2UuXG4gICAqXG4gICAqIEBwYXJhbSBkYXRlXG4gICAqICAgUmVwb3J0IGRhdGUuXG4gICAqL1xuICBwcml2YXRlIHVwZGF0ZUxpbmsoZGF0ZTogZGF0ZXRpbWUuRGF0ZVRpbWUpIHtcbiAgICBjb25zdCB1cmwgPSBgL3RpbWVfZW50cmllcz91dGY4PVx1MjcxMyZzZXRfZmlsdGVyPTEmc29ydD1zcGVudF9vbjpkZXNjJmZbXT1zcGVudF9vbiZvcFtzcGVudF9vbl09JTNEJnZbc3BlbnRfb25dW109WyR7ZGF0ZS50b0hUTUxEYXRlU3RyaW5nKCl9XSZmW109dXNlcl9pZCZvcFt1c2VyX2lkXT0lM0Qmdlt1c2VyX2lkXVtdPW1lJmNbXT1wcm9qZWN0JmNbXT1zcGVudF9vbiZjW109dXNlciZjW109YWN0aXZpdHkmY1tdPWlzc3VlJmNbXT1jb21tZW50cyZjW109aG91cnMmZ3JvdXBfYnk9c3BlbnRfb24mdFtdPWhvdXJzJnRbXT1gXG4gICAgJCgnI3JlZG1pbmUtcmVwb3J0LWxpbmsnKS5hdHRyKCdocmVmJywgdXJsKVxuICB9XG5cbiAgcHVibGljIHVwZGF0ZVRvdGFsKCkge1xuICAgIGNvbnN0IHRvdGFsID0gbmV3IGRhdGV0aW1lLkR1cmF0aW9uKClcblxuICAgIC8vIEl0ZXJhdGUgb3ZlciBhbGwgcm93cyBhbmQgYWRkIHRoZSBob3Vycy5cbiAgICB0aGlzLmVsZW1lbnQuZmluZCgndGJvZHkgdHIgLmhvdXJzJylcbiAgICAgIC5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc3QgaG91cnMgPSAkKHRoaXMpLnRleHQoKS50cmltKCk7XG4gICAgICAgIGlmIChob3Vycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdG90YWwuYWRkKG5ldyBkYXRldGltZS5EdXJhdGlvbihob3VycykpO1xuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgdGhpcy5lbGVtZW50LmZpbmQoJ1tkYXRhLXByb3BlcnR5PVwidG90YWwtaG91cnNcIl0nKS5odG1sKHRvdGFsLmFzSEhNTSgpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIHRoZSBkYXRlIG9mIHRoZSBsYXRlc3QgdGltZSBlbnRyeSBvbiBSZWRtaW5lLlxuICAgKi9cbiAgcHVibGljIHVwZGF0ZUxhc3RJbXBvcnREYXRlKCkge1xuICAgIGNvbnN0IHRoYXQgPSB0aGlzXG5cbiAgICB0aGlzLmxhc3RJbXBvcnRlZFxuICAgICAgLmh0bWwoJyZuYnNwOycpXG4gICAgICAuYWRkQ2xhc3MoJ3Qyci1sb2FkaW5nJylcblxuICAgIHRoaXMucmVkbWluZUFQSS5nZXRMYXN0SW1wb3J0RGF0ZSgobGFzdEltcG9ydERhdGU6IGRhdGV0aW1lLkRhdGVUaW1lIHwgbnVsbCkgPT4ge1xuICAgICAgY29uc3Qgc0RhdGUgPSBsYXN0SW1wb3J0RGF0ZSA/IGxhc3RJbXBvcnREYXRlLmRhdGUudG9Mb2NhbGVEYXRlU3RyaW5nKCkgOiAnVW5rbm93bidcbiAgICAgIHRoYXQubGFzdEltcG9ydGVkLnRleHQoc0RhdGUpLnJlbW92ZUNsYXNzKCd0MnItbG9hZGluZycpXG4gICAgfSlcbiAgfVxuXG4gIHB1YmxpYyBzaG93RW1wdHlNZXNzYWdlKCkge1xuICAgIGNvbnN0IGNvbHNwYW4gPSB0aGlzLmVsZW1lbnQuZmluZCgndGhlYWQgdHI6Zmlyc3QgdGgnKS5sZW5ndGhcbiAgICBjb25zdCBtZXNzYWdlID0gdCgndDJyLmVycm9yLmxpc3RfZW1wdHknKVxuICAgIGNvbnN0IG1hcmt1cCA9IGA8dHI+PHRkIGNvbHNwYW49XCIke2NvbHNwYW59XCI+JHttZXNzYWdlfTwvdGQ+PC90cj5gXG4gICAgdGhpcy5lbGVtZW50LmZpbmQoJ3Rib2R5JykuaHRtbChtYXJrdXApO1xuICB9XG5cbiAgcHJpdmF0ZSBtYWtlRW1wdHkoKSB7XG4gICAgdGhpcy5lbGVtZW50LmZpbmQoJ3Rib2R5JykuaHRtbCgnJylcbiAgfVxuXG4gIHB1YmxpYyBzaG93TG9hZGVyKCkge1xuICAgIHRoaXMuZWxlbWVudC5hZGRDbGFzcygndDJyLWxvYWRpbmcnKVxuICB9XG5cbiAgcHVibGljIGhpZGVMb2FkZXIoKSB7XG4gICAgdGhpcy5lbGVtZW50LnJlbW92ZUNsYXNzKCd0MnItbG9hZGluZycpXG4gIH1cbn1cblxuY2xhc3MgVG9nZ2xSZXBvcnQge1xuICByZWFkb25seSBlbGVtZW50OiBKUXVlcnk8SFRNTEVsZW1lbnQ+XG4gIHJlYWRvbmx5IGNoZWNrQWxsOiBKUXVlcnk8SFRNTEVsZW1lbnQ+XG4gIHByaXZhdGUgZmlsdGVyRm9ybTogRmlsdGVyRm9ybVxuICBwcml2YXRlIHJlZG1pbmVBUEk6IFJlZG1pbmVBUElTZXJ2aWNlXG5cbiAgcHVibGljIGNvbnN0cnVjdG9yKGVsZW1lbnQ6IEhUTUxFbGVtZW50LCBmaWx0ZXJGb3JtOiBGaWx0ZXJGb3JtLCByZWRtaW5lQVBJOiBSZWRtaW5lQVBJU2VydmljZSkge1xuICAgIGNvbnN0IHRoYXQgPSB0aGlzXG4gICAgdGhpcy5lbGVtZW50ID0gJChlbGVtZW50KVxuICAgIHRoaXMuY2hlY2tBbGwgPSB0aGlzLmVsZW1lbnQuZmluZCgnaW5wdXQuY2hlY2stYWxsJylcbiAgICB0aGlzLmZpbHRlckZvcm0gPSBmaWx0ZXJGb3JtXG4gICAgdGhpcy5yZWRtaW5lQVBJID0gcmVkbWluZUFQSVxuXG4gICAgdGhpcy5maWx0ZXJGb3JtLmV2ZW50TWFuYWdlci5vbigncG9zdFN1Ym1pdCcsIGZ1bmN0aW9uKCkge1xuICAgICAgdGhhdC51cGRhdGUoKVxuICAgIH0pXG5cbiAgICB0aGlzLmNoZWNrQWxsXG4gICAgICAub24oJ2NoYW5nZScsKCkgPT4ge1xuICAgICAgICBjb25zdCBjaGVja2VkID0gJCh0aGF0LmNoZWNrQWxsKS5wcm9wKCdjaGVja2VkJylcbiAgICAgICAgdGhhdC5lbGVtZW50LmZpbmQoJ3Rib2R5IGlucHV0LmNiLWltcG9ydDplbmFibGVkJylcbiAgICAgICAgICAucHJvcCgnY2hlY2tlZCcsIGNoZWNrZWQpXG4gICAgICAgICAgLnRyaWdnZXIoJ2NoYW5nZScpXG4gICAgICB9KVxuICB9XG5cbiAgcHVibGljIHVwZGF0ZSgpIHtcbiAgICBjb25zdCB0aGF0ID0gdGhpc1xuICAgIGNvbnN0IGZpbHRlckZvcm1WYWx1ZXMgPSB0aGlzLmZpbHRlckZvcm0uZ2V0VmFsdWVzKClcblxuICAgIHRoaXMuc2hvd0xvYWRlcigpXG4gICAgdGhpcy5tYWtlRW1wdHkoKVxuXG4gICAgLy8gRGV0ZXJtaW5lIHJlcG9ydCBkYXRlLlxuICAgIGNvbnN0IHNEYXRlID0gZmlsdGVyRm9ybVZhbHVlc1snZGF0ZSddIGFzIHN0cmluZ1xuICAgIGNvbnN0IG9EYXRlID0gZGF0ZXRpbWUuRGF0ZVRpbWUuZnJvbVN0cmluZyhzRGF0ZSlcbiAgICBjb25zdCB3b3Jrc3BhY2VJZCA9IGZpbHRlckZvcm1WYWx1ZXNbJ3RvZ2dsLXdvcmtzcGFjZS1pZCddIGFzIG51bWJlciB8IG51bGxcblxuICAgIHRoaXMudXBkYXRlTGluayhvRGF0ZSwgd29ya3NwYWNlSWQpXG5cbiAgICAvLyBVbmNoZWNrIHRoZSBcImNoZWNrIGFsbFwiIGNoZWNrYm94LlxuICAgIHRoaXMuY2hlY2tBbGxcbiAgICAgIC5wcm9wKCdjaGVja2VkJywgZmFsc2UpXG4gICAgICAuYXR0cignZGlzYWJsZWQnLCAnZGlzYWJsZWQnKVxuXG4gICAgLy8gRmV0Y2ggdGltZSBlbnRyaWVzIGZyb20gVG9nZ2wuXG4gICAgY29uc3QgcXVlcnkgPSB7XG4gICAgICBmcm9tOiBkYXRldGltZS5EYXRlVGltZS5mcm9tU3RyaW5nKHNEYXRlICsgJyAwMDowMDowMCcpLFxuICAgICAgdGlsbDogZGF0ZXRpbWUuRGF0ZVRpbWUuZnJvbVN0cmluZyhzRGF0ZSArICcgMjM6NTk6NTknKSxcbiAgICAgIHdvcmtzcGFjZUlkOiB3b3Jrc3BhY2VJZFxuICAgIH1cbiAgICB0aGlzLnJlZG1pbmVBUEkuZ2V0VG9nZ2xUaW1lRW50cmllcyhxdWVyeSwgKGVudHJpZXM6IG1vZGVscy5LZXllZFRvZ2dsVGltZUVudHJ5Q29sbGVjdGlvbikgPT4ge1xuICAgICAgbGV0IHBlbmRpbmdFbnRyaWVzRXhpc3QgPSBmYWxzZVxuXG4gICAgICAvLyBQcmVwYXJlIHJvdW5kaW5nIHJ1bGVzLlxuICAgICAgY29uc3Qgcm91bmRpbmdWYWx1ZSA9IGZpbHRlckZvcm1WYWx1ZXNbJ3JvdW5kaW5nLXZhbHVlJ10gYXMgbnVtYmVyXG4gICAgICBjb25zdCByb3VuZGluZ01ldGhvZCA9IGZpbHRlckZvcm1WYWx1ZXNbJ3JvdW5kaW5nLW1ldGhvZCddIGFzIGRhdGV0aW1lLkR1cmF0aW9uUm91bmRpbmdNZXRob2RcblxuICAgICAgLy8gVE9ETzogVXNlIGVudHJpZXMubWFwKCkgaW5zdGVhZD9cbiAgICAgIGZvciAoY29uc3Qga2V5IGluIGVudHJpZXMpIHtcbiAgICAgICAgY29uc3QgZW50cnkgPSBlbnRyaWVzW2tleV1cblxuICAgICAgICBlbnRyeS5kdXJhdGlvbiA9IG5ldyBkYXRldGltZS5EdXJhdGlvbihNYXRoLm1heCgwLCBlbnRyeS5kdXJhdGlvbiBhcyBudW1iZXIpKVxuICAgICAgICBlbnRyeS5yb3VuZGVkRHVyYXRpb24gPSBuZXcgZGF0ZXRpbWUuRHVyYXRpb24oZW50cnkuZHVyYXRpb24uc2Vjb25kcylcblxuICAgICAgICAvLyBQcmVwYXJlIHJvdW5kZWQgZHVyYXRpb24gYXMgcGVyIHJvdW5kaW5nIHJ1bGVzLlxuICAgICAgICBpZiAocm91bmRpbmdNZXRob2QgJiYgcm91bmRpbmdWYWx1ZSA+IDApIHtcbiAgICAgICAgICBlbnRyeS5yb3VuZGVkRHVyYXRpb24ucm91bmRUbyhyb3VuZGluZ1ZhbHVlLCByb3VuZGluZ01ldGhvZClcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBlbnRyeS5yb3VuZGVkRHVyYXRpb24ucm91bmRUbygxLCBkYXRldGltZS5EdXJhdGlvblJvdW5kaW5nTWV0aG9kLlJlZ3VsYXIpXG4gICAgICAgIH1cblxuICAgICAgICBlbnRyaWVzW2tleV0gPSBlbnRyeVxuICAgICAgfVxuXG4gICAgICBpZiAoT2JqZWN0LmtleXMoZW50cmllcykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHRoaXMuc2hvd0VtcHR5TWVzc2FnZSgpXG4gICAgICB9XG5cbiAgICAgIC8vIERpc3BsYXkgZW50cmllcyB0aGF0IGFyZSBydW5uaW5nIGF0IHRoZSBtb21lbnQuXG4gICAgICBmb3IgKGNvbnN0IGtleSBpbiBlbnRyaWVzKSB7XG4gICAgICAgIGNvbnN0IGVudHJ5ID0gZW50cmllc1trZXldO1xuICAgICAgICBpZiAoZW50cnkuc3RhdHVzID09PSAncnVubmluZycpIHtcbiAgICAgICAgICBjb25zdCAkdHIgPSByZW5kZXJlcnMucmVuZGVyVG9nZ2xSb3coZW50cnkpO1xuICAgICAgICAgIHRoYXQuZWxlbWVudC5maW5kKCd0Ym9keScpLmFwcGVuZCgkdHIpO1xuICAgICAgICAgIGRlbGV0ZSBlbnRyaWVzW2tleV07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc3Qgc0RlZmF1bHRBY3Rpdml0eUlkID0gZmlsdGVyRm9ybVZhbHVlc1snZGVmYXVsdC1hY3Rpdml0eS1pZCddXG4gICAgICAgID8gZmlsdGVyRm9ybVZhbHVlc1snZGVmYXVsdC1hY3Rpdml0eS1pZCddLnRvU3RyaW5nKCkgOiAnJ1xuXG4gICAgICAvLyBEaXNwbGF5IGVudHJpZXMgZWxpZ2libGUgZm9yIGltcG9ydC5cbiAgICAgIGZvciAoY29uc3Qga2V5IGluIGVudHJpZXMpIHtcbiAgICAgICAgY29uc3QgZW50cnkgPSBlbnRyaWVzW2tleV07XG4gICAgICAgIGlmIChlbnRyeS5zdGF0dXMgPT09ICdwZW5kaW5nJyAmJiBlbnRyeS5lcnJvcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgY29uc3QgJHRyID0gcmVuZGVyZXJzLnJlbmRlclRvZ2dsUm93KGVudHJ5KTtcbiAgICAgICAgICB0aGF0LmVsZW1lbnQuZmluZCgndGJvZHknKS5hcHBlbmQoJHRyKTtcbiAgICAgICAgICBwZW5kaW5nRW50cmllc0V4aXN0ID0gdHJ1ZVxuXG4gICAgICAgICAgJHRyLmZpbmQoJ2lucHV0W2RhdGEtcHJvcGVydHk9aG91cnNdJylcbiAgICAgICAgICAgIC5vbignaW5wdXQgY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgICB0aGF0LnVwZGF0ZVRvdGFsKClcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAkdHIuZmluZCgnc2VsZWN0W2RhdGEtcHJvcGVydHk9YWN0aXZpdHlfaWRdJylcbiAgICAgICAgICAgIC5hdHRyKCdkYXRhLXNlbGVjdGVkJywgc0RlZmF1bHRBY3Rpdml0eUlkKVxuXG4gICAgICAgICAgJHRyLmZpbmQoJy5jYi1pbXBvcnQnKVxuICAgICAgICAgICAgLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICAgIHRoYXQudXBkYXRlVG90YWwoKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBEaXNwbGF5IGVudHJpZXMgbm90IGVsaWdpYmxlIGZvciBpbXBvcnQuXG4gICAgICBmb3IgKGNvbnN0IGtleSBpbiBlbnRyaWVzKSB7XG4gICAgICAgIGNvbnN0IGVudHJ5ID0gZW50cmllc1trZXldO1xuICAgICAgICBpZiAoZW50cnkuc3RhdHVzID09PSAncGVuZGluZycgJiYgZW50cnkuZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBjb25zdCAkdHIgPSByZW5kZXJlcnMucmVuZGVyVG9nZ2xSb3coZW50cnkpO1xuICAgICAgICAgIHRoYXQuZWxlbWVudC5maW5kKCd0Ym9keScpLmFwcGVuZCgkdHIpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIERpc3BsYXkgZW50cmllcyB3aGljaCBhcmUgYWxyZWFkeSBpbXBvcnQuXG4gICAgICBmb3IgKGNvbnN0IGtleSBpbiBlbnRyaWVzKSB7XG4gICAgICAgIGNvbnN0IGVudHJ5ID0gZW50cmllc1trZXldO1xuICAgICAgICBpZiAoZW50cnkuc3RhdHVzID09PSAnaW1wb3J0ZWQnKSB7XG4gICAgICAgICAgY29uc3QgJHRyID0gcmVuZGVyZXJzLnJlbmRlclRvZ2dsUm93KGVudHJ5KTtcbiAgICAgICAgICB0aGF0LmVsZW1lbnQuZmluZCgndGJvZHknKS5hcHBlbmQoJHRyKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGF0LnVwZGF0ZVRvdGFsKClcbiAgICAgIHdpZGdldC5pbml0aWFsaXplKHRoYXQuZWxlbWVudFswXSlcbiAgICAgIHRoYXQuaGlkZUxvYWRlcigpXG5cbiAgICAgIGlmICghcGVuZGluZ0VudHJpZXNFeGlzdCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgdGhhdC5jaGVja0FsbC5yZW1vdmVBdHRyKCdkaXNhYmxlZCcpXG5cbiAgICAgIC8vIElmIHRoZSB1cGRhdGUgd2FzIHRyaWdnZXJlZCBmcm9tIHRoZSBmaWx0ZXIgZm9ybSwgdGhlbiBmb2N1cyB0aGVcbiAgICAgIC8vIFwiY2hlY2stYWxsXCIgYnV0dG9uIHRvIGFsbG93IGVhc2llciBrZXlib2FyZCBuYXZpZ2F0aW9uLlxuICAgICAgaWYgKHRoYXQuZmlsdGVyRm9ybS5lbGVtZW50LmhhcygnOmZvY3VzJykubGVuZ3RoID4gMCkge1xuICAgICAgICB0aGF0LmNoZWNrQWxsLnRyaWdnZXIoJ2ZvY3VzJylcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgdGhlIGxpbmsgdG8gdGhlIFRvZ2dsIHJlcG9ydCBwYWdlLlxuICAgKlxuICAgKiBAcGFyYW0gZGF0ZVxuICAgKiAgIFJlcG9ydCBkYXRlLlxuICAgKiBAcGFyYW0gd29ya3NwYWNlSWRcbiAgICogICBUb2dnbCB3b3Jrc3BhY2UgSUQuXG4gICAqL1xuICBwcml2YXRlIHVwZGF0ZUxpbmsoZGF0ZTogZGF0ZXRpbWUuRGF0ZVRpbWUsIHdvcmtzcGFjZUlkOiBudW1iZXIgfCBudWxsKSB7XG4gICAgLy8gVG9nZ2wgMi4wIGhhcyBubyByZXBvcnQgVVJMIHRvIGxpbmsgdG8sIHNvIGtlZXAgdGhlIGRlZmF1bHQgbGluay5cbiAgICBpZiAoJCgnI3RvZ2dsLXJlcG9ydC1saW5rJykuZGF0YSgnc291cmNlJykgIT09ICd0cmFjaycpIHJldHVyblxuXG4gICAgd29ya3NwYWNlSWQgPSB3b3Jrc3BhY2VJZCB8fCAwXG4gICAgY29uc3QgdXJsID0gYGh0dHBzOi8vdHJhY2sudG9nZ2wuY29tL3JlcG9ydHMvc3VtbWFyeS8ke3dvcmtzcGFjZUlkfS9mcm9tLyR7ZGF0ZS50b0hUTUxEYXRlU3RyaW5nKCl9L3RvLyR7ZGF0ZS50b0hUTUxEYXRlU3RyaW5nKCl9YFxuICAgICQoJyN0b2dnbC1yZXBvcnQtbGluaycpLmF0dHIoJ2hyZWYnLCB1cmwpXG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlcyB0aGUgdG90YWwgaW4gdGhlIFJlZG1pbmUgcmVwb3J0IGZvb3Rlci5cbiAgICovXG4gIHByaXZhdGUgdXBkYXRlVG90YWwoKSB7XG4gICAgY29uc3QgdG90YWwgPSBuZXcgZGF0ZXRpbWUuRHVyYXRpb24oKVxuXG4gICAgLy8gSXRlcmF0ZSBvdmVyIGFsbCByb3dzIGFuZCBhZGQgdGhlIGhvdXJzLlxuICAgIHRoaXMuZWxlbWVudC5maW5kKCd0Ym9keSB0cicpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgY29uc3QgJHRyID0gJCh0aGlzKVxuICAgICAgY29uc3QgZHVyID0gbmV3IGRhdGV0aW1lLkR1cmF0aW9uKClcblxuICAgICAgLy8gSWdub3JlIGVycm9uZW91cyByb3dzLlxuICAgICAgaWYgKCR0ci5oYXNDbGFzcygndDJyLWVycm9yJykpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIC8vIElnbm9yZSB1bmNoZWNrZWQgcm93cy5cbiAgICAgIGlmICghJHRyLmZpbmQoJy5jYi1pbXBvcnQnKS5pcygnOmNoZWNrZWQnKSkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgLy8gUGFyc2UgdGhlIGlucHV0IGFzIHRpbWUgYW5kIGFkZCBpdCB0byB0aGUgdG90YWwuXG4gICAgICBjb25zdCBob3VycyA9ICR0ci5maW5kKCdbZGF0YS1wcm9wZXJ0eT1cImhvdXJzXCJdJykudmFsKCkgYXMgc3RyaW5nXG4gICAgICB0cnkge1xuICAgICAgICAvLyBBc3N1bWUgdGltZSB0byBiZSBob3VycyBhbmQgbWludXRlcy5cbiAgICAgICAgZHVyLnNldEhITU0oaG91cnMpO1xuICAgICAgICB0b3RhbC5hZGQoZHVyKTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgfVxuICAgIH0pXG5cbiAgICB0aGlzLmVsZW1lbnQuZmluZCgnW2RhdGEtcHJvcGVydHk9XCJ0b3RhbC1ob3Vyc1wiXScpLmh0bWwodG90YWwuYXNISE1NKCkpXG4gIH1cblxuICBwdWJsaWMgc2hvd0VtcHR5TWVzc2FnZSgpIHtcbiAgICBjb25zdCBjb2xzcGFuID0gdGhpcy5lbGVtZW50LmZpbmQoJ3RoZWFkIHRyOmZpcnN0IHRoJykubGVuZ3RoXG4gICAgY29uc3QgbWVzc2FnZSA9IHQoJ3Qyci5lcnJvci5saXN0X2VtcHR5JylcbiAgICBjb25zdCBtYXJrdXAgPSBgPHRyPjx0ZCBjb2xzcGFuPVwiJHtjb2xzcGFufVwiPiR7bWVzc2FnZX08L3RkPjwvdHI+YFxuICAgIHRoaXMuZWxlbWVudC5maW5kKCd0Ym9keScpLmh0bWwobWFya3VwKTtcbiAgfVxuXG4gIHByaXZhdGUgbWFrZUVtcHR5KCkge1xuICAgIHRoaXMuZWxlbWVudC5maW5kKCd0Ym9keScpLmh0bWwoJycpXG4gIH1cblxuICBwdWJsaWMgc2hvd0xvYWRlcigpIHtcbiAgICB0aGlzLmVsZW1lbnQuYWRkQ2xhc3MoJ3Qyci1sb2FkaW5nJylcbiAgfVxuXG4gIHB1YmxpYyBoaWRlTG9hZGVyKCkge1xuICAgIHRoaXMuZWxlbWVudC5yZW1vdmVDbGFzcygndDJyLWxvYWRpbmcnKVxuICB9XG59XG5cbmNsYXNzIEFwcGxpY2F0aW9uIHtcblxuICAvKipcbiAgICogQnJvd3NlciBzdG9yYWdlLlxuICAgKi9cbiAgcmVhZG9ubHkgbG9jYWxTdG9yYWdlOiBMb2NhbFN0b3JhZ2VcblxuICByZWFkb25seSByZWRtaW5lQVBJOiBSZWRtaW5lQVBJU2VydmljZVxuXG4gIC8qKlxuICAgKiBUaGUgZm9ybSBjb250YWluaW5nIGZpbHRlcnMgYW5kIG9wdGlvbnMuXG4gICAqL1xuICByZWFkb25seSBmaWx0ZXJGb3JtOiBGaWx0ZXJGb3JtXG5cbiAgLyoqXG4gICAqIFRoZSBmb3JtIGNvbnRhaW5pbmcgdGhlIFwiaW1wb3J0IHRvIHJlZG1pbmVcIiBidXR0b24uXG4gICAqL1xuICByZWFkb25seSBpbXBvcnRGb3JtOiBJbXBvcnRGb3JtXG5cbiAgLyoqXG4gICAqIFRoZSB0YWJsZSBjb250YWluaW5nIFJlZG1pbmUgdGltZSBlbnRyaWVzLlxuICAgKi9cbiAgcmVhZG9ubHkgcmVkbWluZVJlcG9ydDogUmVkbWluZVJlcG9ydFxuXG4gIC8qKlxuICAgKiBUaGUgdGFibGUgY29udGFpbmluZyBUb2dnbCB0aW1lIGVudHJpZXMuXG4gICAqL1xuICByZWFkb25seSB0b2dnbFJlcG9ydDogVG9nZ2xSZXBvcnRcblxuICBzdGF0aWMgX2luc3RhbmNlPzogQXBwbGljYXRpb25cblxuICBwdWJsaWMgY29uc3RydWN0b3IoXG4gICAgcmVkbWluZUFQSTogUmVkbWluZUFQSVNlcnZpY2UsXG4gICAgbG9jYWxTdG9yYWdlOiBMb2NhbFN0b3JhZ2UgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQsXG4gICAgZmlsdGVyRm9ybTogRmlsdGVyRm9ybSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZCxcbiAgICByZWRtaW5lUmVwb3J0OiBSZWRtaW5lUmVwb3J0IHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkLFxuICAgIHRvZ2dsUmVwb3J0OiBUb2dnbFJlcG9ydCB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZCxcbiAgICBpbXBvcnRGb3JtOiBJbXBvcnRGb3JtIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkXG4gICkge1xuICAgIHRoaXMucmVkbWluZUFQSSA9IHJlZG1pbmVBUElcbiAgICB0aGlzLmxvY2FsU3RvcmFnZSA9IGxvY2FsU3RvcmFnZSB8fCBuZXcgTG9jYWxTdG9yYWdlKCd0b2dnbDJyZWRtaW5lLicpXG4gICAgdGhpcy5maWx0ZXJGb3JtID0gZmlsdGVyRm9ybSB8fCBuZXcgRmlsdGVyRm9ybShcbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmaWx0ZXItZm9ybScpIGFzIEhUTUxFbGVtZW50LFxuICAgICAgdGhpcy5sb2NhbFN0b3JhZ2VcbiAgICApXG4gICAgdGhpcy5yZWRtaW5lUmVwb3J0ID0gcmVkbWluZVJlcG9ydCB8fCBuZXcgUmVkbWluZVJlcG9ydChcbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZWRtaW5lLXJlcG9ydCcpIGFzIEhUTUxFbGVtZW50LFxuICAgICAgdGhpcy5maWx0ZXJGb3JtLFxuICAgICAgdGhpcy5yZWRtaW5lQVBJXG4gICAgKVxuICAgIHRoaXMudG9nZ2xSZXBvcnQgPSB0b2dnbFJlcG9ydCB8fCBuZXcgVG9nZ2xSZXBvcnQoXG4gICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndG9nZ2wtcmVwb3J0JykgYXMgSFRNTEVsZW1lbnQsXG4gICAgICB0aGlzLmZpbHRlckZvcm0sXG4gICAgICB0aGlzLnJlZG1pbmVBUElcbiAgICApXG4gICAgdGhpcy5pbXBvcnRGb3JtID0gaW1wb3J0Rm9ybSB8fCBuZXcgSW1wb3J0Rm9ybShcbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdpbXBvcnQtZm9ybScpIGFzIEhUTUxFbGVtZW50LFxuICAgICAgdGhpcy5maWx0ZXJGb3JtLFxuICAgICAgdGhpcy5yZWRtaW5lQVBJLFxuICAgICAgdGhpcy5yZWRtaW5lUmVwb3J0LFxuICAgICAgdGhpcy50b2dnbFJlcG9ydFxuICAgIClcbiAgfVxuXG4gIHN0YXRpYyBpbnN0YW5jZSgpOiBBcHBsaWNhdGlvbiB7XG4gICAgaWYgKCFBcHBsaWNhdGlvbi5faW5zdGFuY2UpIHtcbiAgICAgIEFwcGxpY2F0aW9uLl9pbnN0YW5jZSA9IG5ldyBBcHBsaWNhdGlvbihcbiAgICAgICAgbmV3IFJlZG1pbmVBUElTZXJ2aWNlKFQyUl9SRURNSU5FX0FQSV9LRVkpXG4gICAgICApXG4gICAgfVxuXG4gICAgcmV0dXJuIEFwcGxpY2F0aW9uLl9pbnN0YW5jZSBhcyBBcHBsaWNhdGlvblxuICB9XG5cbiAgcHVibGljIGluaXRpYWxpemUoKSB7XG4gICAgdGhpcy5maWx0ZXJGb3JtLnJlc2V0KHsgZGF0ZTogdXRpbHMuZ2V0RGF0ZUZyb21Mb2NhdGlvbkhhc2goKSB9KVxuICB9XG5cbn1cblxuLyoqXG4gKiBFeGVjdXRlIHRoZSBUb2dnbDJSZWRtaW5lIGFwcGxpY2F0aW9uLlxuICovXG4kKCgpID0+IHtcbiAgd2lkZ2V0LmluaXRpYWxpemUoKVxuICBBcHBsaWNhdGlvbi5pbnN0YW5jZSgpLmluaXRpYWxpemUoKVxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFLTyxJQUFNLGVBQU4sTUFBbUI7QUFBQSxFQUd4QixZQUFZLFFBQWdCO0FBQzFCLFNBQUssVUFBVTtBQUVmLFFBQUksT0FBTyxPQUFPLGNBQWMsTUFBTSxhQUFhO0FBQ2pELFlBQU0sSUFBSSxNQUFNLHVDQUF1QztBQUFBLElBQ3pEO0FBQUEsRUFDRjtBQUFBLEVBRUEsSUFBSSxTQUFpQjtBQUNuQixXQUFPLEtBQUs7QUFBQSxF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TyxFQUFFLEtBQUssTUFBTTtBQUFBLEVBQ3hDO0FBQUEsRUFFUSxZQUFZO0FBQ2xCLFNBQUssUUFBUSxLQUFLLE9BQU8sRUFBRSxLQUFLLEVBQUU7QUFBQSxFQUNwQztBQUFBLEVBRU8sYUFBYTtBQUNsQixTQUFLLFFBQVEsU0FBUyxhQUFhO0FBQUEsRUFDckM7QUFBQSxFQUVPLGFBQWE7QUFDbEIsU0FBSyxRQUFRLFlBQVksYUFBYTtBQUFBLEVBQ3hDO0FBQ0Y7QUFFQSxJQUFNLGNBQU4sTUFBTSxhQUFZO0FBQUEsRUErQlQsWUFDTCxZQUNBLGVBQXlDLFFBQ3pDLGFBQXFDLFFBQ3JDLGdCQUEyQyxRQUMzQyxjQUF1QyxRQUN2QyxhQUFxQyxRQUNyQztBQUNBLFNBQUssYUFBYTtBQUNsQixTQUFLLGVBQWUsZ0JBQWdCLElBQUksYUFBYSxnQkFBZ0I7QUFDckUsU0FBSyxhQUFhLGNBQWMsSUFBSTtBQUFBLE1BQ2xDLFNBQVMsZUFBZSxhQUFhO0FBQUEsTUFDckMsS0FBSztBQUFBLElBQ1A7QUFDQSxTQUFLLGdCQUFnQixpQkFBaUIsSUFBSTtBQUFBLE1BQ3hDLFNBQVMsZUFBZSxnQkFBZ0I7QUFBQSxNQUN4QyxLQUFLO0FBQUEsTUFDTCxLQUFLO0FBQUEsSUFDUDtBQUNBLFNBQUssY0FBYyxlQUFlLElBQUk7QUFBQSxNQUNwQyxTQUFTLGVBQWUsY0FBYztBQUFBLE1BQ3RDLEtBQUs7QUFBQSxNQUNMLEtBQUs7QUFBQSxJQUNQO0FBQ0EsU0FBSyxhQUFhLGNBQWMsSUFBSTtBQUFBLE1BQ2xDLFNBQVMsZUFBZSxhQUFhO0FBQUEsTUFDckMsS0FBSztBQUFBLE1BQ0wsS0FBSztBQUFBLE1BQ0wsS0FBSztBQUFBLE1BQ0wsS0FBSztBQUFBLElBQ1A7QUFBQSxFQUNGO0FBQUEsRUFFQSxPQUFPLFdBQXdCO0FBQzdCLFFBQUksQ0FBQyxhQUFZLFdBQVc7QUFDMUIsbUJBQVksWUFBWSxJQUFJO0FBQUEsUUFDMUIsSUFBSSxrQkFBa0IsbUJBQW1CO0FBQUEsTUFDM0M7QUFBQSxJQUNGO0FBRUEsV0FBTyxhQUFZO0FBQUEsRUFDckI7QUFBQSxFQUVPLGFBQWE7QUFDbEIsU0FBSyxXQUFXLE1BQU0sRUFBRSxNQUFZLHdCQUF3QixFQUFFLENBQUM7QUFBQSxFQUNqRTtBQUVGO0FBS0EsRUFBRSxNQUFNO0FBQ04sRUFBTyxXQUFXO0FBQ2xCLGNBQVksU0FBUyxFQUFFLFdBQVc7QUFDcEMsQ0FBQzsiLAogICJuYW1lcyI6IFsiZXJyb3IiLCAid29ya3NwYWNlcyIsICJlIiwgInN0YXR1c0xhYmVsIiwgIm1lc3NhZ2UiXQp9Cg==
