//===================User config to be changed===================//
const pincodesToCheck = ['600095', '600096', '600100', '600116'];
const vaccinesToCheck = ['COVAXIN'];
const districtIdToCheck = 571;
const minutesToCheckFor = 1;
const ageToCheckFor = 18; //45 or 18 only
const dose = 1; //1 or 2 for specific, 0 for any dose
const dateToCheckFor = '08-06-2021'; //null for all possible dates

//====================Start of program DO NOT MODIFY UNLESS YOU KNOW WHAT YOU ARE DOING=====================

const axios = require('axios');
const moment = require('moment');
const notifier = require('node-notifier');
const cron = require('node-cron');

const NO_VACCINE_ALERT_FREQUENCY = 60;
let noVaccineResponseCount = 0;
let availableSlotsField = dose > 0 ? `available_capacity_dose${dose}` : 'available_capacity';

let minutesToCheck = minutesToCheckFor < 1 ? 1 : minutesToCheckFor;

axios.defaults.headers.common['User-Agent'] = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:88.0) Gecko/20100101 Firefox/88.0";
axios.defaults.headers.common['Cache-Control'] = 'no-cache';
axios.defaults.headers.common['Pragma'] = 'no-cache';
axios.defaults.headers.common['Expires'] = 0;

const baseUrl = 'https://cdn-api.co-vin.in/api/v2';
const getByPinPath = 'appointment/sessions/public/calendarByPin';
const getByDistrictPath = 'appointment/sessions/public/calendarByDistrict';

function isObjectEligible(session) {
    return session['min_age_limit'] === ageToCheckFor
        && session[availableSlotsField] > 1
        && (dateToCheckFor ? session['date'] === dateToCheckFor : true)
        && vaccinesToCheck.includes(session['vaccine']);
}

function findAvailableSlotsByCenter(slots) {
    if (slots.length > 0) {
        return slots.filter(slot => slot['centers'])
            .flatMap(slot => slot['centers'])
            .filter(center => center && center['sessions'])
            .filter(center => {
                let sessions = center['sessions']
                    .filter(session => isObjectEligible(session));
                let available = sessions.length > 0;
                return available;
            }).map(center => {
                let centerData = {};
                centerData['name'] = center['name'];
                centerData['address'] = center['address'];
                centerData['district_name'] = center['district_name'];
                centerData['pincode'] = center['pincode'];
                centerData['dates'] = center['sessions']
                    .filter(session => isObjectEligible(session))
                    .map(session => session['date']);
                centerData['vaccines'] = [... new Set(center['sessions']
                    .filter(session => isObjectEligible(session))
                    .map(session => session['vaccine']))];
                centerData[availableSlotsField] = center['sessions']
                    .filter(session => isObjectEligible(session))
                    .map(session => session[availableSlotsField]);
                return centerData;
            });
    } else {
        return [];
    }
}

function findAvailableSlotsByDistrict(slots) {
    if (slots.length > 0) {
        return slots.filter(slot => slot['sessions'])
            .flatMap(slot => slot['sessions'])
            .filter(center => isObjectEligible(center))
            .map(center => {
                let centerData = {};
                centerData['name'] = center['name'];
                centerData['address'] = center['address'];
                centerData['district_name'] = center['district_name'];
                centerData['pincode'] = center['pincode'];
                centerData['dates'] = [center['date']];
                centerData['vaccines'] = [center['vaccine']];
                centerData['available_slots'] = center['available_capacity'];
                return centerData;
            });
    } else {
        return [];
    }
}

function generateNextNDates(n) {
    let today = new Date();
    return [...Array(n).keys()]
        .map(index => moment(today, 'DD-MM-YYYY').add(index, 'days'))
        .map(date => moment(date).format('DD-MM-YYYY'))
}

async function getSlotsByPinCodes(pincodes) {
    let promises = pincodes
        .map(async pin => await getSlotsByPin(pin));
    return await Promise.all(promises);
}

async function getSlotsByPin(pin) {
    let promises = generateNextNDates(1)
        .map(async date => await getSlotsByPinAndDate(pin, date));
    return await Promise.all(promises);
}

async function getSlotsByPinAndDate(pin, date) {
    try {
        const url = `${baseUrl}/${getByPinPath}?pincode=${pin}&date=${date}`;
        console.log("Hitting URL:" + url)
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error(error);
    }
}

async function getSlotsByDistrict(dictrictId) {
    let promises = generateNextNDates(1)
        .map(async date => await getSlotsByDistrictAndDate(dictrictId, date));
    return await Promise.all(promises);
}

async function getSlotsByDistrictAndDate(districtId, date) {
    try {
        const url = `${baseUrl}/${getByDistrictPath}?district_id=${districtId}&date=${date}`;
        console.log("Hitting URL:" + url)
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error(error);
    }
}

async function main() {
    let pinSlots = await getSlotsByPinCodes(pincodesToCheck);
    let availableSlotsByPin = findAvailableSlotsByCenter(pinSlots.flat());
    let districSlots = await getSlotsByDistrict(districtIdToCheck);
    let availableSlotsByDistrict = findAvailableSlotsByCenter(districSlots.flat());
    let availableSlots = availableSlotsByPin.concat(availableSlotsByDistrict);
    console.log("Available slots size: " + availableSlots.length);
    if (availableSlots.length > 0) {
        availableSlots.forEach(slot => console.log(slot));
        availableSlots.slice(0, 2).forEach(slot => notifier.notify({
            title: 'Vaccine Slots Available',
            message: `Pincode: ${slot['pincode']}, Address: ${slot['address']}`,
            timeout: 3600,
            sound: true,
            wait: true
        }));
    } else {
        if (++noVaccineResponseCount === NO_VACCINE_ALERT_FREQUENCY) {
            notifier.notify({
                title: 'No Vaccine Slots Available',
                message: `:-( Try later`,
                timeout: 300,
                sound: true,
                wait: false
            });
            noVaccineResponseCount = 0;
        }
    }
}

console.log("Started checking for vaccine slots @ " + new Date());
main();
cron.schedule(`*/${minutesToCheck} * * * *`, () => {
    console.log("Started checking for vaccine slots @ " + new Date());
    main();
});