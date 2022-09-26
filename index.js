require('dotenv').config();
const { default: axios } = require("axios");
const fs = require("fs");
const compact = require("lodash/compact");
const flatten = require("lodash/flatten");
const moment = require("moment");
const generateReportFast = require("./generateReportFast");
const baseURL = "https://time-tracker.zigvy.com/api/v1/";
const projectIds = {
  flaia: "bmSpbkmwizGsaCqAD",
  efinop: "FDn8hrSKA6GTNZD9x",
  hrforte: "GpEuPumiQTJ6xoftb",
  freelancer: "MkbeG9mmhrNJksFrr",
};
const DEFAULT_TIME = "8h";
const DAYS = ["mon", "tues", "wed", "thu", "fri", "sat", "sun"];
// --------------- IMPORTANT READ ---------------------------
// SET .ENV FOR EMAIL, PASSWORD, PROJECT, START_DATE AND LEAVE_DAYS (["2/9"] for example)
// ----------------------------------------------------------
// -- Personal info -----------------------
const email = process.env.EMAIL;
const password = process.env.PASSWORD;
const project = process.env.PROJECT
const startDate = process.env.START_DATE
const isFast = true; // Use fast report generate: check fast.txt for report format that would be much faster to generate compared to the timetrack.txt
// ----------------------------------------------
const instance = axios.create({
  baseURL,
});
const regExForDays = /^(Mon|Tue|Wed|Thur|Fri|Sat|Sun)/gi;
// const regExForLinks = /^(http|https).*(github|codecommit)/
const regExForDate = /^(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[012])$/;
// const regExForDate = /^\d{1,2}\/\d{1,2}/;
const regExForLinks = /^(http|https).*/;
const regExForIssueDuration = /(-\s*\d+(.\d+|\d*)h|\(\d+(.\d+|\d*)h\))/;

const startOfWeek = moment(startDate, "DD/MM").startOf("week");
(async () => {
  if (isFast) await generateReportFast();
  try {
    const timeTrackData = await fs.promises.readFile("timetrack.txt", "utf-8");
    const array = [];
    let dataArraySplitByNewLine = compact(timeTrackData.split(/\r?\n/));
    let skipIndex = -1;
    const length = dataArraySplitByNewLine.length - 1;
    dataArraySplitByNewLine.forEach((line, i) => {
      if (i <= skipIndex) return;

      if (
        i + 1 <= length &&
        dataArraySplitByNewLine[i + 1].startsWith("-") &&
        !regExForLinks.test(line)
      ) {
        let index = line.lastIndexOf("-");
        let description = line.trim();
        let time = DEFAULT_TIME;
        if (index !== -1 && regExForIssueDuration.test(line)) {
          description = line.slice(0, index).trim();
          
          time = line.slice(index + 1).trim();
        }
        skipIndex = i;
        while (
          i !== length && dataArraySplitByNewLine[skipIndex + 1] &&
          dataArraySplitByNewLine[skipIndex + 1].startsWith("-")
        ) {
          description = description + "\n" + dataArraySplitByNewLine[i + 1];
          skipIndex++;
        }

        array.push(description + " - " + time);
      } else {
        if (
          regExForDate.test(line) ||
          regExForLinks.test(line) ||
          (regExForIssueDuration.test(line) && !line.startsWith("-"))
        ) {
          
          array.push(line);
        } else array.push(line + " - " + DEFAULT_TIME);
      }
    });
    dataArraySplitByNewLine = [...array];

    const entriesByDays = {};
    let currentDate = "";
    let currentTime = "09:00";
    const entries = [];
    dataArraySplitByNewLine.forEach((data) => {
      const dateFromData = data.match(regExForDate)?.[0];
      if (dateFromData) {
        entriesByDays[dateFromData] = [];
        currentDate = dateFromData;
        currentTime = "09:00";
        return;
      }
      const currentEntry = entriesByDays[currentDate];
      const entryLink = data.match(regExForLinks)?.[0];
      if (entryLink) {
        currentEntry.push({ issue: entryLink });
        return;
      }
      let currentEntryWithinDate = currentEntry[currentEntry.length - 1];
      const timeMatch = data.match(regExForIssueDuration);

      if (!timeMatch) return;
      const time = timeMatch[0].replace(/[^\d.]/g, "");
      if (currentEntryWithinDate.start && currentEntryWithinDate.end) {
        currentEntry.push({
          issue: currentEntryWithinDate.issue,
        });
        currentEntryWithinDate = currentEntry[currentEntry.length - 1];
      }
      // console.log('CURRENT', currentEntryWithinDate)
      currentEntryWithinDate.start = currentTime;
      currentTime = moment(currentTime, "HH:mm")
        .add(time, "hours")
        .format("HH:mm");
      currentEntryWithinDate.end = currentTime;
      const description = data.substring(0, timeMatch["index"]);
      currentEntryWithinDate.description = description;
      currentEntryWithinDate.dateSelected = moment(currentDate, "DD/MM").format(
        "YYYY-MM-DD"
      );
    });
    const result = flatten(Object.values(entriesByDays));
    const {
      data: {
        data: { authToken, userId },
      },
    } = await instance.post("/login", {
      email,
      password,
    });
    const res = await instance.post(
      "/timetracking",
      {
        projectId: projectIds[project],
        entries: result,
      },
      {
        headers: {
          "X-Auth-Token": authToken,
          "X-User-Id": userId,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("res ", res.data);
  } catch (error) {
    console.log(error);
  }
})();
