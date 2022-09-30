import fs from "fs";
import dayjs from "dayjs";
import dotenv from "dotenv";
import { URL } from "url";
dotenv.config();

const regExForLinks =
  /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
const [date, month, year] = process.env.FIRST_DAY.split("/"); // first day of the report
const leaveDays = JSON.parse(process.env.LEAVE_DAYS); // off days

// fast generate time tracker by automatically add 1 day when detect a new link-like line, basically, 1 link for 1 day of work
const generateReportFast = async () => {
  try {
    const data = await fs.promises.readFile("fast.txt", { encoding: "utf-8" });
    const dataArray = data.split(/\r?\n/).filter(Boolean);

    let currentDate = dayjs()
      .set("date", +date)
      .set("month", +month - 1)
      .set("years", +year || dayjs().get("years"));

    let content = "";
    dataArray.forEach((d) => {
      const isLink = regExForLinks.test(d);
      if (isLink) {
        content += `${currentDate.format("DD/MM").toString()}\n${d}\n`;
        do {
          currentDate = currentDate.add(1, "day");
        } while (
          [0, 6].includes(currentDate.get("day")) ||
          leaveDays.some((day) => {
            const [dateIgnore, monthIgnore, yearIgnore] = day.split("/");

            let leaveDay = dayjs()
              .set("date", +dateIgnore)
              .set("month", +monthIgnore - 1)
              .set("years", +yearIgnore || dayjs().get("years"));

            return currentDate.toString() === leaveDay.toString();
          })
        );
      } else {
        content += `${d}\n`;
      }
    });
    await fs.promises.writeFile(
      new URL("timetrack.txt", import.meta.url).pathname,
      content
    );
  } catch (error) {
    console.log(error);
  }
};
// generateReportFast();
export default generateReportFast;
