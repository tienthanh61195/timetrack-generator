const { default: axios } = require('axios');
const fs = require('fs');
const { compact, flatten } = require('lodash');
const moment = require('moment')
const baseURL = 'https://time-tracker.zigvy.com/api/v1/'
const projectIds = {
  flaia: 'bmSpbkmwizGsaCqAD',
  efinop: 'FDn8hrSKA6GTNZD9x',
  hrforte: 'GpEuPumiQTJ6xoftb',
  freelancer: 'MkbeG9mmhrNJksFrr',
}
const DAYS = ['mon', 'tues', 'wed', 'thu', 'fri', 'sat', 'sun']

// -- Personal info -----------------------
const project = 'flaia'
const startDate = '14/05';
const email = ''
const password = ''
// ----------------------------------------------
const instance = axios.create({
  baseURL,
})
/*
{
  projectId: String
  entries: [
    {
       issue: String // URL
       date: "YYYY-MM-DD"
       from: "hh:mm"
       to: "hh:mm"
       description: String
    },
    {
       issue: String // URL
       date: "YYYY-MM-DD"
       from: "hh:mm"
       to: "hh:mm"
       description: String
    }
  ]
}
*/

const regExForDays = /^(Mon|Tue|Wed|Thur|Fri|Sat|Sun)/gi
// const regExForLinks = /^(http|https).*(github|codecommit)/
const regExForDate = /^\d{1,2}\/\d{1,2}/
const regExForLinks = /^(http|https).*/
const regExForIssueDuration = /(-\s*\d+(.\d+|\d*)h|\(\d+(.\d+|\d*)h\))/

const startOfWeek = moment(startDate, 'DD/MM').startOf('week');



const x = fs.readFile('timetrack.txt', 'utf-8', (err, timeTrackData) => {
  if (err) return;
  const weekCount = []
  const dataArraySplitByNewLine = compact(timeTrackData.split(/[\n\r]/));
  const entriesByDays = {};
  let currentDate = '';
  let currentTime = '09:00';
  const entries = [];
  dataArraySplitByNewLine.forEach(data => {
    // const dateFromData = data.match(regExForDays)?.[0]?.toLowerCase();
    // if (dateFromData) {
    //   weekCount[DAYS[dateFromData]] = !isNumber(weekCount[DAYS[dateFromData]]) ? 0 : (weekCount[DAYS[dateFromData]] + 1);

    // }
    const dateFromData = data.match(regExForDate)?.[0];
    if (dateFromData) {
      // entriesByDays[dateFromData] = ({
      //   date: moment(dateFromData, 'DD/MM').format('YYYY-MM-DD'),
      // })
      entriesByDays[dateFromData] = []
      currentDate = dateFromData
      currentTime = '09:00'
      return
    }
    const currentEntry = entriesByDays[currentDate];
    const entryLink = data.match(regExForLinks)?.[0];
    if (entryLink) {
      currentEntry.push({ issue: entryLink })
      return
    }
    let currentEntryWithinDate = currentEntry[currentEntry.length - 1];
    const timeMatch = data.match(regExForIssueDuration)
    // console.log('TIME MATCH', timeMatch, data)
    if (!timeMatch) return
    const time = timeMatch[0].replace(/[^\d.]/g, '');
    if (currentEntryWithinDate.start && currentEntryWithinDate.end) {
      currentEntry.push({
        issue: currentEntryWithinDate.issue,
      })
      currentEntryWithinDate = currentEntry[currentEntry.length - 1];
    }
    // console.log('CURRENT', currentEntryWithinDate)
    currentEntryWithinDate.start = currentTime
    currentTime = moment(currentTime, 'HH:mm').add(time, 'hours').format('HH:mm')
    currentEntryWithinDate.end = currentTime
    const description = data.substring(0, timeMatch['index']);
    currentEntryWithinDate.description = description;
    currentEntryWithinDate.dateSelected = moment(currentDate, 'DD/MM').format('YYYY-MM-DD')
  })
  const result = flatten(Object.values(entriesByDays))

  // TIME TRACK LOGIN API
  // instance.post('/login', {
  //   email: 'thanhnt@zigvy.com',
  //   password: 'Nightmare95'
  // }).then(response => {
  //   const {authToken, userId} = response.data.data;
  //   instance.post('/timetracking', {
  //     projectId: projectIds[project],
  //     entries: result
  //   }, {
  //     headers: {
  //       'X-Auth-Token': authToken,
  //       'X-User-Id': userId,
  //       'Content-Type': 'application/json'
  //     }}).then(res => {
  //       console.log('res ', res.data)
  //     });
  // })
})

