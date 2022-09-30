import axios from "axios";
import fs from "fs";
import dayjs from "dayjs";
import dotenv from "dotenv";
import generateReportFast from "./generateReportFast.js";
dotenv.config();
const BASE_URL = "https://time-tracker.zigvy.com/api/v1/";
const START_TIME = "09:00";
const END_TIME = "17:00";
const projectIds = {
    flaia: "bmSpbkmwizGsaCqAD",
    efinop: "FDn8hrSKA6GTNZD9x",
    hrforte: "GpEuPumiQTJ6xoftb",
    freelancer: "MkbeG9mmhrNJksFrr",
};
const DAYS = ["mon", "tues", "wed", "thu", "fri", "sat", "sun"];
// -- Personal info -----------------------
const project = process.env
    .PROJECT; // project of your choice which should match projectIds properties
const email = process.env.EMAIl;
const password = process.env.PASSWORD;
const isFast = true;
// ----------------------------------------------
const instance = axios.create({
    baseURL: BASE_URL,
});
const regExForDate = /^([0-2][0-9]|(3)[0-1])(\/)(((0?)[0-9])|((1)[0-2]))(\/?)(\d{4})?$/;
const regExForLinks = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
const regExForHours = /^(2[0-3]|[01]?[0-9])h/; //00-24h
(async () => {
    try {
        if (isFast)
            await generateReportFast();
        const timeTrackData = await fs.promises.readFile("timetrack.txt", "utf-8");
        const resetObject = {
            description: "",
            start: START_TIME,
            end: END_TIME,
        };
        const array = [];
        let index = 0;
        let dataArraySplitByNewLine = timeTrackData
            .split(/\r?\n/)
            .filter(Boolean);
        let object = { ...resetObject };
        dataArraySplitByNewLine.forEach((line, i) => {
            line = line.trim();
            const next = dataArraySplitByNewLine[i + 1];
            if (regExForDate.test(line)) {
                const [date, month] = line.split("/");
                object.dateSelected = dayjs()
                    .set("date", +date)
                    .set("month", +month - 1)
                    .format("YYYY-MM-DD");
            }
            else if (regExForLinks.test(line)) {
                object.issue = line;
            }
            else {
                object.description = object.description + line + "\n";
            }
            if (regExForDate.test(next) || i === dataArraySplitByNewLine.length - 1) {
                const arrayDescription = object.description.split("\n");
                let totalTime = arrayDescription.reduce((pre, curr) => {
                    let time = curr.split("-").slice(-1)[0].trim();
                    if (time && regExForHours.test(time.toString())) {
                        time = time.replace("h", "");
                        return pre + Number(time);
                    }
                    return pre;
                }, 0);
                const startTime = Number(object.start.split(":")[0]);
                totalTime = startTime + Number(totalTime);
                const [firstLineOfDescription] = arrayDescription;
                let endTime = firstLineOfDescription.split("-").slice(-1)[0].trim();
                if (endTime && regExForHours.test(endTime.toString())) {
                    object.end = `${totalTime}:00`;
                }
                else {
                    object.end = END_TIME;
                }
                array.push(object);
                object = { ...resetObject };
                index = index + 1;
            }
        });
        const { data: { data: { authToken, userId }, }, } = await instance.post("/login", {
            email,
            password,
        });
        const { data } = await instance.post("/timetracking", {
            projectId: projectIds[project],
            entries: array,
        }, {
            headers: {
                "X-Auth-Token": authToken,
                "X-User-Id": userId,
                "Content-Type": "application/json",
            },
        });
        console.log("result", data);
    }
    catch (error) {
        console.log(error);
    }
})();
