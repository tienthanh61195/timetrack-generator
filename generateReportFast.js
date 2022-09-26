require('dotenv').config();
const fs  = require("fs");
const moment = require("moment");
const path = require("path");
const regExForLinks = /^(http|https).*/;
const firstDay = process.env.FIRST_DAY; // first day of the report
const leaveDays = JSON.parse(process.env.LEAVE_DAYS); // off days
// fast generate time tracker by automatically add 1 day when detect a new link-like line, basically, 1 link for 1 day of work
module.exports = async () => {
  fs.readFile('fast.txt', {encoding: 'utf-8'}, (err, data) => {
  const dataArray = data.split('\n');
  let currentDate = moment(firstDay, 'DD/MM');
  let content = '';
  dataArray.forEach(d => {
    const isLink = regExForLinks.test(d);
    if (isLink) {
      content+=`${currentDate.format('DD/MM').toString()}\n${d}\n`
      do {
        currentDate = currentDate.add(1, 'day')
      } while ([0, 6].includes(currentDate.get('day')) || leaveDays.some(day => {        
        return currentDate.toString() === moment(day, 'DD/MM').toString()
      }))
    } else {
      content+=`${d}\n`
    }
  })
  fs.writeFile(path.join(__dirname, 'timetrack.txt'), content,() => {});
})}